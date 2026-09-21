"use client";

/**
 * Agent Tribunal Page
 *
 * Multi-agent synthesis interface for rigorous hypothesis refinement.
 * Shows agent responses, disagreements, and synthesis results.
 *
 * @see brenner_bot-pts6 (routes bead)
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentProgress } from "@/components/brenner-loop/AgentProgress";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { recordSessionResumeEntry } from "@/lib/brenner-loop";
import { isDemoThreadId, normalizeThreadId } from "@/lib/demo-mode";
import { cn } from "@/lib/utils";

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
    />
  </svg>
);

// ============================================================================
// Agent Configuration
// ============================================================================

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  avatar: string;
  model?: string;
}

const AGENTS: AgentConfig[] = [
  {
    id: "devils_advocate",
    name: "Devil's Advocate",
    role: "Challenger",
    description:
      "Actively challenges hypotheses, finds weaknesses, and proposes alternative explanations.",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    avatar: "DA",
    model: "claude-opus-4-5",
  },
  {
    id: "experiment_designer",
    name: "Experiment Designer",
    role: "Methodologist",
    description:
      "Designs discriminative tests between competing hypotheses with practical constraints.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    avatar: "ED",
    model: "gpt-5-codex",
  },
  {
    id: "statistician",
    name: "Statistician",
    role: "Quant",
    description: "Adds quantitative rigor (effect sizes, power, uncertainty) to the tribunal.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    avatar: "ST",
    model: "gpt-5-stat",
  },
  {
    id: "brenner_channeler",
    name: "Brenner Channeler",
    role: "Mentor",
    description: "Channels Sydney Brenner's scientific wisdom and methodology from the corpus.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    avatar: "BC",
    model: "gemini-2.5-pro",
  },
];

const AGENT_PROGRESS_STEPS = [
  "Reading hypothesis",
  "Identifying assumptions",
  "Formulating response",
  "Drafting feedback",
];

const MOCK_RESPONSE_TIMESTAMP = new Date(Date.now() - 1000 * 60 * 15);
const LIVE_THREAD_PREFIX = "TRIBUNAL-";

function normalizeAgentTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function extractAgentTag(subject: string): string | null {
  const tribunalMatch = subject.match(/TRIBUNAL\[([^\]]+)\]/i);
  if (tribunalMatch) return normalizeAgentTag(tribunalMatch[1]);

  const deltaMatch = subject.match(/^DELTA\[([^\]]+)\]/i);
  if (deltaMatch) return normalizeAgentTag(deltaMatch[1]);

  return null;
}

// ============================================================================
// Types
// ============================================================================

type AgentStatus = "idle" | "thinking" | "responded" | "error";

interface AgentResponse {
  agentId: string;
  content: string;
  timestamp: Date;
  confidence?: number;
  disagreements?: string[];
  suggestions?: string[];
}

interface Disagreement {
  id: string;
  agents: [string, string];
  topic: string;
  resolutionStatus: "open" | "resolved" | "escalated";
}

// ============================================================================
// Agent Card Component
// ============================================================================

interface AgentCardProps {
  agent: AgentConfig;
  status: AgentStatus;
  response?: AgentResponse;
  progressStep?: number;
  onInvoke?: () => void;
  onCancel?: () => void;
}

function AgentCard({
  agent,
  status,
  response,
  progressStep = 0,
  onInvoke,
  onCancel,
}: AgentCardProps) {
  const statusConfig = {
    idle: { label: "Ready", color: "text-muted-foreground", bg: "bg-muted" },
    thinking: { label: "Thinking...", color: "text-blue-500", bg: "bg-blue-500/10" },
    responded: { label: "Responded", color: "text-green-500", bg: "bg-green-500/10" },
    error: { label: "Error", color: "text-red-500", bg: "bg-red-500/10" },
  };

  const statusInfo = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all",
        status === "thinking" && "animate-pulse",
        agent.borderColor,
      )}
    >
      {/* Header */}
      <div className={cn("p-4", agent.bgColor)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className={cn(
                "flex items-center justify-center size-12 rounded-xl text-lg font-bold shadow-lg",
                agent.bgColor,
                agent.color,
              )}
            >
              {agent.avatar}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {agent.role}
                </Badge>
                {agent.model && (
                  <span className="text-xs text-muted-foreground font-mono">{agent.model}</span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              statusInfo.bg,
              statusInfo.color,
            )}
          >
            {status === "thinking" && (
              <div className="size-2 rounded-full bg-current animate-pulse" />
            )}
            {status === "responded" && <CheckIcon className="size-3" />}
            {statusInfo.label}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3">{agent.description}</p>
      </div>

      {/* Response Content */}
      {response ? (
        <div className="p-4 bg-background prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.content}</ReactMarkdown>

          {/* Suggestions */}
          {response.suggestions && response.suggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Suggestions</h4>
              <ul className="space-y-1">
                {response.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <SparklesIcon className={cn("size-4 mt-0.5 shrink-0", agent.color)} />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disagreements */}
          {response.disagreements && response.disagreements.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <ExclamationTriangleIcon className="size-3 text-warning" />
                Points of Contention
              </h4>
              <ul className="space-y-1">
                {response.disagreements.map((disagreement, i) => (
                  <li key={i} className="text-sm text-warning">
                    {disagreement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground">
            <ClockIcon className="size-3" />
            {response.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-background">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            {status === "thinking" ? (
              <>
                <AgentProgress
                  agent={agent.name}
                  steps={AGENT_PROGRESS_STEPS}
                  currentStep={progressStep}
                  status="working"
                  className="w-full"
                />
                {onCancel && (
                  <Button size="sm" variant="outline" onClick={onCancel} className="mt-3">
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Agent hasn&apos;t responded yet
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onInvoke}
                  disabled={!onInvoke}
                  className={cn("gap-2", agent.color)}
                >
                  <PlayIcon className="size-3" />
                  Invoke Agent
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Synthesis Panel Component
// ============================================================================

interface SynthesisPanelProps {
  responses: AgentResponse[];
  disagreements: Disagreement[];
}

function SynthesisPanel({ responses, disagreements }: SynthesisPanelProps) {
  const hasAllResponses = responses.length === AGENTS.length;
  const openDisagreements = disagreements.filter((d) => d.resolutionStatus === "open");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-5 text-primary" />
          Synthesis
        </CardTitle>
        <CardDescription>Consolidated insights from agent tribunal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Responses:</span>
            <Badge variant={hasAllResponses ? "default" : "secondary"}>
              {responses.length}/{AGENTS.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Disagreements:</span>
            <Badge variant={openDisagreements.length > 0 ? "destructive" : "secondary"}>
              {openDisagreements.length} open
            </Badge>
          </div>
        </div>

        {/* Open Disagreements */}
        {openDisagreements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <ExclamationTriangleIcon className="size-4 text-warning" />
              Unresolved Disagreements
            </h4>
            <div className="space-y-2">
              {openDisagreements.map((d) => {
                const agent1 = AGENTS.find((a) => a.id === d.agents[0]);
                const agent2 = AGENTS.find((a) => a.id === d.agents[1]);

                return (
                  <div key={d.id} className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={agent1?.color}>
                        {agent1?.avatar}
                      </Badge>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <Badge variant="outline" className={agent2?.color}>
                        {agent2?.avatar}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{d.topic}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Consensus Points */}
        {hasAllResponses && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <CheckIcon className="size-4 text-green-500" />
              Consensus Points
            </h4>
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <CheckIcon className="size-4 text-green-500 mt-0.5 shrink-0" />
                  Hypothesis is testable with current resources
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="size-4 text-green-500 mt-0.5 shrink-0" />
                  Mechanism is plausible at the proposed scale
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="size-4 text-green-500 mt-0.5 shrink-0" />
                  Exclusion tests have been identified
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Generate Synthesis Button */}
        <Button className="w-full" disabled={!hasAllResponses}>
          <SparklesIcon className="size-4 mr-2" />
          Generate Full Synthesis
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AgentsPage() {
  const params = useParams();
  const threadId = normalizeThreadId(params.threadId);

  if (isDemoThreadId(threadId)) {
    return (
      <DemoFeaturePreview
        threadId={threadId}
        featureName="Agent Status"
        featureDescription="Monitor agent roles, response status, and synthesis progress for each session round."
      />
    );
  }

  return <AgentsPageContent threadId={threadId} />;
}

function AgentsPageContent({ threadId }: { threadId: string }) {
  const isLiveThread = threadId.startsWith(LIVE_THREAD_PREFIX);
  const allowMockInvoke = !isLiveThread;

  React.useEffect(() => {
    recordSessionResumeEntry(threadId, "agents");
  }, [threadId]);

  const [agentStatuses, setAgentStatuses] = React.useState<Record<string, AgentStatus>>(() => ({
    devils_advocate: isLiveThread ? "idle" : "responded",
    experiment_designer: "idle",
    statistician: "idle",
    brenner_channeler: "idle",
  }));

  const [responses, setResponses] = React.useState<AgentResponse[]>(() =>
    isLiveThread
      ? []
      : [
          {
            agentId: "devils_advocate",
            content:
              "I challenge the assumption that dopamine-driven feedback loops are the primary mechanism. Alternative explanations include: (1) selection effects where anxious individuals gravitate toward social media, (2) sleep disruption as the mediating factor, and (3) social comparison rather than reward mechanisms driving anxiety.",
            timestamp: MOCK_RESPONSE_TIMESTAMP,
            confidence: 72,
            disagreements: ["The proposed mechanism may be too specific"],
            suggestions: [
              "Include a control group with similar screen time but no social features",
              "Measure dopamine activity directly via neuroimaging",
            ],
          },
        ],
  );

  const [disagreements] = React.useState<Disagreement[]>(() =>
    isLiveThread
      ? []
      : [
          {
            id: "d1",
            agents: ["devils_advocate", "experiment_designer"],
            topic: "Whether neuroimaging is feasible within resource constraints",
            resolutionStatus: "open",
          },
        ],
  );

  const [agentProgress, setAgentProgress] = React.useState<Record<string, number>>({
    devils_advocate: 0,
    experiment_designer: 0,
    statistician: 0,
    brenner_channeler: 0,
  });

  const progressTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});
  const responseTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearAgentTimers = React.useCallback((agentId: string) => {
    const progressTimers = progressTimersRef.current[agentId];
    if (progressTimers) {
      progressTimers.forEach((timer) => clearTimeout(timer));
      delete progressTimersRef.current[agentId];
    }

    const responseTimer = responseTimersRef.current[agentId];
    if (responseTimer) {
      clearTimeout(responseTimer);
      delete responseTimersRef.current[agentId];
    }
  }, []);

  React.useEffect(() => {
    return () => {
      Object.keys(progressTimersRef.current).forEach((agentId) => {
        progressTimersRef.current[agentId].forEach((timer) => clearTimeout(timer));
      });
      Object.values(responseTimersRef.current).forEach((timer) => clearTimeout(timer));
      progressTimersRef.current = {};
      responseTimersRef.current = {};
    };
  }, []);

  React.useEffect(() => {
    if (!isLiveThread) return;
    if (typeof window === "undefined" || typeof window.EventSource === "undefined") return;

    const agentIds = new Set(AGENTS.map((agent) => agent.id));
    const url = new URL("/api/realtime", window.location.origin);
    url.searchParams.set("threadId", threadId);
    url.searchParams.set("pollIntervalMs", "2000");
    url.searchParams.set("includeBodies", "1");
    // Start from 0 so the first thread_update includes existing messages too.
    url.searchParams.set("cursor", "0");

    const eventSource = new EventSource(url.toString());

    const handleThreadUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(String(event.data ?? "")) as {
          newMessages?: Array<{
            subject?: string;
            from?: string;
            created_ts?: string;
            reply_to?: number;
            body_md?: string;
          }>;
        };

        for (const message of payload.newMessages ?? []) {
          const subject = message.subject ?? "";
          const tag = extractAgentTag(subject);
          if (!tag || !agentIds.has(tag)) continue;
          const timestamp = message.created_ts ? new Date(message.created_ts) : new Date();
          const content = message.body_md?.trim()
            ? message.body_md
            : `Response received from ${message.from ?? "agent"}. Open the thread to view the full response.`;

          if (/^TRIBUNAL\[/i.test(subject)) {
            if (typeof message.reply_to === "number") {
              setAgentStatuses((prev) => ({ ...prev, [tag]: "responded" }));
              setAgentProgress((prev) => ({
                ...prev,
                [tag]: AGENT_PROGRESS_STEPS.length - 1,
              }));
              setResponses((prev) => {
                const existingIndex = prev.findIndex((response) => response.agentId === tag);
                if (existingIndex >= 0) {
                  const existing = prev[existingIndex];
                  if (!message.body_md) return prev;
                  const updated = [...prev];
                  updated[existingIndex] = { ...existing, content, timestamp };
                  return updated;
                }
                return [...prev, { agentId: tag, content, timestamp }];
              });
              continue;
            }
            setAgentStatuses((prev) => ({
              ...prev,
              [tag]: prev[tag] === "responded" ? prev[tag] : "thinking",
            }));
            setAgentProgress((prev) => ({
              ...prev,
              [tag]: Math.max(prev[tag] ?? 0, 1),
            }));
            continue;
          }

          if (/^DELTA\[/i.test(subject)) {
            setAgentStatuses((prev) => ({ ...prev, [tag]: "responded" }));
            setAgentProgress((prev) => ({
              ...prev,
              [tag]: AGENT_PROGRESS_STEPS.length - 1,
            }));
            setResponses((prev) => {
              const existingIndex = prev.findIndex((response) => response.agentId === tag);
              if (existingIndex >= 0) {
                const existing = prev[existingIndex];
                if (!message.body_md) return prev;
                const updated = [...prev];
                updated[existingIndex] = { ...existing, content, timestamp };
                return updated;
              }
              return [...prev, { agentId: tag, content, timestamp }];
            });
          }
        }
      } catch {}
    };

    eventSource.addEventListener("thread_update", handleThreadUpdate);

    return () => {
      eventSource.removeEventListener("thread_update", handleThreadUpdate as EventListener);
      eventSource.close();
    };
  }, [isLiveThread, threadId]);

  const handleInvokeAgent = (agentId: string) => {
    if (!allowMockInvoke) return;
    clearAgentTimers(agentId);
    setAgentStatuses((prev) => ({ ...prev, [agentId]: "thinking" }));
    setAgentProgress((prev) => ({ ...prev, [agentId]: 0 }));

    const progressTimers = AGENT_PROGRESS_STEPS.map((_, index) =>
      setTimeout(
        () => {
          setAgentProgress((prev) => ({
            ...prev,
            [agentId]: Math.min(index + 1, AGENT_PROGRESS_STEPS.length - 1),
          }));
        },
        (index + 1) * 700,
      ),
    );

    progressTimersRef.current[agentId] = progressTimers;

    // Simulate agent response
    const responseTimer = setTimeout(() => {
      clearAgentTimers(agentId);
      setAgentStatuses((prev) => ({ ...prev, [agentId]: "responded" }));

      const mockResponses: Record<string, Omit<AgentResponse, "agentId">> = {
        experiment_designer: {
          content:
            "I propose a 2x2 factorial design: (Social Media + Notifications vs Social Media + No Notifications) x (Active Use vs Passive Scrolling). This separates the reward mechanism from the content exposure. Primary outcome: validated anxiety scale (GAD-7). Power analysis suggests n=120 per cell.",
          timestamp: new Date(),
          suggestions: [
            "Use smartphone logging apps for objective usage data",
            "Include physiological measures (heart rate variability)",
            "Pre-register the analysis plan to prevent p-hacking",
          ],
        },
        brenner_channeler: {
          content:
            '"Before you start, do your sums." The scale check reveals that the proposed dopamine mechanism operates on millisecond timescales, while anxiety is measured over weeks. We need to specify the bridging mechanism. Consider: what is the minimum exposure duration that could produce detectable anxiety changes?',
          timestamp: new Date(),
          suggestions: [
            "Apply the Level Split operator to distinguish acute vs. chronic effects",
            "Define falsification criteria before collecting data",
            "Consider object transpose: are there animal models with cleaner causality?",
          ],
        },
      };

      if (mockResponses[agentId]) {
        setResponses((prev) => [...prev, { agentId, ...mockResponses[agentId] }]);
      }
    }, 3000);

    responseTimersRef.current[agentId] = responseTimer;
  };

  const handleCancelAgent = (agentId: string) => {
    if (!allowMockInvoke) return;
    clearAgentTimers(agentId);
    setAgentStatuses((prev) => ({ ...prev, [agentId]: "idle" }));
    setAgentProgress((prev) => ({ ...prev, [agentId]: 0 }));
  };

  const invokeAllAgents = () => {
    if (!allowMockInvoke) return;
    AGENTS.forEach((agent) => {
      if (agentStatuses[agent.id] === "idle") {
        handleInvokeAgent(agent.id);
      }
    });
  };

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up">
          <Link href="/sessions" className="hover:text-foreground transition-colors">
            Sessions
          </Link>
          <span>/</span>
          <Link
            href={`/sessions/${threadId}`}
            className="hover:text-foreground transition-colors font-mono"
          >
            {threadId.slice(0, 12)}...
          </Link>
          <span>/</span>
          <span className="text-foreground">Agent Tribunal</span>
        </nav>

        {/* Back link */}
        <Link
          href={`/sessions/${threadId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeftIcon className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Session
        </Link>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-lg shadow-primary/10">
              <UsersIcon className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Agent Tribunal</h1>
              <p className="text-muted-foreground">
                Multi-agent synthesis for rigorous hypothesis refinement
              </p>
            </div>
          </div>

          <Button onClick={invokeAllAgents} className="gap-2" disabled={!allowMockInvoke}>
            <PlayIcon className="size-4" />
            Invoke All Agents
          </Button>
        </motion.header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Cards */}
          <div className="lg:col-span-2 space-y-4">
            {AGENTS.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AgentCard
                  agent={agent}
                  status={agentStatuses[agent.id]}
                  progressStep={agentProgress[agent.id] ?? 0}
                  response={responses.find((r) => r.agentId === agent.id)}
                  onInvoke={allowMockInvoke ? () => handleInvokeAgent(agent.id) : undefined}
                  onCancel={allowMockInvoke ? () => handleCancelAgent(agent.id) : undefined}
                />
              </motion.div>
            ))}
          </div>

          {/* Synthesis Sidebar */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SynthesisPanel responses={responses} disagreements={disagreements} />
            </motion.div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
