import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Contact — llms.txt Checker",
  description: "Get in touch with the llms.txt Checker team.",
  alternates: { canonical: "https://llmschecker.net/contact" },
};

export default function Contact() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <article className="page">
          <h1>Contact</h1>
          <p className="updated">We’d love to hear from you.</p>

          <p>
            Have a question, found a bug, or want to suggest an improvement to the checker? Reach out
            and we’ll get back to you as soon as we can.
          </p>

          <div className="contact-card">
            <div>Email us at</div>
            <div className="email">
              <a href="mailto:info@llmschecker.net">info@llmschecker.net</a>
            </div>
          </div>

          <h2>What to include</h2>
          <ul>
            <li>For bug reports: the URL or file content you were checking and what you expected.</li>
            <li>For feature requests: a short description of what would help your workflow.</li>
            <li>For general questions about the spec, see the official llmstxt.org documentation.</li>
          </ul>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
