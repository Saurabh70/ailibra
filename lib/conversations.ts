"use client";

import type { AskMessage } from "@/types/ask";

/**
 * LocalStorage-backed chat history. Multiple conversations, one active.
 * Server-rendered components must guard against window being undefined.
 */

const KEY = "ailibra_chats_v3";

// Drop chats from earlier versions so stale greetings (with $ values) clear.
if (typeof window !== "undefined") {
  for (const k of ["ailibra_chats_v1", "ailibra_chats_v2"]) {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }
}

export type Conversation = {
  id: string;
  title: string;
  messages: AskMessage[];
  created_at: string;
  updated_at: string;
};

type Store = {
  conversations: Conversation[];
  active_id: string | null;
};

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readStore(): Store {
  if (typeof window === "undefined") return { conversations: [], active_id: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { conversations: [], active_id: null };
    return JSON.parse(raw) as Store;
  } catch {
    return { conversations: [], active_id: null };
  }
}

function writeStore(s: Store): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

export function listConversations(): Conversation[] {
  return readStore().conversations.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getActiveId(): string | null {
  return readStore().active_id;
}

export function getConversation(id: string): Conversation | null {
  const s = readStore();
  return s.conversations.find((c) => c.id === id) ?? null;
}

export function setActive(id: string): void {
  const s = readStore();
  s.active_id = id;
  writeStore(s);
}

export function createConversation(initialMessages: AskMessage[] = []): Conversation {
  const s = readStore();
  const now = new Date().toISOString();
  const conv: Conversation = {
    id: newId(),
    title: "New chat",
    messages: initialMessages,
    created_at: now,
    updated_at: now,
  };
  s.conversations.push(conv);
  s.active_id = conv.id;
  writeStore(s);
  return conv;
}

export function deleteConversation(id: string): void {
  const s = readStore();
  s.conversations = s.conversations.filter((c) => c.id !== id);
  if (s.active_id === id) {
    s.active_id = s.conversations[0]?.id ?? null;
  }
  writeStore(s);
}

export function appendMessage(id: string, msg: AskMessage): Conversation | null {
  const s = readStore();
  const conv = s.conversations.find((c) => c.id === id);
  if (!conv) return null;
  conv.messages.push(msg);
  conv.updated_at = new Date().toISOString();
  // Auto-title from first user message.
  if (conv.title === "New chat" && msg.role === "user") {
    conv.title = msg.content.slice(0, 40);
  }
  writeStore(s);
  return conv;
}

export function updateConversation(id: string, mutate: (c: Conversation) => void): void {
  const s = readStore();
  const conv = s.conversations.find((c) => c.id === id);
  if (!conv) return;
  mutate(conv);
  conv.updated_at = new Date().toISOString();
  writeStore(s);
}

export function clearAll(): void {
  writeStore({ conversations: [], active_id: null });
}
