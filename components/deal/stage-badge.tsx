import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  lead: "bg-blue-50 text-blue-700 border-blue-200",
  discovery: "bg-violet-50 text-violet-700 border-violet-200",
  demo: "bg-amber-50 text-amber-700 border-amber-200",
  proposal: "bg-cyan-50 text-cyan-700 border-cyan-200",
  negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  closed_won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed_lost: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export function StageBadge({ stage }: { stage: string }) {
  const style = STYLES[stage] ?? "bg-neutral-50 text-neutral-700 border-neutral-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border tabular-nums uppercase tracking-wide",
        style
      )}
    >
      {stage.replace("_", " ")}
    </span>
  );
}
