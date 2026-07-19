export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#080909] lg:ml-56 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-5 h-5 border border-[#c9a24d]/30 border-t-[#c9a24d] rounded-full animate-spin" />
        <p className="text-[10px] text-white/25 uppercase tracking-[0.3em]">Loading</p>
      </div>
    </div>
  );
}
