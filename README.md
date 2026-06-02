# llms.txt Checker — llmschecker.net

A free online checker and validator for [`llms.txt`](https://llmstxt.org/) files. Validate by URL
or by pasting text, with structure checks, link validation, and a live preview.

Built with Next.js (App Router). Validation logic lives in `lib/validator.js` and follows the
official llmstxt.org specification:

1. **H1 title** — the project/site name (the only required section)
2. **Summary blockquote** — a short `>` description
3. **Detail sections** — optional non-heading markdown
4. **File-list sections** — H2 headers with `- [name](url): notes` link lists

## Project structure

```
app/
  layout.js            Root layout + SEO metadata
  page.js              Landing page (server component)
  Validator.js         Interactive checker (client component)
  globals.css          Styles
  sitemap.js           sitemap.xml
  icon.svg             Favicon
  api/
    check/route.js        Fetches /llms.txt for a given URL (avoids CORS)
    check-links/route.js  Checks that links in the file resolve
lib/
  validator.js         Parser + validator (pure, isomorphic)
public/
  llms.txt             This site's own llms.txt
  robots.txt
```

## Generator (optional AI)

The `/generate` page crawls a domain's sitemap and builds an `llms.txt` from **real
URLs only** (see `docs/generator-architecture.md`). Grouping uses a deterministic
rule-based assembler by default. To enable AI grouping, set an LLM provider key as an
environment variable (see `.env.example`):

- `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`), optionally `LLM_PROVIDER` and `LLM_MODEL`.

Without a key, the generator automatically falls back to rule-based grouping — no errors.
The model only ever receives page metadata and references pages by id; code maps ids back
to real crawled URLs, so the AI cannot introduce invented links.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # run the production build
```

## Deploy to Vercel via Git

1. Create a Git repo and push:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: llms.txt checker"
   git branch -M main
   git remote add origin git@github.com:<you>/llmschecker.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
   Vercel auto-detects Next.js; no configuration needed. Click **Deploy**.

3. **Custom domain:** in the Vercel project → **Settings → Domains** → add `llmschecker.net`
   (and `www.llmschecker.net`). Vercel shows the DNS records to set:
   - Apex `llmschecker.net` → an **A** record to `76.76.21.21`, or follow Vercel's current
     instructions (use an **ALIAS/ANAME** to `cname.vercel-dns.com` if your DNS supports it).
   - `www` → a **CNAME** to `cname.vercel-dns.com`.

   Update these at your domain registrar. SSL is provisioned automatically once DNS resolves.

Every push to `main` redeploys automatically.

## Notes

- Text-input validation runs entirely in the browser; nothing is stored.
- URL fetching and link checks run in stateless serverless functions only to avoid CORS.
