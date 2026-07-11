/**
 * Catalyst Coaching — Drive Workspace Backend
 *
 * Creates a structured Google Drive client workspace on demand.
 * Called from the Next.js Stripe webhook handler after a successful
 * checkout.session.completed event.
 *
 * ─────────────────────────────────────────────────────────────
 * FOLDER STRUCTURE CREATED
 * ─────────────────────────────────────────────────────────────
 *
 *   Catalyst Clients/
 *     └── [currentYear]/
 *         └── [packageType]/          e.g. Standard | Executive Performance | Founding Member | Legacy
 *             └── [ClientName] — Catalyst Coaching/
 *                 ├── 01 - Workouts
 *                 ├── 02 - Nutrition
 *                 ├── 03 - Check-ins
 *                 ├── 04 - Progress Photos
 *                 ├── 05 - Documents
 *                 ├── 06 - Coach Notes
 *                 ├── 07 - Bloodwork
 *                 └── 08 - Progress Reports
 *
 * ─────────────────────────────────────────────────────────────
 * IDEMPOTENCY
 * ─────────────────────────────────────────────────────────────
 *
 *   If a folder named "[ClientName] — Catalyst Coaching" already
 *   exists inside the package folder, the existing folder URL is
 *   returned immediately and no duplicates are created.
 *   The package folder and all subfolders are also reused if they
 *   already exist — nothing is ever created twice.
 *
 * ─────────────────────────────────────────────────────────────
 * TRACKING SHEET
 * ─────────────────────────────────────────────────────────────
 *
 *   Every call (create or reuse) appends one row to a sheet tab
 *   named "Client Workspaces" in the active spreadsheet.
 *   Columns: Timestamp, clientName, clientEmail, packageType,
 *            folderId, folderUrl, createdOrReused
 *
 * ─────────────────────────────────────────────────────────────
 * DEPLOYMENT STEPS
 * ─────────────────────────────────────────────────────────────
 *
 *   1. Open the existing "Catalyst Coaching — Stripe Events" Google
 *      Sheet (or create a new dedicated sheet for Drive workspace
 *      tracking — either works; this script uses the active spreadsheet).
 *
 *   2. From inside that spreadsheet:
 *        Extensions → Apps Script
 *
 *   3. Click the "+" icon next to "Files" to add a NEW script file.
 *      Name it: drive-workspace-backend
 *      (This keeps it separate from the Stripe Events script in the
 *       same Apps Script project, sharing one deployment URL is fine
 *       OR deploy separately — see step 4.)
 *
 *      Alternatively: create a brand-new spreadsheet, paste this
 *      entire file as the only script, and deploy it independently.
 *      This is cleaner if you want separate tracking sheets.
 *
 *   4. Click "Deploy" → "New deployment"
 *      - Click the gear icon → "Web app"
 *      - Description:    Drive Workspace Handler (v1)
 *      - Execute as:     Me
 *      - Who has access: Anyone
 *      Click "Deploy" → copy the /exec URL.
 *
 *   5. Add the URL to your environment:
 *      Local:      SHEETS_DRIVE_GAS_URL=https://script.google.com/macros/s/.../exec
 *      Production: Add to Vercel → Project → Settings → Environment Variables
 *
 *   6. (Optional) The "Catalyst Clients" root Drive folder will be
 *      created automatically on the first call if it does not exist.
 *      If you want it in a specific location (e.g. inside a Shared
 *      Drive), create the root folder manually first and paste its
 *      folder ID into ROOT_FOLDER_NAME config below or use
 *      DriveApp.getFolderById("your-id") instead.
 *
 * ─────────────────────────────────────────────────────────────
 * SECURITY NOTE
 * ─────────────────────────────────────────────────────────────
 *
 *   This endpoint is protected by URL obscurity only.
 *   The Next.js Stripe webhook verifies the Stripe signature before
 *   calling this script, so only valid Stripe events reach it.
 *   For an additional layer, add a shared secret in the POST body
 *   (see WRITE_SECRET comment below).
 */

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

/** Display name of the root client folder in Drive. */
var ROOT_FOLDER_NAME = "Catalyst Clients";

/** Suffix appended to every client folder name. */
var CLIENT_FOLDER_SUFFIX = "— Catalyst Coaching";

