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
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  createHypothesisCard,
  createSession,
  generateHypothesisCardId,
  type HypothesisCard,
  recordSessionResumeEntry,
  sessionStorage,
} from "@/lib/brenner-loop";
import {
  buildAgentPrompt,
  loadPrompt,
  type TribunalAgentRole,
} from "@/lib/brenner-loop/agents";
import {
  AGENT_PERSONAS,
  buildSystemPromptContext,
  getBehaviorsByPriority,
  getInteractionExamples,
  getModelConfig,
  getPersona,
  getPersonasForTrigger,
  type InvocationTrigger,
} from "@/lib/brenner-loop/agents/agent-personas";
import {
  type AgentDebate,
  addRound,
  addUserInjection,
  buildDebateFollowUpPrompt,
  buildDebateOpeningPrompt,
  concludeDebate,
  createDebate,
  DEBATE_FORMAT_CONFIGS,
  type DebateFormat,
  getDebateStatus,
} from "@/lib/brenner-loop/agents/debate";
import {
  type SynthesisResult,
  synthesizeResponses,
} from "@/lib/brenner-loop/agents/synthesis";
import { useAgentDispatch } from "@/hooks/useAgentDispatch";
import { isDemoThreadId, normalizeThreadId } from "@/lib/demo-mode";
import {
  applyPreset,
  DEFAULT_3_AGENT_PRESET,
  formatRosterAsMarkdown,
  validateRoster,
  validateRosterCoverage,
} from "@/lib/roster";
import {
  acceptCritique,
  addressCritique,
  countUnaddressedCritiques,
  type Critique,
  createFramingCritique,
  createHypothesisCritique,
  createTestCritique,
  dismissCritique,
  evaluateKillJustification,
  evaluateThirdAlternative,
  generateCritiqueId,
  reopenCritique,
  requiresResponse,
} from "@/lib/schemas/critique";
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
  promptText?: string;
  ntmCommand?: string;
  onInvoke?: () => void;
  onCancel?: () => void;
  onSaveManualResponse?: (content: string) => void;
}

function AgentCard({
  agent,
  status,
  response,
  progressStep = 0,
  promptText,
  ntmCommand,
  onInvoke,
  onCancel,
  onSaveManualResponse,
}: AgentCardProps) {
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [showPasteBox, setShowPasteBox] = React.useState(false);
  const [manualText, setManualText] = React.useState("");
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  const statusConfig = {
    idle: { label: "Ready", color: "text-muted-foreground", bg: "bg-muted" },
    thinking: { label: "Thinking...", color: "text-blue-500", bg: "bg-blue-500/10" },
    responded: { label: "Responded", color: "text-green-500", bg: "bg-green-500/10" },
    error: { label: "Error", color: "text-red-500", bg: "bg-red-500/10" },
  };

  const statusInfo = statusConfig[status];

  const handleCopyPrompt = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

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
        <div className="flex items-start justify-between gap-3">
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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowPrompt((prev) => !prev)}
            >
              {showPrompt ? "Hide Prompt" : "NTM Prompt"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowPasteBox((prev) => !prev)}
            >
              {showPasteBox ? "Cancel Paste" : "Paste CLI Output"}
            </Button>

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
        </div>

        <p className="text-sm text-muted-foreground mt-3">{agent.description}</p>

        {showPrompt && (
          <div className="mt-3 rounded-lg border border-border bg-background/90 p-3 space-y-2 text-xs">
            {ntmCommand && (
              <div className="flex items-center justify-between gap-2 bg-muted/50 rounded p-2 font-mono">
                <span className="truncate">{ntmCommand}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] shrink-0"
                  onClick={() => void handleCopyPrompt(ntmCommand)}
                >
                  {copiedPrompt ? "Copied" : "Copy Command"}
                </Button>
              </div>
            )}
            {promptText && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">
                    Compiled Tribunal System + Hypothesis Prompt
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px]"
                    onClick={() => void handleCopyPrompt(promptText)}
                  >
                    Copy Full Prompt
                  </Button>
                </div>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-muted/30 p-2 font-mono text-[11px]">
                  {promptText}
                </pre>
              </div>
            )}
          </div>
        )}

        {showPasteBox && (
          <div className="mt-3 rounded-lg border border-border bg-background/90 p-3 space-y-2">
            <Textarea
              placeholder={`Paste ${agent.name} response from your NTM / CLI session...`}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="min-h-[90px] text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowPasteBox(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!manualText.trim()}
                onClick={() => {
                  if (!manualText.trim()) return;
                  onSaveManualResponse?.(manualText.trim());
                  setManualText("");
                  setShowPasteBox(false);
                }}
              >
                Save Agent Response
              </Button>
            </div>
          </div>
        )}
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
  synthesisResult: SynthesisResult | null;
  onGenerateSynthesis: () => void;
}

