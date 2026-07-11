import { Activity, Calendar, FileText, Target } from "lucide-react";

const TABS = [
  { icon: Target,   label: "Today",    active: true },
  { icon: Activity, label: "Progress" },
  { icon: Calendar, label: "Check-Ins" },
  { icon: FileText, label: "Docs" },
];

export default function MobilePortalNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141618]/96 backdrop-blur-md border-t border-white/[0.07] h-16 flex items-center">
      {TABS.map(({ icon: Icon, label, active }) => (
        <div
          key={label}
          className={`flex-1 flex flex-col items-center justify-center gap-1 cursor-default transition-colors ${
            active ? "text-[#c9a24d]" : "text-white/30"
          }`}
        >
          <Icon size={18} />
          <span className="text-[9px] font-medium tracking-wide">{label}</span>
        </div>
      ))}
    </nav>
  );
}
