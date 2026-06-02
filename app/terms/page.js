import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Terms of Service — llms.txt Checker",
  description: "The terms governing your use of llms.txt Checker.",
  alternates: { canonical: "https://llmschecker.net/terms" },
};

export default function Terms() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <article className="page">
          <h1>Terms of Service</h1>
          <p className="updated">Last updated: June 2, 2026</p>

          <p>
            By accessing or using llms.txt Checker (“the service”), you agree to these terms. If you
            do not agree, please do not use the service.
          </p>

          <h2>1. The service</h2>
          <p>
            llms.txt Checker is a free online tool that validates the structure of{" "}
            <code>llms.txt</code> files against the llmstxt.org specification and optionally checks
            that links resolve. It is provided for informational purposes only.
          </p>

          <h2>2. No warranty</h2>
          <p>
            The service is provided “as is” and “as available”, without warranties of any kind,
            express or implied. We do not guarantee that validation results are complete, accurate,
            or that the service will be uninterrupted or error-free. The llms.txt specification is an
            evolving proposal, and results may change as it develops.
          </p>

          <h2>3. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service to check content you are not authorized to access.</li>
            <li>
              Attempt to disrupt, overload, or reverse-engineer the service, or use it to attack
              third-party sites via the URL or link-checking features.
            </li>
            <li>Use automated means to abuse the service beyond reasonable interactive use.</li>
          </ul>

          <h2>4. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of, or inability to use, the
            service.
          </p>

          <h2>5. Third-party content</h2>
          <p>
            The service fetches and displays content from URLs you provide and may link to external
            sites. We are not responsible for that content or those sites.
          </p>

          <h2>6. Changes</h2>
          <p>
            We may modify the service or these terms at any time. Continued use after changes
            constitutes acceptance of the updated terms.
          </p>

          <h2>7. Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a href="mailto:info@llmschecker.net">info@llmschecker.net</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
