// ─────────────────────────────────────────────────────────────
// Catalyst OS — Protected Client Portal
//
// Server Component — authentication and database queries run
// server-side before any HTML is sent to the browser.
//
// Auth flow:
//   requireClientUser() → validates JWT with Supabase Auth
//                       → queries public.users for role/status
//                       → redirects to /login if unauthenticated
//                       → redirects to /login?error=access_denied if suspended/archived
//
// This page is also protected at the network edge by middleware.ts
// so that unauthenticated requests never reach this handler.
// ─────────────────────────────────────────────────────────────

import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import PortalDashboard from "@/components/portal/PortalDashboard";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  // Validates session, checks public.users status, redirects if needed.
  const { authUser, dbUser } = await requireClientUser();

  // Read client profile for preferred/full name.
  const profile = await getClientProfile(dbUser.id);

  // Name resolution priority:
  //   1. preferredName (e.g. "Jermaine")
  //   2. fullName (e.g. "Jermaine Jones")
  //   3. email name portion (e.g. "jermaine" from jermaine@example.com)
  //   4. Fallback "Client"
  const clientName =
    profile?.preferredName ||
    profile?.fullName ||
    authUser.email?.split("@")[0] ||
    "Client";

  return <PortalDashboard clientName={clientName} />;
}
