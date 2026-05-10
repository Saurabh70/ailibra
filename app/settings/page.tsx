"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mail,
  RefreshCw,
  Sparkles,
  Database,
  Settings as SettingsIcon,
  Wand2,
  CalendarClock,
  Phone,
  Video,
  MessageCircle,
  CreditCard,
  Cloud,
  TrendingUp,
  Search,
  Zap,
  FileText,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { clearCache } from "@/lib/client-cache";
import { IntegrationCard, type IntegrationDef } from "@/components/settings/integration-card";

type Status = {
  google: { connected: boolean; email: string | null; scope: string | null; demo: boolean };
  integrations: { apollo: boolean; resend: boolean; anthropic: boolean };
};

type SyncResult = {
  total_fetched: number;
  inserted: number;
  skipped_existing: number;
  skipped_no_match: number;
  matched_contacts: number;
  errors: string[];
  error?: string;
};

function comingSoon(name: string) {
  return () => toast.info(`${name} integration is on the roadmap. Want it sooner? Tell us in feedback.`);
}

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [, startTransition] = useTransition();

  async function loadStatus() {
    try {
      const res = await fetch("/api/google/status", { cache: "no-store" });
      const data = (await res.json()) as Status;
      setStatus(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load status");
    }
  }

  useEffect(() => {
    loadStatus();
    const connected = searchParams.get("google_connected");
    const error = searchParams.get("google_error");
    if (connected) {
      toast.success("Gmail connected");
      router.replace("/settings");
    }
    if (error) {
      toast.error(`Google connect failed: ${error}`);
      router.replace("/settings");
    }
  }, [searchParams, router]);

  async function syncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/gmail/sync?limit=20", { method: "POST" });
      const data = (await res.json()) as SyncResult;
      setSyncResult(data);
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(
          `Synced ${data.inserted} new email${data.inserted === 1 ? "" : "s"}` +
            (data.skipped_no_match ? ` (${data.skipped_no_match} skipped — no contact match)` : "")
        );
        startTransition(() => {
          clearCache("priorities");
          clearCache("flow_stats");
          clearCache("deals_list");
          clearCache("contacts_list");
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectGoogle() {
    if (!confirm("Disconnect Gmail? Synced emails will stay; new ones won't be fetched.")) return;
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("disconnect failed");
      toast.success("Gmail disconnected");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function googleDemoConnect() {
    try {
      const res = await fetch("/api/google/demo-connect", { method: "POST" });
      if (!res.ok) throw new Error("demo connect failed");
      toast.success("Gmail Demo Mode enabled");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function reseed() {
    if (!confirm("This wipes all current data and re-seeds the demo set. Continue?")) return;
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "seed failed");
      toast.success("Demo data reset");
      startTransition(() => {
        clearCache();
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  // ─── build integration grid ──────────────────────────────
  const integrations: IntegrationDef[] = [
    // Live + active integrations.
    {
      id: "anthropic",
      name: "Anthropic Claude",
      desc: "Powers every AI feature — capture, ask, draft, prioritise.",
      icon: Sparkles,
      brandColor: "bg-orange-100 text-orange-700",
      status: status?.integrations.anthropic ? "connected" : "available",
      primaryAction: status?.integrations.anthropic
        ? undefined
        : { label: "Set ANTHROPIC_API_KEY", onClick: () => toast.info("Add ANTHROPIC_API_KEY to .env.local") },
    },
    {
      id: "google",
      name: status?.google.demo ? "Gmail + Calendar (Demo)" : "Gmail + Calendar",
      desc: "Sync inbound emails, send from your address, create calendar events with auto-attendee invites.",
      icon: Mail,
      brandColor: "bg-red-100 text-red-700",
      status: status?.google.connected ? (status.google.demo ? "demo" : "connected") : "available",
      primaryAction: status?.google.connected
        ? { label: "Disconnect", onClick: disconnectGoogle }
        : { label: "Connect", href: "/api/google/auth" },
      secondaryAction: status?.google.connected
        ? undefined
        : { label: "Demo Mode", onClick: googleDemoConnect },
    },
    {
      id: "calendar",
      name: "Google Calendar",
      desc: "Pull upcoming meetings into Coming Up. Schedule events with one click.",
      icon: CalendarClock,
      brandColor: "bg-blue-100 text-blue-700",
      status: status?.google.connected ? (status.google.demo ? "demo" : "connected") : "available",
      primaryAction: status?.google.connected
        ? undefined
        : { label: "Connect (with Gmail)", href: "/api/google/auth" },
    },
    {
      id: "apollo",
      name: "Apollo",
      desc: "One-click contact enrichment — role, phone, LinkedIn — pulled from Apollo's database.",
      icon: Wand2,
      brandColor: "bg-violet-100 text-violet-700",
      status: status?.integrations.apollo ? "connected" : "demo",
      primaryAction: status?.integrations.apollo
        ? undefined
        : { label: "Add APOLLO_API_KEY", onClick: () => toast.info("Add APOLLO_API_KEY to .env.local") },
    },
    {
      id: "resend",
      name: "Resend",
      desc: "Tracked email sends with open + click webhooks. Powers the 'someone opened your email' Right-Now signals.",
      icon: TrendingUp,
      brandColor: "bg-pink-100 text-pink-700",
      status: status?.integrations.resend ? "connected" : "demo",
      primaryAction: status?.integrations.resend
        ? undefined
        : { label: "Add RESEND_API_KEY", onClick: () => toast.info("Add RESEND_API_KEY to .env.local") },
    },

    // Coming-soon roadmap.
    {
      id: "linkedin",
      name: "LinkedIn Sales Navigator",
      desc: "Pull profile signals, recent posts, job changes. Auto-detect when a champion changes companies.",
      icon: Briefcase,
      brandColor: "bg-blue-100 text-blue-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("LinkedIn Sales Nav") },
    },
    {
      id: "dialer",
      name: "Phone Dialer",
      desc: "Click-to-call from any contact. Auto-record calls, transcribe, attach the summary as an activity.",
      icon: Phone,
      brandColor: "bg-emerald-100 text-emerald-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("Phone Dialer (Twilio/Aircall)") },
    },
    {
      id: "zoom",
      name: "Zoom",
      desc: "Auto-attach meeting recordings + transcripts to deals. AI extracts action items into tasks.",
      icon: Video,
      brandColor: "bg-blue-100 text-blue-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("Zoom") },
    },
    {
      id: "slack",
      name: "Slack",
      desc: "Deal-at-risk alerts, daily digest, mention any deal/contact with an in-line preview.",
      icon: MessageCircle,
      brandColor: "bg-violet-100 text-violet-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("Slack") },
    },
    {
      id: "salesforce",
      name: "Salesforce",
      desc: "Two-way sync for orgs migrating off legacy CRM. Read accounts/opps, write activities back.",
      icon: Cloud,
      brandColor: "bg-cyan-100 text-cyan-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("Salesforce") },
    },
    {
      id: "hubspot",
      name: "HubSpot",
      desc: "Two-way sync. Pull existing contacts/companies/deals. Push enriched data back.",
      icon: Cloud,
      brandColor: "bg-orange-100 text-orange-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("HubSpot") },
    },
    {
      id: "stripe",
      name: "Stripe",
      desc: "Auto-mark deals closed-won when payment lands. Pull MRR / ARR onto deal cards.",
      icon: CreditCard,
      brandColor: "bg-indigo-100 text-indigo-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("Stripe") },
    },
    {
      id: "zoominfo",
      name: "ZoomInfo",
      desc: "Buyer-intent signals + B2B enrichment. Surface companies showing intent on relevant keywords.",
      icon: Search,
      brandColor: "bg-blue-100 text-blue-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("ZoomInfo") },
    },
    {
      id: "gong",
      name: "Gong",
      desc: "Call analytics + sentiment. Auto-attach call insights to the deal AI summary.",
      icon: TrendingUp,
      brandColor: "bg-purple-100 text-purple-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("Gong") },
    },
    {
      id: "clay",
      name: "Clay",
      desc: "Lead-gen workflow automation. Trigger Clay tables when new contacts hit the CRM.",
      icon: Zap,
      brandColor: "bg-yellow-100 text-yellow-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("Clay") },
    },
    {
      id: "docusign",
      name: "DocuSign",
      desc: "Send + track contract signatures. Auto-update deal stage when signed.",
      icon: FileText,
      brandColor: "bg-amber-100 text-amber-700",
      status: "soon",
      primaryAction: { label: "Notify me", onClick: comingSoon("DocuSign") },
    },
  ];

  const liveCount = integrations.filter((i) => i.status === "connected" || i.status === "demo").length;
  const soonCount = integrations.filter((i) => i.status === "soon").length;

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
        <SettingsIcon className="w-3.5 h-3.5" />
        Settings
      </div>
      <h1 className="text-[26px] font-semibold tracking-tight mb-1">Integrations</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {liveCount} live · {soonCount} on the roadmap · click <strong>Notify me</strong> to vote on
        what we ship next.
      </p>

      {/* Gmail sync result banner — only shows after a sync action */}
      {syncResult && !syncResult.error && (
        <div className="mb-5 rounded-lg border border-border bg-card p-3 text-[13px] flex items-center gap-3">
          <span className="text-muted-foreground">Last Gmail sync:</span>
          <span>
            <strong>{syncResult.inserted}</strong> new email{syncResult.inserted === 1 ? "" : "s"} ·{" "}
            {syncResult.matched_contacts} matched · {syncResult.skipped_no_match} skipped
          </span>
        </div>
      )}

      {/* Quick actions for connected Google */}
      {status?.google.connected && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-primary" strokeWidth={2.4} />
            {status.google.demo ? (
              <span>
                <span className="font-medium">Gmail in Demo Mode</span> · simulating inbound emails
                against seeded contacts
              </span>
            ) : (
              <span>
                Connected as <span className="font-medium">{status.google.email}</span>
              </span>
            )}
          </div>
          <Button size="sm" onClick={syncNow} disabled={syncing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      )}

      {/* Integration grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {integrations.map((def) => (
          <IntegrationCard key={def.id} def={def} />
        ))}
      </div>

      {/* Demo data section */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-primary" strokeWidth={2.4} />
          <h2 className="text-[14px] font-semibold">Demo Data</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Reset the seeded data set (5 companies, 15 contacts, 8 deals, 30+ activities, 10 tasks).
          Wipes any data you&apos;ve added via Capture.
        </p>
        <Button size="sm" variant="outline" onClick={reseed}>
          Re-seed demo data
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-7 max-w-6xl mx-auto">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <SettingsInner />
    </Suspense>
  );
}
