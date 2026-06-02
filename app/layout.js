import "./globals.css";

const SITE = "https://llmschecker.net";

export const metadata = {
  metadataBase: new URL(SITE),
  title: "llms.txt Checker — Validate Your llms.txt File",
  description:
    "Free online llms.txt checker and validator. Test your llms.txt file against the llmstxt.org specification by URL or by pasting text. Check structure, links, and formatting.",
  keywords: [
    "llms.txt checker",
    "llms.txt validator",
    "llms.txt",
    "llmstxt",
    "AI content access",
    "LLM optimization",
  ],
  alternates: { canonical: SITE },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "llms.txt Checker",
    title: "llms.txt Checker — Validate Your llms.txt File",
    description:
      "Free online llms.txt checker and validator following the llmstxt.org specification.",
  },
  twitter: {
    card: "summary_large_image",
    title: "llms.txt Checker — Validate Your llms.txt File",
    description:
      "Free online llms.txt checker and validator following the llmstxt.org specification.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
