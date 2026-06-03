// Shared SEO content + Schema.org builders.
// FAQ/HowTo text here is rendered BOTH visibly and as JSON-LD so they match
// (a requirement for Google rich results).

export const SITE = "https://llmschecker.net";

export const homeFaqs = [
  {
    q: "What is an llms.txt file?",
    a: "An llms.txt file is a markdown file placed at the root of your website (/llms.txt) that gives large language models a concise, curated map of your most useful content. It is an emerging standard defined at llmstxt.org.",
  },
  {
    q: "Is llms.txt required for my website?",
    a: "No. It is an optional, emerging standard. It is most useful for documentation-heavy sites, products, and any site you want LLMs and AI agents to understand accurately.",
  },
  {
    q: "Where should the llms.txt file live?",
    a: "At the root of your domain, served at /llms.txt as plain text or markdown. Subpath hosting is also allowed by the specification.",
  },
  {
    q: "What is the only required section of llms.txt?",
    a: "The H1 title with your project or site name. Everything else — the summary blockquote, detail paragraphs, and file-list sections — is optional but recommended.",
  },
  {
    q: "How is llms.txt different from robots.txt?",
    a: "robots.txt controls crawler access. llms.txt provides a curated, LLM-readable overview of your content. They serve different purposes and coexist.",
  },
  {
    q: "Does this llms.txt checker store my data?",
    a: "No. Validation of pasted text runs in your browser. URL fetching and link checks are proxied through a stateless serverless function only to avoid CORS — nothing is stored.",
  },
  {
    q: "Does llms.txt help with AI agents and agentic browsing?",
    a: "Yes. llms.txt is one of the signals in Lighthouse's experimental Agentic Browsing audit, which measures how ready a page is for AI agents. It is not a Google Search ranking factor, but a valid llms.txt helps agents discover your site's structure. Our Agentic Browsing guide explains the full audit.",
  },
];

export const generatorFaqs = [
  {
    q: "What is an llms.txt generator?",
    a: "An llms.txt generator creates a spec-compliant llms.txt file for your website. This generator crawls your sitemap, reads your real page metadata, groups the pages into sections, and assembles a ready-to-use llms.txt.",
  },
  {
    q: "Does the generator invent URLs?",
    a: "No. Every link in the generated file comes from a page that was actually found on your site. The generator is grounded in your real sitemap and never fabricates URLs.",
  },
  {
    q: "How does the generator find my pages?",
    a: "It reads your robots.txt and sitemap.xml (and common alternate sitemap locations), falling back to links on your homepage. You can also paste one or more custom sitemap URLs.",
  },
  {
    q: "What if my site is multilingual?",
    a: "The generator keeps English pages by default and skips localized duplicates (for example /ar/ or /es/ paths), so your llms.txt stays focused and doesn't mix languages.",
  },
  {
    q: "Can I edit the result before downloading?",
    a: "Yes. The generated llms.txt is fully editable in the browser and re-validated live as you type. When you're happy, copy it or download the llms.txt file.",
  },
  {
    q: "Is the llms.txt generator free?",
    a: "Yes, it is free to use. Large sites are capped for speed and fair use.",
  },
];

export const checkerSteps = [
  { name: "Choose your input", text: "Pick URL Input to fetch a live /llms.txt, or Text Input to paste your file." },
  { name: "Enter your content", text: "Type your domain or paste your llms.txt content into the checker." },
  { name: "Validate", text: "Press Validate to run the checker against the llmstxt.org specification." },
  { name: "Review results", text: "Read the per-rule checks, link statuses, and improvement suggestions." },
  { name: "Fix and revalidate", text: "Apply the suggestions and run the checker again to confirm a clean result." },
];

export const generatorSteps = [
  { name: "Enter your domain", text: "Type your website domain. Optionally add custom sitemap URLs." },
  { name: "Generate", text: "We crawl your sitemap, read page metadata, and group pages into sections." },
  { name: "Review and edit", text: "Edit the project name, summary, and link notes; validation updates live." },
  { name: "Download llms.txt", text: "Copy or download the file and place it at the root of your site as /llms.txt." },
];

export function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function howToSchema(name, steps, url) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    url,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function softwareAppSchema({ name, description, url }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any (web-based)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isAccessibleForFree: true,
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "llms.txt Checker",
    url: SITE,
    description:
      "Free llms.txt checker, validator, and generator following the llmstxt.org specification.",
  };
}
