import { cn } from "@/lib/utils";

export function HealthCircle({
  score,
  size = 44,
  strokeWidth = 3.5,
  showLabel = true,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const tier = clamped >= 70 ? "good" : clamped >= 40 ? "warn" : "bad";
  const stroke =
    tier === "good"
      ? "stroke-emerald-500"
      : tier === "warn"
        ? "stroke-amber-500"
        : "stroke-red-500";
  const text =
    tier === "good"
      ? "text-emerald-600"
      : tier === "warn"
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${c}`}
          className={cn("transition-all", stroke)}
        />
      </svg>
      {showLabel && (
        <div className={cn("absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums", text)}>
          {clamped}
        </div>
      )}
    </div>
  );
}
