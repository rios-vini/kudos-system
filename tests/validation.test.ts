import { describe, it, expect } from "vitest";
import {
  createKudosSchema,
  moderateKudosSchema,
  deleteKudosSchema,
  loginSchema,
  MESSAGE_MAX,
} from "@/lib/validation";

describe("createKudosSchema", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a valid kudos payload", () => {
    const result = createKudosSchema.safeParse({
      recipientId: validUuid,
      message: "Great work on the launch!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid recipient UUID", () => {
    const result = createKudosSchema.safeParse({
      recipientId: "not-a-uuid",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty or whitespace-only message", () => {
    expect(
      createKudosSchema.safeParse({ recipientId: validUuid, message: "   " }).success
    ).toBe(false);
    expect(
      createKudosSchema.safeParse({ recipientId: validUuid, message: "" }).success
    ).toBe(false);
  });

  it("rejects a message over 500 characters", () => {
    const result = createKudosSchema.safeParse({
      recipientId: validUuid,
      message: "a".repeat(MESSAGE_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a message of exactly 500 characters and trims it", () => {
    const result = createKudosSchema.safeParse({
      recipientId: validUuid,
      message: `  ${"a".repeat(MESSAGE_MAX)}  `,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message.length).toBe(MESSAGE_MAX);
    }
  });
});

describe("moderateKudosSchema", () => {
  it("accepts hide with a valid reason", () => {
    const result = moderateKudosSchema.safeParse({
      action: "hide",
      reason: "Contains inappropriate language",
    });
    expect(result.success).toBe(true);
  });

  it("accepts unhide with a valid reason", () => {
    const result = moderateKudosSchema.safeParse({
      action: "unhide",
      reason: "Reviewed and restored",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown action", () => {
    const result = moderateKudosSchema.safeParse({
      action: "purge",
      reason: "Some reason here",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a reason shorter than 3 characters", () => {
    const result = moderateKudosSchema.safeParse({ action: "hide", reason: "ok" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing reason", () => {
    const result = moderateKudosSchema.safeParse({ action: "hide" });
    expect(result.success).toBe(false);
  });
});

describe("deleteKudosSchema", () => {
  it("requires a reason of at least 3 characters", () => {
    expect(deleteKudosSchema.safeParse({ reason: "no" }).success).toBe(false);
    expect(
      deleteKudosSchema.safeParse({ reason: "Spam content" }).success
    ).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "alice@datacom.test",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "alice@datacom.test",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
