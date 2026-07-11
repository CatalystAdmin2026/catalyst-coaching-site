import Image from "next/image";
import { Activity, Calendar, FileText, LayoutDashboard, Target } from "lucide-react";

interface NavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Target,          label: "Today's Mission", active: true },
  { icon: Activity,        label: "Progress" },
  { icon: LayoutDashboard, label: "My Program" },
  { icon: Calendar,        label: "Check-Ins" },
  { icon: FileText,        label: "Documents" },
];

interface Props {
  clientName: string;
}

export default function PortalSidebar({ clientName }: Props) {
  const initials = clientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 fixed top-0 left-0 h-full bg-[#141618] border-r border-white/[0.06] z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/[0.06]">
        <Image
          src="/logos/mark-gold.png"
          alt="Catalyst Coaching"
          width={22}
          height={22}
          className="opacity-85"
        />
        <span className="text-[10px] font-semibold tracking-[0.26em] text-white/55 uppercase">
          Catalyst OS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium tracking-wide transition-colors cursor-default ${
              active
                ? "bg-[#c9a24d]/10 text-[#c9a24d]"
                : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
          >
            <Icon size={14} className={active ? "text-[#c9a24d]" : "text-white/30"} />
            {label}
          </div>
        ))}
      </nav>

      {/* Client identity */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#c9a24d]/15 border border-[#c9a24d]/25 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-[#c9a24d] leading-none">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-white/70 truncate">{clientName}</span>
            <span className="text-[10px] text-white/30">Catalyst Client</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