function SynthesisPanel({
  responses,
  disagreements,
  synthesisResult,
  onGenerateSynthesis,
}: SynthesisPanelProps) {
  const hasAllResponses = responses.length >= AGENTS.length;
  const canSynthesize = responses.length >= 1;
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
        {(hasAllResponses || synthesisResult) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <CheckIcon className="size-4 text-green-500" />
              Consensus Points
            </h4>
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <ul className="space-y-2 text-sm text-foreground">
                {synthesisResult && synthesisResult.consensusPoints.length > 0 ? (
                  synthesisResult.consensusPoints.map((cp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckIcon className="size-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{cp.claim}</span>
                    </li>
                  ))
                ) : (
                  <>
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
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Synthesized Recommendations & Brenner Principles */}
        {synthesisResult && (
          <div className="space-y-4 pt-2 border-t border-border">
            {synthesisResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Synthesized Action Plan
                </h4>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {synthesisResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="rounded-lg border border-border bg-muted/20 p-2">
                      <span className="font-medium">{rec.action}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {rec.rationale} ({rec.priority})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {synthesisResult.brennerPrinciples.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Triggered Brenner Principles
                </h4>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {synthesisResult.brennerPrinciples.map((bp, idx) => (
                    <li key={idx} className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                      <span className="font-semibold">{bp.principle}:</span> {bp.explanation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Generate Synthesis Button */}
        <Button className="w-full" disabled={!canSynthesize} onClick={onGenerateSynthesis}>
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

function sanitizeTribunalSessionId(rawId: string): string {
  const cleaned = rawId.replace(/[^A-Za-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "SESSION-DEFAULT";
}

function createDefaultTribunalHypothesis(safeSessionId: string): HypothesisCard {
  return createHypothesisCard({
    id: generateHypothesisCardId(safeSessionId, 1, 1),
    sessionId: safeSessionId,
    statement:
      "Social media usage causes increased anxiety in teenagers through dopamine-driven feedback loops.",
    mechanism:
      "Intermittent variable reward schedules in notifications trigger compulsive checking and acute cortisol elevation.",
    domain: ["Psychology", "Neuroscience"],
    predictionsIfTrue: [
      "Removing social media for 2 weeks reduces adolescent anxiety scores by 20%+",
    ],
    predictionsIfFalse: ["Anxiety biomarkers remain unchanged after notification removal"],
    impossibleIfTrue: [
      "Heavy users show lower baseline cortisol than non-users under identical sleep schedules",
    ],
    confidence: 65,
  });
}

function AgentsPageContent({ threadId }: { threadId: string }) {
  const isLiveThread = threadId.startsWith(LIVE_THREAD_PREFIX);
  const allowMockInvoke = !isLiveThread;
  const safeSessionId = React.useMemo(() => sanitizeTribunalSessionId(threadId), [threadId]);

  React.useEffect(() => {
    recordSessionResumeEntry(threadId, "agents");
  }, [threadId]);

  const [primaryHypothesis, setPrimaryHypothesis] = React.useState<HypothesisCard>(() =>
    createDefaultTribunalHypothesis(safeSessionId),
  );

  const [compiledPrompts, setCompiledPrompts] = React.useState<Record<string, string>>({});
  const [synthesisResult, setSynthesisResult] = React.useState<SynthesisResult | null>(null);

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

  // Hydrate hypothesis, saved responses, and compiled Tribunal prompts
  React.useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      let activeCard = createDefaultTribunalHypothesis(safeSessionId);
      let activeOperators: NonNullable<Parameters<typeof buildAgentPrompt>[2]> = {};
      try {
        const loaded = await sessionStorage.load(threadId);
        if (!cancelled && loaded) {
          activeOperators = loaded.operatorApplications ?? {};
          const primaryId = loaded.primaryHypothesisId;
          const card =
            (primaryId && loaded.hypothesisCards[primaryId]) ||
            Object.values(loaded.hypothesisCards)[0];
          if (card) {
            activeCard = {
              ...card,
              createdAt: card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt),
              updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt),
            };
            setPrimaryHypothesis(activeCard);
          }
        }
      } catch {
        // Ignore storage load error
      }

      if (typeof window !== "undefined") {
        try {
          const rawSaved = window.localStorage.getItem(`brenner-tribunal-responses-${threadId}`);
          if (rawSaved) {
            const parsed = JSON.parse(rawSaved) as Array<
              Omit<AgentResponse, "timestamp"> & { timestamp: string }
            >;
            if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
              const hydrated = parsed.map((r) => ({
                ...r,
                timestamp: new Date(r.timestamp),
              }));
              setResponses(hydrated);
              const nextStatuses: Record<string, AgentStatus> = {
                devils_advocate: "idle",
                experiment_designer: "idle",
                statistician: "idle",
                brenner_channeler: "idle",
              };
              for (const r of hydrated) {
                nextStatuses[r.agentId] = "responded";
              }
              setAgentStatuses(nextStatuses);
            }
          }
        } catch {
          // Ignore malformed saved responses
        }
      }

      const promptsMap: Record<string, string> = {};
      for (const agent of AGENTS) {
        try {
          const role = agent.id as TribunalAgentRole;
          const sysPrompt = await loadPrompt(role);
          const contextualPrompt = buildAgentPrompt(role, activeCard, activeOperators);
          promptsMap[agent.id] = `${sysPrompt}\n\n---\n\n${contextualPrompt}`;
        } catch {
          // Ignore prompt load failure
        }
      }
      if (!cancelled) {
        setCompiledPrompts(promptsMap);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [threadId, safeSessionId]);

  const persistResponses = React.useCallback(
    async (nextResponses: AgentResponse[]) => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `brenner-tribunal-responses-${threadId}`,
            JSON.stringify(nextResponses),
          );
        } catch {
          // Ignore
        }
      }

      try {
        const existing =
          (await sessionStorage.load(threadId)) ??
          createSession({
            id: threadId,
            domain: primaryHypothesis.domain[0] ?? "Psychology",
            createdBy: "local-operator",
          });
        existing.updatedAt = new Date().toISOString();
        await sessionStorage.save(existing);
      } catch {
        // Ignore
      }
    },
    [threadId, primaryHypothesis.domain],
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

  const handleSaveManualResponse = (agentId: string, content: string) => {
    clearAgentTimers(agentId);
    setAgentStatuses((prev) => ({ ...prev, [agentId]: "responded" }));
    setResponses((prev) => {
      const filtered = prev.filter((r) => r.agentId !== agentId);
      const next = [
        ...filtered,
        {
          agentId,
          content,
          timestamp: new Date(),
        },
      ];
      void persistResponses(next);
      return next;
    });
  };

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
        (index + 1) * 250,
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
        statistician: {
          content:
            "To detect a 20% reduction in GAD-7 anxiety scores (Cohen's d ≈ 0.45) at α = 0.05 and 80% power with longitudinal mixed-effects modeling, n = 85 participants per arm is required after accounting for 15% attrition. We should adjust for baseline sleep duration as a time-varying covariate.",
          timestamp: new Date(),
          suggestions: [
            "Use mixed-effects model with random slopes for individual baseline cortisol",
            "Specify equivalence bounds (TOST) to make the null prediction falsifiable",
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
        setResponses((prev) => {
          const filtered = prev.filter((r) => r.agentId !== agentId);
          const next = [...filtered, { agentId, ...mockResponses[agentId] }];
          void persistResponses(next);
          return next;
        });
      }
    }, 900);

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

  const handleGenerateSynthesis = () => {
    if (responses.length === 0) return;
    const result = synthesizeResponses(
      responses.map((r) => ({
        agent: r.agentId,
        content: [
          r.content,
          ...(r.suggestions ?? []).map((s) => `- Should ${s}`),
          ...(r.disagreements ?? []).map((d) => `- However, ${d}`),
        ].join("\n"),
      })),
    );
    setSynthesisResult(result);
  };

  // Agent Mail dispatch hook
  const dispatchController = useAgentDispatch({
    projectKey: "/data/projects/brenner_bot",
    senderName: "TribunalOperator",
    autoStartPolling: false,
  });

  // Protocol Roster state & validation
  const rosterAudit = React.useMemo(() => {
    const recipientAgents = ["Codex-GPT5", "Claude-Opus45", "Gemini-3-Pro"];
    const roster = applyPreset(DEFAULT_3_AGENT_PRESET, recipientAgents);
    const validation = validateRoster(roster);
    const coverage = validateRosterCoverage(roster, recipientAgents);
    const markdown = formatRosterAsMarkdown(roster);
    return {
      roster,
      validation,
      coverage,
      markdown,
    };
  }, []);

  // Tribunal Persona Behavioral & Tone Inspector state
  const [selectedPersonaRole, setSelectedPersonaRole] =
    React.useState<TribunalAgentRole>("devils_advocate");
  const [selectedTrigger, setSelectedTrigger] =
    React.useState<InvocationTrigger>("hypothesis_submitted");

  const activePersona = React.useMemo(
    () => getPersona(selectedPersonaRole),
    [selectedPersonaRole],
  );
  const prioritizedBehaviors = React.useMemo(
    () => getBehaviorsByPriority(selectedPersonaRole),
    [selectedPersonaRole],
  );
  const personaModelConfig = React.useMemo(
    () => getModelConfig(selectedPersonaRole),
    [selectedPersonaRole],
  );
  const personaInteractionExamples = React.useMemo(
    () => getInteractionExamples(selectedPersonaRole),
    [selectedPersonaRole],
  );
  const personaSystemPromptContext = React.useMemo(
    () => buildSystemPromptContext(selectedPersonaRole),
    [selectedPersonaRole],
  );
  const triggeredPersonas = React.useMemo(
    () => getPersonasForTrigger(selectedTrigger),
    [selectedTrigger],
  );

  // Multi-Round Adversarial Debate state
  const [debateFormat, setDebateFormat] = React.useState<DebateFormat>("oxford_style");
  const [debate, setDebate] = React.useState<AgentDebate>(() =>
    createDebate({
      sessionId: safeSessionId,
      hypothesis: primaryHypothesis,
      format: "oxford_style",
    }),
  );
  const [userInjectionText, setUserInjectionText] = React.useState("");

  React.useEffect(() => {
    setDebate((prev) =>
      prev.rounds.length === 0
        ? createDebate({
            sessionId: safeSessionId,
            hypothesis: primaryHypothesis,
            format: debateFormat,
          })
        : prev,
    );
  }, [safeSessionId, primaryHypothesis, debateFormat]);

  const debateStatus = React.useMemo(() => getDebateStatus(debate), [debate]);

  const nextDebatePromptPreview = React.useMemo(() => {
    const speaker = debateStatus.currentSpeaker;
    if (!speaker) return null;
    return debate.rounds.length === 0
      ? buildDebateOpeningPrompt(debate, speaker)
      : buildDebateFollowUpPrompt(debate, speaker, debate.rounds);
  }, [debate, debateStatus.currentSpeaker]);

  const handleSelectDebateFormat = (nextFormat: DebateFormat) => {
    setDebateFormat(nextFormat);
    setDebate(
      createDebate({
        sessionId: safeSessionId,
        hypothesis: primaryHypothesis,
        format: nextFormat,
      }),
    );
  };

  const handleAdvanceDebateRound = () => {
    const speaker = debateStatus.currentSpeaker;
    if (!speaker) return;

    const roundNumber = debate.rounds.length + 1;
    const roleArguments: Record<TribunalAgentRole, string> = {
      experiment_designer: `Round ${roundNumber} Proposition: We propose a 2x2 factorial intervention isolating the causal pathway of "${primaryHypothesis.statement.slice(0, 70)}...". Crucial potency controls verify assay sensitivity prior to readout.`,
      devils_advocate: `Round ${roundNumber} Opposition: However, this design fails to rule out reverse causation and baseline sleep confounding. We challenge the assumption that short-term intervention captures chronic homeostatic adaptation.`,
      statistician: `Round ${roundNumber} Quantitative Check: We agree that baseline confounding is a valid point, but argue that longitudinal mixed-effects modeling with random slopes and n=120 per arm resolves the power objection.`,
      brenner_channeler: `Round ${roundNumber} Methodological Probe: Have you applied the Level Split operator? You are conflating acute receptor signaling with multi-week behavioral phenotype.`,
      synthesis: `Round ${roundNumber} Synthesis: Consolidating consensus points and remaining discriminative tests across the tribunal.`,
    };

    const next = addRound(debate, {
      speaker,
      content: roleArguments[speaker],
      replyingTo: debate.rounds.length > 0 ? debate.rounds.length : undefined,
    });
    setDebate(next);
  };

  const handleInjectUserChallenge = () => {
    if (!userInjectionText.trim()) return;
    setDebate((prev) => addUserInjection(prev, userInjectionText.trim(), "all"));
    setUserInjectionText("");
  };

  const handleConcludeDebate = () => {
    setDebate((prev) => concludeDebate(prev));
  };

  // Adversarial Critique Registry (§229) state & handlers
  const critiqueSessionId = React.useMemo(
    () => safeSessionId.replace(/[^A-Za-z0-9.-]/g, "-").replace(/^-+|-+$/g, "") || "SESSION",
    [safeSessionId],
  );

  const [critiques, setCritiques] = React.useState<Critique[]>(() => {
    const existingIds: string[] = [];
    const id1 = generateCritiqueId(critiqueSessionId, existingIds);
    existingIds.push(id1);
    const id2 = generateCritiqueId(critiqueSessionId, existingIds);
    existingIds.push(id2);
    const id3 = generateCritiqueId(critiqueSessionId, existingIds);
    existingIds.push(id3);

    return [
      createHypothesisCritique({
        id: id1,
        hypothesisId: `H-${critiqueSessionId}-001`,
        attack:
          "Observational correlation between exposure and outcome fails to rule out reverse causation from baseline homeostatic dysregulation.",
        evidenceToConfirm:
          "Pre-exposure longitudinal baseline trajectory showing outcome divergence prior to exposure onset.",
        severity: "critical",
        sessionId: critiqueSessionId,
        raisedBy: "Devil's Advocate",
        anchors: ["§103", "§229"],
        proposedAlternative: {
          description:
            "Latent homeostatic stress drives both compensatory exposure behavior and downstream phenotype expression.",
          mechanism: "Autonomic stress-axis activation preceding behavioral exposure",
          testable: true,
          predictions: [
            "Elevated baseline cortisol/HRV precedes exposure onset in longitudinal cohort",
          ],
        },
      }),
      createTestCritique({
        id: id2,
        testId: "T1",
        attack:
          "Acute 48-hour perturbation window is shorter than receptor turnover half-life and cannot detect chronic adaptation.",
        evidenceToConfirm:
          "Time-series assay showing receptor half-life exceeds 72 hours under control conditions.",
        severity: "serious",
        sessionId: critiqueSessionId,
        raisedBy: "Experiment Designer",
      }),
      createFramingCritique({
        id: id3,
        attack:
          "Framing treats program instruction and biochemical execution as a single level instead of splitting message from machine.",
        evidenceToConfirm:
          "Isomorphic phenotype under orthogonal biochemical substrates when regulatory topology is preserved.",
        severity: "moderate",
        sessionId: critiqueSessionId,
        raisedBy: "Brenner Channeler",
        anchors: ["§58"],
      }),
    ];
  });

  const unaddressedHypothesisCritiqueCount = React.useMemo(
    () => countUnaddressedCritiques(critiques, "hypothesis"),
    [critiques],
  );

  const handleAcceptCritique = (critiqueId: string) => {
    setCritiques((prev) =>
      prev.map((c) =>
        c.id === critiqueId && c.status === "active"
          ? acceptCritique(
              c,
              "modified",
              "Accepted adversarial critique and narrowed hypothesis scope to exclude baseline reverse-causation regime.",
              "Operator",
            )
          : c,
      ),
    );
  };

  const handleAddressCritique = (critiqueId: string) => {
    setCritiques((prev) =>
      prev.map((c) =>
        c.id === critiqueId && c.status === "active"
          ? addressCritique(c, {
              text: "Designed longitudinal washout + potency control test T2 to isolate chronic receptor turnover.",
              respondedBy: "Operator",
              actionTaken: "new_test",
              newTestId: "T2",
            })
          : c,
      ),
    );
  };

  const handleDismissCritique = (critiqueId: string) => {
    setCritiques((prev) =>
      prev.map((c) =>
        c.id === critiqueId && c.status === "active"
          ? dismissCritique(
              c,
              "Prior calibration run already verified substrate independence across both assay levels.",
              "Operator",
            )
          : c,
      ),
    );
  };

  const handleReopenCritique = (critiqueId: string) => {
    setCritiques((prev) =>
      prev.map((c) =>
        c.id === critiqueId && c.status !== "active"
          ? reopenCritique(c, "Reopened for post-synthesis verification.")
          : c,
      ),
    );
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
          className="flex flex-wrap items-start justify-between gap-4"
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

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Dispatch: {dispatchController.state}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void dispatchController.startDispatch(primaryHypothesis, safeSessionId)
              }
              disabled={
                dispatchController.state === "checking" ||
                dispatchController.state === "dispatching"
              }
            >
              Dispatch via Agent Mail
            </Button>
            <Button onClick={invokeAllAgents} className="gap-2" disabled={!allowMockInvoke}>
              <PlayIcon className="size-4" />
              Invoke All Agents
            </Button>
          </div>
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
                  promptText={compiledPrompts[agent.id]}
                  ntmCommand={`ntm send ${safeSessionId} --role=${agent.id} "Run Tribunal analysis on ${primaryHypothesis.id}"`}
                  onInvoke={allowMockInvoke ? () => handleInvokeAgent(agent.id) : undefined}
                  onCancel={allowMockInvoke ? () => handleCancelAgent(agent.id) : undefined}
                  onSaveManualResponse={(text) => handleSaveManualResponse(agent.id, text)}
                />
              </motion.div>
            ))}
          </div>

          {/* Synthesis Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SynthesisPanel
                responses={responses}
                disagreements={disagreements}
                synthesisResult={synthesisResult}
                onGenerateSynthesis={handleGenerateSynthesis}
              />
            </motion.div>

            {/* Protocol Roster Validation Panel */}
            <Card data-testid="agent-roster-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Protocol Roster</CardTitle>
                  <Badge
                    variant={
                      rosterAudit.validation.valid && rosterAudit.coverage.valid
                        ? "secondary"
                        : "destructive"
                    }
                    className="font-mono text-xs"
                  >
                    {rosterAudit.validation.valid && rosterAudit.coverage.valid
                      ? "3/3 Roles Verified"
                      : "Roster Error"}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {rosterAudit.roster.name} ({rosterAudit.roster.mode})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  {rosterAudit.roster.entries.map((entry) => (
                    <div
                      key={entry.agentName}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5"
                    >
                      <span className="font-mono font-medium text-foreground">
                        {entry.agentName}
                      </span>
                      <span className="text-muted-foreground">
                        {entry.role} • {entry.model}
                      </span>
                    </div>
                  ))}
                </div>
                <details className="rounded-lg border border-border bg-muted/10 p-2">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    Kickoff Roster Markdown
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                    {rosterAudit.markdown}
                  </pre>
                </details>
              </CardContent>
            </Card>

            {/* Tribunal Persona Behavioral & Tone Inspector */}
            <Card data-testid="tribunal-persona-inspector">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Persona Behavioral &amp; Tone Inspector</CardTitle>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    T={personaModelConfig.temperature} • {personaModelConfig.preferredTier}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Inspect behavioral priorities, tone calibration, and trigger activation matrix
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {/* Role selector pills */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(AGENT_PERSONAS).map((persona) => (
                    <button
                      key={persona.role}
                      type="button"
                      data-testid={`persona-tab-${persona.role}`}
                      onClick={() => setSelectedPersonaRole(persona.role)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        selectedPersonaRole === persona.role
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-muted/20 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {persona.displayName}
                    </button>
                  ))}
                </div>

                {/* Active Persona Summary */}
                <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-semibold text-foreground"
                      data-testid="active-persona-name"
                    >
                      {activePersona.displayName}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      maxTokens={personaModelConfig.maxTokens}
                    </span>
                  </div>
                  <p className="italic text-muted-foreground">{activePersona.tagline}</p>
                  <p className="text-[11px] text-foreground/90 leading-relaxed">
                    {activePersona.corePurpose}
                  </p>
                </div>

                {/* Tone Calibration Metrics */}
                <div className="grid grid-cols-2 gap-2" data-testid="persona-tone-calibration">
                  {(
                    [
                      ["Assertiveness", activePersona.tone.assertiveness],
                      ["Constructive", activePersona.tone.constructiveness],
                      ["Socratic", activePersona.tone.socraticLevel],
                      ["Formality", activePersona.tone.formality],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded border border-border/60 bg-background/60 px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium text-foreground">
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(value * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prioritized Behaviors */}
                <div className="space-y-1.5">
                  <div className="font-medium text-foreground">
                    Priority Behaviors ({prioritizedBehaviors.length})
                  </div>
                  {prioritizedBehaviors.slice(0, 3).map((behavior) => (
                    <div
                      key={behavior.id}
                      className="rounded border border-border/60 bg-muted/10 px-2.5 py-1.5 space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{behavior.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          P{behavior.priority}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{behavior.description}</p>
                    </div>
                  ))}
                </div>

                {/* Invocation Trigger Filter */}
                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">Trigger Routing</span>
                    <select
                      aria-label="Invocation Trigger"
                      data-testid="persona-trigger-select"
                      value={selectedTrigger}
                      onChange={(e) => setSelectedTrigger(e.target.value as InvocationTrigger)}
                      className="rounded border border-border bg-background px-2 py-0.5 text-[11px] text-foreground"
                    >
                      <option value="hypothesis_submitted">hypothesis_submitted</option>
                      <option value="evidence_challenges">evidence_challenges</option>
                      <option value="test_designed">test_designed</option>
                      <option value="operator_applied">operator_applied</option>
                      <option value="tribunal_requested">tribunal_requested</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1" data-testid="triggered-personas-list">
                    {triggeredPersonas.map((p) => (
                      <Badge key={p.role} variant="outline" className="text-[10px]">
                        {p.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* System Prompt Context & Example Pattern */}
                <details className="rounded-lg border border-border bg-muted/10 p-2">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    System Directives &amp; Interaction Example
                  </summary>
                  {personaInteractionExamples[0] && (
                    <div className="mt-2 rounded border border-border/60 bg-background/80 p-2 space-y-1">
                      <div className="font-mono text-[10px] text-muted-foreground">
                        Input ({personaInteractionExamples[0].inputType}): &ldquo;
                        {personaInteractionExamples[0].userInput}&rdquo;
                      </div>
                      <div className="text-[11px] text-foreground">
                        → {personaInteractionExamples[0].agentResponses[0]}
                      </div>
                    </div>
                  )}
                  <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                    {personaSystemPromptContext}
                  </pre>
                </details>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Multi-Round Adversarial Debate Arena */}
        <Card data-testid="agent-debate-arena" className="border-primary/20">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  Multi-Round Adversarial Debate Arena
                </CardTitle>
                <CardDescription>
                  {DEBATE_FORMAT_CONFIGS[debate.format].description} • Topic: {debate.topic}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(DEBATE_FORMAT_CONFIGS) as DebateFormat[]).map((fmt) => (
                  <Button
                    key={fmt}
                    size="sm"
                    variant={debate.format === fmt ? "default" : "outline"}
                    onClick={() => handleSelectDebateFormat(fmt)}
                  >
                    {DEBATE_FORMAT_CONFIGS[fmt].name}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  Status: {debate.status}
                </Badge>
                <span>
                  Rounds:{" "}
                  <strong className="text-foreground">
                    {debateStatus.roundsCompleted}/{debateStatus.maxRounds}
                  </strong>
                </span>
                {debateStatus.currentSpeaker && (
                  <span>
                    Next Speaker:{" "}
                    <strong className="font-mono text-primary">
                      {debateStatus.currentSpeaker}
                    </strong>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAdvanceDebateRound}
                  disabled={!debateStatus.currentSpeaker || debate.status === "concluded"}
                >
                  Advance Debate Round
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleConcludeDebate}
                  disabled={debate.rounds.length === 0 || debate.status === "concluded"}
                >
                  Conclude Debate
                </Button>
              </div>
            </div>

            {debate.rounds.length > 0 && (
              <div className="space-y-2">
                {debate.rounds.map((round) => (
                  <div
                    key={round.number}
                    className="rounded-xl border border-border bg-card p-3 space-y-1 text-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">
                        Round {round.number} • {round.speaker}
                      </span>
                      <span>{new Date(round.recordedAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-foreground">{round.content}</p>
                  </div>
                ))}
              </div>
            )}

            {debate.userInjections.length > 0 && (
              <div className="space-y-1.5">
                {debate.userInjections.map((inj, idx) => (
                  <div
                    key={`${inj.injectedAt}-${idx}`}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Operator Challenge (after Round {inj.afterRound}):
                    </span>{" "}
                    {inj.content}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Textarea
                value={userInjectionText}
                onChange={(e) => setUserInjectionText(e.target.value)}
                placeholder="Inject an operator question or methodological challenge into the debate..."
                className="min-h-[60px] text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleInjectUserChallenge}
                disabled={!userInjectionText.trim()}
                className="shrink-0 self-end"
              >
                Inject Challenge
              </Button>
            </div>

            {debate.conclusion && (
              <div
                data-testid="debate-conclusion-card"
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2 text-xs"
              >
                <div className="font-semibold text-sm text-foreground">
                  Debate Conclusion &amp; Key Insight
                </div>
                <p className="text-foreground font-medium">{debate.conclusion.keyInsight}</p>
                <p className="text-muted-foreground">{debate.conclusion.summary}</p>
              </div>
            )}

            {nextDebatePromptPreview && (
              <details className="rounded-lg border border-border bg-muted/10 p-2.5 text-xs">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                  Preview Next Speaker Prompt ({debateStatus.currentSpeaker})
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                  {nextDebatePromptPreview}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Adversarial Critique Registry (§229) */}
        <Card data-testid="adversarial-critique-ledger" className="border-red-500/20">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  Adversarial Critique Ledger (§229)
                </CardTitle>
                <CardDescription>
                  Formal tribunal critiques evaluated for Theory Kill Justification (0–3) and Real
                  Third Alternative (0–3) rigor.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {critiques.length} Total Critiques
                </Badge>
                <Badge
                  variant={unaddressedHypothesisCritiqueCount > 0 ? "destructive" : "secondary"}
                  className="font-mono text-xs"
                  data-testid="unaddressed-critiques-badge"
                >
                  {unaddressedHypothesisCritiqueCount} Unaddressed Hypothesis Attack
                  {unaddressedHypothesisCritiqueCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {critiques.map((critique) => {
              const killEval = evaluateKillJustification(critique);
              const altEval = evaluateThirdAlternative(critique);
              const mustRespond = requiresResponse(critique);

              return (
                <div
                  key={critique.id}
                  data-testid={`critique-card-${critique.id}`}
                  className="rounded-xl border border-border bg-card p-4 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-primary">{critique.id}</span>
                      <Badge variant="outline" className="font-mono uppercase text-[10px]">
                        {critique.targetType}
                        {critique.targetId ? ` • ${critique.targetId}` : ""}
                      </Badge>
                      <Badge
                        variant={
                          critique.severity === "critical" || critique.severity === "serious"
                            ? "destructive"
                            : "secondary"
                        }
                        className="font-mono uppercase text-[10px]"
                      >
                        {critique.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        data-testid={`critique-status-${critique.id}`}
                        className="font-mono uppercase text-[10px]"
                      >
                        {critique.status}
                      </Badge>
                      {mustRespond && (
                        <Badge variant="destructive" className="text-[10px]">
                          Response Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground font-mono">
                      <span>Kill Score: {killEval.score}/3</span>
                      <span>•</span>
                      <span>3rd Alt Score: {altEval.score}/3</span>
                    </div>
                  </div>

                  <p className="text-sm text-foreground font-medium">{critique.attack}</p>

                  <div className="text-muted-foreground space-y-1">
                    <div>
                      <strong className="text-foreground/80">Falsifying Evidence:</strong>{" "}
                      {critique.evidenceToConfirm}
                    </div>
                    {critique.proposedAlternative && (
                      <div>
                        <strong className="text-foreground/80">Proposed 3rd Alternative:</strong>{" "}
                        {critique.proposedAlternative.description}
                      </div>
                    )}
                    {critique.response && (
                      <div className="rounded border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-foreground">
                        <strong>Response ({critique.response.actionTaken ?? "recorded"}):</strong>{" "}
                        {critique.response.text}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground">
                      Raised by <strong className="text-foreground">{critique.raisedBy}</strong>
                      {critique.anchors?.length ? ` (${critique.anchors.join(", ")})` : ""}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {critique.status === "active" ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            data-testid={`accept-critique-${critique.id}`}
                            onClick={() => handleAcceptCritique(critique.id)}
                          >
                            Accept &amp; Modify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            data-testid={`address-critique-${critique.id}`}
                            onClick={() => handleAddressCritique(critique.id)}
                          >
                            Address with New Test
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            data-testid={`dismiss-critique-${critique.id}`}
                            onClick={() => handleDismissCritique(critique.id)}
                          >
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          data-testid={`reopen-critique-${critique.id}`}
                          onClick={() => handleReopenCritique(critique.id)}
                        >
                          Reopen Critique
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
