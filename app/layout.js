import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import JsonLd from "./components/JsonLd";
import { webSiteSchema } from "@/lib/seo";

const SITE = "https://llmschecker.net";

export const metadata = {
  metadataBase: new URL(SITE),
  title: "llms.txt Checker & Validator — Test Your llms.txt File Free",
  description:
    "Free online llms.txt checker and validator. Test your llms.txt file against the llmstxt.org specification by URL or by pasting text — check structure, links, and formatting, and fix issues with clear suggestions.",
  keywords: [
    "llms.txt checker",
    "llms.txt validator",
    "validate llms.txt",
    "check llms.txt",
    "llms.txt test",
    "llms.txt generator",
    "llmstxt",
    "LLM optimization",
  ],
  alternates: { canonical: SITE },
  verification: {
    google: "aZD0EbvpfddmwxF9VMHewrxdBKwZde_rgHQtTY4QDjk",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "llms.txt Checker",
    title: "llms.txt Checker & Validator — Test Your llms.txt File Free",
    description:
      "Free online llms.txt checker and validator following the llmstxt.org specification.",
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "llms.txt Checker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "llms.txt Checker & Validator — Test Your llms.txt File Free",
    description:
      "Free online llms.txt checker and validator following the llmstxt.org specification.",
    images: ["/og-home.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

// Applies the saved theme before paint to avoid a flash. Light is the default.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <JsonLd data={webSiteSchema()} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
