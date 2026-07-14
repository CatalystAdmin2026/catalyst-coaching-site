#!/usr/bin/env npx tsx
// ─────────────────────────────────────────────────────────────
// Catalyst OS — Security Verification Script
//
// Tests that auth guards are correctly enforced on all routes.
// Run after the dev server is up: npx tsx scripts/verify-security.ts
//
// Exit code 0 = all checks pass
// Exit code 1 = one or more checks failed
//
// NOTE — checks that require a real authenticated session
// (e.g. client-accessing-admin, admin-accessing-portal) cannot
// be automated here without real session cookies. Those are
// marked [MANUAL] below and must be verified by hand.
// ─────────────────────────────────────────────────────────────

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

// ── Check types ────────────────────────────────────────────────

type Check = {
  label: string;
  method: string;
  path: string;
  expectedStatus: number;
  headers?: Record<string, string>;
  body?: unknown;
  // When true, fetch does NOT follow redirects; response status is the raw
  // redirect code (307, 302, etc.) rather than the final destination's code.
  noFollow?: boolean;
  // When set, check that the Location header contains this substring.
  expectLocationContains?: string;
};

// ── Check list ─────────────────────────────────────────────────

const CHECKS: Check[] = [

  // ── Unauthenticated → 401 on every internal API route ────────

  { label: "GET /api/internal/exercises/search — unauth → 401", method: "GET", path: "/api/internal/exercises/search?q=squat", expectedStatus: 401 },
  { label: "GET /api/internal/workout-templates — unauth → 401", method: "GET", path: "/api/internal/workout-templates", expectedStatus: 401 },
  { label: "POST /api/internal/workout-templates — unauth → 401", method: "POST", path: "/api/internal/workout-templates", expectedStatus: 401, body: {} },
  { label: "GET /api/internal/workout-templates/fake-id — unauth → 401", method: "GET", path: "/api/internal/workout-templates/fake-id", expectedStatus: 401 },
  { label: "PUT /api/internal/workout-templates/fake-id — unauth → 401", method: "PUT", path: "/api/internal/workout-templates/fake-id", expectedStatus: 401, body: {} },
  { label: "DELETE /api/internal/workout-templates/fake-id — unauth → 401", method: "DELETE", path: "/api/internal/workout-templates/fake-id", expectedStatus: 401 },
  { label: "POST /api/internal/workout-templates/fake-id/sections — unauth → 401", method: "POST", path: "/api/internal/workout-templates/fake-id/sections", expectedStatus: 401, body: {} },
  { label: "PUT /api/internal/workout-templates/fake-id/sections/fake-sid — unauth → 401", method: "PUT", path: "/api/internal/workout-templates/fake-id/sections/fake-sid", expectedStatus: 401, body: {} },
  { label: "DELETE /api/internal/workout-templates/fake-id/sections/fake-sid — unauth → 401", method: "DELETE", path: "/api/internal/workout-templates/fake-id/sections/fake-sid", expectedStatus: 401 },
  { label: "POST /api/internal/workout-templates/fake-id/exercises — unauth → 401", method: "POST", path: "/api/internal/workout-templates/fake-id/exercises", expectedStatus: 401, body: {} },
  { label: "PUT /api/internal/workout-templates/fake-id/exercises/fake-pid — unauth → 401", method: "PUT", path: "/api/internal/workout-templates/fake-id/exercises/fake-pid", expectedStatus: 401, body: {} },
  { label: "DELETE /api/internal/workout-templates/fake-id/exercises/fake-pid — unauth → 401", method: "DELETE", path: "/api/internal/workout-templates/fake-id/exercises/fake-pid", expectedStatus: 401 },
  { label: "POST /api/internal/workout-templates/fake-id/validate — unauth → 401", method: "POST", path: "/api/internal/workout-templates/fake-id/validate", expectedStatus: 401 },
  { label: "GET /api/internal/programs — unauth → 401", method: "GET", path: "/api/internal/programs", expectedStatus: 401 },
  { label: "POST /api/internal/programs — unauth → 401", method: "POST", path: "/api/internal/programs", expectedStatus: 401, body: {} },
  { label: "GET /api/internal/programs/fake-id — unauth → 401", method: "GET", path: "/api/internal/programs/fake-id", expectedStatus: 401 },
  { label: "PUT /api/internal/programs/fake-id — unauth → 401", method: "PUT", path: "/api/internal/programs/fake-id", expectedStatus: 401, body: {} },
  { label: "DELETE /api/internal/programs/fake-id — unauth → 401", method: "DELETE", path: "/api/internal/programs/fake-id", expectedStatus: 401 },
  { label: "POST /api/internal/programs/fake-id/weeks — unauth → 401", method: "POST", path: "/api/internal/programs/fake-id/weeks", expectedStatus: 401, body: {} },
  { label: "PUT /api/internal/programs/fake-id/weeks/fake-wid — unauth → 401", method: "PUT", path: "/api/internal/programs/fake-id/weeks/fake-wid", expectedStatus: 401, body: {} },
  { label: "DELETE /api/internal/programs/fake-id/weeks/fake-wid — unauth → 401", method: "DELETE", path: "/api/internal/programs/fake-id/weeks/fake-wid", expectedStatus: 401 },
  { label: "GET /api/internal/client-programs — unauth → 401", method: "GET", path: "/api/internal/client-programs", expectedStatus: 401 },
  { label: "POST /api/internal/client-programs — unauth → 401", method: "POST", path: "/api/internal/client-programs", expectedStatus: 401, body: {} },
  { label: "GET /api/internal/client-programs/fake-id — unauth → 401", method: "GET", path: "/api/internal/client-programs/fake-id", expectedStatus: 401 },
  { label: "PUT /api/internal/client-programs/fake-id — unauth → 401", method: "PUT", path: "/api/internal/client-programs/fake-id", expectedStatus: 401, body: {} },

  // ── Portal API routes require auth → 401 ─────────────────────

  { label: "GET /api/portal/today-workout — unauth → 401", method: "GET", path: "/api/portal/today-workout", expectedStatus: 401 },
  { label: "GET /api/portal/workout-history — unauth → 401", method: "GET", path: "/api/portal/workout-history", expectedStatus: 401 },
  { label: "POST /api/portal/workout-session — unauth → 401", method: "POST", path: "/api/portal/workout-session", expectedStatus: 401, body: {} },
  { label: "POST /api/portal/workout-session/fake-id/sets — unauth → 401", method: "POST", path: "/api/portal/workout-session/fake-id/sets", expectedStatus: 401, body: {} },
  { label: "DELETE /api/portal/workout-session/fake-id/sets — unauth → 401", method: "DELETE", path: "/api/portal/workout-session/fake-id/sets", expectedStatus: 401, body: {} },

  // ── /portal page — unauthenticated → redirects to /login ─────
  //
  // Next.js App Router redirect() returns 307 Temporary Redirect.
  // noFollow: true prevents fetch from following it so we see the
  // raw redirect status rather than the /login page's 200.

  {
    label: "GET /portal — unauth → 307 redirect to /login",
    method: "GET",
    path: "/portal",
    expectedStatus: 307,
    noFollow: true,
    expectLocationContains: "/login",
  },

  // ── Public routes are NOT blocked ────────────────────────────

  // Stripe webhook — must remain open (returns 400 without valid payload, not 401)
  { label: "POST /api/stripe/webhook — no auth → not 401 (expect 400)", method: "POST", path: "/api/stripe/webhook", expectedStatus: 400 },

  // DocuSign webhook — must remain open (returns 200 regardless of payload)
  { label: "POST /api/docusign/webhook — no auth → not 401 (expect 200)", method: "POST", path: "/api/docusign/webhook", expectedStatus: 200 },

];

