"use client";

import { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  question: string;
  options: string[];
  allowCustom: boolean;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
};

export function QuestionCard({ question, options, allowCustom, onAnswer, disabled }: Props) {
  const [custom, setCustom] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  function pick(opt: string) {
    if (disabled) return;
    if (opt.toLowerCase() === "other" || opt.toLowerCase() === "type your own") {
      setShowCustomInput(true);
      return;
    }
    onAnswer(opt);
  }

  function submitCustom() {
    const v = custom.trim();
    if (!v || disabled) return;
    onAnswer(v);
    setCustom("");
    setShowCustomInput(false);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitCustom();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5"
    >
      <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Sparkles className="w-3 h-3 text-primary" strokeWidth={2.4} />
        ailibra
      </div>
      <p className="text-[14.5px] leading-relaxed font-medium text-foreground/90 mb-3">{question}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <motion.button
            key={`${opt}-${i}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            type="button"
            onClick={() => pick(opt)}
            disabled={disabled}
            className={cn(
              "text-left text-[13px] px-3 py-2 rounded-lg border border-border bg-card",
              "hover:border-primary/60 hover:bg-primary/5 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-between gap-2"
            )}
          >
            <span>{opt}</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </motion.button>
        ))}

        {allowCustom && (
          <motion.button
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: options.length * 0.04 }}
            type="button"
            onClick={() => setShowCustomInput((v) => !v)}
            disabled={disabled}
            className={cn(
              "text-left text-[13px] px-3 py-2 rounded-lg border border-dashed border-border bg-card",
              "hover:border-primary/60 hover:bg-primary/5 transition-all",
              "text-muted-foreground"
            )}
          >
            {showCustomInput ? "Hide custom input" : "✏️ Type a custom answer"}
          </motion.button>
        )}
      </div>

      {showCustomInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3"
        >
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type your answer…"
              className="flex-1"
              disabled={disabled}
            />
            <Button size="sm" onClick={submitCustom} disabled={!custom.trim() || disabled}>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
