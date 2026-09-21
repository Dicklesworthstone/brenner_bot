import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import { checkOrchestrationAuth, isLabModeEnabled } from "@/lib/auth";
import { isDemoThreadId } from "@/lib/demo-mode";

export const metadata: Metadata = {
  title: "Evidence Pack",
  description: "View external evidence for a Brenner Loop research session.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ----- Evidence Pack Types (mirroring specs/evidence_pack_v0.1.md) -----

type EvidenceType =
  | "paper"
  | "preprint"
  | "dataset"
  | "experiment"
  | "observation"
  | "prior_session"
  | "expert_opinion"
  | "code_artifact";

interface EvidenceExcerpt {
  anchor: string;
  text: string;
  verbatim: boolean;
  location?: string;
  note?: string;
}

interface EvidenceRecord {
  id: string;
  type: EvidenceType;
  title: string;
  authors?: string[];
  date?: string;
  source: string;
  access_method: "url" | "doi" | "file" | "session" | "manual";
  imported_at: string;
  imported_by: string;
  relevance: string;
  key_findings: string[];
  supports?: string[];
  refutes?: string[];
  informs?: string[];
  verified: boolean;
  verification_notes?: string;
  excerpts: EvidenceExcerpt[];
}

interface EvidencePack {
  version: string;
  thread_id: string;
  created_at: string;
  updated_at: string;
  next_id: number;
  records: EvidenceRecord[];
}

// ----- Utilities -----

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function sanitizeThreadId(threadId: string): string {
  // Simple sanitization: alphanumeric, dash, underscore, dot only
  return threadId.replace(/[^a-zA-Z0-9\-_.]/g, "_");
}

const VALID_EVIDENCE_TYPES = new Set<string>([
  "paper",
  "preprint",
  "dataset",
  "experiment",
  "observation",
  "prior_session",
  "expert_opinion",
  "code_artifact",
]);

const VALID_ACCESS_METHODS = new Set<string>(["url", "doi", "file", "session", "manual"]);

/**
 * Validates that a parsed JSON object conforms to the EvidencePack structure.
 * Returns the validated object or throws an error with details.
 */
function validateEvidencePack(data: unknown): EvidencePack {
  if (data === null || typeof data !== "object") {
    throw new Error("Evidence pack must be an object");
  }

  const obj = data as Record<string, unknown>;

  // Check required top-level fields
  if (typeof obj.version !== "string") {
    throw new Error("Missing or invalid 'version' field");
  }
  if (typeof obj.thread_id !== "string") {
    throw new Error("Missing or invalid 'thread_id' field");
  }
  if (typeof obj.created_at !== "string") {
    throw new Error("Missing or invalid 'created_at' field");
  }
  if (typeof obj.updated_at !== "string") {
    throw new Error("Missing or invalid 'updated_at' field");
  }
  if (typeof obj.next_id !== "number") {
    throw new Error("Missing or invalid 'next_id' field");
  }
  if (!Array.isArray(obj.records)) {
    throw new Error("Missing or invalid 'records' field (expected array)");
  }

  // Validate each record has all required fields
  for (let i = 0; i < obj.records.length; i++) {
    const record = obj.records[i];
    if (typeof record !== "object" || record === null) {
      throw new Error(`Record at index ${i} is not an object`);
    }
    const rec = record as Record<string, unknown>;
    const recId = typeof rec.id === "string" ? rec.id : `index ${i}`;

    if (typeof rec.id !== "string") {
      throw new Error(`Record ${recId}: missing 'id' field`);
    }
    if (typeof rec.type !== "string") {
      throw new Error(`Record ${recId}: missing 'type' field`);
    }
    if (!VALID_EVIDENCE_TYPES.has(rec.type)) {
      throw new Error(`Record ${recId}: invalid type '${rec.type}'`);
    }
    if (typeof rec.title !== "string") {
      throw new Error(`Record ${recId}: missing 'title' field`);
    }
    if (typeof rec.source !== "string") {
      throw new Error(`Record ${recId}: missing 'source' field`);
    }
    if (typeof rec.access_method !== "string") {
      throw new Error(`Record ${recId}: missing 'access_method' field`);
    }
    if (!VALID_ACCESS_METHODS.has(rec.access_method)) {
      throw new Error(`Record ${recId}: invalid access_method '${rec.access_method}'`);
    }
    if (typeof rec.imported_at !== "string") {
      throw new Error(`Record ${recId}: missing 'imported_at' field`);
    }
    if (typeof rec.imported_by !== "string") {
      throw new Error(`Record ${recId}: missing 'imported_by' field`);
    }
    if (typeof rec.relevance !== "string") {
      throw new Error(`Record ${recId}: missing 'relevance' field`);
    }
    if (typeof rec.verified !== "boolean") {
      throw new Error(`Record ${recId}: missing or invalid 'verified' field (expected boolean)`);
    }
    if (!Array.isArray(rec.key_findings)) {
      throw new Error(`Record ${recId}: missing 'key_findings' array`);
    }
    if (!Array.isArray(rec.excerpts)) {
      throw new Error(`Record ${recId}: missing 'excerpts' array`);
    }

    // Validate each excerpt has required fields
    for (let j = 0; j < rec.excerpts.length; j++) {
      const excerpt = rec.excerpts[j];
      if (typeof excerpt !== "object" || excerpt === null) {
        throw new Error(`Record ${recId}, excerpt ${j}: not an object`);
      }
      const ex = excerpt as Record<string, unknown>;
      if (typeof ex.anchor !== "string") {
        throw new Error(`Record ${recId}, excerpt ${j}: missing 'anchor' field`);
      }
      if (typeof ex.text !== "string") {
        throw new Error(`Record ${recId}, excerpt ${j}: missing 'text' field`);
      }
      if (typeof ex.verbatim !== "boolean") {
        throw new Error(`Record ${recId}, excerpt ${j}: missing or invalid 'verbatim' field`);
      }
    }
  }

  return data as EvidencePack;
}

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  paper: "Paper",
  preprint: "Preprint",
  dataset: "Dataset",
  experiment: "Experiment",
  observation: "Observation",
  prior_session: "Prior Session",
  expert_opinion: "Expert Opinion",
  code_artifact: "Code Artifact",
};

