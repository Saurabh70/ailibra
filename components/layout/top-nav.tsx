"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MessageSquare,
  Activity,
  Compass,
  Settings as SettingsIcon,
  Sparkles,
  LogOut,
  ChevronDown,
  Mic,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const NAV = [
  { href: "/ask", label: "Ask", icon: MessageSquare },
  { href: "/capture", label: "Capture", icon: Mic, withCount: true as const },
  { href: "/flow", label: "Flow", icon: Activity },
  { href: "/explore", label: "Explore", icon: Compass },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [captureCount, setCaptureCount] = useState<number | null>(null);

  function isActive(href: string) {
    if (href === "/ask" && (pathname === "/" || pathname === "/ask")) return true;
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Refresh count on mount, on pathname change (covers post-capture invalidation),
  // and every 30 seconds.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const res = await fetch("/api/capture/count", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCaptureCount(data.count ?? 0);
      } catch {
        // ignore
      }
    }

    load();
    timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [pathname]);

  async function logout() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionStorage.removeItem("ailibra_show_intro");
      router.push("/login");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logout failed");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="sticky top-0 z-40 px-4 pt-4">
      <nav className="max-w-6xl mx-auto flex items-center justify-between gap-3 rounded-full border border-border bg-card/90 backdrop-blur-md shadow-sm px-2 py-1.5">
        <Link href="/ask" className="flex items-center gap-2 px-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <span className="font-semibold tracking-tight text-[14px]">ailibra</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(href);
            const hasCount = "withCount" in item && item.withCount;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.4 : 2} />
                <span className={active ? "font-medium" : ""}>{label}</span>
                {hasCount && captureCount !== null && captureCount > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 inline-flex items-center justify-center min-w-[20px] h-4 rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    )}
                  >
                    {captureCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/assignmentwork"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12.5px] text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-primary" strokeWidth={2.2} />
            Assignment Work
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-secondary transition-colors text-[13px] text-foreground/70">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary uppercase">
                  S
                </div>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild className="sm:hidden">
                <a
                  href="/assignmentwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 mr-2" /> Assignment Work
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <SettingsIcon className="w-3.5 h-3.5 mr-2" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={logout}
                disabled={signingOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}
