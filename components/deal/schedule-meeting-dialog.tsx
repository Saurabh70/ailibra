"use client";

import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { clearCache } from "@/lib/client-cache";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dealId: string;
  dealName: string;
  contactId?: string;
  contactEmail?: string;
};

function defaultStart(): string {
  // Tomorrow at 10am IST, formatted as datetime-local.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  // datetime-local expects local time in YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  dealId,
  dealName,
  contactId,
  contactEmail,
}: Props) {
  const [title, setTitle] = useState(`${dealName} — Sync`);
  const [start, setStart] = useState(defaultStart());
  const [duration, setDuration] = useState("30");
  const [attendees, setAttendees] = useState(contactEmail ?? "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !start) {
      toast.error("Title and start required");
      return;
    }
    setBusy(true);
    try {
      // Convert local datetime to ISO with IST tz (the Z form is UTC, the +05:30 form preserves local).
      const iso = new Date(start).toISOString();
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          start: iso,
          duration_min: Number(duration) || 30,
          attendees: attendees.split(",").map((a) => a.trim()).filter(Boolean),
          deal_id: dealId,
          contact_id: contactId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Connect Google in Settings first");
        } else {
          toast.error(data.error ?? "Failed to schedule");
        }
        return;
      }
      toast.success(
        data.demo ? "Meeting scheduled (demo)" : "Meeting created in Google Calendar"
      );
      clearCache("priorities");
      clearCache("deals_list");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Schedule Meeting
          </DialogTitle>
          <DialogDescription>
            Create a calendar event and send invites. In demo mode the event is logged locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              Title
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                Start
              </label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                Duration (min)
              </label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              Attendees (comma-separated emails)
            </label>
            <Input
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="priya@acme.io, you@yourdomain.com"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 mr-1.5" />}
            {busy ? "Creating…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
