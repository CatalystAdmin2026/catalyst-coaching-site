import Image from "next/image";

export default function Home() {
  return (
    <main className="bg-[#141618] text-white min-h-screen">
      {/* TOP BAR (logo + name + gold line) */}
      <header className="max-w-6xl mx-auto px-6 pt-10">
  <div className="flex justify-center">
    <div className="flex items-center gap-3">
      <Image
        src="/logos/mark-gold.png"
        alt="Catalyst Coaching"
        width={60}
        height={60}
        priority
      />
      <span className="tracking-[0.35em] text-sm font-semibold text-gray-200">
        CATALYST COACHING
      </span>
    </div>
  </div>


        {/* thin gold line */}
        <div className="mt-6 h-px w-full bg-[#C9A24D]/70" />
      </header>

      {/* HERO (charcoal bg + headline + buttons) */}
      <section className="text-center pt-16 px-6">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-wide leading-tight">
  <span className="whitespace-nowrap">Private Coaching.</span>{" "}
  <span className="text-[#C9A24D] whitespace-nowrap">Elite Results.</span>
</h1>


        <p className="text-lg max-w-2xl mx-auto mb-10 text-gray-300">
          Transform Your Body. Unlock Your Potential
        </p>

        <div className="flex justify-center gap-4 mb-10">
          <a
            href="/apply"
            className="bg-[#C9A24D] text-black px-8 py-3 rounded-sm font-semibold hover:opacity-90 transition"
          >
            Apply for Coaching
          </a>

          <a
  href="/about"
  className="border border-[#C9A24D] px-8 py-3 rounded-sm font-semibold hover:bg-[#C9A24D] hover:text-black transition"
>
  Learn More
</a>

        </div>
      </section>

      {/* HERO IMAGES */}
<section className="max-w-6xl mx-auto px-6 pb-16">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Image 1 */}
    <div className="relative w-full h-72 md:h-96 overflow-hidden rounded-sm">
      <Image
        src="/images/lifting.jpg"
        alt="Lifting"
        fill
        priority
        className="object-cover"
        style={{ objectPosition: "50% 20%" }}
      />
    </div>

    {/* Image 2 */}
    <div className="relative w-full h-72 md:h-96 overflow-hidden rounded-sm">
      <Image
        src="/images/treadmill.jpg"
        alt="Treadmill"
        fill
        priority
        className="object-cover"
        style={{ objectPosition: "50% 20%" }}
      />
    </div>
  </div>
</section>


      {/* SERVICES (fixed layout) */}
<section id="services" className="py-20 px-6 bg-black/40">
  <h2 className="text-3xl font-bold text-center mb-12">Our Coaching Services</h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
    {[
      {
        title: "Custom Workouts",
        desc: "Programming built around your goals, schedule, and lifestyle.",
      },
      {
        title: "Nutrition Guidance",
        desc: "Simple, sustainable nutrition that supports performance and results.",
      },
      {
        title: "Accountability Coaching",
        desc: "Structure, check-ins, and execution support to keep you consistent.",
      },
    ].map((item) => (
      <div
        key={item.title}
        className="border border-[#C9A24D]/70 rounded-lg bg-[#0F1113]/60 p-8 text-center flex flex-col"
      >
        <h3 className="text-xl font-semibold mb-4">{item.title}</h3>

        <p className="text-gray-300 mb-8">{item.desc}</p>

        {/* forces button to the bottom so all cards align */}
        <a
          href="/apply"
          className="mt-auto bg-[#C9A24D] text-black px-5 py-2 rounded-md font-medium inline-block hover:opacity-90 transition"
        >
          Apply Now
        </a>
      </div>
    ))}
  </div>
</section>
      {/* HOW IT WORKS (fixed layout) */}
<section className="py-20 px-6 text-center">
  <h2 className="text-3xl font-bold mb-12">How It Works</h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
    {[
      { title: "Apply Online", desc: "Complete a short application so we can understand your goals." },
      { title: "Strategy Call", desc: "We’ll review your application and align on a plan." },
      { title: "Start Coaching", desc: "Begin your transformation with structure and accountability." },
    ].map((step, idx) => (
      <div
        key={step.title}
        className="border border-white/10 bg-black/20 rounded-lg p-8 flex flex-col items-center text-center min-h-[260px]"
      >
        <div className="text-[#C9A24D] text-4xl font-bold mb-6">{idx + 1}</div>

        <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>

        <p className="text-gray-300 leading-relaxed max-w-sm">
          {step.desc}
        </p>
      </div>
    ))}
  </div>

  <a
    className="mt-12 bg-[#C9A24D] text-black px-6 py-3 rounded-md font-semibold inline-block hover:opacity-90 transition"
    href="/apply"
  >
    Book Your Call
  </a>
</section>


      {/* FINAL CTA */}
      <section className="py-24 px-6 bg-black/40 text-center">
        <h2 className="text-4xl font-bold mb-6">Serious About Your Results?</h2>
        <a
          className="bg-[#C9A24D] text-black px-8 py-4 rounded-md font-semibold text-lg inline-block hover:opacity-90 transition"
          href="/apply"
        >
          Apply for Coaching
        </a>
      </section>
    </main>
  );
}