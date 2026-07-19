"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Calendar, FileText, Layers, Target } from "lucide-react";

const TABS = [
  { icon: Target,   label: "Today",     href: "/portal",           exact: true },
  { icon: Activity, label: "Progress",  href: "/portal/progress"               },
  { icon: Layers,   label: "Program",   href: "/portal/program"                },
  { icon: Calendar, label: "Check-Ins", href: "/portal/check-ins"              },
  { icon: FileText, label: "Docs",      href: "/portal/documents"              },
];

export default function MobilePortalNav() {
  const pathname = usePathname();

  function isActive(tab: typeof TABS[number]): boolean {
    if (tab.exact) return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(tab.href + "/");
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141618]/96 backdrop-blur-md border-t border-white/[0.07] h-16 flex items-center">
      {TABS.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              active ? "text-[#c9a24d]" : "text-white/30 hover:text-white/50"
            }`}
          >
            <Icon size={18} />
            <span className="text-[9px] font-medium tracking-wide">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
