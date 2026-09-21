"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import { recordSessionResumeEntry } from "@/lib/brenner-loop";
import { isDemoThreadId, normalizeThreadId } from "@/lib/demo-mode";

// ============================================================================
// Icons
// ============================================================================

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
      />
    </svg>
  );
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

// ============================================================================
// Types & Data
// ============================================================================

interface BriefSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  status: "complete" | "partial" | "pending";
  items: string[];
  summary?: string;
}

interface ExportFormat {
  id: string;
  name: string;
  ext: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

const BASE_BRIEF_SECTIONS: BriefSection[] = [
  {
    id: "hypothesis_slate",
    title: "Hypothesis Slate",
    icon: <span className="text-lg font-bold">H</span>,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    status: "complete",
    items: [
      "H₁: The phenomenon is caused by electromagnetic interference",
      "H₂: The readings indicate a systematic measurement error",
      "H₃: An unknown variable is affecting the baseline",
    ],
    summary: "3 competing hypotheses identified with confidence distributions",
  },
  {
    id: "discriminative_tests",
    title: "Discriminative Tests",
    icon: <span className="text-lg">⚗️</span>,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    status: "complete",
    items: [
      "Test A: Isolate electromagnetic sources → Discriminates H₁ vs H₂/H₃",
      "Test B: Recalibrate instruments → Discriminates H₂ vs H₁/H₃",
      "Test C: Control for environmental factors → Discriminates H₃ vs H₁/H₂",
    ],
    summary: "3 tests designed to maximally discriminate between hypotheses",
  },
  {
    id: "assumption_ledger",
    title: "Assumption Ledger",
    icon: <span className="text-lg">📋</span>,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    status: "partial",
    items: [
      "A1: Measurement instruments are properly calibrated (HIGH confidence)",
      "A2: Environmental conditions remain stable (MEDIUM confidence)",
      "A3: Sample size is sufficient for statistical significance (LOW confidence)",
    ],
    summary: "7 assumptions tracked, 2 require validation",
  },
  {
    id: "adversarial_critique",
    title: "Adversarial Critique",
    icon: <span className="text-lg">⚔️</span>,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    status: "complete",
    items: [
      "Devil's Advocate: Selection bias in sample collection",
      "Devil's Advocate: Confirmation bias in hypothesis ranking",
      "Rebuttal: Randomization protocol addresses selection bias",
    ],
    summary: "2 critiques raised, 1 addressed with rebuttal",
  },
  {
    id: "evidence_summary",
    title: "Evidence Summary",
    icon: <span className="text-lg">📊</span>,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    status: "pending",
    items: [
      "12 sources analyzed",
      "8 support H₁, 3 support H₂, 1 supports H₃",
      "Confidence distribution: H₁ (65%), H₂ (25%), H₃ (10%)",
    ],
    summary: "Awaiting final evidence synthesis",
  },
];

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: "markdown",
    name: "Markdown",
    ext: ".md",
    description: "Plain text with formatting, ideal for documentation",
    icon: <span className="text-lg font-mono">#</span>,
    available: true,
  },
  {
    id: "pdf",
    name: "PDF",
    ext: ".pdf",
    description: "Printable document with professional layout",
    icon: <DocumentIcon className="size-5" />,
    available: true,
  },
  {
    id: "json",
    name: "JSON",
    ext: ".json",
    description: "Machine-readable structured data",
    icon: <span className="text-lg font-mono">{"{}"}</span>,
    available: true,
  },
  {
    id: "latex",
    name: "LaTeX",
    ext: ".tex",
    description: "Academic paper format with citations",
    icon: <span className="text-lg font-serif italic">L</span>,
    available: false,
  },
];

// ============================================================================
// Components
// ============================================================================

function QualityMeter({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 90) return "from-emerald-500 to-emerald-400";
    if (s >= 70) return "from-blue-500 to-blue-400";
    if (s >= 50) return "from-amber-500 to-amber-400";
    return "from-rose-500 to-rose-400";
  };

  const getLabel = (s: number) => {
    if (s >= 90) return "Excellent";
    if (s >= 70) return "Good";
    if (s >= 50) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Brief Quality</span>
        <span className="font-semibold text-foreground">{score}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getColor(score)} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">{getLabel(score)}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "complete" | "partial" | "pending" }) {
  const config = {
    complete: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      label: "Complete",
    },
    partial: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      label: "In Progress",
    },
    pending: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      label: "Pending",
    },
  };

  const { bg, text, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      {status === "complete" && <CheckCircleIcon className="size-3" />}
      {label}
    </span>
  );
}

