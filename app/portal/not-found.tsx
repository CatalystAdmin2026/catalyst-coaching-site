import Link from "next/link";

export default function PortalNotFound() {
  return (
    <div className="min-h-screen bg-[#080909] flex items-center justify-center px-5">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <div>
          <p className="text-[9px] text-[#c9a24d]/60 uppercase tracking-[0.4em] mb-3">404</p>
          <p className="text-white/80 text-sm font-semibold">Page not found</p>
          <p className="text-gray-500 text-xs leading-relaxed mt-2 max-w-xs">
            This page doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>

        <Link
          href="/portal"
          className="text-xs text-white/35 hover:text-white/60 transition-colors tracking-wide"
        >
          ← Back to your dashboard
        </Link>
      </div>
    </div>
  );
}