/** Sheet tab that tracks every workspace creation. */
var TRACKING_SHEET_NAME = "Client Workspaces";

/** Ordered list of subfolders to create inside each client folder. */
var SUBFOLDERS = [
  "01 - Workouts",
  "02 - Nutrition",
  "03 - Check-ins",
  "04 - Progress Photos",
  "05 - Documents",
  "06 - Coach Notes",
  "07 - Bloodwork",
  "08 - Progress Reports",
];

var TRACKING_HEADERS = [
  "Timestamp",
  "clientName",
  "clientEmail",
  "packageType",
  "folderId",
  "folderUrl",
  "createdOrReused",
];

// Optional: set a shared secret here and check it in doPost for extra security.
// Leave as "" to skip the check (rely on URL obscurity + Stripe signature upstream).
// var WRITE_SECRET = "";


// ─────────────────────────────────────────────────────────────
// doPost — called by Next.js Stripe webhook handler
// ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var clientName  = (data.clientName  || "").trim();
    var clientEmail = (data.clientEmail || "").trim();
    var packageType = (data.packageType || "").trim();

    if (!clientName || !clientEmail) {
      return jsonOut({ ok: false, error: "clientName and clientEmail are required" });
    }

    var currentYear = String(new Date().getFullYear());

    // 1. Find or create root: "Catalyst Clients"
    var rootFolder = findOrCreateFolder(ROOT_FOLDER_NAME, null);

    // 2. Find or create year subfolder: e.g. "2026", "2027"
    var yearFolder = findOrCreateFolder(currentYear, rootFolder);

    // 3. Find or create package subfolder: "Standard", "Executive Performance", etc.
    //    Falls back to "Unknown Package" if packageType is blank/unrecognised.
    var packageFolderName = packageType || "Unknown Package";
    var packageFolder     = findOrCreateFolder(packageFolderName, yearFolder);

    // 4. Determine client folder name
    var clientFolderName = clientName + " " + CLIENT_FOLDER_SUFFIX;

    // 5. Idempotency — check whether client folder already exists inside the package folder
    var existingFolders = packageFolder.getFoldersByName(clientFolderName);
    var clientFolder;
    var createdOrReused;

    if (existingFolders.hasNext()) {
      clientFolder    = existingFolders.next();
      createdOrReused = "reused";
    } else {
      clientFolder    = packageFolder.createFolder(clientFolderName);
      createdOrReused = "created";
    }

    // 6. Find or create each subfolder inside the client folder (idempotent)
    for (var i = 0; i < SUBFOLDERS.length; i++) {
      findOrCreateFolder(SUBFOLDERS[i], clientFolder);
    }

    var folderId  = clientFolder.getId();
    var folderUrl = clientFolder.getUrl();

    // 7. Append tracking row to the active spreadsheet
    appendTrackingRow(clientName, clientEmail, packageType, folderId, folderUrl, createdOrReused);

    return jsonOut({
      ok:             true,
      folderId:       folderId,
      folderUrl:      folderUrl,
      createdOrReused: createdOrReused,
    });

  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}


// ─────────────────────────────────────────────────────────────
// doGet — health check
// ─────────────────────────────────────────────────────────────

function doGet() {
  return jsonOut({
    status:    "ok",
    message:   "Catalyst Coaching Drive Workspace API is live.",
    timestamp: new Date().toISOString(),
  });
}


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Returns an existing folder by name inside parent, or creates it.
 * Pass null for parent to search/create at the Drive root level.
 */
function findOrCreateFolder(name, parent) {
  var iter = parent
    ? parent.getFoldersByName(name)
    : DriveApp.getFoldersByName(name);

  if (iter.hasNext()) return iter.next();

  return parent
    ? parent.createFolder(name)
    : DriveApp.createFolder(name);
}

/** Appends one row to the Client Workspaces tracking tab. */
function appendTrackingRow(clientName, clientEmail, packageType, folderId, folderUrl, createdOrReused) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TRACKING_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(TRACKING_SHEET_NAME);
    sheet.appendRow(TRACKING_HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, TRACKING_HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1a1a1a");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    clientName,
    clientEmail,
    packageType,
    folderId,
    folderUrl,
    createdOrReused,
  ]);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
