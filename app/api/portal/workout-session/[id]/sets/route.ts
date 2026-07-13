import { type NextRequest, NextResponse } from "next/server";
import { logSet, deleteSet } from "@/lib/db/workout-session-service";
import { requireAuthenticatedUser, authorizeWorkoutSession } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const guard = await requireAuthenticatedUser();
  if (!guard.ok) return guard.response;

  const { id: workoutSessionId } = await params;
  const authDenied = await authorizeWorkoutSession(workoutSessionId, guard.authUser.id);
  if (authDenied) return authDenied;
  try {
    const body = await req.json() as {
      workoutTemplateExerciseId?: string;
      setNumber?: number;
      actualReps?: number | null;
      actualWeightKg?: string | null;
      actualDurationSeconds?: number | null;
      actualRpe?: string | null;
      notes?: string | null;
    };

    if (!body.workoutTemplateExerciseId) {
      return NextResponse.json(
        { ok: false, error: "workoutTemplateExerciseId is required" },
        { status: 400 },
      );
    }
    if (body.setNumber === undefined || body.setNumber < 1) {
      return NextResponse.json(
        { ok: false, error: "setNumber must be >= 1" },
        { status: 400 },
      );
    }

    const setLog = await logSet({
      workoutSessionId,
      workoutTemplateExerciseId: body.workoutTemplateExerciseId,
      setNumber: body.setNumber,
      actualReps: body.actualReps,
      actualWeightKg: body.actualWeightKg,
      actualDurationSeconds: body.actualDurationSeconds,
      actualRpe: body.actualRpe,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, setLog }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const guard = await requireAuthenticatedUser();
  if (!guard.ok) return guard.response;

  const { id: workoutSessionId } = await params;
  const authDenied = await authorizeWorkoutSession(workoutSessionId, guard.authUser.id);
  if (authDenied) return authDenied;
  try {
    const body = await req.json() as {
      workoutTemplateExerciseId?: string;
      setNumber?: number;
    };

    if (!body.workoutTemplateExerciseId || body.setNumber === undefined) {
      return NextResponse.json(
        { ok: false, error: "workoutTemplateExerciseId and setNumber are required" },
        { status: 400 },
      );
    }

    await deleteSet(
      workoutSessionId,
      body.workoutTemplateExerciseId,
      body.setNumber,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
