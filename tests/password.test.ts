import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing (scrypt)", () => {
  it("hashes and verifies a correct password", () => {
    const stored = hashPassword("password123");
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(verifyPassword("password123", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashPassword("password123");
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("produces a unique salt per hash", () => {
    const a = hashPassword("password123");
    const b = hashPassword("password123");
    expect(a).not.toBe(b);
  });

  it("safely rejects a malformed stored hash", () => {
    expect(verifyPassword("password123", "garbage")).toBe(false);
    expect(verifyPassword("password123", "")).toBe(false);
  });
});
