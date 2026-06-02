// Rate limiting + result cache.
//
// Uses Upstash Redis (REST) when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// are set; otherwise falls back to an in-memory store (per serverless instance —
// weaker, but works with zero setup for low traffic). Same pattern as the LLM
// integration: external service optional, graceful fallback.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// ---------- in-memory fallback ----------
const memHits = new Map(); // key -> number[] (timestamps ms)
const memCache = new Map(); // key -> { value, exp }

function memRateLimit(key, limit, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const arr = (memHits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  memHits.set(key, arr);
  const remaining = Math.max(0, limit - arr.length);
  return { allowed: arr.length <= limit, remaining, resetSec: windowSec };
}

function memCacheGet(key) {
  const e = memCache.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    memCache.delete(key);
    return null;
  }
  return e.value;
}

function memCacheSet(key, value, ttlSec) {
  memCache.set(key, { value, exp: Date.now() + ttlSec * 1000 });
}

// ---------- Upstash REST ----------
async function redis(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  const data = await res.json();
  return data.result;
}

// ---------- public API ----------

export async function rateLimit(key, { limit = 30, windowSec = 60 } = {}) {
  const fullKey = `rl:${key}`;
  if (!useUpstash) return memRateLimit(fullKey, limit, windowSec);
  try {
    const count = await redis(["INCR", fullKey]);
    if (count === 1) await redis(["EXPIRE", fullKey, windowSec]);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSec: windowSec,
    };
  } catch {
    // If the limiter backend is down, fail open (don't block users).
    return { allowed: true, remaining: limit, resetSec: windowSec };
  }
}

export async function cacheGet(key) {
  const fullKey = `cache:${key}`;
  if (!useUpstash) return memCacheGet(fullKey);
  try {
    const raw = await redis(["GET", fullKey]);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSec) {
  const fullKey = `cache:${key}`;
  if (!useUpstash) return memCacheSet(fullKey, value, ttlSec);
  try {
    await redis(["SET", fullKey, JSON.stringify(value), "EX", ttlSec]);
  } catch {
    // ignore cache write failures
  }
}

export function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export const usingUpstash = useUpstash;
