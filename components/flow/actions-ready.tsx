"use client";

import { motion } from "framer-motion";
import { CheckSquare, Mail, MessageCircle, ListChecks } from "lucide-react";
import { FlowSection } from "@/components/flow/section";
import { ActionButtons } from "@/components/flow/action-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionsReadyItem } from "@/types/ai";

const KIND_ICON = {
  task: CheckSquare,
  draft_email: Mail,
  reply: MessageCircle,
} as const;

export function ActionsReady({
  items,
  loading,
}: {
  items: ActionsReadyItem[];
  loading?: boolean;
}) {
  return (
    <FlowSection
      title="Actions Ready"
      icon={ListChecks}
      count={loading ? undefined : items.length}
    >
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="Inbox zero. Nothing pending review." />
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const Icon = KIND_ICON[item.kind] ?? CheckSquare;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-3.5 hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[14px] leading-snug">{item.title}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5 mb-2">{item.subtitle}</div>
                    <ActionButtons actions={item.actions} />
                  </div>
                </div>
              </motion.div>
            );
          })}
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
