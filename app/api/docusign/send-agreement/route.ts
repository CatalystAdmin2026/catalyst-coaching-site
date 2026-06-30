import { NextRequest, NextResponse } from "next/server";

interface SendAgreementBody {
  clientName: string;
  clientEmail: string;
  packageName: string;
  monthlyRate: string;
  startDate: string;
  crmId?: string;
}

export async function POST(req: NextRequest) {
  let body: SendAgreementBody;
  try {
    body = (await req.json()) as SendAgreementBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const configured = !!(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
    process.env.DOCUSIGN_USER_ID &&
    process.env.DOCUSIGN_ACCOUNT_ID &&
    process.env.DOCUSIGN_TEMPLATE_ID
  );

  if (!configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "DocuSign is not configured yet. Add DocuSign environment variables to .env.local.",
    });
  }

  // Sprint 2A: dry run only — real envelope send arrives in Sprint 2B.
  // Never return secret env var values in the response.
  const payloadPreview = {
    templateId: "[DOCUSIGN_TEMPLATE_ID redacted]",
    basePath: process.env.DOCUSIGN_BASE_PATH ?? "demo.docusign.net",
    signers: [
      { role: "Client", name: body.clientName, email: body.clientEmail },
    ],
    mergeFields: {
      ClientName:     body.clientName,
      ClientEmail:    body.clientEmail,
      PackageName:    body.packageName,
      MonthlyRate:    body.monthlyRate,
      StartDate:      body.startDate,
      CRM_ID:         body.crmId ?? "",
      Generated_Date: new Date().toISOString().split("T")[0],
    },
  };

  return NextResponse.json({
    ok: true,
    configured: true,
    mode: "dry_run",
    message: "DocuSign send-agreement endpoint is ready for real integration",
    payloadPreview,
  });
}
