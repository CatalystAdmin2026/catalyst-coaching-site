import { type NextRequest, NextResponse } from "next/server";
import {
  updateClientProgram,
  listClientPrograms,
  getComplianceSummary,
} from "@/lib/db/client-program-service";
import type { ClientProgramStatus } from "@/lib/db/schema-program";
import { requireCoachOrAdmin } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/internal/client-programs/[clientId]
// Returns the assignment list + compliance summary for a given clientId.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireCoachOrAdmin();
  if (!guard.ok) return guard.response;
  const { id: clientId } = await params;
  try {
    const [assignments, compliance] = await Promise.all([
      listClientPrograms(clientId),
      getComplianceSummary(clientId),
    ]);
    return NextResponse.json({ ok: true, assignments, compliance });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

// PUT /api/internal/client-programs/[assignmentId]
export async function PUT(req: NextRequest, { params }: Ctx) {
  const guard = await requireCoachOrAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  try {
    const body = await req.json() as {
      status?: ClientProgramStatus;
      endDate?: string | null;
      coachNotes?: string | null;
    };

    const assignment = await updateClientProgram(id, {
      status: body.status,
      endDate: body.endDate,
      coachNotes: body.coachNotes,
    });

    return NextResponse.json({ ok: true, assignment });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
