import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Mail,
  ClipboardList,
  Phone,
  Zap,
  Crown,
  Package,
  Trophy,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Executive Performance Confirmed | Catalyst Coaching",
  description:
    "Your Executive Performance coaching program is now active. Welcome to the team.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Executive Performance Confirmed | Catalyst Coaching",
    description: "You're officially inside Executive Performance.",
    siteName: "Catalyst Coaching",
  },
};

/* ── Static data ─────────────────────────────────────── */

type Step = {
  num: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
};

const steps: Step[] = [
  {
    num: "01",
    Icon: Mail,
    title: "Check Your Email",
    desc: "You'll receive your Executive Welcome email within the next few minutes containing everything needed to begin.",
  },
  {
    num: "02",
    Icon: ClipboardList,
    title: "Complete Onboarding",
    desc: "Complete your Executive Performance onboarding questionnaire so we can begin building every aspect of your customized coaching system.",
  },
  {
    num: "03",
    Icon: Phone,
    title: "Executive Strategy Call",
    desc: "We'll personally schedule your Executive Strategy Call to discuss goals, review your assessment, and map out your performance roadmap.",
  },
  {
    num: "04",
    Icon: Zap,
    title: "We Get to Work",
    desc: "Once onboarding is complete, your coaching team begins building your customized systems, nutrition strategy, training program, supplement protocol, and ongoing optimization plan.",
  },
];

const packageIncludes: string[] = [
  "Unlimited Priority Concierge Support",
  "Unlimited Messaging",
  "Registered Dietitian Designed Nutrition",
  "Unlimited Program Updates",
  "Weekly InBody Composition Reviews",
  "Bloodwork Analysis & Optimization",
  "Quarterly Executive Strategy Sessions",
  "Travel Nutrition Planning",
  "Restaurant & Dining Strategy",
  "Personalized Supplement Protocols",
  "Recovery & Lifestyle Optimization",
  "Priority Response Times",
  "InBody Dial H30 Included",
  "Legacy Loyalty Rewards",
];

/* Subtle city skyline bar heights for hero background */
const skylineBars = [28,44,18,58,24,40,66,32,20,50,30,38,54,22,46,28,20,60,26,42,70,34,24,48];

/* ── Component ────────────────────────────────────────── */

