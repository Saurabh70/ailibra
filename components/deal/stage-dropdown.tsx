"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { clearCache } from "@/lib/client-cache";
import { StageBadge } from "@/components/deal/stage-badge";

const STAGES = [
  { value: "lead", label: "Lead" },
  { value: "discovery", label: "Discovery" },
  { value: "demo", label: "Demo" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed (Won)" },
  { value: "closed_lost", label: "Closed (Lost)" },
] as const;

export function StageDropdown({
  dealId,
  currentStage,
  onUpdated,
}: {
  dealId: string;
  currentStage: string;
  onUpdated?: (stage: string) => void;
}) {
  const [stage, setStage] = useState(currentStage);
  const [pending, setPending] = useState(false);

  async function setNewStage(next: string) {
    if (next === stage) return;
    setPending(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/update`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "update failed");
      setStage(next);
      onUpdated?.(next);
      clearCache("deals_list");
      clearCache("priorities");
      toast.success(`Stage updated → ${STAGES.find((s) => s.value === next)?.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={pending} className="h-8">
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <StageBadge stage={stage} />
          )}
          <ChevronDown className="w-3 h-3 ml-1.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {STAGES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onSelect={() => setNewStage(s.value)}
            className="flex items-center justify-between"
          >
            <span>{s.label}</span>
            {s.value === stage && <Check className="w-3.5 h-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
