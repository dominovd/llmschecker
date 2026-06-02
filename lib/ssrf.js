// SSRF protection helpers.
//
// Validates that a user-supplied URL points at a public host before we fetch it,
// and provides a `safeFetch` wrapper that re-validates on every redirect hop and
// caps the response size. This prevents the server from being tricked into
// requesting internal services (cloud metadata, localhost, private networks).

import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
]);

const ALLOWED_PORTS = new Set([80, 443]);

function ipv4ToOctets(ip) {
  return ip.split(".").map((n) => parseInt(n, 10));
}

function isPrivateIPv4(ip) {
  const [a, b] = ipv4ToOctets(ip);
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24 test
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + 255.255.255.255
  return false;
}

function isPrivateIPv6(ip) {
  const addr = ip.toLowerCase().split("%")[0]; // strip zone id
  if (addr === "::1" || addr === "::") return true; // loopback / unspecified
  // IPv4-mapped / -compatible: ::ffff:a.b.c.d  or  ::ffff:0:a.b.c.d
  const mapped = addr.match(/(?:^|:)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  const first = addr.split(":")[0];
  if (first.startsWith("fc") || first.startsWith("fd")) return true; // ULA fc00::/7
  if (first.startsWith("fe8") || first.startsWith("fe9") || first.startsWith("fea") || first.startsWith("feb"))
    return true; // link-local fe80::/10
  return false;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown format → block
}

// Validates the URL and confirms its host resolves only to public addresses.
// Returns the parsed URL on success, throws an Error otherwise.
export async function assertPublicUrl(urlStr) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed.");
  }
  const port = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) {
    throw new Error("Only standard web ports (80, 443) are allowed.");
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new Error("This host is not allowed.");
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Requests to private IP addresses are not allowed.");
    return u;
  }
  let addrs;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new Error("Could not resolve host.");
  }
  if (!addrs || addrs.length === 0) throw new Error("Could not resolve host.");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error("This host resolves to a private address and is not allowed.");
    }
  }
  return u;
}

// Fetch that validates every hop (including redirects) and caps the timeout.
// Does NOT read the body — callers decide how, see readCappedText.
export async function safeFetch(urlStr, options = {}, config = {}) {
  const { maxRedirects = 5, timeoutMs = 12000 } = config;
  let current = urlStr;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(current, { ...options, redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    // Attach the final resolved URL for callers that need it.
    try {
      Object.defineProperty(res, "finalUrl", { value: current, configurable: true });
    } catch {}
    return res;
  }
  throw new Error("Too many redirects.");
}

// Reads a response body as text, aborting if it exceeds maxBytes.
export async function readCappedText(res, maxBytes = 5 * 1024 * 1024) {
  const lenHeader = res.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > maxBytes) {
    throw new Error("Response too large.");
  }
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxBytes) {
      try {
        await reader.cancel();
      } catch {}
      throw new Error("Response too large.");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder("utf-8").decode(merged);
}
