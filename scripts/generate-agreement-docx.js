// @ts-check
/**
 * Generates Catalyst_Coaching_Agreement_Branded_Template.docx
 * Uses the docx npm package for a Word-compatible, DocuSign-ready output.
 * Run: node scripts/generate-agreement-docx.js
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel,
  VerticalAlign, PageSize, PageOrientation, convertInchesToTwip,
  Footer, Header,
} = require("docx");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "generated-agreements");
const OUT_FILE = path.join(OUT_DIR, "Catalyst_Coaching_Agreement_Branded_Template.docx");

// Brand colours (hex without #)
const GOLD  = "C9A24D";
const BLACK = "0A0A0A";
const DARK  = "1A1A1A";
const WHITE = "FFFFFF";
const GRAY  = "888888";

// ── Merge fields ──────────────────────────────────────────────────────────
const F = {
  ClientName:        "{{ClientName}}",
  ClientEmail:       "{{ClientEmail}}",
  PackageName:       "{{PackageName}}",
  MonthlyRate:       "${{MonthlyRate}}",
  StartDate:         "{{StartDate}}",
  CRM_ID:            "{{CRM_ID}}",
  Agreement_ID:      "{{Agreement_ID}}",
  Agreement_Version: "{{Agreement_Version}}",
  Generated_Date:    "{{Generated_Date}}",
  ClientSignature:   "{{ClientSignature}}",
  ClientSignedDate:  "{{ClientSignedDate}}",
  CoachSignature:    "{{CoachSignature}}",
  CoachSignedDate:   "{{CoachSignedDate}}",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function noBorder() {
  const s = { style: BorderStyle.NONE, size: 0, color: "auto" };
  return { top: s, bottom: s, left: s, right: s, insideHorizontal: s, insideVertical: s };
}

function goldBorder() {
  const g = { style: BorderStyle.SINGLE, size: 4, color: GOLD };
  const n = { style: BorderStyle.NONE, size: 0, color: "auto" };
  return { top: n, bottom: n, left: g, right: n };
}

function boldRun(text, color = WHITE, size = 16) {
  return new TextRun({ text, bold: true, color, size, font: "Calibri" });
}

function normalRun(text, color = "333333", size = 14) {
  return new TextRun({ text, color, size, font: "Calibri" });
}

function labelValueRow(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}  `, bold: true, color: GRAY, size: 14, font: "Calibri" }),
      new TextRun({ text: value, color: WHITE, size: 14, font: "Calibri" }),
    ],
    spacing: { before: 20, after: 20 },
  });
}

function sectionTitle(num, title) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num} ${title}`, bold: true, color: GOLD, size: 14, font: "Calibri" }),
    ],
    spacing: { before: 80, after: 30 },
  });
}

function sectionBody(text) {
  return new Paragraph({
    children: [normalRun(text, "1C1C1C", 13)],
    spacing: { after: 40 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function sigField(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}  `, bold: true, color: GRAY, size: 14, font: "Calibri" }),
      new TextRun({ text: value, color: WHITE, size: 14, font: "Calibri",
        underline: { type: "single", color: GRAY } }),
    ],
    spacing: { before: 60, after: 40 },
  });
}

// ── Content ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { num: "1.", title: "DEFINITIONS",
    body: '"Coach," "Catalyst Coaching," or "we" refers to Catalyst Coaching LLC. "Client" or "you" refers to the individual signing this Agreement. "Services" refers to the coaching, programming, guidance, and support outlined in Section 2.' },
  { num: "2.", title: "COACHING SERVICES",
    body: "Client receives individualized fitness coaching, exercise programming, nutrition guidance, accountability support, progress reviews, and other related coaching services as described in the selected package." },
  { num: "3.", title: "COACHING TERM",
    body: `This Agreement begins on ${F.StartDate} ("Start Date") and continues on a month-to-month basis. Either party may cancel with fourteen (14) days written notice as outlined in Section 8.` },
  { num: "4.", title: "CLIENT RESPONSIBILITIES",
    body: "Client agrees to provide accurate information, follow recommendations at their own discretion, communicate honestly, and understand that results depend upon effort, consistency, and adherence. Sleep, nutrition, stress management, genetics, and other factors outside Coach's control." },
  { num: "5.", title: "MEDICAL DISCLAIMER",
    body: "Coach is not a physician, dietitian, psychologist, or medical provider. Services are educational and informational in nature and are not intended to diagnose, treat, prevent, or cure any disease or medical condition. Client should consult a qualified healthcare professional before beginning any exercise or nutrition program." },
  { num: "6.", title: "PAYMENT & SUBSCRIPTION TERMS",
    body: "Client authorizes recurring subscription billing through Stripe or another approved payment processor. Coaching renews automatically each billing cycle. Client is responsible for maintaining a valid payment method. Pricing may be updated with thirty (30) days written notice." },
  { num: "7.", title: "MISSED PAYMENT POLICY",
    body: "If payment is not successfully processed, Coach will notify Client via email. If payment remains outstanding for more than 7 days, Coach reserves the right to pause coaching services until payment is received in full. Continued non-payment may result in termination of services." },
  { num: "8.", title: "CANCELLATION POLICY",
    body: "Either party may terminate this agreement with fourteen (14) days written notice. Cancellation does not entitle Client to a refund of previously billed amounts. Services remain active until the end of the notice period." },
  { num: "9.", title: "REFUND POLICY",
    body: "All coaching fees are non-refundable. Due to the immediate delivery of intellectual property, coaching time, program design, support access, and administrative work, no refunds will be issued for partial months, unused services, dissatisfaction, scheduling conflicts, travel, illness, or early termination." },
  { num: "10.", title: "CHARGEBACKS & PAYMENT DISPUTES",
    body: "Client agrees not to initiate a chargeback for services that have been delivered or made available. Catalyst Coaching LLC may provide signed agreements, communication records, and billing records as evidence of service delivery. Client agrees to first attempt good-faith resolution directly with Catalyst Coaching LLC." },
  { num: "11.", title: "COMMUNICATION",
    body: `Primary communication will occur via email (${F.ClientEmail}), the Catalyst Coaching client portal or mobile app (when available), and approved messaging platforms. Coach will make reasonable efforts to respond within normal business hours (Monday–Friday, 9AM–7PM CT). Coaching does not include 24/7 access.` },
  { num: "12.", title: "PROGRESS CONTENT & MARKETING AUTHORIZATION",
    body: "Clients grant Catalyst Coaching LLC permission to use testimonials, progress photos, videos, transformation stories, and related content for marketing purposes only when expressly authorized in writing by the Client." },
  { num: "13.", title: "EMERGENCY CONTACT (OPTIONAL)",
    body: "Name: ________________________  Relationship: ________________________\n\nPhone: ________________________  Email: ________________________" },
  { num: "14.", title: "INTELLECTUAL PROPERTY",
    body: "All programs, content, systems, frameworks, templates, and materials provided by Catalyst Coaching LLC are proprietary and may not be copied, shared, distributed, or resold without express written permission." },
  { num: "15.", title: "ASSUMPTION OF RISK",
    body: "Client acknowledges that fitness and wellness activities carry inherent risks including but not limited to physical injury, strain, or discomfort. Client voluntarily assumes all such risks associated with participation in coaching services." },
  { num: "16.", title: "RELEASE OF LIABILITY",
    body: "Client releases, waives, and discharges Catalyst Coaching LLC, its owner, coaches, affiliates, and assigns from any and all liability, claims, demands, and causes of action arising out of or related to any loss, damage, or injury that may be sustained while participating in coaching services." },
  { num: "17.", title: "LIMITATION OF LIABILITY",
    body: "In no event shall Catalyst Coaching LLC be liable for any indirect, incidental, special, or consequential damages. Total liability shall not exceed the total amount paid by Client in the thirty (30) days preceding any claim." },
  { num: "18.", title: "DISPUTE RESOLUTION",
    body: "The parties agree to first attempt to resolve any dispute through good-faith negotiation. If unresolved within thirty (30) days, disputes shall be submitted to binding arbitration under the rules of the American Arbitration Association." },
  { num: "19.", title: "GOVERNING LAW",
    body: "This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions." },
];

// ── Build document ────────────────────────────────────────────────────────
function buildDocx() {

  // ─ HEADER TABLE: logo + title ──────────────────────────────────────────
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          // Logo cell
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: BLACK },
            verticalAlign: VerticalAlign.CENTER,
            borders: noBorder(),
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "C", bold: true, color: GOLD, size: 40, font: "Calibri" })],
            })],
          }),
          // Title cell
          new TableCell({
            width: { size: 88, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: BLACK },
            verticalAlign: VerticalAlign.CENTER,
            borders: noBorder(),
            children: [
              new Paragraph({
                children: [boldRun("CATALYST COACHING LLC", WHITE, 32)],
                spacing: { before: 80, after: 20 },
              }),
              new Paragraph({
                children: [boldRun("CLIENT COACHING AGREEMENT & LIABILITY WAIVER", GOLD, 16)],
                spacing: { after: 80 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ─ INFO BOXES (2-col table) ────────────────────────────────────────────
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          // Client info
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK },
            borders: goldBorder(),
            children: [
              new Paragraph({ children: [boldRun("CLIENT INFORMATION", GOLD, 14)], spacing: { before: 40, after: 40 } }),
              labelValueRow("Client Name:", F.ClientName),
              labelValueRow("Client Email:", F.ClientEmail),
              labelValueRow("Package / Program:", F.PackageName),
              labelValueRow("Monthly Investment:", F.MonthlyRate),
              labelValueRow("Coaching Start Date:", F.StartDate),
            ],
          }),
          new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, borders: noBorder(), children: [new Paragraph("")] }),
          // Internal record
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK },
            borders: goldBorder(),
            children: [
              new Paragraph({ children: [boldRun("INTERNAL RECORD (FOR ADMIN USE)", GOLD, 14)], spacing: { before: 40, after: 40 } }),
              labelValueRow("CRM ID:", F.CRM_ID),
              labelValueRow("Agreement ID:", F.Agreement_ID),
              labelValueRow("Agreement Version:", F.Agreement_Version),
              labelValueRow("Date Generated:", F.Generated_Date),
            ],
          }),
        ],
      }),
    ],
  });

  // ─ BODY SECTIONS (2-col table) ────────────────────────────────────────
  const leftSections  = SECTIONS.slice(0, 10);
  const rightSections = SECTIONS.slice(10);

  function sectionsToCell(sections) {
    const children = [];
    for (const s of sections) {
      children.push(sectionTitle(s.num, s.title));
      children.push(sectionBody(s.body));
    }
    return children;
  }

  const bodyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 49, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            children: sectionsToCell(leftSections),
          }),
          new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, borders: noBorder(), children: [new Paragraph("")] }),
          new TableCell({
            width: { size: 49, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            children: sectionsToCell(rightSections),
          }),
        ],
      }),
    ],
  });

  // ─ SIGNATURE TABLE ─────────────────────────────────────────────────────
  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        children: [
          // Client sig block
          new TableCell({
            width: { size: 47, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK },
            borders: goldBorder(),
            children: [
              new Paragraph({ children: [boldRun("CLIENT ACKNOWLEDGEMENT", GOLD, 14)], spacing: { before: 40, after: 20 } }),
              new Paragraph({ children: [normalRun("I have read, understand, and agree to all terms in this Agreement.", GRAY, 12)], spacing: { after: 40 } }),
              sigField("Client Signature:", F.ClientSignature),
              sigField("Printed Name:", F.ClientName),
              sigField("Date:", F.ClientSignedDate),
            ],
          }),
          new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: noBorder(),
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "C", bold: true, color: GOLD, size: 48, font: "Calibri" })] })] }),
          // Coach sig block
          new TableCell({
            width: { size: 47, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK },
            borders: goldBorder(),
            children: [
              new Paragraph({ children: [boldRun("CATALYST COACHING REPRESENTATIVE", GOLD, 14)], spacing: { before: 40, after: 20 } }),
              new Paragraph({ children: [normalRun("By signing below, Coach acknowledges this Agreement.", GRAY, 12)], spacing: { after: 40 } }),
              sigField("Coach Signature:", F.CoachSignature),
              sigField("Coach Name:", "Jermaine Jones"),
              sigField("Title:", "Founder & Head Coach"),
              sigField("Date:", F.CoachSignedDate),
            ],
          }),
        ],
      }),
    ],
  });

  // ─ LEGAL NOTICE ────────────────────────────────────────────────────────
  const legalNotice = new Paragraph({
    shading: { type: ShadingType.SOLID, color: DARK },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: "BY SIGNING ABOVE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE LEGALLY BOUND BY THIS AGREEMENT.",
      bold: true, color: GRAY, size: 11, font: "Calibri",
    })],
    spacing: { before: 60, after: 60 },
  });

  // ─ FOOTER PARAGRAPH ────────────────────────────────────────────────────
  const footerPara = new Paragraph({
    shading: { type: ShadingType.SOLID, color: BLACK },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "www.catalystcoachingelite.com", bold: true, color: GOLD, size: 14, font: "Calibri" }),
      new TextRun({ text: "   |   catalyst.coaching.headcoach@gmail.com   |   @catalystcoachingelite", color: GRAY, size: 13, font: "Calibri" }),
    ],
    spacing: { before: 80, after: 80 },
  });

  // ─ Assemble document ───────────────────────────────────────────────────
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
          margin: { top: convertInchesToTwip(0.4), bottom: convertInchesToTwip(0.4),
                    left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
        },
      },
      children: [
        headerTable,
        new Paragraph({ children: [], spacing: { after: 80 } }),
        infoTable,
        new Paragraph({ children: [], spacing: { after: 80 } }),
        bodyTable,
        new Paragraph({ children: [], spacing: { after: 80 } }),
        sigTable,
        legalNotice,
        footerPara,
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

buildDocx()
  .then(buffer => {
    fs.writeFileSync(OUT_FILE, buffer);
    console.log(`✓ DOCX generated: ${OUT_FILE}`);
  })
  .catch(err => {
    console.error("DOCX error:", err);
    process.exit(1);
  });
