import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import { getDashboardData } from "@/lib/db/portal-dashboard-service";
import PortalDashboard from "@/components/portal/PortalDashboard";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const { dbUser } = await requireClientUser();
  const [profile, dashboardData] = await Promise.all([
    getClientProfile(dbUser.id),
    getDashboardData(dbUser.id),
  ]);

  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";

  return <PortalDashboard clientName={clientName} dashboardData={dashboardData} />;
}
