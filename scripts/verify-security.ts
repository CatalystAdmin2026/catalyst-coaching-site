#!/usr/bin/env npx tsx
// ─────────────────────────────────────────────────────────────
// Catalyst OS — Security Verification Script
//
// Tests that auth guards are correctly enforced on all API routes.
// Run after the dev server is up: npx tsx scripts/verify-security.ts
//
// Exit code 0 = all checks pass
// Exit code 1 = one or more checks failed
// ─────────────────────────────────────────────────────────────

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

type Check = {
  label: string;
  method: string;
  path: string;
  expectedStatus: number;
  headers?: Record<string, string>;
  body?: unknown;
};

const CHECKS: Check[] = [
  // ── Unauthenticated → 401 on every internal route ─────────

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

  // ── Portal set-log routes require auth ─────────────────────

  { label: "POST /api/portal/workout-session/fake-id/sets — unauth → 401", method: "POST", path: "/api/portal/workout-session/fake-id/sets", expectedStatus: 401, body: {} },
  { label: "DELETE /api/portal/workout-session/fake-id/sets — unauth → 401", method: "DELETE", path: "/api/portal/workout-session/fake-id/sets", expectedStatus: 401, body: {} },

  // ── Public routes are NOT blocked ──────────────────────────

  // Stripe webhook — must remain open (returns 400 without valid payload, not 401)
  { label: "POST /api/stripe/webhook — no auth header → not 401", method: "POST", path: "/api/stripe/webhook", expectedStatus: 400 },

  // DocuSign webhook — must remain open (returns 200 regardless of payload)
  { label: "POST /api/docusign/webhook — no auth header → not 401", method: "POST", path: "/api/docusign/webhook", expectedStatus: 200 },
];

async function runChecks(): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    const url = `${BASE}${check.path}`;
    const init: RequestInit = {
      method: check.method,
      headers: {
        "Content-Type": "application/json",
        ...(check.headers ?? {}),
      },
    };
    if (check.body !== undefined && ["POST", "PUT", "DELETE"].includes(check.method)) {
      init.body = JSON.stringify(check.body);
    }

    let status: number;
    try {
      const res = await fetch(url, init);
      status = res.status;
    } catch (err) {
      console.error(`  FAIL  ${check.label}`);
      console.error(`        fetch error: ${err}`);
      failed++;
      continue;
    }

    if (status === check.expectedStatus) {
      console.log(`  PASS  ${check.label} (${status})`);
      passed++;
    } else {
      console.error(`  FAIL  ${check.label}`);
      console.error(`        expected ${check.expectedStatus}, got ${status}`);
      failed++;
    }
  }

  console.log("");
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runChecks().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
