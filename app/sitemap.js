const SITE = "https://llmschecker.net";

export default function sitemap() {
  const now = new Date();
  const routes = ["", "/about", "/contact", "/privacy", "/terms"];
  return routes.map((path) => ({
    url: `${SITE}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
