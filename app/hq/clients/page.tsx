// Catalyst HQ — Clients Directory
// Server component. Auth via layout.tsx.

import { listCoachClients } from "@/lib/db/coach-dashboard-service";
import ClientsDirectory from "@/components/hq/ClientsDirectory";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listCoachClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-wide text-white">Clients</h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {clients.length} total · sorted by attention by default
        </p>
      </div>

      <ClientsDirectory clients={clients} />
    </div>
  );
}
