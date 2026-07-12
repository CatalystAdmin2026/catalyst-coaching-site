"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  className?: string;
}

export default function LogoutButton({ className = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`text-xs text-white/35 hover:text-white/60 transition-colors disabled:opacity-40 ${className}`}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
