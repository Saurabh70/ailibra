"use client";

import { motion } from "framer-motion";
import { Mail, Phone, Calendar, FileText, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIST, relativeFromNow } from "@/lib/time";

const TYPE_META: Record<string, { icon: LucideIcon; label: string }> = {
  email: { icon: Mail, label: "Email" },
  call: { icon: Phone, label: "Call" },
  meeting: { icon: Calendar, label: "Meeting" },
  note: { icon: FileText, label: "Note" },
  task: { icon: FileText, label: "Task" },
};

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-neutral-400",
  negative: "bg-red-500",
};

export type TimelineActivity = {
  id: string;
  type: string;
  subject: string | null;
  content: string | null;
  ai_summary: string | null;
  sentiment: string;
  source: string;
  created_at: string;
  contact?: { id: string; name: string; role: string | null } | null;
};

export function Timeline({ activities }: { activities: TimelineActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No activity logged yet.
      </div>
    );
  }
  return (
    <ol className="relative space-y-3">
      {activities.map((a, i) => {
        const meta = TYPE_META[a.type] ?? { icon: FileText, label: a.type };
        const Icon = meta.icon;
        const isAI = a.source === "gmail" || a.source === "calendar" || a.source === "ai";
        return (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="rounded-xl border border-border bg-card p-3.5"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                    {meta.label}
                  </span>
                  <span className={cn("w-1.5 h-1.5 rounded-full", SENTIMENT_DOT[a.sentiment] ?? SENTIMENT_DOT.neutral)} />
                  {isAI && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                      <Sparkles className="w-2.5 h-2.5" /> auto-captured
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground/80">
                    {relativeFromNow(a.created_at)} · {formatIST(a.created_at, "d MMM h:mm a")}
                  </span>
                </div>
                {a.subject && (
                  <h4 className="text-[14px] font-medium text-foreground leading-snug">{a.subject}</h4>
                )}
                {(a.ai_summary || a.content) && (
                  <p className="text-[13px] text-foreground/75 leading-relaxed mt-1">
                    {a.ai_summary ?? a.content}
                  </p>
                )}
                {a.contact && (
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    with {a.contact.name}
                    {a.contact.role && <span> · {a.contact.role}</span>}
                  </div>
                )}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
