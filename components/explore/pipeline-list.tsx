"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DealCard, type DealCardData } from "@/components/deal/card";
import { getCache, setCache, fetchWithDedupe } from "@/lib/client-cache";
import { LoadingRotator } from "@/components/loading-rotator";
import { LOADING } from "@/lib/loading-messages";

const TTL = 60 * 1000; // 1 minute — list data is cheap; refresh often is fine

export function PipelineList() {
  const [deals, setDeals] = useState<DealCardData[] | null>(() =>
    getCache<DealCardData[]>("deals_list", TTL)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deals) return;
    fetchWithDedupe("deals_list", async () => {
      const res = await fetch("/api/deals/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as { deals: DealCardData[] };
      return data.deals;
    })
      .then((d) => {
        setCache("deals_list", d);
        setDeals(d);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unknown error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load deals: {error}
      </div>
    );
  }
  if (!deals) {
    return (
      <div>
        <div className="text-[12px] text-muted-foreground mb-3">
          <LoadingRotator messages={LOADING.pipeline_list} />
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (deals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No deals yet. Use the command bar to log one.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="text-[12px] text-muted-foreground mb-2">
        {deals.length} open deals — sorted by health (at-risk first)
      </div>
      {deals.map((d, i) => (
        <DealCard key={d.id} deal={d} index={i} />
      ))}
    </div>
  );
}
