import ThemeToggle from "../ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="inner">
        <a className="brand" href="/">
          <span className="logo">L</span>
          <span>llms.txt Checker</span>
        </a>
        <nav className="nav">
          <a href="/#validator">Checker</a>
          <a href="/#how">How it works</a>
          <a href="/about">About</a>
          <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer">
            Spec
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
