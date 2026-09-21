"use client";

/**
 * Quick Start Step 7: Understand the Output
 *
 * Walk through each artifact section and understand why it matters.
 *
 * @see brenner_bot-s797 (Tutorial Path: Quick Start)
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCheckpoint, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { CheckpointData, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const checkpoint: CheckpointData = {
  title: "Tutorial Complete!",
  accomplishments: [
    "Learned what BrennerBot is and the Two Axioms",
    "Set up your local environment",
    "Searched the Brenner corpus",
    "Built a personalized excerpt",
    "Ran your first AI-powered research session",
    "Produced a structured research artifact",
  ],
  nextPreview:
    "You're now ready to iterate on your research or try the Agent-Assisted path for more advanced workflows.",
};

const stepData: TutorialStepType = {
  id: "qs-7",
  pathId: "quick-start",
  stepNumber: 7,
  title: "Understand the Output",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "The anatomy of a Brenner research artifact",
    "How each section connects to Brenner's operators",
    "What to do next with your artifact",
  ],
  whatYouDo: [
    "Review each section of your artifact",
    "Understand why each section matters",
    "Plan your next steps",
  ],
  checkpoint,
  troubleshooting: [
    {
      problem: "Missing a third alternative",
      solution: "Add an explicit “both could be wrong” hypothesis and re-run the prompt.",
    },
    {
      problem: "Tests don’t discriminate",
      solution: "Rewrite tests so at least two hypotheses predict different outcomes.",
    },
  ],
};

// ============================================================================
// Artifact Sections Data
// ============================================================================

const artifactSections = [
  {
    name: "Hypothesis Slate",
    operator: "Level Split (Σ)",
    color: "primary",
    description:
      '2-5 competing explanations for your phenomenon, including at least one genuine "third alternative" that challenges both leading theories.',
    whyItMatters:
      "Brenner never tested a single hypothesis in isolation. Multiple competing explanations force you to think about what would differentiate them.",
    lookFor: [
      "At least 3 distinct hypotheses",
      "A genuine third alternative (not a strawman)",
      "Mechanism specified for each",
      "§n citations from your excerpt",
    ],
  },
  {
    name: "Discriminative Tests",
    operator: "Exclusion Test (⊘)",
    color: "accent",
    description:
      "Tests designed to eliminate hypotheses, not just confirm your favorite. Each test should give a different result depending on which hypothesis is true.",
    whyItMatters:
      '"The best experiment is one that can give a clean answer" — Brenner. Tests that only confirm don\'t advance knowledge as efficiently as tests that discriminate.',
    lookFor: [
      "Tests that produce different outcomes for different hypotheses",
      "Potency checks (what would a negative result mean?)",
      "Feasibility assessment",
      "Priority ranking",
    ],
  },
  {
    name: "Assumption Ledger",
    operator: "Scale Check (⊙)",
    color: "[oklch(0.7_0.15_30)]",
    description:
      "Explicit load-bearing beliefs that your hypotheses rest on. These are the hidden premises that could invalidate your conclusions if wrong.",
    whyItMatters:
      "Every hypothesis depends on assumptions about scale, boundary conditions, and mechanisms. Making them explicit reveals vulnerability points.",
    lookFor: [
      "Scale assumptions (at what level of analysis?)",
      "Boundary conditions (when does this apply?)",
      "Measurement assumptions (how do we observe?)",
      "Mechanism assumptions (what's the causal pathway?)",
    ],
  },
  {
    name: "Adversarial Critique",
    operator: "Object Transpose (⟳)",
    color: "[oklch(0.65_0.2_250)]",
    description:
      "Attacks on your own framing. A devil's advocate perspective that challenges whether you've even asked the right question.",
    whyItMatters:
      "The hardest part of research is realizing your entire frame might be wrong. This section forces confrontation with that possibility.",
    lookFor: [
      "Attacks on the question itself, not just the answers",
      "Alternative framings suggested",
      "Hidden biases exposed",
      '"Real third alternative" check',
    ],
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function QuickStartStep7() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("quick-start", 7);
    tutorial.goToStep(6);
  }, [tutorial]);

  const handleBack = () => {
    tutorial.goToPrevStep();
    router.push("/tutorial/quick-start/6");
  };

  const handleComplete = () => {
    tutorial.completeAndAdvance();
    router.push("/tutorial/quick-start");
  };

  return (
    <TutorialStep step={stepData} totalSteps={7} onBack={handleBack} onNext={handleComplete}>
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Let&apos;s walk through each section of your research artifact and understand why it
          matters for rigorous scientific thinking.
        </p>

        {/* Artifact Sections */}
        <div className="space-y-4">
          {artifactSections.map((section, index) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-5 rounded-xl border border-border bg-card space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span
                      className={`flex items-center justify-center size-7 rounded-lg bg-${section.color}/10 text-${section.color} text-sm font-bold`}
                    >
                      {index + 1}
                    </span>
                    {section.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Brenner Operator: <strong>{section.operator}</strong>
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-medium text-foreground mb-1">Why it matters:</p>
                <p className="text-xs text-muted-foreground">{section.whyItMatters}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">What to look for:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {section.lookFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* The Four Operators */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <h3 className="font-semibold text-foreground">The Four Brenner Operators</h3>
          <p className="text-sm text-muted-foreground">
            Each artifact section corresponds to one of Brenner&apos;s core operators:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-card border border-border">
              <span className="font-bold text-primary">Σ Level Split</span>
              <span className="text-muted-foreground">
                {" "}
                — Multiple hypotheses at different levels
              </span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border">
              <span className="font-bold text-accent">⊘ Exclusion Test</span>
              <span className="text-muted-foreground"> — Tests that eliminate alternatives</span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border">
              <span className="font-bold text-[oklch(0.7_0.15_30)]">⊙ Scale Check</span>
              <span className="text-muted-foreground"> — Assumptions and boundary conditions</span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border">
              <span className="font-bold text-[oklch(0.65_0.2_250)]">⟳ Object Transpose</span>
              <span className="text-muted-foreground"> — Different perspectives and framings</span>
            </div>
          </div>
        </div>

        {/* What to Do Next */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">What to Do Next</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-4 rounded-xl border border-border bg-card">
              <h4 className="font-medium mb-2">Refine Your Artifact</h4>
              <p className="text-sm text-muted-foreground">
                Use the Adversarial Critique section to identify weaknesses, then iterate on your
                hypotheses and tests.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <h4 className="font-medium mb-2">Run Discriminative Tests</h4>
              <p className="text-sm text-muted-foreground">
                Pick the highest-priority test and actually run it (or gather existing evidence that
                addresses it).
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <h4 className="font-medium mb-2">Try Agent-Assisted</h4>
              <p className="text-sm text-muted-foreground">
                For more sophisticated research, try the Agent-Assisted path with Claude Code or GPT
                Codex.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <h4 className="font-medium mb-2">Explore the Corpus</h4>
              <p className="text-sm text-muted-foreground">
                Dive deeper into Brenner&apos;s wisdom with the full corpus browser at
                brennerbot.org/corpus.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <h4 className="font-medium">See a Worked Example Artifact</h4>
            <p className="text-sm text-muted-foreground">
              Compare your output to a canonical example (biology) and notice how the hypotheses,
              predictions, tests, and critiques are phrased to be genuinely discriminative.
            </p>
            <Link
              href="/tutorial/examples/biology-cell-fate"
              className="text-sm text-primary hover:underline"
            >
              Open the biology example →
            </Link>
          </div>
        </div>

        <ProTip>
          The best artifacts get better with iteration. Don&apos;t treat your first artifact as
          final — use it as a starting point for deeper thinking.
        </ProTip>

        {/* Checkpoint */}
        <TutorialCheckpoint data={checkpoint} onContinue={handleComplete} />

        {/* Final CTA */}
        <div className="p-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 text-center space-y-4">
          <h3 className="text-xl font-semibold">Congratulations!</h3>
          <p className="text-muted-foreground">
            You&apos;ve completed the Quick Start tutorial and produced your first Brenner-style
            research artifact. You&apos;re thinking more rigorously already.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sessions/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            >
              Start a New Session
            </Link>
            <Link
              href="/tutorial/agent-assisted"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all"
            >
              Try Agent-Assisted
            </Link>
          </div>
        </div>
      </section>
    </TutorialStep>
  );
}
