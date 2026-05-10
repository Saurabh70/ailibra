"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { IntroOverlay } from "@/components/intro-overlay";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/login";

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 overflow-hidden">{children}</main>
      <IntroOverlay />
    </div>
  );
}
