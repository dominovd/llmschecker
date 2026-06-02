import { NextResponse } from "next/server";
import { safeFetch, assertPublicUrl } from "@/lib/ssrf";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LINKS = 60;
const UA = "llmschecker.net/1.0 (+https://llmschecker.net)";

async function checkOne(url) {
  try {
    // Validate before doing any network work (cheap reject for private hosts).
    await assertPublicUrl(url);
    let res = await safeFetch(url, { method: "HEAD", headers: { "User-Agent": UA } }, { timeoutMs: 8000 });
    if (res.status === 405 || res.status === 501) {
      res = await safeFetch(url, { method: "GET", headers: { "User-Agent": UA } }, { timeoutMs: 8000 });
    }
    return { url, status: res.status, ok: res.ok };
  } catch (e) {
    const err = e.name === "AbortError" ? "timeout" : e.message;
    return { url, status: 0, ok: false, error: err };
  }
}

async function pool(items, worker, concurrency = 8) {
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

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let urls = Array.isArray(body.urls) ? body.urls : [];
  urls = urls
    .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
    .slice(0, MAX_LINKS);

  if (urls.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const rl = await rateLimit(`links:${getClientIp(request)}`, { limit: 20, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.resetSec) } }
    );
  }

  const results = await pool(urls, checkOne, 8);
  return NextResponse.json({ results });
}
