"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  Wand2,
  ArrowRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Timeline, type TimelineActivity } from "@/components/deal/timeline";
import { HealthCircle } from "@/components/deal/health-circle";
import { StageBadge } from "@/components/deal/stage-badge";
import { RelationshipSummary } from "@/components/contact/relationship-summary";
import { cn } from "@/lib/utils";
import { formatIST, relativeFromNow } from "@/lib/time";
import { clearCache } from "@/lib/client-cache";
import { formatINR } from "@/lib/format";

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-neutral-50 text-neutral-600 border-neutral-200",
  negative: "bg-red-50 text-red-700 border-red-200",
};

type ContactDetail = {
  contact: {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    avatar_url: string | null;
    relationship_summary: string | null;
    sentiment: string;
    engagement_score: number;
    enriched_at: string | null;
    last_interaction: string | null;
    company: { id: string; name: string; industry: string | null; size: string | null } | null;
  };
  activities: TimelineActivity[];
  deals: Array<{
    id: string;
    name: string;
    value: number;
    stage: string;
    health_score: number;
    expected_close: string | null;
  }>;
};

const formatValue = formatINR;
function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/contacts/${params.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = (await res.json()) as ContactDetail;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function enrich() {
    setEnriching(true);
    try {
      const res = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact_id: params.id }),
      });
      const out = await res.json();
      if (!res.ok) {
        toast.error(out.error ?? "Enrich failed");
        return;
      }
      if (out.cached) {
        toast.info("Already enriched recently — skipping refetch");
      } else {
        toast.success(out.demo ? "Enriched (demo)" : "Enriched via Apollo");
      }
      clearCache("contacts_list");
      await load();
    } finally {
      setEnriching(false);
    }
  }

  if (error) {
    return (
      <div className="px-8 py-7 max-w-6xl mx-auto">
        <BackLink />
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }
  if (!data) return <ContactDetailSkeleton />;

  const { contact, activities, deals } = data;

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto pb-20">
      <BackLink />

      {/* Header */}
      <div className="mt-4 flex items-start gap-4">
        <Avatar className="w-14 h-14">
          {contact.avatar_url && <AvatarImage src={contact.avatar_url} alt={contact.name} />}
          <AvatarFallback className="text-base bg-secondary">{initials(contact.name)}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-tight">{contact.name}</h1>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-medium",
                SENTIMENT_STYLE[contact.sentiment] ?? SENTIMENT_STYLE.neutral
              )}
            >
              {contact.sentiment}
            </span>
          </div>
          <div className="text-[13px] text-muted-foreground mt-0.5">
            {contact.role ?? "—"}
            {contact.company && (
              <Link
                href="/explore"
                className="hover:text-foreground inline-flex items-center gap-1 ml-1"
              >
                · <Building2 className="w-3 h-3 inline mx-0.5" /> {contact.company.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[12px] text-muted-foreground flex-wrap">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Mail className="w-3 h-3" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Phone className="w-3 h-3" /> {contact.phone}
              </a>
            )}
            {contact.linkedin && (
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="w-3 h-3" /> LinkedIn
              </a>
            )}
            <span>engagement {contact.engagement_score}</span>
            {contact.last_interaction && (
              <span>last touch {relativeFromNow(contact.last_interaction)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => toast.info("Draft Email — wires up in Phase 5")}>
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          Draft Email
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info("Schedule Meeting — wires up in Phase 7")}
        >
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Schedule Meeting
        </Button>
        <Button size="sm" variant="outline" onClick={enrich} disabled={enriching}>
          {enriching ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
          )}
          {enriching ? "Enriching…" : "Enrich"}
        </Button>
      </div>

      {/* Relationship Summary */}
      <div className="mt-5">
        <RelationshipSummary contactId={contact.id} initialSummary={contact.relationship_summary} />
      </div>

      {/* Two-col body */}
      <div className="mt-7 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Activity · {activities.length}
          </h2>
          <Timeline activities={activities} />
        </section>

        <aside>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Connected Deals · {deals.length}
          </h2>
          {deals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No deals yet.
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/explore/deal/${d.id}`}
                  className="block rounded-xl border border-border bg-card hover:border-foreground/25 hover:shadow-sm transition-all p-3 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <HealthCircle score={d.health_score} size={36} strokeWidth={3} />
                      <div className="min-w-0">
                        <div className="font-medium text-[13.5px] truncate group-hover:text-primary transition-colors">
                          {d.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <StageBadge stage={d.stage} />
                          {d.expected_close && (
                            <span className="text-[11px] text-muted-foreground">
                              {formatIST(d.expected_close, "d MMM")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-[13.5px] tabular-nums">
                        {formatValue(d.value)}
                      </div>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity inline-block mt-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/explore"
      className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to People
    </Link>
  );
}

function ContactDetailSkeleton() {
  return (
    <div className="px-8 py-7 max-w-6xl mx-auto pb-20">
      <BackLink />
      <div className="mt-4 flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="space-y-2 flex-1 max-w-md">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
      <Skeleton className="mt-6 h-32 rounded-xl" />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
