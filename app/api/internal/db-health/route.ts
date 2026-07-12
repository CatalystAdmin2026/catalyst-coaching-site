// ─────────────────────────────────────────────────────────────
// Catalyst OS — Internal Database Health Route
//
// SERVER-ONLY — never access this route from a client component.
//
// Protected by INTERNAL_API_SECRET environment variable.
// Returns 404 if the secret is not configured, preventing this
// endpoint from being discoverable in production environments
// where the secret is intentionally omitted.
//
// To call this endpoint:
//   curl -H "Authorization: Bearer <INTERNAL_API_SECRET>" \
//        http://localhost:3000/api/internal/db-health
//
// This route MUST NOT expose:
//   - The DATABASE_URL connection string
//   - Any credentials, tokens, or secrets
//   - Internal schema details beyond what is listed here
//
// Sprint 5D note: when auth is added, restrict this route to
// admin role in addition to the shared secret check.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db/health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;

  // Return 404 (not 401) when secret is not configured — prevents
  // this endpoint from being discoverable in production when the
  // env var is intentionally omitted.
  if (!secret) {
    return new NextResponse(null, { status: 404 });
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkDatabaseConnection();

  return NextResponse.json(
    {
      status: result.connected ? "ok" : "error",
      connected: result.connected,
      latencyMs: result.latencyMs,
      error: result.error,
      checkedAt: result.checkedAt,
    },
    { status: result.connected ? 200 : 503 },
  );
}
