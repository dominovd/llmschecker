// llms.txt validator — implements the spec at https://llmstxt.org/
//
// Spec summary (in required order):
//   1. An H1 with the name of the project/site. (ONLY required section)
//   2. A blockquote with a short summary of the project.
//   3. Zero or more markdown sections (non-heading) with more detail.
//   4. Zero or more H2-delimited sections containing "file lists":
//      each list item has a required markdown link [name](url),
//      optionally followed by ": notes about the file".
//
// Pure functions — safe to run in the browser and in Node.

const STATUS = { PASS: "pass", WARN: "warn", FAIL: "fail", INFO: "info" };

// Markdown link, e.g. [Title](https://example.com): optional notes
const LINK_RE = /^\s*[-*+]\s+\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*(?::\s*(.*))?$/;
const INLINE_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;

function parseLlmsTxt(raw) {
  const text = (raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  const result = {
    title: null,
    titleLine: null,
    summary: null, // blockquote text
    summaryLines: [],
    details: [], // free markdown blocks before first H2
    sections: [], // { name, items: [{name,url,notes,line}], rawLines }
    extraH1: [], // additional H1s (spec allows only one)
    links: [], // flat list of all file-list links
    hasContentBeforeTitle: false,
  };

  let i = 0;
  let inCodeFence = false;
  let fenceMarker = "";

  // Helper to toggle code fences so we don't parse markup inside ```
  function fenceToggle(line) {
    const m = line.match(/^\s*(```+|~~~+)/);
    if (!m) return false;
    const marker = m[1][0].repeat(3);
    if (!inCodeFence) {
      inCodeFence = true;
      fenceMarker = marker;
    } else if (line.trim().startsWith(fenceMarker)) {
      inCodeFence = false;
    }
    return true;
  }

  // 1) Find H1 title (first non-empty line should be "# ...")
  let titleFound = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (fenceToggle(line)) continue;
    if (inCodeFence) continue;
    if (line.trim() === "") continue;

    const h1 = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (h1 && !titleFound) {
      result.title = h1[1].trim();
      result.titleLine = i + 1;
      titleFound = true;
      i++;
      break;
    } else {
      // Something other than an H1 appears before the title
      result.hasContentBeforeTitle = true;
      // Still try to find an H1 later
      const laterH1 = line.match(/^#\s+(.+?)\s*#*\s*$/);
      if (laterH1) {
        result.title = laterH1[1].trim();
        result.titleLine = i + 1;
        titleFound = true;
        i++;
        break;
      }
    }
  }

  // 2..4) Walk the rest
  let currentSection = null;
  let collectingSummary = false;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (fenceToggle(line)) {
      if (currentSection) currentSection.rawLines.push(line);
      else if (!collectingSummary) result.details.push({ text: line, line: lineNo });
      continue;
    }
    if (inCodeFence) {
      if (currentSection) currentSection.rawLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Additional H1
    const h1 = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (h1) {
      result.extraH1.push({ text: h1[1].trim(), line: lineNo });
      continue;
    }

    // H2 section
    const h2 = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h2) {
      collectingSummary = false;
      currentSection = {
        name: h2[1].trim(),
        items: [],
        rawLines: [],
        line: lineNo,
        nonLinkItems: [],
      };
      result.sections.push(currentSection);
      continue;
    }

    // H3+ headings — keep within current section context but record nothing special
    const hN = line.match(/^#{3,6}\s+/);
    if (hN) {
      if (currentSection) currentSection.rawLines.push(line);
      continue;
    }

    // Blockquote (summary) — only meaningful before the first H2
    if (!currentSection && /^\s*>/.test(line)) {
      collectingSummary = true;
      const qText = line.replace(/^\s*>\s?/, "");
      result.summaryLines.push(qText);
      continue;
    }

    if (currentSection) {
      // Inside a section: look for list items with links
      const m = line.match(LINK_RE);
      if (m) {
        const item = {
          name: m[1].trim(),
          url: m[2].trim(),
          notes: (m[3] || "").trim() || null,
          line: lineNo,
        };
        currentSection.items.push(item);
        result.links.push(item);
      } else if (/^\s*[-*+]\s+/.test(line)) {
        // A list item without a proper link
        if (trimmed !== "") {
          currentSection.nonLinkItems.push({ text: trimmed, line: lineNo });
        }
      } else if (trimmed !== "") {
        currentSection.rawLines.push(line);
      }
    } else {
      // Before first H2: free-form detail blocks (after summary)
      if (collectingSummary && trimmed === "") {
        collectingSummary = false;
        continue;
      }
      if (trimmed !== "") {
        result.details.push({ text: trimmed, line: lineNo });
      }
    }
  }

  result.summary = result.summaryLines.join("\n").trim() || null;
  return result;
}

function validateLlmsTxt(raw) {
  const text = (raw || "").trim();
  const parsed = parseLlmsTxt(raw);
  const checks = [];
  const suggestions = [];

  // Empty input
  if (text === "") {
    checks.push({
      id: "content",
      label: "Content",
      status: STATUS.FAIL,
      message: "The file is empty. An llms.txt file must contain at least an H1 title.",
    });
    return { valid: false, checks, suggestions, parsed, links: [] };
  }

  // 1. H1 title (required)
  if (parsed.title) {
    let msg = `Found H1 title: "${parsed.title}".`;
    let status = STATUS.PASS;
    if (parsed.hasContentBeforeTitle) {
      status = STATUS.WARN;
      msg += " Note: content appears before the H1. The H1 should be the first element.";
      suggestions.push("Move the H1 title to the very top of the file — it should be the first line.");
    }
    checks.push({ id: "h1", label: "H1 Title", status, message: msg, required: true });
  } else {
    checks.push({
      id: "h1",
      label: "H1 Title",
      status: STATUS.FAIL,
      message: "Missing required H1 title. Add a line starting with '# ' and your project/site name.",
      required: true,
    });
    suggestions.push("Add an H1 title at the top, e.g. '# My Project'. This is the only required section.");
  }

  // Multiple H1s
  if (parsed.extraH1.length > 0) {
    checks.push({
      id: "single-h1",
      label: "Single H1",
      status: STATUS.WARN,
      message: `Found ${parsed.extraH1.length + 1} H1 headings. The spec expects exactly one H1 (the project name).`,
    });
    suggestions.push("Use only one H1. Convert additional H1s to H2 section headers ('## ...').");
  }

  // 2. Blockquote summary (recommended)
  if (parsed.summary) {
    checks.push({
      id: "summary",
      label: "Summary Blockquote",
      status: STATUS.PASS,
      message: "Found a blockquote summary describing the project.",
    });
  } else {
    checks.push({
      id: "summary",
      label: "Summary Blockquote",
      status: STATUS.WARN,
      message: "No blockquote summary found. A short '> summary' helps LLMs understand the file.",
    });
    suggestions.push("Add a blockquote summary right after the title, e.g. '> A short description of your project.'");
  }

  // 3. Detail sections (optional, informational)
  if (parsed.details.length > 0) {
    checks.push({
      id: "details",
      label: "Project Details",
      status: STATUS.INFO,
      message: `Found ${parsed.details.length} line(s) of optional detail content before the file lists.`,
    });
  } else {
    checks.push({
      id: "details",
      label: "Project Details",
      status: STATUS.INFO,
      message: "No optional detail paragraphs found (this is fine — they are optional).",
    });
  }

  // 4. H2 file-list sections
  if (parsed.sections.length > 0) {
    const totalLinks = parsed.links.length;
    let sectionStatus = STATUS.PASS;
    let sectionMsg = `Found ${parsed.sections.length} section(s) with ${totalLinks} link(s).`;

    const emptySections = parsed.sections.filter(
      (s) => s.items.length === 0 && s.nonLinkItems.length === 0
    );
    const badItemSections = parsed.sections.filter((s) => s.nonLinkItems.length > 0);

    if (totalLinks === 0) {
      sectionStatus = STATUS.WARN;
      sectionMsg += " None of the sections contain valid markdown links.";
    }
    checks.push({
      id: "sections",
      label: "File List Sections",
      status: sectionStatus,
      message: sectionMsg,
    });

    if (emptySections.length > 0) {
      suggestions.push(
        `These sections have no list items: ${emptySections
          .map((s) => `"${s.name}"`)
          .join(", ")}. Add list items or remove the section.`
      );
    }
    if (badItemSections.length > 0) {
      const examples = [];
      badItemSections.forEach((s) =>
        s.nonLinkItems.forEach((it) => examples.push(`line ${it.line}: ${it.text}`))
      );
      checks.push({
        id: "list-format",
        label: "List Item Format",
        status: STATUS.WARN,
        message:
          `${examples.length} list item(s) are missing a proper markdown link [name](url).`,
      });
      suggestions.push(
        "Every file-list item needs a markdown link, e.g. '- [Title](https://url): optional notes'."
      );
    }

    // "Optional" section recognition (spec gives it special meaning)
    const optional = parsed.sections.find((s) => /^optional$/i.test(s.name));
    if (optional) {
      checks.push({
        id: "optional-section",
        label: "Optional Section",
        status: STATUS.INFO,
        message: 'Found an "Optional" section — its links may be skipped when a shorter context is needed.',
      });
    }
  } else {
    checks.push({
      id: "sections",
      label: "File List Sections",
      status: STATUS.WARN,
      message: "No H2 file-list sections found. Add '## Section' blocks with links to your markdown docs.",
    });
    suggestions.push(
      "Add at least one H2 section with file links, e.g. '## Docs' followed by '- [Guide](https://...)'."
    );
  }

  const hasFail = checks.some((c) => c.status === STATUS.FAIL);

  return {
    valid: !hasFail,
    checks,
    suggestions,
    parsed,
    links: parsed.links,
  };
}

// Render parsed llms.txt to a simple HTML preview string (minimal, safe-ish markdown subset).
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPreview(raw) {
  const parsed = parseLlmsTxt(raw);
  // NOTE: the preview uses non-heading <div>s styled as headings on purpose, so
  // the user's llms.txt content does not inject extra <h1>/<h2> into the page's
  // document outline (keeps the accessibility tree well-formed).
  let html = "";
  if (parsed.title) html += `<div class="ph1">${escapeHtml(parsed.title)}</div>`;
  if (parsed.summary) html += `<blockquote>${escapeHtml(parsed.summary).replace(/\n/g, "<br>")}</blockquote>`;
  if (parsed.details.length) {
    html += "<div class='details'>";
    parsed.details.forEach((d) => {
      html += `<p>${renderInline(d.text)}</p>`;
    });
    html += "</div>";
  }
  parsed.sections.forEach((s) => {
    html += `<div class="ph2">${escapeHtml(s.name)}</div>`;
    if (s.items.length || s.nonLinkItems.length) {
      html += "<ul>";
      s.items.forEach((it) => {
        html += `<li><a href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          it.name
        )}</a>${it.notes ? ": " + escapeHtml(it.notes) : ""}</li>`;
      });
      s.nonLinkItems.forEach((it) => {
        html += `<li class="invalid">${escapeHtml(it.text)}</li>`;
      });
      html += "</ul>";
    }
  });
  return html || "<p class='muted'>Nothing to preview yet.</p>";
}

function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (m, name, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

const SAMPLE_TEMPLATE = `# Title

> Optional description goes here

Optional details go here

## Section name

- [Link title](https://link_url): Optional link details

## Optional

- [Link title](https://link_url)
`;

module.exports = {
  STATUS,
  parseLlmsTxt,
  validateLlmsTxt,
  renderPreview,
  SAMPLE_TEMPLATE,
  INLINE_LINK_RE,
};
