/**
 * In-memory sliding window rate limiter.
 *
 * Works per serverless instance (no shared state across Vercel functions).
 * Good enough to stop a single client from hammering a cold instance.
 * For cross-instance enforcement, swap the `store` for an Upstash Redis client.
 */

interface Window {
  hits: number[];
}

const store = new Map<string, Window>();

// Periodically clean up expired entries so memory doesn't grow unbounded.
// Only runs in long-lived environments; in serverless this is a no-op.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, { hits }] of store) {
      // Keep the entry only if there are recent hits. Use a generous 1-hour
      // cutoff so we don't prematurely remove long-window keys.
      if (hits.length === 0 || hits[hits.length - 1] < now - 60 * 60 * 1000) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  /** How many ms the caller must wait before retrying (0 when allowed). */
  retryAfterMs: number;
  /** Remaining allowed requests in the current window. */
  remaining: number;
}

/**
 * @param key       Unique bucket key, e.g. `"send-otp:user@example.com"`
 * @param windowMs  Rolling window duration in milliseconds
 * @param max       Maximum requests allowed within the window
 */
export function rateLimit(
  key: string,
  windowMs: number,
  max: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(key) ?? { hits: [] };
  // Slide the window — drop timestamps older than cutoff
  entry.hits = entry.hits.filter((t) => t > cutoff);

  if (entry.hits.length >= max) {
    const oldest = entry.hits[0];
    const retryAfterMs = oldest + windowMs - now;
    store.set(key, entry);
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  entry.hits.push(now);
  store.set(key, entry);
  return { allowed: true, retryAfterMs: 0, remaining: max - entry.hits.length };
}

/** Convenience: build a `Retry-After` header value (integer seconds). */
export function retryAfterSeconds(retryAfterMs: number): string {
  return String(Math.ceil(retryAfterMs / 1000));
}

/** Basic RFC 5322-ish email validation (good enough for an API guard). */
export function isValidEmail(email: unknown): email is string {
  return (
    typeof email === "string" &&
    email.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}
