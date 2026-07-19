// ─────────────────────────────────────────────────────────────
// Sprint 6.3B.1 — Auth & Portal Acceptance Tests
//
// 20 deterministic tests verifying auth flows, portal routes,
// security invariants, and portal boundary components.
//
// Approach: fs.readFile for server-only files (route handlers,
// server components), direct import for pure modules.
//
// Run: npx tsx scripts/acceptance-test-auth.ts
// ─────────────────────────────────────────────────────────────

import { readFile } from "fs/promises";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

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

function section(title: string) {
  console.log(`\n● ${title}\n`);
}

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, relPath), "utf8");
}

async function main() {
  // ─────────────────────────────────────────────────────────────
  // Section 1 — Login page (email/password + magic link)
  // ─────────────────────────────────────────────────────────────
  section("Login page — wiring");

  const loginSrc = await readSrc("app/login/page.tsx");

  assert(
    "Login uses signInWithPassword for password mode",
    loginSrc.includes("signInWithPassword"),
  );

  assert(
    "Login uses signInWithOtp for magic link mode",
    loginSrc.includes("signInWithOtp"),
  );

  assert(
    "Magic link enforces shouldCreateUser: false (no public signup)",
    loginSrc.includes("shouldCreateUser: false"),
  );

  assert(
    "Login uses generic error message (prevents email enumeration)",
    loginSrc.includes("Invalid email or password"),
  );

  assert(
    "Login links to /forgot-password",
    loginSrc.includes("forgot-password"),
  );

  assert(
    "Login navigates to /auth/role-redirect after password sign-in",
    loginSrc.includes("/auth/role-redirect"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 2 — Role-redirect route (post password sign-in)
  // ─────────────────────────────────────────────────────────────
  section("Role-redirect route — security");

  const roleRedirectSrc = await readSrc("app/auth/role-redirect/route.ts");

  assert(
    "role-redirect calls syncUserToPublic (idempotent sync on every sign-in)",
    roleRedirectSrc.includes("syncUserToPublic"),
  );

  assert(
    "role-redirect calls resolvePostLoginRedirect (role-based routing)",
    roleRedirectSrc.includes("resolvePostLoginRedirect"),
  );

  assert(
    "role-redirect redirects unauthenticated sessions to login error",
    roleRedirectSrc.includes("auth_callback_failed"),
  );

  assert(
    "role-redirect signs out and redirects suspended/archived users",
    roleRedirectSrc.includes("access_denied") && roleRedirectSrc.includes("signOut"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 3 — Password reset flows (forgot + reset + setup)
  // ─────────────────────────────────────────────────────────────
  section("Password reset & first-time setup flows");

  const forgotSrc = await readSrc("app/forgot-password/page.tsx");

  assert(
    "Forgot-password uses resetPasswordForEmail",
    forgotSrc.includes("resetPasswordForEmail"),
  );

  assert(
    "Forgot-password always shows neutral success (enumeration prevention)",
    forgotSrc.includes('"sent"') && forgotSrc.includes("setState"),
  );

  const resetSrc = await readSrc("app/reset-password/page.tsx");

  assert(
    "Reset-password uses supabase.auth.updateUser to set new password",
    resetSrc.includes("updateUser") && resetSrc.includes("password"),
  );

  assert(
    "Reset-password redirects to /login?message=password_updated on success",
    resetSrc.includes("password_updated"),
  );

  const setupSrc = await readSrc("app/setup-password/page.tsx");

  assert(
    "Setup-password redirects to /portal on success (first-time invite flow)",
    setupSrc.includes('"/portal"'),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 4 — Auth callback type routing
  // ─────────────────────────────────────────────────────────────
  section("Auth callback — type-based routing");

  const callbackSrc = await readSrc("app/auth/callback/route.ts");

  assert(
    "Auth callback routes type=recovery to /reset-password",
    callbackSrc.includes('type === "recovery"') &&
      callbackSrc.includes("/reset-password"),
  );

  assert(
    "Auth callback routes type=invite to /setup-password",
    callbackSrc.includes('type === "invite"') &&
      callbackSrc.includes("/setup-password"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 5 — Portal routes exist
  // ─────────────────────────────────────────────────────────────
  section("Portal routes");

  const [programSrc, progressSrc, documentsSrc] = await Promise.all([
    readSrc("app/portal/program/page.tsx"),
    readSrc("app/portal/progress/page.tsx"),
    readSrc("app/portal/documents/page.tsx"),
  ]);

  assert(
    "/portal/program page exists and uses requireClientUser",
    programSrc.includes("requireClientUser"),
  );

  assert(
    "/portal/progress page exists and uses PortalShell",
    progressSrc.includes("PortalShell"),
  );

  assert(
    "/portal/documents page exists and uses PortalShell",
    documentsSrc.includes("PortalShell"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 6 — Session persistence + logout
  // ─────────────────────────────────────────────────────────────
  section("Session persistence + logout");

  const sidebarSrc = await readSrc("components/portal/PortalSidebar.tsx");

  assert(
    "PortalSidebar imports LogoutButton (explicit logout available)",
    sidebarSrc.includes("LogoutButton"),
  );

  const logoutSrc = await readSrc("components/portal/LogoutButton.tsx");

  assert(
    "LogoutButton calls supabase.auth.signOut() to clear the session",
    logoutSrc.includes("signOut"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 7 — Error boundaries
  // ─────────────────────────────────────────────────────────────
  section("Portal error boundaries");

  const [errorSrc, notFoundSrc, loadingSrc] = await Promise.all([
    readSrc("app/portal/error.tsx"),
    readSrc("app/portal/not-found.tsx"),
    readSrc("app/portal/loading.tsx"),
  ]);

  assert(
    "portal/error.tsx is a client component (required for React error boundary)",
    errorSrc.startsWith('"use client"'),
  );

  assert(
    "portal/not-found.tsx has back-to-dashboard link",
    notFoundSrc.includes("/portal"),
  );

  assert(
    "portal/loading.tsx exists for streaming skeleton",
    loadingSrc.length > 0,
  );

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log(
    `\n─────────────────────────────────────────────────────────────`,
  );
  console.log(
    `  ${passed + failed} tests · ${passed} passed · ${failed} failed`,
  );

  if (failures.length > 0) {
    console.log(`\n  FAILURES:`);
    failures.forEach((f) => console.log(`    ✗ ${f}`));
    console.log();
    process.exit(1);
  } else {
    console.log(`\n  All tests passed.\n`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