const EVIDENCE_TYPE_COLORS: Record<EvidenceType, string> = {
  paper: "bg-blue-500/15 text-blue-600 border-blue-500/20 dark:text-blue-400",
  preprint: "bg-purple-500/15 text-purple-600 border-purple-500/20 dark:text-purple-400",
  dataset: "bg-green-500/15 text-green-600 border-green-500/20 dark:text-green-400",
  experiment: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400",
  observation: "bg-cyan-500/15 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
  prior_session: "bg-pink-500/15 text-pink-600 border-pink-500/20 dark:text-pink-400",
  expert_opinion: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
  code_artifact: "bg-slate-500/15 text-slate-600 border-slate-500/20 dark:text-slate-400",
};

// ----- Components -----

function LockedState({ reason }: { reason: string }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-warning/10 border border-warning/20 text-warning">
            <svg
              className="size-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Lab Mode Locked</h1>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link href="/sessions/new" className="text-primary hover:underline">
          Go to New Session
        </Link>
      </div>
    </div>
  );
}

function EvidenceBadge({ record }: { record: EvidenceRecord }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${EVIDENCE_TYPE_COLORS[record.type]}`}
    >
      {EVIDENCE_TYPE_LABELS[record.type]}
    </span>
  );
}

function VerifiedBadge({ verified, notes }: { verified: boolean; notes?: string }) {
  if (verified) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/20"
        title={notes}
      >
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/20">
      Unverified
    </span>
  );
}

function RelationshipBadges({ record }: { record: EvidenceRecord }) {
  const badges: { label: string; items: string[]; color: string }[] = [];

  if (record.supports?.length) {
    badges.push({
      label: "Supports",
      items: record.supports,
      color: "bg-success/15 text-success border-success/20",
    });
  }
  if (record.refutes?.length) {
    badges.push({
      label: "Refutes",
      items: record.refutes,
      color: "bg-destructive/15 text-destructive border-destructive/20",
    });
  }
  if (record.informs?.length) {
    badges.push({
      label: "Informs",
      items: record.informs,
      color: "bg-muted text-foreground border-border",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(({ label, items, color }) => (
        <span
          key={label}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}
        >
          {label}: <span className="font-mono ml-1">{items.join(", ")}</span>
        </span>
      ))}
    </div>
  );
}

function ExcerptCard({ excerpt, recordId }: { excerpt: EvidenceExcerpt; recordId: string }) {
  const fullAnchor = `${recordId}#${excerpt.anchor}`;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-primary">{fullAnchor}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${excerpt.verbatim ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}
        >
          {excerpt.verbatim ? "verbatim" : "paraphrased"}
        </span>
        {excerpt.location && (
          <span className="text-xs text-muted-foreground">{excerpt.location}</span>
        )}
      </div>
      <blockquote className="border-l-2 border-primary/30 pl-3 text-sm text-foreground/90 italic">
        {excerpt.text}
      </blockquote>
      {excerpt.note && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Note:</span> {excerpt.note}
        </div>
      )}
    </div>
  );
}

