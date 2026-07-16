"use client";

// ─────────────────────────────────────────────────────────────
// Catalyst HQ — Check-In Review Panel
//
// Client Component. Handles coach response drafting and all
// status-transition actions for a single check-in.
//
// Rendered by: app/hq/check-ins/[checkInId]/page.tsx
// ─────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import {
  startReviewAction,
  saveDraftResponseAction,
  markReviewedAction,
  reopenCheckInAction,
} from "@/app/hq/check-ins/[checkInId]/actions";

interface Props {
  checkInId: string;
  status: string;
  clientName: string;
  initialResponse: string | null;
}

export default function CheckInReviewPanel({
  checkInId,
  status,
  clientName,
  initialResponse,
}: Props) {
  const [response, setResponse] = useState(initialResponse ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);

  const [isPendingStart, startStartTx] = useTransition();
  const [isPendingSaveDraft, startSaveDraftTx] = useTransition();
  const [isPendingMarkReviewed, startMarkReviewedTx] = useTransition();
  const [isPendingReopen, startReopenTx] = useTransition();

  function clearError() {
    setActionError(null);
  }

  function handleStartReview() {
    clearError();
    startStartTx(async () => {
      const result = await startReviewAction(checkInId);
      if (result.ok) {
        setCurrentStatus("in_review");
      } else {
        setActionError(result.error ?? "Failed to start review.");
      }
    });
  }

  function handleSaveDraft() {
    clearError();
    startSaveDraftTx(async () => {
      const result = await saveDraftResponseAction(checkInId, response);
      if (result.ok) {
        setSavedAt(new Date());
      } else {
        setActionError(result.error ?? "Failed to save draft.");
      }
    });
  }

  function handleMarkReviewed() {
    clearError();
    startMarkReviewedTx(async () => {
      const result = await markReviewedAction(checkInId, response);
      if (result.ok) {
        setCurrentStatus("reviewed");
        setSavedAt(new Date());
      } else {
        setActionError(result.error ?? "Failed to mark as reviewed.");
      }
    });
  }

  function handleReopen() {
    clearError();
    startReopenTx(async () => {
      const result = await reopenCheckInAction(checkInId);
      if (result.ok) {
        setCurrentStatus("in_review");
      } else {
        setActionError(result.error ?? "Failed to reopen check-in.");
      }
    });
  }

  const isAnyPending =
    isPendingStart ||
    isPendingSaveDraft ||
    isPendingMarkReviewed ||
    isPendingReopen;

  return (
    <div className="space-y-4">
      {/* Start Review CTA */}
      {currentStatus === "submitted" && (
        <div className="bg-blue-500/[0.05] border border-blue-500/20 px-5 py-4">
          <p className="text-blue-400 text-sm font-medium mb-1">
            Ready to review {clientName}&apos;s check-in?
          </p>
          <p className="text-blue-300/60 text-xs mb-3">
            Starting review marks it as &quot;in review&quot; and lets you write a response.
          </p>
          <button
            type="button"
            onClick={handleStartReview}
            disabled={isPendingStart || isAnyPending}
            className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
          >
            {isPendingStart ? "Starting…" : "Start Review"}
          </button>
        </div>
      )}

      {/* Response editor */}
      {(currentStatus === "in_review" || currentStatus === "reviewed") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-gray-400 uppercase tracking-[0.4em]">
              Coach Response
            </p>
            {currentStatus === "reviewed" && (
              <span className="text-[9px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 uppercase tracking-[0.2em]">
                Reviewed
              </span>
            )}
          </div>

          <textarea
            value={response}
            onChange={(e) => {
              setResponse(e.target.value);
              setSavedAt(null);
            }}
            placeholder={`Write your response to ${clientName}…`}
            rows={8}
            className="w-full bg-[#0a0b0c] border border-white/[0.09] text-white text-sm px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-[#C9A24D]/40 transition-colors resize-none leading-relaxed"
          />

          {/* Save status */}
          <div className="text-[10px] text-gray-600 h-4">
            {isPendingSaveDraft && <span>Saving draft…</span>}
            {!isPendingSaveDraft && savedAt && (
              <span>
                Saved at{" "}
                {savedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {currentStatus === "in_review" && (
              <>
                <button
                  type="button"
                  onClick={handleMarkReviewed}
                  disabled={isAnyPending}
                  className="bg-[#C9A24D] text-black text-[10px] font-bold uppercase tracking-[0.2em] px-5 py-2.5 hover:bg-[#d4af63] disabled:opacity-50 transition-colors"
                >
                  {isPendingMarkReviewed ? "Saving…" : "Mark Reviewed"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isAnyPending}
                  className="border border-white/[0.10] text-gray-400 text-[10px] font-medium uppercase tracking-[0.15em] px-4 py-2.5 hover:text-white/70 hover:border-white/20 disabled:opacity-50 transition-colors"
                >
                  {isPendingSaveDraft ? "Saving…" : "Save Draft"}
                </button>
              </>
            )}
            {currentStatus === "reviewed" && (
              <>
                <button
                  type="button"
                  onClick={handleMarkReviewed}
                  disabled={isAnyPending}
                  className="border border-[#C9A24D]/25 text-[#C9A24D] text-[10px] font-medium uppercase tracking-[0.15em] px-4 py-2.5 hover:bg-[#C9A24D]/10 disabled:opacity-50 transition-colors"
                >
                  {isPendingMarkReviewed ? "Saving…" : "Update Response"}
                </button>
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={isAnyPending}
                  className="border border-white/[0.10] text-gray-500 text-[10px] font-medium uppercase tracking-[0.15em] px-4 py-2.5 hover:text-gray-300 hover:border-white/20 disabled:opacity-50 transition-colors"
                >
                  {isPendingReopen ? "Reopening…" : "Reopen"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {actionError && (
        <div className="bg-red-500/[0.08] border border-red-500/25 px-4 py-3">
          <p className="text-red-400 text-xs">{actionError}</p>
          <button
            type="button"
            onClick={clearError}
            className="text-[10px] text-red-400/60 hover:text-red-400 mt-1 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
