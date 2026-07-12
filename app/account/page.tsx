// ─────────────────────────────────────────────────────────────
// Catalyst OS — Account Page
//
// Server Component — auth and DB query run server-side.
// Shows identity information and provides the sign-out control.
// No profile editing in this sprint.
// ─────────────────────────────────────────────────────────────

import Image from "next/image";
import Link from "next/link";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import LogoutButton from "@/components/portal/LogoutButton";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
  archived: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  invited: "text-[#c9a24d]/80",
  active: "text-emerald-400/80",
  suspended: "text-red-400/80",
  archived: "text-white/30",
};

export default async function AccountPage() {
  const { authUser, dbUser } = await requireClientUser();
  const profile = await getClientProfile(dbUser.id);

  const initials = (profile?.fullName || authUser.email || "C")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusLabel = STATUS_LABELS[dbUser.status] ?? dbUser.status;
  const statusColor = STATUS_COLORS[dbUser.status] ?? "text-white/40";

  return (
    <div className="min-h-screen bg-[#080909] text-[#f0efeb]">
      {/* Minimal header */}
      <header className="border-b border-white/[0.06] px-6 h-16 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logos/mark-gold.png"
            alt="Catalyst Coaching"
            width={20}
            height={20}
            className="opacity-75"
          />
          <span className="text-[10px] font-semibold tracking-[0.26em] text-white/45 uppercase">
            Catalyst OS
          </span>
        </div>
        <Link
          href="/portal"
          className="text-xs text-white/35 hover:text-white/60 transition-colors"
        >
          ← Back to Portal
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Page title */}
        <div className="flex flex-col gap-1">
          <div className="w-6 h-[2px] bg-[#c9a24d] mb-3" aria-hidden />
          <h1 className="font-headline text-3xl uppercase tracking-[0.06em] text-white">
            Account
          </h1>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#c9a24d]/10 border border-[#c9a24d]/25 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-[#c9a24d]">{initials}</span>
          </div>
          <div className="flex flex-col">
            {profile?.fullName && (
              <p className="text-base font-semibold text-white/85">
                {profile.fullName}
              </p>
            )}
            <p className="text-sm text-white/40">{authUser.email}</p>
          </div>
        </div>

        {/* Gold rule */}
        <div className="h-px w-full bg-[#c9a24d]/10" />

        {/* Details grid */}
        <div className="flex flex-col gap-6">
          <Field label="Full Name" value={profile?.fullName ?? "—"} />
          <Field
            label="Preferred Name"
            value={profile?.preferredName ?? "—"}
          />
          <Field label="Email" value={authUser.email ?? "—"} />
          <Field label="Timezone" value={profile?.timezone ?? "—"} />
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/30 uppercase">
              Account Status
            </p>
            <p className={`text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </p>
          </div>
        </div>

        {/* Gold rule */}
        <div className="h-px w-full bg-[#c9a24d]/10" />

        {/* Sign out */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/25 uppercase">
            Session
          </p>
          <LogoutButton className="w-fit text-sm px-0 py-0" />
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-white/30 uppercase">
        {label}
      </p>
      <p className="text-sm text-white/70">{value}</p>
    </div>
  );
}
