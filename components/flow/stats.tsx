"use client";

import { motion } from "framer-motion";
import { TrendingUp, Calendar, Bell, AlertTriangle } from "lucide-react";
import type { FlowStats } from "@/types/ai";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";

const CARDS = [
  {
    key: "pipeline_value" as const,
    label: "Pipeline Value",
    icon: TrendingUp,
    format: (n: number) => formatINR(n),
    accent: "text-foreground",
  },
  {
    key: "deals_closing_this_month" as const,
    label: "Closing This Month",
    icon: Calendar,
    format: (n: number) => `${n}`,
    accent: "text-foreground",
  },
  {
    key: "follow_ups_due" as const,
    label: "Follow-ups Due",
    icon: Bell,
    format: (n: number) => `${n}`,
    accent: "text-primary",
  },
  {
    key: "deals_at_risk" as const,
    label: "Deals at Risk",
    icon: AlertTriangle,
    format: (n: number) => `${n}`,
    accent: "text-red-600",
  },
];

export function FlowStatsRow({ stats, loading }: { stats?: FlowStats; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(({ key, label, icon: Icon, format, accent }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/20 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            <Icon className="w-3 h-3" strokeWidth={2.4} />
            {label}
          </div>
          <div className={cn("text-2xl font-semibold tracking-tight tabular-nums", accent)}>
            {loading || !stats ? <span className="text-muted-foreground/40">—</span> : format(stats[key])}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
