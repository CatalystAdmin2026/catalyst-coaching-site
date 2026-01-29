"use client";

import Image from "next/image";
import { useState } from "react";

export default function ApplyPage() {
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget; // ✅ capture immediately (fixes reset() null issue)
    setStatus("Submitting...");

    const formData = new FormData(formEl);

    try {
      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbxf3VInd_v9ZJpIedP0fImdFedh-1xi9oBPA7dRKMATwLupMLdy41OmrRFwnIzYVqXd5w/exec",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Submission failed");
      }

      setStatus("Application submitted! Redirecting...");
      formEl.reset(); // ✅ use captured reference

      setTimeout(() => {
        window.location.href = "/thank-you";
      }, 500);
    } catch (err) {
      console.error("Submission error:", err);
      setStatus("Something went wrong. Please try again.");
    }
  }

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
      <section className="max-w-4xl mx-auto px-6 pt-8 pb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-wide">
          Apply for Coaching
        </h1>
        <p className="mt-3 text-gray-300 max-w-2xl mx-auto">
          Tell us a bit about your goals and schedule. If it’s a fit, we’ll invite
          you to a strategy call.
        </p>
      </section>

      {/* FORM */}
      <section className="max-w-2xl mx-auto px-6 pb-12">
        <div className="bg-black/35 border border-white/10 rounded-lg p-5 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-200 mb-1.5">
                Full Name
              </label>
              <input
                name="name"
                required
                className="w-full rounded-md bg-[#0F1113]/70 border border-white/10 px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A24D]/70"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-200 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-md bg-[#0F1113]/70 border border-white/10 px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A24D]/70"
                placeholder="you@email.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm text-gray-200 mb-1.5">
                Phone (optional)
              </label>
              <input
                name="phone"
                className="w-full rounded-md bg-[#0F1113]/70 border border-white/10 px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A24D]/70"
                placeholder="(555) 555-5555"
              />
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm text-gray-200 mb-1.5">
                Primary Goal
              </label>
              <select
                name="goal"
                defaultValue="Fat loss"
                className="w-full rounded-md bg-[#0F1113]/70 border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:border-[#C9A24D]/70"
              >
                <option>Fat loss</option>
                <option>Muscle gain</option>
                <option>Strength + performance</option>
                <option>Body recomposition</option>
                <option>Other</option>
              </select>
            </div>

            {/* Commitment */}
            <div>
              <label className="block text-sm text-gray-200 mb-1.5">
                Commitment Level
              </label>
              <select
                name="commitment"
                defaultValue="Ready to start now"
                className="w-full rounded-md bg-[#0F1113]/70 border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:border-[#C9A24D]/70"
              >
                <option>Ready to start now</option>
                <option>Starting within 2–4 weeks</option>
                <option>Exploring options</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm text-gray-200 mb-1.5">
                Monthly Budget Range
              </label>
              <select
                name="budget"
                defaultValue="$500–$1,000"
                className="w-full rounded-md bg-[#0F1113]/70 border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:border-[#C9A24D]/70"
              >
                <option>$250–$500</option>
                <option>$500–$1,000</option>
                <option>$1,000+</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-gray-200 mb-1.5">
                Tell us about your goals (and what’s held you back)
              </label>
              <textarea
                name="goals_details"
                rows={4}
                className="w-full rounded-md bg-[#0F1113]/70 border border-white/10 px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A24D]/70"
                placeholder="Share your goals, schedule, and anything we should know."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#C9A24D] text-black px-8 py-3 rounded-sm font-semibold hover:opacity-90 transition"
            >
              Submit Application
            </button>

            {status && (
              <p className="text-sm text-gray-300 text-center pt-1">{status}</p>
            )}

            <p className="text-xs text-gray-400 text-center">
              By submitting, you agree to be contacted about your application.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
