import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteKudosSchema } from "@/lib/validation";
import {
  unauthorized,
  forbidden,
  notFound,
  validationError,
  internalError,
} from "@/lib/api-errors";

/**
 * DELETE /api/kudos/:id — admin-only permanent delete with mandatory reason.
 * The moderation_actions audit row is written BEFORE the delete so the audit
 * survives the removal (per AC-6.3); kudosId is nullable for this reason.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    // Server-side admin role enforcement (per AC-6.5)
    if (user.role !== "admin") {
      return forbidden("Only administrators can delete kudos.");
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = deleteKudosSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message ?? "A reason is required.");
    }

    const kudos = await prisma.kudos.findUnique({ where: { id } });
    if (!kudos) return notFound("That kudos no longer exists.");

    // Audit first, then delete (per AC-6.3)
    await prisma.moderationAction.create({
      data: {
        kudosId: id,
        adminId: user.id,
        action: "delete",
        reason: parsed.data.reason,
      },
    });

    await prisma.kudos.delete({ where: { id } });

    console.info(
      `[moderation] admin=${user.id} action=delete kudos=${id} reason="${parsed.data.reason}"`
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[api/kudos/:id DELETE]", error);
    return internalError();
  }
}
