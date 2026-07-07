import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// ── DocuSign Connect payload types (JSON format) ───────────────────────────
//
// DocuSign Connect can deliver events as JSON or XML depending on configuration.
// JSON format (preferred) uses "event" at the top level; XML uses DocuSignEnvelopeInformation.
// We parse JSON when the Content-Type includes application/json; otherwise log raw XML.

interface DSConnectSigner {
  name?: string;
  email?: string;
  roleName?: string;
  status?: string;
  recipientId?: string;
}

interface DSConnectPayload {
  event?: string;
  apiVersion?: string;
  generatedDateTime?: string;
  data?: {
    envelopeId?: string;
    accountId?: string;
    envelopeSummary?: {
      status?: string;
      envelopeId?: string;
      recipients?: {
        signers?: DSConnectSigner[];
      };
    };
  };
}

// ── Event → Catalyst status mapping ───────────────────────────────────────

const ENVELOPE_EVENT_STATUS: Record<string, string> = {
  "envelope-sent":      "Agreement Sent",
  "envelope-delivered": "Agreement Delivered",
  "envelope-completed": "Fully Executed",
  "envelope-declined":  "Declined",
  "envelope-voided":    "Voided",
};

function classifyRecipientCompleted(signers: DSConnectSigner[]): string {
  const justCompleted = signers.find(s => s.status === "completed");
  if (!justCompleted) return "Client Signed / Awaiting Coach Finalization";
  const role = (justCompleted.roleName ?? "").toLowerCase();
  if (role === "coach") return "Awaiting Coach Finalization";
  return "Client Signed / Awaiting Coach Finalization";
}

// ── Log helper — structured, no secrets ────────────────────────────────────

function logEvent(
  event: string | undefined,
  envelopeId: string | undefined,
  catalystStatus: string | undefined,
  extra?: Record<string, unknown>,
) {
  console.log(
    "[DocuSign Webhook]",
    JSON.stringify({ event, envelopeId, catalystStatus, ...extra }),
  );
}

// ── HMAC verification ──────────────────────────────────────────────────────
//
// DocuSign Connect HMAC-SHA256:
//   - Secret:  the HMAC secret key configured in DocuSign Connect settings
//   - Input:   exact raw request body bytes (must be read before JSON parsing)
//   - Digest:  base64-encoded HMAC-SHA256
//   - Header:  X-DocuSign-Signature-1 (DocuSign may send multiple numbered headers
//              if multiple HMAC keys are configured; we check the first one)
//
// Reference: https://developers.docusign.com/platform/webhooks/connect/hmac/

