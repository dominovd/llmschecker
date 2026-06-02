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
  budgetMs: 45000, // global wall-clock budget; stop starting work past this
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

async function pool(items, worker, concurrency, deadline = Infinity) {
  const results = new Array(items.length);
  let idx = 0;
  let stopped = false;
  async function run() {
    while (idx < items.length) {
      if (Date.now() > deadline) {
        stopped = true;
        return;
      }
      const cur = idx++;
      results[cur] = await worker(items[cur]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return { results, stopped };
}

async function fetchText(url) {
  const res = await safeFetch(
    url,
    { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/plain,*/*" } },
    { timeoutMs: LIMITS.perFetchTimeout, maxRedirects: 5 }
  );
  if (!res.ok) return { ok: false, status: res.status };
  // Truncate oversized bodies instead of discarding them — a partial sitemap or
  // page (head is near the top) is still useful for huge sites.
  const text = await readCappedText(res, LIMITS.htmlByteCap, { truncate: true });
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

// Common non-standard sitemap locations to try when robots.txt doesn't declare one.
const SITEMAP_GUESSES = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap-index.xml",
  "/sitemap/sitemap.xml",
  "/wp-sitemap.xml",
  "/sitemap1.xml",
];

async function ingestSitemap(sm, origin, candidates, stats) {
  try {
    const r = await fetchText(sm);
    if (!r.ok) return false;
    const { isIndex, locs } = parseSitemap(r.text);
    if (!locs.length) return false;
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
    return true;
  } catch {
    return false;
  }
}

// Normalize a user-supplied sitemap reference into an absolute URL.
function normalizeSitemapInput(sm, origin) {
  const raw = (sm || "").trim();
  if (!raw) return null;
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).toString();
    return new URL(raw.startsWith("/") ? raw : `/${raw}`, `${origin}/`).toString();
  } catch {
    return null;
  }
}

async function discoverCandidates(origin, providedSitemaps = [], deadline = Infinity) {
  const stats = { source: null, sitemaps: 0 };
  const candidates = new Set();
  const timeLeft = () => Date.now() < deadline;

  // 0) user-provided sitemaps take precedence.
  const provided = providedSitemaps
    .map((s) => normalizeSitemapInput(s, origin))
    .filter(Boolean);
  for (const sm of provided) {
    if (candidates.size >= LIMITS.maxCandidates || !timeLeft()) break;
    await ingestSitemap(sm, origin, candidates, stats);
  }
  if (candidates.size > 0) {
    stats.source = "provided-sitemap";
    return { urls: [...candidates], stats };
  }

  // 1) robots.txt → Sitemap: directives (the standard way to declare a
  //    non-standard sitemap location). Process all of them.
  let robotsSitemaps = [];
  try {
    const robots = await fetchText(`${origin}/robots.txt`);
    if (robots.ok) robotsSitemaps = parseRobotsSitemaps(robots.text);
  } catch {}
  for (const sm of [...new Set(robotsSitemaps)]) {
    if (candidates.size >= LIMITS.maxCandidates || !timeLeft()) break;
    await ingestSitemap(sm, origin, candidates, stats);
  }

  // 2) if robots gave us nothing, try common alternate locations until one works.
  if (candidates.size === 0) {
    for (const path of SITEMAP_GUESSES) {
      if (!timeLeft()) break;
      const ok = await ingestSitemap(`${origin}${path}`, origin, candidates, stats);
      if (ok && candidates.size > 0) break;
    }
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

// Common ISO-639-1 language codes used as locale path prefixes.
const LANG_CODES = new Set([
  "en", "es", "fr", "de", "it", "pt", "ru", "ar", "zh", "ja", "ko", "nl", "pl",
  "tr", "uk", "cs", "sv", "da", "fi", "no", "el", "he", "hi", "th", "vi", "id",
  "ms", "ro", "hu", "bg", "hr", "sr", "sk", "sl", "et", "lv", "lt", "fa", "ur",
  "bn", "ta", "fil", "nb",
]);

export function isLangCode(seg) {
  if (!seg) return false;
  const m = seg.toLowerCase().match(/^([a-z]{2,3})(?:-[a-z]{2})?$/);
  return !!m && LANG_CODES.has(m[1]);
}

// Canonical key that ignores a leading locale segment, so /ar/foo and /foo collapse.
export function localeKey(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length && isLangCode(segs[0])) {
      return `${u.host}/${segs.slice(1).join("/")}`;
    }
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

function hasLocalePrefix(url) {
  try {
    const segs = new URL(url).pathname.split("/").filter(Boolean);
    return segs.length > 0 && isLangCode(segs[0]);
  } catch {
    return false;
  }
}

// A page counts as English if it has no locale prefix (canonical/default) or its
// prefix is an English locale (en, en-us, …).
export function isEnglishUrl(url) {
  try {
    const seg = (new URL(url).pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
    if (!isLangCode(seg)) return true; // no locale prefix → assume default (English)
    return seg === "en" || seg.startsWith("en-");
  } catch {
    return true;
  }
}

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
  if (hasLocalePrefix(url)) score -= 4; // prefer canonical (non-localized) pages
  if (/\.(png|jpe?g|gif|svg|webp|pdf|zip|mp4|css|js)$/.test(path)) score -= 50;
  return score;
}

export function rankAndCap(urls, origin, cap, { englishOnly = true } = {}) {
  // Keep English pages only (no mixed-language llms.txt). Fall back to all pages
  // if filtering would leave nothing (e.g. a site with no English version).
  let pool = urls;
  if (englishOnly) {
    const en = urls.filter(isEnglishUrl);
    if (en.length) pool = en;
  }

  const scored = pool
    .map((u) => ({ url: u, score: scoreUrl(u, origin) }))
    .filter((x) => x.score > -20)
    .sort((a, b) => b.score - a.score);

  // Collapse locale duplicates: keep the highest-scored page per canonical key
  // (canonical/non-localized wins thanks to the locale penalty above).
  const seen = new Set();
  const deduped = [];
  for (const x of scored) {
    const key = localeKey(x.url);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(x.url);
    if (deduped.length >= cap) break;
  }
  return deduped;
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

export async function crawlSite(domain, options = {}, onProgress = () => {}) {
  let raw = (domain || "").trim();
  if (!raw) throw new Error("Please enter a domain.");
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  const u = await assertPublicUrl(raw); // validates + blocks private hosts
  const origin = `${u.protocol}//${u.host}`;

  const providedSitemaps = Array.isArray(options.sitemaps)
    ? options.sitemaps.filter((s) => typeof s === "string").slice(0, 10)
    : [];

  // Global wall-clock budget so we always return before the function is killed,
  // even on a huge or slow site. We stop launching new work past the deadline.
  const deadline = Date.now() + (options.budgetMs || LIMITS.budgetMs);

  onProgress({ step: "discover" });
  const { urls, stats } = await discoverCandidates(origin, providedSitemaps, deadline);
  const ranked = rankAndCap(urls, origin, LIMITS.maxPages);
  onProgress({ step: "discovered", discovered: urls.length, ranked: ranked.length, source: stats.source });

  let done = 0;
  const worker = async (x) => {
    const r = await fetchPage(x.url, x.id);
    done += 1;
    onProgress({ step: "fetch", done, total: ranked.length });
    return r;
  };
  const { results, stopped } = await pool(
    ranked.map((url, i) => ({ url, id: `p${i + 1}` })),
    worker,
    LIMITS.concurrency,
    deadline
  );
  const pages = results.filter(Boolean);
  const partial = stopped || Date.now() > deadline;

  return {
    origin,
    discovery: stats,
    partial,
    counts: { discovered: urls.length, ranked: ranked.length, fetched: pages.length },
    pages,
  };
}

export const CRAWL_LIMITS = LIMITS;
