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
// Persistence (Phase 2B — active):
//   After verifying the Stripe signature and normalizing the event,
//   the normalized payload is POSTed to the Stripe Events GAS script
//   (STRIPE_EVENTS_GAS_URL). The GAS script writes the event to the
//   "Stripe Events" sheet tab. Missing or unavailable GAS URL is
//   non-fatal — the webhook always returns 200 to Stripe.
//
// TODO (Phase 3 — Pipeline automation):
//   Map NormalizedStripeEvent fields to Lead pipeline updates in
//   app/admin/page.tsx after persistence is confirmed working:
//     checkout.session.completed  → advance Lead to "Paid" stage
//     subscription.created        → set Lead.stripeStatus = "active"
//     subscription.deleted        → set Lead.stripeStatus = "cancelled"
//     invoice.payment_failed      → set Lead.stripeStatus = "past_due"
// ─────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, normalizeStripeEvent, toGasPayload, HANDLED_EVENTS } from "@/lib/stripe";
import type { GasStripePayload } from "@/lib/stripe";

// ─────────────────────────────────────────────────────────────
// GAS PERSISTENCE HELPER
// Posts the normalized event to the Stripe Events GAS script.
// Enforces a 3-second timeout so a slow/down GAS endpoint never
// delays the 200 response back to Stripe. All errors are logged
// and swallowed — Stripe must not retry because of GAS issues.
// ─────────────────────────────────────────────────────────────

async function persistToGas(gasUrl: string, payload: GasStripePayload): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(gasUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal:  controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[Stripe Webhook] GAS write HTTP ${res.status} — event not persisted`);
      return;
    }

    const body = await res.json().catch(() => ({})) as {
      ok?: boolean;
      duplicate?: boolean;
      error?: string;
      eventId?: string;
    };

    if (body.duplicate) {
      console.log(`[Stripe Webhook] Duplicate event ignored by GAS: ${payload.rawEventId}`);
    } else if (body.ok) {
      console.log(`[Stripe Webhook] GAS persisted event: ${payload.rawEventId}`);
    } else {
      console.error("[Stripe Webhook] GAS write returned ok:false —", body.error);
    }
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[Stripe Webhook] GAS write timed out after 3s — skipping persistence");
    } else {
      console.error(
        "[Stripe Webhook] GAS write threw:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

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

  // 7. Persist to Google Sheets via GAS (non-blocking, non-fatal)
  const gasUrl = process.env.STRIPE_EVENTS_GAS_URL;
  if (gasUrl) {
    await persistToGas(gasUrl, toGasPayload(normalized));
  } else {
    console.log(
      "[Stripe Webhook] STRIPE_EVENTS_GAS_URL not set — " +
      "event logged to console only. See env.local.example.",
    );
  }

  // Always return 200 so Stripe doesn't retry
  return NextResponse.json({ received: true });
}
