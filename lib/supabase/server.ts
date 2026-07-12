// ─────────────────────────────────────────────────────────────
// Catalyst OS — Supabase Server Client
//
// SERVER-ONLY — never import from a Client Component.
// For use in Server Components, Route Handlers, and Server Actions.
//
// Uses Next.js 15+ async cookies() API.
// Cookie writes inside Server Components are no-ops and are
// handled correctly by middleware session refresh instead.
// ─────────────────────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Suppress: setAll called from a Server Component where
            // cookies are read-only. Session refresh is handled by
            // middleware.ts so the client stays up to date.
          }
        },
      },
    },
  );
}
