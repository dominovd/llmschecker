import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import JsonLd from "../../components/JsonLd";
import { SITE, faqSchema, breadcrumbSchema } from "@/lib/seo";

const URL = `${SITE}/guides/agentic-browsing`;

export const metadata = {
  title: "Agentic Browsing Readiness & llms.txt — A Practical Guide",
  description:
    "What Lighthouse's experimental Agentic Browsing audit checks (llms.txt, WebMCP, accessibility tree, CLS), why it isn't a Google ranking factor, and how to make your site agent-ready.",
  keywords: [
    "agentic browsing",
    "lighthouse agentic browsing",
    "llms.txt lighthouse",
    "WebMCP",
    "agent ready website",
    "ai agent accessibility",
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    url: URL,
    title: "Agentic Browsing Readiness & llms.txt — A Practical Guide",
    description:
      "What the Lighthouse Agentic Browsing audit checks and how to make your site ready for AI agents.",
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "llms.txt Checker" }],
  },
};

const faqs = [
  {
    q: "Is Agentic Browsing a Google Search ranking factor?",
    a: "No. It is an experimental Lighthouse category that gives actionable signals about agent readiness, not a Google Search ranking factor. Google's guidance differs depending on the product you ask, and Search has not adopted llms.txt as a ranking signal.",
  },
  {
    q: "Is llms.txt required to pass the audit?",
    a: "No. If your site has no llms.txt (a 404), the audit is marked Not Applicable, not Failed — the file is optional. A server error while fetching it is flagged. Providing a valid llms.txt that returns 200 helps agents discover your structure.",
  },
  {
    q: "How is the Agentic Browsing category scored?",
    a: "Unlike other Lighthouse categories, it has no weighted 0–100 score. It shows a fractional pass ratio, Pass/Fail statuses for specific audits, and informational counts, because the standards are still emerging.",
  },
  {
    q: "What is WebMCP?",
    a: "WebMCP is an experimental API that lets a site explicitly expose its logic and forms to AI agents, declaratively in HTML or imperatively in JavaScript. Lighthouse checks registered tools, forms missing declarative WebMCP, and schema validity.",
  },
  {
    q: "How do I test my site for agentic browsing?",
    a: "Open your page in Chrome Canary, right-click and choose Inspect, go to the Lighthouse tab, enable the Agentic Browsing category, and run the audit.",
  },
];

