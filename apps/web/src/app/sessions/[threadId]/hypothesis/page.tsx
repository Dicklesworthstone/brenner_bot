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
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ComparisonView } from "@/components/brenner-loop/ComparisonView";
import {
  FalsificationCeremony,
  type FalsificationCeremonyResult,
} from "@/components/brenner-loop/FalsificationCeremony";
import { HypothesisArena as HypothesisArenaView } from "@/components/brenner-loop/HypothesisArena";
import { HypothesisGraveyard } from "@/components/brenner-loop/HypothesisGraveyard";
import { HypothesisTemplateSelector } from "@/components/brenner-loop/HypothesisTemplateSelector";
import { BrennerQuoteSidebar } from "@/components/brenner-loop/operators/BrennerQuoteSidebar";
import { PredictionLock } from "@/components/brenner-loop/PredictionLock";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  addCompetitor,
  createArena,
  createHypothesisCard,
  createSession,
  evolveHypothesisCard,
  generateHypothesisCardId,
  type HypothesisArena as HypothesisArenaModel,
  type HypothesisCard,
  type LockedPrediction,
  lockPrediction,
  recordSessionResumeEntry,
  recordTestResult,
  sessionStorage,
} from "@/lib/brenner-loop";
import type { EvidenceEntry as FullEvidenceEntry } from "@/lib/brenner-loop/evidence";
import {
  detectConfounds,
  getConfoundQuestions,
  getSupportedDomains,
  type ResearchDomain,
} from "@/lib/brenner-loop/confound-detection";
import {
  createFalsifiedHypothesis,
  type FalsifiedHypothesis,
  generateGraveyardId,
} from "@/lib/brenner-loop/graveyard";
import {
  addRootHypothesis,
  createHistoryStore,
  diffHypotheses,
  EVOLUTION_TRIGGER_LABELS,
  evolveHypothesis,
  generateEvolutionGraph,
  getEvolutionStats,
} from "@/lib/brenner-loop/hypothesis-history";
import {
  HYPOTHESIS_TEMPLATES,
  type HypothesisTemplate,
} from "@/lib/brenner-loop/hypothesis-templates";
import {
  aggregateRobustness,
  computeRobustness,
  formatRobustnessScore,
  ROBUSTNESS_LABELS,
  type RobustnessEvidenceInput,
  summarizeRobustness,
} from "@/lib/brenner-loop/robustness";
import { type EmbeddingEntry, loadEmbeddings } from "@/lib/brenner-loop/search/embeddings";
import {
  cardToIndexed,
  findDuplicates,
  findSimilarHypotheses,
  getSimilarityStats,
  type IndexedHypothesis,
  type SimilarityMatch,
} from "@/lib/brenner-loop/search/hypothesis-similarity";
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

function sanitizeSessionId(rawId: string): string {
  const cleaned = rawId.replace(/[^A-Za-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "SESSION-DEFAULT";
}

function buildDefaultPrimaryCard(sessionId: string): HypothesisCard {
  const safeId = sanitizeSessionId(sessionId);
  return {
    id: generateHypothesisCardId(safeId, 1, 3),
    version: 3,
    statement:
      "Social media usage causes increased anxiety in teenagers through dopamine-driven feedback loops.",
    mechanism:
      "Intermittent variable reward schedules in social media notifications trigger dopamine spikes, leading to compulsive checking behavior and anxiety when separated from devices.",
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
    confounds: [],
    assumptions: [
      "Salivary cortisol reliably tracks adolescent acute anxiety states",
    ],
    confidence: 65,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-20T16:00:00Z"),
    sessionId: safeId,
  };
}

function buildDefaultCompetitorCard(sessionId: string): HypothesisCard {
  const safeId = sanitizeSessionId(sessionId);
  return {
    id: generateHypothesisCardId(safeId, 2, 1),
    version: 1,
    statement:
      "Pre-existing sleep displacement and baseline social anxiety drive both nocturnal phone checking and elevated teen cortisol (reverse causation + third alternative).",
    mechanism:
      "Adolescents with pre-existing circadian phase delay and social rumination use phones during insomnia windows; sleep loss directly elevates cortisol independent of notification reward schedules.",
    domain: ["Psychology", "Neuroscience", "Epidemiology"],
    predictionsIfTrue: [
      "Controlling for total sleep duration eliminates the correlation between screen time and cortisol",
      "Disabling notifications without changing bedtime does not reduce anxiety scores",
    ],
    predictionsIfFalse: [
      "Notification removal reduces anxiety even when sleep duration is held constant",
    ],
    impossibleIfTrue: [
      "Adolescents with normal 8.5-hour sleep still show a 20%+ cortisol spike purely from daytime notification frequency",
    ],
    confounds: [],
    assumptions: [
      "Actigraphy accurately separates nocturnal wakefulness from daytime usage",
    ],
    confidence: 55,
    createdAt: new Date("2024-01-16T12:00:00Z"),
    updatedAt: new Date("2024-01-19T14:00:00Z"),
    sessionId: safeId,
  };
}

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

function normalizeDatesOnCard(card: HypothesisCard): HypothesisCard {
  return {
    ...card,
    createdAt: card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt),
    updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt),
  };
}

