/**
 * In-memory sliding-window rate limiter (per spec section 3.4).
 * Per-user, per-process. Acceptable for single-instance v1; a shared store
 * (e.g., Redis) is the documented upgrade path for horizontal scaling.
 */
type Hit = { timestamp: number };

const buckets = new Map<string, Hit[]>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter(
    (h) => now - h.timestamp < windowMs
  );

  if (hits.length >= limit) {
    const oldest = hits[0].timestamp;
    const retryAfterMs = windowMs - (now - oldest);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  hits.push({ timestamp: now });
  buckets.set(key, hits);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test helper: clear all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}

// Kudos creation limits (per spec section 2.3: max 5 per minute)
export const KUDOS_RATE_LIMIT = 5;
export const KUDOS_RATE_WINDOW_MS = 60_000;

// Duplicate window: identical sender+recipient+message within 60s is rejected
export const DUPLICATE_WINDOW_MS = 60_000;
