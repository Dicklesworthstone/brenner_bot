"use client";

/**
 * ObjectionRegisterPanel
 *
 * Displays and tracks objections raised by tribunal agents. Each extracted
 * objection can be marked as acknowledged / addressed / accepted / dismissed / testing.
 *
 * Persisted client-side (localStorage) per thread for now.
 *
 * @see brenner_bot-xlk2.6 (bead)
 */

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentMailMessage } from "@/lib/agentMail";
import {
  type ExtractedObjection,
  extractTribunalObjections,
  OBJECTION_REGISTER_UPDATED_EVENT,
  type ObjectionSeverity,
  type ObjectionType,
} from "@/lib/brenner-loop/agents/objections";
import { cn } from "@/lib/utils";

export type ObjectionStatus =
  | "open"
  | "acknowledged"
  | "testing"
  | "addressed"
  | "accepted"
  | "dismissed";

const STATUS_LABELS: Record<ObjectionStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  testing: "Testing",
  addressed: "Addressed",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

const STATUS_ORDER: readonly ObjectionStatus[] = [
  "open",
  "acknowledged",
  "testing",
  "addressed",
  "accepted",
  "dismissed",
] as const;

const FORBIDDEN_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function storageKey(threadId: string): string {
  return `brenner-objection-register:${threadId}`;
}

function snapshotKey(threadId: string): string {
  return `brenner-objection-register-snapshot:${threadId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObjectionStatus(value: unknown): value is ObjectionStatus {
  return typeof value === "string" && value in STATUS_LABELS;
}

function loadStatuses(threadId: string): Record<string, ObjectionStatus> {
  if (typeof window === "undefined") return Object.create(null);

  try {
    const raw = window.localStorage.getItem(storageKey(threadId));
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
}

function saveStatuses(threadId: string, statuses: Record<string, ObjectionStatus>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(threadId), JSON.stringify(statuses));
  } catch {
    // Best-effort: localStorage quota / privacy mode should not break the page.
  }
}

function notifyStatusUpdate(threadId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(OBJECTION_REGISTER_UPDATED_EVENT, { detail: { threadId } }),
    );
  } catch {
    // Best-effort: notifications should never break the UI.
  }
}

function saveObjectionSnapshot(threadId: string, objections: ExtractedObjection[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(snapshotKey(threadId), JSON.stringify(objections));
  } catch {
    // Best-effort: snapshot is helpful but should never block the page.
  }
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function severityBadge(severity: ObjectionSeverity): { label: string; className: string } {
  const map: Record<ObjectionSeverity, { label: string; className: string }> = {
    fatal: {
      label: "Fatal",
      className: "border-destructive/25 bg-destructive/10 text-destructive",
    },
    serious: { label: "Serious", className: "border-warning/30 bg-warning/10 text-warning" },
    moderate: { label: "Moderate", className: "border-info/25 bg-info/10 text-info" },
    minor: { label: "Minor", className: "border-border bg-muted/40 text-muted-foreground" },
  };

  return map[severity] ?? map.moderate;
}

function typeLabel(type: ObjectionType): string {
  return type.replace(/_/g, " ");
}

const SEVERITY_ORDER: Record<ObjectionSeverity, number> = {
  fatal: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

function timeMs(ts: string): number {
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? 0 : ms;
}

function sortObjections(a: ExtractedObjection, b: ExtractedObjection): number {
  const severity = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
  if (severity !== 0) return severity;
  return timeMs(a.source.createdAt) - timeMs(b.source.createdAt);
}

function ObjectionCard({
  objection,
  status,
  onStatusChange,
}: {
  objection: ExtractedObjection;
  status: ObjectionStatus;
  onStatusChange: (status: ObjectionStatus) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const severity = severityBadge(objection.severity);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("border-border", severity.className)}>
              {severity.label}
            </Badge>
            <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
              {typeLabel(objection.type)}
            </Badge>
            {objection.source.role && (
              <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
                {objection.source.role.replace(/_/g, " ")}
              </Badge>
            )}
          </div>

          <div className="text-sm text-foreground/90">{objection.summary}</div>

          <div className="text-xs text-muted-foreground">
            {objection.source.agentName ? (
              <span className="font-mono">{objection.source.agentName}</span>
            ) : (
              <span className="font-mono">(unknown agent)</span>
            )}{" "}
            · {formatTs(objection.source.createdAt)} · msg {objection.source.messageId}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Hide details" : "Show details"}
          </Button>
        </div>

        <div className="min-w-[13rem]">
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as ObjectionStatus)}
          >
            <SelectTrigger aria-label={`Objection status ${objection.id}`} className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{objection.fullArgument}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export interface ObjectionRegisterPanelProps {
  threadId: string;
  messages: AgentMailMessage[];
  className?: string;
}

export function ObjectionRegisterPanel({
  threadId,
  messages,
  className,
}: ObjectionRegisterPanelProps) {
  const objections = React.useMemo(
    () => extractTribunalObjections(messages).sort(sortObjections),
    [messages],
  );

  const [statusById, setStatusById] = React.useState<Record<string, ObjectionStatus>>({});

  React.useEffect(() => {
    saveObjectionSnapshot(threadId, objections);
  }, [threadId, objections]);

  React.useEffect(() => {
    setStatusById(loadStatuses(threadId));
  }, [threadId]);

  const updateStatus = React.useCallback(
    (objectionId: string, status: ObjectionStatus) => {
      setStatusById((prev) => {
        const next = { ...prev, [objectionId]: status };
        saveStatuses(threadId, next);
        notifyStatusUpdate(threadId);
        return next;
      });
    },
    [threadId],
  );

  const counts = React.useMemo(() => {
    const byStatus: Record<ObjectionStatus, number> = {
      open: 0,
      acknowledged: 0,
      testing: 0,
      addressed: 0,
      accepted: 0,
      dismissed: 0,
    };

    for (const objection of objections) {
      const status = statusById[objection.id] ?? "open";
      byStatus[status] += 1;
    }

    return byStatus;
  }, [objections, statusById]);

  const grouped = React.useMemo(() => {
    const groups: Record<ObjectionStatus, ExtractedObjection[]> = {
      open: [],
      acknowledged: [],
      testing: [],
      addressed: [],
      accepted: [],
      dismissed: [],
    };

    for (const objection of objections) {
      const status = statusById[objection.id] ?? "open";
      groups[status].push(objection);
    }

    return groups;
  }, [objections, statusById]);

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Objection Register</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track and explicitly resolve tribunal objections instead of letting them hide in
              prose.
            </p>
          </div>
          <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
            {counts.open} open / {objections.length} total
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {objections.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No objections extracted yet. Once tribunal agents respond using a{" "}
            <span className="font-mono">### Key Objection</span> section, they will appear here.
          </div>
        ) : (
          STATUS_ORDER.map((status) => {
            const items = grouped[status];
            if (!items || items.length === 0) return null;

            return (
              <section key={status} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
                  <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
                </div>

                <div className="space-y-3">
                  {items.map((objection) => {
                    const currentStatus = statusById[objection.id] ?? "open";

                    return (
                      <ObjectionCard
                        key={objection.id}
                        objection={objection}
                        status={currentStatus}
                        onStatusChange={(next) => updateStatus(objection.id, next)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
