import Validator from "./Validator";
import { SAMPLE_TEMPLATE } from "@/lib/validator";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="inner">
          <a className="brand" href="/">
            <span className="logo">L</span>
            <span>llms.txt Checker</span>
          </a>
          <nav className="nav">
            <a href="#validator">Checker</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
            <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
              Spec
            </a>
          </nav>
        </div>
      </header>

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

          <h2>Sample template</h2>
          <p>A minimal valid file looks like this:</p>
          <pre className="codeblock">{SAMPLE_TEMPLATE}</pre>

          <h2 id="faq">Frequently asked questions</h2>
          <div className="faq">
            <details>
              <summary>Is llms.txt required for my website?</summary>
              <p>
                No. It is an optional, emerging standard. It is most useful for documentation-heavy
                sites, products, and any site you want LLMs and AI agents to understand accurately.
              </p>
            </details>
            <details>
              <summary>Where should the file live?</summary>
              <p>
                At the root of your domain, served at <code>/llms.txt</code> as plain text/markdown.
                Subpath hosting is also allowed by the spec.
              </p>
            </details>
            <details>
              <summary>What is the only required section?</summary>
              <p>
                The H1 title with your project/site name. Everything else — the summary blockquote,
                detail paragraphs, and file-list sections — is optional but recommended.
              </p>
            </details>
            <details>
              <summary>How is llms.txt different from robots.txt?</summary>
              <p>
                <code>robots.txt</code> controls crawler access. <code>llms.txt</code> provides a
                curated, LLM-readable overview of your content — they serve different purposes and
                coexist.
              </p>
            </details>
            <details>
              <summary>Does this tool store my data?</summary>
              <p>
                No. Validation of pasted text runs in your browser. URL fetching and link checks are
                proxied through a stateless serverless function only to avoid CORS — nothing is
                stored.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          llms.txt Checker · Built on the{" "}
          <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
            llmstxt.org
          </a>{" "}
          specification · {new Date().getFullYear()}
        </div>
      </footer>
    </>
  );
}
