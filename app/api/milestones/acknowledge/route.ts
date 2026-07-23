import { NextResponse } from "next/server";
import { requireClientUser } from "@/lib/supabase/session";
import { getDb } from "@/lib/db/client";
import { clientMilestoneAcknowledgements } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  const { dbUser } = await requireClientUser();

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.milestoneKeys) || body.milestoneKeys.length === 0) {
    return NextResponse.json({ error: "milestoneKeys array required" }, { status: 400 });
  }

  const keys: string[] = body.milestoneKeys.filter(
    (k: unknown) => typeof k === "string" && k.length > 0,
  );
  if (keys.length === 0) {
    return NextResponse.json({ acknowledged: 0 });
  }

  const db = getDb();
  const rows = keys.map((key) => ({
    clientId: dbUser.id,
    milestoneKey: key,
  }));

  await db
    .insert(clientMilestoneAcknowledgements)
    .values(rows)
    .onConflictDoNothing();

  return NextResponse.json({ acknowledged: rows.length });
}
