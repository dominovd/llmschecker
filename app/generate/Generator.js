"use client";

import { useState, useMemo, useCallback } from "react";
import { validateLlmsTxt, STATUS } from "@/lib/validator";

const ICON = {
  [STATUS.PASS]: "✓",
  [STATUS.WARN]: "!",
  [STATUS.FAIL]: "✕",
  [STATUS.INFO]: "i",
};

export default function Generator() {
  const [domain, setDomain] = useState("");
  const [sitemaps, setSitemaps] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(null);

  const validation = useMemo(() => (text ? validateLlmsTxt(text) : null), [text]);

  const progressLabel = useMemo(() => {
    if (!progress) return null;
    if (progress.phase === "generating") return "Assembling and validating…";
    const s = progress.step;
    if (s === "discover") return "Discovering URLs (sitemap / robots.txt)…";
    if (s === "discovered")
      return `Found ${progress.discovered ?? 0} URLs (${progress.source || "—"}); reading top ${
        progress.ranked ?? 0
      } pages…`;
    if (s === "fetch") return `Reading pages… ${progress.done ?? 0}/${progress.total ?? 0}`;
    return "Working…";
  }, [progress]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setData(null);
    setText("");
    setProgress(null);
    if (!domain.trim()) {
      setError({ message: "Please enter a domain." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, sitemaps }),
      });

      // Non-stream error responses (400 etc.) come back as JSON.
      const ctype = res.headers.get("content-type") || "";
      if (!res.ok || !ctype.includes("text/event-stream") || !res.body) {
        const json = await res.json().catch(() => ({}));
        setError({ message: json.error || "Generation failed." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let got = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const raw = buf.slice(0, idx).replace(/^data:\s?/, "");
          buf = buf.slice(idx + 2);
          if (!raw) continue;
          let ev;
          try {
            ev = JSON.parse(raw);
          } catch {
            continue;
          }
          if (ev.phase === "progress" || ev.phase === "generating") {
            setProgress(ev);
          } else if (ev.phase === "error") {
            setError({ message: ev.message || "Generation failed." });
          } else if (ev.phase === "result") {
            got = true;
            setData(ev);
            setText(ev.llmsTxt || "");
          }
        }
      }
      if (!got) {
        setError((prev) => prev || { message: "No result was produced." });
      }
    } catch (e) {
      setError({ message: "Network error: " + e.message });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [domain, sitemaps]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [text]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [text]);

  return (
    <div className="validator" id="generator">
      <div className="input-row">
        <input
          type="text"
          aria-label="Website domain to generate an llms.txt for"
          placeholder="yourdomain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        <button className="btn" onClick={handleGenerate} disabled={loading}>
          {loading ? <span className="spinner" /> : "Generate"}
        </button>
      </div>
      <p className="hint">
        We crawl <code>sitemap.xml</code> and read page metadata. Large sites are capped for speed —
        you can edit the result below.{" "}
        <button
          type="button"
          className="linklike"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide sitemap options" : "Have a custom sitemap?"}
        </button>
      </p>

      {showAdvanced && (
        <div style={{ marginTop: 6 }}>
          <textarea
            style={{ minHeight: 84 }}
            aria-label="Custom sitemap URLs, one per line"
            placeholder={"Optional: sitemap URLs, one per line\nhttps://example.com/custom-sitemap.xml"}
            value={sitemaps}
            onChange={(e) => setSitemaps(e.target.value)}
            spellCheck={false}
          />
          <p className="hint" style={{ marginTop: 4 }}>
            If provided, we use these sitemaps first (full URL or a path like{" "}
            <code>/sitemap-index.xml</code>). Otherwise we auto-discover via robots.txt.
          </p>
        </div>
      )}

      {loading && (
        <p className="hint" style={{ marginTop: 14 }}>
          <span className="spinner" style={{ marginRight: 8 }} />
          {progressLabel || "Crawling the site and assembling your llms.txt…"}
        </p>
      )}

      {error && (
        <div className="results">
          <div className="error-box">
            <strong>{error.message}</strong>
          </div>
        </div>
      )}

      {data && (
        <div className="results">
          <div className="section-title">
            Crawl summary
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            Grouping: {data.method === "ai" ? "AI (grounded)" : "rule-based"} · source:{" "}
            {data.discovery?.source || "—"} · discovered {data.counts?.discovered ?? 0} URLs · ranked{" "}
            {data.counts?.ranked ?? 0} · read {data.counts?.fetched ?? 0} pages ·{" "}
            {data.sections?.length ?? 0} section(s).
            {data.partial && " · stopped early at the time limit — result may be partial."}
          </p>

          <div className="section-title">Generated llms.txt (editable)</div>
          <textarea
            aria-label="Generated llms.txt (editable)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          <div className="actions">
            <button className="btn" onClick={handleDownload}>
              Download llms.txt
            </button>
            <button className="btn btn-ghost" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {validation && (
            <>
              <div className="section-title">Validation</div>
              <div className={"result-banner " + (validation.valid ? "ok" : "bad")}>
                <span className="big" aria-hidden="true">
                  {validation.valid ? "✓" : "✕"}
                </span>
                <div>
                  {validation.valid
                    ? "Valid — the generated file meets the required structure."
                    : "Needs attention — see the checks below."}
                </div>
              </div>
              <div className="checks">
                {validation.checks.map((c, i) => (
                  <div className="check" key={i}>
                    <span className={"icon " + c.status} aria-hidden="true">
                      {ICON[c.status]}
                    </span>
                    <div className="body">
                      <div className="label">
                        {c.label}
                        {c.required && <span className="req">required</span>}
                      </div>
                      <div className="msg">{c.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
