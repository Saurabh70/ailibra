"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, User, ArrowRight } from "lucide-react";
import { HealthCircle } from "@/components/deal/health-circle";
import { StageBadge } from "@/components/deal/stage-badge";
import { relativeFromNow } from "@/lib/time";
import { formatINR } from "@/lib/format";

export type DealCardData = {
  id: string;
  name: string;
  value: number;
  stage: string;
  health_score: number;
  health_reason: string | null;
  ai_summary: string | null;
  days_in_stage: number;
  last_activity_at: string | null;
  last_activity_summary: string | null;
  company: { id: string; name: string; industry: string | null } | null;
  primary_contact: { id: string; name: string; role: string | null } | null;
};

const formatValue = formatINR;

export function DealCard({ deal, index }: { deal: DealCardData; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
    >
      <Link href={`/explore/deal/${deal.id}`} className="block group">
        <div className="rounded-xl border border-border bg-card hover:border-foreground/25 hover:shadow-sm transition-all p-4">
          <div className="flex items-start gap-4">
            <HealthCircle score={deal.health_score} />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{deal.company?.name ?? "—"}</span>
                  </div>
                  <h3 className="font-medium text-[15px] leading-snug group-hover:text-primary transition-colors">
                    {deal.name}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold tabular-nums text-[15px]">{formatValue(deal.value)}</div>
                  <div className="mt-1">
                    <StageBadge stage={deal.stage} />
                  </div>
                </div>
              </div>

              {deal.ai_summary && (
                <p className="text-[13px] text-foreground/70 leading-relaxed mt-2 line-clamp-2">
                  {deal.ai_summary}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 mt-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3 min-w-0">
                  {deal.primary_contact && (
                    <div className="flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {deal.primary_contact.name}
                        {deal.primary_contact.role && (
                          <span className="text-muted-foreground/70"> · {deal.primary_contact.role}</span>
                        )}
                      </span>
                    </div>
                  )}
                  <span className="shrink-0">{deal.days_in_stage}d in stage</span>
                  {deal.last_activity_at && (
                    <span className="shrink-0">last touch {relativeFromNow(deal.last_activity_at)}</span>
                  )}
                </div>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
