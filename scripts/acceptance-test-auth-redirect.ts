// ─────────────────────────────────────────────────────────────
// Sprint 6.3B — Auth Redirect Acceptance Tests
//
// Verifies post-login redirect logic defined in lib/auth/redirect.ts.
// Pure functions only — no server, no database, no Next.js runtime.
//
// Run: npx tsx scripts/acceptance-test-auth-redirect.ts
// ─────────────────────────────────────────────────────────────

import { resolvePostLoginRedirect } from "../lib/auth/redirect";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Section 1 — Role fallbacks (next is null or absent)
// When no next param, each role lands on its own dashboard.
// ─────────────────────────────────────────────────────────────
console.log("\n● Role fallbacks (no next param)\n");

assert(
  "admin with no next → /admin",
  resolvePostLoginRedirect(null, "admin") === "/admin",
);

assert(
  "coach with no next → /hq",
  resolvePostLoginRedirect(null, "coach") === "/hq",
);

assert(
  "client with no next → /portal",
  resolvePostLoginRedirect(null, "client") === "/portal",
);

// ─────────────────────────────────────────────────────────────
// Section 2 — Authorized next params
// Primary bug fix: admin landing on /hq, coach landing on /hq.
// ─────────────────────────────────────────────────────────────
console.log("\n● Authorized next params\n");

assert(
  "admin with next=/hq → /hq (primary bug scenario)",
  resolvePostLoginRedirect("/hq", "admin") === "/hq",
);

assert(
  "coach with sub-path next=/hq/clients/123 → /hq/clients/123",
  resolvePostLoginRedirect("/hq/clients/123", "coach") === "/hq/clients/123",
);

assert(
  "/account is accessible to all roles — coach",
  resolvePostLoginRedirect("/account", "coach") === "/account",
);

// ─────────────────────────────────────────────────────────────
// Section 3 — Unauthorized next params → role fallback applied
// ─────────────────────────────────────────────────────────────
console.log("\n● Unauthorized next params\n");

assert(
  "coach with next=/admin → /hq (admin-only route)",
  resolvePostLoginRedirect("/admin", "coach") === "/hq",
);

assert(
  "client with next=/hq → /portal (coach/admin-only route)",
  resolvePostLoginRedirect("/hq", "client") === "/portal",
);

// ─────────────────────────────────────────────────────────────
// Section 4 — Path safety validation
// Open-redirect attempts must be rejected regardless of role.
// ─────────────────────────────────────────────────────────────
console.log("\n● Path safety validation\n");

assert(
  "protocol-relative path //evil.com → rejected (admin falls back to /admin)",
  resolvePostLoginRedirect("//evil.com", "admin") === "/admin",
);

assert(
  "absolute URL https://evil.com → rejected (client falls back to /portal)",
  resolvePostLoginRedirect("https://evil.com", "client") === "/portal",
);

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────────────────────────`);
console.log(`  ${passed + failed} tests · ${passed} passed · ${failed} failed`);

if (failures.length > 0) {
  console.log(`\n  FAILURES:`);
  failures.forEach((f) => console.log(`    ✗ ${f}`));
  console.log();
  process.exit(1);
} else {
  console.log(`\n  All tests passed.\n`);
}