function HypothesisPageContent({ threadId }: { threadId: string }) {
  const router = useRouter();
  const safeSessionId = React.useMemo(() => sanitizeSessionId(threadId), [threadId]);

  React.useEffect(() => {
    recordSessionResumeEntry(threadId, "hypothesis");
  }, [threadId]);

  const [hypothesis, setHypothesis] = React.useState<HypothesisCard>(() =>
    buildDefaultPrimaryCard(threadId),
  );
  const [competitorHypothesis, setCompetitorHypothesis] = React.useState<HypothesisCard>(() =>
    buildDefaultCompetitorCard(threadId),
  );

  // Editing state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editStatement, setEditStatement] = React.useState(hypothesis.statement);
  const [editMechanism, setEditMechanism] = React.useState(hypothesis.mechanism);
  const [editConfidence, setEditConfidence] = React.useState(hypothesis.confidence);
  const [editPredictionsIfTrue, setEditPredictionsIfTrue] = React.useState(
    hypothesis.predictionsIfTrue.join("\n"),
  );
  const [editPredictionsIfFalse, setEditPredictionsIfFalse] = React.useState(
    hypothesis.predictionsIfFalse.join("\n"),
  );
  const [editImpossibleIfTrue, setEditImpossibleIfTrue] = React.useState(
    hypothesis.impossibleIfTrue.join("\n"),
  );

  // Collapsible / view sections
  const [structureOpen, setStructureOpen] = React.useState(true);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [arenaOpen, setArenaOpen] = React.useState(true);
  const [graveyardOpen, setGraveyardOpen] = React.useState(false);
  const [similarityOpen, setSimilarityOpen] = React.useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = React.useState(false);
  const [showFalsificationCeremony, setShowFalsificationCeremony] = React.useState(false);
  const [showAddCompetitorForm, setShowAddCompetitorForm] = React.useState(false);
  const [newCompetitorStatement, setNewCompetitorStatement] = React.useState("");
  const [newCompetitorMechanism, setNewCompetitorMechanism] = React.useState("");

  // Cryptographic prediction locks
  const [lockedPredictions, setLockedPredictions] = React.useState<LockedPrediction[]>([]);

  // Hypothesis Graveyard entries
  const [graveyardEntries, setGraveyardEntries] = React.useState<FalsifiedHypothesis[]>([]);

  // Cross-session indexed hypotheses for similarity search
  const [crossSessionHypotheses, setCrossSessionHypotheses] = React.useState<IndexedHypothesis[]>(
    [],
  );

  // Evidence entries for robustness calculation
  const [sessionEvidence, setSessionEvidence] = React.useState<RobustnessEvidenceInput[]>([]);

  // Evolution timeline events
  const [evolutionEvents, setEvolutionEvents] = React.useState<EvolutionEvent[]>([
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
  ]);

  // Arena state
  const [arena, setArena] = React.useState<HypothesisArenaModel>(() => {
    const base = createArena({
      question:
        "What is the primary causal driver of elevated anxiety and cortisol in heavy adolescent social media users?",
      domain: "Psychology",
      sessionId: safeSessionId,
      primaryHypothesis: buildDefaultPrimaryCard(threadId),
    });
    return addCompetitor(base, buildDefaultCompetitorCard(threadId), "level_split");
  });

  // Load persisted session, prediction locks, and graveyard from storage
  React.useEffect(() => {
    let cancelled = false;

    const loadPersisted = async () => {
      try {
        const loaded = await sessionStorage.load(threadId);
        if (!cancelled && loaded) {
          const primaryId = loaded.primaryHypothesisId;
          const rawPrimary =
            (primaryId && loaded.hypothesisCards[primaryId]) ||
            Object.values(loaded.hypothesisCards)[0];

          if (rawPrimary) {
            const card = normalizeDatesOnCard(rawPrimary);
            setHypothesis(card);
            setEditStatement(card.statement);
            setEditMechanism(card.mechanism);
            setEditConfidence(card.confidence);
            setEditPredictionsIfTrue(card.predictionsIfTrue.join("\n"));
            setEditPredictionsIfFalse(card.predictionsIfFalse.join("\n"));
            setEditImpossibleIfTrue(card.impossibleIfTrue.join("\n"));

            const altId = loaded.alternativeHypothesisIds[0];
            const rawAlt = altId ? loaded.hypothesisCards[altId] : undefined;
            const compCard = rawAlt
              ? normalizeDatesOnCard(rawAlt)
              : buildDefaultCompetitorCard(threadId);
            setCompetitorHypothesis(compCard);

            let nextArena = createArena({
              question:
                loaded.researchQuestion ||
                "What causal mechanism explains the observed phenomenon?",
              domain: loaded.domain || card.domain[0] || "general",
              primaryHypothesis: card,
              sessionId: safeSessionId,
            });
            if (compCard.id !== card.id) {
              nextArena = addCompetitor(nextArena, compCard, "user_added");
            }
            setArena(nextArena);
          }

          if (Array.isArray(loaded.evidenceLedger)) {
            setSessionEvidence(loaded.evidenceLedger);
          }
        }

        const summaries = await sessionStorage.list();
        const otherSummaries = summaries.filter((s) => s.id !== threadId);
        const otherSessions = await Promise.all(
          otherSummaries.slice(0, 20).map((s) => sessionStorage.load(s.id)),
        );
        if (!cancelled) {
          const indexedOthers: IndexedHypothesis[] = [];
          for (const other of otherSessions) {
            if (!other?.hypothesisCards) continue;
            for (const c of Object.values(other.hypothesisCards)) {
              if (c) indexedOthers.push(cardToIndexed(c, other.id));
            }
          }
          setCrossSessionHypotheses(indexedOthers);
        }
      } catch {
        // Fallback to default state if storage read fails
      }

      if (typeof window !== "undefined") {
        try {
          const rawLocks = window.localStorage.getItem(`brenner-prediction-locks-${threadId}`);
          if (rawLocks) {
            const parsed = JSON.parse(rawLocks) as LockedPrediction[];
            if (Array.isArray(parsed)) setLockedPredictions(parsed);
          }
        } catch {
          // Ignore malformed lock storage
        }

        try {
          const rawGraveyard = window.localStorage.getItem(`brenner-graveyard-${threadId}`);
          if (rawGraveyard) {
            const parsed = JSON.parse(rawGraveyard) as FalsifiedHypothesis[];
            if (Array.isArray(parsed)) {
              setGraveyardEntries(
                parsed.map((entry) => ({
                  ...entry,
                  falsifiedAt: new Date(entry.falsifiedAt),
                  hypothesis: normalizeDatesOnCard(entry.hypothesis),
                })),
              );
            }
          }
        } catch {
          // Ignore malformed graveyard storage
        }
      }
    };

    void loadPersisted();
    return () => {
      cancelled = true;
    };
  }, [threadId, safeSessionId]);

  const similarityData = React.useMemo(() => {
    const queryIndexed = cardToIndexed(hypothesis, safeSessionId);
    const templateCandidates: IndexedHypothesis[] = HYPOTHESIS_TEMPLATES.map((tpl) => ({
      id: `TPL-${tpl.id}`,
      sessionId: "template-library",
      statement: tpl.template.statement,
      mechanism: tpl.template.mechanism,
      domain: tpl.domains,
      confidence: tpl.template.suggestedConfidence,
      version: 1,
    }));

    const graveyardCandidates = graveyardEntries.map((g) =>
      cardToIndexed(g.hypothesis, safeSessionId),
    );
    const competitorCandidate = cardToIndexed(competitorHypothesis, safeSessionId);

    const seenIds = new Set<string>([queryIndexed.id]);
    const candidates: IndexedHypothesis[] = [];
    for (const item of [
      competitorCandidate,
      ...graveyardCandidates,
      ...crossSessionHypotheses,
      ...templateCandidates,
    ]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        candidates.push(item);
      }
    }

    const matches: SimilarityMatch[] = findSimilarHypotheses(queryIndexed, candidates, {
      minScore: 0.25,
      maxResults: 5,
    });
    const duplicates = findDuplicates([queryIndexed, ...candidates], 0.8);
    const stats = getSimilarityStats([queryIndexed, ...candidates]);

    return { matches, duplicates, stats };
  }, [hypothesis, competitorHypothesis, graveyardEntries, crossSessionHypotheses, safeSessionId]);

  const robustnessOverview = React.useMemo(() => {
    const primary = computeRobustness(hypothesis, sessionEvidence);
    const competitor = computeRobustness(competitorHypothesis, sessionEvidence);
    const aggregate = aggregateRobustness([primary, competitor]);
    const labelInfo = ROBUSTNESS_LABELS[primary.interpretation];
    return {
      primary,
      competitor,
      aggregate,
      labelInfo,
      formattedScore: formatRobustnessScore(primary),
      summaryText: summarizeRobustness(primary),
    };
  }, [hypothesis, competitorHypothesis, sessionEvidence]);

  const [selectedConfoundDomain, setSelectedConfoundDomain] = React.useState<
    ResearchDomain | undefined
  >(undefined);

  const confoundDetection = React.useMemo(() => {
    const result = detectConfounds(hypothesis, {
      threshold: 0.2,
      maxConfounds: 4,
      forceDomain: selectedConfoundDomain,
    });
    const topTemplateId = result.confounds[0]?.id
      .replace(/^auto-/, "")
      .replace(/-\d+$/, "");
    const probingQuestions = topTemplateId
      ? getConfoundQuestions(topTemplateId, result.detectedDomain)
      : [];
    return {
      ...result,
      probingQuestions,
      supportedDomains: getSupportedDomains(),
    };
  }, [hypothesis, selectedConfoundDomain]);

  const evolutionGraphData = React.useMemo(() => {
    const initialStore = createHistoryStore();
    const baselineCard = createHypothesisCard({
      id: generateHypothesisCardId(safeSessionId, 1, 1),
      statement:
        hypothesis.version > 1
          ? `${hypothesis.statement.split("—")[0].trim()} (Initial baseline v1)`
          : hypothesis.statement,
      mechanism:
        hypothesis.version > 1
          ? "Initial unrefined mechanism prior to exclusion test"
          : hypothesis.mechanism,
      domain: hypothesis.domain,
      predictionsIfTrue: hypothesis.predictionsIfTrue.slice(0, 1),
      predictionsIfFalse: hypothesis.predictionsIfFalse.slice(0, 1),
      impossibleIfTrue: hypothesis.impossibleIfTrue.slice(0, 1),
      confidence: Math.max(25, hypothesis.confidence - 15),
      sessionId: safeSessionId,
    });

    const { version: rootVersion, store: storeWithRoot } = addRootHypothesis(
      initialStore,
      baselineCard,
      "Initial hypothesis formulation from research paradox",
      "operator",
    );

    const { version: refinedVersion, store: storeWithEvolved } = evolveHypothesis(
      storeWithRoot,
      rootVersion.id,
      {
        statement: hypothesis.statement,
        mechanism: hypothesis.mechanism,
        predictionsIfTrue: hypothesis.predictionsIfTrue,
        predictionsIfFalse: hypothesis.predictionsIfFalse,
        impossibleIfTrue: hypothesis.impossibleIfTrue,
        confidence: hypothesis.confidence,
      },
      "exclusion_test",
      "Refined mechanism and discriminative falsifiers via Exclusion Test (⊘)",
      "operator",
    );

    const diff = diffHypotheses(rootVersion.hypothesis, refinedVersion.hypothesis);
    const graph = generateEvolutionGraph(storeWithEvolved);
    const stats = getEvolutionStats(storeWithEvolved);

    return {
      diff,
      graph,
      stats,
      rootVersion,
      refinedVersion,
    };
  }, [hypothesis, safeSessionId]);

  const persistHypothesisToSession = React.useCallback(
    async (nextPrimary: HypothesisCard, nextCompetitor?: HypothesisCard) => {
      try {
        const existing =
          (await sessionStorage.load(threadId)) ??
          createSession({
            id: threadId,
            domain: nextPrimary.domain[0] ?? "Psychology",
            createdBy: "local-operator",
          });

        const comp = nextCompetitor ?? competitorHypothesis;
        existing.hypothesisCards[nextPrimary.id] = nextPrimary;
        existing.primaryHypothesisId = nextPrimary.id;
        if (comp && comp.id !== nextPrimary.id) {
          existing.hypothesisCards[comp.id] = comp;
          if (!existing.alternativeHypothesisIds.includes(comp.id)) {
            existing.alternativeHypothesisIds.push(comp.id);
          }
        }
        existing.updatedAt = new Date().toISOString();
        await sessionStorage.save(existing);
      } catch {
        // Best-effort persistence
      }
    },
    [threadId, competitorHypothesis],
  );

  const persistLockedPredictions = React.useCallback(
    (nextLocks: LockedPrediction[]) => {
      setLockedPredictions(nextLocks);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `brenner-prediction-locks-${threadId}`,
            JSON.stringify(nextLocks),
          );
        } catch {
          // Best-effort
        }
      }
    },
    [threadId],
  );

  const handleStartEditing = () => {
    setEditStatement(hypothesis.statement);
    setEditMechanism(hypothesis.mechanism);
    setEditConfidence(hypothesis.confidence);
    setEditPredictionsIfTrue(hypothesis.predictionsIfTrue.join("\n"));
    setEditPredictionsIfFalse(hypothesis.predictionsIfFalse.join("\n"));
    setEditImpossibleIfTrue(hypothesis.impossibleIfTrue.join("\n"));
    setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    const parseLines = (text: string, fallback: string[]) => {
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.length > 0 ? lines : fallback;
    };

    const updated: HypothesisCard = {
      ...hypothesis,
      statement: editStatement.trim() || hypothesis.statement,
      mechanism: editMechanism.trim() || hypothesis.mechanism,
      confidence: Math.min(100, Math.max(0, Number(editConfidence) || hypothesis.confidence)),
      predictionsIfTrue: parseLines(editPredictionsIfTrue, hypothesis.predictionsIfTrue),
      predictionsIfFalse: parseLines(editPredictionsIfFalse, hypothesis.predictionsIfFalse),
      impossibleIfTrue: parseLines(editImpossibleIfTrue, hypothesis.impossibleIfTrue),
      updatedAt: new Date(),
    };

    setHypothesis(updated);
    setIsEditing(false);
    setEvolutionEvents((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        type: "edited",
        description: "Updated hypothesis statement, mechanism, and discriminative predictions",
        timestamp: new Date(),
        confidence: updated.confidence,
      },
    ]);
    await persistHypothesisToSession(updated);
  };

  const handleEvolveHypothesis = async () => {
    const evolved = evolveHypothesisCard(
      hypothesis,
      {
        statement: editStatement.trim() || hypothesis.statement,
        mechanism: editMechanism.trim() || hypothesis.mechanism,
        confidence: hypothesis.confidence,
      },
      "Manual hypothesis evolution to sharpen mechanism and discriminative power",
      "manual",
    );

    setHypothesis(evolved);
    setIsEditing(false);
    setEvolutionEvents((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        type: "evolved",
        description: `Evolved to v${evolved.version}: sharpened causal mechanism`,
        timestamp: new Date(),
        confidence: evolved.confidence,
      },
    ]);
    await persistHypothesisToSession(evolved);
  };

  const handleLockAllPredictions = async () => {
    const nextLocks = [...lockedPredictions];

    const lockGroup = async (items: string[], type: "if_true" | "if_false" | "impossible_if_true") => {
      for (let idx = 0; idx < items.length; idx++) {
        const alreadyLocked = nextLocks.some(
          (p) => p.predictionType === type && p.originalIndex === idx,
        );
        if (!alreadyLocked) {
          const result = await lockPrediction(hypothesis.id, type, idx, items[idx]);
          if (result.success && result.lockedPrediction) {
            nextLocks.push(result.lockedPrediction);
          }
        }
      }
    };

    await lockGroup(hypothesis.predictionsIfTrue, "if_true");
    await lockGroup(hypothesis.predictionsIfFalse, "if_false");
    await lockGroup(hypothesis.impossibleIfTrue, "impossible_if_true");

    persistLockedPredictions(nextLocks);
    setEvolutionEvents((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        type: "locked",
        description: `Cryptographically sealed ${nextLocks.length} predictions`,
        timestamp: new Date(),
        confidence: hypothesis.confidence,
      },
    ]);
  };

  const handleApplyTemplate = async (template: HypothesisTemplate) => {
    const nextCard = createHypothesisCard({
      id: generateHypothesisCardId(safeSessionId, 1, hypothesis.version + 1),
      statement: template.template.statement,
      mechanism: template.template.mechanism,
      domain: [...template.domains],
      predictionsIfTrue: [...template.template.predictionsIfTrue],
      predictionsIfFalse: [...(template.template.predictionsIfFalse ?? [])],
      impossibleIfTrue: [...template.template.impossibleIfTrue],
      confidence: template.template.suggestedConfidence ?? 50,
      sessionId: safeSessionId,
    });
    setHypothesis(nextCard);
    setEditStatement(nextCard.statement);
    setEditMechanism(nextCard.mechanism);
    setShowTemplateSelector(false);
    await persistHypothesisToSession(nextCard);
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorStatement.trim() || !newCompetitorMechanism.trim()) return;
    const seq = arena.competitors.length + 1;
    const newComp = createHypothesisCard({
      id: generateHypothesisCardId(safeSessionId, seq, 1),
      statement: newCompetitorStatement.trim(),
      mechanism: newCompetitorMechanism.trim(),
      domain: hypothesis.domain,
      predictionsIfTrue: ["Distinct prediction under alternative mechanism"],
      impossibleIfTrue: ["Observation that falsifies this competing alternative"],
      confidence: 50,
      sessionId: safeSessionId,
    });
    setCompetitorHypothesis(newComp);
    setArena((prev) => addCompetitor(prev, newComp, "user_added"));
    setNewCompetitorStatement("");
    setNewCompetitorMechanism("");
    setShowAddCompetitorForm(false);
    await persistHypothesisToSession(hypothesis, newComp);
  };

  const killingBlowEvidence: FullEvidenceEntry = React.useMemo(
    () => ({
      id: `EV-${safeSessionId}-001`,
      sessionId: safeSessionId,
      hypothesisVersion: hypothesis.id,
      test: {
        id: "test-exclusion-001",
        description: "Decisive exclusion test against forbidden pattern",
        type: "mechanism_block",
        discriminativePower: 5,
      },
      predictionIfTrue:
        hypothesis.predictionsIfTrue[0] ?? "Expected primary mechanism effect",
      predictionIfFalse:
        hypothesis.predictionsIfFalse[0] ?? "No effect when mechanism blocked",
      result: "challenges",
      observation:
        hypothesis.impossibleIfTrue[0] ??
        "Observed forbidden pattern under controlled conditions",
      confidenceBefore: hypothesis.confidence,
      confidenceAfter: 5,
      interpretation:
        "Direct observation of the impossible-if-true condition falsifies the current causal model.",
      recordedAt: new Date(),
    }),
    [safeSessionId, hypothesis],
  );

  const handleCompleteFalsification = (result: FalsificationCeremonyResult) => {
    const gyId = generateGraveyardId(safeSessionId, graveyardEntries.length + 1);
    const entry = createFalsifiedHypothesis({
      id: gyId,
      hypothesis,
      sessionId: safeSessionId,
      killingBlow: killingBlowEvidence,
      deathType: result.deathType,
      deathSummary: result.deathSummary,
      learning: result.learning,
      epitaph: result.epitaph,
      brennerQuote: result.brennerQuote,
    });

    const nextEntries = [entry, ...graveyardEntries];
    setGraveyardEntries(nextEntries);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `brenner-graveyard-${threadId}`,
          JSON.stringify(nextEntries),
        );
      } catch {
        // Ignore
      }
    }
    setShowFalsificationCeremony(false);
    setGraveyardOpen(true);
  };

  const [quoteEntries, setQuoteEntries] = React.useState<EmbeddingEntry[] | null>(null);
  const [semanticQuotes, setSemanticQuotes] = React.useState<Quote[]>([]);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);

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
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-lg shadow-primary/10">
              <LightBulbIcon className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Hypothesis</h1>
                <Badge variant="secondary">v{hypothesis.version}</Badge>
                {lockedPredictions.length > 0 && (
                  <Badge variant="default" className="text-xs">
                    {lockedPredictions.length} Locked
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Manage and refine your research hypothesis</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSaveChanges()}>
                  <CheckIcon className="size-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateSelector((prev) => !prev)}
                >
                  {showTemplateSelector ? "Hide Templates" : "Templates"}
                </Button>
                <Button variant="outline" onClick={handleStartEditing}>
                  <PencilIcon className="size-4 mr-2" />
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => void handleEvolveHypothesis()}>
                  <ArrowPathIcon className="size-4 mr-2" />
                  Evolve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowFalsificationCeremony((prev) => !prev)}
                >
                  {showFalsificationCeremony ? "Close Ceremony" : "Falsify (†)"}
                </Button>
              </>
            )}
          </div>
        </motion.header>

        {showTemplateSelector && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Hypothesis Template Library</CardTitle>
            </CardHeader>
            <CardContent>
              <HypothesisTemplateSelector onSelect={(tpl) => void handleApplyTemplate(tpl)} />
            </CardContent>
          </Card>
        )}

        {showFalsificationCeremony && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">
                † Theory-Kill &amp; Falsification Ceremony
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FalsificationCeremony
                hypothesis={hypothesis}
                killingBlow={killingBlowEvidence}
                onComplete={handleCompleteFalsification}
                onCancel={() => setShowFalsificationCeremony(false)}
              />
            </CardContent>
          </Card>
        )}

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
                      aria-label="Hypothesis statement"
                      value={editStatement}
                      onChange={(e) => setEditStatement(e.target.value)}
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
                      aria-label="Proposed mechanism"
                      value={editMechanism}
                      onChange={(e) => setEditMechanism(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{hypothesis.mechanism}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Discriminative Structure & Prediction Lock */}
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
                      <span className="text-lg font-semibold">
                        Discriminative Structure &amp; Cryptographic Prediction Lock
                      </span>
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
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-medium text-foreground">
                              Predictions If True (one per line)
                            </label>
                            <Textarea
                              value={editPredictionsIfTrue}
                              onChange={(e) => setEditPredictionsIfTrue(e.target.value)}
                              className="mt-1 min-h-[72px]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-foreground">
                              Predictions If False (one per line)
                            </label>
                            <Textarea
                              value={editPredictionsIfFalse}
                              onChange={(e) => setEditPredictionsIfFalse(e.target.value)}
                              className="mt-1 min-h-[72px]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-foreground">
                              Would Falsify / Impossible If True (one per line)
                            </label>
                            <Textarea
                              value={editImpossibleIfTrue}
                              onChange={(e) => setEditImpossibleIfTrue(e.target.value)}
                              className="mt-1 min-h-[72px]"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
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
                                <PredictionItem
                                  key={i}
                                  prediction={pred}
                                  type="impossible"
                                  locked
                                />
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-border">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              Interactive Prediction Lock Ledger (Anti-Rationalization Seal)
                            </div>
                            <PredictionLock
                              hypothesisId={hypothesis.id}
                              draftPredictions={{
                                ifTrue: hypothesis.predictionsIfTrue,
                                ifFalse: hypothesis.predictionsIfFalse,
                                impossible: hypothesis.impossibleIfTrue,
                              }}
                              lockedPredictions={lockedPredictions}
                              onPredictionLocked={(pred) =>
                                persistLockedPredictions([...lockedPredictions, pred])
                              }
                              onPredictionRevealed={(pred) =>
                                persistLockedPredictions(
                                  lockedPredictions.map((p) => (p.id === pred.id ? pred : p)),
                                )
                              }
                              onPredictionAmended={(pred) =>
                                persistLockedPredictions(
                                  lockedPredictions.map((p) => (p.id === pred.id ? pred : p)),
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>

            {/* Competing Hypotheses Arena & Comparison Matrix */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              <Collapsible open={arenaOpen} onOpenChange={setArenaOpen}>
                <Card>
                  <CollapsibleTrigger
                    className="p-6 hover:bg-muted/50 transition-colors"
                    showChevron={false}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg font-semibold">
                        Competing Hypotheses Arena &amp; Comparison Matrix
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "size-5 text-muted-foreground transition-transform",
                          arenaOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                      <HypothesisArenaView
                        arena={arena}
                        onAddCompetitor={() => setShowAddCompetitorForm((prev) => !prev)}
                        onRecordResult={(testId, hypothesisId, result) => {
                          setArena((prev) =>
                            recordTestResult(prev, testId, hypothesisId, result, {
                              confidence: 0.8,
                              boldness: "specific",
                            }),
                          );
                        }}
                      />

                      {showAddCompetitorForm && (
                        <div className="rounded-xl border border-primary/30 bg-muted/20 p-4 space-y-3">
                          <div className="text-sm font-semibold text-foreground">
                            Add Competing Hypothesis (Third Alternative)
                          </div>
                          <Input
                            placeholder="Competing hypothesis statement..."
                            value={newCompetitorStatement}
                            onChange={(e) => setNewCompetitorStatement(e.target.value)}
                          />
                          <Input
                            placeholder="Competing causal mechanism..."
                            value={newCompetitorMechanism}
                            onChange={(e) => setNewCompetitorMechanism(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAddCompetitorForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => void handleAddCompetitor()}>
                              Add Competitor
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-border">
                        <ComparisonView
                          hypothesisA={hypothesis}
                          hypothesisB={competitorHypothesis}
                          arena={arena}
                        />
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
                    <CardContent className="pt-0 space-y-4">
                      <EvolutionTimeline events={evolutionEvents} />

                      {evolutionGraphData.diff && (
                        <div
                          data-testid="hypothesis-version-diff"
                          className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-foreground">
                              Lineage Version Diff ({evolutionGraphData.diff.fromId} →{" "}
                              {evolutionGraphData.diff.toId})
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[11px] font-mono">
                                {evolutionGraphData.stats.totalVersions} versions · depth{" "}
                                {evolutionGraphData.stats.maxDepth}
                              </Badge>
                              <Badge variant="secondary" className="text-[11px] font-mono">
                                Δconf{" "}
                                {evolutionGraphData.diff.summary.confidenceDelta >= 0 ? "+" : ""}
                                {evolutionGraphData.diff.summary.confidenceDelta}%
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {evolutionGraphData.diff.summary.fieldsChanged} fields changed
                            </span>
                            <span>•</span>
                            <span>
                              +{evolutionGraphData.diff.summary.predictionsAdded} predictions added
                            </span>
                            {evolutionGraphData.graph.edges[0] && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-primary">
                                  Trigger:{" "}
                                  {
                                    EVOLUTION_TRIGGER_LABELS[
                                      evolutionGraphData.graph.edges[0].trigger
                                    ]
                                  }
                                </span>
                              </>
                            )}
                          </div>

                          {evolutionGraphData.diff.changes.length > 0 && (
                            <div className="space-y-1.5">
                              {evolutionGraphData.diff.changes.slice(0, 3).map((change, idx) => (
                                <div
                                  key={`${change.field}-${idx}`}
                                  className="text-xs rounded-lg border border-border/60 bg-background/60 p-2 flex items-center justify-between gap-2"
                                >
                                  <span className="font-mono font-medium text-foreground">
                                    {change.field}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] uppercase">
                                    {change.changeType}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>

            {/* Hypothesis Graveyard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
            >
              <Collapsible open={graveyardOpen} onOpenChange={setGraveyardOpen}>
                <Card>
                  <CollapsibleTrigger
                    className="p-6 hover:bg-muted/50 transition-colors"
                    showChevron={false}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg font-semibold">
                        † Hypothesis Graveyard ({graveyardEntries.length})
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "size-5 text-muted-foreground transition-transform",
                          graveyardOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <HypothesisGraveyard entries={graveyardEntries} />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>

            {/* Related & Similar Hypotheses (Semantic Search) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.31 }}
            >
              <Collapsible open={similarityOpen} onOpenChange={setSimilarityOpen}>
                <Card>
                  <CollapsibleTrigger
                    className="p-6 hover:bg-muted/50 transition-colors"
                    showChevron={false}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg font-semibold flex items-center gap-2">
                        <SparklesIcon className="size-5 text-primary" />
                        Related &amp; Similar Hypotheses ({similarityData.matches.length})
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "size-5 text-muted-foreground transition-transform",
                          similarityOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {similarityData.stats.totalHypotheses} indexed
                        </Badge>
                        <Badge variant="outline">
                          {similarityData.stats.clusterCount} semantic clusters
                        </Badge>
                        {similarityData.duplicates.length > 0 && (
                          <Badge variant="destructive">
                            {similarityData.duplicates.length} potential duplicate
                            {similarityData.duplicates.length === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </div>

                      {similarityData.matches.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No closely matching hypotheses found above the similarity threshold.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {similarityData.matches.map((match) => (
                            <div
                              key={match.hypothesis.id}
                              className="rounded-xl border border-border bg-muted/20 p-4 space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {Math.round(match.score * 100)}% match
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {match.reason} •{" "}
                                    {match.hypothesis.sessionId === "template-library"
                                      ? "Template Library"
                                      : `Session ${match.hypothesis.sessionId.slice(0, 12)}`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {match.hypothesis.domain.map((dom) => (
                                    <Badge key={dom} variant="outline" className="text-[11px]">
                                      {dom}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {match.hypothesis.statement}
                              </p>
                              {match.hypothesis.mechanism && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">Mechanism:</span>{" "}
                                  {match.hypothesis.mechanism}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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

            {/* Robustness & Structural Rigor Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
            >
              <Card data-testid="hypothesis-robustness-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">Robustness &amp; Rigor</CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      {robustnessOverview.formattedScore}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="text-muted-foreground">{robustnessOverview.primary.explanation}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                      <div className="text-muted-foreground">Falsifiability</div>
                      <div className="font-semibold text-sm text-foreground">
                        {robustnessOverview.primary.components.falsifiabilityScore}/100
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                      <div className="text-muted-foreground">Specificity</div>
                      <div className="font-semibold text-sm text-foreground">
                        {robustnessOverview.primary.components.specificityScore}/100
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60 text-muted-foreground">
                    <span>{robustnessOverview.summaryText}</span>
                    <span className="font-mono">
                      Arena avg: {robustnessOverview.aggregate.averageScore}/100
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Domain Confound Detection Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.24 }}
            >
              <Card data-testid="hypothesis-confounds-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">Domain Confound Detector</CardTitle>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {confoundDetection.detectedDomain} (
                      {Math.round(confoundDetection.domainConfidence * 100)}%)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="text-muted-foreground">{confoundDetection.summary}</p>

                  <div className="flex flex-wrap gap-1">
                    {confoundDetection.supportedDomains.slice(0, 5).map((dom) => (
                      <button
                        key={dom}
                        type="button"
                        onClick={() =>
                          setSelectedConfoundDomain((prev) => (prev === dom ? undefined : dom))
                        }
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-mono border transition-colors",
                          (selectedConfoundDomain ?? confoundDetection.detectedDomain) === dom
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/20 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {dom}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {confoundDetection.confounds.map((cf) => (
                      <div
                        key={cf.id}
                        className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{cf.name}</span>
                          <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                            {Math.round(cf.likelihood * 100)}% risk
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{cf.description}</p>
                      </div>
                    ))}
                  </div>

                  {confoundDetection.probingQuestions.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1">
                      <div className="font-medium text-foreground">
                        Diagnostic Probing Question:
                      </div>
                      <p className="italic text-muted-foreground">
                        “{confoundDetection.probingQuestions[0]}”
                      </p>
                    </div>
                  )}
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
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => void handleLockAllPredictions()}
                  >
                    <LockClosedIcon className="size-4 mr-2" />
                    Lock All Predictions
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => void handleEvolveHypothesis()}
                  >
                    <ArrowPathIcon className="size-4 mr-2" />
                    Create Evolution
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push(`/sessions/${threadId}/agents`)}
                  >
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
