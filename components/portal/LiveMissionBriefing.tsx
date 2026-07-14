type TodayKind = "workout" | "rest_day" | "no_program" | "program_complete" | "not_started";

interface Props {
  clientName: string;
  todayKind: TodayKind | null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const BRIEFING: Record<TodayKind | "loading", string> = {
  workout:
    "Your training session is programmed and ready. One focused hour today compounds into the result your future self will thank you for. Execute the plan.",
  rest_day:
    "Rest is a training variable, not a day off. Protect your sleep, hit your protein targets, and move lightly. Your body is building right now.",
  no_program:
    "Your coach is finalizing your customized training block. Use this time to establish your sleep schedule, nutrition baseline, and morning routine.",
  program_complete:
    "You've completed your training block. The habits you built don't stop here — your coach will have your next phase ready soon. Maintain the standard.",
  not_started:
    "Your program launches on your start date. Prepare your training environment, dial in your nutrition protocol, and show up ready to execute.",
  loading:
    "Stay consistent today — every promise kept builds the compounding result your coach is tracking.",
};

export default function LiveMissionBriefing({ clientName, todayKind }: Props) {
  const firstName = clientName.split(" ")[0];
  const greeting = getGreeting();
  const briefing = BRIEFING[todayKind ?? "loading"];

  return (
    <div className="flex flex-col gap-0">
      {/* Gold overline */}
      <div className="w-8 h-[2px] bg-[#c9a24d] mb-4" aria-hidden />

      {/* Headline — fixed text, no overflow risk */}
      <h1 className="font-headline text-5xl md:text-6xl lg:text-[4.5rem] uppercase tracking-[0.04em] text-white leading-none">
        Today&apos;s
        <br />
        Mission
      </h1>

      {/* Greeting — user-supplied name; clamp + break-words prevents overflow */}
      <p
        className="font-headline uppercase tracking-[0.08em] text-white/45 leading-tight mt-2 break-words min-w-0"
        style={{ fontSize: "clamp(1rem, 4vw, 1.5rem)" }}
      >
        {greeting}, {firstName}.
      </p>

      {/* Gold separator */}
      <div className="w-full h-px bg-[#c9a24d]/15 my-5" aria-hidden />

      {/* Coach briefing — deterministic, context-aware */}
      <p className="text-sm text-white/55 leading-relaxed max-w-lg">{briefing}</p>

      {/* Tagline */}
      <p className="mt-3 text-[11px] text-white/25 tracking-[0.04em] italic">
        Every rep, every meal, every night of sleep. The standard is the standard.
      </p>
    </div>
  );
}
