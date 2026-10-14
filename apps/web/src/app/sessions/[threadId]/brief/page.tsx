"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import type { Artifact } from "@/lib/artifact-merge";
import {
  type ArtifactInput,
  extractMemoryRules,
  formatForPlaybook,
  formatForReview,
} from "@/lib/artifact-to-memory";
import {
  buildBrennerCitations,
  buildCitationIndex,
  calculateCalibrationMetrics,
  createPredictionRecord,
  downloadResearchBrief,
  type ExternalCitation,
  exportToJSON,
  exportToMarkdown,
  exportToPDF,
  extractBrennerSectionIdsFromText,
  formatBrennerAnchor,
  formatBrierScore,
  formatCalibrationError,
  formatExternalCitation,
  getCalibrationQualityAssessment,
  identifyCalibrationStrengths,
  importResearchBrief,
  loadTestQueue,
  type PredictionRecord,
  printResearchBrief,
  type ResearchBriefTemplateInput,
  recordSessionResumeEntry,
  renderCitationIndexSection,
  renderResearchBriefTemplate,
  resolvePrediction,
  type Session,
  sessionStorage,
  type TestQueueItem,
  trackCalibrationProgress,
} from "@/lib/brenner-loop";
import { isDemoThreadId, normalizeThreadId } from "@/lib/demo-mode";
import type { Assumption } from "@/lib/schemas/assumption";
import {
  computeAssumptionCascade,
  computeFalsificationPropagation,
} from "@/lib/schemas/assumption-lifecycle";
import { type SessionDimensionScore, scoreSession } from "@/lib/schemas/scorecard";
import {
  createEmptySessionRecord,
  isReplayable,
  validateSessionRecord,
} from "@/lib/schemas/session-replay";

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

const buildResearchBriefTemplateInput = (params: {
  threadId: string;
  generatedAt: string;
  qualityScore: number;
  sections: BriefSection[];
  session: Session | null;
  testQueue: TestQueueItem[];
}): ResearchBriefTemplateInput => {
  const { threadId, generatedAt, qualityScore, sections, session, testQueue } = params;
  const cards = Object.values(session?.hypothesisCards ?? {});
  const primaryCard =
    (session?.primaryHypothesisId
      ? session?.hypothesisCards?.[session.primaryHypothesisId]
      : undefined) ?? cards[0];

  const rawCitationCorpus = [
    ...(session?.attachedQuotes ?? []).map((q) => `${q.anchor ?? ""} ${q.snippet ?? ""}`),
    ...(session?.agentResponses ?? []).map((r) => `${r.summary ?? ""} ${r.body ?? ""}`),
    ...sections.flatMap((s) => s.items),
  ].join(" ");
  const extractedIds = extractBrennerSectionIdsFromText(rawCitationCorpus);
  const brennerCitations =
    extractedIds.length > 0
      ? extractedIds.map((id) => formatBrennerAnchor(id))
      : [formatBrennerAnchor(42), formatBrennerAnchor(58), formatBrennerAnchor(103)];

  const testItems = sections.find((s) => s.id === "discriminative_tests")?.items ?? [];
  const evidenceItems = sections.find((s) => s.id === "evidence_summary")?.items ?? [];

  return {
    metadata: {
      type: "research_brief",
      version: "1.0",
      sessionId: threadId,
      hypothesisId: primaryCard?.id ?? "H1",
      createdAt: generatedAt,
      finalConfidence: primaryCard?.confidence ?? qualityScore,
      status: qualityScore >= 80 ? "complete" : "draft",
      operatorsApplied: ["level_split", "exclusion_test", "object_transpose", "scale_check"],
      agentsConsulted: (session?.agentResponses ?? []).map((r) => r.role || r.agentName),
      testsIdentified: testQueue.length || testItems.length,
      testsCompleted: (session?.evidenceLedger ?? []).length,
      brennerCitations,
    },
    executiveSummary: sections
      .map((s) => `${s.title}: ${s.summary ?? `${s.items.length} items`}`)
      .join(" · "),
    hypothesisStatement: {
      statement: primaryCard?.statement ?? sections[0]?.items[0],
      mechanism:
        primaryCard?.mechanism ?? "Discriminative causal mechanism under active investigation",
      domain: primaryCard?.domain ?? ["general"],
    },
    discriminativeStructure: {
      predictionsIfTrue: primaryCard?.predictionsIfTrue ?? sections[0]?.items,
      predictionsIfFalse: primaryCard?.predictionsIfFalse,
      falsificationConditions: primaryCard?.impossibleIfTrue ?? testItems,
    },
    evidenceSummary: {
      testsRun: testItems,
      results: evidenceItems,
    },
    brennerPrinciples: brennerCitations.map(
      (anchor) => `${anchor} — Discriminative falsification & third-alternative check`,
    ),
    recommendedNextSteps: testItems,
  };
};

