import { redirect } from "next/navigation";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import { getProgressData } from "@/lib/db/portal-dashboard-service";
import PortalShell from "@/components/portal/PortalShell";
import ProgressContent from "@/components/portal/ProgressContent";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const [profile, progressData] = await Promise.all([
    getClientProfile(dbUser.id),
    getProgressData(dbUser.id),
  ]);

  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";

  return (
    <PortalShell clientName={clientName}>
      <div>
        <h1 className="text-white text-xl font-bold tracking-wide">Progress</h1>
        <p className="text-gray-400 text-sm mt-1">
          Is this working? Your data tells the story.
        </p>
      </div>
      <ProgressContent data={progressData} />
    </PortalShell>
  );
}
