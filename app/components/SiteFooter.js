export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <nav className="footer-nav">
          <a href="/guides/agentic-browsing">Agentic Browsing guide</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
            Spec
          </a>
        </nav>
        <div className="footer-meta">
          llms.txt Checker · Built on the{" "}
          <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
            llmstxt.org
          </a>{" "}
          specification ·{" "}
          <a href="mailto:info@llmschecker.net">info@llmschecker.net</a> ·{" "}
          {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
