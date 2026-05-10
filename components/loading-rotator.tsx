"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Rotates through a list of messages while loading. Cross-fades between them.
 * If only one message is provided, just renders it statically.
 */
export function LoadingRotator({
  messages,
  intervalMs = 1800,
  className,
  prefix,
}: {
  messages: readonly string[] | string[];
  intervalMs?: number;
  className?: string;
  prefix?: React.ReactNode;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [messages.length, intervalMs]);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {prefix}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="inline-block"
        >
          {messages[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Three-dot bouncing animation, matched to the rotator's rhythm.
 */
export function BouncingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5 items-center", className)}>
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}