export default function ExecutivePerformanceConfirmedPage() {
  return (
    <main className="bg-[#080909]">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 62% 0%, rgba(201,162,77,0.07) 0%, transparent 65%)",
            "radial-gradient(ellipse 50% 35% at 15% 88%, rgba(201,162,77,0.04) 0%, transparent 55%)",
            "#080909",
          ].join(", "),
        }}
      >
        {/* City silhouette — barely perceptible geometric suggestion */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden"
          style={{ height: 80, opacity: 0.028 }}
          aria-hidden="true"
        >
          {skylineBars.map((h, i) => (
            <div
              key={i}
              className="bg-white shrink-0"
              style={{ height: h, width: 11, marginRight: 2 }}
            />
          ))}
        </div>

        {/* Horizon line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-[#C9A24D]/10" aria-hidden="true" />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 pt-24 pb-20 max-w-3xl mx-auto w-full">

          {/* Gold outlined checkmark */}
          <div className="flex justify-center mb-10" aria-hidden="true">
            <div className="relative w-20 h-20 rounded-full border border-[#C9A24D]/45 flex items-center justify-center">
              {/* Outer ring */}
              <div
                className="absolute rounded-full border border-[#C9A24D]/12"
                style={{ inset: -8 }}
              />
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path
                  d="M4.5 13.5l6 6 11-11"
                  stroke="#C9A24D"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Eyebrow */}
          <p className="text-[#C9A24D] text-[10px] font-semibold tracking-[0.65em] mb-5 uppercase">
            Welcome to
          </p>

          {/* Main headline */}
          <h1 className="font-headline text-6xl sm:text-7xl md:text-[96px] font-bold uppercase leading-none tracking-tight mb-8 text-white">
            Executive
            <br />
            <span className="text-[#C9A24D]">Performance</span>
          </h1>

          {/* Rule */}
          <div className="w-10 h-px bg-[#C9A24D]/35 mx-auto mb-8" />

          {/* Status line */}
          <p className="text-gray-300 text-lg md:text-xl font-light tracking-wide mb-5">
            Payment confirmed. You&apos;re officially inside.
          </p>

          {/* Body */}
          <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-14">
            Thank you for trusting Catalyst Coaching with your health,
            performance, and future. We&apos;re honored to build something
            extraordinary together.
          </p>

          {/* Signature block */}
          <div className="inline-block text-left border-l-2 border-[#C9A24D]/28 pl-6">
            <p className="text-white font-semibold text-sm tracking-wide">
              Jermaine Jones
            </p>
            <p className="text-[#C9A24D] text-xs tracking-wider mt-0.5">
              Founder &amp; Head Coach
            </p>
            <p className="text-gray-600 text-[11px] tracking-wide mt-1">
              NFPT-CPT · NPC Competitive Bodybuilder
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: 0.22 }}
          aria-hidden="true"
        >
          <div className="w-px h-8 bg-[#C9A24D]" />
          <p className="text-[9px] tracking-[0.55em] text-[#C9A24D]">SCROLL</p>
        </div>
      </section>

      {/* ── WHAT HAPPENS NEXT ─────────────────────────────── */}
      <section className="py-28 px-6 bg-[#0c0e0f]">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-[#C9A24D] text-[10px] font-semibold tracking-[0.55em] mb-4 uppercase">
              Your Path Forward
            </p>
            <h2 className="font-headline text-4xl md:text-[54px] font-bold uppercase text-white leading-none">
              What Happens Next
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((step) => {
              const Icon = step.Icon;
              return (
                <div
                  key={step.num}
                  className="group relative p-9 md:p-10 border border-white/[0.05] bg-[#141618] transition-all duration-300 hover:border-[#C9A24D]/20 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(201,162,77,0.06)]"
                >
                  {/* Number + icon row */}
                  <div className="flex items-center gap-4 mb-6">
                    <p className="font-headline text-5xl font-bold text-[#C9A24D]/[0.12] leading-none">
                      {step.num}
                    </p>
                    <div className="w-9 h-9 border border-white/[0.07] flex items-center justify-center transition-colors duration-300 group-hover:border-[#C9A24D]/30">
                      <Icon
                        size={15}
                        className="text-[#C9A24D]/55 transition-colors duration-300 group-hover:text-[#C9A24D]"
                      />
                    </div>
                  </div>

                  <h3 className="text-white font-semibold text-[15px] tracking-wide mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── EXECUTIVE WELCOME KIT ──────────────────────────── */}
      <section className="py-24 px-6 bg-[#080909]">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14">
            <p className="text-[#C9A24D] text-[10px] font-semibold tracking-[0.55em] mb-4 uppercase">
              Exclusive Member Benefit
            </p>
            <h2 className="font-headline text-4xl md:text-[52px] font-bold uppercase text-white leading-none">
              Your Executive Welcome Kit
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

            {/* InBody H30 image placeholder */}
            <div
              className="relative aspect-[4/3] bg-[#141618] border border-white/[0.05] flex flex-col items-center justify-center overflow-hidden"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(201,162,77,0.025) 0%, transparent 70%), #141618",
              }}
            >
              <div className="w-14 h-14 border border-[#C9A24D]/18 flex items-center justify-center mb-4">
                <Package size={22} className="text-[#C9A24D]/35" />
              </div>
              <p className="text-[#C9A24D] text-[10px] tracking-[0.45em] uppercase font-semibold mb-1">
                Product Image
              </p>
              <p className="text-white/50 text-sm font-medium">InBody Dial H30</p>
              <p className="text-gray-700 text-[10px] text-center leading-relaxed mt-2 max-w-[180px]">
                Replace with official product photo from inbodyusa.com
              </p>
              {/* Box label */}
              <div className="absolute bottom-4 left-5 right-5 border-t border-white/[0.04] pt-3 flex justify-between">
                <span className="text-[9px] tracking-[0.3em] text-gray-700 uppercase">
                  Catalyst Coaching
                </span>
                <span className="text-[9px] tracking-[0.25em] text-gray-700 uppercase">
                  Executive
                </span>
              </div>
            </div>

            {/* Copy */}
            <div>
              <p className="text-[#C9A24D] text-[10px] font-semibold tracking-[0.55em] mb-4 uppercase">
                Next Steps
              </p>
              <h3 className="font-headline text-3xl md:text-[40px] font-bold uppercase text-white leading-none mb-7">
                Your InBody Is On the Way
              </h3>

              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Your complimentary InBody Dial H30 has already been scheduled
                for shipment.
              </p>

              <div className="border-l-2 border-[#C9A24D]/28 pl-5 mb-7">
                <p className="text-[10px] tracking-[0.3em] text-gray-600 uppercase mb-1">
                  Estimated Delivery
                </p>
                <p className="text-white font-semibold text-sm">
                  3–5 Business Days
                </p>
              </div>

              <div className="space-y-4 text-gray-500 text-sm leading-relaxed mb-7">
                <p>
                  As soon as your device ships you&apos;ll automatically receive
                  tracking information by email.
                </p>
                <p>
                  Once it arrives, we&apos;ll use your weekly body composition
                  scans to guide precise adjustments to your nutrition, training,
                  and performance strategy.
                </p>
              </div>

              <div className="border border-[#C9A24D]/14 bg-[#C9A24D]/[0.03] px-5 py-3.5">
                <p className="text-[#C9A24D] text-[10px] tracking-[0.35em] uppercase font-semibold">
                  Exclusive to Executive Performance Members
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PERFORMANCE PACKAGE ────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0c0e0f] border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-14">
            <p className="text-[#C9A24D] text-[10px] font-semibold tracking-[0.55em] mb-4 uppercase">
              Everything Included
            </p>
            <h2 className="font-headline text-4xl md:text-[52px] font-bold uppercase text-white leading-none">
              Your Executive Performance Package
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-14">
            {packageIncludes.map((item) => (
              <div
                key={item}
                className="flex items-center gap-4 py-3.5 border-b border-white/[0.04]"
              >
                <div className="shrink-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2.5 8.5l3.5 3.5 7-7"
                      stroke="#C9A24D"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-gray-300 text-sm leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEGACY REWARDS ─────────────────────────────────── */}
      <section className="py-28 px-6 bg-[#141618]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-center">

            {/* Copy */}
            <div>
              <p className="text-[#C9A24D] text-[10px] font-semibold tracking-[0.55em] mb-4 uppercase">
                Legacy Rewards
              </p>
              <h2 className="font-headline text-4xl md:text-5xl font-bold uppercase text-white leading-none mb-7">
                The Long Game
              </h2>

              <div className="space-y-4 text-gray-500 text-sm leading-relaxed mb-8">
                <p>
                  Executive Performance was designed for people committed to
                  building elite health over years—not weeks.
                </p>
                <p>
                  As a thank-you for your long-term commitment, members who
                  remain enrolled for 24 consecutive months receive a
                  complimentary{" "}
                  <span className="text-gray-300 font-medium">
                    InBody 270 Professional Body Composition Analyzer
                  </span>{" "}
                  as our anniversary gift.
                </p>
                <p>
                  This allows you to continue monitoring your health with the
                  same professional-grade technology used by elite training
                  facilities.
                </p>
              </div>

              <div className="border-l-2 border-[#C9A24D]/18 pl-5">
                <p className="text-[10px] tracking-[0.35em] text-[#C9A24D]/50 uppercase font-semibold">
                  Exclusive to Executive Performance Members
                </p>
              </div>
            </div>

            {/* InBody 270 image placeholder */}
            <div
              className="relative aspect-[4/3] border border-white/[0.04] flex flex-col items-center justify-center overflow-hidden"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(201,162,77,0.02) 0%, transparent 70%), #0c0e0f",
              }}
            >
              <Trophy size={26} className="text-[#C9A24D]/[0.28] mb-4" />
              <p className="text-[#C9A24D] text-[10px] tracking-[0.45em] uppercase font-semibold mb-1">
                24-Month Anniversary Gift
              </p>
              <p className="text-white/45 text-sm font-medium">InBody 270</p>
              <p className="text-gray-700 text-[10px] text-center leading-relaxed mt-2 max-w-[180px]">
                Replace with official product photo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PERSONAL MESSAGE ───────────────────────────────── */}
      <section className="py-32 px-6 bg-[#080909]">
        <div className="max-w-2xl mx-auto text-center">

          <div className="w-8 h-px bg-[#C9A24D]/30 mx-auto mb-10" />

          <Crown
            size={17}
            className="mx-auto mb-10 text-[#C9A24D]/45"
          />

          <h2 className="font-headline text-4xl md:text-5xl lg:text-[62px] font-bold uppercase text-white leading-tight tracking-tight mb-10">
            You Didn&apos;t Come This Far
            <br />
            <span className="text-[#C9A24D]">to Be Average.</span>
          </h2>

          <div className="space-y-3 text-gray-500 text-sm leading-relaxed mb-5 max-w-md mx-auto">
            <p>Elite performance isn&apos;t built through motivation.</p>
            <p>It&apos;s built through consistency, precision, and relentless execution.</p>
          </div>

          <p className="text-gray-300 text-sm font-medium tracking-wide mb-16">
            Welcome to the team.
          </p>

          <div className="w-8 h-px bg-[#C9A24D]/30 mx-auto mb-12" />

          {/* CTA */}
          <Link
            href="/"
            className="inline-block bg-[#C9A24D] text-black font-semibold tracking-[0.18em] text-sm px-14 py-5 uppercase hover:bg-[#D4B56A] transition-colors duration-300"
          >
            Return to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
