import { type NextRequest, NextResponse } from "next/server";
import { addProgramWeek } from "@/lib/db/program-builder-service";
import { requireCoachOrAdmin } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const guard = await requireCoachOrAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  try {
    const body = await req.json() as { label?: string; notes?: string };
    const week = await addProgramWeek(id, {
      label: body.label,
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, week }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
