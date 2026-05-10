"use client";

import { motion } from "framer-motion";
import { CalendarClock, ExternalLink } from "lucide-react";
import { FlowSection } from "@/components/flow/section";
import { ActionButtons } from "@/components/flow/action-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComingUpItem } from "@/types/ai";
import { formatIST } from "@/lib/time";

export function ComingUp({
  items,
  loading,
}: {
  items: ComingUpItem[];
  loading?: boolean;
}) {
  return (
    <FlowSection title="Coming Up" icon={CalendarClock} count={loading ? undefined : items.length}>
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="No meetings in the next 24 hours." />
      ) : (
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-medium text-[15px] leading-snug">{item.title}</h3>
                {item.scheduled_for && (
                  <span className="text-[11px] tabular-nums text-muted-foreground shrink-0 mt-0.5">
                    {formatIST(item.scheduled_for, "EEE h:mm a")}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mb-2">{item.subtitle}</div>
              <p className="text-[13px] text-foreground/75 leading-relaxed mb-3">{item.brief}</p>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <ActionButtons actions={item.actions} />
                {item.location && item.location.startsWith("http") && (
                  <a
                    href={item.location}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Join <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
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
