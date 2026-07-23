import { redirect } from "next/navigation";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const profile = await getClientProfile(dbUser.id);
  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";

  return (
    <PortalShell clientName={clientName}>
      <div>
        <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
          Resources
        </p>
        <h1
          className="text-white font-bold leading-tight mb-4"
          style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
        >
          Your Coaching Library
        </h1>
        <p className="text-white/28 text-sm leading-relaxed max-w-sm mb-10">
          Your coach curates resources specific to where you are in your program —
          Meal Plans, training guides, technique references, and posing materials.
          Each one is shared at the right moment, not all at once.
        </p>

        {/* Empty state — framed as curation in progress, not absence */}
        <div className="border-l-2 border-white/[0.07] pl-5 py-1">
          <p className="text-white/38 text-sm font-medium mb-2">
            No resources shared yet.
          </p>
          <p className="text-white/20 text-xs leading-relaxed max-w-xs">
            All coaching materials will appear here as your program progresses.
            Your library typically begins building in the first week of training.
          </p>
        </div>
      </div>
    </PortalShell>
  );
}
