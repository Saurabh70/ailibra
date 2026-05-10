"use client";

import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Wand2, Plug, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type IntegrationStatus = "connected" | "demo" | "available" | "soon";

export type IntegrationDef = {
  id: string;
  name: string;
  desc: string;
  badge?: string;
  icon: LucideIcon;
  brandColor?: string;
  status: IntegrationStatus;
  primaryAction?: { label: string; onClick?: () => void; href?: string };
  secondaryAction?: { label: string; onClick?: () => void };
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: "Connected",
  demo: "Demo Mode",
  available: "Available",
  soon: "Coming soon",
};

const STATUS_PILL: Record<IntegrationStatus, string> = {
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  demo: "bg-amber-50 text-amber-800 border-amber-200",
  available: "bg-blue-50 text-blue-700 border-blue-200",
  soon: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

export function IntegrationCard({ def }: { def: IntegrationDef }) {
  const Icon = def.icon;
  const dim = def.status === "soon";
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 flex flex-col gap-3 transition-all",
        dim ? "opacity-70" : "hover:border-foreground/20 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            def.brandColor ?? "bg-secondary"
          )}
        >
          <Icon className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-semibold leading-tight">{def.name}</h3>
            {def.badge && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {def.badge}
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
            {def.desc}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10.5px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border",
            STATUS_PILL[def.status]
          )}
        >
          {def.status === "connected" && <CheckCircle2 className="w-2.5 h-2.5" />}
          {def.status === "demo" && <Wand2 className="w-2.5 h-2.5" />}
          {def.status === "available" && <Plug className="w-2.5 h-2.5" />}
          {def.status === "soon" && <Lock className="w-2.5 h-2.5" />}
          {STATUS_LABEL[def.status]}
        </span>

        <div className="flex items-center gap-1.5">
          {def.secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              onClick={def.secondaryAction.onClick}
            >
              {def.secondaryAction.label}
            </Button>
          )}
          {def.primaryAction && (
            <Button
              size="sm"
              variant={def.status === "connected" || def.status === "demo" ? "outline" : "default"}
              className="h-7 text-[11px]"
              onClick={def.primaryAction.onClick}
              asChild={Boolean(def.primaryAction.href)}
            >
              {def.primaryAction.href ? (
                <a href={def.primaryAction.href}>{def.primaryAction.label}</a>
              ) : (
                <span>{def.primaryAction.label}</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
