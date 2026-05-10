"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowStatsRow } from "@/components/flow/stats";
import { RightNow } from "@/components/flow/right-now";
import { ComingUp } from "@/components/flow/coming-up";
import { ActionsReady } from "@/components/flow/actions-ready";
import type { FlowPriorities, FlowStats, ComingUpItem } from "@/types/ai";

type StatsWithMeetings = FlowStats & { coming_up?: ComingUpItem[] };
import { formatIST } from "@/lib/time";
import { getCache, setCache, fetchWithDedupe, clearCache } from "@/lib/client-cache";
import { LoadingRotator } from "@/components/loading-rotator";
import { LOADING } from "@/lib/loading-messages";

const TTL_PRIORITIES = 10 * 60 * 1000; // 10 minutes
const TTL_STATS = 60 * 1000; // 1 minute

export default function FlowPage() {
  const [stats, setStats] = useState<StatsWithMeetings | null>(() =>
    getCache<StatsWithMeetings>("flow_stats", TTL_STATS)
  );
  const [priorities, setPriorities] = useState<FlowPriorities | null>(() =>
    getCache<FlowPriorities>("priorities", TTL_PRIORITIES)
  );
  const [aiLoading, setAILoading] = useState(!priorities);
  const [statsLoading, setStatsLoading] = useState(!stats);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function loadStats(force = false) {
    if (!force) {
      const cached = getCache<StatsWithMeetings>("flow_stats", TTL_STATS);
      if (cached) {
        setStats(cached);
        setStatsLoading(false);
        return;
      }
    }
    setStatsLoading(true);
    fetchWithDedupe("flow_stats", async () => {
      const res = await fetch("/api/flow/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`Stats ${res.status}`);
      return (await res.json()) as StatsWithMeetings;
    })
      .then((data) => {
        setCache("flow_stats", data);
        setStats(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Stats failed"))
      .finally(() => setStatsLoading(false));
  }

  function loadPriorities(force = false) {
    if (!force) {
      const cached = getCache<FlowPriorities>("priorities", TTL_PRIORITIES);
      if (cached) {
        setPriorities(cached);
        setAILoading(false);
        return;
      }
    }
    setAILoading(true);
    fetchWithDedupe("priorities", async () => {
      const res = await fetch("/api/ai/priorities", { cache: "no-store" });
      if (!res.ok) throw new Error(`Priorities ${res.status}`);
      return (await res.json()) as FlowPriorities;
    })
      .then((data) => {
        setCache("priorities", data);
        setPriorities(data);
        if (!stats && data.stats) {
          setCache("flow_stats", data.stats);
          setStats(data.stats);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Priorities failed"))
      .finally(() => setAILoading(false));
  }

  useEffect(() => {
    loadStats();
    loadPriorities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    clearCache("flow_stats");
    clearCache("priorities");
    startTransition(() => {
      loadStats(true);
      loadPriorities(true);
    });
  }

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto pb-20">
      <Header
        aiLoading={aiLoading}
        generatedAt={priorities?.generated_at}
        onRefresh={refresh}
        canRefresh={!aiLoading && !statsLoading}
      />

      <div className="mt-5 mb-7">
        <FlowStatsRow stats={stats ?? undefined} loading={statsLoading} />
      </div>

      {priorities?.ai_error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 flex-1">
            <div className="font-medium mb-0.5">AI ranking unavailable</div>
            <div className="text-amber-800/90 text-[13px] leading-relaxed">
              {prettyAIError(priorities.ai_error)}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-7">
          <RightNow items={priorities?.right_now ?? []} loading={aiLoading} />
          <ActionsReady items={priorities?.actions_ready ?? []} loading={aiLoading} />
        </div>
        <div className="space-y-7">
          {/* Coming Up renders from stats endpoint (fast) — falls back to priorities if stats failed. */}
          <ComingUp
            items={stats?.coming_up ?? priorities?.coming_up ?? []}
            loading={statsLoading && !stats?.coming_up}
          />
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function Header({
  aiLoading,
  generatedAt,
  onRefresh,
  canRefresh,
}: {
  aiLoading: boolean;
  generatedAt?: string;
  onRefresh: () => void;
  canRefresh: boolean;
}) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">
          {greeting}. Here&apos;s what matters today.
        </h1>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
          {aiLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <LoadingRotator messages={LOADING.priorities} />
            </>
          ) : generatedAt ? (
            <span>Updated {formatIST(generatedAt, "h:mm a")}</span>
          ) : (
            <span>Your day, prioritised by AI.</span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={onRefresh}
        disabled={!canRefresh}
      >
        <RefreshCw className={`w-3 h-3 mr-1.5 ${aiLoading ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}

function prettyAIError(err: string): string {
  if (err.includes("credit balance")) {
    return "Your Anthropic API key has no credits — or your shell's ANTHROPIC_API_KEY is overriding .env.local.";
  }
  if (err.length > 240) return err.slice(0, 240) + "…";
  return err;
}
