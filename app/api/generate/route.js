import { NextResponse } from "next/server";
import { crawlSite } from "@/lib/crawl";

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

  try {
    const result = await crawlSite(domain);
    if (result.pages.length === 0) {
      return NextResponse.json(
        { ...result, warning: "No crawlable pages were found for this domain." },
        { status: 200 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message || "Crawl failed." }, { status: 400 });
  }
}