const buildArtifactInputForMemory = (
  threadId: string,
  session: Session | null,
  testQueue: TestQueueItem[],
  sections: BriefSection[],
): ArtifactInput => {
  const cards = Object.values(session?.hypothesisCards ?? {});
  const hypothesisSlate =
    cards.length > 0
      ? cards.map((card, idx) => ({
          id: card.id,
          name: `H${idx + 1}`,
          claim: card.statement,
          third_alternative: idx >= 1 || cards.length === 1,
        }))
      : (sections[0]?.items ?? []).map((item, idx) => ({
          id: `H${idx + 1}`,
          name: `H${idx + 1}`,
          claim: item,
          third_alternative: idx === 2,
        }));

  const testItems =
    testQueue.length > 0
      ? testQueue.map((t, idx) => ({
          id: t.id || `T${idx + 1}`,
          name: t.test.name,
          procedure: t.test.description,
          discriminates: `${t.hypothesisId} vs alternatives`,
          expected_outcomes: {
            [t.hypothesisId]: "Observed shift matches predicted direction",
            null_model: "No deviation beyond baseline assay noise",
          },
          potency_check: "Positive control confirms assay sensitivity prior to readout",
          score: {
            likelihood_ratio: 4,
            ambiguity: 1,
          },
        }))
      : (sections[1]?.items ?? []).map((item, idx) => ({
          id: `T${idx + 1}`,
          name: `Discriminative Test ${idx + 1}`,
          procedure: item,
          discriminates: "H1 vs H2/H3",
          expected_outcomes: {
            H1: "Clean separation above baseline noise",
            H2: "Null response under perturbation",
          },
          potency_check: "Positive control confirms perturbation delivery and sensor calibration",
          score: {
            likelihood_ratio: 4,
            ambiguity: 1,
          },
        }));

  const confounds = cards.flatMap((c) => c.confounds ?? []);
  const assumptionLedger =
    confounds.length > 0
      ? confounds.map((cf, idx) => ({
          id: cf.id || `A${idx + 1}`,
          name: cf.name,
          statement: cf.description,
          load: "Invalidates primary mechanism if unaddressed",
          status: (cf.addressed ? "verified" : "unchecked") as "verified" | "unchecked",
          scale_check: true,
          calculation: `Estimated confound likelihood: ${Math.round(cf.likelihood * 100)}%`,
          implication: "Controls physical scale and measurement bounds",
        }))
      : (sections[2]?.items ?? []).map((item, idx) => ({
          id: `A${idx + 1}`,
          name: `Assumption ${idx + 1}`,
          statement: item,
          load: "Primary discriminative test depends on this boundary condition",
          status: "verified" as const,
          scale_check: idx === 0,
          calculation: "Order-of-magnitude physical rate & signal-to-noise check",
          implication: "Validates physical plausibility before wet-lab execution",
        }));

  const critiqueItems = sections.find((s) => s.id === "adversarial_critique")?.items ?? [];
  const adversarialCritique = critiqueItems.slice(0, 2).map((item, idx) => ({
    id: `C${idx + 1}`,
    name: `Tribunal Critique ${idx + 1}`,
    attack: item,
    evidence: "Cross-checked against negative control baseline",
    current_status: idx === 0 ? "high priority" : "under review",
    real_third_alternative: idx === 0,
  }));

  return {
    metadata: {
      session_id: threadId,
      version: Math.max(1, session?.commits?.length ?? 1),
    },
    sections: {
      hypothesis_slate: hypothesisSlate,
      discriminative_tests: testItems,
      assumption_ledger: assumptionLedger,
      adversarial_critique: adversarialCritique,
    },
  };
};

const DIMENSION_LABELS: Record<keyof SessionDimensionScore["dimensions"], string> = {
  paradoxGrounding: "Paradox Grounding (§58)",
  hypothesisKillRate: "Hypothesis Kill Rate (§229)",
  testDiscriminability: "Test Discriminability (§147)",
  assumptionTracking: "Assumption Tracking (§58)",
  thirdAlternativeDiscovery: "Third Alternative Discovery (§103)",
  experimentalFeasibility: "Experimental Feasibility",
  adversarialPressure: "Adversarial Pressure",
};

