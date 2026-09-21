/**
 * DemoSessionsView
 *
 * Displays demo sessions with a banner indicating demo mode.
 * Used when Lab Mode is disabled to showcase the platform capabilities.
 */

import Link from "next/link";
import { type DemoThreadSummary, getDemoThreadSummaries } from "@/lib/fixtures/demo-sessions";
import type { SessionPhase } from "@/lib/threadStatus";

// ============================================================================
// Icons
// ============================================================================

function FlaskConicalIcon({ className }: { className?: string }) {
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
        d="M9.75 3.75v4.5m0 0H9A5.25 5.25 0 003.75 13.5v0A5.25 5.25 0 009 18.75h6a5.25 5.25 0 005.25-5.25v0A5.25 5.25 0 0015 8.25h-.75m-4.5 0h4.5m0 0v-4.5"
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
// Phase styling (matching sessions/page.tsx)
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
// Helpers
// ============================================================================

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

  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// ============================================================================
// Demo Thread Card
// ============================================================================

function DemoThreadCard({ thread, index }: { thread: DemoThreadSummary; index: number }) {
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
                compiled
              </span>
            )}
            {thread.pendingAcks > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/20 animate-pulse-glow">
                {thread.pendingAcks} pending
              </span>
            )}
            {/* Demo indicator badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              demo
            </span>
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
// Demo Sessions View
// ============================================================================

export interface DemoSessionsViewProps {
  /** Optional override for demo sessions (for testing) */
  sessions?: DemoThreadSummary[];
}

export function DemoSessionsView({ sessions }: DemoSessionsViewProps) {
  const demoSessions = sessions ?? getDemoThreadSummaries();

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5 animate-fade-in-up">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
            <FlaskConicalIcon className="size-5" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Demo Mode</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              These are example sessions demonstrating the BrennerBot research platform. Click any
              session to explore its structure and content.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/tutorial/quick-start"
                className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Try the tutorial
              </Link>
              <Link
                href="/corpus"
                className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Browse the corpus
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Session Cards */}
      <div className="space-y-3">
        {demoSessions.map((session, index) => (
          <DemoThreadCard key={session.threadId} thread={session} index={index} />
        ))}
      </div>
    </div>
  );
}
