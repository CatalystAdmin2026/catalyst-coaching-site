"use client";

import Script from "next/script";

// Calendly color params: no # prefix, must match site tokens
// background_color → --charcoal (#141618)
// text_color       → --text-base (#f0efeb)
// primary_color    → --gold (#c9a24d)
const CALENDLY_URL =
  "https://calendly.com/catalyst-coaching-headcoach/catalyst-coaching-strategy-call" +
  "?background_color=141618&text_color=f0efeb&primary_color=c9a24d&hide_gdpr_banner=1";

export default function CalendlyEmbed() {
  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <div
        className="calendly-inline-widget w-full border border-white/5"
        data-url={CALENDLY_URL}
        style={{ minWidth: "320px", height: "700px" }}
      />
    </>
  );
}
