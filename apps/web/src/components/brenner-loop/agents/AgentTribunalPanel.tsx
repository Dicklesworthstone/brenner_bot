"use client";

/**
 * AgentTribunalPanel
 *
 * UI for summarizing a TRIBUNAL Agent Mail thread into per-role cards with
 * status + preview + full-response modal.
 *
 * @see brenner_bot-xlk2.3 (bead)
 */

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AgentMailMessage } from "@/lib/agentMail";
import {
  DEFAULT_DISPATCH_ROLES,
  isTribunalAgentRole,
  synthesizeResponses,
  TRIBUNAL_AGENTS,
  type TribunalAgentRole,
} from "@/lib/brenner-loop/agents";
import {
  extractTribunalObjections,
  OBJECTION_REGISTER_UPDATED_EVENT,
} from "@/lib/brenner-loop/agents/objections";
import { cn } from "@/lib/utils";

type AgentCardStatus = "pending" | "analyzing" | "complete" | "error";

export interface AgentTribunalCard {
  role: TribunalAgentRole;
  status: AgentCardStatus;
  preview: string | null;
  content: string | null;
  agentName: string | null;
  receivedAt: string | null;
}

export interface AgentTribunalPanelProps {
  threadId?: string;
  messages: AgentMailMessage[];
  roles?: TribunalAgentRole[];
  className?: string;
}

type ObjectionStatus = "open" | "acknowledged" | "testing" | "addressed" | "accepted" | "dismissed";

const UNRESOLVED_OBJECTION_STATUSES = new Set<ObjectionStatus>(["open", "acknowledged", "testing"]);
const KNOWN_OBJECTION_STATUSES = new Set<ObjectionStatus>([
  "open",
  "acknowledged",
  "testing",
  "addressed",
  "accepted",
  "dismissed",
]);

const FORBIDDEN_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function timeMs(ts: string | null | undefined): number {
  if (!ts) return 0;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? 0 : ms;
}