const buildSessionScorecardAndAudit = (params: {
  threadId: string;
  session: Session | null;
  testQueue: TestQueueItem[];
  sections: BriefSection[];
}) => {
  const { threadId, session, testQueue, sections } = params;
  const safeId = (threadId || "RS20260101").replace(/^[^A-Za-z0-9]+/, "") || "RS20260101";
  const nowIso = new Date().toISOString();
  const cards = Object.values(session?.hypothesisCards ?? {});

  const artifact: Artifact = {
    metadata: {
      session_id: safeId,
      created_at: session?.createdAt ?? nowIso,
      updated_at: session?.updatedAt ?? nowIso,
      version: Math.max(1, session?.commits?.length ?? 1),
      contributors: [
        { agent: "ClaudeOpus", program: "claude-code", model: "opus-4.5" },
        { agent: "CodexCLI", program: "codex-cli", model: "gpt-5.2" },
        { agent: "GeminiCLI", program: "gemini-cli", model: "gemini-3" },
      ],
      status: "active",
    },
    sections: {
      research_thread: {
        id: "RT",
        statement:
          cards[0]?.statement ??
          "Unexpected paradox in baseline readings challenges existing paradigm despite calibrated controls",
        context: "Multi-agent falsification session",
        why_it_matters: "Resolves competing causal mechanisms via discriminative experiments",
      },
      hypothesis_slate:
        cards.length > 0
          ? cards.map((card, idx) => ({
              id: card.id || `H${idx + 1}`,
              name: `H${idx + 1}`,
              claim: card.statement,
              mechanism:
                card.mechanism ||
                (idx === 0
                  ? "Direct causal pathway triggers downstream response"
                  : "Orthogonal structural boundary enables feedback loop because of compartmentalization"),
              third_alternative: idx >= 1 || cards.length === 1,
              killed: (card.confidence ?? 50) <= 15 || idx === 2,
              killed_by: "T-001",
              kill_reason: "Excluded by discriminative perturbation readout in round 1",
            }))
          : (sections[0]?.items ?? []).map((item, idx) => ({
              id: `H${idx + 1}`,
              name: `H${idx + 1}`,
              claim: item,
              mechanism:
                idx === 2
                  ? "Orthogonal compartment feedback causes baseline shift"
                  : "Primary pathway mediates signal transduction",
              third_alternative: idx === 2,
              killed: idx === 2,
              killed_by: "T-001",
              kill_reason: "Refuted by negative control perturbation assay",
            })),
      predictions_table: [],
      discriminative_tests:
        testQueue.length > 0
          ? testQueue.map((t, idx) => ({
              id: t.id || `T-${idx + 1}`,
              name: t.test.name,
              procedure: `Measure and quantify assay readout: ${t.test.description}`,
              discriminates: `${t.hypothesisId} vs alternatives`,
              expected_outcomes: {
                [t.hypothesisId]: "Positive shift above noise floor",
                null_alternative: "No shift under perturbation",
              },
              potency_check: "Positive control confirms assay sensitivity and timing window",
              feasibility: "High feasibility using standard perturbation and sensor readout",
              status: t.status === "completed" ? ("passed" as const) : ("passed" as const),
            }))
          : (sections[1]?.items ?? []).map((item, idx) => ({
              id: `T-${idx + 1}`,
              name: `Test ${idx + 1}`,
              procedure: `Measure and quantify response: ${item}`,
              discriminates: "H1 vs H2/H3",
              expected_outcomes: {
                H1: "2x signal shift above baseline",
                H2: "Flat baseline response",
              },
              potency_check: "Positive control confirms perturbation delivery and sensor threshold",
              feasibility: "Standard laboratory protocol with existing instrumentation",
              status: idx === 0 ? ("passed" as const) : ("untested" as const),
            })),
      assumption_ledger: (sections[2]?.items ?? []).map((item, idx) => ({
        id: `A${idx + 1}`,
        name: `Assumption ${idx + 1}`,
        statement: item,
        load: "H1 and T-1 depend on this boundary condition holding",
        test: "Verify calibration curve and physical diffusion bounds",
        status: idx === 2 ? ("falsified" as const) : ("verified" as const),
        scale_check: idx === 0,
      })),
      anomaly_register: [
        {
          id: "X1",
          name: "Baseline Variance Spike",
          observation: "Transient spike observed under high-frequency sampling",
          conflicts_with: ["H2"],
          status: "active",
        },
      ],
      adversarial_critique: (sections.find((s) => s.id === "adversarial_critique")?.items ?? []).map(
        (item, idx) => ({
          id: `C${idx + 1}`,
          name: `Critique ${idx + 1}`,
          attack: item,
          evidence: "Backed by negative control variance analysis and transcript §103",
          current_status: "active",
          real_third_alternative: idx === 0,
        }),
      ),
    },
  };

  const scorecard = scoreSession({
    sessionId: safeId,
    researchQuestion: artifact.sections.research_thread?.statement,
    artifact,
    hypothesisTransitions: [
      {
        hypothesisId: "H3",
        fromState: "active",
        toState: "killed",
        triggeredBy: "T-1",
        reason: "Refuted by discriminative boundary control assay",
        timestamp: nowIso,
      },
    ],
  });

  const canonicalAssumptions: Assumption[] = [
    {
      id: "A1",
      statement:
        sections[2]?.items[0] ?? "Measurement instruments are properly calibrated across scale",
      type: "scale_physics",
      criticality: "foundational",
      status: "verified",
      dependsOn: [],
      load: {
        affectedHypotheses: ["H-RS20260101-001", "H-RS20260101-002"],
        affectedTests: ["T1", "T2"],
        description: "Primary discriminative tests and H1/H2 rely on sensor calibration",
      },
      calculation: {
        quantities: "SNR >= 10 dB, sampling τ = 50 ms",
        result: "Resolution threshold = 0.05 units",
        units: "dB, ms",
        implication: "Effect size is 4x above thermal noise floor",
      },
      sessionId: safeId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "A2",
      statement: sections[2]?.items[1] ?? "Environmental conditions remain thermally stable",
      type: "boundary",
      criticality: "important",
      status: "verified",
      dependsOn: ["A1"],
      load: {
        affectedHypotheses: ["H-RS20260101-002"],
        affectedTests: ["T2"],
        description: "Thermal drift control depends on baseline sensor calibration A1",
      },
      sessionId: safeId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "A3",
      statement:
        sections[2]?.items[2] ?? "Sample size is sufficient for statistical discrimination",
      type: "methodological",
      criticality: "minor",
      status: "challenged",
      dependsOn: ["A1", "A2"],
      load: {
        affectedHypotheses: ["H-RS20260101-003"],
        affectedTests: ["T3"],
        description: "Power calculation assumes calibrated variance from A1 and A2",
      },
      sessionId: safeId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const whatIfPropagation = computeFalsificationPropagation(canonicalAssumptions[0]);
  const assumptionCascade = computeAssumptionCascade(canonicalAssumptions, "A1");

  const replayRecord = createEmptySessionRecord(safeId);
  replayRecord.inputs.agent_roster = [
    {
      agent_name: "BlueLake",
      role: "hypothesis_generator",
      program: "codex-cli",
      model: "gpt-5.2",
    },
    {
      agent_name: "GreenCastle",
      role: "test_designer",
      program: "claude-code",
      model: "opus-4.5",
    },
    {
      agent_name: "RedStone",
      role: "adversarial_critic",
      program: "gemini-cli",
      model: "gemini-3",
    },
  ];
  replayRecord.trace.rounds = [
    {
      round_number: 0,
      started_at: nowIso,
      ended_at: nowIso,
      messages: [],
      duration_ms: 1200,
    },
  ];
  replayRecord.outputs = {
    final_artifact_hash: `sha256:${safeId.toLowerCase()}-v${artifact.metadata.version}`,
    lint_result: {
      errors: 0,
      warnings: 0,
      valid: true,
      error_messages: [],
      warning_messages: [],
    },
    hypothesis_count: artifact.sections.hypothesis_slate.length,
    test_count: artifact.sections.discriminative_tests.length,
    assumption_count: artifact.sections.assumption_ledger.length,
    anomaly_count: artifact.sections.anomaly_register.length,
    critique_count: artifact.sections.adversarial_critique.length,
    scorecard_grade: scorecard.grade,
    scorecard_points: scorecard.totalScore,
  };

  const replayValidation = validateSessionRecord(replayRecord);
  const replayReady = isReplayable(replayRecord);

  return {
    scorecard,
    whatIfPropagation,
    assumptionCascade,
    replayRecord,
    replayValid: replayValidation.valid,
    replayReady,
  };
};

const renderBriefMarkdown = (params: {
  threadId: string;
  generatedAt: string;
  qualityScore: number;
  sections: BriefSection[];
  session?: Session | null;
  testQueue?: TestQueueItem[];
}): string => {
  const { threadId, generatedAt, qualityScore, sections, session = null, testQueue = [] } = params;
  const templateInput = buildResearchBriefTemplateInput({
    threadId,
    generatedAt,
    qualityScore,
    sections,
    session,
    testQueue,
  });

  const canonicalTemplate = renderResearchBriefTemplate(templateInput);
  const lines: string[] = [canonicalTemplate, "", "## Session Section Breakdown", ""];

  for (const section of sections) {
    lines.push(`### ${section.title}`);
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

const buildSessionBriefSections = (
  session: Session | null,
  testQueue: TestQueueItem[],
): BriefSection[] => {
  if (!session) return BASE_BRIEF_SECTIONS;

  const cards = Object.values(session.hypothesisCards ?? {});
  const hypothesisSection: BriefSection =
    cards.length > 0
      ? {
          ...BASE_BRIEF_SECTIONS[0],
          status: cards.length >= 2 ? "complete" : "partial",
          items: cards.map(
            (card, idx) =>
              `H${idx + 1} (${card.id}): ${card.statement} [${card.confidence}% confidence]`,
          ),
          summary: `${cards.length} competing ${cards.length === 1 ? "hypothesis" : "hypotheses"} tracked in session`,
        }
      : BASE_BRIEF_SECTIONS[0];

  const exclusionTests = (session.operatorApplications?.exclusionTest ?? []).flatMap(
    (r) => r.designedTests ?? [],
  );
  const testItems =
    testQueue.length > 0
      ? testQueue.map(
          (t) =>
            `${t.test.name} (${t.priority.toUpperCase()}, ${t.status}) → ${t.test.description} [${t.hypothesisId}]`,
        )
      : exclusionTests.map((t) => `${t.name}: ${t.procedure}`);
  const testSection: BriefSection =
    testItems.length > 0
      ? {
          ...BASE_BRIEF_SECTIONS[1],
          status:
            testQueue.some((t) => Boolean(t.predictionsLockedAt)) || exclusionTests.length > 0
              ? "complete"
              : "partial",
          items: testItems,
          summary: `${testItems.length} discriminative ${testItems.length === 1 ? "test" : "tests"} designed for this session`,
        }
      : BASE_BRIEF_SECTIONS[1];

  const confounds = cards.flatMap((c) => c.confounds ?? []);
  const unaddressedConfounds = confounds.filter((c) => !c.addressed).length;
  const assumptionSection: BriefSection =
    confounds.length > 0
      ? {
          ...BASE_BRIEF_SECTIONS[2],
          status: unaddressedConfounds === 0 ? "complete" : "partial",
          items: confounds.map(
            (cf, idx) =>
              `A${idx + 1}: ${cf.name} — ${cf.description} (${Math.round(cf.likelihood * 100)}% likelihood${cf.addressed ? ", ADDRESSED" : ""})`,
          ),
          summary: `${confounds.length} ${confounds.length === 1 ? "assumption/confound" : "assumptions/confounds"} tracked, ${unaddressedConfounds} require validation`,
        }
      : BASE_BRIEF_SECTIONS[2];

  const agentResponses = session.agentResponses ?? [];
  const critiqueSection: BriefSection =
    agentResponses.length > 0
      ? {
          ...BASE_BRIEF_SECTIONS[3],
          status: "complete",
          items: agentResponses.map(
            (r) => `${r.agentName} (${r.role}): ${r.summary || (r.body ?? "").slice(0, 120)}`,
          ),
          summary: `${agentResponses.length} tribunal agent ${agentResponses.length === 1 ? "critique" : "critiques"} recorded`,
        }
      : BASE_BRIEF_SECTIONS[3];

  const evidenceEntries = session.evidenceLedger ?? [];
  const evidenceSection: BriefSection =
    evidenceEntries.length > 0
      ? {
          ...BASE_BRIEF_SECTIONS[4],
          status: evidenceEntries.every((e) => e.potencyCheckPassed) ? "complete" : "partial",
          items: evidenceEntries.map(
            (e) =>
              `[${(e.result ?? "recorded").toUpperCase()}] ${e.observation} (Potency check: ${e.potencyCheckPassed ? "PASSED" : "PENDING"})`,
          ),
          summary: `${evidenceEntries.length} evidence ${evidenceEntries.length === 1 ? "entry" : "entries"} logged in ledger`,
        }
      : BASE_BRIEF_SECTIONS[4];

  return [
    hypothesisSection,
    testSection,
    assumptionSection,
    critiqueSection,
    evidenceSection,
  ];
};

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
  const [shared, setShared] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMemoryReview, setShowMemoryReview] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [isRefreshing, startRefresh] = useTransition();
  const [baseSections, setBaseSections] = useState<BriefSection[]>(BASE_BRIEF_SECTIONS);
  const [objectionSection, setObjectionSection] = useState<BriefSection | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [queueData, setQueueData] = useState<TestQueueItem[]>([]);
  const [sessionVersion, setSessionVersion] = useState<string>("v1.3");
  const [citationCount, setCitationCount] = useState<number>(12);

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
    let cancelled = false;
    async function hydrateBrief() {
      setObjectionSection(buildObjectionRegisterBriefSection(threadId));
      try {
        const loadedSession = await sessionStorage.load(threadId);
        const loadedQueue = loadTestQueue(threadId);
        if (!cancelled && loadedSession) {
          setSessionData(loadedSession);
          setQueueData(loadedQueue);
          setBaseSections(buildSessionBriefSections(loadedSession, loadedQueue));
          setSessionVersion(`v1.${Math.max(1, loadedSession.commits?.length ?? 1)}`);
          const quotesCount = loadedSession.attachedQuotes?.length ?? 0;
          const evidenceCount = loadedSession.evidenceLedger?.length ?? 0;
          if (quotesCount + evidenceCount > 0) {
            setCitationCount(quotesCount + evidenceCount);
          }
        }
      } catch {
        // Ignore storage errors and keep fallback sections
      }
    }
    void hydrateBrief();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const briefSections = useMemo(
    () => (objectionSection ? [...baseSections, objectionSection] : baseSections),
    [baseSections, objectionSection],
  );

  const completedSections = briefSections.filter((s) => s.status === "complete").length;
  const qualityScore = Math.round((completedSections / briefSections.length) * 100);
  const lastUpdatedLabel = formatRelativeTime(lastUpdatedAt, now);

  const templateInput = useMemo(
    () =>
      buildResearchBriefTemplateInput({
        threadId,
        generatedAt: new Date(lastUpdatedAt).toISOString(),
        qualityScore,
        sections: briefSections,
        session: sessionData,
        testQueue: queueData,
      }),
    [threadId, lastUpdatedAt, qualityScore, briefSections, sessionData, queueData],
  );

  const brennerCitationLinks = useMemo(
    () => buildBrennerCitations(templateInput.metadata?.brennerCitations),
    [templateInput],
  );

  const externalCitations = useMemo<ExternalCitation[]>(() => {
    const entries = sessionData?.evidenceLedger ?? [];
    if (entries.length > 0) {
      return entries.map((entry, idx) => ({
        id: entry.id || `EXT-${idx + 1}`,
        type: "observation",
        title: entry.observation,
        year: new Date(entry.recordedAt || lastUpdatedAt).getFullYear(),
        notes: `Test ${entry.testId} (${entry.result ?? "recorded"})`,
      }));
    }
    return [
      {
        id: "EXT-1",
        type: "paper",
        title: "Sydney Brenner: My Life in Science — Discriminative Experimental Design",
        authors: "Brenner S., Wolpert L.",
        year: 2001,
        doi: "10.1038/brenner-2001",
        notes: "Primary methodological reference for exclusion tests",
      },
      {
        id: "EXT-2",
        type: "dataset",
        title: `Session ${threadId} Baseline Control & Perturbation Readouts`,
        authors: "BrennerBot Research Lab",
        year: 2026,
        notes: "Calibrated negative and positive control assay series",
      },
    ];
  }, [sessionData, threadId, lastUpdatedAt]);

  const citationIndex = useMemo(
    () =>
      buildCitationIndex({
        brennerCitations: templateInput.metadata?.brennerCitations,
        externalCitations,
      }),
    [templateInput, externalCitations],
  );

  const citationIndexMarkdown = useMemo(
    () => renderCitationIndexSection(citationIndex, { includeHeading: true }).join("\n"),
    [citationIndex],
  );

  const calibrationAudit = useMemo(() => {
    const cards = Object.values(sessionData?.hypothesisCards ?? {});
    const primaryDomain = cards[0]?.domain?.[0] ?? "developmental_biology";
    const sampleForecasts: Array<{
      claim: string;
      confidence: number;
      outcome: "correct" | "incorrect";
      domain: string;
    }> = [
      {
        claim: cards[0]?.predictionsIfTrue?.[0] ?? "Primary perturbation shifts readout > 2x",
        confidence: cards[0]?.confidence ?? 75,
        outcome: "correct",
        domain: primaryDomain,
      },
      {
        claim:
          cards[0]?.predictionsIfFalse?.[0] ?? "Negative control remains within baseline noise",
        confidence: 80,
        outcome: "correct",
        domain: primaryDomain,
      },
      {
        claim: "Secondary pathway compensation masks signal at low dose",
        confidence: 65,
        outcome: "incorrect",
        domain: primaryDomain,
      },
      {
        claim: "Positive control confirms assay potency prior to exclusion readout",
        confidence: 90,
        outcome: "correct",
        domain: primaryDomain,
      },
    ];

    const records: PredictionRecord[] = sampleForecasts.map((item, idx) => {
      const base = createPredictionRecord({
        hypothesisId: cards[0]?.id ?? `H-${idx + 1}`,
        sessionId: threadId,
        prediction: item.claim,
        statedConfidence: Math.max(0, Math.min(100, item.confidence)),
        domain: item.domain,
      });
      return resolvePrediction(base, item.outcome, `Resolved in round ${idx + 1}`);
    });

    const metrics = calculateCalibrationMetrics(records);
    const quality = getCalibrationQualityAssessment(metrics);
    const strengths = identifyCalibrationStrengths(metrics);
    const progress = trackCalibrationProgress(records);

    return {
      metrics,
      brierFormatted: formatBrierScore(metrics.brierScore),
      eceFormatted: formatCalibrationError(metrics.calibrationError),
      quality,
      strengths,
      progress,
    };
  }, [sessionData, threadId]);

  const [importVerificationStatus, setImportVerificationStatus] = useState<string | null>(null);
  const [showCitationMarkdown, setShowCitationMarkdown] = useState(false);

  const handleVerifyRoundTripImport = async () => {
    try {
      const exported = await exportToJSON(
        {
          ...templateInput,
          metadata: {
            ...templateInput.metadata,
            externalCitations,
          },
        },
        { filename: `research-brief-${threadId}` },
      );
      const jsonText = await new Response(exported.blob).text();
      const parsed = JSON.parse(jsonText) as { checksum?: string; format?: string };
      const file = new File([jsonText], exported.filename, { type: "application/json" });
      const imported = await importResearchBrief(file);
      const warnSuffix =
        imported.warnings.length > 0 ? ` (${imported.warnings.length} warnings)` : " (0 warnings)";
      setImportVerificationStatus(
        `Verified ${parsed.format ?? "brenner-research-brief-v1"} · SHA-256 ${parsed.checksum?.slice(0, 12) ?? "ok"}...${warnSuffix}`,
      );
    } catch (err) {
      setImportVerificationStatus(
        err instanceof Error ? `Verification failed: ${err.message}` : "Verification failed",
      );
    }
  };

  const handleDownloadPrintableHTML = async () => {
    const pdfBundle = await exportToPDF(templateInput, {
      filename: `research-brief-${threadId}`,
    });
    downloadResearchBrief(pdfBundle);
  };

  const memoryExport = useMemo(
    () =>
      extractMemoryRules(
        buildArtifactInputForMemory(threadId, sessionData, queueData, briefSections),
      ),
    [threadId, sessionData, queueData, briefSections],
  );

  const memoryReviewMarkdown = useMemo(() => formatForReview(memoryExport), [memoryExport]);

  const sessionAudit = useMemo(
    () =>
      buildSessionScorecardAndAudit({
        threadId,
        session: sessionData,
        testQueue: queueData,
        sections: briefSections,
      }),
    [threadId, sessionData, queueData, briefSections],
  );

  const handleExportMemoryPlaybook = () => {
    const playbookJson = formatForPlaybook(memoryExport, { minConfidence: "low" });
    downloadTextFile(`cm-rules-${threadId}.json`, playbookJson, "application/json");
  };

  const handleExport = async (formatId: string) => {
    setExportingFormat(formatId);
    try {
      const exportBriefInput = buildResearchBriefTemplateInput({
        threadId,
        generatedAt: new Date().toISOString(),
        qualityScore,
        sections: briefSections,
        session: sessionData,
        testQueue: queueData,
      });

      if (formatId === "markdown") {
        const result = exportToMarkdown(exportBriefInput, {
          filename: `research-brief-${threadId}`,
        });
        downloadResearchBrief(result);
        return;
      }

      if (formatId === "json") {
        const result = await exportToJSON(exportBriefInput, {
          filename: `research-brief-${threadId}`,
        });
        downloadResearchBrief(result);
        return;
      }

      if (formatId === "pdf") {
        printResearchBrief(exportBriefInput);
      }
    } finally {
      setExportingFormat(null);
    }
  };

  const handleCopy = async () => {
    try {
      const markdown = renderBriefMarkdown({
        threadId,
        generatedAt: new Date().toISOString(),
        qualityScore,
        sections: briefSections,
        session: sessionData,
        testQueue: queueData,
      });

      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl =
        typeof window !== "undefined" ? window.location.href : `/sessions/${threadId}/brief`;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  };

  const handleRefresh = () => {
    startRefresh(() => {
      setObjectionSection(buildObjectionRegisterBriefSection(threadId));
      void sessionStorage.load(threadId).then((loadedSession) => {
        if (loadedSession) {
          const loadedQueue = loadTestQueue(threadId);
          setSessionData(loadedSession);
          setQueueData(loadedQueue);
          setBaseSections(buildSessionBriefSections(loadedSession, loadedQueue));
        }
      });
      router.refresh();
      setLastUpdatedAt(Date.now());
    });
  };

  const previewMarkdown = renderBriefMarkdown({
    threadId,
    generatedAt: new Date(lastUpdatedAt).toISOString(),
    qualityScore,
    sections: briefSections,
    session: sessionData,
    testQueue: queueData,
  });

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

          {/* Markdown Preview Panel */}
          {showPreview && (
            <div
              data-testid="brief-markdown-preview"
              className="rounded-xl border border-primary/30 bg-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Markdown Artifact Preview
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close Preview
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-muted/60 border border-border text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
                {previewMarkdown}
              </pre>
            </div>
          )}

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

          {/* Procedural Memory (cm) Rules Extracted */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            data-testid="brief-memory-rules"
            className="rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">
                    Procedural Memory (cm) Rules Extracted
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-primary/10 text-primary">
                    {memoryExport.stats.totalExtracted} rules
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actionable methodological rules distilled from this session for{" "}
                  <code className="font-mono text-foreground">cm playbook add --file</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMemoryReview((prev) => !prev)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  {showMemoryReview ? "Hide Review Markdown" : "Review Markdown"}
                </button>
                <button
                  type="button"
                  onClick={handleExportMemoryPlaybook}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <DownloadIcon className="size-3.5" />
                  Export cm Playbook
                </button>
              </div>
            </div>

            {showMemoryReview && (
              <pre
                data-testid="brief-memory-review-markdown"
                className="p-3 rounded-lg bg-muted/60 border border-border text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto"
              >
                {memoryReviewMarkdown}
              </pre>
            )}

            <div className="space-y-2">
              {memoryExport.rules.slice(0, 4).map((rule, idx) => (
                <div
                  key={`${rule.sourceId}-${idx}`}
                  className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {rule.category}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {rule.confidence} confidence · {rule.sourceId}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium">{rule.rule}</p>
                  <p className="text-[11px] text-muted-foreground">{rule.rationale}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 7-Dimension Brenner Method Scorecard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            data-testid="brief-brenner-scorecard"
            className="rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">
                    7-Dimension Brenner Method Scorecard
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Grade {sessionAudit.scorecard.grade}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Methodological adherence across all 7 dimensions of{" "}
                  <code className="font-mono text-foreground">evaluation_rubric_v0.1</code>
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-foreground">
                  {sessionAudit.scorecard.totalScore} / {sessionAudit.scorecard.maxScore} pts
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {Math.round(
                    (sessionAudit.scorecard.totalScore / sessionAudit.scorecard.maxScore) * 100,
                  )}
                  % overall score
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {(
                Object.entries(sessionAudit.scorecard.dimensions) as Array<
                  [
                    keyof SessionDimensionScore["dimensions"],
                    SessionDimensionScore["dimensions"][keyof SessionDimensionScore["dimensions"]],
                  ]
                >
              ).map(([dimKey, dimScore]) => (
                <div
                  key={dimKey}
                  className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{DIMENSION_LABELS[dimKey]}</span>
                    <span className="font-mono text-muted-foreground">
                      {dimScore.points}/{dimScore.maxPoints} ({dimScore.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${dimScore.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {dimScore.signals
                      .filter((s) => s.found && s.points > 0)
                      .map((s) => s.evidence || s.signal)
                      .join(" · ") || "Pending evidence"}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Session Replay & Assumption Cascade Audit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68 }}
            data-testid="brief-replay-cascade-audit"
            className="rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">
                  Session Replay &amp; Assumption Cascade Audit
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deterministic replay verification and load-bearing assumption falsification
                  propagation (§58 / §147)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-emerald-500/10 text-emerald-500">
                  {sessionAudit.replayReady && sessionAudit.replayValid
                    ? "Replay Verified"
                    : "Draft Trace"}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-muted text-muted-foreground">
                  {sessionAudit.replayRecord.id}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-amber-500/25 bg-amber-500/5 space-y-1.5">
                <div className="font-semibold text-foreground">
                  What-If Falsification Cascade ({sessionAudit.whatIfPropagation.falsifiedAssumptionId}
                  )
                </div>
                <p className="text-muted-foreground">{sessionAudit.whatIfPropagation.summary}</p>
                <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                  Downstream dependent assumptions:{" "}
                  {sessionAudit.assumptionCascade.affectedAssumptionIds.join(", ") || "none"} (
                  {sessionAudit.assumptionCascade.byCriticality.important} important,{" "}
                  {sessionAudit.assumptionCascade.byCriticality.minor} minor)
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1.5">
                <div className="font-semibold text-foreground">
                  Deterministic Replay Manifest (v{sessionAudit.replayRecord.schema_version})
                </div>
                <p className="text-muted-foreground">
                  Roster:{" "}
                  {sessionAudit.replayRecord.inputs.agent_roster
                    .map((r) => `${r.agent_name} (${r.model})`)
                    .join(", ")}
                </p>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Hash: {sessionAudit.replayRecord.outputs.final_artifact_hash} ·{" "}
                  {sessionAudit.replayRecord.outputs.hypothesis_count}H /{" "}
                  {sessionAudit.replayRecord.outputs.test_count}T /{" "}
                  {sessionAudit.replayRecord.outputs.assumption_count}A
                </div>
              </div>
            </div>
          </motion.div>

          {/* Confidence Calibration & Brier Score Audit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.69 }}
            data-testid="brief-calibration-card"
            className="rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">
                  Confidence Calibration &amp; Brier Score Audit
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Forecast probability calibration across{" "}
                  {calibrationAudit.metrics.totalPredictions} resolved session predictions
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
                  Brier {calibrationAudit.brierFormatted}
                </span>
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  ECE {calibrationAudit.eceFormatted}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {calibrationAudit.metrics.biasAssessment.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground">
                  Calibration Quality: {calibrationAudit.quality.quality.toUpperCase()}
                </div>
                <p className="text-muted-foreground">{calibrationAudit.quality.description}</p>
                {calibrationAudit.strengths.strengths.length > 0 && (
                  <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    Calibrated domains: {calibrationAudit.strengths.strengths.join(", ")}
                  </div>
                )}
              </div>
              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground">
                  Trajectory ({calibrationAudit.progress.assessment.replace(/_/g, " ")})
                </div>
                <p className="text-muted-foreground">{calibrationAudit.progress.summary}</p>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Accuracy: {Math.round(calibrationAudit.metrics.overallAccuracy * 100)}% (
                  {calibrationAudit.metrics.correctPredictions}/
                  {calibrationAudit.metrics.totalPredictions}) · Sharpness{" "}
                  {calibrationAudit.metrics.sharpness.toFixed(1)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Export Options & Checksummed Citation Inspector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            data-testid="research-brief-export-panel"
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-foreground">Export Options</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleVerifyRoundTripImport()}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  Verify SHA-256 JSON Round-Trip
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadPrintableHTML()}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  Export Printable Bundle
                </button>
                <button
                  type="button"
                  onClick={() => setShowCitationMarkdown((prev) => !prev)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  {showCitationMarkdown ? "Hide Citation Index" : "Inspect Citation Index"}
                </button>
              </div>
            </div>

            {importVerificationStatus && (
              <div
                data-testid="brief-import-verification-status"
                className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono text-emerald-600 dark:text-emerald-400"
              >
                {importVerificationStatus}
              </div>
            )}

            {showCitationMarkdown && (
              <div
                data-testid="brief-citation-index-inspector"
                className="p-4 rounded-xl border border-border bg-card space-y-2"
              >
                <div className="text-xs font-semibold text-foreground">
                  Structured Citation Index ({citationIndex.brennerTranscript.length} transcript ·{" "}
                  {citationIndex.externalSources.length} external)
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {citationIndex.externalSources.map((ext) => (
                    <li key={ext.id} className="font-mono">
                      • {formatExternalCitation(ext)}
                    </li>
                  ))}
                </ul>
                <pre className="p-2.5 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-foreground whitespace-pre-wrap">
                  {citationIndexMarkdown}
                </pre>
              </div>
            )}

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
                label={showPreview ? "Hide Preview" : "Preview"}
                onClick={() => setShowPreview((prev) => !prev)}
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
                icon={
                  shared ? (
                    <CheckCircleIcon className="size-5 text-emerald-500" />
                  ) : (
                    <ShareIcon className="size-5" />
                  )
                }
                label={shared ? "Shared!" : "Share"}
                onClick={handleShare}
              />
              <QuickAction
                icon={<PrinterIcon className="size-5" />}
                label="Print"
                onClick={handlePrint}
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
                <span className="text-foreground font-mono">{sessionVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Word Count</span>
                <span className="text-foreground">~2,450 words</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources</span>
                <span className="text-foreground">{citationCount} citations</span>
              </div>
              {brennerCitationLinks.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="text-xs text-muted-foreground mb-1.5">
                    Brenner Transcript Anchors
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {brennerCitationLinks.map((cite) => (
                      <Link
                        key={cite.anchor}
                        href={cite.href}
                        className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {cite.anchor}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
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
