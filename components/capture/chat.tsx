"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/capture/question-card";
import { RecentCaptures } from "@/components/capture/recent-captures";
import { LoadingRotator, BouncingDots } from "@/components/loading-rotator";
import { LOADING } from "@/lib/loading-messages";
import { toast } from "sonner";
import { clearCache } from "@/lib/client-cache";
import { cn } from "@/lib/utils";
import type { CommandActionLog } from "@/lib/anthropic/command-tools";

const SUGGESTIONS = [
  "Had a call with Razorpay",
  "Met with Zerodha team this morning",
  "Sent the proposal to Swiggy",
  "Got a no-show from Nykaa",
];

type Msg =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      kind: "question";
      question: string;
      options: string[];
      allow_custom: boolean;
      answered?: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "summary";
      summary: string;
      log: CommandActionLog[];
    }
  | { id: string; role: "assistant"; kind: "thinking" };

function newId(): string {
  return Math.random().toString(36).slice(2);
}

type CaptureResponse =
  | { status: "asking"; question: string; options: string[]; allow_custom: boolean }
  | { status: "committed"; summary: string; log: CommandActionLog[] }
  | { status: "error"; error: string };

export function CaptureChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function reset() {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  function buildHistory(currentMessages: Msg[]): Array<{ role: "user" | "assistant"; content: string }> {
    return currentMessages
      .filter((m) => m.role === "user" || (m.role === "assistant" && (m as any).kind === "question"))
      .map((m) => {
        if (m.role === "user") return { role: "user" as const, content: m.text };
        const q = m as Extract<Msg, { kind: "question" }>;
        const optionsLine =
          q.options.length > 0 ? `\nOptions: ${q.options.join(" / ")}` : "";
        return { role: "assistant" as const, content: q.question + optionsLine };
      });
  }

  async function sendTurn(currentMessages: Msg[]) {
    setPending(true);
    setMessages((m) => [...m, { id: newId(), role: "assistant", kind: "thinking" }]);
    try {
      const res = await fetch("/api/capture/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: buildHistory(currentMessages) }),
      });
      const data = (await res.json()) as CaptureResponse;
      // Drop thinking placeholder.
      setMessages((m) => m.filter((x) => !(x.role === "assistant" && (x as any).kind === "thinking")));

      if (data.status === "asking") {
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: "assistant",
            kind: "question",
            question: data.question,
            options: data.options,
            allow_custom: data.allow_custom,
          },
        ]);
      } else if (data.status === "committed") {
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: "assistant",
            kind: "summary",
            summary: data.summary,
            log: data.log,
          },
        ]);
        // Invalidate downstream caches.
        clearCache("priorities");
        clearCache("flow_stats");
        clearCache("deals_list");
        clearCache("contacts_list");
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(data.error ?? "Capture failed");
      }
    } catch (err) {
      setMessages((m) => m.filter((x) => !(x.role === "assistant" && (x as any).kind === "thinking")));
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function startWith(text: string) {
    if (pending || !text.trim()) return;
    const userMsg: Msg = { id: newId(), role: "user", text: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    sendTurn(next);
  }

  function answerQuestion(questionId: string, answer: string) {
    if (pending) return;
    setMessages((m) =>
      m.map((x) =>
        x.id === questionId && x.role === "assistant" && x.kind === "question"
          ? { ...x, answered: answer }
          : x
      )
    );
    const userMsg: Msg = { id: newId(), role: "user", text: answer };
    const next = [
      ...messages.map((x) =>
        x.id === questionId && x.role === "assistant" && x.kind === "question"
          ? { ...x, answered: answer }
          : x
      ),
      userMsg,
    ];
    setMessages(next);
    sendTurn(next);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startWith(input);
    }
  }

  // Latest active question (the one not yet answered).
  const liveQuestionIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && (m as any).kind === "question" && !(m as any).answered) {
        return i;
      }
    }
    return -1;
  })();

  return (
    <div className="flex h-[calc(100vh-130px)] rounded-xl border border-border bg-card overflow-hidden mx-4 my-3">
      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2.4} />
              Capture
            </div>
            <h1 className="text-[18px] font-semibold tracking-tight mt-0.5">
              Tell me what just happened
            </h1>
            <p className="text-[12px] text-muted-foreground">
              I&apos;ll figure out the rest with one question at a time.
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>
              <RotateCcw className="w-3 h-3 mr-1" /> New capture
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <EmptyState onPick={startWith} />
            ) : (
              <AnimatePresence>
                {messages.map((m, i) => {
                  if (m.role === "user") {
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end"
                      >
                        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-[14px] leading-relaxed">
                          {m.text}
                        </div>
                      </motion.div>
                    );
                  }
                  if (m.kind === "thinking") {
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-muted-foreground text-[13px] py-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" strokeWidth={2.4} />
                        <LoadingRotator messages={LOADING.capture} />
                        <BouncingDots className="text-muted-foreground/70" />
                      </motion.div>
                    );
                  }
                  if (m.kind === "question") {
                    const isLive = i === liveQuestionIdx && !m.answered;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(!isLive && "opacity-70")}
                      >
                        <QuestionCard
                          question={m.question}
                          options={m.options}
                          allowCustom={m.allow_custom}
                          disabled={!isLive || pending}
                          onAnswer={(a) => answerQuestion(m.id, a)}
                        />
                      </motion.div>
                    );
                  }
                  if (m.kind === "summary") {
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3.5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.4} />
                          <span className="text-[11px] uppercase tracking-wider font-medium text-emerald-800">
                            Captured
                          </span>
                        </div>
                        <p className="text-[14px] leading-relaxed text-foreground/90">{m.summary}</p>
                        {m.log.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-1">
                            {m.log.map((entry, k) => (
                              <div key={k} className="flex items-start gap-2 text-[12px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-mono text-muted-foreground">{entry.tool}</span>
                                  <span className="text-foreground/80"> · {entry.result}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs mt-3" onClick={reset}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Capture another
                        </Button>
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Input — only when no live question is active */}
        {liveQuestionIdx === -1 && (
          <div className="border-t border-border p-3">
            <div className="max-w-3xl mx-auto">
              <div className="rounded-xl border border-border bg-card focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  disabled={pending}
                  rows={1}
                  placeholder={pending ? "Thinking…" : "Tell me what just happened…"}
                  className="w-full resize-none bg-transparent border-0 outline-none px-4 py-3 text-[14px] placeholder:text-muted-foreground"
                />
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-[11px] text-muted-foreground/70 px-2">
                    ⏎ to send
                  </span>
                  <Button
                    size="sm"
                    className="h-7 w-7 p-0 rounded-md"
                    onClick={() => startWith(input)}
                    disabled={pending || !input.trim()}
                  >
                    <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <RecentCaptures refreshKey={refreshKey} />
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="py-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
          <Sparkles className="w-5 h-5 text-primary" strokeWidth={2.2} />
        </div>
        <h2 className="text-[18px] font-semibold mb-1">What just happened?</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Type anything — a call, a meeting, an email. I&apos;ll ask one question at a time
          to fill in the rest.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="px-3 py-1.5 rounded-full border border-border bg-card text-[13px] text-foreground/80 hover:border-foreground/30 hover:text-foreground transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
