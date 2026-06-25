"use client";

// TODO: This is client-side access protection using sessionStorage/localStorage flags.
// It prevents casual direct URL access but is NOT cryptographically secure.
// Before production, replace with server-side Stripe webhook verification:
//   1. Stripe fires payment_intent.succeeded / checkout.session.completed webhook
//   2. Server stores a signed, httpOnly cookie tied to the confirmed Stripe session ID
//   3. Next.js middleware reads and validates the cookie before serving /onboarding routes

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AccessGuardProps {
  sessionKey: string;   // sessionStorage key set on the confirmation page CTA
  progressKey: string;  // localStorage key for saved wizard progress (allows resume after tab close)
  redirectTo: string;   // destination for unauthorized visitors
  children: React.ReactNode;
}

function checkAccess(sessionKey: string, progressKey: string): boolean {
  if (typeof window === "undefined") return false;
  // Allow resume: if the user saved progress in a prior session,
  // they already passed through the paid flow, so let them continue.
  return (
    sessionStorage.getItem(sessionKey) === "true" ||
    localStorage.getItem(progressKey) !== null
  );
}

export default function AccessGuard({
  sessionKey,
  progressKey,
  redirectTo,
  children,
}: AccessGuardProps) {
  const router = useRouter();
  const granted = checkAccess(sessionKey, progressKey);

  useEffect(() => {
    if (!granted) {
      router.replace(`${redirectTo}?access=required`);
    }
  }, [granted, redirectTo, router]);

  // Render a blank dark screen while checking or redirecting — prevents any flash
  // of wizard content for unauthorized users before the redirect fires.
  if (!granted) {
    return <div className="min-h-screen bg-[#080909]" />;
  }

  return <>{children}</>;
}
