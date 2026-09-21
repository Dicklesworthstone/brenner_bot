"use client";

/**
 * Agent-Assisted Step 8: Human Review
 *
 * Interactive checklist for reviewing the agent's artifact and catching common
 * Brenner failure modes: missing third alternatives, non-discriminative tests,
 * weak potency checks, and unexamined assumptions.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ProTip,
  TutorialCheckpoint,
  TutorialCodeBlock,
  TutorialStep,
  Warning,
} from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { CheckpointData, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const checkpoint: CheckpointData = {
  title: "Agent-Assisted Tutorial Complete!",
  accomplishments: [
    "Set up an AI coding agent to internalize the Brenner method",
    "Refined a research question using Brenner-style critique",
    "Generated a hypothesis slate + assumption ledger",
    "Produced discriminative tests ranked by potency",
    "Reviewed the artifact with a failure-mode checklist",
  ],
  nextPreview:
    "Next: run another loop on a new question, or move to Multi-Agent Cockpit for parallel role-separated orchestration.",
};

const stepData: TutorialStepType = {
  id: "aa-8",
  pathId: "agent-assisted",
  stepNumber: 8,
  title: "Human Review",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "The most common Brenner-loop failure modes",
    "How to surgically request a revision from the agent",
    "How to decide what to do next",
  ],
  whatYouDo: [
    "Run the checklist against the artifact",
    "Request revisions for any failed checks",
    "Archive the artifact and choose next tests",
  ],
  troubleshooting: [
    {
      problem: "Artifact feels impressive but un-actionable",
      solution:
        "Force a single next test: ask for the 'single triangulated kernel' (best hypothesis + best discriminative test + why).",
    },
    {
      problem: "Too many tests, no ranking",
      solution:
        "Require a potency-ranked list and ask for the top 1 test that would eliminate the most hypotheses.",
    },
  ],
};

// ============================================================================
// Review Checklist Data
// ============================================================================

type ChecklistItem = {
  id: string;
  label: string;
  fixHint: string;
};

const checklistGroups: Array<{ title: string; items: ChecklistItem[] }> = [
  {
    title: "Hypotheses",
    items: [
      {
        id: "hyp-4plus",
        label: "4+ distinct hypotheses (not variants of one idea)",
        fixHint:
          "Ask for 2 additional hypotheses that would require different tests to distinguish.",
      },
      {
        id: "hyp-mechanism",
        label: "Each hypothesis includes an explicit mechanism",
        fixHint:
          "For each hypothesis: 'state mechanism in 1–2 sentences; if unknown, mark as unknown and propose tests to identify it.'",
      },
      {
        id: "hyp-third-alt",
        label: "At least one genuine third alternative is treated as first-class",
        fixHint:
          "Explicitly demand a third alternative that is neither A nor B, with its own predictions and tests.",
      },
    ],
  },
  {
    title: "Discriminative Tests",
    items: [
      {
        id: "test-discriminate",
        label: "Each test makes different predictions across hypotheses",
        fixHint:
          "Rewrite tests as prediction tables: H1/H2/H3 predict different outcomes; remove tests that don't discriminate.",
      },
      {
        id: "test-exclusion-logic",
        label: "Each test states exclusion logic (what outcome rules out what)",
        fixHint:
          "Add an explicit 'If we observe X, we exclude H2 because…' for each hypothesis/test pair.",
      },
      {
        id: "test-potency",
        label: "Each test includes a potency check (🎭) for null/ambiguous outcomes",
        fixHint:
          "Ask the agent: 'If null, what do we learn? If ambiguous, redesign the test until it's informative.'",
      },
      {
        id: "test-ranking",
        label: "Tests are ranked by discriminative power + feasibility",
        fixHint:
          "Require a ranked list and pick the top 1 test that eliminates the most hypotheses with realistic effort.",
      },
    ],
  },
  {
    title: "Assumptions & Scale",
    items: [
      {
        id: "assumptions-complete",
        label: "Assumption ledger includes theoretical + methodological + background assumptions",
        fixHint: "Ask for three buckets and ensure at least 3–5 assumptions per hypothesis.",
      },
      {
        id: "scale-check",
        label: "Scale checks include numbers or order-of-magnitude estimates (⊙)",
        fixHint:
          "Demand explicit numbers: 'Give rough magnitudes; if unknown, bound ranges and state what would falsify them.'",
      },
    ],
  },
  {
    title: "Critique & Next Steps",
    items: [
      {
        id: "critique-framing",
        label: "Adversarial critique attacks the framing (not just details)",
        fixHint: "Ask for 1–2 alternative framings and why your current framing might be wrong.",
      },
      {
        id: "next-steps",
        label: "Next steps are specific and test-first (not vague reading)",
        fixHint:
          "Ask for the single most discriminative next test + the minimum evidence needed to run it.",
      },
    ],
  },
];

const allChecklistItems = checklistGroups.flatMap((g) => g.items);

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep8() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(7);
  }, [tutorial]);

  const totalCount = allChecklistItems.length;

  const [checked, setChecked] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(allChecklistItems.map((item) => [item.id, false])),
  );

  const completedCount = Object.values(checked).filter(Boolean).length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const revisionPrompt = `Your previous artifact is close, but it fails some Brenner review checks:

[LIST THE FAILED CHECKS HERE]

Please revise the artifact, keeping the same section headings and structure. For each fix:
- Make the change as minimally as possible
- Explicitly mark additions with "NEW:" so I can spot them
- Ensure tests are discriminative (different predictions across hypotheses)
- Ensure every test has a potency check (what we learn if null)

Return the updated artifact in full.`;

  const handleBack = () => {
    tutorial.goToPrevStep();
    router.push("/tutorial/agent-assisted/7");
  };

  const handleComplete = () => {
    tutorial.completeAndAdvance();
    router.push("/tutorial/agent-assisted");
  };

  return (
    <TutorialStep step={stepData} totalSteps={8} onBack={handleBack} onNext={handleComplete}>
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Your agent can produce a beautiful artifact that still fails Brenner&apos;s standards. Use
          this checklist to catch the most common failure modes.
        </p>

        <div className="p-5 rounded-xl border border-border bg-card/50 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Checklist Progress</h2>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} ({percent}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {checklistGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h2 className="text-xl font-semibold">{group.title}</h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 active:bg-muted/60 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked[item.id] ?? false}
                    onChange={() => handleToggle(item.id)}
                    className="mt-1 size-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-primary">If missing:</span> {item.fixHint}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}

        <Warning>
          If the artifact fails multiple checks, don&apos;t &quot;accept and move on&quot;. The
          whole point is to force the loop into a discriminative, excludable shape.
        </Warning>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Request a Revision (Copy/Paste)</h2>
          <p className="text-muted-foreground">
            When you find failures, paste this to your agent with the failed items listed:
          </p>
          <TutorialCodeBlock code={revisionPrompt} language="text" title="Revision prompt" />
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/50 space-y-2">
          <h2 className="text-xl font-semibold">Compare to Worked Examples</h2>
          <p className="text-muted-foreground">
            If you’re unsure what “good” looks like, compare your artifact to the canonical worked
            examples. Notice how hypotheses are genuinely different, predictions are contrastive,
            and tests are designed to exclude.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/tutorial/examples" className="text-primary hover:underline">
              Browse all examples →
            </Link>
            <Link
              href="/tutorial/examples/biology-cell-fate"
              className="text-primary hover:underline"
            >
              Biology
            </Link>
            <Link
              href="/tutorial/examples/cs-llm-hallucination"
              className="text-primary hover:underline"
            >
              Computer Science
            </Link>
            <Link
              href="/tutorial/examples/social-community-toxicity"
              className="text-primary hover:underline"
            >
              Social Science
            </Link>
          </div>
        </div>

        <ProTip>
          You can archive your final artifact as a Session in the web UI. Start a new session at{" "}
          <Link href="/sessions/new" className="underline underline-offset-4 hover:text-foreground">
            /sessions/new
          </Link>{" "}
          (or explore existing sessions at{" "}
          <Link href="/sessions" className="underline underline-offset-4 hover:text-foreground">
            /sessions
          </Link>
          ).
        </ProTip>

        <TutorialCheckpoint data={checkpoint} onContinue={handleComplete} />
      </section>
    </TutorialStep>
  );
}
