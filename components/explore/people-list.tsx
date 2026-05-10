"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactCard, type ContactCardData } from "@/components/contact/card";
import { cn } from "@/lib/utils";
import { getCache, setCache, fetchWithDedupe } from "@/lib/client-cache";
import { LoadingRotator } from "@/components/loading-rotator";
import { LOADING } from "@/lib/loading-messages";

type CompanyGroup = {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  health_score: number;
  contacts: ContactCardData[];
};

const TTL = 60 * 1000;

export function PeopleList() {
  const [companies, setCompanies] = useState<CompanyGroup[] | null>(() =>
    getCache<CompanyGroup[]>("contacts_list", TTL)
  );
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const cached = getCache<CompanyGroup[]>("contacts_list", TTL);
    return cached ? new Set(cached.map((c) => c.id)) : new Set();
  });

  useEffect(() => {
    if (companies) return;
    fetchWithDedupe("contacts_list", async () => {
      const res = await fetch("/api/contacts/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as { companies: CompanyGroup[] };
      return data.companies;
    })
      .then((c) => {
        setCache("contacts_list", c);
        setCompanies(c);
        setExpanded(new Set(c.map((g) => g.id)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unknown error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load contacts: {error}
      </div>
    );
  }
  if (!companies) {
    return (
      <div>
        <div className="text-[12px] text-muted-foreground mb-3">
          <LoadingRotator messages={LOADING.people_list} />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const total = companies.reduce((s, c) => s + c.contacts.length, 0);

  return (
    <div className="space-y-3">
      <div className="text-[12px] text-muted-foreground mb-2">
        {total} contacts across {companies.length} companies
      </div>
      {companies.map((c) => {
        const open = expanded.has(c.id);
        return (
          <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => toggle(c.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left"
            >
              {open ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={2.2} />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2.2} />
              )}
              <Building2 className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-[14px] truncate">{c.name}</h3>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {c.contacts.length} {c.contacts.length === 1 ? "contact" : "contacts"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {[c.industry, c.size].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn("overflow-hidden")}
                >
                  <div className="p-3 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {c.contacts.map((p, i) => (
                      <ContactCard key={p.id} contact={p} index={i} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
