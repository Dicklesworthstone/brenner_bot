"use client";

/**
 * Hypothesis Detail Page
 *
 * Full-featured hypothesis management page with editing, prediction locking,
 * evolution history, and discriminative structure visualization.
 *
 * @see brenner_bot-pts6 (routes bead)
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { BrennerQuoteSidebar } from "@/components/brenner-loop/operators/BrennerQuoteSidebar";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { recordSessionResumeEntry } from "@/lib/brenner-loop";
import { type EmbeddingEntry, loadEmbeddings } from "@/lib/brenner-loop/search/embeddings";
import {
  buildQuoteQueryText,
  filterQuoteEntriesByTags,
  findSimilarQuotes,
} from "@/lib/brenner-loop/search/quote-matcher";
import { isDemoThreadId, normalizeThreadId } from "@/lib/demo-mode";
import type { Quote } from "@/lib/quotebank-parser";
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

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const LightBulbIcon = ({ className }: { className?: string }) => (
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
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
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
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
    />
  </svg>
);

const LockClosedIcon = ({ className }: { className?: string }) => (
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
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
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

const ArrowPathIcon = ({ className }: { className?: string }) => (
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
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
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

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

// ============================================================================
// Brenner Quote Search Helpers
// ============================================================================

const HYPOTHESIS_PHASE_QUOTE_TAGS = [
  "mechanism",
  "prediction",
  "falsification",
  "measurement",
  "bias-to-experiment",
  "anti-planning",
  "confounds",
  "bridging-levels",
] as const;

// ============================================================================
// Confidence Bar
// ============================================================================

interface ConfidenceBarProps {
  value: number;
  className?: string;
}

function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const getColorClass = (confidence: number) => {
    if (confidence < 20) return "bg-red-500";
    if (confidence < 40) return "bg-orange-500";
    if (confidence < 60) return "bg-yellow-500";
    if (confidence < 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const getLabel = (confidence: number) => {
    if (confidence < 20) return "Very Low";
    if (confidence < 40) return "Low";
    if (confidence < 60) return "Moderate";
    if (confidence < 80) return "High";
    return "Very High";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-semibold">
          {value}% - {getLabel(value)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", getColorClass(value))}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Prediction Item
// ============================================================================

interface PredictionItemProps {
  prediction: string;
  type: "if_true" | "if_false" | "impossible";
  locked?: boolean;
  onLock?: () => void;
}

function PredictionItem({ prediction, type, locked, onLock }: PredictionItemProps) {
  const typeConfig = {
    if_true: { icon: CheckIcon, color: "text-green-500", bg: "bg-green-500/10", label: "If True" },
    if_false: { icon: XMarkIcon, color: "text-red-500", bg: "bg-red-500/10", label: "If False" },
    impossible: {
      icon: XMarkIcon,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      label: "Falsifier",
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border transition-all",
        locked
          ? "bg-muted/50 border-border"
          : "bg-background border-border hover:border-primary/30",
      )}
    >
      <div className={cn("flex items-center justify-center size-8 rounded-lg shrink-0", config.bg)}>
        <Icon className={cn("size-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">{config.label}</div>
        <p className="text-sm text-foreground">{prediction}</p>
      </div>
      {locked ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <LockClosedIcon className="size-3" />
                <span>Locked</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>This prediction is sealed and cannot be modified</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : onLock ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={onLock}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <LockClosedIcon className="size-3 mr-1" />
          Lock
        </Button>
      ) : null}
    </motion.div>
  );
}

// ============================================================================
// Evolution Timeline
// ============================================================================

interface EvolutionEvent {
  id: string;
  type: "created" | "edited" | "evolved" | "locked" | "evidence";
  description: string;
  timestamp: Date;
  confidence?: number;
}

function EvolutionTimeline({ events }: { events: EvolutionEvent[] }) {
  const getEventConfig = (type: EvolutionEvent["type"]) => {
    switch (type) {
      case "created":
        return { icon: SparklesIcon, color: "text-primary", bg: "bg-primary/10" };
      case "edited":
        return { icon: PencilIcon, color: "text-blue-500", bg: "bg-blue-500/10" };
      case "evolved":
        return { icon: ArrowPathIcon, color: "text-purple-500", bg: "bg-purple-500/10" };
      case "locked":
        return { icon: LockClosedIcon, color: "text-amber-500", bg: "bg-amber-500/10" };
      case "evidence":
        return { icon: CheckIcon, color: "text-green-500", bg: "bg-green-500/10" };
    }
  };

  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {events.map((event, index) => {
        const config = getEventConfig(event.type);
        const Icon = config.icon;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-start gap-4 pl-10"
          >
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute left-0 flex items-center justify-center size-8 rounded-full border-2 border-background",
                config.bg,
              )}
            >
              <Icon className={cn("size-4", config.color)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">{event.description}</p>
                {event.confidence !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {event.confidence}% confidence
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ClockIcon className="size-3" />
                {event.timestamp.toLocaleDateString()} at {event.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function HypothesisPage() {
  const params = useParams();
  const threadId = normalizeThreadId(params.threadId);

  if (isDemoThreadId(threadId)) {
    return (
      <DemoFeaturePreview
        threadId={threadId}
        featureName="Hypothesis Ledger"
        featureDescription="View and manage working hypotheses, track confidence changes, and document mechanisms with structured evidence."
      />
    );
  }

  return <HypothesisPageContent threadId={threadId} />;
}

function HypothesisPageContent({ threadId }: { threadId: string }) {
  React.useEffect(() => {
    recordSessionResumeEntry(threadId, "hypothesis");
  }, [threadId]);

  const [isEditing, setIsEditing] = React.useState(false);
  const [structureOpen, setStructureOpen] = React.useState(true);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const [quoteEntries, setQuoteEntries] = React.useState<EmbeddingEntry[] | null>(null);
  const [semanticQuotes, setSemanticQuotes] = React.useState<Quote[]>([]);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);

  // Mock data - in real implementation, this would come from the session context
  const hypothesis = {
    id: "hyp-001",
    statement:
      "Social media usage causes increased anxiety in teenagers through dopamine-driven feedback loops.",
    mechanism:
      "Intermittent variable reward schedules in social media notifications trigger dopamine spikes, leading to compulsive checking behavior and anxiety when separated from devices.",
    confidence: 65,
    domain: ["Psychology", "Neuroscience", "Technology"],
    predictionsIfTrue: [
      "Teenagers who use social media 4+ hours daily will show elevated cortisol levels",
      "Removing social media for 2 weeks will reduce anxiety scores by 20%+",
    ],
    predictionsIfFalse: [
      "No correlation between social media time and anxiety biomarkers",
      "Anxiety levels unchanged after social media removal",
    ],
    impossibleIfTrue: [
      "Heavy social media users show lower anxiety than non-users",
      "Dopamine activity unaffected by notification sounds",
    ],
    version: 3,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  };

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const index = await loadEmbeddings();
        if (cancelled) return;
        setQuoteEntries(index.entries.filter((entry) => entry.source === "quote"));
      } catch (e) {
        if (cancelled) return;
        setQuoteError(e instanceof Error ? e.message : "Failed to load embeddings.");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const quoteQuery = React.useMemo(() => {
    return buildQuoteQueryText([
      "Hypothesis",
      hypothesis.statement,
      hypothesis.mechanism,
      hypothesis.domain.join(", "),
      hypothesis.predictionsIfTrue.join("\n"),
      hypothesis.predictionsIfFalse.join("\n"),
      hypothesis.impossibleIfTrue.join("\n"),
      ...HYPOTHESIS_PHASE_QUOTE_TAGS,
    ]);
  }, [
    hypothesis.domain,
    hypothesis.impossibleIfTrue,
    hypothesis.mechanism,
    hypothesis.predictionsIfFalse,
    hypothesis.predictionsIfTrue,
    hypothesis.statement,
  ]);

  React.useEffect(() => {
    if (!quoteEntries || quoteEntries.length === 0) return;
    if (!quoteQuery) return;

    setQuoteError(null);

    const candidates = filterQuoteEntriesByTags(quoteEntries, [...HYPOTHESIS_PHASE_QUOTE_TAGS]);

    const timer = setTimeout(() => {
      try {
        setSemanticQuotes(findSimilarQuotes(quoteQuery, candidates, 3));
      } catch (e) {
        setQuoteError(e instanceof Error ? e.message : "Failed to compute quote matches.");
        setSemanticQuotes([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [quoteEntries, quoteQuery]);

  const evolutionEvents: EvolutionEvent[] = [
    {
      id: "ev-1",
      type: "created",
      description: "Hypothesis created",
      timestamp: new Date("2024-01-15T10:00:00"),
      confidence: 50,
    },
    {
      id: "ev-2",
      type: "edited",
      description: "Added mechanism detail",
      timestamp: new Date("2024-01-16T14:30:00"),
      confidence: 55,
    },
    {
      id: "ev-3",
      type: "locked",
      description: "Predictions locked for testing",
      timestamp: new Date("2024-01-18T09:00:00"),
      confidence: 55,
    },
    {
      id: "ev-4",
      type: "evidence",
      description: "Cortisol study results added",
      timestamp: new Date("2024-01-20T16:00:00"),
      confidence: 65,
    },
  ];

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto space-y-8">
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
          <span className="text-foreground">Hypothesis</span>
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
              <LightBulbIcon className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Hypothesis</h1>
                <Badge variant="secondary">v{hypothesis.version}</Badge>
              </div>
              <p className="text-muted-foreground">Manage and refine your research hypothesis</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsEditing(false)}>
                  <CheckIcon className="size-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <PencilIcon className="size-4 mr-2" />
                  Edit
                </Button>
                <Button variant="secondary">
                  <ArrowPathIcon className="size-4 mr-2" />
                  Evolve
                </Button>
              </>
            )}
          </div>
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statement Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="text-lg">Statement</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {isEditing ? (
                    <Textarea
                      defaultValue={hypothesis.statement}
                      className="min-h-[100px] resize-none"
                    />
                  ) : (
                    <p className="text-foreground leading-relaxed">{hypothesis.statement}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Mechanism Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500" />
                    Proposed Mechanism
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      defaultValue={hypothesis.mechanism}
                      className="min-h-[80px] resize-none"
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{hypothesis.mechanism}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Discriminative Structure */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Collapsible open={structureOpen} onOpenChange={setStructureOpen}>
                <Card>
                  <CollapsibleTrigger
                    className="p-6 hover:bg-muted/50 transition-colors"
                    showChevron={false}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg font-semibold">Discriminative Structure</span>
                      <ChevronDownIcon
                        className={cn(
                          "size-5 text-muted-foreground transition-transform",
                          structureOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                      {/* Predictions If True */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <CheckIcon className="size-4 text-green-500" />
                          Predictions If True
                        </h4>
                        <div className="space-y-2">
                          {hypothesis.predictionsIfTrue.map((pred, i) => (
                            <PredictionItem key={i} prediction={pred} type="if_true" locked />
                          ))}
                        </div>
                      </div>

                      {/* Predictions If False */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <XMarkIcon className="size-4 text-red-500" />
                          Predictions If False
                        </h4>
                        <div className="space-y-2">
                          {hypothesis.predictionsIfFalse.map((pred, i) => (
                            <PredictionItem key={i} prediction={pred} type="if_false" locked />
                          ))}
                        </div>
                      </div>

                      {/* Falsifiers */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <XMarkIcon className="size-4 text-purple-500" />
                          Would Falsify (Impossible If True)
                        </h4>
                        <div className="space-y-2">
                          {hypothesis.impossibleIfTrue.map((pred, i) => (
                            <PredictionItem key={i} prediction={pred} type="impossible" locked />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>

            {/* Evolution History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <Card>
                  <CollapsibleTrigger
                    className="p-6 hover:bg-muted/50 transition-colors"
                    showChevron={false}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg font-semibold flex items-center gap-2">
                        <ClockIcon className="size-5 text-muted-foreground" />
                        Evolution History
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "size-5 text-muted-foreground transition-transform",
                          historyOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <EvolutionTimeline events={evolutionEvents} />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Brenner quote sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {/* Desktop */}
              <div className="hidden lg:block">
                {quoteError && (
                  <div className="mb-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {quoteError}
                  </div>
                )}
                <BrennerQuoteSidebar quotes={semanticQuotes} currentStepId="hypothesis" />
              </div>

              {/* Mobile/tablet */}
              <div className="lg:hidden">
                {quoteError && (
                  <div className="mb-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {quoteError}
                  </div>
                )}
                <BrennerQuoteSidebar
                  quotes={semanticQuotes}
                  currentStepId="hypothesis"
                  defaultCollapsed
                />
              </div>
            </motion.div>

            {/* Confidence Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Confidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConfidenceBar value={hypothesis.confidence} />
                  <p className="text-xs text-muted-foreground mt-3">
                    Based on {evolutionEvents.filter((e) => e.type === "evidence").length} evidence
                    entries
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Domains Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Research Domains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {hypothesis.domain.map((d) => (
                      <Badge key={d} variant="secondary">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <LockClosedIcon className="size-4 mr-2" />
                    Lock All Predictions
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ArrowPathIcon className="size-4 mr-2" />
                    Create Evolution
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <SparklesIcon className="size-4 mr-2" />
                    Request Agent Review
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Metadata Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{hypothesis.createdAt.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{hypothesis.updatedAt.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <Badge variant="secondary" className="text-xs">
                      v{hypothesis.version}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
