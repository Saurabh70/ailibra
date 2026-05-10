"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Calendar, FileText, CheckSquare, TrendingUp, Sparkles, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { relativeFromNow, formatIST } from "@/lib/time";
import { formatINR } from "@/lib/format";

const TYPE_ICON: Record<string, LucideIcon> = {
  email: Mail,
  call: Phone,
  meeting: Calendar,
  note: FileText,
  task: FileText,
};

type RecentResp = {
  activities: any[];
  tasks: any[];
  deals: any[];
};

export function RecentCaptures({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<RecentResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/capture/recent", { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as RecentResp;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ activities: [], tasks: [], deals: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const total = (data?.activities.length ?? 0) + (data?.tasks.length ?? 0) + (data?.deals.length ?? 0);

  return (
    <aside className="w-[300px] shrink-0 border-l border-border h-full flex flex-col bg-card/40">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2.4} />
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Captured (24h)
          </h3>
          {!loading && (
            <span className="text-[11px] text-muted-foreground/70 ml-auto">{total}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="text-center text-[12px] text-muted-foreground px-4 py-6">
            Nothing captured today yet. Tell me what just happened →
          </div>
        ) : (
          <div className="space-y-3">
            {data!.activities.length > 0 && (
              <Section title="Activities" count={data!.activities.length}>
                {data!.activities.map((a) => {
                  const Icon = TYPE_ICON[a.type] ?? FileText;
                  return (
                    <Card key={a.id}>
                      <CardHeader icon={Icon} label={a.type} when={a.created_at} />
                      {a.subject && <div className="text-[13px] font-medium leading-snug">{a.subject}</div>}
                      {(a.ai_summary || a.content) && (
                        <div className="text-[12px] text-foreground/70 leading-relaxed mt-0.5 line-clamp-2">
                          {a.ai_summary ?? a.content}
                        </div>
                      )}
                      {a.contact && (
                        <div className="text-[10.5px] text-muted-foreground mt-1">
                          with {a.contact.name}
                          {a.deal?.name && ` · ${a.deal.name}`}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </Section>
            )}

            {data!.tasks.length > 0 && (
              <Section title="Tasks created" count={data!.tasks.length}>
                {data!.tasks.map((t) => (
                  <Card key={t.id}>
                    <CardHeader icon={CheckSquare} label="task" when={t.created_at} />
                    <div className="text-[13px] leading-snug">{t.description}</div>
                    <div className="text-[10.5px] text-muted-foreground mt-1">
                      {t.due_date && <>due {formatIST(t.due_date, "d MMM")} · </>}
                      {t.deal?.name}
                    </div>
                  </Card>
                ))}
              </Section>
            )}

            {data!.deals.length > 0 && (
              <Section title="Deals updated" count={data!.deals.length}>
                {data!.deals.map((d) => (
                  <Card key={d.id}>
                    <CardHeader icon={TrendingUp} label="deal" when={d.updated_at} />
                    <div className="text-[13px] font-medium leading-snug">{d.name}</div>
                    <div className="text-[10.5px] text-muted-foreground mt-1">
                      {d.company?.name} · {formatINR(Number(d.value))} · {d.stage}
                    </div>
                  </Card>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider font-medium text-muted-foreground/80 mb-1.5 px-1">
        {title} · {count}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">{children}</div>
  );
}

function CardHeader({ icon: Icon, label, when }: { icon: LucideIcon; label: string; when: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-0.5">
      <Icon className="w-3 h-3 text-muted-foreground" strokeWidth={2.2} />
      <span className={cn("text-[10px] uppercase tracking-wider text-muted-foreground")}>{label}</span>
      <span className="text-[10px] text-muted-foreground/60 ml-auto">{relativeFromNow(when)}</span>
    </div>
  );
}
