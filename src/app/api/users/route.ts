import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { unauthorized, internalError } from "@/lib/api-errors";

/**
 * GET /api/users — list active colleagues (excludes the signed-in user)
 * for the recipient picker. Supports ?q= search (debounced client-side).
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        NOT: { id: user.id },
        ...(q
          ? { displayName: { contains: q } }
          : {}),
      },
      select: { id: true, displayName: true, email: true },
      orderBy: { displayName: "asc" },
      take: 50,
    });

    return Response.json({ users });
  } catch (error) {
    console.error("[api/users]", error);
    return internalError();
  }
}