export default function AgenticBrowsingGuide() {
  const article = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Agentic Browsing Readiness & llms.txt: A Practical Guide",
    description:
      "What Lighthouse's experimental Agentic Browsing audit checks and how to make your site agent-ready.",
    author: { "@type": "Organization", name: "llms.txt Checker" },
    publisher: { "@type": "Organization", name: "llms.txt Checker" },
    datePublished: "2026-06-03",
    dateModified: "2026-06-03",
    mainEntityOfPage: URL,
    url: URL,
  };

  return (
    <>
      <JsonLd
        data={[
          article,
          faqSchema(faqs),
          breadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Guides", url: `${SITE}/guides/agentic-browsing` },
            { name: "Agentic Browsing", url: URL },
          ]),
        ]}
      />
      <SiteHeader />
      <main className="container">
        <article className="page">
          <h1>Agentic Browsing readiness &amp; llms.txt</h1>
          <p className="updated">A practical guide · Updated June 3, 2026</p>

          <p>
            Lighthouse added an experimental category called <strong>Agentic Browsing</strong> that
            evaluates how well a page is built for <em>machine</em> interaction — not just for human
            readers and search crawlers, but for AI agents that read structure, interact with
            elements, and find machine-readable hints. If you publish an <code>llms.txt</code> file,
            this is the context it now lives in.
          </p>
          <p>
            This guide explains what the audit actually checks, what it does <em>not</em> mean for
            SEO, and a concrete checklist to get your site agent-ready.
          </p>

          <h2>First, the honest caveats</h2>
          <p>
            The Agentic Browsing category and WebMCP support are <strong>experimental and based on
            proposed standards</strong>. Two things matter before you act on it:
          </p>
          <ul>
            <li>
              <strong>It is not a Google Search ranking factor.</strong> It produces actionable
              signals about agent readiness, not a position in search results. Don't read it as
              “llms.txt now affects rankings.”
            </li>
            <li>
              <strong>There is no 0–100 score.</strong> Because the standards are still emerging,
              Lighthouse shows a <em>fractional pass ratio</em>, Pass/Fail statuses for specific
              audits, and informational counts — not a weighted grade.
            </li>
          </ul>

          <h2>What the audit checks</h2>
          <p>The category groups deterministic audits into three areas:</p>

          <h3>1. WebMCP integration</h3>
          <p>
            Lighthouse monitors tool-registration events to verify both declarative tools (defined in
            HTML) and imperative tools (defined in JavaScript). The related audits cover{" "}
            <em>registered WebMCP tools</em>, <em>forms missing declarative WebMCP</em>, and{" "}
            <em>WebMCP schema validity</em>. WebMCP is how a site explicitly exposes its logic and
            forms to agents so they can act, not just read.
          </p>

          <h3>2. Agent-centric accessibility</h3>
          <p>
            Agents rely on the <strong>accessibility tree</strong> as their primary model of the
            page. Lighthouse checks a subset of accessibility audits that are critical for machine
            interaction: <strong>names and labels</strong> (every interactive element has a
            programmatic name), <strong>tree integrity</strong> (valid roles and parent-child
            relationships), and <strong>visibility</strong> (interactive content isn't hidden from the
            a11y tree).
          </p>

          <h3>3. Stability &amp; discoverability</h3>
          <p>
            <strong>Cumulative Layout Shift (CLS)</strong> measures visual stability — important
            because an agent may identify an element, then try to interact after it has moved.{" "}
            <strong>llms.txt</strong> checks for a machine-readable summary at the domain root.
          </p>

          <h2>Where llms.txt fits</h2>
          <p>
            The <code>llms.txt</code> audit checks for a machine-readable summary at{" "}
            <code>/llms.txt</code>. An important detail: if the file is missing (a 404), the audit is
            marked <strong>Not Applicable</strong>, not Failed — providing it is optional today. A
            server error while fetching it is flagged. So a valid <code>llms.txt</code> that returns
            200 is a discoverability win, and its absence won't fail you.
          </p>
          <p>
            You can build a spec-compliant file with our{" "}
            <a href="/generate">llms.txt generator</a> (grounded in your real sitemap) and confirm it
            with the <a href="/">llms.txt checker</a> before publishing.
          </p>

          <h2>Why results can fluctuate</h2>
          <p>
            The audits are deterministic, but your results can move between runs because of the timing
            of dynamic (JavaScript) tool registration, changes in DOM size that reshape the
            accessibility tree, and layout shifts from ads, undimensioned images, or injected content.
          </p>

          <h2>An agent-readiness checklist</h2>
          <ol className="steps">
            <li>
              <strong>Publish a valid llms.txt.</strong> Add <code>/llms.txt</code> at your root and
              validate it against the spec.
            </li>
            <li>
              <strong>Keep the accessibility tree sound.</strong> Use semantic HTML and proper ARIA;
              give every interactive element a programmatic name; don't hide interactive content from
              the a11y tree.
            </li>
            <li>
              <strong>Reduce layout shift.</strong> Set dimensions on images and embeds, reserve
              space for dynamic content, and avoid injecting elements above existing content.
            </li>
            <li>
              <strong>Consider WebMCP.</strong> Expose key actions and forms to agents declaratively
              in HTML (or imperatively in JS) so they can act, not just read.
            </li>
          </ol>

          <h2>How to test your page</h2>
          <ol className="steps">
            <li>Open the page in Chrome Canary.</li>
            <li>Right-click and choose Inspect.</li>
            <li>Go to the Lighthouse tab.</li>
            <li>Enable the Agentic Browsing category.</li>
            <li>Run the audit and review the Pass/Fail and informational signals.</li>
          </ol>

          <div className="cta">
            <h2>Get your llms.txt right first</h2>
            <p>
              The easiest agentic-readiness win is a clean <code>llms.txt</code>. Generate one from
              your sitemap, then validate it.
            </p>
            <a className="btn" href="/generate" style={{ marginRight: 8 }}>
              Open the generator
            </a>
            <a className="btn btn-ghost" href="/" style={{ textDecoration: "none" }}>
              Open the checker
            </a>
          </div>

          <h2 id="faq">Frequently asked questions</h2>
          <div className="faq">
            {faqs.map((f, i) => (
              <details key={i}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>

          <h2>Sources</h2>
          <ul>
            <li>
              <a
                href="https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chrome for Developers — Lighthouse Agentic Browsing scoring
              </a>
            </li>
            <li>
              <a
                href="https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chrome for Developers — llms.txt audit
              </a>
            </li>
            <li>
              <a
                href="https://www.searchenginejournal.com/googles-llms-txt-guidance-depends-on-which-product-you-ask/575431/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Search Engine Journal — Google Search vs Lighthouse guidance on llms.txt
              </a>
            </li>
          </ul>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
