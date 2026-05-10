"use client";

import { motion } from "framer-motion";
import { Sparkles, Wrench } from "lucide-react";
import { Markdown } from "@/components/ask/markdown";
import { ActionButton } from "@/components/action-button";
import { LoadingRotator, BouncingDots } from "@/components/loading-rotator";
import { LOADING } from "@/lib/loading-messages";
import type { AskMessage } from "@/types/ask";

export function MessageBubble({ message }: { message: AskMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3.5 py-2 text-[13.5px] leading-relaxed">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.tool_calls.map((tc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground bg-secondary/60 rounded-md px-1.5 py-0.5"
              >
                <Wrench className="w-2.5 h-2.5" />
                {tc.result_summary ?? tc.name}
              </span>
            ))}
          </div>
        )}
        <Markdown>{message.content}</Markdown>
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.actions.map((a, i) => (
              <ActionButton key={i} action={a} primary={i === 0} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ThinkingBubble() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" strokeWidth={2.4} />
      </div>
      <div className="text-muted-foreground text-[13px] pt-1">
        <LoadingRotator messages={LOADING.ask} />
        <BouncingDots className="ml-1.5 text-muted-foreground/70" />
      </div>
    </motion.div>
  );
}