function EvidenceRecordCard({ record }: { record: EvidenceRecord }) {
  return (
    <details className="group rounded-xl border border-border bg-card p-5 transition-all">
      <summary className="cursor-pointer list-none space-y-3 touch-manipulation rounded-lg -m-1 p-1 transition-colors active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary">{record.id}</span>
              <EvidenceBadge record={record} />
              <VerifiedBadge verified={record.verified} notes={record.verification_notes} />
            </div>
            <h3 className="text-base font-medium text-foreground">{record.title}</h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {record.excerpts.length} excerpt{record.excerpts.length !== 1 ? "s" : ""}
          </span>
        </div>

        <RelationshipBadges record={record} />

        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">Relevance:</span> {record.relevance}
        </div>
      </summary>

      <div className="pt-5 mt-5 border-t border-border space-y-4">
        {/* Metadata table */}
        <div className="grid gap-2 text-xs">
          {record.authors?.length ? (
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground w-20">Authors:</span>
              <span className="text-foreground">{record.authors.join("; ")}</span>
            </div>
          ) : null}
          {record.date && (
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground w-20">Date:</span>
              <span className="text-foreground">{record.date}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground w-20">Source:</span>
            <span className="text-foreground font-mono break-all">{record.source}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground w-20">Access:</span>
            <span className="text-foreground">{record.access_method}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground w-20">Imported:</span>
            <span className="text-foreground">
              {formatTs(record.imported_at)} by{" "}
              <span className="font-mono">{record.imported_by}</span>
            </span>
          </div>
          {record.verification_notes && (
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground w-20">Verified:</span>
              <span className="text-foreground">{record.verification_notes}</span>
            </div>
          )}
        </div>

        {/* Key findings */}
        {record.key_findings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Key Findings</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {record.key_findings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Excerpts */}
        {record.excerpts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Excerpts</h4>
            <div className="space-y-3">
              {record.excerpts.map((excerpt, idx) => (
                <ExcerptCard
                  key={`${excerpt.anchor}-${idx}`}
                  excerpt={excerpt}
                  recordId={record.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

// ----- Main Page -----

export default async function EvidencePackPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  if (isDemoThreadId(threadId)) {
    return (
      <DemoFeaturePreview
        threadId={threadId}
        featureName="Evidence Pack"
        featureDescription="Collect external papers, datasets, and experiment results that support or refute your hypotheses. Link evidence directly to specific claims for transparent reasoning."
      />
    );
  }

  // Check lab mode
  if (!isLabModeEnabled()) {
    return (
      <LockedState reason="Lab mode is disabled. Set BRENNER_LAB_MODE=1 to enable orchestration." />
    );
  }

  // Check auth
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const pageAuth = checkOrchestrationAuth(reqHeaders, reqCookies);
  if (!pageAuth.authorized) {
    return <LockedState reason={pageAuth.reason} />;
  }

  const repoRoot = repoRootFromWebCwd();
  const projectKey = process.env.BRENNER_PROJECT_KEY ?? repoRoot;

  // Build path to evidence.json
  const safeThreadId = sanitizeThreadId(threadId);
  const evidenceJsonPath = join(projectKey, "artifacts", safeThreadId, "evidence.json");

  let evidencePack: EvidencePack | null = null;
  let loadError: string | null = null;

  try {
    if (existsSync(evidenceJsonPath)) {
      const content = readFileSync(evidenceJsonPath, "utf8");
      const parsed: unknown = JSON.parse(content);
      evidencePack = validateEvidencePack(parsed);
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const now = new Date().toISOString();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-3 animate-fade-in-up">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/sessions/${threadId}`} className="hover:text-primary hover:underline">
            &larr; Back to Session
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Evidence Pack</h1>
            <div className="text-sm text-muted-foreground font-mono">{threadId}</div>
          </div>
          <span className="text-xs text-muted-foreground font-mono">loaded {formatTs(now)}</span>
        </div>
      </header>

      {/* Error state */}
      {loadError && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 animate-fade-in-up stagger-1">
          <div className="font-semibold text-warning">Failed to load evidence pack</div>
          <div className="mt-1 text-sm text-muted-foreground break-words">{loadError}</div>
        </div>
      )}

      {/* No evidence pack */}
      {!loadError && !evidencePack && (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4 animate-fade-in-up stagger-1">
          <div className="flex items-center justify-center size-16 mx-auto rounded-2xl bg-muted/50 border border-border">
            <svg
              className="size-8 text-muted-foreground"
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
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">No Evidence Pack Found</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              This session does not have an evidence pack yet. Use the CLI to create one:
            </p>
            <pre className="mt-3 p-3 rounded-lg bg-muted text-xs font-mono text-left inline-block">
              brenner evidence init --thread-id {threadId}
            </pre>
          </div>
        </div>
      )}

      {/* Evidence pack content */}
      {evidencePack && (
        <>
          {/* Summary */}
          <section className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5 space-y-3 animate-fade-in-up stagger-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 border border-primary/20">
                  <span className="text-2xl font-bold text-primary">
                    {evidencePack.records.length}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Evidence Records</div>
                  <div className="font-semibold text-foreground">
                    {evidencePack.records.filter((r) => r.verified).length} verified,{" "}
                    {evidencePack.records.filter((r) => !r.verified).length} unverified
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="text-center px-4 py-2 rounded-lg bg-muted/50 border border-border">
                  <div className="text-lg font-bold text-foreground">
                    {evidencePack.records.reduce((sum, r) => sum + r.excerpts.length, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">total excerpts</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Created:{" "}
              <span className="font-mono text-foreground">{formatTs(evidencePack.created_at)}</span>
              {" | "}
              Updated:{" "}
              <span className="font-mono text-foreground">{formatTs(evidencePack.updated_at)}</span>
            </div>
          </section>

          {/* Evidence records */}
          <section className="space-y-4 animate-fade-in-up stagger-2">
            <h2 className="text-lg font-semibold tracking-tight">Evidence Records</h2>
            {evidencePack.records.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                No evidence records yet. Add evidence using the CLI:
                <pre className="mt-2 p-2 rounded bg-muted font-mono text-xs">
                  brenner evidence add --thread-id {threadId} --type paper --title &quot;...&quot;
                  --source &quot;...&quot;
                </pre>
              </div>
            ) : (
              <div className="space-y-3">
                {evidencePack.records.map((record) => (
                  <EvidenceRecordCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </section>

          {/* Citation reference */}
          <section className="rounded-xl border border-border bg-muted/30 p-5 space-y-3 animate-fade-in-up stagger-3">
            <h2 className="text-sm font-semibold tracking-tight">Citation Reference</h2>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>Use these anchors in artifacts to cite evidence:</p>
              <div className="grid gap-1 font-mono text-foreground">
                {evidencePack.records.map((record) => (
                  <div key={record.id}>
                    <span className="text-primary">{record.id}</span>
                    {record.excerpts.length > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({record.excerpts.map((e) => `${record.id}#${e.anchor}`).join(", ")})
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 pt-3 border-t border-border">
                Example:{" "}
                <code className="bg-muted px-1 rounded">
                  **Anchors**: &sect;58, EV-001#E1 [inference]
                </code>
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
