"use client";

/**
 * Multi-Agent Cockpit Step 8: Score the Session
 *
 * Evaluate the session using the 7-dimension Brenner scorecard.
 *
 * @see brenner_bot-nm89 (Tutorial Path: Multi-Agent Cockpit)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCodeBlock, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TroubleshootingItem, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const troubleshooting: TroubleshootingItem[] = [
  {
    problem: "All scores are low",
    solution:
      "This might indicate a need for another iteration. Focus on the lowest-scoring dimension first.",
  },
  {
    problem: "Unsure how to rate a dimension",
    solution:
      "Use the rubric descriptors. If you're between two scores, err on the lower side — it's better to underestimate.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-8",
  pathId: "multi-agent-cockpit",
  stepNumber: 8,
  title: "Score the Session",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "The 7-dimension evaluation rubric",
    "How to identify session quality issues",
    "Using scores to guide iteration",
  ],
  whatYouDo: ["Apply the scoring rubric", "Identify weak dimensions", "Decide whether to iterate"],
  troubleshooting,
};

// ============================================================================
// Score Dimension Component
// ============================================================================

interface ScoreDimensionProps {
  number: number;
  name: string;
  question: string;
  low: string;
  high: string;
}

function ScoreDimension({ number, name, question, low, high }: ScoreDimensionProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center size-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold">
          {number}
        </span>
        <h3 className="font-semibold">{name}</h3>
      </div>
      <p className="text-sm text-muted-foreground italic">&quot;{question}&quot;</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded bg-destructive/5 border border-destructive/20">
          <span className="font-medium text-destructive">1-2:</span>
          <span className="text-muted-foreground ml-1">{low}</span>
        </div>
        <div className="p-2 rounded bg-[oklch(0.72_0.19_145/0.05)] border border-[oklch(0.72_0.19_145/0.2)]">
          <span className="font-medium text-[oklch(0.72_0.19_145)]">4-5:</span>
          <span className="text-muted-foreground ml-1">{high}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep8() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(7);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/7");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/9");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Every session should be scored to understand its quality and identify areas for
            improvement. The 7-dimension rubric covers the key aspects of discriminative research.
          </p>
        </div>

        {/* The 7 Dimensions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The 7-Dimension Scorecard</h2>
          <p className="text-sm text-muted-foreground">
            Score each dimension from 1 (poor) to 5 (excellent):
          </p>

          <div className="grid gap-4">
            <ScoreDimension
              number={1}
              name="Hypothesis Quality"
              question="Are hypotheses mechanistic and testable?"
              low="Vague descriptions, no mechanisms"
              high="Clear mechanisms, specific predictions"
            />
            <ScoreDimension
              number={2}
              name="Third Alternative"
              question="Is there a genuine third alternative?"
              low="Missing or token alternative"
              high="Genuinely challenges the framing"
            />
            <ScoreDimension
              number={3}
              name="Test Discriminativeness"
              question="Do tests separate hypotheses?"
              low="Tests only confirm favorites"
              high="Tests can cleanly eliminate hypotheses"
            />
            <ScoreDimension
              number={4}
              name="Potency Checks"
              question="Are potency checks present?"
              low="No controls for confounds"
              high="Every test has potency check"
            />
            <ScoreDimension
              number={5}
              name="Assumption Clarity"
              question="Are load-bearing assumptions explicit?"
              low="Hidden assumptions everywhere"
              high="All assumptions listed with tests"
            />
            <ScoreDimension
              number={6}
              name="Adversarial Rigor"
              question="Was the framing challenged?"
              low="Surface-level critiques only"
              high="Fundamental framing challenged"
            />
            <ScoreDimension
              number={7}
              name="Actionability"
              question="Can you execute on this artifact?"
              low="Unclear next steps"
              high="Clear experiment plan"
            />
          </div>
        </div>

        {/* Scoring Command */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Run the Scoring Tool
          </h2>
          <p className="text-sm text-muted-foreground">
            The brenner CLI has an interactive scoring mode:
          </p>

          <TutorialCodeBlock
            code={`# Run interactive scoring
brenner session score --thread-id "$SESSION_ID"

# Or score with artifact file
brenner score sessions/$SESSION_ID/artifact.json

# View score report
cat sessions/$SESSION_ID/score.json`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Interpreting Scores */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Interpreting Scores</h2>

          <div className="grid gap-3">
            <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
              <p className="font-medium text-[oklch(0.72_0.19_145)] mb-2">
                Average 4.0+: Excellent
              </p>
              <p className="text-xs text-muted-foreground">
                Ready to publish or execute. Consider archiving to your research program.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
              <p className="font-medium text-primary mb-2">Average 3.0-3.9: Good</p>
              <p className="text-xs text-muted-foreground">
                Solid foundation. One more iteration could address weak spots.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <p className="font-medium text-amber-600 dark:text-amber-400 mb-2">
                Average 2.0-2.9: Needs Work
              </p>
              <p className="text-xs text-muted-foreground">
                Significant gaps. Focus on lowest-scoring dimensions in next round.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <p className="font-medium text-destructive mb-2">Average &lt;2.0: Restart</p>
              <p className="text-xs text-muted-foreground">
                Fundamental issues. Consider reframing the research question or kickoff.
              </p>
            </div>
          </div>
        </div>

        <ProTip>
          Low scores aren&apos;t failures — they&apos;re diagnostic. A session that scores 2.5 on
          &quot;Third Alternative&quot; tells you exactly what to focus on next: ask the agents to
          challenge the framing more aggressively.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Scored?</strong>{" "}
            <span className="text-muted-foreground">
              Based on your scores, decide whether to iterate (another round) or publish the
              artifact in the next step.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
