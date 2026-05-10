"use client";

import { useState, useEffect } from "react";
import { Mail, Send, RefreshCw, Loader2, BarChart3, AlertCircle } from "lucide-react";
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
import { AIGenerating } from "@/components/ai-generating";
import { LOADING } from "@/lib/loading-messages";
import { toast } from "sonner";
import { clearCache } from "@/lib/client-cache";

type Draft = {
  to_name?: string;
  to_email?: string;
  subject: string;
  body: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dealId: string;
  contactId?: string;
  intent?: string;
};

export function DraftEmailDialog({ open, onOpenChange, dealId, contactId, intent }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/draft-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, intent, type: "follow_up" }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to draft";
        setError(msg);
        toast.error(msg);
        return;
      }
      setDraft(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Auto-load draft when dialog opens. Set loading flag synchronously so
  // we never flash the "no draft" empty state.
  useEffect(() => {
    if (open && !draft && !loading) {
      setLoading(true);
      load();
    }
    if (!open) {
      setDraft(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onChange(v: boolean) {
    onOpenChange(v);
  }


  async function send(tracked: boolean) {
    if (!draft) return;
    if (!draft.to_email) {
      toast.error("Recipient email required");
      return;
    }
    setSending(true);
    try {
      const endpoint = tracked ? "/api/resend/send" : "/api/gmail/send";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: draft.to_email,
          subject: draft.subject,
          body: draft.body,
          deal_id: dealId,
          contact_id: contactId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error(
            tracked
              ? "Resend not configured — using demo path or connect a key in env."
              : "Gmail not connected — go to Settings to connect."
          );
        } else {
          toast.error(data.error ?? "Send failed");
        }
        return;
      }
      const label = tracked
        ? data.demo
          ? "Sent (tracked, demo) — open simulated"
          : "Sent via Resend (tracked)"
        : data.demo
          ? "Sent (demo)"
          : "Sent via Gmail";
      toast.success(label);
      clearCache("priorities");
      clearCache("deals_list");
      onOpenChange(false);
      setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> Draft Follow-Up
          </DialogTitle>
          <DialogDescription>
            AI-generated draft based on this deal&apos;s context. Edit before sending.
          </DialogDescription>
        </DialogHeader>

        {!draft && error ? (
          <div className="py-8 px-4 rounded-lg border border-red-200 bg-red-50 flex flex-col items-center text-center">
            <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
            <div className="text-[14px] text-red-900 font-medium mb-1">Couldn&apos;t draft this one</div>
            <div className="text-[12.5px] text-red-800/80 mb-3 max-w-sm">{error}</div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Try again
            </Button>
          </div>
        ) : !draft ? (
          <AIGenerating
            title="Drafting your email"
            messages={LOADING.email_draft}
            variant="card"
          />
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                To
              </label>
              <Input
                value={draft.to_email ?? ""}
                onChange={(e) => setDraft({ ...draft, to_email: e.target.value })}
                placeholder="recipient@company.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                Subject
              </label>
              <Input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                Body
              </label>
              <Textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={12}
                className="mt-1 font-mono text-[13px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={loading} onClick={load}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!draft || loading || sending}
              onClick={() => send(true)}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Send tracked
            </Button>
            <Button size="sm" disabled={!draft || loading || sending} onClick={() => send(false)}>
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              Send
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
