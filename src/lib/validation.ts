import { z } from "zod";

/** Shared validation schemas (client + server), per spec section 3.2. */

export const MESSAGE_MAX = 500;
export const REASON_MIN = 3;
export const REASON_MAX = 500;

export const createKudosSchema = z.object({
  recipientId: z.string().uuid("Please select a valid recipient."),
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(MESSAGE_MAX, `Message must be ${MESSAGE_MAX} characters or fewer.`),
});

export const moderateKudosSchema = z.object({
  action: z.enum(["hide", "unhide"]),
  reason: z
    .string()
    .trim()
    .min(REASON_MIN, `Reason must be at least ${REASON_MIN} characters.`)
    .max(REASON_MAX, `Reason must be ${REASON_MAX} characters or fewer.`),
});

export const deleteKudosSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN, `Reason must be at least ${REASON_MIN} characters.`)
    .max(REASON_MAX, `Reason must be ${REASON_MAX} characters or fewer.`),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type CreateKudosInput = z.infer<typeof createKudosSchema>;
export type ModerateKudosInput = z.infer<typeof moderateKudosSchema>;
export type DeleteKudosInput = z.infer<typeof deleteKudosSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
