import { redirect } from "next/navigation";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  {
    id: "meal-plans",
    title: "Meal Plans",
    description: "Your personalized nutrition protocol, macro targets, and meal timing guidelines.",
    icon: "◈",
  },
  {
    id: "workout-pdfs",
    title: "Workout PDFs",
    description: "Printable versions of your training program for gym use.",
    icon: "◧",
  },
  {
    id: "supplement-protocols",
    title: "Supplement Protocols",
    description: "Recommendations, timing, and dosing for any supplements in your plan.",
    icon: "◉",
  },
  {
    id: "coach-documents",
    title: "Coach Documents",
    description: "Resources, guides, and educational materials shared by your coach.",
    icon: "◎",
  },
  {
    id: "progress-reports",
    title: "Progress Reports",
    description: "Periodic progress summaries and assessments from your coach.",
    icon: "◫",
  },
  {
    id: "contracts",
    title: "Agreements",
    description: "Your coaching agreement and any signed documents.",
    icon: "◻",
  },
] as const;

function DocumentCategory({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div
      className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-5 flex flex-col gap-3"
      role="region"
      aria-label={title}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[#c9a24d]/40 text-sm font-mono" aria-hidden>
          {icon}
        </span>
        <p className="text-white/70 text-sm font-medium">{title}</p>
      </div>
      <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
      <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">
        No documents yet
      </p>
    </div>
  );
}

export default async function DocumentsPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const profile = await getClientProfile(dbUser.id);
  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";

  return (
    <PortalShell clientName={clientName}>
      <div className="space-y-8">
        <div>
          <h1 className="text-white text-xl font-bold tracking-wide">Documents</h1>
          <p className="text-gray-400 text-sm mt-1">
            Program resources, nutrition guides, and coach-shared files.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <DocumentCategory
              key={cat.id}
              title={cat.title}
              description={cat.description}
              icon={cat.icon}
            />
          ))}
        </div>

        <p className="text-[10px] text-white/20 leading-relaxed">
          Documents are shared by your coach as your program progresses.
          Check back here after each coaching session.
        </p>
      </div>
    </PortalShell>
  );
}
