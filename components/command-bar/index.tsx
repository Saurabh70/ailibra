"use client";

import { useState, useTransition, KeyboardEvent } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommandResponsePanel } from "@/components/command-bar/response-panel";
import { clearCache } from "@/lib/client-cache";
import type { PriorityAction } from "@/types/ai";
import type { CommandActionLog } from "@/lib/anthropic/command-tools";

type CommandResponse = {
  summary: string;
  actions: PriorityAction[];
  log: CommandActionLog[];
  error?: string;
};

export function CommandBar() {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  const [panelOpen, setPanelOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [log, setLog] = useState<CommandActionLog[]>([]);
  const [actions, setActions] = useState<PriorityAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = value.trim();
    if (!text || pending) return;
    setPending(true);
    setPanelOpen(true);
    setSummary("");
    setLog([]);
    setActions([]);
    setError(null);

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as CommandResponse;
      setSummary(data.summary || "");
      setLog(data.log || []);
      setActions(data.actions || []);
      if (data.error) setError(data.error);
      // Invalidate caches so Flow / Pipeline refresh on next visit.
      startTransition(() => {
        clearCache("priorities");
        clearCache("flow_stats");
        clearCache("deals_list");
        clearCache("contacts_list");
      });
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="px-4 mt-3">
      <div className="py-1">
        <div
          className={cn(
            "max-w-3xl mx-auto flex items-center gap-3 rounded-xl border border-border bg-card",
            "px-4 py-2.5 shadow-sm transition-all",
            "focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15"
          )}
        >
          <Sparkles
            className={cn(
              "w-4 h-4 shrink-0",
              pending ? "text-primary animate-pulse-soft" : "text-primary"
            )}
            strokeWidth={2.4}
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={pending}
            placeholder={
              pending
                ? "Working on it…"
                : "Talk to your CRM… log a call, ask a question, draft an email."
            }
            className="flex-1 bg-transparent border-0 outline-none text-[14px] placeholder:text-muted-foreground"
          />
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={pending || !value.trim()}
            className="h-7 w-7 p-0 rounded-md"
          >
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.6} />
          </Button>
        </div>

        <CommandResponsePanel
          open={panelOpen}
          loading={pending}
          summary={summary}
          log={log}
          actions={actions}
          error={error}
          onClose={() => setPanelOpen(false)}
        />
      </div>
    </div>
  );
}
