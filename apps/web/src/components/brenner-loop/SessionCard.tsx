"use client";

/**
 * Session Card Component
 *
 * Displays a Brenner Loop session with full info and actions.
 * Used in the session list for browsing and managing sessions.
 *
 * @see brenner_bot-reew.4 (bead)
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  exportSession,
  getPhaseName,
  getPhaseSymbol,
  SESSION_RESUME_LOCATION_LABELS,
  type SessionResumeEntry,
  type SessionSummary,
  sessionStorage,
} from "@/lib/brenner-loop";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface SessionCardProps {
  session: SessionSummary;
  className?: string;
  isArchived?: boolean;
  archivedAt?: string;
  resumeEntry?: SessionResumeEntry | null;
  highlightTokens?: string[];
  matchLocations?: SessionMatchLocation[];
  onContinue?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  onArchiveChange?: (sessionId: string, nextArchived: boolean) => void;
  onExport?: (sessionId: string, format: "json" | "markdown") => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-success";
  if (confidence >= 40) return "text-warning";
  return "text-destructive";
}

const PHASE_COLOR_BY_PHASE: Partial<Record<string, string>> = {
  complete: "bg-success/15 text-success border-success/20",
  intake: "bg-muted text-muted-foreground border-border",
  sharpening: "bg-info/15 text-info border-info/20",
  level_split: "bg-info/15 text-info border-info/20",
  exclusion_test: "bg-info/15 text-info border-info/20",
  object_transpose: "bg-info/15 text-info border-info/20",
  scale_check: "bg-info/15 text-info border-info/20",
  agent_dispatch: "bg-primary/15 text-primary border-primary/20",
  synthesis: "bg-primary/15 text-primary border-primary/20",
  evidence_gathering: "bg-warning/15 text-warning border-warning/20",
  revision: "bg-warning/15 text-warning border-warning/20",
};

function getPhaseColor(phase: string): string {
  return PHASE_COLOR_BY_PHASE[phase] ?? "bg-muted text-muted-foreground border-border";
}

type SessionMatchLocation =
  | "overview"
  | "hypothesis"
  | "evidence"
  | "operators"
  | "test-queue"
  | "agents"
  | "brief";

const MATCH_LOCATION_LABELS: Record<SessionMatchLocation, string> = {
  overview: "Overview",
  hypothesis: "Hypothesis",
  evidence: "Evidence Ledger",
  operators: "Operators",
  "test-queue": "Test Queue",
  agents: "Agents",
  brief: "Brief",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, tokens: string[]): React.ReactNode {
  const cleanTokens = Array.from(new Set(tokens.map((token) => token.trim()).filter(Boolean)));
  if (cleanTokens.length === 0) return text;

  cleanTokens.sort((a, b) => b.length - a.length);
  const regex = new RegExp(`(${cleanTokens.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const lower = part.toLowerCase();
    const isMatch = cleanTokens.some((token) => token === lower);
    if (!isMatch) return <React.Fragment key={index}>{part}</React.Fragment>;

    return (
      <mark key={index} className="rounded bg-primary/15 px-0.5 text-foreground">
        {part}
      </mark>
    );
  });
}

// ============================================================================
// Icons
// ============================================================================

function PlayIcon({ className }: { className?: string }) {
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
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
      />
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

function ArrowDownTrayIcon({ className }: { className?: string }) {
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

function TrashIcon({ className }: { className?: string }) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function ArchiveBoxIcon({ className }: { className?: string }) {
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
        d="M20.25 6.375v12.75A2.625 2.625 0 0117.625 21.75H6.375A2.625 2.625 0 013.75 19.125V6.375m16.5 0A2.625 2.625 0 0017.625 3.75H6.375A2.625 2.625 0 003.75 6.375m16.5 0v.375A2.625 2.625 0 0117.625 9.375H6.375A2.625 2.625 0 013.75 6.75v-.375"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 13.5h4.5" />
    </svg>
  );
}

function ArrowUturnLeftIcon({ className }: { className?: string }) {
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
        d="M9 15l-3-3m0 0l3-3m-3 3h10.5a3.75 3.75 0 010 7.5H12"
      />
    </svg>
  );
}

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

interface DeleteConfirmModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ sessionId, isOpen, onClose, onConfirm }: DeleteConfirmModalProps) {
  // Handle Escape key to close modal
  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-fade-in-up">
        <h3 className="text-lg font-semibold text-foreground">Delete Session?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete session <span className="font-mono">{sessionId}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export Menu
// ============================================================================

interface ExportMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: "json" | "markdown") => void;
}

function ExportMenu({ isOpen, onClose, onExport }: ExportMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-border bg-card shadow-lg animate-fade-in-up"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors rounded-t-lg"
        onClick={() => {
          onExport("json");
          onClose();
        }}
      >
        JSON
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors rounded-b-lg"
        onClick={() => {
          onExport("markdown");
          onClose();
        }}
      >
        Markdown
      </button>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SessionCard({
  session,
  className,
  isArchived = false,
  archivedAt,
  resumeEntry,
  highlightTokens,
  matchLocations,
  onContinue,
  onDelete,
  onArchiveChange,
  onExport,
}: SessionCardProps) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const isComplete = session.phase === "complete";
  const phaseSymbol = getPhaseSymbol(session.phase);

  const stalenessLabel = React.useMemo(() => {
    if (isComplete || isArchived) return null;
    const updatedAt = new Date(session.updatedAt).getTime();
    if (Number.isNaN(updatedAt)) return null;

    const diffDays = Math.floor((Date.now() - updatedAt) / (1000 * 60 * 60 * 24));
    if (diffDays >= 30) return `Dormant · ${diffDays}d`;
    if (diffDays >= 7) return `Stale · ${diffDays}d`;
    return null;
  }, [isArchived, isComplete, session.updatedAt]);

  const visibleMatchLocations = React.useMemo(() => {
    if (!matchLocations || matchLocations.length === 0) return null;
    const unique = Array.from(new Set(matchLocations));
    const withoutOverview = unique.filter((location) => location !== "overview");
    const display = withoutOverview.length > 0 ? withoutOverview : unique;
    return display.map((location) => MATCH_LOCATION_LABELS[location] ?? location);
  }, [matchLocations]);

  const handleContinue = () => {
    if (onContinue) {
      onContinue(session.id);
    }
  };

  const handleArchiveToggle = () => {
    if (!onArchiveChange) return;
    onArchiveChange(session.id, !isArchived);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await sessionStorage.delete(session.id);
      if (onDelete) {
        onDelete(session.id);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleExport = async (format: "json" | "markdown") => {
    setIsExporting(true);
    try {
      const fullSession = await sessionStorage.load(session.id);
      if (!fullSession) {
        console.error("Session not found");
        return;
      }

      // exportSession returns Promise<Blob>
      const blob = await exportSession(fullSession, format);
      const extension = format === "markdown" ? "md" : "json";
      const filename = `${session.id}.${extension}`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport(session.id, format);
      }
    } catch (error) {
      console.error("Failed to export session:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card className={cn("hover:border-primary/30 transition-all", className)}>
        <CardContent className="py-4">
          {/* Header row: ID + timestamp */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="font-mono text-sm font-medium text-foreground truncate">
              {session.id}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {isArchived && archivedAt
                ? `Archived ${formatRelativeTime(archivedAt)}`
                : formatRelativeTime(session.updatedAt)}
            </div>
          </div>

          {/* Hypothesis preview */}
          <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {session.hypothesis && highlightTokens && highlightTokens.length > 0
              ? highlightText(session.hypothesis, highlightTokens)
              : session.hypothesis || "No hypothesis yet"}
          </div>

          {visibleMatchLocations && (
            <div className="text-xs text-muted-foreground mb-3">
              Matches in:{" "}
              <span className="text-foreground font-medium">
                {visibleMatchLocations.join(", ")}
              </span>
            </div>
          )}

          {resumeEntry?.location &&
            resumeEntry.location !== "overview" &&
            resumeEntry.visitedAt && (
              <div className="text-xs text-muted-foreground mb-3">
                Last viewed:{" "}
                <span className="text-foreground font-medium">
                  {SESSION_RESUME_LOCATION_LABELS[resumeEntry.location] ?? resumeEntry.location}
                </span>{" "}
                <span className="text-muted-foreground">
                  · {formatRelativeTime(resumeEntry.visitedAt)}
                </span>
              </div>
            )}

          {/* Badges row: phase, confidence */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Phase badge with symbol */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                getPhaseColor(session.phase),
              )}
            >
              {phaseSymbol && <span className="opacity-70">{phaseSymbol}</span>}
              {getPhaseName(session.phase)}
            </span>

            {/* Confidence badge */}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border">
              <span className={cn("font-semibold", getConfidenceColor(session.confidence))}>
                {Math.round(session.confidence)}%
              </span>
              <span className="ml-1 text-muted-foreground">confidence</span>
            </span>

            {stalenessLabel && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/20">
                {stalenessLabel}
              </span>
            )}
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Continue or View Brief */}
            <Button
              size="sm"
              variant={isComplete ? "outline" : "default"}
              onClick={handleContinue}
              className="gap-1.5"
            >
              {isComplete ? (
                <>
                  <DocumentIcon className="size-3.5" />
                  View Brief
                </>
              ) : (
                <>
                  <PlayIcon className="size-3.5" />
                  Continue
                </>
              )}
            </Button>

            {/* Export dropdown */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="gap-1.5"
              >
                <ArrowDownTrayIcon className="size-3.5" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
              <ExportMenu
                isOpen={showExportMenu}
                onClose={() => setShowExportMenu(false)}
                onExport={handleExport}
              />
            </div>

            {onArchiveChange && (
              <Button size="sm" variant="outline" onClick={handleArchiveToggle} className="gap-1.5">
                {isArchived ? (
                  <>
                    <ArrowUturnLeftIcon className="size-3.5" />
                    Restore
                  </>
                ) : (
                  <>
                    <ArchiveBoxIcon className="size-3.5" />
                    Archive
                  </>
                )}
              </Button>
            )}

            {/* Delete button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="size-3.5" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        sessionId={session.id}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