function SectionCard({
  section,
  isExpanded,
  onToggle,
}: {
  section: BriefSection;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      layout
      className={`rounded-xl border transition-colors ${
        isExpanded
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card hover:border-border/80"
      }`}
    >
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-4 text-left">
        <div
          className={`flex items-center justify-center size-10 rounded-xl ${section.bgColor} ${section.color}`}
        >
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{section.title}</h3>
            <StatusBadge status={section.status} />
          </div>
          {section.summary && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{section.summary}</p>
          )}
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDownIcon className="size-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="pl-14 space-y-2">
                {section.items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className={`mt-1.5 size-1.5 rounded-full ${section.color.replace("text-", "bg-")} flex-shrink-0`}
                    />
                    <span className="text-muted-foreground">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ExportCard({
  format,
  onExport,
  isExporting,
}: {
  format: ExportFormat;
  onExport: () => void;
  isExporting: boolean;
}) {
  return (
    <motion.button
      whileHover={format.available ? { scale: 1.02 } : undefined}
      whileTap={format.available ? { scale: 0.98 } : undefined}
      onClick={format.available ? onExport : undefined}
      disabled={!format.available || isExporting}
      className={`relative rounded-xl border p-4 text-left transition-all ${
        format.available
          ? "border-border bg-card hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
          : "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center size-10 rounded-lg ${
            format.available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {isExporting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshIcon className="size-5" />
            </motion.div>
          ) : (
            format.icon
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{format.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{format.ext}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{format.description}</p>
        </div>
        {format.available && <DownloadIcon className="size-4 text-muted-foreground" />}
      </div>
      {!format.available && (
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Coming Soon
          </span>
        </div>
      )}
    </motion.button>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </motion.button>
  );
}

function formatRelativeTime(timestampMs: number, nowMs: number): string {
  const deltaMs = Math.max(0, nowMs - timestampMs);
  const minutes = Math.floor(deltaMs / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

type ObjectionStatus = "open" | "acknowledged" | "testing" | "addressed" | "accepted" | "dismissed";

type ObjectionSnapshot = {
  id: string;
  type?: string;
  severity?: string;
  summary?: string;
  source?: {
    agentName?: string | null;
    role?: string | null;
    messageId?: number;
    createdAt?: string;
    subject?: string;
  };
};

const FORBIDDEN_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const OBJECTION_STATUS_LABELS: Record<ObjectionStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  testing: "Testing",
  addressed: "Addressed",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

const RESOLVED_OBJECTION_STATUSES = new Set<ObjectionStatus>([
  "addressed",
  "accepted",
  "dismissed",
]);

const objectionStatusKey = (threadId: string): string => `brenner-objection-register:${threadId}`;

const objectionSnapshotKey = (threadId: string): string =>
  `brenner-objection-register-snapshot:${threadId}`;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isObjectionStatus = (value: unknown): value is ObjectionStatus =>
  typeof value === "string" && value in OBJECTION_STATUS_LABELS;

const loadObjectionStatuses = (threadId: string): Record<string, ObjectionStatus> => {
  if (typeof window === "undefined") return Object.create(null);
  try {
    const raw = window.localStorage.getItem(objectionStatusKey(threadId));
    if (!raw) return Object.create(null);

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return Object.create(null);

    const out: Record<string, ObjectionStatus> = Object.create(null);
    for (const [key, value] of Object.entries(parsed)) {
      if (FORBIDDEN_RECORD_KEYS.has(key)) continue;
      if (!isObjectionStatus(value)) continue;
      out[key] = value;
    }

    return out;
  } catch {
    return Object.create(null);
  }
};

const loadObjectionSnapshot = (threadId: string): ObjectionSnapshot[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(objectionSnapshotKey(threadId));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: ObjectionSnapshot[] = [];
    for (const entry of parsed) {
      if (!isRecord(entry)) continue;

      const id = typeof entry.id === "string" ? entry.id : "";
      if (!id || FORBIDDEN_RECORD_KEYS.has(id)) continue;

      const type = typeof entry.type === "string" ? entry.type : undefined;
      const severity = typeof entry.severity === "string" ? entry.severity : undefined;
      const summary = typeof entry.summary === "string" ? entry.summary : undefined;
      const source = isRecord(entry.source) ? entry.source : undefined;

      out.push({
        id,
        type,
        severity,
        summary,
        source: source
          ? {
              agentName: typeof source.agentName === "string" ? source.agentName : null,
              role: typeof source.role === "string" ? source.role : null,
              messageId: typeof source.messageId === "number" ? source.messageId : undefined,
              createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
              subject: typeof source.subject === "string" ? source.subject : undefined,
            }
          : undefined,
      });
    }

    return out;
  } catch {
    return [];
  }
};

const formatObjectionListItem = (objection: ObjectionSnapshot, status: ObjectionStatus): string => {
  const statusLabel = OBJECTION_STATUS_LABELS[status] ?? status;
  const typeLabel = objection.type ? objection.type.replace(/_/g, " ") : "objection";
  const severityLabel = objection.severity ? objection.severity.toUpperCase() : "MODERATE";
  const sourceLabel =
    objection.source?.role?.trim() ||
    objection.source?.agentName?.trim() ||
    (typeof objection.source?.messageId === "number" ? `msg ${objection.source.messageId}` : "");
  const sourceSuffix = sourceLabel ? ` — ${sourceLabel}` : "";
  const summary = objection.summary?.trim() || `Objection ${objection.id}`;

  return `[${statusLabel}] (${severityLabel}) ${typeLabel}: ${summary}${sourceSuffix}`;
};

const buildObjectionRegisterBriefSection = (threadId: string): BriefSection | null => {
  const snapshot = loadObjectionSnapshot(threadId);
  const statuses = loadObjectionStatuses(threadId);

  const fallbackIds = Object.keys(statuses).filter((id) => id && !FORBIDDEN_RECORD_KEYS.has(id));
  const ids = snapshot.length > 0 ? snapshot.map((o) => o.id) : fallbackIds;
  if (ids.length === 0) return null;

  const items: string[] = [];
  let unresolvedCount = 0;

  for (const id of ids) {
    const status = statuses[id] ?? "open";
    if (!RESOLVED_OBJECTION_STATUSES.has(status)) unresolvedCount += 1;
    const objection = snapshot.find((o) => o.id === id) ?? { id };
    items.push(formatObjectionListItem(objection, status));
  }

  const total = ids.length;
  let status: BriefSection["status"] = "partial";
  if (unresolvedCount === 0) {
    status = "complete";
  } else if (unresolvedCount === total) {
    status = "pending";
  }

  return {
    id: "objection_register",
    title: "Objection Register",
    icon: <span className="text-lg">⚠️</span>,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    status,
    items,
    summary: `${unresolvedCount} unresolved / ${total} total objections`,
  };
};

const renderBriefMarkdown = (params: {
  threadId: string;
  generatedAt: string;
  qualityScore: number;
  sections: BriefSection[];
}): string => {
  const { threadId, generatedAt, qualityScore, sections } = params;
  const lines: string[] = [];

  lines.push("# Research Brief");
  lines.push("");
  lines.push(`- Thread ID: ${threadId}`);
  lines.push(`- Generated at: ${generatedAt}`);
  lines.push(`- Quality score: ${qualityScore}%`);
  lines.push("");

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    if (section.summary) {
      lines.push("");
      lines.push(section.summary);
    }
    lines.push("");

    if (section.items.length > 0) {
      section.items.forEach((item) => lines.push(`- ${item}`));
    } else {
      lines.push("- _No items recorded._");
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
};

const downloadTextFile = (filename: string, content: string, mime: string): void => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

// ============================================================================
// Main Page
// ============================================================================

export default function BriefPage() {
  const params = useParams();
  const threadId = normalizeThreadId(params.threadId);

  if (isDemoThreadId(threadId)) {
    return (
      <DemoFeaturePreview
        threadId={threadId}
        featureName="Research Brief"
        featureDescription="Generate executive summaries of session progress, highlight decisions, and capture current state for handoffs."
      />
    );
  }

  return <BriefPageContent threadId={threadId} />;
}

function BriefPageContent({ threadId }: { threadId: string }) {
  const router = useRouter();

  useEffect(() => {
    recordSessionResumeEntry(threadId, "brief");
  }, [threadId]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["hypothesis_slate"]),
  );
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [isRefreshing, startRefresh] = useTransition();
  const [objectionSection, setObjectionSection] = useState<BriefSection | null>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    setObjectionSection(buildObjectionRegisterBriefSection(threadId));
  }, [threadId]);

  const briefSections = objectionSection
    ? [...BASE_BRIEF_SECTIONS, objectionSection]
    : BASE_BRIEF_SECTIONS;

  const handleExport = async (formatId: string) => {
    setExportingFormat(formatId);
    try {
      const generatedAt = new Date().toISOString();
      const completedSections = briefSections.filter((s) => s.status === "complete").length;
      const qualityScore = Math.round((completedSections / briefSections.length) * 100);

      if (formatId === "markdown") {
        const markdown = renderBriefMarkdown({
          threadId,
          generatedAt,
          qualityScore,
          sections: briefSections,
        });
        downloadTextFile(`research-brief-${threadId}.md`, markdown, "text/markdown");
        return;
      }

      if (formatId === "json") {
        const payload = {
          type: "research_brief_export",
          version: "0.1",
          threadId,
          generatedAt,
          qualityScore,
          sections: briefSections.map((section) => ({
            id: section.id,
            title: section.title,
            status: section.status,
            summary: section.summary ?? null,
            items: section.items,
          })),
        };

        downloadTextFile(
          `research-brief-${threadId}.json`,
          JSON.stringify(payload, null, 2),
          "application/json",
        );
        return;
      }

      if (formatId === "pdf") {
        window.print();
      }
    } finally {
      setExportingFormat(null);
    }
  };

  const handleCopy = async () => {
    try {
      const completedSections = briefSections.filter((s) => s.status === "complete").length;
      const qualityScore = Math.round((completedSections / briefSections.length) * 100);
      const markdown = renderBriefMarkdown({
        threadId,
        generatedAt: new Date().toISOString(),
        qualityScore,
        sections: briefSections,
      });

      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
      setLastUpdatedAt(Date.now());
    });
  };

  const completedSections = briefSections.filter((s) => s.status === "complete").length;
  const qualityScore = Math.round((completedSections / briefSections.length) * 100);
  const lastUpdatedLabel = formatRelativeTime(lastUpdatedAt, now);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <Link href="/sessions" className="hover:text-foreground transition-colors">
          Sessions
        </Link>
        <span>/</span>
        <Link
          href={`/sessions/${threadId}`}
          className="hover:text-foreground transition-colors font-mono"
        >
          {threadId ? `${threadId.slice(0, 12)}...` : "..."}
        </Link>
        <span>/</span>
        <span className="text-foreground">Research Brief</span>
      </motion.nav>

      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link
          href={`/sessions/${threadId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8"
        >
          <ChevronLeftIcon className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Session
        </Link>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-8">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="relative">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20">
                  <DocumentIcon className="size-7" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <CheckCircleIcon className="size-3 text-white" />
                </motion.div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Research Brief
                </h1>
                <p className="text-muted-foreground">
                  Comprehensive research artifact ready for export
                </p>
              </div>
            </div>
          </motion.header>

          {/* Generation Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
          >
            <div className="flex items-center justify-center size-10 rounded-full bg-emerald-500/10">
              <SparklesIcon className="size-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-foreground">Brief Generated Successfully</div>
              <div className="text-sm text-muted-foreground">
                Last updated {lastUpdatedLabel} · {completedSections}/{briefSections.length}{" "}
                sections complete
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Refresh brief"
            >
              <RefreshIcon
                className={`size-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </motion.div>

          {/* Brief Sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Brief Contents</h2>
              <button
                onClick={() => {
                  if (expandedSections.size === briefSections.length) {
                    setExpandedSections(new Set());
                  } else {
                    setExpandedSections(new Set(briefSections.map((s) => s.id)));
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expandedSections.size === briefSections.length ? "Collapse All" : "Expand All"}
              </button>
            </div>
            <div className="space-y-2">
              {briefSections.map((section, idx) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                >
                  <SectionCard
                    section={section}
                    isExpanded={expandedSections.has(section.id)}
                    onToggle={() => toggleSection(section.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Export Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-4"
          >
            <h2 className="font-semibold text-foreground">Export Options</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {EXPORT_FORMATS.map((format, idx) => (
                <motion.div
                  key={format.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + idx * 0.05 }}
                >
                  <ExportCard
                    format={format}
                    onExport={() => handleExport(format.id)}
                    isExporting={exportingFormat === format.id}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          {/* Quality Meter */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <QualityMeter score={qualityScore} />
          </div>

          {/* Quick Actions */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-4">
            <h3 className="font-semibold text-foreground">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction
                icon={<EyeIcon className="size-5" />}
                label="Preview"
                onClick={() => {}}
              />
              <QuickAction
                icon={
                  copied ? (
                    <CheckCircleIcon className="size-5 text-emerald-500" />
                  ) : (
                    <ClipboardIcon className="size-5" />
                  )
                }
                label={copied ? "Copied!" : "Copy"}
                onClick={handleCopy}
              />
              <QuickAction
                icon={<ShareIcon className="size-5" />}
                label="Share"
                onClick={() => {}}
              />
              <QuickAction
                icon={<PrinterIcon className="size-5" />}
                label="Print"
                onClick={() => {}}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-4">
            <h3 className="font-semibold text-foreground">Brief Metadata</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">Today, 2:34 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="text-foreground">2 minutes ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground font-mono">v1.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Word Count</span>
                <span className="text-foreground">~2,450 words</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources</span>
                <span className="text-foreground">12 citations</span>
              </div>
            </div>
          </div>

          {/* Brenner Quote */}
          <div className="p-5 rounded-xl border border-dashed border-primary/30 bg-primary/5">
            <blockquote className="text-sm italic text-muted-foreground">
              &ldquo;A good research brief is not a summary of what you found, but a map of where
              the truth might hide.&rdquo;
            </blockquote>
            <cite className="block mt-2 text-xs text-primary font-medium">— Sydney Brenner</cite>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
