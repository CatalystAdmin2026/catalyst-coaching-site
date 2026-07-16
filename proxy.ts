// ─────────────────────────────────────────────────────────────
// Catalyst OS — Proxy (Next.js 16 replacement for middleware)
//
// Responsibilities:
//   1. Refresh expired Supabase auth sessions via cookie exchange
//   2. Protect /portal and /account — redirect to /login if no session
//
// IMPORTANT: Do not add any logic between createServerClient and
// supabase.auth.getUser(). The cookie mutation in setAll must happen
// immediately after client creation or sessions break.
//
// Routes NOT intercepted by this middleware:
//   - /api/stripe/*      — webhook, no browser session
//   - /api/docusign/*    — webhook, no browser session
//   - /api/sheets/*      — server proxy, no browser session
//   - /api/calendly/*    — server call, no browser session
//   - /api/internal/*    — protected by INTERNAL_API_SECRET header
//   - Static assets      — Next.js static serving
// ─────────────────────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/portal", "/account", "/hq", "/admin"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies back to both the request and the response.
          // Both mutations are required: request for downstream middleware,
          // response so the browser receives the refreshed token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validate the session JWT with Supabase Auth.
  // This also triggers cookie refresh if the access token has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the intended destination for post-login redirect.
    // Validated against an allowlist in the auth callback.
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Always return supabaseResponse — it carries the refreshed auth cookies.
  // Returning a plain NextResponse.next() here would drop the token refresh.
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Protected routes — unauthenticated visits receive ?next= redirect to /login
    "/portal/:path*",
    "/account/:path*",
    "/hq/:path*",
    "/admin/:path*",
    // Auth routes — needed so session cookies are refreshed on login/callback
    "/login",
    "/auth/:path*",
  ],
};
