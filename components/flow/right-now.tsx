"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Clock } from "lucide-react";
import { FlowSection } from "@/components/flow/section";
import { ActionButtons } from "@/components/flow/action-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import type { RightNowItem } from "@/types/ai";
import { cn } from "@/lib/utils";

const URGENCY_STYLES: Record<RightNowItem["urgency"], { dot: string; label: string; icon: typeof Flame }> = {
  critical: { dot: "bg-red-500", label: "Critical", icon: Flame },
  high: { dot: "bg-orange-500", label: "High", icon: Zap },
  medium: { dot: "bg-amber-500", label: "Medium", icon: Clock },
};

export function RightNow({
  items,
  loading,
}: {
  items: RightNowItem[];
  loading?: boolean;
}) {
  return (
    <FlowSection title="Right Now" icon={Flame} count={loading ? undefined : items.length}>
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="Nothing urgent right now. Enjoy the calm." />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {items.map((item, i) => {
              const style = URGENCY_STYLES[item.urgency] ?? URGENCY_STYLES.medium;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "rounded-xl border bg-card p-4 hover:border-foreground/20 transition-colors",
                    item.urgency === "critical" ? "border-red-200/80" : "border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", style.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                          {style.label}
                        </span>
                      </div>
                      <h3 className="font-medium text-[15px] leading-snug text-foreground">{item.title}</h3>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>
                      <p className="text-[13px] text-foreground/70 mt-2 leading-relaxed">{item.reason}</p>
                      <div className="mt-3">
                        <ActionButtons actions={item.actions} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </FlowSection>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
