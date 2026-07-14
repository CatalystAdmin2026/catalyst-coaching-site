"use client";

// Catalyst HQ — Blueprint Editor
// Auth: HQ layout (requireCoachOrAdminPage) — no secondary gate needed.

import { useState, useEffect } from "react";
import { use } from "react";
import BlueprintEditor from "@/components/BlueprintEditor";
import type { BlueprintData } from "@/components/BlueprintEditor";

export default function HQBlueprintEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<BlueprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/internal/workout-templates/${id}`)
      .then((r) => r.json())
      .then(
        (res: {
          ok: boolean;
          template?: BlueprintData["template"];
          sections?: BlueprintData["sections"];
          unsectioned?: BlueprintData["unsectioned"];
          error?: string;
        }) => {
          if (!mounted) return;
          if (res.ok && res.template) {
            setData({ template: res.template, sections: res.sections ?? [], unsectioned: res.unsectioned ?? [] });
          } else {
            setError(res.error ?? "Failed to load blueprint");
          }
          setLoading(false);
        },
      )
      .catch(() => {
        if (mounted) { setError("Network error loading blueprint"); setLoading(false); }
      });
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-gray-600 text-xs tracking-widest uppercase animate-pulse">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  return <BlueprintEditor templateId={id} initialData={data} />;
}
