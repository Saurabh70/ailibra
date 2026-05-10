"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageBubble, ThinkingBubble } from "@/components/ask/message";
import { ChatSidebar } from "@/components/ask/sidebar";
import { toast } from "sonner";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  getActiveId,
  getConversation,
  listConversations,
  setActive,
  type Conversation,
} from "@/lib/conversations";
import { formatINR } from "@/lib/format";
import type { AskMessage, AskRequest, AskResponse } from "@/types/ask";

const SUGGESTIONS = [
  "How is my Q2 pipeline looking?",
  "Which deals are at risk?",
  "Prep me for the Razorpay call",
  "Draft a follow-up to Zerodha",
  "Who hasn't replied to me in 3+ days?",
];

function newId(): string {
  return Math.random().toString(36).slice(2);
}

function greetingOpener(): string {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const lateNight = h < 6;
  const morning = h >= 6 && h < 12;
  const afternoon = h >= 12 && h < 17;
  const monday = day === 1;
  const friday = day === 5;
  const weekend = day === 0 || day === 6;

  const pool: string[] = [];
  if (lateNight) pool.push("Up late, huh.", "Burning the midnight oil — what's on your mind?");
  if (morning) pool.push("Hey, morning ☕", "Look who's here.", "Good morning.");
  if (afternoon) pool.push("Hey, you're back.", "Good afternoon.", "Welcome back.");
  if (!lateNight && !morning && !afternoon)
    pool.push("Evening 🌙", "Hey, you back at it.", "Welcome back.");
  if (monday && morning) pool.push("Monday already.", "Hey — fresh week.");
  if (friday) pool.push("Friday vibes.", "TGIF.");
  if (weekend) pool.push("Weekend grind?", "Couldn't stay away?");

  return pool[Math.floor(Math.random() * pool.length)] ?? "Hey, you're back.";
}

async function buildGreeting(): Promise<AskMessage> {
  const opener = greetingOpener();
  const bullets: string[] = [];

  try {
    const res = await fetch("/api/flow/stats", { cache: "no-store" });
    if (res.ok) {
      const s = await res.json();
      const value = formatINR(s.pipeline_value ?? 0);
      const closing =
        s.deals_closing_this_month > 0
          ? `, **${s.deals_closing_this_month}** closing this month`
          : "";
      bullets.push(`**${value}** open${closing}`);
      if (s.deals_at_risk > 0) {
        bullets.push(`**${s.deals_at_risk}** at risk`);
      }
      if (s.follow_ups_due > 0) {
        bullets.push(`**${s.follow_ups_due}** follow-up${s.follow_ups_due === 1 ? "" : "s"} due today`);
      }
    }
  } catch {
    // ignore
  }

  let body = `${opener} `;
  if (bullets.length > 0) {
    body += `Here's the read on your pipeline.\n\n`;
    body += bullets.map((b) => `· ${b}`).join("\n");
    body += `\n\n`;
  } else {
    body += `Pipeline's quiet right now. `;
  }
  body += `What do you want to dig into?`;

  return {
    id: newId(),
    role: "assistant",
    content: body,
    actions: [],
    tool_calls: [],
    created_at: new Date().toISOString(),
  };
}

const SIDEBAR_KEY = "ailibra_ask_sidebar_open";

