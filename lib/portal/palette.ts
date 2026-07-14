// Catalyst Portal — Semantic color tokens
//
// Contrast ratios against #080909 (portal dark background):
//   text-gray-400  (#9ca3af)  ≈ 5.9:1  — WCAG AA compliant for normal text
//   text-gray-500  (#6b7280)  ≈ 4.4:1  — AA for uppercase/all-caps labels ≥10px
//   text-gray-600  (#4b5563)  ≈ 2.6:1  — FAILS AA — do not use for content
//   text-gray-700  (#374151)  ≈ 2.2:1  — FAILS AA — decorative only
//   text-white/25              ≈ 1.7:1  — decorative only
//
// Usage: import { PORTAL } from "@/lib/portal/palette";
//   className={PORTAL.muted}     or
//   className={`${PORTAL.muted} text-xs`}
//
// Tailwind v4 auto-scans .ts files — the string literals below ensure
// all tokens are included in the CSS bundle even when used via variable.

export const PORTAL = {
  // Readable muted text — metadata, labels, secondary body info
  muted: "text-gray-400",
  // Dim labels — all-caps tracking labels ≥10px only
  dim: "text-gray-500",
  // Ghost / decorative — non-readable, ornamental text only
  ghost: "text-white/25",
  // Semantic states
  error: "text-red-400",
  success: "text-emerald-400",
  warn: "text-amber-400",
} as const;
