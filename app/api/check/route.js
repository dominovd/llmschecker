import { NextResponse } from "next/server";
import { safeFetch, readCappedText } from "@/lib/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeTarget(input) {
  let raw = (input || "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }

  // If the URL already points at a .txt file, use it as-is.
  if (/\.txt$/i.test(u.pathname)) {
    return [u.toString()];
  }

  // Otherwise try /llms.txt at the root of the host.
  const root = `${u.protocol}//${u.host}`;
  const candidates = [`${root}/llms.txt`];

  // Also try the path the user gave, joined with llms.txt (for subpath hosting).
  if (u.pathname && u.pathname !== "/") {
    const base = u.pathname.replace(/\/+$/, "");
    candidates.push(`${root}${base}/llms.txt`);
  }
  return candidates;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const candidates = normalizeTarget(body.url);
  if (!candidates) {
    return NextResponse.json({ error: "Please enter a valid URL or domain." }, { status: 400 });
  }

  const errors = [];
  for (const candidate of candidates) {
    try {
      const res = await safeFetch(
        candidate,
        { headers: { "User-Agent": "llmschecker.net/1.0 (+https://llmschecker.net)", Accept: "text/plain, text/markdown, */*" } },
        { timeoutMs: 12000, maxRedirects: 5 }
      );
      if (res.ok) {
        const content = await readCappedText(res, 5 * 1024 * 1024);
        const ct = res.headers.get("content-type") || "";
        return NextResponse.json({
          content,
          finalUrl: res.finalUrl || candidate,
          requestedUrl: candidate,
          contentType: ct,
          status: res.status,
        });
      }
      errors.push(`${candidate} → HTTP ${res.status}`);
    } catch (e) {
      const msg = e.name === "AbortError" ? "timed out" : e.message;
      errors.push(`${candidate} → ${msg}`);
    }
  }

  return NextResponse.json(
    {
      error: "Could not fetch an llms.txt file from that location.",
      details: errors,
    },
    { status: 404 }
  );
}
