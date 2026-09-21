import { resolve } from "node:path";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { SessionList } from "@/components/brenner-loop";
import { Jargon } from "@/components/jargon";
import { FirstRunOnboarding, RefreshControls } from "@/components/sessions";
import { DemoSessionsView } from "@/components/sessions/DemoSessionsView";
import { AgentMailClient, type AgentMailMessage } from "@/lib/agentMail";
import { checkOrchestrationAuth, isLabModeEnabled } from "@/lib/auth";
import { listRobotSessions, type RobotThreadSummary } from "@/lib/robot-sessions";
import { computeThreadStatus, type SessionPhase } from "@/lib/threadStatus";

export const metadata: Metadata = {
  title: "Sessions",
  description: "Browse Brenner Loop research sessions.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Icons
// ============================================================================

function InboxIcon({ className }: { className?: string }) {
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
        d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function LockClosedIcon({ className }: { className?: string }) {
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
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

// ============================================================================
// Phase styling
// ============================================================================

const PHASE_LABELS: Record<SessionPhase, string> = {
  not_started: "Not Started",
  awaiting_responses: "Awaiting Responses",
  partially_complete: "Partial",
  awaiting_compilation: "Awaiting Compilation",
  compiled: "Compiled",
  in_critique: "In Critique",
  closed: "Closed",
};

const PHASE_BADGE_CLASSES: Record<SessionPhase, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  awaiting_responses: "bg-primary/15 text-primary border-primary/20 animate-pulse-glow",
  partially_complete: "bg-info/15 text-info border-info/20",
  awaiting_compilation: "bg-warning/15 text-warning border-warning/20 animate-pulse-glow",
  compiled: "bg-success/15 text-success border-success/20",
  in_critique: "bg-purple-500/15 text-purple-600 border-purple-500/20 animate-pulse-glow",
  closed: "bg-muted text-muted-foreground border-border",
};

// ============================================================================
// Types
// ============================================================================

interface ThreadSummary {
  threadId: string;
  messageCount: number;
  firstMessageTs: string;
  lastMessageTs: string;
  phase: SessionPhase;
  hasArtifact: boolean;
  pendingAcks: number;
  participants: string[];
}

// ============================================================================
// Helpers
// ============================================================================

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatRelativeTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;

  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatTs(ts);
}

// ============================================================================
// Sub-components
// ============================================================================

function LockedState({ reason }: { reason: string }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-warning/10 border border-warning/20 text-warning">
            <LockClosedIcon className="size-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Lab Mode Locked</h1>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/sessions/new"
          className="text-primary hover:underline active:text-primary/80 transition-colors touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Go to New Session
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <FirstRunOnboarding />

      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <InboxIcon className="size-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Welcome — start your first session
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Sessions are where you apply the <Jargon term="brenner-loop">Brenner Loop</Jargon> to
              a real question: generate hypotheses, demand{" "}
              <Jargon term="discriminative-experiment">discriminative</Jargon> tests, and keep an
              evidence-linked audit trail.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/sessions/new"
            className="group rounded-xl border border-border bg-background p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">Start a new session</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Create a thread and run intake → operators → synthesis.
                </div>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary transition-colors" />
            </div>
          </Link>

          <Link
            href="/tutorial/quick-start"
            className="group rounded-xl border border-border bg-background p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">Quick Start tutorial</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ~30 minutes. Minimal setup.
                </div>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary transition-colors" />
            </div>
          </Link>

          <Link
            href="/distillations"
            className="group rounded-xl border border-border bg-background p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">Read the distillations</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Three model syntheses of the method.
                </div>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary transition-colors" />
            </div>
          </Link>

          <Link
            href="/corpus"
            className="group rounded-xl border border-border bg-background p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">Browse the corpus</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Transcript, quote bank, and specs.
                </div>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary transition-colors" />
            </div>
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
          <details className="rounded-xl border border-border bg-muted/20 p-4">
            <summary className="cursor-pointer select-none font-medium text-foreground">
              What is the Brenner Loop?
            </summary>
            <div className="mt-3 text-sm text-muted-foreground space-y-2">
              <p>
                A workflow for turning vague questions into falsifiable claims — and then
                systematically trying to kill those claims.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Make the hypothesis explicit (claim + mechanism).</li>
                <li>Force discriminative predictions (what would prove you wrong?).</li>
                <li>Generate tests ranked by discriminative power.</li>
                <li>Record evidence and update confidence transparently.</li>
              </ul>
            </div>
          </details>

          <details className="rounded-xl border border-border bg-muted/20 p-4">
            <summary className="cursor-pointer select-none font-medium text-foreground">
              Quick Start vs Multi-Agent?
            </summary>
            <div className="mt-3 text-sm text-muted-foreground space-y-2">
              <p>
                Quick Start is fastest. Multi-Agent is most powerful — it orchestrates different
                agent roles via Agent Mail to produce merged artifacts with explicit deltas.
              </p>
              <p className="text-xs">
                If you’re new, start with Quick Start. If you’re comfortable with orchestration, try
                Multi-Agent.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function ThreadCard({ thread, index }: { thread: ThreadSummary; index: number }) {
  // Calculate stagger class (max 10)
  const staggerClass = `stagger-${Math.min(index + 1, 10)}`;

  return (
    <Link
      href={`/sessions/${thread.threadId}`}
      className={`group block rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-muted/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 touch-manipulation animate-fade-in-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${staggerClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          {/* Thread ID */}
          <div className="font-mono text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {thread.threadId}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${PHASE_BADGE_CLASSES[thread.phase]}`}
            >
              {PHASE_LABELS[thread.phase]}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
              {thread.messageCount} messages
            </span>
            {thread.hasArtifact && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/20">
                ✓ compiled
              </span>
            )}
            {thread.pendingAcks > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/20 animate-pulse-glow">
                {thread.pendingAcks} pending
              </span>
            )}
          </div>

          {/* Participants */}
          {thread.participants.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">{thread.participants.slice(0, 4).join(", ")}</span>
              {thread.participants.length > 4 && (
                <span> +{thread.participants.length - 4} more</span>
              )}
            </div>
          )}
        </div>

        {/* Right side: Timestamp + Arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {formatRelativeTs(thread.lastMessageTs)}
            </div>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default async function SessionsListPage() {
  const labModeEnabled = isLabModeEnabled();
  const reqHeaders = await headers();
  const hostHeader = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host") ?? "";
  const isPublicHost = hostHeader.includes("brennerbot.org");
  const isDemoMode = isPublicHost || !labModeEnabled;

  // Check auth (only relevant if lab mode is enabled and not on the public site)
  const reqCookies = await cookies();
  const pageAuth =
    labModeEnabled && !isPublicHost ? checkOrchestrationAuth(reqHeaders, reqCookies) : null;

  // Only set labLockedReason for auth failures when lab mode IS enabled
  // (when lab mode is disabled, we show demo mode instead of locked state)
  let labLockedReason: string | null = null;
  if (labModeEnabled && pageAuth && !pageAuth.authorized) {
    labLockedReason = pageAuth.reason;
  }

  const repoRoot = repoRootFromWebCwd();
  const projectKey = process.env.BRENNER_PROJECT_KEY ?? repoRoot;
  const agentName = process.env.BRENNER_AGENT_NAME ?? "human";

  // Fetch inbox (all messages for this project/agent)
  // Skip fetching when in demo mode - we'll show demo sessions instead
  const threads: ThreadSummary[] = [];
  let loadError: string | null = null;

  if (!isDemoMode && !labLockedReason) {
    try {
      const client = new AgentMailClient();
      const inbox = await client.readInbox({ projectKey, agentName, includeBodies: false });

      // Group messages by thread_id
      const messagesByThread = new Map<string, AgentMailMessage[]>();
      for (const msg of inbox.messages) {
        if (!msg.thread_id) continue;
        const existing = messagesByThread.get(msg.thread_id) ?? [];
        existing.push(msg);
        messagesByThread.set(msg.thread_id, existing);
      }

      // Compute status for each thread
      for (const [threadId, messages] of messagesByThread) {
        const sorted = [...messages].sort(
          (a, b) => new Date(a.created_ts).getTime() - new Date(b.created_ts).getTime(),
        );

        const status = computeThreadStatus(sorted);

        threads.push({
          threadId,
          messageCount: messages.length,
          firstMessageTs: sorted[0]?.created_ts ?? "",
          lastMessageTs: sorted[sorted.length - 1]?.created_ts ?? "",
          phase: status.phase,
          hasArtifact: status.latestArtifact !== null,
          pendingAcks: status.acks.pendingCount,
          participants: status.stats.participants,
        });
      }

      // Sort by last message (most recent first)
      threads.sort(
        (a, b) => new Date(b.lastMessageTs).getTime() - new Date(a.lastMessageTs).getTime(),
      );
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  // Load robot mode sessions (always available — no lab mode or Agent Mail needed)
  let robotSessions: RobotThreadSummary[] = [];
  try {
    robotSessions = await listRobotSessions();
  } catch {
    // Robot sessions are optional — silently skip on error
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sessions
            {isDemoMode && (
              <span className="ml-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                (Demo)
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isDemoMode ? (
              "Example sessions showing the Brenner Loop research workflow"
            ) : (
              <>
                Browse and monitor <Jargon term="brenner-loop">Brenner Loop</Jargon> research
                sessions
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RefreshControls />
          <Link
            href="/sessions/analytics"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm font-medium text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Analytics
            <ChevronRightIcon className="size-4 opacity-70" />
          </Link>
          <Link
            href="/sessions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <PlusIcon className="size-4" />
            New Session
          </Link>
        </div>
      </header>

      {/* Error state */}
      {loadError && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 animate-fade-in-up">
          <div className="font-semibold text-warning">Failed to load sessions</div>
          <div className="mt-1 text-sm text-muted-foreground break-words">{loadError}</div>
        </div>
      )}

      {/* Content */}
      {isDemoMode ? (
        <DemoSessionsView />
      ) : labLockedReason ? (
        <LockedState reason={labLockedReason} />
      ) : !loadError && threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {threads.map((thread, index) => (
            <ThreadCard key={thread.threadId} thread={thread} index={index} />
          ))}
        </div>
      )}

      {/* Robot Mode Sessions */}
      {robotSessions.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Robot Sessions
              <span className="ml-2 text-sm font-medium text-violet-600 dark:text-violet-400">
                ({robotSessions.length})
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Sessions generated locally by <span className="font-mono">brenner session robot</span>
              .
            </p>
          </div>
          <div className="space-y-3">
            {robotSessions.map((rs, index) => (
              <Link
                key={rs.threadId}
                href={`/sessions/${rs.threadId}`}
                className={`group block rounded-xl border border-border bg-card p-5 hover:border-violet-500/30 hover:bg-muted/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 touch-manipulation animate-fade-in-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring stagger-${Math.min(index + 1, 10)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="font-mono text-sm font-medium text-foreground truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {rs.threadId}
                    </div>
                    {rs.question && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {rs.question}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                        robot mode
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${PHASE_BADGE_CLASSES[rs.phase]}`}
                      >
                        {PHASE_LABELS[rs.phase]}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                        {rs.roundsCompleted} round{rs.roundsCompleted !== 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                        {rs.activeHypotheses} active / {rs.killedHypotheses} killed
                      </span>
                    </div>
                    {rs.participants.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{rs.participants.join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTs(rs.updatedAt)}
                      </div>
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Local Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Import or review sessions stored in your browser.
          </p>
        </div>
        <SessionList />
      </section>
    </div>
  );
}
