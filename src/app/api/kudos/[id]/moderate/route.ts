import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { moderateKudosSchema } from "@/lib/validation";
import {
  unauthorized,
  forbidden,
  notFound,
  validationError,
  internalError,
} from "@/lib/api-errors";

/**
 * PATCH /api/kudos/:id/moderate — admin-only hide/unhide with mandatory reason.
 * Writes a moderation_actions audit row for every action (per AC-6.7).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    // Server-side admin role enforcement (per AC-6.5)
    if (user.role !== "admin") {
      return forbidden("Only administrators can moderate kudos.");
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = moderateKudosSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const { action, reason } = parsed.data;

    const kudos = await prisma.kudos.findUnique({ where: { id } });
    if (!kudos) return notFound("That kudos no longer exists.");

    const now = new Date();
    const updated = await prisma.kudos.update({
      where: { id },
      data: {
        isVisible: action === "unhide",
        moderatedById: user.id,
        moderatedAt: now,
        reasonForModeration: action === "hide" ? reason : null,
      },
      include: {
        sender: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });

    // Audit trail (per AC-6.7)
    await prisma.moderationAction.create({
      data: {
        kudosId: id,
        adminId: user.id,
        action,
        reason,
      },
    });

    console.info(
      `[moderation] admin=${user.id} action=${action} kudos=${id} reason="${reason}"`
    );

    return Response.json({
      kudos: {
        id: updated.id,
        message: updated.message,
        createdAt: updated.createdAt.toISOString(),
        isVisible: updated.isVisible,
        sender: updated.sender,
        recipient: updated.recipient,
        moderatedAt: updated.moderatedAt?.toISOString() ?? null,
        reasonForModeration: updated.reasonForModeration,
      },
    });
  } catch (error) {
    console.error("[api/kudos/:id/moderate]", error);
    return internalError();
  }
}
