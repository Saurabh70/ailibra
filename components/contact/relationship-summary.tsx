"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIGenerating } from "@/components/ai-generating";
import { LOADING } from "@/lib/loading-messages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STRENGTH_STYLE: Record<string, string> = {
  champion: "bg-emerald-50 text-emerald-700 border-emerald-200",
  supporter: "bg-cyan-50 text-cyan-700 border-cyan-200",
  neutral: "bg-neutral-50 text-neutral-600 border-neutral-200",
  skeptic: "bg-amber-50 text-amber-700 border-amber-200",
  blocker: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-neutral-50 text-neutral-500 border-neutral-200",
};

type Response = {
  summary: string;
  strength: string | null;
  cached: boolean;
  error?: string;
};

export function RelationshipSummary({
  contactId,
  initialSummary,
}: {
  contactId: string;
  initialSummary: string | null;
}) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [strength, setStrength] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialSummary);
  const [, startTransition] = useTransition();

  async function load(force: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/relationship-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact_id: contactId, force }),
      });
      const data = (await res.json()) as Response;
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Failed to generate summary");
        return;
      }
      setSummary(data.summary);
      setStrength(data.strength);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialSummary) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-l-[3px] border-primary border border-l-primary border-y-border border-r-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={2.4} />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Relationship Summary
          </span>
          {strength && (
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-medium",
                STRENGTH_STYLE[strength] ?? STRENGTH_STYLE.unknown
              )}
            >
              {strength}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          disabled={loading}
          onClick={() => startTransition(() => load(true))}
        >
          <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {loading && !summary ? (
        <AIGenerating messages={LOADING.relationship} variant="inline" skeletonLines={3} />
      ) : (
        <p className="text-[14px] leading-relaxed text-foreground/90">{summary}</p>
      )}
    </motion.div>
  );
}
