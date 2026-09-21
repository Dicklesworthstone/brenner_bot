"use client";

/**
 * Operators Workspace Page
 *
 * Interactive workspace for applying Brenner methodology operators
 * to refine hypotheses: Level Split (⊘), Exclusion Test (✂),
 * Object Transpose (⟂), Scale Check (⊞).
 *
 * @see brenner_bot-pts6 (routes bead)
 */

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { BrennerQuoteSidebar } from "@/components/brenner-loop/operators/BrennerQuoteSidebar";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const LightBulbIcon = ({ className }: { className?: string }) => (
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
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const BeakerIcon = ({ className }: { className?: string }) => (
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
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5"
    />
  </svg>
);

// ============================================================================
// Brenner Quote Search Helpers
// ============================================================================

const OPERATOR_QUOTE_TAG: Record<string, string> = {
  level_split: "level-split",
  exclusion_test: "exclusion-test",
  object_transpose: "object-transpose",
  scale_check: "scale-check",
};

// ============================================================================
// Operator Configuration
// ============================================================================

interface OperatorConfig {
  id: string;
  symbol: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  question: string;
  quote: {
    text: string;
    anchor: string;
  };
  inputFields: Array<{
    id: string;
    label: string;
    placeholder: string;
    type: "textarea" | "input";
  }>;
}

const OPERATORS: OperatorConfig[] = [
  {
    id: "level_split",
    symbol: "⊘",
    name: "Level Split",
    shortName: "Levels",
    description:
      "Identify different levels of explanation that might be conflated in your hypothesis.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    question: "Are there different levels of explanation being conflated?",
    quote: {
      text: "The confusion of levels is the most profound error in biology.",
      anchor: "\u00A7147",
    },
    inputFields: [
      {
        id: "current_level",
        label: "Current Level of Explanation",
        placeholder: "What level is your hypothesis currently operating at?",
        type: "textarea",
      },
      {
        id: "levels_identified",
        label: "Other Possible Levels",
        placeholder:
          "What other levels might be relevant? (molecular, cellular, organismal, ecological...)",
        type: "textarea",
      },
      {
        id: "confounds",
        label: "Potential Confounds",
        placeholder: "What confounds arise from level confusion?",
        type: "textarea",
      },
    ],
  },
  {
    id: "exclusion_test",
    symbol: "✂",
    name: "Exclusion Test",
    shortName: "Exclude",
    description: "Design tests that could definitively rule out your hypothesis.",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    question: "What would definitively rule out this hypothesis?",
    quote: {
      text: "Not merely unlikely\u2014impossible if the alternative is true.",
      anchor: "\u00A789",
    },
    inputFields: [
      {
        id: "test_design",
        label: "Exclusion Test Design",
        placeholder: "Describe a test that would definitively exclude your hypothesis",
        type: "textarea",
      },
      {
        id: "expected_null",
        label: "Expected Result (If Hypothesis False)",
        placeholder: "What specific result would falsify your hypothesis?",
        type: "textarea",
      },
      {
        id: "feasibility",
        label: "Feasibility Assessment",
        placeholder: "How feasible is this test? What resources are needed?",
        type: "textarea",
      },
    ],
  },
  {
    id: "object_transpose",
    symbol: "⟂",
    name: "Object Transpose",
    shortName: "Transpose",
    description:
      "Consider alternative experimental systems or reference frames where the problem is cleaner.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    question: "Is there a different system where this problem would be cleaner?",
    quote: {
      text: "Change the object. Use a different experimental system where the problem is cleaner.",
      anchor: "\u00A7112",
    },
    inputFields: [
      {
        id: "current_system",
        label: "Current Experimental System",
        placeholder: "What system/context are you currently using?",
        type: "textarea",
      },
      {
        id: "alternative_systems",
        label: "Alternative Systems",
        placeholder: "What alternative systems might offer cleaner tests?",
        type: "textarea",
      },
      {
        id: "tradeoffs",
        label: "Trade-offs",
        placeholder: "What are the trade-offs of switching systems?",
        type: "textarea",
      },
    ],
  },
  {
    id: "scale_check",
    symbol: "⊞",
    name: "Scale Check",
    shortName: "Scale",
    description: "Verify physical and mathematical plausibility before investing in experiments.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    question: "Do the numbers work out? Is this physically plausible?",
    quote: {
      text: "Before you start, do your sums.",
      anchor: "\u00A758",
    },
    inputFields: [
      {
        id: "key_quantities",
        label: "Key Quantities",
        placeholder: "What are the key quantities involved? (concentrations, rates, distances...)",
        type: "textarea",
      },
      {
        id: "calculations",
        label: "Order of Magnitude Calculations",
        placeholder: "Show your back-of-envelope calculations",
        type: "textarea",
      },
      {
        id: "plausibility",
        label: "Plausibility Assessment",
        placeholder: "Based on your calculations, is the hypothesis plausible?",
        type: "textarea",
      },
    ],
  },
];

// ============================================================================
// Operator Card Component
// ============================================================================

interface OperatorCardProps {
  operator: OperatorConfig;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

function OperatorCard({ operator, isActive, isCompleted, onClick }: OperatorCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all w-full",
        "hover:shadow-lg hover:-translate-y-0.5",
        isActive
          ? `${operator.borderColor} ${operator.bgColor} shadow-lg`
          : isCompleted
            ? "border-green-500/30 bg-green-500/5"
            : "border-border bg-card hover:border-primary/30",
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Completion indicator */}
      {isCompleted && (
        <div className="absolute top-2 right-2 size-6 rounded-full bg-green-500 flex items-center justify-center">
          <CheckIcon className="size-4 text-white" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center size-12 rounded-xl text-2xl font-bold font-mono",
            operator.bgColor,
            operator.color,
          )}
        >
          {operator.symbol}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{operator.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{operator.question}</p>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================================
// Operator Workspace Component
// ============================================================================

interface OperatorWorkspaceProps {
  operator: OperatorConfig;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  onComplete: () => void;
}

function OperatorWorkspace({ operator, values, onChange, onComplete }: OperatorWorkspaceProps) {
  const allFieldsFilled = operator.inputFields.every((field) => values[field.id]?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex items-center justify-center size-16 rounded-2xl text-3xl font-bold font-mono shadow-lg",
            operator.bgColor,
            operator.color,
          )}
        >
          {operator.symbol}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{operator.name}</h2>
          <p className="text-muted-foreground mt-1">{operator.description}</p>
        </div>
      </div>

      {/* Brenner Quote */}
      <Card className={cn("border-l-4", operator.borderColor)}>
        <CardContent className="py-4">
          <blockquote className="text-sm italic text-muted-foreground">
            &ldquo;{operator.quote.text}&rdquo;
          </blockquote>
          <footer className="text-xs text-muted-foreground/70 mt-2">
            — Sydney Brenner, {operator.quote.anchor}
          </footer>
        </CardContent>
      </Card>

      {/* Core Question */}
      <div className={cn("p-4 rounded-xl", operator.bgColor)}>
        <div className="flex items-center gap-2 mb-2">
          <LightBulbIcon className={cn("size-5", operator.color)} />
          <span className="text-sm font-medium text-foreground">Core Question</span>
        </div>
        <p className={cn("text-lg font-medium", operator.color)}>{operator.question}</p>
      </div>

      {/* Input Fields */}
      <div className="space-y-4">
        {operator.inputFields.map((field, index) => (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <label className="block text-sm font-medium text-foreground mb-2">{field.label}</label>
            {field.type === "textarea" ? (
              <Textarea
                value={values[field.id] || ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="min-h-[100px] resize-none"
              />
            ) : (
              <Input
                value={values[field.id] || ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder={field.placeholder}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Complete Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onComplete} disabled={!allFieldsFilled} className="min-w-[140px]">
          <CheckIcon className="size-4 mr-2" />
          Mark Complete
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function OperatorsPage() {
  const params = useParams();
  const threadId = normalizeThreadId(params.threadId);

  if (isDemoThreadId(threadId)) {
    return (
      <DemoFeaturePreview
        threadId={threadId}
        featureName="Operators Workspace"
        featureDescription="Configure Brenner operators to refine hypotheses, generate discriminative tests, and capture structured reasoning steps."
      />
    );
  }

  return <OperatorsPageContent threadId={threadId} />;
}

function OperatorsPageContent({ threadId }: { threadId: string }) {
  React.useEffect(() => {
    recordSessionResumeEntry(threadId, "operators");
  }, [threadId]);

  const [activeOperator, setActiveOperator] = React.useState<string>("level_split");
  const [completedOperators, setCompletedOperators] = React.useState<Set<string>>(new Set());
  const [operatorValues, setOperatorValues] = React.useState<
    Record<string, Record<string, string>>
  >({});
  const [hypothesisStatement, setHypothesisStatement] = React.useState<string>("");
  const [hypothesisMechanism, setHypothesisMechanism] = React.useState<string>("");

  const [quoteEntries, setQuoteEntries] = React.useState<EmbeddingEntry[] | null>(null);
  const [semanticQuotes, setSemanticQuotes] = React.useState<Quote[]>([]);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);

  const currentOperator = OPERATORS.find((op) => op.id === activeOperator);

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
    const opValues = Object.values(operatorValues[activeOperator] || {}).join("\n");

    return buildQuoteQueryText([
      currentOperator?.name,
      OPERATOR_QUOTE_TAG[activeOperator],
      hypothesisStatement,
      hypothesisMechanism,
      opValues,
    ]);
  }, [activeOperator, currentOperator, hypothesisMechanism, hypothesisStatement, operatorValues]);

  React.useEffect(() => {
    if (!quoteEntries || quoteEntries.length === 0) return;
    if (!quoteQuery) return;

    setQuoteError(null);

    const operatorTag = OPERATOR_QUOTE_TAG[activeOperator];
    const candidates = filterQuoteEntriesByTags(quoteEntries, operatorTag ? [operatorTag] : []);

    const timer = setTimeout(() => {
      try {
        setSemanticQuotes(findSimilarQuotes(quoteQuery, candidates, 3));
      } catch (e) {
        setQuoteError(e instanceof Error ? e.message : "Failed to compute quote matches.");
        setSemanticQuotes([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [activeOperator, quoteEntries, quoteQuery]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setOperatorValues((prev) => ({
      ...prev,
      [activeOperator]: {
        ...prev[activeOperator],
        [fieldId]: value,
      },
    }));
  };

  const handleComplete = () => {
    setCompletedOperators((prev) => new Set([...prev, activeOperator]));

    // Move to next incomplete operator
    const currentIndex = OPERATORS.findIndex((op) => op.id === activeOperator);
    const nextOperator = OPERATORS.find(
      (op, i) => i > currentIndex && !completedOperators.has(op.id),
    );
    if (nextOperator) {
      setActiveOperator(nextOperator.id);
    }
  };

  const progress = (completedOperators.size / OPERATORS.length) * 100;

  return (
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
        <span className="text-foreground">Operators</span>
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
            <BeakerIcon className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operators</h1>
            <p className="text-muted-foreground">
              Apply Brenner methodology operators to refine your hypothesis
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Progress</div>
          <div className="text-lg font-bold text-foreground">
            {completedOperators.size}/{OPERATORS.length} Complete
          </div>
        </div>
      </motion.header>

      {/* Hypothesis context (improves quote relevance) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hypothesis Context</CardTitle>
          <CardDescription>
            Used to surface relevant Brenner quotes while you apply operators (local, not sent
            anywhere).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Hypothesis statement
            </label>
            <Textarea
              value={hypothesisStatement}
              onChange={(e) => setHypothesisStatement(e.target.value)}
              placeholder="e.g., X causes Y via mechanism M"
              className="min-h-[90px]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Mechanism (optional)
            </label>
            <Textarea
              value={hypothesisMechanism}
              onChange={(e) => setHypothesisMechanism(e.target.value)}
              placeholder="What causal pathway would produce Y?"
              className="min-h-[90px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        className="h-2 bg-muted rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Operator Selection */}
        <div className="space-y-3 xl:col-span-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Select Operator</h3>
          {OPERATORS.map((operator, index) => (
            <motion.div
              key={operator.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <OperatorCard
                operator={operator}
                isActive={operator.id === activeOperator}
                isCompleted={completedOperators.has(operator.id)}
                onClick={() => setActiveOperator(operator.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Workspace */}
        <Card className="xl:col-span-6">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {currentOperator && (
                <OperatorWorkspace
                  key={currentOperator.id}
                  operator={currentOperator}
                  values={operatorValues[currentOperator.id] || {}}
                  onChange={handleFieldChange}
                  onComplete={handleComplete}
                />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Brenner quote sidebar (desktop) */}
        <aside className="hidden xl:block xl:col-span-3">
          <div className="sticky top-4 space-y-2">
            {quoteError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {quoteError}
              </div>
            )}
            <BrennerQuoteSidebar quotes={semanticQuotes} currentStepId={activeOperator} />
          </div>
        </aside>
      </div>

      {/* Brenner quote accordion (mobile/tablet) */}
      <div className="xl:hidden">
        {quoteError && (
          <div className="mb-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {quoteError}
          </div>
        )}
        <BrennerQuoteSidebar
          quotes={semanticQuotes}
          currentStepId={activeOperator}
          defaultCollapsed
        />
      </div>

      {/* Summary Section */}
      {completedOperators.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckIcon className="size-5 text-green-500" />
                Completed Operators
              </CardTitle>
              <CardDescription>Summary of your operator applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from(completedOperators).map((opId) => {
                  const op = OPERATORS.find((o) => o.id === opId);
                  if (!op) return null;

                  return (
                    <div
                      key={opId}
                      className={cn("p-4 rounded-xl border", op.bgColor, op.borderColor)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xl font-mono font-bold", op.color)}>
                          {op.symbol}
                        </span>
                        <div>
                          <h4 className="font-medium text-foreground">{op.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {Object.keys(operatorValues[opId] || {}).length} fields completed
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
