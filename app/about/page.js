import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "About — llms.txt Checker",
  description:
    "About llms.txt Checker — a free tool for validating llms.txt files against the llmstxt.org specification.",
  alternates: { canonical: "https://llmschecker.net/about" },
};

export default function About() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <article className="page">
          <h1>About</h1>
          <p className="updated">A free tool for the llms.txt community.</p>

          <p>
            <strong>llms.txt Checker</strong> is a free online validator that helps website owners
            verify their <code>llms.txt</code> file is correctly structured for large language
            models. It checks your file against the official{" "}
            <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
              llmstxt.org
            </a>{" "}
            specification proposed by Jeremy Howard (Answer.AI).
          </p>

          <h2>What it does</h2>
          <p>
            The checker parses your file and validates its structure: the required H1 title, the
            summary blockquote, optional detail sections, and H2 file-list sections with markdown
            links. It can also test that every link in your file resolves, and it renders a live
            preview so you can see how the file is interpreted.
          </p>

          <h2>Why llms.txt matters</h2>
          <p>
            As AI assistants and agents increasingly read websites at inference time, a well-formed{" "}
            <code>llms.txt</code> file gives them a concise, curated map of your most useful content.
            It coexists with <code>robots.txt</code> and <code>sitemap.xml</code> but serves a
            different purpose — helping models understand your site rather than controlling crawler
            access.
          </p>

          <h2>Privacy first</h2>
          <p>
            Validation of pasted text runs entirely in your browser. When you check a URL, the
            request is proxied through a stateless serverless function only to avoid cross-origin
            restrictions — nothing is stored. See our{" "}
            <a href="/privacy">Privacy Policy</a> for details.
          </p>

          <h2>Contact</h2>
          <p>
            Questions, feedback, or bug reports? Email{" "}
            <a href="mailto:info@llmschecker.net">info@llmschecker.net</a> or visit our{" "}
            <a href="/contact">contact page</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
