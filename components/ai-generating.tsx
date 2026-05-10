"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { LoadingRotator } from "@/components/loading-rotator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Variant = "card" | "inline" | "compact";

/**
 * Reusable AI-is-generating indicator.
 * - "card"    — full pulsing card with shimmer (use inside dialogs / large surfaces)
 * - "inline"  — header + skeleton lines (use for AI summary cards)
 * - "compact" — single-line with rotator (use for small footers / status bars)
 */
export function AIGenerating({
  title = "Working on it",
  messages,
  variant = "inline",
  skeletonLines = 3,
  className,
}: {
  title?: string;
  messages: readonly string[] | string[];
  variant?: Variant;
  skeletonLines?: number;
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 text-[13px] text-muted-foreground", className)}>
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" strokeWidth={2.4} />
        <LoadingRotator messages={messages} />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 px-5 py-7 flex flex-col items-center text-center",
          className
        )}
      >
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-shimmer" />
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center mb-3 relative"
        >
          <Sparkles className="w-5 h-5 text-primary" strokeWidth={2.4} />
        </motion.div>
        <div className="text-[14px] font-medium text-foreground/90 mb-0.5 relative">{title}</div>
        <div className="text-[12.5px] text-muted-foreground relative">
          <LoadingRotator messages={messages} />
        </div>
      </div>
    );
  }

  // Inline: header line + skeleton stack with shimmer.
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-2 text-[12px] text-primary/85">
        <Sparkles className="w-3.5 h-3.5 animate-pulse-soft" strokeWidth={2.4} />
        <LoadingRotator messages={messages} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-3.5 rounded-md",
              i === skeletonLines - 1 ? "w-2/3" : i === 0 ? "w-full" : "w-5/6"
            )}
          />
        ))}
      </div>
    </div>
  );
}