// ── Manual checks (require real session cookies) ───────────────
//
// These cannot be automated without real auth tokens.
// Verify manually after logging in as each role:
//
// [MANUAL 1] Client accessing /admin
//   → Log in as the test client (catalyst.coaching.headcoach+clienttest@gmail.com)
//   → Navigate to /admin
//   → Expected: redirect to /login or 403 — must NOT see admin dashboard
//
// [MANUAL 2] Admin silently treated as client at /portal
//   → Log in as admin (catalyst.coaching.headcoach@gmail.com)
//   → Navigate to /portal
//   → Expected: redirect to /admin (app/portal/layout.tsx role check)
//   → Must NOT see the client portal dashboard
//
// [MANUAL 3] Client cannot access another client's workout session via API
//   → Log in as test client
//   → POST /api/portal/workout-session/fake-uuid/sets
//   → Expected: 404 (session not found for this client) — not a data leak

// ── Runner ─────────────────────────────────────────────────────

async function runChecks(): Promise<void> {
  console.log(`Verifying against: ${BASE}\n`);

  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    const url = `${BASE}${check.path}`;
    const init: RequestInit = {
      method: check.method,
      redirect: check.noFollow ? "manual" : "follow",
      headers: {
        "Content-Type": "application/json",
        ...(check.headers ?? {}),
      },
    };
    if (check.body !== undefined && ["POST", "PUT", "DELETE"].includes(check.method)) {
      init.body = JSON.stringify(check.body);
    }

    let status: number;
    let location: string | null = null;
    try {
      const res = await fetch(url, init);
      status = res.status;
      location = res.headers.get("location");
    } catch (err) {
      console.error(`  FAIL  ${check.label}`);
      console.error(`        fetch error: ${err}`);
      failed++;
      continue;
    }

    const statusOk = status === check.expectedStatus;
    const locationOk =
      !check.expectLocationContains ||
      (location !== null && location.includes(check.expectLocationContains));

    if (statusOk && locationOk) {
      const locationNote = location ? ` → ${location}` : "";
      console.log(`  PASS  ${check.label} (${status}${locationNote})`);
      passed++;
    } else {
      console.error(`  FAIL  ${check.label}`);
      if (!statusOk) {
        console.error(`        status: expected ${check.expectedStatus}, got ${status}`);
      }
      if (!locationOk) {
        console.error(`        location: expected to contain "${check.expectLocationContains}", got "${location}"`);
      }
      failed++;
    }
  }

  console.log("");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("");
  console.log("Manual checks required (see comments in script):");
  console.log("  [MANUAL 1] Client → /admin must redirect/403");
  console.log("  [MANUAL 2] Admin → /portal must redirect to /admin (role guard)");
  console.log("  [MANUAL 3] Client cannot access another client's session data");

  if (failed > 0) {
    process.exit(1);
  }
}

runChecks().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
