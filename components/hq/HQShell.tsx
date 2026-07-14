import HQSidebar from "./HQSidebar";
import HQMobileNav from "./HQMobileNav";

interface Props {
  children: React.ReactNode;
  coachName: string;
}

export default function HQShell({ children, coachName }: Props) {
  return (
    <div className="min-h-screen bg-[#080909] text-[#f0efeb]">
      <HQSidebar coachName={coachName} />
      <HQMobileNav coachName={coachName} />

      {/* Main content — offset by sidebar on desktop, top bar on mobile */}
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-12 lg:pt-0 px-5 lg:px-10 py-6 lg:py-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
