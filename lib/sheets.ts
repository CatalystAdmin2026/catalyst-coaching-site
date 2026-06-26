// Google Sheets integration layer — Phase 1
// Fetches data via the Next.js API proxy at /api/sheets/[sheet],
// which calls the Google Apps Script read endpoints server-side.
//
// TODO (Phase 2): Reconcile live sheet rows into the dashboard LEADS array:
//   - Map application rows → new Lead entries at "Applied" pipeline stage
//   - Map onboarding rows → update Lead.onboardingStatus to "started" or "complete"
//   - Dedup by email before merging with manually curated pipeline entries

export type SheetRow = Record<string, string | number | boolean>;

export type SheetName =
  | "applications"
  | "standard-onboarding"
  | "executive-onboarding"
  | "stripe-events";

export interface SheetsResult {
  ok: boolean;
  rows: SheetRow[];
  error?: string;
  timestamp?: string;
}

// Fetches from the Next.js proxy — keeps GAS URLs server-side in env vars.
// Falls back to { ok: false, rows: [] } on any network/parse error.
export async function fetchSheetData(sheet: SheetName): Promise<SheetsResult> {
  try {
    const res = await fetch(`/api/sheets/${sheet}`, { cache: "no-store" });
    const body = await res.json() as {
      ok: boolean;
      data?: SheetRow[];
      error?: string;
      timestamp?: string;
    };
    if (!body.ok) {
      return { ok: false, rows: [], error: body.error };
    }
    return { ok: true, rows: body.data ?? [], timestamp: body.timestamp };
  } catch (err) {
    return {
      ok: false,
      rows: [],
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
