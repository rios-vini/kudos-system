import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import {
  validationError,
  unauthorized,
  internalError,
} from "@/lib/api-errors";

/** POST /api/auth/login — sign in with email + password, creates session cookie. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    // Uniform error for unknown email / wrong password (no account enumeration)
    if (!user || !user.isActive || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return unauthorized("Invalid email or password.");
    }

    await createSession(user.id);

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role === "admin" ? "admin" : "employee",
      },
    });
  } catch (error) {
    console.error("[api/auth/login]", error);
    return internalError();
  }
}
