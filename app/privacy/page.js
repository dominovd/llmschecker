import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Privacy Policy — llms.txt Checker",
  description: "How llms.txt Checker handles your data. Short version: we don't store it.",
  alternates: { canonical: "https://llmschecker.net/privacy" },
};

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <article className="page">
          <h1>Privacy Policy</h1>
          <p className="updated">Last updated: June 2, 2026</p>

          <p>
            llms.txt Checker (“we”, “the service”) is designed to be privacy-respecting. This policy
            explains what we do and don’t collect.
          </p>

          <h2>Content you validate</h2>
          <p>
            When you use <strong>Text Input</strong>, your content is validated entirely in your
            browser and is never sent to our servers. When you use <strong>URL Input</strong> or the{" "}
            <em>Check links</em> feature, the request is sent to a stateless serverless function that
            fetches the target on your behalf (to avoid browser cross-origin restrictions). We do not
            log, store, or share the content of those files or the URLs you check.
          </p>

          <h2>Generator and AI</h2>
          <p>
            When you use the <strong>Generator</strong>, we crawl your site’s public pages
            (sitemap and page metadata) to build the file. If AI grouping is enabled, only
            non-sensitive page metadata — page paths, titles, descriptions, and headings — is sent
            to our configured LLM provider to organize the result. We never send page metadata that
            isn’t already publicly available on your site, and the generator only ever outputs URLs
            that were actually found on your site. Results are not stored.
          </p>

          <h2>Cookies</h2>
          <p>
            We do not use tracking or advertising cookies. The only thing stored on your device is a
            small <code>localStorage</code> value remembering your light/dark theme preference. It
            never leaves your browser.
          </p>

          <h2>Analytics</h2>
          <p>
            We use Vercel Web Analytics to understand aggregate, anonymous traffic (such as page
            views and country). It is cookieless and does not collect personally identifiable
            information or build user profiles. We do not use Speed Insights or any third-party
            advertising trackers.
          </p>

          <h2>Hosting and logs</h2>
          <p>
            The site is hosted on Vercel. Like most hosting providers, Vercel may process standard
            technical request data (such as IP address and user agent) transiently to deliver the
            service and protect against abuse. We do not maintain our own additional logs of your
            activity.
          </p>

          <h2>Third-party links</h2>
          <p>
            Our pages and validation results may link to external websites. We are not responsible
            for the privacy practices of those sites.
          </p>

          <h2>Changes</h2>
          <p>
            We may update this policy from time to time. Material changes will be reflected by the
            “Last updated” date above.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about privacy? Email{" "}
            <a href="mailto:info@llmschecker.net">info@llmschecker.net</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
