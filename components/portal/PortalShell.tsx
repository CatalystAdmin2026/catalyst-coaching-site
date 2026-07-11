import PortalSidebar from "./PortalSidebar";
import MobilePortalNav from "./MobilePortalNav";

interface Props {
  children: React.ReactNode;
  clientName: string;
}

export default function PortalShell({ children, clientName }: Props) {
  return (
    <div className="min-h-screen bg-[#080909] text-[#f0efeb]">
      <PortalSidebar clientName={clientName} />

      {/* Main content — offset by sidebar width on desktop */}
      <main className="lg:ml-56 min-h-screen flex flex-col">
        <div className="flex-1 max-w-3xl w-full mx-auto px-5 md:px-8 py-10 pb-28 lg:pb-14 flex flex-col gap-10">
          {children}
        </div>
      </main>

      <MobilePortalNav />
    </div>
  );
}
