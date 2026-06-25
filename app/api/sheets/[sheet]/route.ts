// Server-side proxy to Google Apps Script read endpoints.
// Keeps GAS URLs out of the browser bundle — they live in .env.local only.
//
// GAS scripts must have a doGet() handler deployed (see env.local.example
// for the exact Apps Script code to add).
//
// TODO (Phase 2): After verifying live data works in the Live Sheets tab,
// extend this route to merge/upsert rows into a persistent store (e.g.
// Supabase, Upstash, or a simple JSON file) so the dashboard pipeline
// can be auto-populated from real application and onboarding submissions.

import { type NextRequest, NextResponse } from "next/server";

type SheetKey = "applications" | "standard-onboarding" | "executive-onboarding";

const GAS_URL_BY_SHEET: Record<SheetKey, string | undefined> = {
  "applications":          process.env.SHEETS_APPLICATIONS_GAS_URL,
  "standard-onboarding":   process.env.SHEETS_ONBOARDING_GAS_URL,
  "executive-onboarding":  process.env.SHEETS_ONBOARDING_GAS_URL,
};

// Parameter sent to the GAS doGet handler so it knows which tab to read
const GAS_SHEET_PARAM: Record<SheetKey, string> = {
  "applications":          "applications",
  "standard-onboarding":   "standard-onboarding",
  "executive-onboarding":  "executive-onboarding",
};

const ENV_VAR_NAME: Record<SheetKey, string> = {
  "applications":          "SHEETS_APPLICATIONS_GAS_URL",
  "standard-onboarding":   "SHEETS_ONBOARDING_GAS_URL",
  "executive-onboarding":  "SHEETS_ONBOARDING_GAS_URL",
};

const VALID_SHEETS = new Set<string>(Object.keys(GAS_URL_BY_SHEET));

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sheet: string }> },
) {
  const { sheet } = await params;

  if (!VALID_SHEETS.has(sheet)) {
    return NextResponse.json(
      { ok: false, error: `Unknown sheet: ${sheet}` },
      { status: 400 },
    );
  }

  const key = sheet as SheetKey;
  const gasUrl = GAS_URL_BY_SHEET[key];

  if (!gasUrl) {
    return NextResponse.json(
      {
        ok: false,
        unconfigured: true,
        error: `${ENV_VAR_NAME[key]} is not set in .env.local — see env.local.example for setup instructions.`,
      },
      { status: 503 },
    );
  }

  try {
    const url = new URL(gasUrl);
    url.searchParams.set("sheet", GAS_SHEET_PARAM[key]);

    // Server-side fetch — no CORS restriction, GAS URL never reaches the browser
    const gasRes = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!gasRes.ok) {
      return NextResponse.json(
        { ok: false, error: `GAS responded with HTTP ${gasRes.status}` },
        { status: 502 },
      );
    }

    const body = await gasRes.json() as { ok?: boolean; data?: unknown; error?: string };

    if (body.ok === false) {
      return NextResponse.json(
        { ok: false, error: body.error ?? "GAS returned ok: false" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Fetch failed" },
      { status: 502 },
    );
  }
}
