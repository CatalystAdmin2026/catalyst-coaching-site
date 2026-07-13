import { type NextRequest, NextResponse } from "next/server";
import { getWorkoutHistory } from "@/lib/db/workout-session-service";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAuthenticatedUser();
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(req.url);
    const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20", 10));
    const sessions = await getWorkoutHistory(guard.authUser.id, limit);
    return NextResponse.json({ ok: true, sessions });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
