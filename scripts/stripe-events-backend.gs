/**
 * Catalyst Coaching — Stripe Events Backend
 *
 * Receives normalized Stripe event data from the Next.js webhook handler
 * (app/api/stripe/webhook/route.ts) and writes each event as a row in a
 * dedicated "Stripe Events" sheet tab.
 *
 * Also exposes a doGet() handler so the Admin dashboard's Live Sheets tab
 * can read the event log at /admin → Live Sheets (uses STRIPE_EVENTS_GAS_URL).
 *
 * ─────────────────────────────────────────────────────────────
 * WHERE TO CREATE THIS SCRIPT
 * ─────────────────────────────────────────────────────────────
 *
 *   1. Go to https://sheets.google.com and create a new blank spreadsheet.
 *      Name it: "Catalyst Coaching — Stripe Events"
 *
 *   2. From inside that spreadsheet:
 *      Extensions → Apps Script
 *
 *   3. Delete any placeholder code in the editor.
 *      Paste this entire file.
 *
 *   4. Click Save (floppy disk icon or Ctrl+S).
 *
 * ─────────────────────────────────────────────────────────────
 * DEPLOYMENT
 * ─────────────────────────────────────────────────────────────
 *
 *   1. Click "Deploy" → "New deployment"
 *   2. Click the gear icon → "Web app"
 *   3. Set:
 *        Description:    Stripe Events Handler (v1)
 *        Execute as:     Me
 *        Who has access: Anyone
 *   4. Click "Deploy"
 *   5. Copy the /exec URL — it looks like:
 *        https://script.google.com/macros/s/AKfy.../exec
 *
 * ─────────────────────────────────────────────────────────────
 * WHERE TO PUT THE URL
 * ─────────────────────────────────────────────────────────────
 *
 *   Local (.env.local):
 *     STRIPE_EVENTS_GAS_URL=https://script.google.com/macros/s/AKfy.../exec
 *
 *   Production (Vercel Dashboard):
 *     Project → Settings → Environment Variables → Add
 *     Name:  STRIPE_EVENTS_GAS_URL
 *     Value: https://script.google.com/macros/s/AKfy.../exec
 *     Environments: Production, Preview
 *     → Save → Redeploy
 *
 * ─────────────────────────────────────────────────────────────
 * SHEET TAB CREATED AUTOMATICALLY
 * ─────────────────────────────────────────────────────────────
 *
 *   "Stripe Events" — created on first webhook write if it doesn't exist.
 *   Headers are written automatically.
 *
 * ─────────────────────────────────────────────────────────────
 * IDEMPOTENCY
 * ─────────────────────────────────────────────────────────────
 *
 *   Stripe may retry webhooks if your server is temporarily unavailable.
 *   This script checks the rawEventId column before writing — duplicate
 *   events are silently ignored and a { ok: true, duplicate: true }
 *   response is returned so the webhook still returns 200 to Stripe.
 *
 * ─────────────────────────────────────────────────────────────
 * SECURITY NOTE
 * ─────────────────────────────────────────────────────────────
 *
 *   This endpoint is protected only by URL obscurity (the /exec URL is
 *   opaque). The Next.js webhook verifies the Stripe signature BEFORE
 *   calling this script, so only valid Stripe events reach it.
 *
 *   If you want an extra layer: add a GAS_WRITE_SECRET env var in Vercel,
 *   include it in the POST body as `writeKey`, and verify it below.
 */

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

var SHEET_NAME = "Stripe Events";

var HEADERS = [
  "Timestamp",
  "eventType",
  "customerEmail",
  "customerName",
  "customerId",
  "subscriptionId",
  "paymentStatus",
  "subscriptionStatus",
  "amount",
  "currency",
  "productId",
  "priceId",
  "packageName",
  "rawEventId",
];

// Column index (1-based) of rawEventId — used for idempotency checks.
// Must stay in sync with HEADERS above.
var RAW_EVENT_ID_COL = HEADERS.indexOf("rawEventId") + 1;


// ─────────────────────────────────────────────────────────────
// doPost — receives normalized Stripe events from Next.js webhook
// ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss);

    // Idempotency: skip if this eventId was already written
    var rawEventId = data.rawEventId || "";
    if (rawEventId && isDuplicate(sheet, rawEventId)) {
      return jsonOut({ ok: true, duplicate: true, eventId: rawEventId });
    }

    // Convert cents to dollars for readability
    var amountDisplay = "";
    if (data.amountCents !== null && data.amountCents !== undefined) {
      amountDisplay = (data.amountCents / 100).toFixed(2);
    }

    var row = [
      new Date(),                          // Timestamp  (set server-side by GAS)
      data.eventType          || "",
      data.customerEmail      || "",
      data.customerName       || "",
      data.customerId         || "",
      data.subscriptionId     || "",
      data.paymentStatus      || "",
      data.subscriptionStatus || "",
      amountDisplay,
      data.currency           || "",
      data.productId          || "",
      data.priceId            || "",
      data.packageName        || "",
      rawEventId,
    ];

    sheet.appendRow(row);

    return jsonOut({ ok: true, eventId: rawEventId });

  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}


// ─────────────────────────────────────────────────────────────
// doGet — returns Stripe Events rows as JSON for the Live Sheets tab
// Called by /api/sheets/stripe-events in the Next.js proxy.
// ─────────────────────────────────────────────────────────────

function doGet() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet || sheet.getLastRow() < 2) {
      return jsonOut({ ok: true, data: [] });
    }

    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0];
    var data    = rows.slice(1).reverse().map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });

    return jsonOut({ ok: true, data: data });

  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getOrCreateSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Write headers if the sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1a1a1a");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function isDuplicate(sheet, rawEventId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var ids = sheet
    .getRange(2, RAW_EVENT_ID_COL, lastRow - 1, 1)
    .getValues()
    .map(function(r) { return r[0]; });
  return ids.indexOf(rawEventId) !== -1;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
