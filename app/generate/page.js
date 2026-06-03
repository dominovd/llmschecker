import Generator from "./Generator";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import JsonLd from "../components/JsonLd";
import {
  SITE,
  generatorFaqs,
  generatorSteps,
  faqSchema,
  howToSchema,
  softwareAppSchema,
  breadcrumbSchema,
} from "@/lib/seo";

const URL = `${SITE}/generate`;

export const metadata = {
  title: "llms.txt Generator — Create an llms.txt From Your Sitemap (Free)",
  description:
    "Free llms.txt generator. Enter your domain and we crawl your sitemap to build a spec-compliant llms.txt with your real URLs — no invented links. Edit, validate live, and download.",
  keywords: [
    "llms.txt generator",
    "generate llms.txt",
    "create llms.txt",
    "llms.txt generator from sitemap",
    "make llms.txt",
    "llms.txt creator",
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    url: URL,
    title: "llms.txt Generator — Create an llms.txt From Your Sitemap",
    description:
      "Generate a spec-compliant llms.txt from your real site structure — grounded in your sitemap, never hallucinated.",
    images: [{ url: "/og-generate.png", width: 1200, height: 630, alt: "llms.txt Generator" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "llms.txt Generator — Create an llms.txt From Your Sitemap",
    description:
      "Generate a spec-compliant llms.txt from your real site structure — grounded in your sitemap.",
    images: ["/og-generate.png"],
  },
};

export default function GeneratePage() {
  const schemas = [
    softwareAppSchema({
      name: "llms.txt Generator",
      description:
        "Free tool that crawls your sitemap and generates a spec-compliant llms.txt file from your real pages.",
      url: URL,
    }),
    howToSchema("How to generate an llms.txt file", generatorSteps, URL),
    faqSchema(generatorFaqs),
    breadcrumbSchema([
      { name: "Home", url: SITE },
      { name: "Generator", url: URL },
    ]),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <SiteHeader />
      <main className="container">
        <section className="hero">
          <h1>
            Generate your <span className="grad">llms.txt</span>
          </h1>
          <p>
            Enter a domain and the <strong>llms.txt generator</strong> crawls its sitemap to build a
            spec-compliant <code>llms.txt</code> from your <strong>real pages</strong> — no invented
            URLs. Edit it, validate live, and download.
          </p>
        </section>

        <Generator />

        <section className="content">
          <h2>What is an llms.txt generator?</h2>
          <p>
            An <strong>llms.txt generator</strong> creates the <code>/llms.txt</code> file that large
            language models use to understand your website. Instead of writing it by hand, you enter
            your domain and the generator reads your sitemap, collects your real pages and their
            metadata, organizes them into sections, and produces a ready-to-use file that follows the{" "}
            <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
              llmstxt.org
            </a>{" "}
            specification. A valid file is also one of the signals in Lighthouse's experimental{" "}
            <a href="/guides/agentic-browsing">Agentic Browsing audit</a> for AI-agent readiness.
          </p>

          <h2>How to generate an llms.txt file</h2>
          <ol className="steps">
            {generatorSteps.map((s, i) => (
              <li key={i}>
                <strong>{s.name}.</strong> {s.text}
              </li>
            ))}
          </ol>

          <h2>Why this generator is different</h2>
          <div className="grid-cards">
            <div className="feature">
              <h3>Grounded in real URLs</h3>
              <p>Every link comes from a page found on your site. The generator never invents URLs.</p>
            </div>
            <div className="feature">
              <h3>Sitemap-aware</h3>
              <p>
                Reads <code>robots.txt</code> and <code>sitemap.xml</code>, with custom sitemap input
                and homepage fallback.
              </p>
            </div>
            <div className="feature">
              <h3>English, no mixed languages</h3>
              <p>Skips localized duplicates so your llms.txt stays focused and clean.</p>
            </div>
            <div className="feature">
              <h3>Editable + live validation</h3>
              <p>Tune the result in the browser; it re-validates against the spec as you type.</p>
            </div>
            <div className="feature">
              <h3>Copy or download</h3>
              <p>Export a ready <code>llms.txt</code> and place it at the root of your site.</p>
            </div>
            <div className="feature">
              <h3>Free</h3>
              <p>No signup. Large sites are capped for speed and fair use.</p>
            </div>
          </div>

          <div className="cta">
            <h2>Already have an llms.txt?</h2>
            <p>
              Check an existing file against the specification with the{" "}
              <a href="/">llms.txt checker</a> — validate structure, test links, and get fix
              suggestions.
            </p>
            <a className="btn" href="/">
              Open the checker
            </a>
          </div>

          <h2 id="faq">Frequently asked questions</h2>
          <div className="faq">
            {generatorFaqs.map((f, i) => (
              <details key={i}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
