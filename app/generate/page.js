import Generator from "./Generator";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "llms.txt Generator — Create an llms.txt From Your Site",
  description:
    "Free llms.txt generator. Enter your domain and we crawl your sitemap to build a spec-compliant llms.txt with real URLs — no invented links. Edit, validate, and download.",
  alternates: { canonical: "https://llmschecker.net/generate" },
  openGraph: {
    type: "website",
    url: "https://llmschecker.net/generate",
    title: "llms.txt Generator",
    description:
      "Generate a spec-compliant llms.txt from your real site structure — grounded in your sitemap, never hallucinated.",
  },
};

export default function GeneratePage() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <section className="hero">
          <h1>
            Generate your <span className="grad">llms.txt</span>
          </h1>
          <p>
            Enter a domain and we’ll crawl its sitemap to build a spec-compliant{" "}
            <code>llms.txt</code> from your <strong>real pages</strong> — no invented URLs. Edit it,
            validate live, and download.
          </p>
        </section>

        <Generator />

        <section className="content">
          <h2>How the generator works</h2>
          <p>
            We read your <code>robots.txt</code> and <code>sitemap.xml</code> (falling back to links
            on your homepage), rank the most useful pages, and read each page’s title, description,
            and H1. Those real pages are grouped into sections and assembled into an{" "}
            <code>llms.txt</code>. Every link comes from your site — the generator never makes up
            URLs. The result is checked against the{" "}
            <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
              llmstxt.org
            </a>{" "}
            specification automatically, and you can refine it before downloading.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
