"use client";

import { useEffect } from "react";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PortalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to server-side error tracking (digest is the Supabase-safe obfuscated ID).
    console.error("[portal-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080909] flex items-center justify-center px-5">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <div className="w-10 h-10 rounded-sm bg-red-950/40 border border-red-800/30 flex items-center justify-center">
          <span className="text-red-400 text-sm">!</span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-white/80 text-sm font-semibold">Something went wrong</p>
          <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
            An unexpected error occurred. Your data is safe. Try refreshing — if the problem
            persists, contact your coach.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={reset}
            className="w-full bg-[#c9a24d] text-black py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-[#d4b56a] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/portal"
            className="text-xs text-white/30 hover:text-white/55 transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
