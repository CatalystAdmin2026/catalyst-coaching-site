// Live (non-prototype) mission briefing header for /portal.
// Does not depend on the scenario system or hardcoded copy.
// TODO Sprint 5B.5: Replace static coaching message with
// getMissionBriefing() call once the promise system is live.

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface Props {
  clientName: string;
}

export default function LiveMissionBriefing({ clientName }: Props) {
  const firstName = clientName.split(" ")[0];
  const greeting = getGreeting();

  return (
    <div className="flex flex-col gap-0">
      {/* Gold overline */}
      <div className="w-8 h-[2px] bg-[#c9a24d] mb-4" aria-hidden />

      {/* Headline */}
      <h1 className="font-headline text-5xl md:text-6xl lg:text-[4.5rem] uppercase tracking-[0.04em] text-white leading-none">
        Today&apos;s
        <br />
        Mission
      </h1>

      {/* Greeting */}
      <p className="font-headline text-xl md:text-2xl uppercase tracking-[0.08em] text-white/45 leading-tight mt-2">
        {greeting}, {firstName}.
      </p>

      {/* Gold separator */}
      <div className="w-full h-px bg-[#c9a24d]/15 my-5" aria-hidden />

      {/* Coach briefing */}
      {/* TODO Sprint 5B.5: Replace with AI-generated coaching message */}
      <p className="text-sm text-white/55 leading-relaxed max-w-lg">
        Your missions are loaded and ready. Stay consistent today — every
        promise kept builds the compounding result your coach is tracking.
      </p>

      {/* Tagline */}
      <p className="mt-3 text-[11px] text-white/25 tracking-[0.04em] italic">
        Every rep, every meal, every night of sleep. The standard is the
        standard.
      </p>
    </div>
  );
}
