// Calendly integration layer — Phase 3
// Fetches normalized event data via the Next.js API proxy at
// /api/calendly/events, which calls the Calendly API server-side.
// The Calendly PAT never reaches the browser bundle.

export interface CalendlyEvent {
  uri: string;
  eventTypeUri: string;
  name: string;
  status: "active" | "canceled";
  startTime: string;
  endTime: string;
  location: string;
  cancellationReason: string | null;
  inviteeName: string;
  inviteeEmail: string;
  inviteeUri: string | null;
}

export interface CalendlyResult {
  ok: boolean;
  upcoming: CalendlyEvent[];
  recent: CalendlyEvent[];
  cancelled: CalendlyEvent[];
  error?: string;
  unconfigured?: boolean;
  timestamp?: string;
}

// Fetches from the Next.js proxy — keeps Calendly token server-side in env vars.
// Falls back to { ok: false, upcoming: [], recent: [], cancelled: [] } on any error.
export async function fetchCalendlyEvents(): Promise<CalendlyResult> {
  try {
    const res = await fetch("/api/calendly/events", { cache: "no-store" });
    const body = await res.json() as CalendlyResult;
    if (!body.ok) {
      return {
        ok: false,
        upcoming: [],
        recent: [],
        cancelled: [],
        error: body.error,
        unconfigured: body.unconfigured,
      };
    }
    return {
      ok: true,
      upcoming: body.upcoming ?? [],
      recent: body.recent ?? [],
      cancelled: body.cancelled ?? [],
      timestamp: body.timestamp,
    };
  } catch (err) {
    return {
      ok: false,
      upcoming: [],
      recent: [],
      cancelled: [],
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
