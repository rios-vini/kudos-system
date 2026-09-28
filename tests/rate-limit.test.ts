import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimit,
  resetRateLimits,
  KUDOS_RATE_LIMIT,
  KUDOS_RATE_WINDOW_MS,
} from "@/lib/rate-limit";

describe("rateLimit (sliding window)", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < KUDOS_RATE_LIMIT; i++) {
      const result = rateLimit("user-a", KUDOS_RATE_LIMIT, KUDOS_RATE_WINDOW_MS);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the request exceeding the limit", () => {
    for (let i = 0; i < KUDOS_RATE_LIMIT; i++) {
      rateLimit("user-b", KUDOS_RATE_LIMIT, KUDOS_RATE_WINDOW_MS);
    }
    const result = rateLimit("user-b", KUDOS_RATE_LIMIT, KUDOS_RATE_WINDOW_MS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks users independently", () => {
    for (let i = 0; i < KUDOS_RATE_LIMIT; i++) {
      rateLimit("user-c", KUDOS_RATE_LIMIT, KUDOS_RATE_WINDOW_MS);
    }
    const other = rateLimit("user-d", KUDOS_RATE_LIMIT, KUDOS_RATE_WINDOW_MS);
    expect(other.allowed).toBe(true);
  });

  it("expires old hits after the window passes", () => {
    const key = "user-e";
    for (let i = 0; i < KUDOS_RATE_LIMIT; i++) {
      rateLimit(key, KUDOS_RATE_LIMIT, KUDOS_RATE_WINDOW_MS);
    }
    // Simulate window expiry by using a 0ms window for a fresh key
    const expired = rateLimit(key, KUDOS_RATE_LIMIT, -1);
    expect(expired.allowed).toBe(true);
  });
});
