"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Mic,
  Activity,
  Compass,
  ArrowRight,
  X,
  Sparkles,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  CalendarClock,
  Flame,
  TrendingUp,
  Plug,
  Lock,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SHOWN_KEY = "ailibra_show_intro";

type Step = {
  id: "ask" | "capture" | "flow" | "explore" | "settings";
  icon: typeof MessageSquare;
  label: string;
  title: string;
  subtitle: string;
  body: string;
  accent: string;
  Demo: React.FC;
};

const STEPS: Step[] = [
  {
    id: "ask",
    icon: MessageSquare,
    label: "Ask",
    title: "Ask anything in plain English",
    subtitle: "Your home base — talk to your pipeline",
    body: "Skip the dashboards. Type what you actually want to know — *\"Which deals are at risk?\"*, *\"Prep me for the Beta call\"*, *\"When did I last talk to Priya?\"* — and get specific answers, not boilerplate.",
    accent: "from-orange-500/15 to-orange-500/5",
    Demo: AskDemo,
  },
  {
    id: "capture",
    icon: Mic,
    label: "Capture",
    title: "Tell it what happened. It figures out the rest.",
    subtitle: "Your virtual sales-ops assistant",
    body: "Just type *\"Had a call with Razorpay\"* — and it asks ONE question at a time with smart MCQ options pulled from your real CRM. Five seconds later, the call, contact, deal, and follow-up task are all logged.",
    accent: "from-violet-500/15 to-violet-500/5",
    Demo: CaptureDemo,
  },
  {
    id: "flow",
    icon: Activity,
    label: "Flow",
    title: "Your day, prioritised by AI",
    subtitle: "Three buckets that matter",
    body: "**Right Now** — urgent signals (someone's waiting, a window is closing). **Coming Up** — meetings in the next 24h with prep briefs. **Actions Ready** — queued tasks. Refresh whenever; the AI re-ranks against fresh data.",
    accent: "from-blue-500/15 to-blue-500/5",
    Demo: FlowDemo,
  },
  {
    id: "explore",
    icon: Compass,
    label: "Explore",
    title: "Drill into any deal or contact",
    subtitle: "Where the depth lives",
    body: "Pipeline list sorted by deal health (at-risk first). People grouped by company. Click any deal for an AI summary, full activity timeline, and next-move recommendation. Click any contact for a relationship read.",
    accent: "from-emerald-500/15 to-emerald-500/5",
    Demo: ExploreDemo,
  },
  {
    id: "settings",
    icon: Plug,
    label: "Settings",
    title: "Plug in the rest of your stack",
    subtitle: "Sixteen integrations, growing",
    body: "Gmail, Calendar, Apollo, Resend run live today. LinkedIn, phone dialer, Zoom, Slack, Salesforce, HubSpot, Stripe and more are queued. Every integration has a *Demo Mode* — flip it on and the feature works end-to-end against your seeded data without needing real API keys.",
    accent: "from-fuchsia-500/15 to-fuchsia-500/5",
    Demo: SettingsDemo,
  },
];

export function IntroOverlay() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SHOWN_KEY) === "1") {
      setShow(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.removeItem(SHOWN_KEY);
    setShow(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!show) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const Demo = s.Demo;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background"
      >
        {/* Top progress bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-secondary z-10">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={dismiss}
          className="absolute top-5 right-5 z-10 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-secondary"
        >
          Skip <X className="w-3.5 h-3.5" />
        </button>

        {/* Step counter top-left */}
        <div className="absolute top-5 left-5 z-10 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="w-3 h-3 text-primary" strokeWidth={2.4} />
          <span>Step {step + 1} of {STEPS.length}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-b ${s.accent}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full px-8">
              {/* Left: copy */}
              <div className="flex flex-col justify-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 18 }}
                  className="inline-flex items-center gap-3 mb-5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" strokeWidth={2.2} />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">
                    {s.label}
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-[36px] md:text-[42px] font-semibold tracking-tight leading-[1.05]"
                >
                  {s.title}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="text-sm uppercase tracking-wide text-muted-foreground mt-2 mb-5"
                >
                  {s.subtitle}
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 }}
                  className="text-[16px] leading-relaxed text-foreground/80"
                  dangerouslySetInnerHTML={{
                    __html: s.body
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.+?)\*/g, '<em class="text-foreground/60">$1</em>'),
                  }}
                />

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.44 }}
                  className="flex items-center gap-3 mt-8"
                >
                  {step > 0 && (
                    <Button variant="outline" size="default" onClick={prev}>
                      Back
                    </Button>
                  )}
                  <Button size="default" onClick={next} className="px-5">
                    {step === STEPS.length - 1 ? "Get started" : "Next"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <div className="flex gap-1.5 ml-auto">
                    {STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === step
                            ? "bg-primary w-6"
                            : i < step
                              ? "bg-primary/40"
                              : "bg-border hover:bg-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right: demo illustration */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="hidden md:flex items-center justify-center"
              >
                <Demo />
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── per-step demo illustrations ─────────────────────────

function AskDemo() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-5 space-y-3">
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2 text-[13px] max-w-[80%]">
          Which deals are at risk?
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Sparkles className="w-3 h-3 text-primary" strokeWidth={2.4} />
        ailibra
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 text-[13px] leading-relaxed"
      >
        <strong>1 deal at risk:</strong> CRED · Member Engagement Suite · ₹80L (health 28).
        Stalled — Rohan dark for 18 days. Recommend multi-thread to Sneha.
      </motion.div>
    </div>
  );
}

