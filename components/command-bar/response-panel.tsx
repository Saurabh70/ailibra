"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { cn } from "@/lib/utils";
import type { PriorityAction } from "@/types/ai";
import type { CommandActionLog } from "@/lib/anthropic/command-tools";

type Props = {
  open: boolean;
  loading: boolean;
  summary: string;
  log: CommandActionLog[];
  actions: PriorityAction[];
  error: string | null;
  onClose: () => void;
};

export function CommandResponsePanel({
  open,
  loading,
  summary,
  log,
  actions,
  error,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="max-w-3xl mx-auto mt-2 px-1">
            <div
              className={cn(
                "rounded-xl border bg-card p-4",
                error ? "border-red-200" : "border-primary/20"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {error ? (
                    <AlertCircle className="w-4 h-4 text-red-500" strokeWidth={2.4} />
                  ) : loading ? (
                    <Sparkles className="w-4 h-4 text-primary animate-pulse-soft" strokeWidth={2.4} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2.4} />
                  )}
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                    {error ? "Failed" : loading ? "Working…" : "Done"}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {loading && !summary ? (
                <SkeletonRows />
              ) : (
                <>
                  {summary && (
                    <p className="text-[14px] leading-relaxed text-foreground/90 mb-3">
                      {summary}
                    </p>
                  )}
                  {error && (
                    <p className="text-[13px] text-red-700 mb-3">{error}</p>
                  )}
                  {log.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {log.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-muted-foreground font-mono">{entry.tool}</span>
                            <span className="text-foreground/80"> · {entry.result}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                      {actions.map((a, i) => (
                        <ActionButton key={i} action={a} primary={i === 0} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      <div className="h-3 rounded bg-secondary animate-pulse-soft" />
      <div className="h-3 rounded bg-secondary animate-pulse-soft w-5/6" />
      <div className="h-3 rounded bg-secondary animate-pulse-soft w-3/4" />
    </div>
  );
}
