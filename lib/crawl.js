// Crawl core for the llms.txt generator (step 1 — no AI).
//
// Discovers a site's URLs (robots.txt sitemap directives, sitemap.xml, with a
// homepage-link fallback), ranks them by likely usefulness, and fetches compact
// metadata (title, description, H1, .md companion) for the top pages.
//
// Every network call goes through lib/ssrf.js, so private hosts are blocked and
// each redirect hop is re-validated. All work is bounded by hard caps.

import { safeFetch, readCappedText, assertPublicUrl } from "./ssrf.js";

const LIMITS = {
  maxCandidates: 120, // URLs collected from sitemaps/links before ranking
  maxChildSitemaps: 8, // child sitemaps fetched from a sitemap index
  maxPages: 40, // pages we fetch metadata for (cost ceiling)
  perFetchTimeout: 8000,
  htmlByteCap: 1.5 * 1024 * 1024,
  concurrency: 6,
  homepageLinks: 80, // cap on links scraped from homepage in fallback
};

const UA = "llmschecker.net-generator/1.0 (+https://llmschecker.net)";

// ---------- small utilities ----------

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

function stripTags(s) {
  return decodeEntities((s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeUrl(raw, base) {
  try {
    const u = new URL(raw, base);
    u.hash = "";
    u.search = "";
    // collapse trailing slash (but keep root "/")
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return null;
  }
}

async function pool(items, worker, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await worker(items[cur]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function fetchText(url) {
  const res = await safeFetch(
    url,
    { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/plain,*/*" } },
    { timeoutMs: LIMITS.perFetchTimeout, maxRedirects: 5 }
  );
  if (!res.ok) return { ok: false, status: res.status };
  const text = await readCappedText(res, LIMITS.htmlByteCap);
  return { ok: true, status: res.status, text, contentType: res.headers.get("content-type") || "", finalUrl: res.finalUrl || url };
}

// ---------- discovery ----------

export function parseRobotsSitemaps(robotsTxt) {
  const out = [];
  const re = /^\s*sitemap:\s*(\S+)\s*$/gim;
  let m;
  while ((m = re.exec(robotsTxt || ""))) out.push(m[1]);
  return out;
}

// Returns { isIndex, locs } from a sitemap XML string.
export function parseSitemap(xml) {
  const isIndex = /<sitemapindex[\s>]/i.test(xml || "");
  const locs = [];
  const re = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml || ""))) {
    const v = decodeEntities(m[1]);
    if (v) locs.push(v);
  }
  return { isIndex, locs };
}

export function extractHomepageLinks(html, base) {
  const out = new Set();
  const re = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;
  let m;
  let origin;
  try {
    origin = new URL(base).origin;
  } catch {
    return [];
  }
  while ((m = re.exec(html || "")) && out.size < LIMITS.homepageLinks) {
    const n = normalizeUrl(m[1], base);
    if (n && n.startsWith(origin)) out.add(n);
  }
  return [...out];
}

async function discoverCandidates(origin) {
  const stats = { source: null, sitemaps: 0 };
  const candidates = new Set();

  // 1) robots.txt → Sitemap: directives, plus the conventional /sitemap.xml
  let sitemapUrls = [];
  try {
    const robots = await fetchText(`${origin}/robots.txt`);
    if (robots.ok) sitemapUrls = parseRobotsSitemaps(robots.text);
  } catch {}
  sitemapUrls.push(`${origin}/sitemap.xml`);
  sitemapUrls = [...new Set(sitemapUrls)];

  // 2) walk sitemaps (one level of index expansion)
  for (const sm of sitemapUrls) {
    if (candidates.size >= LIMITS.maxCandidates) break;
    try {
      const r = await fetchText(sm);
      if (!r.ok) continue;
      const { isIndex, locs } = parseSitemap(r.text);
      stats.sitemaps++;
      if (isIndex) {
        for (const child of locs.slice(0, LIMITS.maxChildSitemaps)) {
          if (candidates.size >= LIMITS.maxCandidates) break;
          try {
            const cr = await fetchText(child);
            if (!cr.ok) continue;
            for (const u of parseSitemap(cr.text).locs) {
              const n = normalizeUrl(u, origin);
              if (n && n.startsWith(origin)) candidates.add(n);
              if (candidates.size >= LIMITS.maxCandidates) break;
            }
          } catch {}
        }
      } else {
        for (const u of locs) {
          const n = normalizeUrl(u, origin);
          if (n && n.startsWith(origin)) candidates.add(n);
          if (candidates.size >= LIMITS.maxCandidates) break;
        }
      }
    } catch {}
  }

  if (candidates.size > 0) {
    stats.source = "sitemap";
    return { urls: [...candidates], stats };
  }

  // 3) fallback: homepage links (depth 1)
  try {
    const home = await fetchText(`${origin}/`);
    if (home.ok && /html/i.test(home.contentType)) {
      for (const u of extractHomepageLinks(home.text, `${origin}/`)) candidates.add(u);
    }
  } catch {}
  candidates.add(`${origin}/`);
  stats.source = "homepage-links";
  return { urls: [...candidates], stats };
}

// ---------- ranking ----------

export function scoreUrl(url, origin) {
  let path;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return -100;
  }
  if (url === `${origin}/` || path === "/") return 100; // homepage
  let score = 10;
  const segs = path.split("/").filter(Boolean);
  score -= Math.max(0, segs.length - 2) * 1.5; // prefer shallower

  const high = /(docs?|documentation|guide|guides|reference|api|tutorials?|manual|getting-started|quickstart)/;
  const mid = /(features?|product|use-?cases?|examples?|how-?to|integrations?|sdk|cli)/;
  const low = /(about|pricing|faq|changelog|roadmap)/;
  const bad = /(tag|tags|category|categories|author|archive|page\/\d+|comment|cart|checkout|login|signin|sign-in|account|wp-|feed|rss)/;
  const datey = /\/20\d\d\/\d{1,2}\//; // dated blog posts

  if (high.test(path)) score += 8;
  if (mid.test(path)) score += 4;
  if (low.test(path)) score += 2;
  if (bad.test(path)) score -= 8;
  if (datey.test(path)) score -= 4;
  if (/\.(png|jpe?g|gif|svg|webp|pdf|zip|mp4|css|js)$/.test(path)) score -= 50;
  return score;
}

export function rankAndCap(urls, origin, cap) {
  return urls
    .map((u) => ({ url: u, score: scoreUrl(u, origin) }))
    .filter((x) => x.score > -20)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map((x) => x.url);
}

// ---------- metadata ----------

export function extractMeta(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  let desc =
    (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] ||
    (html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i) || [])[1] ||
    (html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i) || [])[1];
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  return {
    title: title ? stripTags(title) : undefined,
    description: desc ? decodeEntities(desc) : undefined,
    h1: h1 ? stripTags(h1) : undefined,
  };
}

async function fetchPage(url, id) {
  try {
    const r = await fetchText(url);
    if (!r.ok || !/html/i.test(r.contentType)) return null;
    const meta = extractMeta(r.text);
    const page = { id, url: r.finalUrl || url, ...meta };
    // detect .md companion (spec part 2)
    try {
      const mdUrl = url.replace(/\/$/, "") + ".md";
      await assertPublicUrl(mdUrl);
      const head = await safeFetch(mdUrl, { method: "HEAD", headers: { "User-Agent": UA } }, { timeoutMs: 5000 });
      if (head.ok) page.mdUrl = head.finalUrl || mdUrl;
    } catch {}
    return page;
  } catch {
    return null;
  }
}

// ---------- orchestrator ----------

export async function crawlSite(domain) {
  let raw = (domain || "").trim();
  if (!raw) throw new Error("Please enter a domain.");
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  const u = await assertPublicUrl(raw); // validates + blocks private hosts
  const origin = `${u.protocol}//${u.host}`;

  const { urls, stats } = await discoverCandidates(origin);
  const ranked = rankAndCap(urls, origin, LIMITS.maxPages);

  const pages = (
    await pool(ranked.map((url, i) => ({ url, id: `p${i + 1}` })), (x) => fetchPage(x.url, x.id), LIMITS.concurrency)
  ).filter(Boolean);

  return {
    origin,
    discovery: stats,
    counts: { discovered: urls.length, ranked: ranked.length, fetched: pages.length },
    pages,
  };
}

export const CRAWL_LIMITS = LIMITS;