function CaptureDemo() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-5 space-y-3">
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2 text-[13px]">
          Had a call with Razorpay
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3"
      >
        <p className="text-[13px] font-medium mb-2">Who at Razorpay?</p>
        <div className="grid grid-cols-2 gap-1.5">
          {["Priya Sharma", "Aarav Kapoor", "Riya Mehta", "Other"].map((o, i) => (
            <motion.div
              key={o}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.07 }}
              className="text-[12px] text-foreground/80 px-2.5 py-1.5 rounded-lg border border-border bg-card"
            >
              {o}
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-[12px] flex items-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.4} />
        <span>
          <strong>Captured:</strong> call with Priya logged · task created
        </span>
      </motion.div>
    </div>
  );
}

function FlowDemo() {
  const items = [
    { icon: Flame, label: "Right Now", color: "text-red-500", text: "Vikram needs pricing locked by EOD" },
    { icon: CalendarClock, label: "Coming Up", color: "text-blue-500", text: "Razorpay group demo · 9:49 AM" },
    { icon: TrendingUp, label: "Actions Ready", color: "text-emerald-500", text: "Re-engage Karan with case study" },
  ];
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-5 space-y-3">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="rounded-lg border border-border px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</div>
          <div className="text-lg font-semibold">₹6.6Cr</div>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">At risk</div>
          <div className="text-lg font-semibold text-red-600">1</div>
        </div>
      </div>
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            className="rounded-xl border border-border px-3.5 py-2.5"
          >
            <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-0.5 ${it.color}`}>
              <Icon className="w-3 h-3" strokeWidth={2.4} />
              {it.label}
            </div>
            <div className="text-[12.5px]">{it.text}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ExploreDemo() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-5 space-y-2.5">
      {[
        { name: "Member Engagement Suite", company: "CRED", value: "₹80L", health: 28 },
        { name: "Marketing Automation", company: "Nykaa", value: "₹60L", health: 41 },
        { name: "Risk Engine Integration", company: "Zerodha", value: "₹75L", health: 84 },
      ].map((d, i) => (
        <motion.div
          key={d.name}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          className="rounded-xl border border-border px-3.5 py-2.5 flex items-center gap-3"
        >
          <HealthDot score={d.health} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Building2 className="w-2.5 h-2.5" />
              {d.company}
            </div>
            <div className="text-[13px] font-medium truncate">{d.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-semibold tabular-nums">{d.value}</div>
            <div className="text-[10px] text-muted-foreground">health {d.health}</div>
          </div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-[10.5px] text-muted-foreground flex items-center gap-3 pt-2"
      >
        <span className="inline-flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> 6 emails</span>
        <span className="inline-flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> 3 calls</span>
        <span className="inline-flex items-center gap-1"><CalendarClock className="w-2.5 h-2.5" /> 2 meetings</span>
      </motion.div>
    </div>
  );
}

function SettingsDemo() {
  const tiles = [
    { name: "Anthropic", icon: Sparkles, color: "bg-orange-100 text-orange-700", status: "connected" as const },
    { name: "Gmail", icon: Mail, color: "bg-red-100 text-red-700", status: "demo" as const },
    { name: "Calendar", icon: CalendarClock, color: "bg-blue-100 text-blue-700", status: "demo" as const },
    { name: "Apollo", icon: Wand2, color: "bg-violet-100 text-violet-700", status: "demo" as const },
    { name: "Resend", icon: TrendingUp, color: "bg-pink-100 text-pink-700", status: "demo" as const },
    { name: "LinkedIn", icon: Building2, color: "bg-blue-100 text-blue-700", status: "soon" as const },
    { name: "Dialer", icon: Phone, color: "bg-emerald-100 text-emerald-700", status: "soon" as const },
    { name: "Zoom", icon: CalendarClock, color: "bg-blue-100 text-blue-700", status: "soon" as const },
    { name: "Slack", icon: MessageSquare, color: "bg-violet-100 text-violet-700", status: "soon" as const },
  ];
  const STATUS: Record<string, { label: string; pill: string }> = {
    connected: { label: "Connected", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    demo: { label: "Demo", pill: "bg-amber-50 text-amber-800 border-amber-200" },
    soon: { label: "Soon", pill: "bg-neutral-100 text-neutral-500 border-neutral-200" },
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-4">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          const s = STATUS[t.status];
          const dim = t.status === "soon";
          return (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={`rounded-lg border border-border bg-card p-2.5 ${dim ? "opacity-60" : ""}`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-1.5 ${t.color}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
              </div>
              <div className="text-[11.5px] font-medium truncate">{t.name}</div>
              <span
                className={`mt-1 inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-medium px-1 py-0.5 rounded border ${s.pill}`}
              >
                {t.status === "connected" && <CheckCircle2 className="w-2 h-2" />}
                {t.status === "demo" && <Wand2 className="w-2 h-2" />}
                {t.status === "soon" && <Lock className="w-2 h-2" />}
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
        className="text-[10.5px] text-muted-foreground mt-3 text-center"
      >
        5 live · 11 on the roadmap
      </motion.div>
    </div>
  );
}

function HealthDot({ score }: { score: number }) {
  const tier = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const r = 18;
  const c = 2 * Math.PI * (r - 2);
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className="relative w-9 h-9 shrink-0">
      <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
        <circle cx="18" cy="18" r={r - 2} stroke="currentColor" className="text-secondary" fill="none" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r - 2}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={tier.replace("bg-", "stroke-")}
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">
        {score}
      </div>
    </div>
  );
}
