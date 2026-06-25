"use client";

import { useState, useEffect } from "react";
import AdminGate from "@/components/AdminGate";
import { fetchSheetData, type SheetRow } from "@/lib/sheets";

/* ────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────── */

type PipelineStatus =
  | "Applied"
  | "Strategy Call Booked"
  | "Strategy Call Completed"
  | "Payment Link Sent"
  | "Paid"
  | "Onboarding Started"
  | "Onboarding Complete"
  | "Program In Progress"
  | "Program Delivered"
  | "Active Client"
  | "Paused"
  | "Cancelled";

type Package = "Standard" | "Founding Member" | "Legacy" | "Executive Performance";
type Flag = "Hot Lead" | "Needs Follow-Up" | "Payment Issue" | "Program Overdue" | "At-Risk Client";
type OnboardingStatus = "not_started" | "started" | "complete";
type ProgramStatus = "not_built" | "in_progress" | "delivered" | "active";
type StripeStatus = "active" | "past_due" | "cancelled" | "pending";
type Priority = "urgent" | "high" | "normal" | "low";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  package: Package;
  rate: number;
  stripeStatus: StripeStatus;
  nextBilling: string;
  onboardingStatus: OnboardingStatus;
  agreementSigned: boolean;
  programStatus: ProgramStatus;
  checkInDay: string;
  nextAction: string;
  pipelineStatus: PipelineStatus;
  referralSource: string;
  flags: Flag[];
  enrolledDate: string;
}

interface Task {
  id: number;
  priority: Priority;
  type: string;
  clientName: string;
  description: string;
  due: string;
}

/* ────────────────────────────────────────────────────────────
   CLIENT DATA
   TODO: Replace with live data sources:
     - Google Sheets (onboarding submissions) via Sheets API / Apps Script
     - Stripe (subscriptions, billing) via stripe.customers.list()
     - Internal database or Notion for pipeline notes
──────────────────────────────────────────────────────────── */

const LEADS: Lead[] = [
  {
    id: 1,
    name: "Maggie Eaker",
    email: "—",
    phone: "—",
    package: "Legacy",
    rate: 120,
    stripeStatus: "pending",
    nextBilling: "—",
    onboardingStatus: "not_started",
    agreementSigned: false,
    programStatus: "not_built",
    checkInDay: "—",
    nextAction: "Await Stripe enrollment and onboarding completion",
    pipelineStatus: "Payment Link Sent",
    referralSource: "—",
    flags: [],
    enrolledDate: "—",
  },
  {
    id: 2,
    name: "Emma Gentile",
    email: "—",
    phone: "—",
    package: "Standard",
    rate: 300,
    stripeStatus: "pending",
    nextBilling: "—",
    onboardingStatus: "not_started",
    agreementSigned: false,
    programStatus: "not_built",
    checkInDay: "—",
    nextAction: "Await Stripe enrollment and onboarding completion",
    pipelineStatus: "Payment Link Sent",
    referralSource: "—",
    flags: [],
    enrolledDate: "—",
  },
  {
    id: 3,
    name: "Heather",
    email: "—",
    phone: "—",
    package: "Standard",
    rate: 300,
    stripeStatus: "pending",
    nextBilling: "—",
    onboardingStatus: "not_started",
    agreementSigned: false,
    programStatus: "not_built",
    checkInDay: "—",
    nextAction: "Await Stripe enrollment and onboarding completion",
    pipelineStatus: "Payment Link Sent",
    referralSource: "—",
    flags: [],
    enrolledDate: "—",
  },
  {
    id: 4,
    name: "Melanie",
    email: "—",
    phone: "—",
    package: "Founding Member",
    rate: 150,
    stripeStatus: "pending",
    nextBilling: "—",
    onboardingStatus: "not_started",
    agreementSigned: false,
    programStatus: "not_built",
    checkInDay: "—",
    nextAction: "Follow up regarding Founding Member offer",
    pipelineStatus: "Strategy Call Completed",
    referralSource: "—",
    flags: [],
    enrolledDate: "—",
  },
];

const TASKS: Task[] = [
  { id: 1, priority: "high", type: "Confirm Payment", clientName: "Maggie Eaker",  description: "Payment link sent — confirm Stripe payment received", due: "Today" },
  { id: 2, priority: "high", type: "Confirm Payment", clientName: "Emma Gentile",  description: "Payment link sent — confirm Stripe payment received", due: "Today" },
  { id: 3, priority: "high", type: "Confirm Payment", clientName: "Heather",       description: "Payment link sent — confirm Stripe payment received", due: "Today" },
  { id: 4, priority: "high", type: "Follow Up",       clientName: "Melanie",       description: "Awaiting enrollment decision — follow up regarding Founding Member offer", due: "Today" },
];

/* ────────────────────────────────────────────────────────────
   PIPELINE STAGES (ordered)
──────────────────────────────────────────────────────────── */

const PIPELINE_STAGES: PipelineStatus[] = [
  "Applied",
  "Strategy Call Booked",
  "Strategy Call Completed",
  "Payment Link Sent",
  "Paid",
  "Onboarding Started",
  "Onboarding Complete",
  "Program In Progress",
  "Program Delivered",
  "Active Client",
  "Paused",
  "Cancelled",
];

/* ────────────────────────────────────────────────────────────
   STYLE HELPERS
──────────────────────────────────────────────────────────── */

