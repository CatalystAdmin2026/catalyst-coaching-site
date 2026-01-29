import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen text-white bg-gradient-to-b from-[#1F2326] via-[#141618] to-[#0B0B0B]">
      {/* TOP BAR */}
      <header className="max-w-6xl mx-auto px-6 pt-7">
  <div className="flex items-center justify-center gap-3">
    <Image
      src="/logos/mark-gold.png"
      alt="Catalyst Coaching"
      width={26}
      height={26}
      priority
    />
    <span className="tracking-[0.35em] text-sm font-semibold text-gray-200">
      CATALYST COACHING
    </span>
  </div>
  <div className="mt-4 h-px w-full bg-[#C9A24D]/70" />
</header>



      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-16 grid md:grid-cols-2 gap-10 items-center">
        {/* LEFT */}
        <div>
          <p className="text-[#C9A24D] font-semibold tracking-wide mb-3">
            Empowering Driven Professionals
          </p>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-wide mb-6">
            About Catalyst Coaching
          </h1>

          <p className="text-gray-200/90 leading-relaxed mb-10 max-w-xl">
            We provide elite fitness coaching for high achievers who demand the best.
            Our system blends structured training, performance-focused nutrition, and
            accountability so you execute consistently—and get measurable results.
          </p>

          <h2 className="text-xl font-semibold mb-4">Who We Work With</h2>
          <ul className="space-y-3 text-gray-200 mb-10">
            <li className="flex gap-3"><span className="text-[#C9A24D]">✓</span> Busy Executives</li>
            <li className="flex gap-3"><span className="text-[#C9A24D]">✓</span> Entrepreneurs</li>
            <li className="flex gap-3"><span className="text-[#C9A24D]">✓</span> High Performers</li>
          </ul>
        </div>

        {/* RIGHT (coach + overlapping button) */}
        <div className="relative w-full h-80 md:h-[520px]">
          {/* subtle vignette behind the coach so it blends */}
          <div className="absolute inset-0 rounded-sm bg-gradient-to-r from-black/35 via-transparent to-transparent" />

          <Image
            src="/images/coach.jpg"
            alt="Catalyst Coach"
            fill
            priority
            className="object-contain object-bottom"
          />

          {/* OVERLAPPING CTA BUTTON */}
          <a
            href="/apply"
            className="absolute left-1/2 -translate-x-1/2 bottom-10 md:bottom-14
                       bg-[#C9A24D] text-black px-8 py-3 rounded-sm font-semibold
                       shadow-lg hover:opacity-90 transition"
          >
            Apply to Work With Us
          </a>
        </div>
      </section>
    </main>
  );
}
