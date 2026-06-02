// Grounded LLM grouping for the generator (step 3).
//
// The model is given ONLY page ids + metadata and must return a JSON structure
// that references pages by id. Code then maps ids back to the real crawled URLs,
// so the model can never introduce a URL that wasn't found on the site.
//
// Provider-agnostic via env vars. If no key is configured or the call fails,
// callers fall back to the deterministic rule-based assembler.

import { deriveProjectName, deriveSummary, assembleLlmsTxt } from "./assemble.js";

const DEFAULTS = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
};

function provider() {
  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (explicit === "anthropic" || explicit === "openai") return explicit;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function isLLMConfigured() {
  return provider() !== null;
}

// ---------- sanitisation (defence-in-depth on model output) ----------

function stripUnsafe(s) {
  return String(s || "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links/images -> text
    .replace(/https?:\/\/\S+/gi, "") // raw urls
    .replace(/<[^>]*>/g, " ") // tags
    .replace(/[#>*`_]+/g, " ") // markdown control chars
    .replace(/\s+/g, " ")
    .trim();
}

function capText(s, max) {
  const t = stripUnsafe(s);
  if (!t) return "";
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
}

// ---------- prompt ----------

function buildPrompt(origin, pages) {
  const host = (() => {
    try {
      return new URL(origin).host;
    } catch {
      return origin;
    }
  })();
  const compact = pages.map((p) => {
    let path = p.url;
    try {
      path = new URL(p.url).pathname;
    } catch {}
    return { id: p.id, path, title: p.title || "", description: p.description || "", h1: p.h1 || "" };
  });

  const system =
    "You organize a website's pages into an llms.txt file following the llmstxt.org spec. " +
    "You are given a list of real pages with an id and metadata. " +
    "Return ONLY valid JSON, no prose, no code fences. " +
    "Rules: (1) Never write any URL — refer to pages only by their id. " +
    "(2) Only use ids from the provided list. " +
    "(3) Group pages into a few clear H2 sections (e.g. Docs, Guides, API, Examples). " +
    "(4) Put secondary/low-priority pages (blog, changelog, legal) in a section named 'Optional'. " +
    "(5) Write a concise project name, a one-sentence summary, and a short note per page grounded in its metadata. Do not invent facts. " +
    "(6) Write all text (project name, summary, notes) in English.";

  const schema =
    '{"projectName":string,"summary":string,"details":string[] (0-2 short sentences, optional),' +
    '"sections":[{"name":string,"optional":boolean,"items":[{"pageId":string,"name":string,"note":string}]}]}';

  const user =
    `Site: ${host}\n` +
    `Return JSON matching this shape:\n${schema}\n\n` +
    `Pages:\n${JSON.stringify(compact)}`;

  return { system, user };
}

// ---------- provider calls ----------

async function callAnthropic(system, user, signal) {
  const model = process.env.LLM_MODEL || DEFAULTS.anthropic;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const data = await res.json();
  return (data.content || []).map((c) => c.text || "").join("");
}

async function callOpenAI(system, user, signal) {
  const model = process.env.LLM_MODEL || DEFAULTS.openai;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractJson(text) {
  const t = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

// ---------- grounding ----------

function groundStructure(raw, origin, pages) {
  if (!raw || typeof raw !== "object") return null;
  const byId = new Map(pages.map((p) => [p.id, p]));

  const projectName = capText(raw.projectName, 60) || deriveProjectName(origin, pages);
  const summary = capText(raw.summary, 250) || deriveSummary(origin, pages, projectName);
  const details = Array.isArray(raw.details)
    ? raw.details.map((d) => capText(d, 200)).filter(Boolean).slice(0, 2)
    : [];

  const seen = new Set();
  const sections = [];
  for (const s of Array.isArray(raw.sections) ? raw.sections : []) {
    const name = capText(s && s.name, 40);
    if (!name) continue;
    const items = [];
    for (const it of Array.isArray(s.items) ? s.items : []) {
      const page = it && byId.get(it.pageId);
      if (!page) continue; // unknown id -> dropped (grounding guard)
      const url = page.mdUrl || page.url;
      if (seen.has(url)) continue;
      seen.add(url);
      const itemName = capText(it.name, 80) || capText(page.title, 80) || "Link";
      const note = capText(it.note, 140) || null;
      items.push({ name: itemName, url, note });
    }
    if (items.length) {
      sections.push({ name, optional: /^optional$/i.test(name) || !!s.optional, items });
    }
  }

  if (!sections.length) return null; // nothing grounded -> let caller fall back
  return { projectName, summary, details, sections };
}

// ---------- public API ----------

// Returns { projectName, summary, details, sections, llmsTxt } or null on failure.
export async function buildWithLLM(crawl) {
  const prov = provider();
  if (!prov) return null;
  const { origin, pages } = crawl;
  const { system, user } = buildPrompt(origin, pages);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const text =
      prov === "anthropic"
        ? await callAnthropic(system, user, controller.signal)
        : await callOpenAI(system, user, controller.signal);
    const grounded = groundStructure(extractJson(text), origin, pages);
    if (!grounded) return null;
    return { ...grounded, llmsTxt: assembleLlmsTxt(grounded) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const __test = { groundStructure, capText, extractJson };
