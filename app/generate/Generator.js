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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const validation = useMemo(() => (text ? validateLlmsTxt(text) : null), [text]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setData(null);
    setText("");
    if (!domain.trim()) {
      setError({ message: "Please enter a domain." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json.error || "Generation failed." });
        return;
      }
      if (!json.llmsTxt) {
        setError({ message: json.warning || "No crawlable pages were found for this domain." });
        return;
      }
      setData(json);
      setText(json.llmsTxt);
    } catch (e) {
      setError({ message: "Network error: " + e.message });
    } finally {
      setLoading(false);
    }
  }, [domain]);

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
        you can edit the result below.
      </p>

      {loading && (
        <p className="hint" style={{ marginTop: 14 }}>
          Crawling the site and assembling your llms.txt… this can take a few seconds.
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
            Source: {data.discovery?.source || "—"} · discovered {data.counts?.discovered ?? 0} URLs ·
            ranked {data.counts?.ranked ?? 0} · read {data.counts?.fetched ?? 0} pages ·{" "}
            {data.sections?.length ?? 0} section(s).
          </p>

          <div className="section-title">Generated llms.txt (editable)</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
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
                <span className="big">{validation.valid ? "✓" : "✕"}</span>
                <div>
                  {validation.valid
                    ? "Valid — the generated file meets the required structure."
                    : "Needs attention — see the checks below."}
                </div>
              </div>
              <div className="checks">
                {validation.checks.map((c, i) => (
                  <div className="check" key={i}>
                    <span className={"icon " + c.status}>{ICON[c.status]}</span>
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
