"use client";

// Dispatches a custom event that AssignProgramModal listens for.
// Keeps the trigger decoupled from the modal so either can live
// anywhere in the component tree.

const OPEN_EVENT = "hq:assign-program:open";

interface Props {
  hasActiveProgram: boolean;
  variant?: "header" | "primary" | "section";
}

export default function AssignProgramButton({
  hasActiveProgram,
  variant = "primary",
}: Props) {
  function open() {
    document.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }

  if (variant === "header") {
    return (
      <button
        onClick={open}
        className="text-[10px] text-[#C9A24D] uppercase tracking-[0.2em] font-semibold hover:text-[#C9A24D]/80 border border-[#C9A24D]/40 hover:border-[#C9A24D]/60 px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24D]/40"
      >
        {hasActiveProgram ? "Replace Program" : "Assign Program"}
      </button>
    );
  }

  if (variant === "section") {
    return (
      <button
        onClick={open}
        className="text-[10px] text-[#C9A24D]/70 uppercase tracking-[0.2em] hover:text-[#C9A24D] transition-colors border border-[#C9A24D]/20 hover:border-[#C9A24D]/40 px-2.5 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24D]/40"
      >
        {hasActiveProgram ? "Replace →" : "Assign →"}
      </button>
    );
  }

  // Primary — used in empty state
  return (
    <button
      onClick={open}
      className="bg-[#C9A24D] text-black text-[10px] uppercase tracking-[0.3em] font-bold px-6 py-3 hover:bg-[#C9A24D]/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24D]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080909]"
    >
      Assign Program
    </button>
  );
}
