"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Mail, FileEdit, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HealthCircle } from "@/components/deal/health-circle";
import { Timeline, type TimelineActivity } from "@/components/deal/timeline";
import { HealthBreakdown, type HealthMetrics } from "@/components/deal/health-breakdown";
import { ContactCard, type ContactCardData } from "@/components/contact/card";
import { DealAISummary } from "@/components/deal/ai-summary";
import { DraftEmailDialog } from "@/components/deal/draft-email-dialog";
import { StageDropdown } from "@/components/deal/stage-dropdown";
import { ScheduleMeetingDialog } from "@/components/deal/schedule-meeting-dialog";
import { formatIST } from "@/lib/time";
import { formatINR } from "@/lib/format";

type DealDetail = {
  deal: {
    id: string;
    name: string;
    value: number;
    stage: string;
    health_score: number;
    health_reason: string | null;
    expected_close: string | null;
    risk_level: string;
    ai_summary: string | null;
    company: { id: string; name: string; industry: string | null; size: string | null } | null;
    primary_contact: { id: string; name: string; role: string | null; email: string | null } | null;
  };
  activities: TimelineActivity[];
  contacts: ContactCardData[];
  tasks: Array<{ id: string; description: string; due_date: string | null; priority: string; status: string }>;
  health_metrics: HealthMetrics;
  days_in_stage: number;
};

const formatValue = formatINR;

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<DealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftIntent, setDraftIntent] = useState<string | undefined>(undefined);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/deals/${params.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = (await res.json()) as DealDetail;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

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
  if (!data) return <DealDetailSkeleton />;

  const { deal, activities, contacts, tasks, health_metrics, days_in_stage } = data;

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto pb-20">
      <BackLink />

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-4">
          <HealthCircle score={deal.health_score} size={56} strokeWidth={4} />
          <div>
            <Link
              href={deal.company ? `/explore?company=${deal.company.id}` : "/explore"}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Building2 className="w-3 h-3" />
              {deal.company?.name ?? "—"}
              {deal.company?.industry && (
                <span className="text-muted-foreground/70">· {deal.company.industry}</span>
              )}
            </Link>
            <h1 className="text-[24px] font-semibold tracking-tight mt-0.5">{deal.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StageDropdown
                dealId={deal.id}
                currentStage={deal.stage}
                onUpdated={(s) => setData({ ...data, deal: { ...deal, stage: s } })}
              />
              <span className="text-[13px] text-muted-foreground">{days_in_stage}d in stage</span>
              {deal.expected_close && (
                <span className="text-[13px] text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Closes {formatIST(deal.expected_close, "d MMM")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[28px] font-semibold tabular-nums tracking-tight">
            {formatValue(deal.value)}
          </div>
          {deal.health_reason && (
            <div className="text-[12px] text-muted-foreground max-w-xs mt-1">{deal.health_reason}</div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setDraftOpen(true)}>
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          Draft Follow-Up
        </Button>
        <Button size="sm" variant="outline" onClick={() => setScheduleOpen(true)}>
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Schedule Meeting
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info("Use the command bar at the top to log activities in plain English.")}
        >
          <FileEdit className="w-3.5 h-3.5 mr-1.5" />
          Log Activity
        </Button>
      </div>

      <DraftEmailDialog
        open={draftOpen}
        onOpenChange={(v) => {
          setDraftOpen(v);
          if (!v) setDraftIntent(undefined);
        }}
        dealId={deal.id}
        contactId={deal.primary_contact?.id}
        intent={draftIntent}
      />

      <ScheduleMeetingDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        dealId={deal.id}
        dealName={deal.name}
        contactId={deal.primary_contact?.id}
        contactEmail={deal.primary_contact?.email ?? undefined}
      />


      {/* AI Summary */}
      <div className="mt-5">
        <DealAISummary
          dealId={deal.id}
          initialSummary={deal.ai_summary}
          onDraftEmail={(intent) => {
            setDraftIntent(intent);
            setDraftOpen(true);
          }}
        />
      </div>

      {/* Two-col body */}
      <div className="mt-7 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {tasks.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-muted-foreground" strokeWidth={2.2} />
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Open Tasks · {tasks.filter((t) => t.status === "pending").length}
                </h2>
              </div>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status === "pending")
                  .map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-border bg-card px-3.5 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="text-[14px]">{t.description}</div>
                      {t.due_date && (
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          due {formatIST(t.due_date, "d MMM")}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Activity · {activities.length}
            </h2>
            <Timeline activities={activities} />
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              People · {contacts.length}
            </h2>
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <ContactCard key={c.id} contact={c} index={i} />
              ))}
            </div>
          </section>

          <HealthBreakdown metrics={health_metrics} />
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
      Back to Pipeline
    </Link>
  );
}

function DealDetailSkeleton() {
  return (
    <div className="px-8 py-7 max-w-6xl mx-auto pb-20">
      <BackLink />
      <div className="mt-4 flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="space-y-2 flex-1 max-w-md">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
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
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
