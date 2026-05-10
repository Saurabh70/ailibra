"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Compass, MessageSquare, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Flow", icon: Activity },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/ask", label: "Ask", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[220px] shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <span className="font-semibold tracking-tight text-[15px]">ailibra</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-muted hover:text-white hover:bg-sidebar-accent/60"
              )}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px]",
                  active && "text-primary"
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn(active && "font-medium")}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-sidebar-border text-[11px] text-sidebar-muted">
        <div>v0.1 — single-user demo</div>
      </div>
    </aside>
  );
}