function verifyHmac(rawBody: string, secret: string, receivedSig: string): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const computedBuf = Buffer.from(computed);
  const receivedBuf = Buffer.from(receivedSig);

  // timingSafeEqual requires equal-length buffers — unequal length means no match
  if (computedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, receivedBuf);
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Read raw body first — must happen before any req.json() / req.text() call ──
  // The request body stream can only be consumed once. We read it as text here
  // so it is available for both HMAC verification and JSON parsing below.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    console.error("[DocuSign Webhook] Failed to read request body");
    return NextResponse.json({ ok: true });
  }

  // ── Security: HMAC-SHA256 verification ────────────────────────────────────
  const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;

  if (webhookSecret) {
    // DocuSign sends the digest in X-DocuSign-Signature-1.
    // If multiple HMAC keys are configured it also sends -2, -3, etc.
    // We validate against the first one present.
    const candidateHeaders = [
      "x-docusign-signature-1",
      "x-docusign-signature-2",
      "x-docusign-signature-3",
    ];

    // Debug: which signature headers arrived (no values logged)
    const presentHeaders = candidateHeaders.filter(h => req.headers.get(h) !== null);
    console.log("[DocuSign Webhook] Signature headers present:", presentHeaders);

    const receivedSig = req.headers.get("x-docusign-signature-1");
    console.log("[DocuSign Webhook] x-docusign-signature-1 present:", receivedSig !== null);

    if (!receivedSig) {
      console.warn("[DocuSign Webhook] Unauthorized — X-DocuSign-Signature-1 header missing");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const computed = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody, "utf8")
      .digest("base64");

    // Log lengths only — never log the actual signature values or secret
    console.log("[DocuSign Webhook] Computed signature length:", computed.length);
    console.log("[DocuSign Webhook] Received signature length:", receivedSig.length);

    if (!verifyHmac(rawBody, webhookSecret, receivedSig)) {
      console.warn("[DocuSign Webhook] Unauthorized — HMAC mismatch");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[DocuSign Webhook] DocuSign webhook secret not configured — accepting unauthenticated request");
  }

  // ── Parse body from the already-read raw string ────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";
  let payload: DSConnectPayload | null = null;

  if (contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawBody) as DSConnectPayload;
    } catch {
      console.error("[DocuSign Webhook] Failed to parse JSON body");
      return NextResponse.json({ ok: true }); // ack to prevent DocuSign retries
    }
  } else {
    // XML or unknown format — log truncated raw text for debugging
    console.log("[DocuSign Webhook] Non-JSON body received (XML?):", rawBody.slice(0, 500));
    return NextResponse.json({ ok: true });
  }

  // ── Identify event ─────────────────────────────────────────────────────────
  const event      = payload?.event;
  const envelopeId = payload?.data?.envelopeId
    ?? payload?.data?.envelopeSummary?.envelopeId;
  const signers    = payload?.data?.envelopeSummary?.recipients?.signers ?? [];

  // ── Map event to Catalyst status ───────────────────────────────────────────
  let catalystStatus: string | undefined;

  if (event === "recipient-completed") {
    catalystStatus = classifyRecipientCompleted(signers);
  } else if (event !== undefined) {
    catalystStatus = ENVELOPE_EVENT_STATUS[event];
  }

  logEvent(event, envelopeId, catalystStatus, {
    accountId:         payload?.data?.accountId,
    generatedDateTime: payload?.generatedDateTime,
    signerCount:       signers.length,
  });

  // ── Per-event handling ─────────────────────────────────────────────────────

  if (event === "envelope-sent") {
    // Catalyst status: Agreement Sent
    // TODO: Future — update agreement status in CRM/database to "sent" for envelopeId
    console.log("[DocuSign Webhook] envelope-sent:", { envelopeId });
  }

  else if (event === "envelope-delivered") {
    // Catalyst status: Agreement Delivered (all parties have received it)
    // TODO: Future — update agreement status in CRM/database to "delivered" for envelopeId
    console.log("[DocuSign Webhook] envelope-delivered:", { envelopeId });
  }

  else if (event === "recipient-completed") {
    // Catalyst status depends on which role completed
    //   Client completes first → "Client Signed / Awaiting Coach Finalization"
    //   Coach completes → "Awaiting Coach Finalization" (edge: happens before envelope-completed)
    // TODO: Future — update agreement status in CRM/database for envelopeId based on catalystStatus
    // TODO: Future — if role === "Coach", trigger coach-finalizing flow
    console.log("[DocuSign Webhook] recipient-completed:", { envelopeId, catalystStatus, signers: signers.map(s => ({ roleName: s.roleName, status: s.status })) });
  }

  else if (event === "envelope-completed") {
    // Catalyst status: Fully Executed — both parties have signed
    // TODO: Future — update agreement status in CRM/database to "fully_executed" for envelopeId
    // TODO: Future — trigger Stripe Checkout session or payment link for the client
    // TODO: Future — email payment link to client after envelope-completed
    // TODO: Future — create client onboarding tasks in task management system
    // TODO: Future — attach signed PDF copy to client folder in Google Drive
    console.log("[DocuSign Webhook] envelope-completed (fully executed):", { envelopeId });
  }

  else if (event === "envelope-declined") {
    // Catalyst status: Declined — a recipient declined to sign
    // TODO: Future — update agreement status in CRM/database to "declined" for envelopeId
    // TODO: Future — notify coach to follow up with client
    console.log("[DocuSign Webhook] envelope-declined:", { envelopeId });
  }

  else if (event === "envelope-voided") {
    // Catalyst status: Voided — envelope was voided (by sender or admin)
    // TODO: Future — update agreement status in CRM/database to "voided" for envelopeId
    // TODO: Future — notify coach that agreement was voided
    console.log("[DocuSign Webhook] envelope-voided:", { envelopeId });
  }

  else {
    // Unrecognized event — log and ack to prevent DocuSign retries
    console.log("[DocuSign Webhook] Unrecognized event — ignoring:", { event, envelopeId });
  }

  // Always respond quickly so DocuSign does not retry
  return NextResponse.json({ ok: true });
}
