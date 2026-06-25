export const STRIPE_LINKS = {
  standard:       "https://buy.stripe.com/9B66oJcjA5MM7LX3S12wU00",
  foundingMember: "https://buy.stripe.com/eVq4gB5Vc0ss3vH1JT2wU01",
  legacy:         "https://buy.stripe.com/00w00l0ASeji2rDfAJ2wU02",
  executive:      "https://buy.stripe.com/7sY9AVdnE4II5DP3S12wU03",
} as const;

export const STANDARD_INCLUDES = [
  "Custom training program",
  "Nutrition guidance",
  "Weekly check-ins",
  "Progress tracking",
  "Habit goals",
  "Accountability coaching",
  "Direct coach support",
] as const;

export const EXECUTIVE_INCLUDES = [
  "Priority concierge support",
  "Unlimited messaging",
  "Registered Dietitian-designed nutrition",
  "Unlimited program updates",
  "Weekly InBody reviews",
  "Bloodwork analysis & optimization",
  "Quarterly Executive Strategy Sessions",
  "Travel nutrition planning",
  "Restaurant & dining strategy",
  "Recovery & lifestyle optimization",
  "Personalized supplement protocols",
  "InBody Dial H30 — included upon enrollment",
  "Legacy Circle rewards after 24 consecutive months",
] as const;
