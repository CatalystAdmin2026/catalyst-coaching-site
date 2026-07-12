// ─────────────────────────────────────────────────────────────
// Catalyst OS — Auth Callback Route
//
// Handles the magic-link redirect from Supabase Auth.
// Exchanges the auth code for a session, syncs the user into
// public.users, then redirects to the portal.
//
// Security:
//   - Only accepts relative paths in the `next` parameter
//   - Validates `next` against an explicit allowlist
//   - Suspended/archived users are rejected after sync
//   - Auth codes are single-use (Supabase enforces this)
//   - No auth tokens or codes are logged
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToPublic, getPublicUser } from "@/lib/auth/sync";

// Paths that `next` is allowed to redirect to.
// External URLs, /api/*, and other internal paths are rejected.
const REDIRECT_ALLOWLIST = ["/portal", "/account"];

function safeRedirectPath(next: string | null): string {
  if (!next) return "/portal";
  const decoded = decodeURIComponent(next);
  // Must be a relative path starting with /
  if (!decoded.startsWith("/")) return "/portal";
  // Must be on the allowlist (exact or prefix match)
  const allowed = REDIRECT_ALLOWLIST.some(
    (p) => decoded === p || decoded.startsWith(p + "/"),
  );
  return allowed ? decoded : "/portal";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const origin = url.origin;

  if (!code) {
    // No code param — malformed link or direct URL access.
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`,
    );
  }

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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // Expired, already used, or invalid code.
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`,
    );
  }

  // Get the validated user from the auth server (not just the local cookie).
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`,
    );
  }

  // Sync auth.users → public.users: updates email, status, emailVerifiedAt.
  // The database trigger handles the initial row creation; this handles
  // lifecycle updates on subsequent logins.
  await syncUserToPublic(authUser);

  // Reject suspended or archived accounts after sync.
  const dbUser = await getPublicUser(authUser.id);
  if (
    dbUser?.status === "suspended" ||
    dbUser?.status === "archived"
  ) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=access_denied`);
  }

  const redirectPath = safeRedirectPath(next);
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
