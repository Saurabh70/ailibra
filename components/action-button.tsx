"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DraftEmailDialog } from "@/components/deal/draft-email-dialog";
import { ScheduleMeetingDialog } from "@/components/deal/schedule-meeting-dialog";
import { clearCache } from "@/lib/client-cache";
import type { PriorityAction } from "@/types/ai";

type Props = {
  action: PriorityAction;
  primary?: boolean;
};

/**
 * Universal action button. Each action type is wired to its real handler:
 * - view_deal / view_contact → next/link
 * - draft_email → opens DraftEmailDialog (deal context)
 * - schedule_meeting → opens ScheduleMeetingDialog
 * - complete_task → PATCH /api/tasks/[id]/update
 * - send_now → Gmail send via the deal's primary contact (best-effort)
 * - skip → hides the button locally
 */
export function ActionButton({ action, primary }: Props) {
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (hidden) return null;

  const variant = primary ? "default" : "outline";
  const className = "h-7 text-xs";

  // ─── Navigation actions ──────────────────────────────────
  if (action.type === "view_deal" && action.deal_id) {
    return (
      <Button asChild size="sm" variant={variant} className={className}>
        <Link href={`/explore/deal/${action.deal_id}`}>{action.label}</Link>
      </Button>
    );
  }
  if (action.type === "view_contact" && action.contact_id) {
    return (
      <Button asChild size="sm" variant={variant} className={className}>
        <Link href={`/explore/contact/${action.contact_id}`}>{action.label}</Link>
      </Button>
    );
  }

  // ─── Skip ────────────────────────────────────────────────
  if (action.type === "skip") {
    return (
      <Button
        size="sm"
        variant="ghost"
        className={className}
        onClick={() => setHidden(true)}
      >
        <X className="w-3 h-3 mr-1" /> {action.label}
      </Button>
    );
  }

  // ─── Complete task ───────────────────────────────────────
  if (action.type === "complete_task" && action.task_id) {
    if (completed) {
      return (
        <Button size="sm" variant="ghost" className={`${className} text-emerald-600`} disabled>
          <CheckCircle2 className="w-3 h-3 mr-1" /> Done
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant={variant}
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await fetch(`/api/tasks/${action.task_id}/update`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ status: "completed" }),
            });
            const data = await res.json();
            if (!res.ok) {
              toast.error(data.error ?? "Failed");
              return;
            }
            setCompleted(true);
            clearCache("priorities");
            clearCache("flow_stats");
            toast.success("Task marked done");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
        {action.label}
      </Button>
    );
  }

  // ─── Draft email — opens DraftEmailDialog ────────────────
  if (action.type === "draft_email") {
    if (!action.deal_id) {
      // Without a deal_id we can't drive the AI draft. Soft fallback.
      return (
        <Button
          size="sm"
          variant={variant}
          className={className}
          onClick={() => toast.info("Open the deal to draft this email — no deal_id was attached")}
        >
          {action.label}
        </Button>
      );
    }
    return (
      <>
        <Button
          size="sm"
          variant={variant}
          className={className}
          onClick={() => setDraftOpen(true)}
        >
          {action.label}
        </Button>
        <DraftEmailDialog
          open={draftOpen}
          onOpenChange={setDraftOpen}
          dealId={action.deal_id}
          contactId={action.contact_id}
          intent={action.intent}
        />
      </>
    );
  }

  // ─── Send now — best-effort tracked send ─────────────────
  if (action.type === "send_now") {
    if (!action.deal_id) {
      return (
        <Button
          size="sm"
          variant={variant}
          className={className}
          onClick={() => toast.info("Open the deal to review and send")}
        >
          {action.label}
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant={variant}
        className={className}
        onClick={() => setDraftOpen(true)}
      >
        {action.label}
        {/* We open the draft dialog so the rep reviews before sending. */}
        <DraftEmailDialog
          open={draftOpen}
          onOpenChange={setDraftOpen}
          dealId={action.deal_id}
          contactId={action.contact_id}
          intent={action.intent}
        />
      </Button>
    );
  }

  // ─── Schedule meeting ────────────────────────────────────
  if (action.type === "schedule_meeting") {
    if (!action.deal_id) {
      return (
        <Button
          size="sm"
          variant={variant}
          className={className}
          onClick={() => toast.info("Open the deal to schedule a meeting")}
        >
          {action.label}
        </Button>
      );
    }
    return (
      <>
        <Button
          size="sm"
          variant={variant}
          className={className}
          onClick={() => setScheduleOpen(true)}
        >
          {action.label}
        </Button>
        <ScheduleMeetingDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          dealId={action.deal_id}
          dealName="Meeting"
          contactId={action.contact_id}
        />
      </>
    );
  }

  // Fallback — should not happen.
  return (
    <Button
      size="sm"
      variant={variant}
      className={className}
      onClick={() => toast.info(action.label)}
    >
      {action.label}
    </Button>
  );
}

export function ActionButtons({ actions }: { actions: PriorityAction[] }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <ActionButton key={`${a.type}-${i}`} action={a} primary={i === 0} />
      ))}
    </div>
  );
}
