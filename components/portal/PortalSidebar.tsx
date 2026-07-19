"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Calendar, FileText, LayoutDashboard, Target } from "lucide-react";
import LogoutButton from "./LogoutButton";

interface NavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Target,          label: "Today's Mission", href: "/portal",       exact: true },
  { icon: Activity,        label: "Progress",        href: "/portal/progress"            },
  { icon: LayoutDashboard, label: "My Program",      href: "/portal/program"             },
  { icon: Calendar,        label: "Check-Ins",       href: "/portal/check-ins"           },
  { icon: FileText,        label: "Documents",       href: "/portal/documents"           },
];

interface Props {
  clientName: string;
}

export default function PortalSidebar({ clientName }: Props) {
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

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
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium tracking-wide transition-colors ${
                active
                  ? "bg-[#c9a24d]/10 text-[#c9a24d]"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={14} className={active ? "text-[#c9a24d]" : "text-white/30"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Client identity — links to account page */}
      <div className="border-t border-white/[0.06]">
        <Link
          href="/account"
          className="px-4 pt-4 pb-2.5 flex items-center gap-2.5 hover:bg-white/[0.03] transition-colors group"
          title="Account settings"
        >
          <div className="w-7 h-7 rounded-full bg-[#c9a24d]/15 border border-[#c9a24d]/25 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-[#c9a24d] leading-none">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-white/70 group-hover:text-white/85 truncate transition-colors">{clientName}</span>
            <span className="text-[10px] text-white/30">Account →</span>
          </div>
        </Link>
        <div className="px-4 pb-4">
          <LogoutButton className="text-[10px]" />
        </div>
      </div>
    </aside>
  );
}
