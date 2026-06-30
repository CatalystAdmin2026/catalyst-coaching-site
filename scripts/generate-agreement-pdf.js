// @ts-check
/**
 * Generates Catalyst_Coaching_Agreement_Branded_Template.pdf
 * Uses pdfkit for precise black/gold premium layout.
 * Run: node scripts/generate-agreement-pdf.js
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "generated-agreements");
const OUT_FILE = path.join(OUT_DIR, "Catalyst_Coaching_Agreement_Branded_Template.pdf");

// Brand colours
const BLACK   = "#0A0A0A";
const GOLD    = "#C9A24D";
const DARK_BG = "#1A1A1A";
const WHITE   = "#FFFFFF";
const LIGHT_GRAY = "#F4F4F4";
const MID_GRAY   = "#555555";
const TEXT_DARK  = "#1C1C1C";

const PAGE_W = 612;  // US Letter
const PAGE_H = 792;
const MARGIN = 36;
const BODY_W = PAGE_W - MARGIN * 2;

// ── Merge-field values (template placeholders) ─────────────────────────────
const FIELDS = {
  ClientName:         "{{ClientName}}",
  ClientEmail:        "{{ClientEmail}}",
  PackageName:        "{{PackageName}}",
  MonthlyRate:        "${{MonthlyRate}}",
  StartDate:          "{{StartDate}}",
  CRM_ID:             "{{CRM_ID}}",
  Agreement_ID:       "{{Agreement_ID}}",
  Agreement_Version:  "{{Agreement_Version}}",
  Generated_Date:     "{{Generated_Date}}",
  ClientSignature:    "{{ClientSignature}}",
  ClientSignedDate:   "{{ClientSignedDate}}",
  CoachSignature:     "{{CoachSignature}}",
  CoachSignedDate:    "{{CoachSignedDate}}",
};

// ── Agreement sections content ─────────────────────────────────────────────
const SECTIONS = [
  {
    num: "1.", title: "DEFINITIONS",
    body: '"Coach," "Catalyst Coaching," or "we" refers to Catalyst Coaching LLC. "Client" or "you" refers to the individual signing this Agreement. "Services" refers to the coaching, programming, guidance, and support outlined in Section 2.',
  },
  {
    num: "2.", title: "COACHING SERVICES",
    body: "Either party may terminate this agreement with fourteen (14) days written notice. Client receives individualized fitness coaching, exercise programming, nutrition guidance, accountability support, progress reviews, and other related coaching services as described in the selected package.",
  },
  {
    num: "3.", title: "COACHING TERM",
    body: "This Agreement begins on {{StartDate}} (\"Start Date\") and continues on a month-to-month basis. Either party may cancel with fourteen (14) days written notice as outlined in Section 8.",
  },
  {
    num: "4.", title: "CLIENT RESPONSIBILITIES",
    body: "Client agrees to provide accurate information, follow recommendations at their own discretion, communicate honestly, and understand that results depend upon effort, consistency, adherence. Sleep, nutrition, stress management, genetics, and other factors outside Coach's control.",
  },
  {
    num: "5.", title: "MEDICAL DISCLAIMER",
    body: "Coach is not a physician, dietitian, psychologist, or medical provider. Services are educational and informational in nature and are not intended to diagnose, treat, prevent, or cure any disease or medical condition. Client should consult a qualified healthcare professional before beginning any exercise or nutrition program.",
  },
  {
    num: "6.", title: "PAYMENT & SUBSCRIPTION TERMS",
    body: "• Client authorizes recurring subscription billing through Stripe or another approved payment processor.\n• Client otherwise agrees in writing; coaching renews automatically each billing cycle.\n• Client is responsible for maintaining a valid payment method.\n• Pricing may be updated with thirty (30) days written notice.",
  },
  {
    num: "7.", title: "MISSED PAYMENT POLICY",
    body: "If payment is not successfully processed, Coach will notify Client via email. If payment remains outstanding for more than 7 days, Coach reserves the right to pause coaching services until payment is received in full. Continued non-payment may result in termination of services as outlined in Section 8.",
  },
  {
    num: "8.", title: "CANCELLATION POLICY",
    body: "Either party may terminate this agreement with fourteen (14) days written notice. Cancellation does not entitle Client to a refund of previously billed amounts. Services remain active until the end of the notice period.",
  },
  {
    num: "9.", title: "REFUND POLICY",
    body: "All coaching fees are non-refundable. Due to the immediate delivery of intellectual property, coaching time, program design, support access, and administrative work, no refunds will be issued for partial months, unused services, dissatisfaction, scheduling conflicts, travel, illness, or early termination.",
  },
  {
    num: "10.", title: "CHARGEBACKS & PAYMENT DISPUTES",
    body: "Client agrees not to initiate a chargeback for services that have been delivered or made available. If a refund is requested in the event of a payment dispute or chargeback, Catalyst Coaching LLC may provide signed agreements, communication records, program materials, progress reports, onboarding documents, and billing records as evidence of service delivery. Client agrees to first attempt good-faith resolution directly with Catalyst Coaching LLC.",
  },
  {
    num: "11.", title: "COMMUNICATION",
    body: "Primary communication will occur via email ({{ClientEmail}}), the Catalyst Coaching client portal or mobile app (when available), and approved messaging platforms. Scheduled video calls or check-ins may be used for check-ins. Coach will make reasonable efforts to respond within normal business hours (Monday–Friday, 9AM–7PM CT). Response times may vary due to weekends, holidays, travel, emergencies, or workload. Coaching does not include 24/7 access.",
  },
  {
    num: "12.", title: "PROGRESS CONTENT & MARKETING AUTHORIZATION",
    body: "Clients grant Catalyst Coaching LLC permission to use testimonials, progress photos, videos, transformation stories, and related content for marketing purposes only when expressly authorized in writing by the Client.",
  },
  {
    num: "13.", title: "EMERGENCY CONTACT (OPTIONAL)",
    body: "Name: ________________________  Relationship: ________________________\n\nPhone: ________________________  Email: ________________________",
  },
  {
    num: "14.", title: "INTELLECTUAL PROPERTY",
    body: "All programs, content, systems, frameworks, templates, and materials provided by Catalyst Coaching LLC are proprietary and may not be copied, shared, distributed, or resold without express written permission.",
  },
  {
    num: "15.", title: "ASSUMPTION OF RISK",
    body: "Client acknowledges that fitness and wellness activities carry inherent risks including but not limited to physical injury, strain, or discomfort. Client voluntarily assumes all such risks associated with participation in coaching services.",
  },
  {
    num: "16.", title: "RELEASE OF LIABILITY",
    body: "Client releases, waives, and discharges Catalyst Coaching LLC, its owner, coaches, affiliates, and assigns from any and all liability, claims, demands, and causes of action arising out of or related to any loss, damage, or injury that may be sustained while participating in coaching services.",
  },
  {
    num: "17.", title: "LIMITATION OF LIABILITY",
    body: "In no event shall Catalyst Coaching LLC be liable for any indirect, incidental, special, or consequential damages. Total liability shall not exceed the total amount paid by Client in the thirty (30) days preceding any claim.",
  },
  {
    num: "18.", title: "DISPUTE RESOLUTION",
    body: "The parties agree to first attempt to resolve any dispute through good-faith negotiation. If unresolved within thirty (30) days, disputes shall be submitted to binding arbitration under the rules of the American Arbitration Association.",
  },
  {
    num: "19.", title: "GOVERNING LAW",
    body: "This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions.",
  },
];

// ──────────────────────────────────────────────────────────────────────────
// HELPER: draw gold "C" circle logo
// ──────────────────────────────────────────────────────────────────────────
function drawCLogo(doc, cx, cy, r, fontSize = 14) {
  doc.save();
  doc.circle(cx, cy, r).fillAndStroke(GOLD, GOLD);
  doc.fillColor(BLACK).fontSize(fontSize).font("Helvetica-Bold");
  const label = "C";
  const tw = doc.widthOfString(label);
  doc.text(label, cx - tw / 2, cy - fontSize * 0.4, { lineBreak: false });
  doc.restore();
}

// ──────────────────────────────────────────────────────────────────────────
// HELPER: small icon strip (text approximation)
// ──────────────────────────────────────────────────────────────────────────
function drawIconStrip(doc, y) {
  const icons = [
    { symbol: "⊙", label: "INDIVIDUALIZED\nCOACHING" },
    { symbol: "◈", label: "PROGRESS\nDRIVEN" },
    { symbol: "◎", label: "ACCOUNTABILITY\nFOCUSED" },
    { symbol: "★", label: "RESULTS\nFOCUSED" },
  ];
  const colW = BODY_W / icons.length;
  icons.forEach((ic, i) => {
    const x = MARGIN + i * colW + colW / 2;
    doc.fillColor(GOLD).fontSize(10).font("Helvetica-Bold")
       .text(ic.symbol, x - 8, y, { lineBreak: false });
    doc.fillColor(WHITE).fontSize(6).font("Helvetica")
       .text(ic.label, x - 30, y + 13, { width: 60, align: "center" });
  });
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────
function generate() {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: "Catalyst Coaching Client Agreement",
      Author: "Catalyst Coaching LLC",
    },
  });

  const stream = fs.createWriteStream(OUT_FILE);
  doc.pipe(stream);

  // ── HEADER (black background) ─────────────────────────────────────────
  const HEADER_H = 110;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(BLACK);

  // Gold top rule
  doc.rect(0, 0, PAGE_W, 3).fill(GOLD);

  // C logo circle
  drawCLogo(doc, MARGIN + 22, 44, 18, 15);

  // Company name
  doc.fillColor(WHITE).fontSize(20).font("Helvetica-Bold")
     .text("CATALYST COACHING LLC", MARGIN + 50, 22, { lineBreak: false });

  // Subtitle
  doc.fillColor(GOLD).fontSize(9).font("Helvetica")
     .text("CLIENT COACHING AGREEMENT & LIABILITY WAIVER", MARGIN + 50, 46, { lineBreak: false });

  // Gold rule under title
  doc.rect(MARGIN + 50, 59, PAGE_W - MARGIN - 50 - MARGIN, 0.75).fill(GOLD);

  // Icon strip
  drawIconStrip(doc, 68);

  // Gold bottom rule on header
  doc.rect(0, HEADER_H - 2, PAGE_W, 2).fill(GOLD);

  // ── INFO BOXES ────────────────────────────────────────────────────────
  const BOX_Y = HEADER_H + 8;
  const BOX_H = 80;
  const BOX_GAP = 8;
  const BOX_W = (BODY_W - BOX_GAP) / 2;

  // Client Information box
  doc.rect(MARGIN, BOX_Y, BOX_W, BOX_H).fill(DARK_BG);
  doc.rect(MARGIN, BOX_Y, 2.5, BOX_H).fill(GOLD); // gold left accent
  doc.fillColor(GOLD).fontSize(6.5).font("Helvetica-Bold")
     .text("CLIENT INFORMATION", MARGIN + 8, BOX_Y + 5);
  const clientRows = [
    ["Client Name:",    FIELDS.ClientName],
    ["Client Email:",   FIELDS.ClientEmail],
    ["Package / Program:", FIELDS.PackageName],
    ["Monthly Investment:", FIELDS.MonthlyRate],
    ["Coaching Start Date:", FIELDS.StartDate],
  ];
  clientRows.forEach(([label, val], i) => {
    const ry = BOX_Y + 15 + i * 12;
    doc.fillColor(MID_GRAY).fontSize(6).font("Helvetica-Bold").text(label, MARGIN + 8, ry, { lineBreak: false });
    doc.fillColor(WHITE).fontSize(6).font("Helvetica").text(val, MARGIN + 8 + 90, ry, { lineBreak: false });
  });

  // Internal record box
  const IBX = MARGIN + BOX_W + BOX_GAP;
  doc.rect(IBX, BOX_Y, BOX_W, BOX_H).fill(DARK_BG);
  doc.rect(IBX, BOX_Y, 2.5, BOX_H).fill(GOLD);
  doc.fillColor(GOLD).fontSize(6.5).font("Helvetica-Bold")
     .text("INTERNAL RECORD (FOR ADMIN USE)", IBX + 8, BOX_Y + 5);
  const adminRows = [
    ["CRM ID:",              FIELDS.CRM_ID],
    ["Agreement ID:",        FIELDS.Agreement_ID],
    ["Agreement Version:",   FIELDS.Agreement_Version],
    ["Date Generated:",      FIELDS.Generated_Date],
  ];
  adminRows.forEach(([label, val], i) => {
    const ry = BOX_Y + 15 + i * 12;
    doc.fillColor(MID_GRAY).fontSize(6).font("Helvetica-Bold").text(label, IBX + 8, ry, { lineBreak: false });
    doc.fillColor(WHITE).fontSize(6).font("Helvetica").text(val, IBX + 8 + 90, ry, { lineBreak: false });
  });

  // ── BODY SECTIONS (two columns) ───────────────────────────────────────
  const BODY_TOP = BOX_Y + BOX_H + 10;
  const COL_GAP = 10;
  const COL_W = (BODY_W - COL_GAP) / 2;
  const COL1_X = MARGIN;
  const COL2_X = MARGIN + COL_W + COL_GAP;

  // Split sections roughly 50/50 by content
  const MID = 10; // sections 1-10 left col, 11-19 right col
  const leftSections  = SECTIONS.slice(0, MID);
  const rightSections = SECTIONS.slice(MID);

  function drawSections(sections, colX, colW, startY) {
    let y = startY;
    for (const sec of sections) {
      if (y > PAGE_H - 120) break; // leave room for signature block
      // Number + Title
      doc.fillColor(GOLD).fontSize(6.5).font("Helvetica-Bold")
         .text(`${sec.num} ${sec.title}`, colX, y, { width: colW, lineBreak: false });
      y += 9;
      // Body
      doc.fillColor(TEXT_DARK).fontSize(6).font("Helvetica")
         .text(sec.body, colX, y, { width: colW, align: "justify" });
      y = doc.y + 5;
    }
    return y;
  }

  drawSections(leftSections,  COL1_X, COL_W, BODY_TOP);
  drawSections(rightSections, COL2_X, COL_W, BODY_TOP);

  // ── GOLD DIVIDER before signature ────────────────────────────────────
  const SIG_TOP = PAGE_H - 148;
  doc.rect(MARGIN, SIG_TOP, BODY_W, 1).fill(GOLD);

  // ── SIGNATURE SECTION ─────────────────────────────────────────────────
  const SIG_BOX_Y = SIG_TOP + 6;
  const SIG_BOX_H = 90;
  const SIG_W = (BODY_W - BOX_GAP) / 2;

  // Client acknowledgement box
  doc.rect(MARGIN, SIG_BOX_Y, SIG_W, SIG_BOX_H).fill(DARK_BG);
  doc.rect(MARGIN, SIG_BOX_Y, 2.5, SIG_BOX_H).fill(GOLD);

  doc.fillColor(GOLD).fontSize(6.5).font("Helvetica-Bold")
     .text("CLIENT ACKNOWLEDGEMENT", MARGIN + 8, SIG_BOX_Y + 5);
  doc.fillColor("#888888").fontSize(5.5).font("Helvetica")
     .text("I have read, understand, and agree to all terms in this Agreement.", MARGIN + 8, SIG_BOX_Y + 14, { width: SIG_W - 16 });

  // Client sig fields
  const sigFields = [
    ["Client Signature:", FIELDS.ClientSignature],
    ["Printed Name:",     FIELDS.ClientName],
    ["Date:",             FIELDS.ClientSignedDate],
  ];
  sigFields.forEach(([label, val], i) => {
    const ry = SIG_BOX_Y + 26 + i * 18;
    doc.fillColor(MID_GRAY).fontSize(6).font("Helvetica-Bold").text(label, MARGIN + 8, ry, { lineBreak: false });
    // Underline for signature
    doc.rect(MARGIN + 8 + 70, ry + 8, SIG_W - 90, 0.5).fill("#555555");
    doc.fillColor("#888888").fontSize(6).font("Helvetica").text(val, MARGIN + 8 + 72, ry + 1, { lineBreak: false });
  });

  // Gold "C" watermark in center
  const CENTER_X = PAGE_W / 2;
  const LOGO_Y = SIG_BOX_Y + SIG_BOX_H / 2;
  drawCLogo(doc, CENTER_X, LOGO_Y, 24, 20);
  doc.fillColor(GOLD).fontSize(5.5).font("Helvetica-Bold")
     .text("CATALYST", CENTER_X - 14, LOGO_Y + 28, { lineBreak: false });
  doc.fillColor(GOLD).fontSize(4).font("Helvetica")
     .text("COACHING LLC", CENTER_X - 13, LOGO_Y + 36, { lineBreak: false });

  // Coach representative box
  const CBX = MARGIN + SIG_W + BOX_GAP;
  doc.rect(CBX, SIG_BOX_Y, SIG_W, SIG_BOX_H).fill(DARK_BG);
  doc.rect(CBX, SIG_BOX_Y, 2.5, SIG_BOX_H).fill(GOLD);

  doc.fillColor(GOLD).fontSize(6.5).font("Helvetica-Bold")
     .text("CATALYST COACHING REPRESENTATIVE", CBX + 8, SIG_BOX_Y + 5);
  doc.fillColor("#888888").fontSize(5.5).font("Helvetica")
     .text("By signing below, Coach acknowledges this Agreement.", CBX + 8, SIG_BOX_Y + 14, { width: SIG_W - 16 });

  const coachFields = [
    ["Coach Signature:", FIELDS.CoachSignature],
    ["Coach Name:",      "Jermaine Jones"],
    ["Title:",           "Founder & Head Coach"],
    ["Date:",            FIELDS.CoachSignedDate],
  ];
  coachFields.forEach(([label, val], i) => {
    const ry = SIG_BOX_Y + 26 + i * 15;
    doc.fillColor(MID_GRAY).fontSize(6).font("Helvetica-Bold").text(label, CBX + 8, ry, { lineBreak: false });
    doc.rect(CBX + 8 + 70, ry + 8, SIG_W - 90, 0.5).fill("#555555");
    doc.fillColor("#888888").fontSize(6).font("Helvetica").text(val, CBX + 8 + 72, ry + 1, { lineBreak: false });
  });

  // ── LEGAL NOTICE BAR ─────────────────────────────────────────────────
  const LEGAL_Y = SIG_BOX_Y + SIG_BOX_H + 4;
  doc.rect(MARGIN, LEGAL_Y, BODY_W, 12).fill("#1A1A1A");
  doc.fillColor("#888888").fontSize(5).font("Helvetica")
     .text(
       "BY SIGNING ABOVE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE LEGALLY BOUND BY THIS AGREEMENT.",
       MARGIN + 4, LEGAL_Y + 3.5, { width: BODY_W - 8, align: "center", lineBreak: false }
     );

  // ── GOLD FOOTER STRIP ────────────────────────────────────────────────
  const FOOTER_Y = PAGE_H - 22;
  doc.rect(0, FOOTER_Y, PAGE_W, 22).fill(BLACK);
  doc.rect(0, FOOTER_Y, PAGE_W, 2).fill(GOLD);

  doc.fillColor(GOLD).fontSize(6).font("Helvetica-Bold")
     .text("www.catalystcoachingelite.com", MARGIN, FOOTER_Y + 8, { lineBreak: false });
  doc.fillColor(MID_GRAY).fontSize(6).font("Helvetica")
     .text("catalyst.coaching.headcoach@gmail.com", PAGE_W / 2 - 65, FOOTER_Y + 8, { lineBreak: false });
  doc.fillColor(GOLD).fontSize(5).font("Helvetica")
     .text("@catalystcoachingelite", PAGE_W - MARGIN - 80, FOOTER_Y + 8, { lineBreak: false });

  doc.end();

  stream.on("finish", () => {
    console.log(`✓ PDF generated: ${OUT_FILE}`);
  });
  stream.on("error", (err) => {
    console.error("PDF error:", err);
    process.exit(1);
  });
}

generate();
