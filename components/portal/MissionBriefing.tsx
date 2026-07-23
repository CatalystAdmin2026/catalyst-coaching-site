import type { PortalScenario } from "@/lib/portal/types";

interface Props {
  clientName: string;
  scenario: PortalScenario;
  banner?: string;
  mounted: boolean;
  reducedMotion: boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface BriefingContent {
  coach: string;
  tagline: string;
}

const BRIEFINGS: Record<PortalScenario, BriefingContent> = {
  first_day: {
    coach:
      "Your coach is ready. Everything you track here — every session, every check-in — becomes evidence that you follow through. Start by telling your coach where you are right now.",
    tagline: "Day one. The record starts now.",
  },
  default: {
    coach:
      "Emma, today's upper-body push session is about controlled execution. Stay patient with the tempo and finish strong. Three missions remain — the day isn't done.",
    tagline: "Keep six promises. Build the person you're becoming.",
  },
  zero: {
    coach:
      "Emma, today's session is built and waiting. Six promises, one at a time. Start with the first and let the rest follow.",
    tagline: "Six promises. One at a time.",
  },
  "all-complete": {
    coach:
      "Emma, all six promises were kept today. This is exactly what the process looks like. Rest well and come back stronger.",
    tagline: "The standard is set. Rest.",
  },
  recovery: {
    coach:
      "Recovery is part of the program. Rest with the same intention you train. Protect your sleep and nutrition — adaptation happens here.",
    tagline: "Honor the rest. The adaptation happens here.",
  },
  "check-in-day": {
    coach:
      "Today is about reflection, honesty, and the next adjustment. Your check-in gives your coach the data to build next week around.",
    tagline: "Honest data produces better programming.",
  },
  travel: {
    coach:
      "Progress is not paused because life got busy. Today's mission adapts with you — the standard remains the same.",
    tagline: "The environment changed. The standard did not.",
  },
  "missed-yesterday": {
    coach:
      "Yesterday is over. You are here today, and that is what matters. One promise at a time, starting now.",
    tagline: "Today's promise is what counts.",
  },
};

export default function MissionBriefing({ clientName, scenario, banner, mounted, reducedMotion }: Props) {
  const firstName = clientName.split(" ")[0];
  const greeting = getGreeting();
  const { coach, tagline } = BRIEFINGS[scenario];

  const heroStyle: React.CSSProperties = reducedMotion
    ? {}
    : {
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(-6px)",
        transition: "opacity 500ms ease, transform 500ms ease",
        transitionDelay: "0ms",
      };

  return (
    <div className="flex flex-col gap-0">
      {/* Scenario banner */}
      {banner && (
        <div className="mb-5 px-4 py-2.5 bg-[#c9a24d]/8 border border-[#c9a24d]/20 rounded-sm">
          <p className="text-xs text-[#c9a24d]/90 font-medium tracking-wide">{banner}</p>
        </div>
      )}

      {/* Hero block */}
      <div style={heroStyle}>
        {/* Gold overline */}
        <div className="w-8 h-[2px] bg-[#c9a24d] mb-4" aria-hidden />

        {/* TODAY'S MISSION */}
        <h1 className="font-headline text-5xl md:text-6xl lg:text-[4.5rem] uppercase tracking-[0.04em] text-white leading-none">
          Today&apos;s<br />Mission
        </h1>

        {/* Greeting */}
        <p className="font-headline text-xl md:text-2xl uppercase tracking-[0.08em] text-white/45 leading-tight mt-2">
          {greeting}, {firstName}.
        </p>

        {/* Gold separator */}
        <div className="w-full h-px bg-[#c9a24d]/15 my-5" aria-hidden />

        {/* Coach briefing */}
        <p className="text-sm text-white/55 leading-relaxed max-w-lg">
          {coach}
        </p>

        {/* Tagline */}
        <p className="mt-3 text-[11px] text-white/25 tracking-[0.04em] italic">
          {tagline}
        </p>
      </div>
    </div>
  );
}
