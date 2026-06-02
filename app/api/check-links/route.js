import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LINKS = 60;

async function checkOne(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "llmschecker.net/1.0 (+https://llmschecker.net)" },
    });
    // Some servers don't support HEAD — retry with GET.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "llmschecker.net/1.0 (+https://llmschecker.net)" },
      });
    }
    return { url, status: res.status, ok: res.ok };
  } catch (e) {
    return { url, status: 0, ok: false, error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(t);
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

  const results = await pool(urls, checkOne, 8);
  return NextResponse.json({ results });
}
