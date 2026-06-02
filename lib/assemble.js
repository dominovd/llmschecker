// Deterministic llms.txt assembler (step 2 — no AI).
//
// Takes crawl output (pages with url/title/description/h1/mdUrl) and builds a
// spec-correct llms.txt by grouping pages with simple path/title rules. Every
// URL in the output comes from the crawl — nothing is invented. An LLM can later
// replace `groupPages` to improve grouping/wording, keeping this as a fallback.

const SECTION_ORDER = ["Docs", "Guides", "API", "Examples", "Features", "Resources", "Optional"];

function hostToName(origin) {
  try {
    const host = new URL(origin).hostname.replace(/^www\./, "");
    const base = host.split(".")[0] || host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Website";
  }
}

function clean(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function oneLine(text, max = 200) {
  let t = clean(text);
  if (t.length > max) t = t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  return t;
}

// Strip a trailing " | Site", " - Site", " — Site" suffix from a page title.
function stripSuffix(title, names) {
  let t = clean(title);
  const parts = t.split(/\s+[|–—-]\s+/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase();
    if (names.some((n) => n && last.includes(n.toLowerCase()))) {
      return parts.slice(0, -1).join(" - ").trim();
    }
    // Also drop a leading "Site | Page" pattern
    const first = parts[0].toLowerCase();
    if (names.some((n) => n && first.includes(n.toLowerCase())) && parts.length === 2) {
      return parts[1].trim();
    }
  }
  return t;
}

function isHomepage(page, origin) {
  try {
    const p = new URL(page.url);
    return page.url === `${origin}/` || p.pathname === "/" || p.pathname === "";
  } catch {
    return false;
  }
}

function pathOf(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

function sectionFor(url) {
  const p = pathOf(url);
  if (/(blog|news|changelog|release|legal|privacy|terms|press)/.test(p)) return "Optional";
  if (/(docs?|documentation|reference|manual)/.test(p)) return "Docs";
  if (/(guide|tutorial|getting-started|quickstart|how-?to|learn)/.test(p)) return "Guides";
  if (/(\/api|\/sdk|\/cli|endpoint)/.test(p)) return "API";
  if (/(example|demo|showcase|cookbook|sample)/.test(p)) return "Examples";
  if (/(feature|product|use-?case|integration|solution)/.test(p)) return "Features";
  return "Resources";
}

function firstSegment(s) {
  return clean(s).split(/\s+[|–—-]\s+/)[0].trim();
}

export function deriveProjectName(origin, pages) {
  const home = pages.find((p) => isHomepage(p, origin));
  const fallback = hostToName(origin);
  if (home) {
    // The brand name is usually the first segment of the <title> ("Acme — …").
    if (home.title) {
      const n = firstSegment(home.title);
      if (n && n.length <= 40) return n;
    }
    if (home.h1) {
      const n = firstSegment(home.h1);
      if (n && n.length <= 40) return n;
    }
  }
  return fallback;
}

export function deriveSummary(origin, pages, projectName) {
  const home = pages.find((p) => isHomepage(p, origin));
  if (home) {
    if (home.description) return oneLine(home.description);
    if (home.h1 && clean(home.h1) !== clean(projectName)) return oneLine(home.h1);
  }
  return `${projectName} — see the resources below for documentation and key pages.`;
}

export function groupPages(origin, pages, projectName) {
  const seen = new Set();
  const buckets = {};
  for (const page of pages) {
    if (!page || !page.url) continue;
    if (isHomepage(page, origin)) continue; // homepage feeds name/summary, not the lists
    const url = page.mdUrl || page.url;
    if (seen.has(url)) continue;
    seen.add(url);

    const sec = sectionFor(page.url);
    const name =
      stripSuffix(page.title || page.h1 || "", [projectName, hostToName(origin)]) ||
      page.h1 ||
      lastSegment(page.url);
    const note = page.description ? oneLine(page.description, 140) : null;
    (buckets[sec] = buckets[sec] || []).push({ name: clean(name) || lastSegment(page.url), url, note });
  }

  const sections = [];
  for (const sec of SECTION_ORDER) {
    if (buckets[sec] && buckets[sec].length) {
      sections.push({ name: sec, optional: sec === "Optional", items: buckets[sec] });
    }
  }
  return sections;
}

function lastSegment(url) {
  try {
    const segs = new URL(url).pathname.split("/").filter(Boolean);
    const s = segs[segs.length - 1] || "Home";
    return s.replace(/[-_]/g, " ").replace(/\.[a-z]+$/i, "");
  } catch {
    return "Link";
  }
}

export function assembleLlmsTxt({ projectName, summary, sections }) {
  const lines = [`# ${projectName}`, "", `> ${summary}`, ""];
  for (const sec of sections) {
    lines.push(`## ${sec.name}`, "");
    for (const it of sec.items) {
      lines.push(`- [${it.name}](${it.url})${it.note ? ": " + it.note : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Convenience: crawl result -> { projectName, summary, sections, llmsTxt }
export function buildFromCrawl(crawl) {
  const { origin, pages } = crawl;
  const projectName = deriveProjectName(origin, pages);
  const summary = deriveSummary(origin, pages, projectName);
  const sections = groupPages(origin, pages, projectName);
  const llmsTxt = assembleLlmsTxt({ projectName, summary, sections });
  return { projectName, summary, sections, llmsTxt };
}
