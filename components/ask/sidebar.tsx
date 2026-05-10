"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { relativeFromNow } from "@/lib/time";
import type { Conversation } from "@/lib/conversations";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
};

export function ChatSidebar({ conversations, activeId, onSelect, onNewChat, onDelete }: Props) {
  return (
    <aside className="w-[240px] shrink-0 h-full flex flex-col rounded-2xl border border-border bg-card/60 overflow-hidden">
      <div className="p-2.5 border-b border-border">
        <Button onClick={onNewChat} size="sm" className="w-full h-8 rounded-lg">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            No conversations yet. Click <span className="font-medium">New chat</span> to start one.
          </div>
        ) : (
          <ul className="p-2 space-y-0.5">
            <AnimatePresence initial={false}>
              {conversations.map((c) => {
                const active = c.id === activeId;
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                  >
                    <div
                      role="button"
                      onClick={() => onSelect(c.id)}
                      className={cn(
                        "group cursor-pointer rounded-lg px-2.5 py-2 transition-colors flex items-start gap-2",
                        active
                          ? "bg-secondary text-foreground"
                          : "hover:bg-secondary/60 text-foreground/80"
                      )}
                    >
                      <MessageSquare
                        className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", active && "text-primary")}
                        strokeWidth={active ? 2.4 : 2}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "text-[13px] truncate",
                            active && "font-medium"
                          )}
                        >
                          {c.title || "New chat"}
                        </div>
                        <div className="text-[10.5px] text-muted-foreground truncate">
                          {c.messages.length} message{c.messages.length === 1 ? "" : "s"} ·{" "}
                          {relativeFromNow(c.updated_at)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this conversation?")) onDelete(c.id);
                        }}
                        className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </aside>
  );
}