export function AskChat() {
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate. If no chats, create one with greeting.
  useEffect(() => {
    (async () => {
      // Restore sidebar preference (default: closed).
      try {
        const saved = localStorage.getItem(SIDEBAR_KEY);
        if (saved === "1") setSidebarOpen(true);
      } catch {
        // ignore
      }
      const list = listConversations();
      let active = getActiveId();
      if (list.length === 0) {
        const greeting = await buildGreeting();
        const fresh = createConversation([greeting]);
        active = fresh.id;
      } else if (!active || !list.find((c) => c.id === active)) {
        active = list[0].id;
        setActive(active);
      }
      setConversations(listConversations());
      setActiveIdState(active);
      setHydrated(true);
    })();
  }, []);

  function toggleSidebar() {
    setSidebarOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Light polling to pick up async writes from other tabs / background fetches.
  useEffect(() => {
    if (!hydrated) return;
    const interval = setInterval(() => {
      const fresh = listConversations();
      setConversations((curr) => {
        // Cheap shallow check: same length + same updated_at order.
        if (curr.length !== fresh.length) return fresh;
        for (let i = 0; i < curr.length; i++) {
          if (curr[i].id !== fresh[i].id || curr[i].updated_at !== fresh[i].updated_at) return fresh;
        }
        return curr;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [hydrated]);

  const activeConv = activeId ? conversations.find((c) => c.id === activeId) ?? getConversation(activeId) : null;
  const messages = activeConv?.messages ?? [];

  // Auto-scroll on new message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeId, messages.length, pending]);

  function pickConversation(id: string) {
    setActive(id);
    setActiveIdState(id);
  }

  async function handleNewChat() {
    const greeting = await buildGreeting();
    const fresh = createConversation([greeting]);
    setConversations(listConversations());
    setActiveIdState(fresh.id);
    inputRef.current?.focus();
  }

  function handleDelete(id: string) {
    deleteConversation(id);
    const fresh = listConversations();
    setConversations(fresh);
    if (activeId === id) {
      setActiveIdState(fresh[0]?.id ?? null);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending || !activeId) return;
    const userMsg: AskMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    appendMessage(activeId, userMsg);
    setConversations(listConversations());
    setInput("");
    setPending(true);

    try {
      const history = (getConversation(activeId)?.messages ?? [])
        .filter((m) => m.id !== userMsg.id)
        .map((m) => ({ role: m.role, content: m.content }));
      const body: AskRequest = { message: trimmed, history };
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AskResponse;
      if (!res.ok || data.error) {
        appendMessage(activeId, {
          id: newId(),
          role: "assistant",
          content: `❌ ${data.error ?? `Request failed (${res.status})`}`,
          created_at: new Date().toISOString(),
        });
      } else {
        appendMessage(activeId, {
          id: newId(),
          role: "assistant",
          content: data.answer,
          actions: data.actions,
          tool_calls: data.tool_calls,
          created_at: new Date().toISOString(),
        });
      }
      setConversations(listConversations());
    } catch (err) {
      appendMessage(activeId, {
        id: newId(),
        role: "assistant",
        content: `❌ ${err instanceof Error ? err.message : "Network error"}`,
        created_at: new Date().toISOString(),
      });
      setConversations(listConversations());
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  if (!hydrated) {
    return <div className="flex-1" />;
  }

  return (
    <div className="flex h-[calc(100vh-100px)] mx-4 mb-4 mt-2 gap-4">
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0, marginRight: 0 }}
            animate={{ width: 240, opacity: 1, marginRight: 0 }}
            exit={{ width: 0, opacity: 0, marginRight: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden shrink-0"
          >
            <ChatSidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={pickConversation}
              onNewChat={handleNewChat}
              onDelete={handleDelete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar with sidebar toggle */}
        <div className="flex items-center justify-between pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-7 text-[12px] text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <PanelLeft className="w-3.5 h-3.5 mr-1.5" />
            )}
            {sidebarOpen ? "Hide history" : "History"}
            {!sidebarOpen && conversations.length > 0 && (
              <span className="ml-1 text-[10.5px] text-muted-foreground/70">
                · {conversations.length}
              </span>
            )}
          </Button>
          {!sidebarOpen && (
            <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={handleNewChat}>
              + New chat
            </Button>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto px-1 py-2 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-12">
                Start by asking something below.
              </div>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
            {pending && <ThinkingBubble />}
            {messages.length === 1 && messages[0].role === "assistant" && !pending && (
              <div className="pl-10 flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-2.5 py-1 rounded-full border border-border bg-card/60 text-[12.5px] text-foreground/75 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="pt-2 px-1">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={pending}
                rows={1}
                placeholder={pending ? "Thinking…" : "Ask anything…"}
                className="w-full resize-none bg-transparent border-0 outline-none px-4 pt-3 pb-1 text-[14px] placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[10.5px] text-muted-foreground/60">
                  ⏎ to send · ⇧⏎ for newline
                </span>
                <Button
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={() => send(input)}
                  disabled={pending || !input.trim()}
                >
                  <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.6} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
