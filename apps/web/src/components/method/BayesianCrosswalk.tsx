"use client";

/**
 * BayesianCrosswalk - Interactive visualization of Brenner moves to Bayesian operations
 *
 * Shows the implicit Bayesianism in Brenner's methodology with:
 * - Interactive table with hover explanations
 * - Objective function display
 * - Links to transcript quotes where applicable
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Jargon } from "@/components/jargon";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface BayesianMapping {
  id: string;
  brennerMove: string;
  bayesianOperation: string;
  explanation: string;
  transcriptAnchors?: string[];
  category: "hypothesis" | "experiment" | "update" | "meta";
}

// ============================================================================
// Data
// ============================================================================

const mappings: BayesianMapping[] = [
  {
    id: "enumerate",
    brennerMove: "Enumerate 3+ models before experimenting",
    bayesianOperation: "Maintain explicit prior distribution",
    explanation:
      "Before any experiment, Brenner would list at least three competing explanations. This forces you to make your prior beliefs explicit and prevents anchoring on a single hypothesis.",
    transcriptAnchors: ["§42", "§52"],
    category: "hypothesis",
  },
  {
    id: "paradox",
    brennerMove: "Hunt paradoxes",
    bayesianOperation: "Find high-probability contradictions in posterior",
    explanation:
      "Paradoxes are gold because they reveal where your model is wrong. Brenner actively sought out observations that seemed impossible under current theories.",
    transcriptAnchors: ["§33", "§80"],
    category: "hypothesis",
  },
  {
    id: "third-alt",
    brennerMove: '"Third alternative: both wrong"',
    bayesianOperation: "Reserve probability mass for misspecification",
    explanation:
      "When two competing theories both have problems, the answer often isn't picking one—it's recognizing they're both wrong and looking for a third option that reframes the question.",
    transcriptAnchors: ["§58"],
    category: "hypothesis",
  },
  {
    id: "forbidden",
    brennerMove: "Design forbidden patterns",
    bayesianOperation: "Maximize expected information gain (KL divergence)",
    explanation:
      "The best experiments are those where different hypotheses predict mutually exclusive outcomes. Forbidden patterns are outcomes that one theory says cannot happen.",
    transcriptAnchors: ["§73", "§85"],
    category: "experiment",
  },
  {
    id: "seven-cycle",
    brennerMove: "Seven-cycle log paper",
    bayesianOperation: "Choose experiments with extreme likelihood ratios",
    explanation:
      "An experiment spanning seven orders of magnitude provides maximally discriminative data. Brenner favored experiments where small differences in mechanism produced large, measurable differences in outcome.",
    transcriptAnchors: ["§50"],
    category: "experiment",
  },
  {
    id: "organism",
    brennerMove: "Choose organism for decisive test",
    bayesianOperation: "Modify data-generating process to separate likelihoods",
    explanation:
      "Choosing C. elegans wasn't arbitrary—it was selecting a biological system where the questions Brenner cared about could be answered definitively. The organism is an experimental parameter.",
    transcriptAnchors: ["§42", "§100"],
    category: "experiment",
  },
  {
    id: "house-cards",
    brennerMove: '"House of cards" theories',
    bayesianOperation: "Interlocking constraints (posterior ~ product of likelihoods)",
    explanation:
      "A theory that explains many independent observations is much stronger than one that explains just one. Each new consistent observation multiplies confidence, while a single contradiction collapses everything.",
    transcriptAnchors: ["§81"],
    category: "update",
  },
  {
    id: "exception",
    brennerMove: "Exception quarantine",
    bayesianOperation: "Model anomalies as typed mixture components",
    explanation:
      "Anomalies shouldn't be ignored or explained away. Brenner advocated quarantining exceptions—keeping them separate but tracked until they either integrate into the theory or reveal its limits.",
    transcriptAnchors: ["§87"],
    category: "update",
  },
  {
    id: "dont-worry",
    brennerMove: '"Don\'t Worry" hypothesis',
    bayesianOperation: "Marginalize over latent mechanisms (explicitly labeled)",
    explanation:
      "Sometimes you need to proceed without understanding every detail. 'Don't Worry' is a labeled placeholder that lets you make progress while acknowledging incompleteness.",
    transcriptAnchors: ["§102"],
    category: "meta",
  },
  {
    id: "kill-early",
    brennerMove: "Kill theories early",
    bayesianOperation: "Update aggressively; avoid sunk-cost fallacy",
    explanation:
      "The longer you hold a theory, the harder it is to abandon. Brenner advocated killing theories as soon as they're wounded—don't nurse them back to health.",
    transcriptAnchors: ["§33", "§85"],
    category: "update",
  },
  {
    id: "scale",
    brennerMove: "Scale/physics constraints",
    bayesianOperation: "Use strong physical priors to prune before experimenting",
    explanation:
      "Some hypotheses can be eliminated purely by physical reasoning. If something violates basic physics or scale constraints, don't waste experiments on it.",
    transcriptAnchors: ["§50", "§79"],
    category: "meta",
  },
  {
    id: "ignorance",
    brennerMove: "Productive ignorance",
    bayesianOperation: "Avoid over-tight priors that collapse hypothesis space",
    explanation:
      "Knowing too much can blind you to possibilities. Brenner valued 'productive ignorance'—being informed enough to ask good questions but not so committed that you can't see alternatives.",
    transcriptAnchors: ["§105"],
    category: "meta",
  },
];

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  hypothesis: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  experiment: { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30" },
  update: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  meta: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
};

const categoryLabels: Record<string, string> = {
  hypothesis: "Hypothesis Formation",
  experiment: "Experiment Design",
  update: "Belief Update",
  meta: "Meta-Strategy",
};

// ============================================================================
// Sub-components
// ============================================================================

function ObjectiveFunction() {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-muted/30 via-background to-muted/10 p-6">
      <h3 className="text-lg font-semibold mb-4 text-center">The Brenner Objective Function</h3>
      <div className="flex justify-center">
        <div className="inline-block font-mono text-sm sm:text-base">
          <div className="text-center mb-2 text-muted-foreground">
            <span className="text-primary font-medium">Expected Information Gain</span>
            <span className="mx-2">×</span>
            <span className="text-primary font-medium">Downstream Leverage</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <span className="text-lg">Score(E) =</span>
            <div className="border-t border-muted-foreground w-full" />
          </div>
          <div className="text-center mt-2 text-muted-foreground">
            <span className="text-destructive/80 font-medium">Time</span>
            <span className="mx-1">×</span>
            <span className="text-destructive/80 font-medium">Cost</span>
            <span className="mx-1">×</span>
            <span className="text-destructive/80 font-medium">Ambiguity</span>
            <span className="mx-1">×</span>
            <span className="text-destructive/80 font-medium">Infrastructure</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center mt-4 max-w-xl mx-auto">
        Brenner&apos;s genius was making the denominator small (DIY methods, clever design, digital
        handles) while keeping the numerator large (exclusion tests, paradox resolution). He did
        this by
        <em className="text-foreground"> changing the problem</em> rather than brute-forcing the
        experiment.
      </p>
    </div>
  );
}

function MappingRow({
  mapping,
  isExpanded,
  onToggle,
}: {
  mapping: BayesianMapping;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colors = categoryColors[mapping.category];

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full text-left p-4 transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isExpanded && "bg-muted/20",
        )}
        aria-expanded={isExpanded}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 items-start">
          {/* Brenner Move */}
          <div className="flex items-start gap-2">
            <span
              className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5",
                colors.bg,
                colors.text,
              )}
            >
              {mapping.category.slice(0, 3)}
            </span>
            <span className="font-medium text-foreground">{mapping.brennerMove}</span>
          </div>

          {/* Bayesian Operation */}
          <div className="flex items-center gap-2 md:pl-0 pl-7">
            <span className="text-primary">→</span>
            <span className="text-muted-foreground">{mapping.bayesianOperation}</span>
            <motion.span
              className="ml-auto text-muted-foreground/50"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronIcon />
            </motion.span>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 pl-11 md:pl-4">
              <div className={cn("rounded-lg p-4", colors.bg, colors.border, "border")}>
                <p className="text-sm text-foreground/90 leading-relaxed">{mapping.explanation}</p>
                {mapping.transcriptAnchors && mapping.transcriptAnchors.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Transcript:</span>
                    <div className="flex gap-1.5">
                      {mapping.transcriptAnchors.map((anchor) => (
                        <a
                          key={anchor}
                          href={`/corpus/transcript#${anchor.replace("§", "section-")}`}
                          className="inline-flex px-2 py-0.5 rounded-md bg-background text-xs font-mono text-primary hover:bg-primary/10 transition-colors"
                        >
                          {anchor}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CategoryLegend() {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {Object.entries(categoryLabels).map(([key, label]) => {
        const colors = categoryColors[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                colors.bg,
                colors.text,
              )}
            >
              {key.slice(0, 3)}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BayesianCrosswalk({ className }: { className?: string }) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleRow = React.useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
          <BayesIcon />
          Implicit Bayesianism
        </div>
        <h2 className="text-2xl font-bold tracking-tight">The Bayesian Crosswalk</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">
          Brenner never used formal probability, but his reasoning maps precisely onto{" "}
          <Jargon term="bayesian-update">Bayesian concepts</Jargon>. Click any row to explore.
        </p>
      </div>

      {/* Category Legend */}
      <CategoryLegend />

      {/* Mapping Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden md:grid md:grid-cols-2 gap-4 p-4 bg-muted/30 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Brenner Move</div>
          <div className="text-sm font-semibold text-foreground">Bayesian Operation</div>
        </div>
        <div>
          {mappings.map((mapping) => (
            <MappingRow
              key={mapping.id}
              mapping={mapping}
              isExpanded={expandedId === mapping.id}
              onToggle={() => toggleRow(mapping.id)}
            />
          ))}
        </div>
      </div>

      {/* Objective Function */}
      <ObjectiveFunction />
    </div>
  );
}

// Icon component
function BayesIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
      />
    </svg>
  );
}
