// ─────────────────────────────────────────────────────────────
// Catalyst OS — Role-Based Redirect After Password Sign-In
//
// Called after a successful signInWithPassword on the client.
// The session cookie is already set; this route validates it,
// syncs the public.users row, and redirects to the correct
// destination based on the user's role and the next param.
//
// This mirrors the auth/callback logic for non-PKCE flows.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToPublic, getPublicUser } from "@/lib/auth/sync";
import { resolvePostLoginRedirect } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const origin = url.origin;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  await syncUserToPublic(authUser);

  const dbUser = await getPublicUser(authUser.id);
  if (
    dbUser?.status === "suspended" ||
    dbUser?.status === "archived"
  ) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=access_denied`);
  }

  const role = dbUser?.role ?? "client";
  const redirectPath = resolvePostLoginRedirect(next, role);
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
