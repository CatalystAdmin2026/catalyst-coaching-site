import Image from "next/image";

export default function ThankYouPage() {
  return (
    <main className="min-h-screen text-white bg-gradient-to-b from-[#1F2326] via-[#141618] to-[#0B0B0B]">
      <header className="max-w-6xl mx-auto px-6 pt-10">
        <div className="flex items-center justify-center gap-3">
          <Image src="/logos/mark-gold.png" alt="Catalyst Coaching" width={26} height={26} priority />
          <span className="tracking-[0.35em] text-sm font-semibold text-gray-200">
            CATALYST COACHING
          </span>
        </div>
        <div className="mt-6 h-px w-full bg-[#C9A24D]/70" />
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-24 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-wide">
          Application Received
        </h1>
        <p className="mt-6 text-gray-300">
          Thanks for applying to Catalyst Coaching. If it’s a fit, we’ll contact you with next steps shortly.
        </p>

        <div className="mt-12">
          <a
            href="/"
            className="inline-block bg-[#C9A24D] text-black px-8 py-3 rounded-sm font-semibold hover:opacity-90 transition"
          >
            Back to Home
          </a>
        </div>
      </section>
    </main>
  );
}
