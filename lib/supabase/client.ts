// ─────────────────────────────────────────────────────────────
// Catalyst OS — Supabase Browser Client
//
// BROWSER-ONLY — safe to import from Client Components.
// Uses the publishable (anon) key only — no server secrets.
//
// Creates a new client per call (no module-level singleton)
// so that each component gets a fresh instance and avoids
// stale auth state across hot-reloads in development.
// ─────────────────────────────────────────────────────────────

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
