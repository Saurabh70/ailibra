"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { relativeFromNow } from "@/lib/time";

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-neutral-50 text-neutral-600 border-neutral-200",
  negative: "bg-red-50 text-red-700 border-red-200",
};

export type ContactCardData = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  avatar_url: string | null;
  last_interaction: string | null;
  sentiment: string;
  engagement_score: number;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContactCard({ contact, index }: { contact: ContactCardData; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Link
        href={`/explore/contact/${contact.id}`}
        className="block rounded-xl border border-border bg-card hover:border-foreground/25 hover:shadow-sm transition-all p-3.5 group"
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            {contact.avatar_url && <AvatarImage src={contact.avatar_url} alt={contact.name} />}
            <AvatarFallback className="text-[11px] bg-secondary">{initials(contact.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[14px] truncate group-hover:text-primary transition-colors">
                {contact.name}
              </h3>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-medium",
                  SENTIMENT_STYLE[contact.sentiment] ?? SENTIMENT_STYLE.neutral
                )}
              >
                {contact.sentiment}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">{contact.role ?? "—"}</div>
            <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-muted-foreground/80">
              <span>
                {contact.last_interaction
                  ? `last ${relativeFromNow(contact.last_interaction)}`
                  : "no contact yet"}
              </span>
              <span className="tabular-nums">engagement {contact.engagement_score}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
