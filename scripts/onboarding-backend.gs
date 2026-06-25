/**
 * Catalyst Coaching — Onboarding Form Backend
 *
 * One endpoint handles both Standard and Executive onboarding submissions.
 * The incoming `packageType` field routes each row to the correct sheet tab.
 *
 * DEPLOYMENT STEPS:
 *   1. Open your Google Sheet in Google Sheets.
 *   2. Extensions → Apps Script.
 *   3. Delete any placeholder code and paste this entire file.
 *   4. Click "Deploy" → "New deployment".
 *   5. Type: Web app
 *   6. Execute as: Me
 *   7. Who has access: Anyone (even anonymous)   ← required for CORS to work
 *   8. Click Deploy → copy the /exec URL.
 *   9. Paste that URL into SCRIPT_URL in:
 *        app/onboarding/page.tsx
 *        app/executive-onboarding/page.tsx
 *
 * SHEET TABS CREATED AUTOMATICALLY:
 *   "Standard Onboarding"   — receives packageType = "standard"
 *   "Executive Onboarding"  — receives packageType = "executive"
 *
 * SCHEMA EVOLUTION:
 *   If a future form version adds new fields, new columns are appended
 *   to the right of the existing headers automatically. No manual updates needed.
 */

var SHEET_STANDARD  = "Standard Onboarding";
var SHEET_EXECUTIVE = "Executive Onboarding";

// ---------------------------------------------------------------------------
// doPost — called by fetch() from the Next.js client pages
// ---------------------------------------------------------------------------

function doPost(e) {
  try {
    var params = e.parameter;

    // Primary detection: the explicit packageType field the pages send.
    // Fallback: derive from form_type in case packageType is missing.
    var pkgType = (params.packageType || "").toLowerCase().trim();
    if (!pkgType) {
      var formType = (params.form_type || "").toLowerCase();
      pkgType = formType.indexOf("executive") !== -1 ? "executive" : "standard";
    }

    var sheetName = pkgType === "executive" ? SHEET_EXECUTIVE : SHEET_STANDARD;
    var sheet     = getOrCreateSheet(sheetName);

    writeRow(sheet, params);

    return jsonResponse({ status: "success" });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ---------------------------------------------------------------------------
// doGet — health-check, also useful to confirm the deployment URL is live
// ---------------------------------------------------------------------------

function doGet(e) {
  return jsonResponse({
    status: "ok",
    message: "Catalyst Coaching Onboarding API is live.",
    timestamp: new Date().toISOString()
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateSheet(name) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function writeRow(sheet, params) {
  // Use a server-side timestamp so all rows have a consistent, trusted time.
  // The client also sends submission_timestamp; we skip it to avoid duplication.
  var timestamp = new Date().toISOString();
  var skipKeys  = ["submission_timestamp"];

  var keys = Object.keys(params).filter(function(k) {
    return skipKeys.indexOf(k) === -1;
  });

  if (sheet.getLastRow() === 0) {
    // ── First submission: write header row then data row ──────────────────
    var headers = ["Timestamp"].concat(keys);
    sheet.appendRow(headers);

    var firstRow = [timestamp].concat(keys.map(function(k) {
      return params[k] !== undefined ? params[k] : "";
    }));
    sheet.appendRow(firstRow);
    return;
  }

  // ── Subsequent submissions ────────────────────────────────────────────────
  var lastCol     = sheet.getLastColumn();
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  var headers     = headerRange.getValues()[0];

  // Extend headers for any new fields that weren't in earlier submissions.
  // This handles schema evolution gracefully without manual spreadsheet edits.
  var newKeys = keys.filter(function(k) {
    return headers.indexOf(k) === -1;
  });

  if (newKeys.length > 0) {
    var updatedHeaders = headers.concat(newKeys);
    sheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
    headers = updatedHeaders;
  }

  // Build row in header order so columns stay aligned across submissions.
  var row = headers.map(function(h) {
    if (h === "Timestamp") return timestamp;
    return params[h] !== undefined ? params[h] : "";
  });

  sheet.appendRow(row);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
