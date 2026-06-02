import { NextResponse } from "next/server";
import { crawlSite } from "@/lib/crawl";
import { buildFromCrawl } from "@/lib/assemble";
import { buildWithLLM } from "@/lib/llm";
import { validateLlmsTxt } from "@/lib/validator";
import { rateLimit, cacheGet, cacheSet, getClientIp } from "@/lib/ratelimit";

const RATE = { limit: 8, windowSec: 3600 }; // 8 generations/hour/IP
const CACHE_TTL = 24 * 3600; // 24h

function parseSitemaps(input) {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean).slice(0, 10);
  if (typeof input === "string") {
    return input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  return [];
}

function cacheKeyForDomain(input, sitemaps) {
  let raw = (input || "").trim().toLowerCase();
  raw = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const smPart = sitemaps && sitemaps.length ? "|sm:" + sitemaps.join(",").toLowerCase() : "";
  return `gen:${raw}${smPart}`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Crawling several pages can take a while — request a generous budget.
// Vercel caps this by plan; it is clamped automatically if too high.
export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const domain = body.domain || body.url;
  if (!domain || typeof domain !== "string") {
    return NextResponse.json({ error: "Please provide a domain." }, { status: 400 });
  }

  const sitemaps = parseSitemaps(body.sitemaps);
  const cacheKey = cacheKeyForDomain(domain, sitemaps);
  const ip = getClientIp(request);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {}
      };
      try {
        // Cache first (unless a fresh crawl was requested).
        if (!body.refresh) {
          const cached = await cacheGet(cacheKey);
          if (cached) {
            send({ phase: "result", cached: true, ...cached });
            controller.close();
            return;
          }
        }

        // Rate limit the expensive path.
        const rl = await rateLimit(`gen:${ip}`, RATE);
        if (!rl.allowed) {
          send({ phase: "error", status: 429, message: "Rate limit reached. Please try again later." });
          controller.close();
          return;
        }

        const result = await crawlSite(domain, { sitemaps }, (p) => send({ phase: "progress", ...p }));
        if (result.pages.length === 0) {
          send({ phase: "error", message: "No crawlable pages were found for this domain." });
          controller.close();
          return;
        }

        send({ phase: "generating" });
        let built = await buildWithLLM(result);
        let method = "ai";
        if (!built) {
          built = buildFromCrawl(result);
          method = "rules";
        }
        const validation = validateLlmsTxt(built.llmsTxt);
        const { parsed, ...validationSummary } = validation;
        const payload = {
          ...result,
          method,
          projectName: built.projectName,
          summary: built.summary,
          details: built.details || [],
          sections: built.sections,
          llmsTxt: built.llmsTxt,
          validation: validationSummary,
        };
        await cacheSet(cacheKey, payload, CACHE_TTL);
        send({ phase: "result", ...payload });
        controller.close();
      } catch (e) {
        send({ phase: "error", message: (e && e.message) || "Generation failed." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
