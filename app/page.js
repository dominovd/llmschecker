import Validator from "./Validator";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import JsonLd from "./components/JsonLd";
import { SAMPLE_TEMPLATE } from "@/lib/validator";
import {
  SITE,
  homeFaqs,
  checkerSteps,
  faqSchema,
  howToSchema,
  softwareAppSchema,
  breadcrumbSchema,
} from "@/lib/seo";

export default function Home() {
  const schemas = [
    softwareAppSchema({
      name: "llms.txt Checker & Validator",
      description:
        "Free online tool to validate an llms.txt file against the llmstxt.org specification, by URL or pasted text.",
      url: SITE,
    }),
    howToSchema("How to validate an llms.txt file", checkerSteps, SITE),
    faqSchema(homeFaqs),
    breadcrumbSchema([{ name: "Home", url: SITE }]),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <SiteHeader />

      <main className="container">
        <section className="hero">
          <h1>
            Validate your <span className="grad">llms.txt</span> file
          </h1>
          <p>
            A free checker that tests your llms.txt against the official{" "}
            <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
              llmstxt.org
            </a>{" "}
            specification. Enter a URL or paste your file to check structure, formatting, and links.
          </p>
        </section>

        <Validator />

        <section id="how" className="content">
          <h2>What is llms.txt?</h2>
          <p>
            <code>llms.txt</code> is a proposed standard — a markdown file placed at the root of your
            site (<code>/llms.txt</code>) that gives large language models a concise, curated map of
            your most useful content. Unlike <code>robots.txt</code> (access control) or{" "}
            <code>sitemap.xml</code> (every indexable page), llms.txt is a hand-picked, LLM-friendly
            overview meant to be read at inference time.
          </p>

          <h2>What this checker validates</h2>
          <p>
            The validator follows the structure defined in the specification. Sections must appear in
            this order:
          </p>
          <div className="grid-cards">
            <div className="feature">
              <h3>1. H1 title (required)</h3>
              <p>A single H1 with the project or site name. This is the only required element.</p>
            </div>
            <div className="feature">
              <h3>2. Summary blockquote</h3>
              <p>A short <code>&gt;</code> blockquote summarizing the project.</p>
            </div>
            <div className="feature">
              <h3>3. Detail sections</h3>
              <p>Optional non-heading markdown (paragraphs, lists) with extra context.</p>
            </div>
            <div className="feature">
              <h3>4. File lists</h3>
              <p>
                H2 sections with markdown link lists: <code>[name](url): notes</code>.
              </p>
            </div>
            <div className="feature">
              <h3>Link checks</h3>
              <p>Optionally tests every link in your file to confirm it resolves.</p>
            </div>
            <div className="feature">
              <h3>Live preview</h3>
              <p>See how your llms.txt renders, with invalid list items flagged.</p>
            </div>
          </div>

          <h2>How to use the llms.txt checker</h2>
          <ol className="steps">
            {checkerSteps.map((s, i) => (
              <li key={i}>
                <strong>{s.name}.</strong> {s.text}
              </li>
            ))}
          </ol>

          <h2>Sample template</h2>
          <p>A minimal valid file looks like this:</p>
          <pre className="codeblock">{SAMPLE_TEMPLATE}</pre>

          <div className="cta">
            <h2>Need to create one from scratch?</h2>
            <p>
              Don’t have an llms.txt yet? Use the{" "}
              <a href="/generate">llms.txt generator</a> to build one automatically from your site’s
              sitemap — grounded in your real pages, then validate it here.
            </p>
            <a className="btn" href="/generate">
              Open the generator
            </a>
          </div>

          <h2 id="faq">Frequently asked questions</h2>
          <div className="faq">
            {homeFaqs.map((f, i) => (
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
