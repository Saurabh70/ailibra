"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIGenerating } from "@/components/ai-generating";
import { LOADING } from "@/lib/loading-messages";
import { toast } from "sonner";

type SummaryResponse = {
  summary: string;
  next_move: string | null;
  email_intent: string | null;
  cached: boolean;
  error?: string;
};

export function DealAISummary({
  dealId,
  initialSummary,
  onDraftEmail,
}: {
  dealId: string;
  initialSummary: string | null;
  onDraftEmail?: (intent: string) => void;
}) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [nextMove, setNextMove] = useState<string | null>(null);
  const [emailIntent, setEmailIntent] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialSummary);
  const [, startTransition] = useTransition();

  async function load(force: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/deal-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, force }),
      });
      const data = (await res.json()) as SummaryResponse;
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Failed to generate summary");
        return;
      }
      setSummary(data.summary);
      setNextMove(data.next_move);
      setEmailIntent(data.email_intent);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialSummary) {
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-l-[3px] border-primary border border-l-primary border-y-border border-r-border bg-card p-5 relative"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={2.4} />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            AI Summary
          </span>
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
        <AIGenerating messages={LOADING.deal_summary} variant="inline" skeletonLines={3} />
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-foreground/90">{summary}</p>
          {nextMove && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Next move
              </div>
              <p className="text-[13px] leading-relaxed font-medium">{nextMove}</p>
            </div>
          )}
          {emailIntent && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="h-8"
                onClick={() => {
                  if (onDraftEmail) onDraftEmail(emailIntent);
                  else toast.info(`Draft email: "${emailIntent}"`);
                }}
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Draft this email
              </Button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
