import { Mail, Users, Clock, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

export type HealthMetrics = {
  email_velocity: number;
  stakeholder_engagement: number;
  response_time: number;
  stage_duration: number;
};

const ROWS: Array<{
  key: keyof HealthMetrics;
  label: string;
  icon: typeof Mail;
  hint: string;
}> = [
  { key: "email_velocity", label: "Email velocity", icon: Mail, hint: "Email cadence over the last 14 days." },
  { key: "stakeholder_engagement", label: "Stakeholder engagement", icon: Users, hint: "Distinct contacts engaged recently." },
  { key: "response_time", label: "Response time", icon: Clock, hint: "How quickly the conversation moves." },
  { key: "stage_duration", label: "Stage duration", icon: Hourglass, hint: "How long the deal has been in this stage." },
];

export function HealthBreakdown({ metrics }: { metrics: HealthMetrics }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Health Breakdown
      </div>
      <div className="space-y-3.5">
        {ROWS.map(({ key, label, icon: Icon, hint }) => {
          const v = Math.max(0, Math.min(100, metrics[key]));
          const tier = v >= 70 ? "good" : v >= 40 ? "warn" : "bad";
          const bar =
            tier === "good"
              ? "bg-emerald-500"
              : tier === "warn"
                ? "bg-amber-500"
                : "bg-red-500";
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-[13px]">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.2} />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-[12px] tabular-nums text-muted-foreground">{v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", bar)}
                  style={{ width: `${v}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground/70 mt-1">{hint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
