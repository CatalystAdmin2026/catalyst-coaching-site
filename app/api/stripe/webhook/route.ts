// ─────────────────────────────────────────────────────────────
// Stripe Webhook Handler — server-only
//
// Registered in Stripe Dashboard under:
//   Developers → Webhooks → Add endpoint
//   URL: https://www.catalystcoachingelite.com/api/stripe/webhook
//   Events: checkout.session.completed, customer.subscription.*,
//           invoice.paid, invoice.payment_failed
//
// Local testing:
//   stripe listen --forward-to localhost:3000/api/stripe/webhook
//   (requires Stripe CLI — brew install stripe/stripe-cli/stripe)
//
// TODO (Phase 3 — Persistence):
//   Replace console.log calls with writes to a store so the admin
//   dashboard can display real payment history. Candidates:
//     - Supabase table "stripe_events" with RLS
//     - Upstash Redis (append-only log)
//     - Simple JSON file in /data/ (fine for <1000 events)
//   After persistence: map NormalizedStripeEvent fields to Lead
//   pipeline updates in app/admin/page.tsx:
//     checkout.session.completed  → create/update Lead at "Paid" stage
//     subscription.created        → set Lead.stripeStatus = "active"
//     subscription.deleted        → set Lead.stripeStatus = "cancelled"
//     invoice.payment_failed      → set Lead.stripeStatus = "past_due"
// ─────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, normalizeStripeEvent, HANDLED_EVENTS } from "@/lib/stripe";

// Never cache — every webhook POST must be processed fresh
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Read raw body — must be the unmodified bytes Stripe signed
  const rawBody = await req.text();

  // 2. Validate signature header
  const sigHeader = req.headers.get("stripe-signature");
  if (!sigHeader) {
    console.warn("[Stripe Webhook] Request missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  // 3. Validate env config
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(
      "[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — " +
      "add it to .env.local and see env.local.example.",
    );
    return NextResponse.json(
      { error: "Webhook not configured on server" },
      { status: 503 },
    );
  }

  // 4. Verify Stripe signature (prevents spoofed events)
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sigHeader, webhookSecret);
  } catch (err) {
    console.error(
      "[Stripe Webhook] Signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Webhook signature invalid" },
      { status: 400 },
    );
  }

  // 5. Normalize and log
  const normalized = normalizeStripeEvent(event);
  console.log(
    `[Stripe Webhook] ${event.type} — eventId: ${event.id}`,
    "\n  normalized:", JSON.stringify(normalized, null, 2),
  );

  // 6. Handle each event type
  switch (event.type as (typeof HANDLED_EVENTS)[number] | string) {

    case "checkout.session.completed":
      // TODO (Phase 3): Look up lead by customerEmail, advance pipeline
      // stage to "Paid", create a "Send Onboarding Link" task.
      console.log("[Stripe Webhook] checkout.session.completed — TODO: update pipeline");
      break;

    case "customer.subscription.created":
      // TODO (Phase 3): Set Lead.stripeStatus = "active", set nextBilling
      // from current_period_end, set enrolledDate.
      console.log("[Stripe Webhook] subscription.created — TODO: activate lead");
      break;

    case "customer.subscription.updated":
      // TODO (Phase 3): Sync status, plan, and billing date changes.
      // Handle cancellation_at_period_end → warn but don't cancel yet.
      console.log("[Stripe Webhook] subscription.updated — TODO: sync changes");
      break;

    case "customer.subscription.deleted":
      // TODO (Phase 3): Set Lead.stripeStatus = "cancelled",
      // advance pipeline to "Cancelled", create a win-back task.
      console.log("[Stripe Webhook] subscription.deleted — TODO: mark cancelled");
      break;

    case "invoice.paid":
      // TODO (Phase 3): Confirm MRR for this billing period.
      // Clear any "past_due" flag. Log payment timestamp.
      console.log("[Stripe Webhook] invoice.paid — TODO: confirm MRR");
      break;

    case "invoice.payment_failed":
      // TODO (Phase 3): Set Lead.stripeStatus = "past_due".
      // Create an urgent "Payment Issue" task in the admin dashboard.
      // Consider: trigger retry-payment email via Stripe's Smart Retries.
      console.log("[Stripe Webhook] invoice.payment_failed — TODO: flag past_due");
      break;

    default:
      // Log non-handled events without error — Stripe sends many event types
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type} — ignoring`);
      break;
  }

  // Always return 200 so Stripe doesn't retry
  return NextResponse.json({ received: true });
}
