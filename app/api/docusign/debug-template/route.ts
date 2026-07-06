// TEMPORARY DEBUG ROUTE — remove before production hardening.
// Fetches the configured DocuSign template and returns all recipient tabs
// so field labels (tabLabel / dataLabel) can be inspected against the template editor.

import crypto from "crypto";
import { NextResponse } from "next/server";

// ── JWT auth helpers (self-contained copy — do not import from send-agreement) ──

function b64url(buf: Buffer): string {
  return buf.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildJWT(
  integrationKey: string,
  userId: string,
  audience: string,
  privateKeyPem: string,
): string {
  const header  = b64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const now     = Math.floor(Date.now() / 1000);
  const payload = b64url(Buffer.from(JSON.stringify({
    iss:   integrationKey,
    sub:   userId,
    aud:   audience,
    iat:   now,
    exp:   now + 3600,
    scope: "signature impersonation",
  })));
  const signingInput = `${header}.${payload}`;
  const signer       = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const sig = b64url(signer.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }));
  return `${signingInput}.${sig}`;
}

async function fetchAccessToken(jwt: string, authBase: string): Promise<string> {
  const res = await fetch(`https://${authBase}/oauth/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "(no body)");
    throw new Error(`Auth failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

// ── DocuSign tab shape (partial — only fields we care about) ───────────────

interface DSTab {
  tabId?: string;
  tabLabel?: string;
  dataLabel?: string;
  required?: string | boolean;
  tabType?: string;
  [key: string]: unknown;
}

interface DSRecipient {
  roleName?: string;
  recipientId?: string;
  name?: string;
  email?: string;
  tabs?: Record<string, DSTab[]>;
}

interface DSTemplate {
  templateId?: string;
  name?: string;
  recipients?: {
    signers?: DSRecipient[];
    [key: string]: unknown;
  };
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET() {
  const {
    DOCUSIGN_INTEGRATION_KEY: integrationKey,
    DOCUSIGN_USER_ID:         userId,
    DOCUSIGN_ACCOUNT_ID:      accountId,
    DOCUSIGN_PRIVATE_KEY:     privateKeyRaw,
    DOCUSIGN_TEMPLATE_ID:     templateId,
    DOCUSIGN_BASE_PATH:       basePath,
  } = process.env;

  if (!integrationKey || !userId || !accountId || !privateKeyRaw || !templateId) {
    return NextResponse.json(
      { ok: false, error: "DocuSign env vars not fully configured" },
      { status: 500 },
    );
  }

  const apiBase  = basePath ?? "demo.docusign.net";
  const authBase = apiBase === "www.docusign.net"
    ? "account.docusign.com"
    : "account-d.docusign.com";

  const privateKeyPem = privateKeyRaw.replace(/\\n/g, "\n");

  let accessToken: string;
  try {
    const jwt  = buildJWT(integrationKey, userId, authBase, privateKeyPem);
    accessToken = await fetchAccessToken(jwt, authBase);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }

  // Fetch template — include=tabs ensures tab definitions are returned
  const url = `https://${apiBase}/restapi/v2.1/accounts/${accountId}/templates/${templateId}?include=tabs`;
  const templateRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!templateRes.ok) {
    const detail = await templateRes.text().catch(() => "(no body)");
    return NextResponse.json(
      { ok: false, error: `Template fetch failed (${templateRes.status})`, detail },
      { status: 500 },
    );
  }

  const template = (await templateRes.json()) as DSTemplate;

  // Flatten all tab arrays from all signers into a single inspectable list
  const TAB_ARRAY_KEYS = [
    "textTabs", "signHereTabs", "dateSignedTabs", "fullNameTabs",
    "emailTabs", "titleTabs", "noteTabs", "checkboxTabs",
    "radioGroupTabs", "listTabs", "numberTabs", "formulaTabs",
    "initialHereTabs", "declineTabs", "approveTabs",
  ];

  const recipients = template.recipients?.signers ?? [];
  const tabsByRecipient = recipients.map((r) => {
    const allTabs: object[] = [];
    for (const key of TAB_ARRAY_KEYS) {
      const arr = r.tabs?.[key] ?? [];
      for (const t of arr) {
        allTabs.push({
          tabType:       key,
          recipientRole: r.roleName ?? null,
          tabId:         t.tabId    ?? null,
          tabLabel:      t.tabLabel ?? null,
          dataLabel:     t.dataLabel ?? null,
          required:      t.required  ?? null,
        });
      }
    }
    return {
      roleName:    r.roleName    ?? null,
      recipientId: r.recipientId ?? null,
      name:        r.name        ?? null,
      email:       r.email       ?? null,
      tabs:        allTabs,
    };
  });

  return NextResponse.json({
    ok:         true,
    templateId: template.templateId,
    name:       template.name,
    recipients: tabsByRecipient,
  });
}
