import type { Mission, PortalScenario } from "@/lib/portal/types";

interface Props {
  scenario: PortalScenario;
  missions: Mission[];
}

const DEBRIEFS: Record<PortalScenario, string> = {
  first_day:
    "Your first check-in is where everything begins. Your coach builds your program around your starting point — the more honest your answers, the more precisely the training fits you.",
  default:
    "Your coach sees this data daily. Every logged mission sharpens what comes next — the more consistent your tracking, the tighter the programming gets.",
  zero:
    "Start anywhere. The first action breaks the inertia, and every mission after it comes easier. You don't need momentum to begin — beginning is how you build it.",
  "all-complete":
    "Days like this are the ones that compound. Your coach will see this and build on it. The gap between where you started and where you're going closed a little more today.",
  recovery:
    "Active recovery is part of the adaptation cycle. Sleep, protein, and movement quality still matter on rest days — your body is building right now. Protect it.",
  "check-in-day":
    "Honest check-in data produces better programming. Five minutes of reflection today shapes the next four weeks of your plan.",
  travel:
    "Executing through disruption is the skill the best athletes have. The environment changes. The standard doesn't. You are practicing that discipline right now.",
  "missed-yesterday":
    "Every athlete misses a day. What separates the ones who build lasting results is what they do the morning after. You're already here — that's the answer.",
};

export default function MissionDebrief({ scenario }: Props) {
  return (
    <div className="pt-8 border-t border-white/[0.05]">
      <p className="text-xs text-white/28 leading-relaxed max-w-xl italic">
        {DEBRIEFS[scenario]}
      </p>
    </div>
  );
}
