"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "loading" | "sent" | "error";

// Supabase Auth errors that are expected during normal operation and should not
// trigger console.error (which opens the Next.js dev overlay unnecessarily).
const OPERATIONAL_ERROR_CODES = new Set([
  "over_email_send_rate_limit",
  "otp_expired",
  "flow_state_expired",
]);

// useSearchParams() requires a Suspense boundary during static prerender.
// LoginContent contains the form; LoginPage wraps it in Suspense.
function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || state === "loading") return;

    setState("loading");
    setErrorMessage(null);

    const supabase = createClient();

    // shouldCreateUser: false is critical — Supabase will NOT create a new
    // auth.users row for an email that is not already invited. Unknown emails
    // receive the same neutral response as known emails, so account existence
    // is never disclosed to the requester.
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      },
    });

    if (authError) {
      const code = authError.code ?? "";
      if (OPERATIONAL_ERROR_CODES.has(code)) {
        // Expected operational errors: warn in dev only, no error overlay.
        if (process.env.NODE_ENV === "development") {
          console.warn("[login] auth operational error:", code);
        }
      } else {
        console.error("[login] signInWithOtp unexpected error:", code);
      }
      setState("error");
      setErrorMessage(
        code === "over_email_send_rate_limit"
          ? "Too many sign-in links were requested. Please wait a while and try again."
          : "Something went wrong. Please try again or contact your coach.",
      );
      return;
    }

    // Supabase returns no error even for unknown emails (shouldCreateUser: false
    // causes it to silently skip sending). This is the desired behavior:
    // the user always sees the same neutral success message.
    setState("sent");
  }

  const systemError =
    error === "access_denied"
      ? "Your account is not currently active. Contact your coach."
      : error === "auth_callback_failed"
        ? "The sign-in link was invalid or expired. Please request a new one."
        : error === "account_not_ready"
          ? "Your account is being set up. Please try again in a moment."
          : null;

  return (
    <div className="min-h-screen bg-[#080909] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm flex flex-col gap-10">
        {/* Catalyst mark */}
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logos/mark-gold.png"
            alt="Catalyst Coaching"
            width={36}
            height={36}
            priority
            style={{ filter: "drop-shadow(0 0 14px rgba(201,162,77,0.30))" }}
          />
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-white/40 uppercase">
              Catalyst OS
            </p>
            <h1 className="text-lg font-semibold text-white/90 tracking-wide">
              Client Portal
            </h1>
          </div>
        </div>

        {/* Gold rule */}
        <div className="h-px w-full bg-[#c9a24d]/14" />

        {/* System error (from URL param — e.g. access denied, expired link) */}
        {systemError && (
          <div className="px-4 py-3 bg-red-950/40 border border-red-800/30 rounded-sm">
            <p className="text-xs text-red-400 leading-relaxed">{systemError}</p>
          </div>
        )}

        {state === "sent" ? (
          /* ── Success state ─────────────────────────────────── */
          <div className="flex flex-col gap-5 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#c9a24d]/10 border border-[#c9a24d]/25 flex items-center justify-center">
              <span className="text-[#c9a24d] text-lg">✓</span>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-white/85">
                Check your inbox
              </p>
              <p className="text-xs text-white/40 leading-relaxed">
                If an active Catalyst account exists for{" "}
                <span className="text-white/60">{email}</span>, a secure
                sign-in link has been sent.
              </p>
              <p className="text-xs text-white/28 leading-relaxed mt-1">
                The link expires in 60 minutes. Check your spam folder if you
                don&apos;t see it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setState("idle");
                setEmail("");
              }}
              className="text-xs text-white/35 hover:text-white/55 transition-colors tracking-wide"
            >
              Try a different email
            </button>
          </div>
        ) : (
          /* ── Login form ────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-[10px] font-semibold tracking-[0.16em] text-white/40 uppercase"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                disabled={state === "loading"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-sm px-4 py-3 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:border-[#c9a24d]/40 focus:bg-white/[0.06] transition-colors disabled:opacity-50"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400 leading-relaxed">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={state === "loading" || !email.trim()}
              className="w-full bg-[#c9a24d] text-black py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-[#d4b56a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {state === "loading" ? "Sending…" : "Send Secure Sign-In Link"}
            </button>

            <p className="text-[10px] text-white/22 text-center leading-relaxed">
              Access is by invitation only.
              <br />
              No public account registration.
            </p>
          </form>
        )}

        {/* Gold rule */}
        <div className="h-px w-full bg-[#c9a24d]/8" />

        {/* Back link */}
        <Link
          href="/"
          className="text-center text-[10px] text-white/25 hover:text-white/45 tracking-[0.1em] uppercase transition-colors"
        >
          ← Catalyst Coaching
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