function pkgCls(p: Package) {
  const m: Record<Package, string> = {
    "Standard":              "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    "Founding Member":       "bg-violet-500/10 text-violet-400 border border-violet-500/20",
    "Legacy":                "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    "Executive Performance": "bg-[#C9A24D]/10 text-[#C9A24D] border border-[#C9A24D]/25",
  };
  return m[p];
}

function pipeCls(s: PipelineStatus) {
  const m: Record<PipelineStatus, string> = {
    "Applied":                 "bg-gray-500/10 text-gray-400 border border-gray-500/20",
    "Strategy Call Booked":    "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    "Strategy Call Completed": "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    "Payment Link Sent":       "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    "Paid":                    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    "Onboarding Started":      "bg-teal-500/10 text-teal-400 border border-teal-500/20",
    "Onboarding Complete":     "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    "Program In Progress":     "bg-violet-500/10 text-violet-400 border border-violet-500/20",
    "Program Delivered":       "bg-lime-500/10 text-lime-400 border border-lime-500/20",
    "Active Client":           "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
    "Paused":                  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    "Cancelled":               "bg-red-500/10 text-red-400 border border-red-500/20",
  };
  return m[s];
}

function pipeBorder(s: PipelineStatus) {
  const m: Record<PipelineStatus, string> = {
    "Applied":                 "border-l-gray-500/50",
    "Strategy Call Booked":    "border-l-sky-500/60",
    "Strategy Call Completed": "border-l-indigo-500/60",
    "Payment Link Sent":       "border-l-amber-500/60",
    "Paid":                    "border-l-emerald-500/60",
    "Onboarding Started":      "border-l-teal-500/60",
    "Onboarding Complete":     "border-l-cyan-500/60",
    "Program In Progress":     "border-l-violet-500/60",
    "Program Delivered":       "border-l-lime-500/60",
    "Active Client":           "border-l-emerald-400/70",
    "Paused":                  "border-l-yellow-500/60",
    "Cancelled":               "border-l-red-500/60",
  };
  return m[s];
}

function stripeCls(s: StripeStatus) {
  const m: Record<StripeStatus, string> = {
    active:   "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    past_due: "bg-red-500/10 text-red-400 border border-red-500/20",
    cancelled:"bg-gray-500/10 text-gray-500 border border-gray-500/20",
    pending:  "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  };
  return m[s];
}

function flagCls(f: Flag) {
  const m: Record<Flag, string> = {
    "Hot Lead":         "bg-orange-500/12 text-orange-400 border border-orange-500/25",
    "Needs Follow-Up":  "bg-yellow-500/12 text-yellow-400 border border-yellow-500/25",
    "Payment Issue":    "bg-red-500/12 text-red-400 border border-red-500/25",
    "Program Overdue":  "bg-orange-500/12 text-orange-300 border border-orange-500/25",
    "At-Risk Client":   "bg-red-500/12 text-red-300 border border-red-500/25",
  };
  return m[f];
}

function priorityDot(p: Priority) {
  return { urgent: "bg-red-500", high: "bg-amber-400", normal: "bg-blue-400", low: "bg-gray-600" }[p];
}

function onboardingCls(s: OnboardingStatus) {
  return { not_started: "text-gray-600", started: "text-amber-400", complete: "text-emerald-400" }[s];
}
function onboardingLabel(s: OnboardingStatus) {
  return { not_started: "Not Started", started: "In Progress", complete: "Complete" }[s];
}
function programCls(s: ProgramStatus) {
  return { not_built: "text-gray-600", in_progress: "text-amber-400", delivered: "text-blue-400", active: "text-emerald-400" }[s];
}
function programLabel(s: ProgramStatus) {
  return { not_built: "Not Built", in_progress: "Building", delivered: "Delivered", active: "Active" }[s];
}

/* ────────────────────────────────────────────────────────────
   COMPUTED METRICS
──────────────────────────────────────────────────────────── */

const activeClients    = LEADS.filter(l => l.pipelineStatus === "Active Client").length;
const confirmedMrr     = LEADS.filter(l => l.stripeStatus === "active").reduce((s, l) => s + l.rate, 0);
const pendingMrr       = LEADS.filter(l => l.stripeStatus === "pending").reduce((s, l) => s + l.rate, 0);
const newApplications  = LEADS.filter(l => l.pipelineStatus === "Applied").length;
const programsDue      = LEADS.filter(l => l.programStatus === "not_built" && l.stripeStatus === "active").length;
const paymentIssues    = LEADS.filter(l => l.stripeStatus === "past_due").length;

const urgentTasks = TASKS.filter(t => t.priority === "urgent").length;

/* ────────────────────────────────────────────────────────────
   SMALL UI ATOMS
──────────────────────────────────────────────────────────── */

function Badge({ cls, text }: { cls: string; text: string }) {
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-semibold tracking-wide whitespace-nowrap ${cls}`}>
      {text}
    </span>
  );
}

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-emerald-400 text-xs">✓</span>
    : <span className="text-gray-600 text-xs">—</span>;
}

/* ────────────────────────────────────────────────────────────
   OVERVIEW TAB
──────────────────────────────────────────────────────────── */

function OverviewTab() {
  const urgent = TASKS.filter(t => t.priority === "urgent" || t.priority === "high");
  const flagged = LEADS.filter(l => l.flags.length > 0);

  // Stage counts
  const stageCounts = PIPELINE_STAGES.map(s => ({
    stage: s,
    count: LEADS.filter(l => l.pipelineStatus === s).length,
  })).filter(s => s.count > 0);

  return (
    <div className="space-y-8">
      {/* Needs attention */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-4">
          Needs Attention Now
        </h3>
        <div className="space-y-2">
          {urgent.map(t => (
            <div key={t.id} className="flex items-start gap-4 bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-white text-sm font-medium">{t.clientName}</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-[#C9A24D] text-xs">{t.type}</span>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{t.description}</p>
              </div>
              <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">{t.due}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged clients */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-4">
          Flagged Clients
        </h3>
        <div className="space-y-2">
          {flagged.map(l => (
            <div key={l.id} className="flex items-center gap-4 bg-[#0d0e0f] border border-white/[0.06] px-4 py-3 flex-wrap">
              <span className="text-white text-sm font-medium w-32 shrink-0">{l.name}</span>
              <Badge cls={pkgCls(l.package)} text={l.package} />
              <div className="flex gap-1.5 flex-wrap">
                {l.flags.map(f => <Badge key={f} cls={flagCls(f)} text={f} />)}
              </div>
              <span className="text-gray-500 text-xs ml-auto">{l.nextAction}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline snapshot */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-4">
          Pipeline Snapshot
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {stageCounts.map(({ stage, count }) => (
            <div key={stage} className={`bg-[#0d0e0f] border-l-2 border border-white/[0.05] px-3 py-3 ${pipeBorder(stage)}`}>
              <p className="text-xl font-bold text-white mb-1">{count}</p>
              <p className="text-[10px] text-gray-600 leading-tight">{stage}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   PIPELINE TAB
──────────────────────────────────────────────────────────── */

function PipelineTab() {
  const populated = PIPELINE_STAGES.filter(s => LEADS.some(l => l.pipelineStatus === s));

  return (
    <div className="space-y-6">
      {populated.map(stage => {
        const leads = LEADS.filter(l => l.pipelineStatus === stage);
        return (
          <div key={stage}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-sm ${pipeCls(stage)}`}>
                {stage}
              </span>
              <span className="text-gray-700 text-xs">{leads.length} {leads.length === 1 ? "lead" : "leads"}</span>
            </div>
            <div className="space-y-2 pl-1">
              {leads.map(l => (
                <div key={l.id}
                  className={`bg-[#0d0e0f] border border-white/[0.05] border-l-2 ${pipeBorder(l.pipelineStatus)} px-4 py-3`}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    {/* Name + package */}
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <span className="text-white font-semibold text-sm">{l.name}</span>
                      <Badge cls={pkgCls(l.package)} text={l.package} />
                    </div>

                    {/* Rate */}
                    <span className="text-[#C9A24D] text-sm font-semibold tabular-nums">
                      ${l.rate.toLocaleString()}/mo
                    </span>

                    {/* Source */}
                    <span className="text-gray-600 text-xs">via {l.referralSource}</span>

                    {/* Flags */}
                    <div className="flex gap-1.5 flex-wrap">
                      {l.flags.map(f => <Badge key={f} cls={flagCls(f)} text={f} />)}
                    </div>

                    {/* Next action */}
                    <p className="text-gray-500 text-xs w-full mt-0.5 leading-relaxed border-t border-white/[0.04] pt-2">
                      <span className="text-gray-700">Next: </span>{l.nextAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   CLIENTS TAB
──────────────────────────────────────────────────────────── */

function ClientsTab() {
  const clients = LEADS;

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="w-full min-w-[1100px] text-xs">
        <thead>
          <tr className="border-b border-white/[0.07]">
            {[
              "Name", "Email", "Phone", "Package", "Rate",
              "Stripe", "Next Billing", "Onboarding", "Agreement",
              "Program", "Check-In", "Next Action",
            ].map(h => (
              <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold tracking-[0.4em] text-gray-700 uppercase whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {clients.map(l => (
            <tr key={l.id} className="hover:bg-white/[0.015] transition-colors">
              <td className="px-3 py-3 text-white font-medium whitespace-nowrap">{l.name}</td>
              <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{l.email}</td>
              <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{l.phone}</td>
              <td className="px-3 py-3 whitespace-nowrap"><Badge cls={pkgCls(l.package)} text={l.package} /></td>
              <td className="px-3 py-3 text-[#C9A24D] font-semibold tabular-nums whitespace-nowrap">${l.rate}/mo</td>
              <td className="px-3 py-3 whitespace-nowrap">
                <Badge cls={stripeCls(l.stripeStatus)} text={l.stripeStatus.replace("_", " ")} />
              </td>
              <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{l.nextBilling}</td>
              <td className={`px-3 py-3 whitespace-nowrap font-medium ${onboardingCls(l.onboardingStatus)}`}>
                {onboardingLabel(l.onboardingStatus)}
              </td>
              <td className="px-3 py-3"><Check ok={l.agreementSigned} /></td>
              <td className={`px-3 py-3 whitespace-nowrap font-medium ${programCls(l.programStatus)}`}>
                {programLabel(l.programStatus)}
              </td>
              <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{l.checkInDay}</td>
              <td className="px-3 py-3 text-gray-500 max-w-[200px]">
                <span className="line-clamp-2 leading-relaxed">{l.nextAction}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   REVENUE TAB
   TODO: Replace mock values with live Stripe data via
         stripe.subscriptions.list() and stripe.customers.list()
──────────────────────────────────────────────────────────── */

function RevenueTab() {
  const confirmed = LEADS.filter(l => l.stripeStatus === "active");
  const pending   = LEADS.filter(l => l.stripeStatus === "pending");
  const avgValue  = confirmed.length ? Math.round(confirmedMrr / confirmed.length) : 0;

  const confirmedBreakdown: { label: string; count: number; amount: number }[] = (
    ["Executive Performance", "Standard", "Founding Member", "Legacy"] as Package[]
  ).map(pkg => ({
    label: pkg,
    count:  confirmed.filter(l => l.package === pkg).length,
    amount: confirmed.filter(l => l.package === pkg).reduce((s, l) => s + l.rate, 0),
  })).filter(r => r.count > 0);

  return (
    <div className="space-y-8">

      {/* ── Confirmed MRR ── */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-4">Confirmed MRR</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label: "Confirmed MRR",        value: `$${confirmedMrr.toLocaleString()}`, gold: true,  warn: false },
            { label: "Active Subscriptions", value: confirmed.length.toString(),          gold: false, warn: false },
            { label: "Failed Payments",      value: paymentIssues.toString(),             gold: false, warn: paymentIssues > 0 },
            { label: "Avg. Client Value",    value: `$${avgValue}/mo`,                   gold: false, warn: false },
          ].map(({ label, value, gold, warn }) => (
            <div key={label} className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-5">
              <p className={`text-3xl font-bold mb-1 tabular-nums ${gold ? "text-[#C9A24D]" : warn ? "text-red-400" : "text-white"}`}>
                {value}
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-[0.35em] leading-relaxed">{label}</p>
            </div>
          ))}
        </div>

        {/* Confirmed breakdown by package */}
        {confirmedBreakdown.length > 0 && (
          <div className="space-y-2">
            {confirmedBreakdown.map(r => (
              <div key={r.label} className="flex items-center gap-4 bg-[#0d0e0f] border border-white/[0.05] px-4 py-3">
                <span className="text-gray-300 text-sm w-40 shrink-0">{r.label}</span>
                <span className="text-gray-600 text-xs w-20">{r.count} {r.count === 1 ? "client" : "clients"}</span>
                <div className="flex-1 h-1 bg-white/[0.05] rounded-full">
                  <div className="h-1 bg-[#C9A24D]/50 rounded-full"
                    style={{ width: confirmedMrr > 0 ? `${Math.round((r.amount / confirmedMrr) * 100)}%` : "0%" }} />
                </div>
                <span className="text-[#C9A24D] font-semibold text-sm tabular-nums w-20 text-right">
                  ${r.amount.toLocaleString()}/mo
                </span>
                <span className="text-gray-700 text-xs w-10 text-right">
                  {confirmedMrr > 0 ? Math.round((r.amount / confirmedMrr) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Confirmed subscription table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Name", "Package", "Rate", "Status", "Next Billing"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold tracking-[0.35em] text-gray-700 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {LEADS.filter(l => l.stripeStatus === "active" || l.stripeStatus === "past_due").map(l => (
                <tr key={l.id} className={`hover:bg-white/[0.015] ${l.stripeStatus === "past_due" ? "bg-red-500/[0.03]" : ""}`}>
                  <td className="px-3 py-2.5 text-white font-medium">{l.name}</td>
                  <td className="px-3 py-2.5"><Badge cls={pkgCls(l.package)} text={l.package} /></td>
                  <td className="px-3 py-2.5 text-[#C9A24D] font-semibold tabular-nums">${l.rate}/mo</td>
                  <td className="px-3 py-2.5"><Badge cls={stripeCls(l.stripeStatus)} text={l.stripeStatus.replace("_", " ")} /></td>
                  <td className="px-3 py-2.5 text-gray-400">{l.nextBilling}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pending MRR ── */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-4">Pending MRR</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          {[
            { label: "Pending MRR",      value: `$${pendingMrr.toLocaleString()}`, note: "if all convert" },
            { label: "Pending Leads",    value: pending.length.toString(),          note: "payment link sent or awaiting decision" },
            { label: "Avg. Pending Rate",value: pending.length ? `$${Math.round(pendingMrr / pending.length)}/mo` : "—", note: "per lead" },
          ].map(({ label, value, note }) => (
            <div key={label} className="bg-[#0d0e0f] border border-white/[0.06] border-dashed px-5 py-5">
              <p className="text-3xl font-bold mb-1 tabular-nums text-gray-400">{value}</p>
              <p className="text-[10px] text-gray-700 uppercase tracking-[0.35em] leading-relaxed">{label}</p>
              <p className="text-[10px] text-gray-700 mt-1 normal-case tracking-normal">{note}</p>
            </div>
          ))}
        </div>

        {/* Pending leads table */}
        {pending.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Name", "Package", "Rate", "Stage", "Next Action"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold tracking-[0.35em] text-gray-700 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {pending.map(l => (
                  <tr key={l.id} className="hover:bg-white/[0.015]">
                    <td className="px-3 py-2.5 text-gray-300 font-medium">{l.name}</td>
                    <td className="px-3 py-2.5"><Badge cls={pkgCls(l.package)} text={l.package} /></td>
                    <td className="px-3 py-2.5 text-gray-500 tabular-nums">${l.rate}/mo</td>
                    <td className="px-3 py-2.5"><Badge cls={pipeCls(l.pipelineStatus)} text={l.pipelineStatus} /></td>
                    <td className="px-3 py-2.5 text-gray-600">{l.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ONBOARDING TAB
──────────────────────────────────────────────────────────── */

function OnboardingTab() {
  const groups: { label: string; color: string; items: Lead[] }[] = [
    {
      label: "Paid — Onboarding Not Started",
      color: "border-l-amber-500/60",
      items: LEADS.filter(l => l.stripeStatus === "active" && l.onboardingStatus === "not_started"),
    },
    {
      label: "Onboarding In Progress",
      color: "border-l-teal-500/60",
      items: LEADS.filter(l => l.onboardingStatus === "started"),
    },
    {
      label: "Onboarding Complete — Program Due",
      color: "border-l-orange-500/60",
      items: LEADS.filter(l => l.onboardingStatus === "complete" && l.programStatus === "not_built"),
    },
    {
      label: "Program Active",
      color: "border-l-emerald-400/70",
      items: LEADS.filter(l => l.programStatus === "active"),
    },
    {
      label: "Onboarding Complete",
      color: "border-l-cyan-500/60",
      items: LEADS.filter(l => l.onboardingStatus === "complete" && l.programStatus !== "not_built"),
    },
  ].filter(g => g.items.length > 0);

  return (
    <div className="space-y-8">
      {groups.map(g => (
        <div key={g.label}>
          <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-3">{g.label}</h3>
          <div className="space-y-2">
            {g.items.map(l => (
              <div key={l.id} className={`bg-[#0d0e0f] border border-white/[0.05] border-l-2 ${g.color} px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2`}>
                <span className="text-white font-semibold text-sm w-36 shrink-0">{l.name}</span>
                <Badge cls={pkgCls(l.package)} text={l.package} />
                <span className={`text-xs font-medium ${onboardingCls(l.onboardingStatus)}`}>
                  {onboardingLabel(l.onboardingStatus)}
                </span>
                <span className={`text-xs font-medium ${programCls(l.programStatus)}`}>
                  {programLabel(l.programStatus)}
                </span>
                <span className="text-gray-500 text-xs ml-auto">{l.nextAction}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {l.flags.map(f => <Badge key={f} cls={flagCls(f)} text={f} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   TASKS TAB
──────────────────────────────────────────────────────────── */

function TasksTab() {
  const sorted = [...TASKS].sort((a, b) => {
    const order: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const priorityLabel: Record<Priority, string> = {
    urgent: "URGENT",
    high: "HIGH",
    normal: "NORMAL",
    low: "LOW",
  };

  const priorityBg: Record<Priority, string> = {
    urgent: "bg-red-500/10 text-red-400 border border-red-500/20",
    high:   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    normal: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    low:    "bg-gray-500/10 text-gray-500 border border-gray-500/20",
  };

  return (
    <div>
      <div className="space-y-2">
        {sorted.map(t => (
          <div key={t.id} className={`bg-[#0d0e0f] border border-white/[0.05] border-l-2 ${priorityDot(t.priority).replace("bg-", "border-l-")} px-4 py-3`}>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <Badge cls={priorityBg[t.priority]} text={priorityLabel[t.priority]} />
              <span className="text-[#C9A24D] text-xs font-medium">{t.type}</span>
              <span className="text-white text-sm font-semibold">{t.clientName}</span>
              <span className="text-gray-600 text-xs ml-auto">{t.due}</span>
              <p className="text-gray-500 text-xs leading-relaxed w-full border-t border-white/[0.04] pt-2 mt-0.5">
                {t.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   STRIPE EVENTS TAB
   Phase 2A — webhook route is live, persistence is pending.
   This tab shows setup instructions and event inventory.
   No data fetching yet — state is derived from build-time config.

   TODO (Phase 3 — Persistence):
     - Create /api/stripe/events GET route that reads persisted events
     - Fetch and display real event log here
     - Add "Confirm" action to move pipeline lead to Active Client
──────────────────────────────────────────────────────────── */

// Stripe events the webhook listens for — duplicated from lib/stripe.ts
// as a static import-free copy (lib/stripe.ts is server-only).
const STRIPE_HANDLED_EVENTS: { type: string; description: string }[] = [
  { type: "checkout.session.completed",    description: "Customer completed checkout — maps to a new enrollment" },
  { type: "customer.subscription.created", description: "Subscription created — mark lead as Active Client" },
  { type: "customer.subscription.updated", description: "Subscription changed — sync status and price changes" },
  { type: "customer.subscription.deleted", description: "Subscription cancelled — move to Cancelled stage" },
  { type: "invoice.paid",                  description: "Monthly invoice succeeded — confirms MRR" },
  { type: "invoice.payment_failed",        description: "Payment failed — flag past_due, create urgent task" },
];

const PROD_WEBHOOK_URL = "https://www.catalystcoachingelite.com/api/stripe/webhook";

function StripeEventsTab() {
  return (
    <div className="space-y-8">

      {/* Status banner */}
      <div className="bg-amber-500/[0.05] border border-amber-500/20 px-5 py-4 flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0 animate-pulse" />
        <div>
          <p className="text-amber-300 text-sm font-semibold tracking-wide mb-0.5">
            Phase 2A — Webhook Foundation Active
          </p>
          <p className="text-amber-400/70 text-xs leading-relaxed">
            Webhook route is deployed at{" "}
            <code className="font-mono text-amber-300/90">/api/stripe/webhook</code>.
            Signature verification and event normalization are ready.
            <br />
            <strong className="text-amber-300/80">Persistence is pending (Phase 3)</strong> — events are
            logged to the server console but not yet stored or displayed here.
          </p>
        </div>
      </div>

      {/* Webhook endpoint */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-3">
          Webhook Endpoint
        </h3>
        <div className="space-y-3">
          {[
            {
              label: "Production URL",
              value: PROD_WEBHOOK_URL,
              note: "Register this in Stripe Dashboard → Developers → Webhooks → Add endpoint",
            },
            {
              label: "Local testing",
              value: "stripe listen --forward-to localhost:3000/api/stripe/webhook",
              note: "Run in terminal after installing Stripe CLI (brew install stripe/stripe-cli/stripe)",
            },
          ].map(({ label, value, note }) => (
            <div key={label} className="bg-[#0d0e0f] border border-white/[0.05] px-4 py-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] mb-1">{label}</p>
              <code className="text-[#C9A24D] text-xs font-mono break-all">{value}</code>
              <p className="text-gray-600 text-[11px] mt-1.5 leading-relaxed">{note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Events being handled */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-3">
          Events Handled
        </h3>
        <div className="space-y-1.5">
          {STRIPE_HANDLED_EVENTS.map(({ type, description }) => (
            <div key={type} className="flex items-start gap-4 bg-[#0d0e0f] border border-white/[0.04] px-4 py-2.5">
              <span className="text-emerald-400 text-[10px] mt-0.5 shrink-0">✓</span>
              <div>
                <code className="text-gray-300 text-xs font-mono">{type}</code>
                <p className="text-gray-600 text-[11px] mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Required env vars */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-3">
          Environment Variables Required
        </h3>
        <div className="space-y-2">
          {[
            {
              key: "STRIPE_SECRET_KEY",
              where: "Stripe Dashboard → Developers → API Keys → Secret key",
              note: "Server-side only. Never use NEXT_PUBLIC_ prefix.",
            },
            {
              key: "STRIPE_WEBHOOK_SECRET",
              where: "Stripe Dashboard → Developers → Webhooks → [endpoint] → Signing secret",
              note: "Starts with whsec_. For local testing use the secret printed by stripe listen.",
            },
          ].map(({ key, where, note }) => (
            <div key={key} className="bg-[#0d0e0f] border border-white/[0.05] px-4 py-3">
              <code className="text-[#C9A24D] text-sm font-mono font-semibold">{key}</code>
              <p className="text-gray-500 text-[11px] mt-1">{where}</p>
              <p className="text-gray-700 text-[11px] mt-0.5">{note}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-700 text-[11px] mt-2 leading-relaxed">
          See <code className="text-gray-500 font-mono">env.local.example</code> in the project root for full setup instructions.
        </p>
      </div>

      {/* Stripe Dashboard registration steps */}
      <div>
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold mb-3">
          How to Register in Stripe Dashboard
        </h3>
        <ol className="space-y-2">
          {[
            'Go to Stripe Dashboard → Developers → Webhooks',
            'Click "Add endpoint"',
            `Paste the production URL: ${PROD_WEBHOOK_URL}`,
            'Under "Select events", add all 6 events listed above',
            'Click "Add endpoint" to save',
            'Open the endpoint → copy Signing secret (whsec_...) → paste into .env.local as STRIPE_WEBHOOK_SECRET',
            'Restart the dev server — webhooks will now be verified and logged',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-gray-500">
              <span className="text-[10px] text-gray-700 font-semibold tracking-wide w-5 shrink-0 pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Phase 3 preview */}
      <div className="bg-[#0d0e0f] border border-white/[0.04] border-dashed px-5 py-4">
        <p className="text-[10px] tracking-[0.5em] text-gray-700 uppercase font-semibold mb-2">
          Phase 3 — Persistence (upcoming)
        </p>
        <ul className="space-y-1.5 text-[11px] text-gray-700 leading-relaxed">
          <li>→ Persist each normalized event to a store (Supabase / Upstash / JSON)</li>
          <li>→ Add GET /api/stripe/events route to read stored events</li>
          <li>→ Display live event log in this tab with timestamps and amounts</li>
          <li>→ Auto-update Lead pipeline status when events arrive</li>
          <li>→ Replace hardcoded Confirmed MRR with live Stripe subscription data</li>
        </ul>
      </div>

    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   LIVE SHEETS TAB
   Fetches raw rows from Google Sheets via the /api/sheets proxy.
   GAS scripts must have doGet() deployed — see env.local.example.

   TODO (Phase 2 reconciliation):
     - Map "applications" rows → Lead entries at "Applied" pipeline stage
     - Dedup by email against manually curated LEADS array
     - Map "standard-onboarding" rows → update Lead.onboardingStatus
     - Map "executive-onboarding" rows → update Lead.onboardingStatus
     - Surface net-new entries as actionable tasks in TasksTab
──────────────────────────────────────────────────────────── */

type SheetLoadState = {
  status: "idle" | "loading" | "ok" | "error";
  rows: SheetRow[];
  error?: string;
  unconfigured?: boolean;
};

function SheetSection({
  title,
  state,
  keyPrefix,
}: {
  title: string;
  state: SheetLoadState;
  keyPrefix: string;
}) {
  const columns =
    state.rows.length > 0 ? Object.keys(state.rows[0]) : [];
  const recent = [...state.rows].reverse().slice(0, 15);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold">
          {title}
        </h3>
        {state.status === "loading" && (
          <span className="text-[10px] text-gray-600 animate-pulse">fetching…</span>
        )}
        {state.status === "ok" && (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-sm">
            {state.rows.length} {state.rows.length === 1 ? "row" : "rows"}
          </span>
        )}
        {state.status === "error" && (
          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-sm">
            {state.unconfigured ? "Setup required" : "Error"}
          </span>
        )}
      </div>

      {/* Setup-required callout */}
      {state.status === "error" && state.unconfigured && (
        <div className="bg-amber-500/[0.05] border border-amber-500/20 px-4 py-3 text-xs text-amber-400/80 leading-relaxed">
          GAS read endpoint not configured. Add{" "}
          <code className="text-amber-300 font-mono text-[11px]">
            {title.toLowerCase().includes("application")
              ? "SHEETS_APPLICATIONS_GAS_URL"
              : "SHEETS_ONBOARDING_GAS_URL"}
          </code>{" "}
          to <code className="text-amber-300 font-mono text-[11px]">.env.local</code> and deploy{" "}
          <code className="text-amber-300 font-mono text-[11px]">doGet()</code> to the Apps Script.
          See <code className="text-amber-300 font-mono text-[11px]">env.local.example</code> for exact setup steps.
        </div>
      )}

      {/* Fetch error */}
      {state.status === "error" && !state.unconfigured && (
        <div className="bg-red-500/[0.04] border border-red-500/15 px-4 py-3 text-xs text-red-400/80">
          {state.error ?? "Unknown error"}
        </div>
      )}

      {/* Loading skeleton */}
      {state.status === "loading" && (
        <div className="space-y-1.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-white/[0.02] animate-pulse rounded-sm" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {state.status === "ok" && state.rows.length === 0 && (
        <p className="text-gray-700 text-xs py-3">No submissions yet.</p>
      )}

      {/* Data table */}
      {state.status === "ok" && state.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {columns.map(col => (
                  <th
                    key={`${keyPrefix}-h-${col}`}
                    className="px-3 py-2 text-left text-[10px] font-semibold tracking-[0.3em] text-gray-700 uppercase whitespace-nowrap max-w-[180px] truncate"
                    title={col}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {recent.map((row, ri) => (
                <tr key={`${keyPrefix}-r-${ri}`} className="hover:bg-white/[0.015]">
                  {columns.map(col => {
                    const raw = row[col];
                    const val = raw !== undefined && raw !== "" ? String(raw) : "—";
                    return (
                      <td
                        key={`${keyPrefix}-r-${ri}-${col}`}
                        className="px-3 py-2 text-gray-400 whitespace-nowrap max-w-[220px]"
                        title={val}
                      >
                        <span className="block truncate">{val || "—"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {state.rows.length > 15 && (
            <p className="text-gray-700 text-[10px] px-3 pt-2">
              Showing 15 most recent of {state.rows.length} total rows.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Loading state used as initial useState value (avoids calling setState in effect)
const LOADING_STATE: SheetLoadState = { status: "loading", rows: [] };

function LiveSheetsTab() {
  // Initial value is "loading" so first render already shows loading skeletons.
  // setState is only called from: (a) .then() async callbacks, (b) the click handler.
  // Neither is a synchronous setState-in-effect — satisfying the lint rule.
  const [apps,     setApps]     = useState<SheetLoadState>(LOADING_STATE);
  const [stdOnb,   setStdOnb]   = useState<SheetLoadState>(LOADING_STATE);
  const [execOnb,  setExecOnb]  = useState<SheetLoadState>(LOADING_STATE);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Click handler sets loading state (event handler — not an effect)
  const handleRefresh = () => {
    setApps(LOADING_STATE);
    setStdOnb(LOADING_STATE);
    setExecOnb(LOADING_STATE);
    setRefreshTick(t => t + 1);
  };

  useEffect(() => {
    let mounted = true;
    // No synchronous setState here — only async .then() callbacks below.
    Promise.all([
      fetchSheetData("applications"),
      fetchSheetData("standard-onboarding"),
      fetchSheetData("executive-onboarding"),
    ]).then(([appsRes, stdRes, execRes]) => {
      if (!mounted) return;
      setApps({
        status: appsRes.ok ? "ok" : "error",
        rows: appsRes.rows,
        error: appsRes.error,
        unconfigured: appsRes.error?.includes("not set in .env.local"),
      });
      setStdOnb({
        status: stdRes.ok ? "ok" : "error",
        rows: stdRes.rows,
        error: stdRes.error,
        unconfigured: stdRes.error?.includes("not set in .env.local"),
      });
      setExecOnb({
        status: execRes.ok ? "ok" : "error",
        rows: execRes.rows,
        error: execRes.error,
        unconfigured: execRes.error?.includes("not set in .env.local"),
      });
      setLastFetch(new Date().toLocaleTimeString());
    });
    return () => { mounted = false; };
  }, [refreshTick]); // re-runs each time the refresh button increments the tick

  return (
    <div className="space-y-8">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold tracking-wide">Live Google Sheets</p>
          <p className="text-gray-600 text-xs mt-0.5">
            {lastFetch
              ? `Last fetched at ${lastFetch}`
              : "Fetching…"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={apps.status === "loading"}
          className="text-[11px] tracking-[0.25em] uppercase font-semibold text-gray-500 border border-white/[0.08] px-4 py-2 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Refresh
        </button>
      </div>

      {/* Applications */}
      <SheetSection
        title="Recent Applications"
        state={apps}
        keyPrefix="apps"
      />

      <div className="h-px bg-white/[0.04]" />

      {/* Standard Onboarding */}
      <SheetSection
        title="Standard Onboarding Submissions"
        state={stdOnb}
        keyPrefix="std"
      />

      <div className="h-px bg-white/[0.04]" />

      {/* Executive Onboarding */}
      <SheetSection
        title="Executive Onboarding Submissions"
        state={execOnb}
        keyPrefix="exec"
      />

    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────────────────── */

type Tab =
  | "overview"
  | "pipeline"
  | "clients"
  | "revenue"
  | "onboarding"
  | "tasks"
  | "live-sheets"
  | "stripe-events";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",       label: "Overview" },
  { id: "pipeline",       label: "Pipeline" },
  { id: "clients",        label: "Clients" },
  { id: "revenue",        label: "Revenue" },
  { id: "onboarding",     label: "Onboarding" },
  { id: "tasks",          label: "Tasks" },
  { id: "live-sheets",    label: "Live Sheets" },
  { id: "stripe-events",  label: "Stripe Events" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <AdminGate>
    <div className="min-h-screen bg-[#080909] text-white">

      {/* ── TOP HEADER ─────────────────────────────────────── */}
      <header className="border-b border-white/[0.06] bg-[#080909]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {/* Gold mark */}
              <div className="w-2 h-5 bg-[#C9A24D] rounded-sm" />
              <div>
                <p className="text-white font-semibold text-sm tracking-wide leading-none">
                  Catalyst Command Center
                </p>
                <p className="text-gray-700 text-[10px] tracking-wide mt-0.5">{now}</p>
              </div>
            </div>

            {/* Urgent task badge */}
            {urgentTasks > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-[11px] font-semibold tracking-wide">
                  {urgentTasks} urgent {urgentTasks === 1 ? "task" : "tasks"}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-6">

        {/* ── STAT CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Active Clients",   value: activeClients,                    suffix: "",      warn: false,              gold: false },
            { label: "Confirmed MRR",   value: `$${confirmedMrr.toLocaleString()}`, suffix: "/mo",   warn: false,              gold: true  },
            { label: "New Applications",value: newApplications,                   suffix: "",      warn: false,              gold: false },
            { label: "Programs Due",    value: programsDue,                       suffix: "",      warn: programsDue > 0,    gold: false },
            { label: "Payment Issues",  value: paymentIssues,                     suffix: "",      warn: paymentIssues > 0,  gold: false },
          ].map(({ label, value, suffix, warn, gold }) => (
            <div key={label} className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-4 relative overflow-hidden">
              <div className="h-px w-full absolute top-0 left-0 right-0 bg-gradient-to-r from-transparent via-[#C9A24D]/20 to-transparent" />
              <p className={`text-2xl font-bold tabular-nums leading-none mb-2 ${gold ? "text-[#C9A24D]" : warn ? "text-red-400" : "text-white"}`}>
                {value}{suffix}
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-[0.35em] leading-relaxed">{label}</p>
            </div>
          ))}
        </div>

        {/* ── TAB BAR ────────────────────────────────────────── */}
        <div className="flex gap-0 border-b border-white/[0.07] mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-semibold tracking-[0.3em] uppercase whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "text-[#C9A24D] border-[#C9A24D]"
                  : "text-gray-600 border-transparent hover:text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ────────────────────────────────────── */}
        <div className="mb-16">
          {tab === "overview"       && <OverviewTab />}
          {tab === "pipeline"       && <PipelineTab />}
          {tab === "clients"        && <ClientsTab />}
          {tab === "revenue"        && <RevenueTab />}
          {tab === "onboarding"     && <OnboardingTab />}
          {tab === "tasks"          && <TasksTab />}
          {tab === "live-sheets"    && <LiveSheetsTab />}
          {tab === "stripe-events"  && <StripeEventsTab />}
        </div>

        {/* ── FUTURE INTEGRATIONS ────────────────────────────── */}
        <div className="border border-white/[0.05] bg-[#0a0b0c] px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#C9A24D]/40" />
            <p className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold">
              Future Integrations — TODO
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
            {[
              { label: "Google Sheets — Applications",   note: "Phase 1 in progress — see Live Sheets tab. Deploy doGet() to GAS to activate." },
              { label: "Google Sheets — Onboarding",     note: "Phase 1 in progress — see Live Sheets tab. Deploy doGet() to GAS to activate." },
              { label: "Stripe — Subscriptions",         note: "Phase 2 in progress — see Stripe Events tab. Persistence pending (Phase 3)." },
              { label: "Stripe — Failed Payments",       note: "Phase 2 in progress — webhook route live, invoice.payment_failed handled." },
              { label: "Authentication",                 note: "Replace client-side password gate with NextAuth or Clerk before sharing URL" },
              { label: "Client Detail Pages",            note: "Add /admin/clients/[id] for full profile, notes, history, and messaging" },
              { label: "Task Editing",                   note: "Allow creating, completing, and dismissing tasks within the dashboard" },
              { label: "Trainerize API",                 note: "Sync program delivery status from Trainerize to update programStatus" },
            ].map(({ label, note }) => (
              <div key={label} className="flex items-start gap-2.5 py-1.5">
                <div className="w-px h-4 bg-gray-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs font-medium">{label}</p>
                  <p className="text-gray-700 text-[10px] leading-relaxed mt-0.5">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
    </AdminGate>
  );
}
