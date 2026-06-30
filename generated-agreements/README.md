# Catalyst Coaching Agreement — Generated Files

## Files in this folder

| File | Description |
|------|-------------|
| `Catalyst_Coaching_Agreement_Branded_Template.pdf` | Print-ready PDF with full black/gold branding. Best for visual review and sending to clients. |
| `Catalyst_Coaching_Agreement_Branded_Template.docx` | Editable Word document. Best for uploading to DocuSign or modifying agreement language. |

---

## How to regenerate

```bash
node scripts/generate-agreement-pdf.js   # regenerate PDF
node scripts/generate-agreement-docx.js  # regenerate DOCX
```

Both scripts live in `catalyst-coaching-site/scripts/` and use:
- `pdfkit` (PDF — precise black/gold layout)
- `docx` (DOCX — Word-compatible, DocuSign-ready)

---

## Merge Fields

These placeholders appear throughout both documents. Replace them at send time (via DocuSign, a CRM, or a mail-merge script).

### Client fields
| Field | Description |
|-------|-------------|
| `{{ClientName}}` | Client full name |
| `{{ClientEmail}}` | Client email address |
| `{{PackageName}}` | Coaching package (e.g. "Standard", "Executive Performance") |
| `{{MonthlyRate}}` | Monthly investment amount (e.g. "300.00") |
| `{{StartDate}}` | Agreement start date |

### Internal / admin fields (not shown to client)
| Field | Description |
|-------|-------------|
| `{{CRM_ID}}` | CRM record identifier |
| `{{Agreement_ID}}` | Unique agreement ID for recordkeeping |
| `{{Agreement_Version}}` | Version number of this template |
| `{{Generated_Date}}` | Date the document was generated |

### Signature fields (map these in DocuSign)
| Field | DocuSign tag type |
|-------|------------------|
| `{{ClientSignature}}` | Signature |
| `{{ClientSignedDate}}` | Date Signed |
| `{{CoachSignature}}` | Signature |
| `{{CoachSignedDate}}` | Date Signed |

---

## Uploading to DocuSign

1. Upload `Catalyst_Coaching_Agreement_Branded_Template.docx` (or `.pdf`) to DocuSign as a new Template.
2. Add two signers: **Client** and **Coach (Jermaine Jones)**.
3. Map the signature fields:
   - `{{ClientSignature}}` → Client signer, Signature tag
   - `{{ClientSignedDate}}` → Client signer, Date Signed tag
   - `{{CoachSignature}}` → Coach signer, Signature tag
   - `{{CoachSignedDate}}` → Coach signer, Date Signed tag
4. Map the text merge fields (`{{ClientName}}`, `{{PackageName}}`, etc.) as DocuSign Text tags or pre-fill data fields.
5. Save as a reusable Template so you can send it per client from the admin dashboard.

---

## Placeholders / things to update before going live

- **Logo**: The `C` circle in the header and signature area is a text approximation. Replace with the actual Catalyst Coaching logo image file when available.
- **Contact info**: Footer shows `www.catalystcoachingelite.com` and `catalyst.coaching.headcoach@gmail.com` — update if these change.
- **Agreement language**: Sections 1–19 are ready-to-use but should be reviewed by a licensed attorney before client use.
- **Emergency Contact (Section 13)**: Currently blank underline fields — can be made into DocuSign Text tags if desired.
- **`{{Agreement_Version}}`**: Update this field each time the agreement language changes materially.

---

## What is NOT in this folder

- No client data — all values are placeholder merge fields.
- No Calendly, Stripe, or webhook code is modified.
- No website pages are affected.
