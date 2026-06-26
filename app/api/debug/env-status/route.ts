import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hasStripeSecretKey:      Boolean(process.env.STRIPE_SECRET_KEY),
    hasStripeWebhookSecret:  Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    hasStripeEventsGasUrl:   Boolean(process.env.STRIPE_EVENTS_GAS_URL),
    nodeEnv:                 process.env.NODE_ENV,
  });
}
