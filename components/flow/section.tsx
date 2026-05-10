import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function FlowSection({
  title,
  icon: Icon,
  count,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={2.2} />
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="text-[11px] text-muted-foreground/60">· {count}</span>
        )}
      </div>
      {children}
    </section>
  );
}
