"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { nowMs, trackSystemLatency } from "@/lib/analytics";
import {
  buildSessionPath,
  exportSession,
  getPhaseName,
  getPhaseSymbol,
  getSessionResumeEntry,
  recordSessionResumeEntry,
  SESSION_RESUME_LOCATION_LABELS,
  type Session,
  type SessionResumeEntry,
  type SessionResumeLocation,
  sessionStorage,
} from "@/lib/brenner-loop";
import { cn } from "@/lib/utils";

export interface LocalSessionHubProps {
  sessionId: string;
  className?: string;
}

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

function getPrimaryHypothesisPreview(session: Session): string | null {
  const primaryId = session.primaryHypothesisId;
  if (primaryId && session.hypothesisCards[primaryId]?.statement) {
    return session.hypothesisCards[primaryId].statement;
  }

  const first = Object.values(session.hypothesisCards)[0];
  if (first?.statement) return first.statement;

  return null;
}

async function downloadExport(session: Session, format: "json" | "markdown"): Promise<void> {
  const blob = await exportSession(session, format);
  const extension = format === "markdown" ? "md" : "json";
  const filename = `${session.id}.${extension}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const SUGGESTED_LOCATION_BY_PHASE: Partial<Record<Session["phase"], SessionResumeLocation>> = {
  intake: "hypothesis",
  sharpening: "hypothesis",
  revision: "hypothesis",
  exclusion_test: "test-queue",
  agent_dispatch: "agents",
  synthesis: "agents",
  complete: "brief",
  level_split: "operators",
  object_transpose: "operators",
  scale_check: "operators",
};

function suggestedLocationFromPhase(phase: Session["phase"]): SessionResumeLocation {
  return SUGGESTED_LOCATION_BY_PHASE[phase] ?? "operators";
}

export function LocalSessionHub({ sessionId, className }: LocalSessionHubProps) {
  const router = useRouter();
  const [session, setSession] = React.useState<Session | null>(null);
  const [resumeEntry, setResumeEntry] = React.useState<SessionResumeEntry | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const loadStartRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    recordSessionResumeEntry(sessionId, "overview", { ifMissing: true });
    setResumeEntry(getSessionResumeEntry(sessionId));
  }, [sessionId]);

  React.useEffect(() => {
    let cancelled = false;
    let found = false;
    let hadError = false;
    setIsLoading(true);
    setError(null);
    loadStartRef.current = nowMs();

    const load = async () => {
      try {
        const loaded = await sessionStorage.load(sessionId);
        if (cancelled) return;
        setSession(loaded);
        found = !!loaded;
      } catch (err) {
        if (cancelled) return;
        hadError = true;
        setError(err instanceof Error ? err.message : String(err));
        setSession(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          if (loadStartRef.current !== null) {
            trackSystemLatency("session_load_local", nowMs() - loadStartRef.current, {
              session_id: sessionId,
              success: !hadError,
              found,
            });
            loadStartRef.current = null;
          }
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const primaryHypothesis = session ? getPrimaryHypothesisPreview(session) : null;
  const phaseSymbol = session ? getPhaseSymbol(session.phase) : null;

  const suggestedLocation = React.useMemo(() => {
    if (resumeEntry?.location && resumeEntry.location !== "overview") return resumeEntry.location;
    if (session) return suggestedLocationFromPhase(session.phase);
    return "hypothesis";
  }, [resumeEntry, session]);

  const suggestedHref = React.useMemo(() => {
    const id = session?.id ?? sessionId;
    return buildSessionPath(id, suggestedLocation);
  }, [session?.id, sessionId, suggestedLocation]);

  const handleExport = async (format: "json" | "markdown") => {
    const currentSession = session;
    if (!currentSession) return;
    setIsExporting(true);
    try {
      await downloadExport(currentSession, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export session.");
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleteConfirmOpen(false);
    setIsDeleting(true);
    try {
      await sessionStorage.delete(sessionId);
      router.push("/sessions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("max-w-5xl mx-auto space-y-6", className)}>
        <div className="rounded-2xl border border-border bg-card p-8 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={cn("max-w-3xl mx-auto space-y-6", className)}>
        <div className="rounded-2xl border border-border bg-card p-8 space-y-3">
          <h1 className="text-xl font-semibold text-foreground">Local Session</h1>
          <div className="text-sm text-muted-foreground font-mono break-words">{sessionId}</div>
          <p className="text-sm text-muted-foreground">
            This session isn’t available in your browser storage.
          </p>
          {error && <p className="text-sm text-warning break-words">{error}</p>}
          <div className="pt-2">
            <Link href="/sessions" className="text-sm text-primary hover:underline">
              ← Back to Sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-5xl mx-auto space-y-8", className)}>
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent size="sm" closeButtonLabel="Close delete confirmation">
          <DialogHeader separated>
            <DialogTitle>Delete local session?</DialogTitle>
            <DialogDescription>
              This removes <span className="font-mono">{session.id}</span> from your browser
              storage. This action can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter
            separated
            className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Local Session</h1>
            <div className="mt-1 text-sm text-muted-foreground font-mono break-words">
              {session.id}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => router.push(suggestedHref)}>
              Resume: {SESSION_RESUME_LOCATION_LABELS[suggestedLocation] ?? suggestedLocation}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExport("json")}
              disabled={isExporting}
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExport("markdown")}
              disabled={isExporting}
            >
              Export Markdown
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">Phase:</span>{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            {phaseSymbol && <span className="opacity-70">{phaseSymbol}</span>}
            {getPhaseName(session.phase)}
          </span>
          <span className="mx-2">·</span>
          <span className="font-medium text-foreground/80">Updated:</span>{" "}
          {formatRelativeTime(session.updatedAt)}
          {resumeEntry?.location &&
            resumeEntry.location !== "overview" &&
            resumeEntry.visitedAt && (
              <>
                <span className="mx-2">·</span>
                <span className="font-medium text-foreground/80">Last viewed:</span>{" "}
                {SESSION_RESUME_LOCATION_LABELS[resumeEntry.location] ?? resumeEntry.location}{" "}
                <span className="text-muted-foreground">
                  ({formatRelativeTime(resumeEntry.visitedAt)})
                </span>
              </>
            )}
        </div>

        {error && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-warning break-words">
            {error}
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hypothesis</CardTitle>
          <CardDescription>
            {primaryHypothesis ? "Primary hypothesis statement" : "No hypothesis captured yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-foreground leading-relaxed">
            {primaryHypothesis ?? "Add one in the Hypothesis page."}
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Link href={`/sessions/${session.id}/hypothesis`} className="block">
          <Card
            className={cn(
              "h-full hover:border-primary/30 hover:bg-muted/20 transition-colors",
              suggestedLocation === "hypothesis" && "border-primary/40 bg-primary/5",
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Hypothesis</CardTitle>
              <CardDescription>Refine the core hypothesis</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/sessions/${session.id}/operators`} className="block">
          <Card
            className={cn(
              "h-full hover:border-primary/30 hover:bg-muted/20 transition-colors",
              suggestedLocation === "operators" && "border-primary/40 bg-primary/5",
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Operators</CardTitle>
              <CardDescription>Apply ⊘ ✂ ⟂ ⊞</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/sessions/${session.id}/test-queue`} className="block">
          <Card
            className={cn(
              "h-full hover:border-primary/30 hover:bg-muted/20 transition-colors",
              suggestedLocation === "test-queue" && "border-primary/40 bg-primary/5",
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Test Queue</CardTitle>
              <CardDescription>Plan discriminative tests</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/sessions/${session.id}/agents`} className="block">
          <Card
            className={cn(
              "h-full hover:border-primary/30 hover:bg-muted/20 transition-colors",
              suggestedLocation === "agents" && "border-primary/40 bg-primary/5",
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Agents</CardTitle>
              <CardDescription>Run the tribunal</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/sessions/${session.id}/brief`} className="block">
          <Card
            className={cn(
              "h-full hover:border-primary/30 hover:bg-muted/20 transition-colors",
              suggestedLocation === "brief" && "border-primary/40 bg-primary/5",
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Brief</CardTitle>
              <CardDescription>Review artifacts</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </section>

      <div className="pt-2">
        <Link href="/sessions" className="text-sm text-primary hover:underline">
          ← Back to Sessions
        </Link>
      </div>
    </div>
  );
}
