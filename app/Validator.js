"use client";

import { useState, useMemo, useCallback } from "react";
import { validateLlmsTxt, renderPreview, SAMPLE_TEMPLATE, STATUS } from "@/lib/validator";

const ICON = {
  [STATUS.PASS]: "✓",
  [STATUS.WARN]: "!",
  [STATUS.FAIL]: "✕",
  [STATUS.INFO]: "i",
};

export default function Validator() {
  const [mode, setMode] = useState("url"); // "url" | "text"
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [source, setSource] = useState(null); // info about fetched file
  const [linkResults, setLinkResults] = useState(null);
  const [checkingLinks, setCheckingLinks] = useState(false);

  const preview = useMemo(
    () => (result ? renderPreview(result.parsed.__raw ?? "") : ""),
    [result]
  );

  const runValidation = useCallback((raw, src) => {
    const res = validateLlmsTxt(raw);
    res.parsed.__raw = raw; // keep raw for preview
    setResult(res);
    setSource(src || null);
    setLinkResults(null);
    setError(null);
  }, []);

  const handleValidate = useCallback(async () => {
    setError(null);
    setResult(null);
    setLinkResults(null);

    if (mode === "text") {
      if (!text.trim()) {
        setError({ message: "Please paste your llms.txt content first." });
        return;
      }
      runValidation(text, { kind: "text" });
      return;
    }

    if (!url.trim()) {
      setError({ message: "Please enter a URL or domain first." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "Failed to fetch file.", details: data.details });
        return;
      }
      runValidation(data.content, {
        kind: "url",
        finalUrl: data.finalUrl,
        contentType: data.contentType,
      });
    } catch (e) {
      setError({ message: "Network error: " + e.message });
    } finally {
      setLoading(false);
    }
  }, [mode, text, url, runValidation]);

  const handleCheckLinks = useCallback(async () => {
    if (!result || result.links.length === 0) return;
    const urls = result.links
      .map((l) => l.url)
      .filter((u) => /^https?:\/\//i.test(u));
    if (urls.length === 0) {
      setLinkResults([]);
      return;
    }
    setCheckingLinks(true);
    try {
      const res = await fetch("/api/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      setLinkResults(data.results || []);
    } catch (e) {
      setLinkResults([{ url: "(error)", ok: false, status: 0, error: e.message }]);
    } finally {
      setCheckingLinks(false);
    }
  }, [result]);

  const loadSample = useCallback(() => {
    setMode("text");
    setText(SAMPLE_TEMPLATE);
    setError(null);
    setResult(null);
  }, []);

  const linkNameByUrl = useMemo(() => {
    const map = {};
    if (result) result.links.forEach((l) => (map[l.url] = l.name));
    return map;
  }, [result]);

  return (
    <div className="validator" id="validator">
      <div className="tabs" role="tablist">
        <button
          className={"tab" + (mode === "url" ? " active" : "")}
          onClick={() => setMode("url")}
        >
          URL Input
        </button>
        <button
          className={"tab" + (mode === "text" ? " active" : "")}
          onClick={() => setMode("text")}
        >
          Text Input
        </button>
      </div>

      {mode === "url" ? (
        <>
          <div className="input-row">
            <input
              type="text"
              placeholder="example.com  or  https://example.com/llms.txt"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
            />
            <button className="btn" onClick={handleValidate} disabled={loading}>
              {loading ? <span className="spinner" /> : "Validate"}
            </button>
          </div>
          <p className="hint">
            Enter a domain and we’ll look for <code>/llms.txt</code>, or paste a direct link to a
            .txt file.
          </p>
        </>
      ) : (
        <>
          <textarea
            placeholder="Paste your llms.txt content here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="actions">
            <button className="btn" onClick={handleValidate} disabled={loading}>
              Validate
            </button>
            <button className="btn btn-ghost" onClick={loadSample}>
              Load sample template
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="results">
          <div className="error-box">
            <strong>{error.message}</strong>
            {error.details && error.details.length > 0 && (
              <ul>
                {error.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="results">
          <div className={"result-banner " + (result.valid ? "ok" : "bad")}>
            <span className="big">{result.valid ? "✓" : "✕"}</span>
            <div>
              {result.valid
                ? "Valid — your file meets the required structure."
                : "Invalid — required elements are missing."}
              {source && source.kind === "url" && source.finalUrl && (
                <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 400 }}>
                  Fetched from {source.finalUrl}
                </div>
              )}
            </div>
          </div>

          <div className="checks">
            {result.checks.map((c, i) => (
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

          {result.suggestions.length > 0 && (
            <>
              <div className="section-title">Improvement suggestions</div>
              <ul className="suggestions">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}

          {result.links.length > 0 && (
            <>
              <div className="section-title">
                Links ({result.links.length})
                <button
                  className="btn btn-ghost"
                  style={{ marginLeft: 12, padding: "5px 12px", fontSize: 13 }}
                  onClick={handleCheckLinks}
                  disabled={checkingLinks}
                >
                  {checkingLinks ? "Checking…" : "Check links"}
                </button>
              </div>
              {linkResults ? (
                linkResults.map((lr, i) => (
                  <div className="linkrow" key={i}>
                    <span className={"status " + (lr.ok ? "ok" : "bad")}>
                      {lr.status ? lr.status : "ERR"}
                    </span>
                    <span className="name">{linkNameByUrl[lr.url] || ""}</span>
                    <span className="url">{lr.url}</span>
                  </div>
                ))
              ) : (
                result.links.map((l, i) => (
                  <div className="linkrow" key={i}>
                    <span className="name">{l.name}</span>
                    <span className="url">{l.url}</span>
                  </div>
                ))
              )}
            </>
          )}

          <div className="section-title">Formatted preview</div>
          <div
            className="preview"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      )}
    </div>
  );
}