function objectionStatusStorageKey(threadId: string): string {
  return `brenner-objection-register:${threadId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadObjectionStatuses(threadId: string): Record<string, ObjectionStatus> {
  if (typeof window === "undefined") return Object.create(null);

  try {
    const raw = window.localStorage.getItem(objectionStatusStorageKey(threadId));
    if (!raw) return Object.create(null);

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return Object.create(null);

    const out: Record<string, ObjectionStatus> = Object.create(null);
    for (const [key, value] of Object.entries(parsed)) {
      if (FORBIDDEN_RECORD_KEYS.has(key)) continue;
      if (typeof value !== "string") continue;
      if (!KNOWN_OBJECTION_STATUSES.has(value as ObjectionStatus)) continue;
      out[key] = value as ObjectionStatus;
    }

    return out;
  } catch {
    return Object.create(null);
  }
}

function normalizeRoleToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function inferRoleFromSubject(subject: string | null | undefined): TribunalAgentRole | null {
  const subjectText = typeof subject === "string" ? subject : "";
  if (!subjectText) return null;

  const match = subjectText.match(/\bTRIBUNAL\[([^\]]+)\]:/i);
  if (match?.[1]) {
    const token = normalizeRoleToken(match[1]);
    return isTribunalAgentRole(token) ? token : null;
  }

  const normalized = normalizeRoleToken(subjectText);
  for (const role of Object.keys(TRIBUNAL_AGENTS) as TribunalAgentRole[]) {
    if (normalized.includes(role)) return role;
  }

  return null;
}

function makePreview(markdown: string, maxChars = 220): string {
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");
  const firstMeaningfulLine =
    withoutCodeBlocks
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  const collapsed = firstMeaningfulLine.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function badgeForStatus(status: AgentCardStatus): { label: string; className: string } {
  const map: Record<AgentCardStatus, { label: string; className: string }> = {
    complete: { label: "Complete", className: "border-success/20 bg-success/15 text-success" },
    analyzing: { label: "Analyzing", className: "border-primary/20 bg-primary/10 text-primary" },
    error: {
      label: "Error",
      className: "border-destructive/20 bg-destructive/10 text-destructive",
    },
    pending: { label: "Pending", className: "border-border bg-muted/40 text-muted-foreground" },
  };

  return map[status] ?? map.pending;
}

function deriveCardsFromMessages(params: {
  messages: AgentMailMessage[];
  roles: TribunalAgentRole[];
}): AgentTribunalCard[] {
  const rolesSet = new Set<TribunalAgentRole>(params.roles);

  const dispatchByRole = new Map<TribunalAgentRole, AgentMailMessage>();
  for (const msg of params.messages) {
    const role = inferRoleFromSubject(msg.subject);
    if (!role || !rolesSet.has(role)) continue;
    if (typeof msg.reply_to === "number") continue;
    if (typeof msg.body_md !== "string") continue;
    if (!msg.body_md.trimStart().startsWith("# Tribunal Analysis Request")) continue;

    const prev = dispatchByRole.get(role);
    if (!prev || timeMs(msg.created_ts) > timeMs(prev.created_ts)) {
      dispatchByRole.set(role, msg);
    }
  }

  const dispatchIdToRole = new Map<number, TribunalAgentRole>();
  for (const [role, msg] of dispatchByRole.entries()) {
    dispatchIdToRole.set(msg.id, role);
  }

  const responseByRole = new Map<TribunalAgentRole, AgentMailMessage>();
  const sortedNewestFirst = [...params.messages].sort(
    (a, b) => timeMs(b.created_ts) - timeMs(a.created_ts),
  );

  for (const msg of sortedNewestFirst) {
    if (!msg.body_md) continue;

    let role: TribunalAgentRole | null = null;
    if (typeof msg.reply_to === "number") {
      role = dispatchIdToRole.get(msg.reply_to) ?? null;
    }
    if (!role) {
      role = inferRoleFromSubject(msg.subject);
    }
    if (!role || !rolesSet.has(role)) continue;

    const dispatchId = dispatchByRole.get(role)?.id ?? null;
    if (dispatchId && msg.id === dispatchId) continue;
    if (responseByRole.has(role)) continue;

    responseByRole.set(role, msg);
  }

  return params.roles.map((role) => {
    const dispatchMsg = dispatchByRole.get(role) ?? null;
    const responseMsg = responseByRole.get(role) ?? null;
    const content = responseMsg?.body_md ?? null;

    const status: AgentCardStatus = responseMsg
      ? "complete"
      : dispatchMsg
        ? "analyzing"
        : "pending";

    return {
      role,
      status,
      preview: content ? makePreview(content) : null,
      content,
      agentName: responseMsg?.from ?? null,
      receivedAt: responseMsg?.created_ts ?? null,
    };
  });
}

export function AgentTribunalPanel({
  threadId,
  messages,
  roles = DEFAULT_DISPATCH_ROLES,
  className,
}: AgentTribunalPanelProps) {
  const cards = React.useMemo(
    () => deriveCardsFromMessages({ messages, roles }),
    [messages, roles],
  );
  const objections = React.useMemo(() => extractTribunalObjections(messages), [messages]);
  const [objectionStatuses, setObjectionStatuses] = React.useState<Record<string, ObjectionStatus>>(
    {},
  );

  React.useEffect(() => {
    setObjectionStatuses(threadId ? loadObjectionStatuses(threadId) : Object.create(null));
  }, [threadId]);

  React.useEffect(() => {
    if (!threadId || typeof window === "undefined") return;

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ threadId?: string }>).detail;
      if (detail?.threadId !== threadId) return;
      setObjectionStatuses(loadObjectionStatuses(threadId));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== objectionStatusStorageKey(threadId)) return;
      setObjectionStatuses(loadObjectionStatuses(threadId));
    };

    window.addEventListener(OBJECTION_REGISTER_UPDATED_EVENT, handleUpdate as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(OBJECTION_REGISTER_UPDATED_EVENT, handleUpdate as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [threadId]);

  const unresolvedObjections = React.useMemo(() => {
    if (!threadId || objections.length === 0) return 0;
    let count = 0;
    for (const objection of objections) {
      const status = objectionStatuses[objection.id] ?? "open";
      if (UNRESOLVED_OBJECTION_STATUSES.has(status)) count += 1;
    }
    return count;
  }, [threadId, objections, objectionStatuses]);

  const [openRole, setOpenRole] = React.useState<TribunalAgentRole | null>(null);
  // Mobile accordion state - only one expanded at a time
  const [mobileExpandedRole, setMobileExpandedRole] = React.useState<TribunalAgentRole | null>(
    null,
  );
  const openCard = openRole ? (cards.find((c) => c.role === openRole) ?? null) : null;
  const openConfig = openCard ? TRIBUNAL_AGENTS[openCard.role] : null;

  const synthesisInput = React.useMemo(
    () =>
      cards
        .filter(
          (card) =>
            card.status === "complete" &&
            typeof card.content === "string" &&
            card.content.length > 0,
        )
        .map((card) => ({
          agent: card.role,
          content: card.content as string,
        })),
    [cards],
  );

  const synthesis = React.useMemo(() => {
    if (synthesisInput.length < 2) return null;
    return synthesizeResponses(synthesisInput);
  }, [synthesisInput]);

  const closeDialog = () => setOpenRole(null);

  const completedCount = cards.filter((c) => c.status === "complete").length;
  const allRolesComplete = cards.length > 0 && completedCount === cards.length;
  const completionBlocked = allRolesComplete && unresolvedObjections > 0;
  const isComplete = allRolesComplete && !completionBlocked;

  const completionBadge = isComplete
    ? { label: "Complete", className: "border-success/20 bg-success/15 text-success" }
    : completionBlocked
      ? {
          label: `Blocked: ${unresolvedObjections} objection${unresolvedObjections === 1 ? "" : "s"}`,
          className: "border-warning/30 bg-warning/10 text-warning",
        }
      : {
          label: `${completedCount}/${cards.length} complete`,
          className: "border-border bg-muted/40 text-muted-foreground",
        };

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Agent Tribunal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your hypothesis is being evaluated by multiple perspectives.
            </p>
          </div>
          <Badge variant="outline" className={cn("shrink-0", completionBadge.className)}>
            {completionBadge.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {completionBlocked && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-warning">Completion blocked</div>
                <div className="text-xs text-muted-foreground">
                  Resolve all objections marked <span className="font-mono">Open</span>,{" "}
                  <span className="font-mono">Acknowledged</span>, or{" "}
                  <span className="font-mono">Testing</span> before considering the tribunal
                  complete.
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-warning/30 text-warning hover:bg-warning/10"
              >
                <a href="#objections">Review objections</a>
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Accordion View - single agent visible at a time */}
        <div className="space-y-2 md:hidden">
          {cards.map((card) => {
            const agent = TRIBUNAL_AGENTS[card.role];
            const badge = badgeForStatus(card.status);
            const showExpand = card.status === "complete" && Boolean(card.content);
            const isExpanded = mobileExpandedRole === card.role;

            return (
              <Collapsible
                key={card.role}
                open={isExpanded}
                onOpenChange={(open) => setMobileExpandedRole(open ? card.role : null)}
              >
                <CollapsibleTrigger className="w-full rounded-xl border border-border bg-card p-3 shadow-sm hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg border",
                          card.status === "complete"
                            ? "border-success/20 bg-success/10"
                            : "border-border bg-muted/30",
                        )}
                        aria-hidden="true"
                      >
                        <span className="text-base leading-none">{agent.icon}</span>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">
                          {agent.displayName}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-xs", badge.className)}>
                      {badge.label}
                    </Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-1 rounded-xl border border-border bg-card p-4 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-3">{agent.description}</p>

                    <div className="text-sm text-muted-foreground">
                      {card.status === "complete" ? (
                        <p className="text-foreground/90">{card.preview || "Response received."}</p>
                      ) : card.status === "analyzing" ? (
                        <p>Awaiting response…</p>
                      ) : card.status === "error" ? (
                        <p className="text-destructive">Failed to get a response.</p>
                      ) : (
                        <p>Not dispatched yet.</p>
                      )}
                    </div>

                    {(card.agentName || card.receivedAt) && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {card.agentName && (
                          <span className="font-mono text-foreground/80">{card.agentName}</span>
                        )}
                        {card.agentName && card.receivedAt && <span className="mx-2">·</span>}
                        {card.receivedAt && (
                          <span className="font-mono">
                            {new Date(card.receivedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    {showExpand && (
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenRole(card.role)}
                          className="w-full"
                        >
                          Expand Full Response
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid gap-4 lg:grid-cols-2">
          {cards.map((card) => {
            const agent = TRIBUNAL_AGENTS[card.role];
            const badge = badgeForStatus(card.status);
            const showExpand = card.status === "complete" && Boolean(card.content);

            return (
              <div
                key={card.role}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl border",
                        card.status === "complete"
                          ? "border-success/20 bg-success/10"
                          : "border-border bg-muted/30",
                      )}
                      aria-hidden="true"
                    >
                      <span className="text-lg leading-none">{agent.icon}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">
                        {agent.displayName}
                      </div>
                      <div className="text-xs text-muted-foreground">{agent.description}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0", badge.className)}>
                    {badge.label}
                  </Badge>
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  {card.status === "complete" ? (
                    <p className="text-foreground/90">{card.preview || "Response received."}</p>
                  ) : card.status === "analyzing" ? (
                    <p>Awaiting response…</p>
                  ) : card.status === "error" ? (
                    <p className="text-destructive">Failed to get a response.</p>
                  ) : (
                    <p>Not dispatched yet.</p>
                  )}
                </div>

                {(card.agentName || card.receivedAt) && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    {card.agentName && (
                      <span className="font-mono text-foreground/80">{card.agentName}</span>
                    )}
                    {card.agentName && card.receivedAt && <span className="mx-2">·</span>}
                    {card.receivedAt && (
                      <span className="font-mono">
                        {new Date(card.receivedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {showExpand && (
                    <Button size="sm" variant="outline" onClick={() => setOpenRole(card.role)}>
                      Expand Full Response
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {synthesis && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Heuristic Synthesis</div>
                <div className="text-xs text-muted-foreground">
                  Auto-extracted from responses (no model calls).
                </div>
              </div>
              <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
                beta
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Consensus
                </div>
                {synthesis.consensusPoints.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No consensus points detected yet.
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {synthesis.consensusPoints.map((p) => (
                      <li key={`${p.claim}-${p.supportingAgents.join(",")}`} className="space-y-1">
                        <div className="text-foreground">{p.claim}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {p.strength} · {p.supportingAgents.join(", ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Conflicts
                </div>
                {synthesis.conflictPoints.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">No conflicts detected.</div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {synthesis.conflictPoints.map((c) => (
                      <div
                        key={`${c.topic}-${c.positions.map((p) => p.agent).join(",")}`}
                        className="rounded-lg border border-warning/20 bg-warning/5 p-3"
                      >
                        <div className="text-sm font-medium text-foreground">{c.topic}</div>
                        <div className="mt-2 space-y-2">
                          {c.positions.map((p) => (
                            <div
                              key={`${c.topic}-${p.agent}`}
                              className="text-xs text-muted-foreground"
                            >
                              <span className="font-mono text-foreground/80">{p.agent}</span>:{" "}
                              {p.position}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommendations
                </div>
                {synthesis.recommendations.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No recommendations extracted.
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {synthesis.recommendations.slice(0, 6).map((r) => (
                      <li key={`${r.action}-${r.suggestedBy.join(",")}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-foreground">{r.action}</div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0",
                              r.priority === "high" &&
                                "border-warning/20 bg-warning/10 text-warning",
                              r.priority === "medium" &&
                                "border-primary/20 bg-primary/10 text-primary",
                              r.priority === "low" &&
                                "border-border bg-muted/40 text-muted-foreground",
                            )}
                          >
                            {r.priority}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{r.rationale}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Brenner Operators
                </div>
                {synthesis.brennerPrinciples.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No operator hints detected.
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {synthesis.brennerPrinciples.map((p) => (
                      <li key={`${p.principle}-${p.triggeredBy.join(",")}`} className="space-y-1">
                        <div className="text-foreground">{p.principle}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.explanation}{" "}
                          <span className="font-mono">({p.triggeredBy.join(", ")})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <Dialog
          open={Boolean(openRole)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closeDialog();
          }}
        >
          <DialogContent size="xl">
            <DialogHeader separated>
              <DialogTitle className="flex items-center gap-2">
                <span aria-hidden="true">{openConfig?.icon}</span>
                <span>{openConfig?.displayName ?? "Agent Response"}</span>
              </DialogTitle>
              <DialogDescription>
                {openCard?.agentName ? (
                  <>
                    From <span className="font-mono text-foreground/80">{openCard.agentName}</span>
                  </>
                ) : (
                  "Full response"
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {openCard?.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{openCard.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No response body.</div>
              )}
            </DialogBody>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default AgentTribunalPanel;
