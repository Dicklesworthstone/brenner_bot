"use client";

/**
 * Multi-Agent Cockpit Step 9: Iterate or Publish
 *
 * Based on scores, decide whether to iterate for another round or publish the artifact.
 *
 * @see brenner_bot-nm89 (Tutorial Path: Multi-Agent Cockpit)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCodeBlock, TutorialStep, Warning } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TroubleshootingItem, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const troubleshooting: TroubleshootingItem[] = [
  {
    problem: "Not sure whether to iterate or publish",
    solution:
      "If any dimension scored below 3, iterate. If all are 3+, consider publishing unless you have specific concerns.",
  },
  {
    problem: "Iteration keeps producing similar results",
    solution:
      "Try changing the framing in your intervention. Add new constraints or ask agents to consider entirely different mechanisms.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-9",
  pathId: "multi-agent-cockpit",
  stepNumber: 9,
  title: "Iterate or Publish",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "The iterate vs publish decision framework",
    "How to structure an iteration round",
    "Publishing artifacts to your research program",
  ],
  whatYouDo: [
    "Review your session scores",
    "Decide: iterate or publish",
    "Execute the chosen path",
  ],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep9() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(8);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/8");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/10");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            You&apos;ve scored your session. Now comes the decision: is this artifact ready to
            publish, or does it need another iteration round?
          </p>
        </div>

        {/* Decision Framework */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The Decision Framework</h2>
          <p className="text-sm text-muted-foreground">Use your scores to guide the decision:</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-5 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)] space-y-3">
              <h3 className="font-semibold text-[oklch(0.72_0.19_145)] flex items-center gap-2">
                <span className="text-lg">✓</span>
                Publish When...
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Average score ≥ 4.0</li>
                <li>• No dimension below 3.0</li>
                <li>• Hypotheses are mechanistic</li>
                <li>• Tests can discriminate</li>
                <li>• You can execute on the plan</li>
              </ul>
            </div>
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <h3 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <span className="text-lg">↻</span>
                Iterate When...
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Any dimension ≤ 2.0</li>
                <li>• Missing third alternative</li>
                <li>• Tests don&apos;t discriminate</li>
                <li>• Key assumptions untested</li>
                <li>• Framing wasn&apos;t challenged</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Path A: Iterate */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-bold">
              A
            </span>
            Path A: Iterate Another Round
          </h2>
          <p className="text-sm text-muted-foreground">
            Send a targeted intervention based on the lowest-scoring dimension:
          </p>

          <TutorialCodeBlock
            code={`# Example: Low score on "Third Alternative"
brenner send \\
  --thread-id "$SESSION_ID" \\
  --from Orchestrator \\
  --to BlueLake,PurpleMountain,GreenValley \\
  --subject "ROUND 2: Third Alternative Focus" \\
  --body "
The current H1 and H2 both assume X drives Y.

CHALLENGE: What if neither is correct?
- What mechanism would explain the data without X?
- Are we missing an obvious alternative?
- What would Brenner call our 'blind spot' here?

Please submit revised DELTAs focusing on this gap.
"

# Monitor the new round
brenner session status --thread-id "$SESSION_ID" --watch`}
            language="bash"
            title="Terminal"
          />

          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Iteration tip:</strong> Target your intervention
              to the specific weakness. A broad &quot;try again&quot; produces worse results than a
              focused &quot;challenge assumption X.&quot;
            </p>
          </div>
        </div>

        {/* Path B: Publish */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-[oklch(0.72_0.19_145/0.1)] text-[oklch(0.72_0.19_145)] text-sm font-bold">
              B
            </span>
            Path B: Publish the Artifact
          </h2>
          <p className="text-sm text-muted-foreground">
            When the artifact is ready, publish it to your research program:
          </p>

          <TutorialCodeBlock
            code={`# Validate the artifact one more time
brenner lint sessions/$SESSION_ID/artifact.json

# Publish to your research program
brenner publish \\
  --artifact sessions/$SESSION_ID/artifact.json \\
  --program "cell-fate-research" \\
  --tags "development,neural,2026"

# View the published artifact
brenner program show cell-fate-research --latest`}
            language="bash"
            title="Terminal"
          />

          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-sm font-medium mb-2">What publishing does:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Adds artifact to your research program archive</li>
              <li>• Creates a permanent record with session metadata</li>
              <li>• Enables cross-session search and reference</li>
              <li>• Tracks hypothesis evolution over time</li>
            </ul>
          </div>
        </div>

        {/* When to Stop Iterating */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Knowing When to Stop</h2>
          <p className="text-sm text-muted-foreground">
            Diminishing returns are real. Stop iterating when:
          </p>

          <div className="grid gap-3">
            <div className="p-3 rounded-lg border border-border bg-card/50 text-sm">
              <span className="font-medium">Score plateau:</span>
              <span className="text-muted-foreground ml-2">
                Scores aren&apos;t improving between rounds
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/50 text-sm">
              <span className="font-medium">Circular debate:</span>
              <span className="text-muted-foreground ml-2">
                Agents are repeating the same arguments
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/50 text-sm">
              <span className="font-medium">Good enough:</span>
              <span className="text-muted-foreground ml-2">
                The artifact is actionable even if imperfect
              </span>
            </div>
          </div>
        </div>

        <Warning>
          <strong>Don&apos;t over-iterate:</strong> A perfect artifact that takes 10 rounds is often
          worse than a &quot;good enough&quot; artifact that you can execute on now. Brenner&apos;s
          philosophy: the best experiment is the one you actually run.
        </Warning>

        <ProTip>
          Keep iteration history. When you finally publish, the evolution of hypotheses across
          rounds often reveals insights that the final artifact alone doesn&apos;t capture.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Decision Made?</strong>{" "}
            <span className="text-muted-foreground">
              Whether you iterated or published, you&apos;re ready for the final step: teardown and
              review.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
