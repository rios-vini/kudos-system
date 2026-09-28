import { destroySession } from "@/lib/auth";

/** POST /api/auth/logout — invalidate the current session. */
export async function POST() {
  await destroySession();
  return new Response(null, { status: 204 });
}
