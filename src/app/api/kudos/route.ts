import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createKudosSchema } from "@/lib/validation";
import {
  unauthorized,
  forbidden,
  validationError,
  duplicateError,
  rateLimitedError,
  internalError,
} from "@/lib/api-errors";
import {
  rateLimit,
  KUDOS_RATE_LIMIT,
  KUDOS_RATE_WINDOW_MS,
  DUPLICATE_WINDOW_MS,
} from "@/lib/rate-limit";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/kudos — cursor-paginated feed of recent kudos.
 *
 * - Non-admin: visible kudos only.
 * - Admin with ?includeHidden=true: all kudos, hidden ones flagged.
 * - Cursor: ISO8601 createdAt (keyset pagination, stable under inserts).
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const includeHidden = searchParams.get("includeHidden") === "true";
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT
      )
    );
    const cursorParam = searchParams.get("cursor");
    const cursorDate = cursorParam ? new Date(cursorParam) : null;
    const cursorValid =
      cursorDate !== null && !Number.isNaN(cursorDate.getTime());

    // includeHidden is admin-only (per spec 3.2)
    if (includeHidden && user.role !== "admin") {
      return forbidden("Only administrators can view hidden kudos.");
    }

    // Keyset pagination: createdAt < cursor (stable under concurrent inserts)
    const where = {
      ...(includeHidden ? {} : { isVisible: true }),
      ...(cursorValid ? { createdAt: { lt: cursorDate! } } : {}),
    };

    const kudos = await prisma.kudos.findMany({
      where,
      include: {
        sender: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = kudos.length > limit;
    const items = hasMore ? kudos.slice(0, limit) : kudos;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return Response.json(
      {
        items: items.map((k) => ({
          id: k.id,
          message: k.message,
          createdAt: k.createdAt.toISOString(),
          isVisible: k.isVisible,
          sender: k.sender,
          recipient: k.recipient,
          // Moderation metadata is admin-only (per spec approval note 5)
          ...(user.role === "admin"
            ? {
                moderatedAt: k.moderatedAt?.toISOString() ?? null,
                reasonForModeration: k.reasonForModeration,
              }
            : {}),
        })),
        nextCursor,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[api/kudos GET]", error);
    return internalError();
  }
}

/** POST /api/kudos — create a kudos (sender derived from session, never body). */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    // Rate limit: max 5 kudos per minute per user (spam mitigation)
    const rl = rateLimit(`kudos:${user.id}`, KUDOS_RATE_LIMIT, KUDOS_RATE_WINDOW_MS);
    if (!rl.allowed) return rateLimitedError(rl.retryAfterSeconds);

    const body = await request.json().catch(() => null);
    const parsed = createKudosSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const { recipientId, message } = parsed.data;

    // Self-send guard (server-side, per AC-4.2)
    if (recipientId === user.id) {
      return validationError("You cannot send kudos to yourself.");
    }

    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, isActive: true },
    });
    if (!recipient) {
      return validationError("Selected recipient was not found.");
    }

    // Duplicate guard: identical sender+recipient+message within 60s (AC-4.5)
    const duplicateWindowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const duplicate = await prisma.kudos.findFirst({
      where: {
        senderId: user.id,
        recipientId,
        message,
        createdAt: { gte: duplicateWindowStart },
      },
      select: { id: true },
    });
    if (duplicate) {
      return duplicateError(
        "You just sent this exact kudos. Try a different message."
      );
    }

    const kudos = await prisma.kudos.create({
      data: { senderId: user.id, recipientId, message },
      include: {
        sender: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });

    return Response.json(
      {
        kudos: {
          id: kudos.id,
          message: kudos.message,
          createdAt: kudos.createdAt.toISOString(),
          isVisible: kudos.isVisible,
          sender: kudos.sender,
          recipient: kudos.recipient,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/kudos POST]", error);
    return internalError();
  }
}
