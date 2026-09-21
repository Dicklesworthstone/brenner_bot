"use client";

/**
 * Multi-Agent Cockpit Step 7: Compile Deltas into Artifact
 *
 * Use the brenner CLI to merge agent contributions into a unified research artifact.
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
    problem: "Compile fails with missing deltas",
    symptoms: ["Not all roles have responded"],
    solution:
      "Check session status. If an agent hasn't responded, either wait or proceed with partial compilation.",
    commands: ['brenner session status --thread-id "$SESSION_ID"'],
  },
  {
    problem: "Lint errors in compiled artifact",
    solution:
      "Review the specific lint errors. Common issues: missing third alternative, tests without potency checks.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-7",
  pathId: "multi-agent-cockpit",
  stepNumber: 7,
  title: "Compile Deltas into Artifact",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "The delta merge algorithm",
    "Artifact structure and versioning",
    "Using the linter to catch issues",
  ],
  whatYouDo: [
    "Extract deltas from agent messages",
    "Compile into unified artifact",
    "Run the linter",
  ],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep7() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(6);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/6");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/8");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Each agent has posted their contributions as DELTA messages. Now you&apos;ll compile
            these into a unified research artifact — the tangible output of your session.
          </p>
        </div>

        {/* Step 1: Wait for Completion */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Verify All Agents Responded
          </h2>
          <p className="text-sm text-muted-foreground">
            Before compiling, confirm all three roles have submitted their contributions:
          </p>

          <TutorialCodeBlock
            code={`# Check session status
brenner session status --thread-id "$SESSION_ID"

# Expected output:
# Session: RS-2026-0105-cell-fate
# Status: ready_to_compile
# Roles:
#   hypothesis_generator: ✓ (2 deltas)
#   test_designer: ✓ (3 deltas)
#   adversarial_critic: ✓ (2 deltas)`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Step 2: Compile */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              2
            </span>
            Compile the Artifact
          </h2>
          <p className="text-sm text-muted-foreground">
            The compile command extracts all deltas and merges them into a structured artifact:
          </p>

          <TutorialCodeBlock
            code={`# Compile the artifact
brenner session compile \\
  --thread-id "$SESSION_ID" \\
  --output sessions/$SESSION_ID/artifact.json

# View the compiled artifact
cat sessions/$SESSION_ID/artifact.json | jq .`}
            language="bash"
            title="Terminal"
          />

          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-sm font-medium mb-2">Artifact Structure:</p>
            <TutorialCodeBlock
              code={`{
  "meta": {
    "session_id": "RS-2026-0105-cell-fate",
    "compiled_at": "2026-01-05T12:00:00Z",
    "contributors": ["BlueLake", "PurpleMountain", "GreenValley"]
  },
  "research_thread": { ... },
  "hypothesis_slate": [ ... ],
  "discriminative_tests": [ ... ],
  "assumption_ledger": [ ... ],
  "adversarial_critique": [ ... ],
  "predictions_table": [ ... ]
}`}
              language="json"
              title="artifact.json"
            />
          </div>
        </div>

        {/* Step 3: Lint */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              3
            </span>
            Lint the Artifact
          </h2>
          <p className="text-sm text-muted-foreground">
            The linter checks for common issues in research artifacts:
          </p>

          <TutorialCodeBlock
            code={`# Run the linter
brenner lint sessions/$SESSION_ID/artifact.json

# Example output:
# ✓ Research thread present
# ✓ At least 2 hypotheses defined
# ⚠ Warning: No third alternative marked
# ✗ Error: Test "Isolation A/B" missing potency check
# ⚠ Warning: Assumption "Scale check" has no test defined`}
            language="bash"
            title="Terminal"
          />

          <div className="grid gap-3">
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-xs font-medium text-destructive">Errors (must fix)</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• Missing mechanism on hypothesis</li>
                <li>• Test without potency check</li>
                <li>• Circular assumption dependencies</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Warnings (should fix)
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• No third alternative marked</li>
                <li>• Assumption without scale check</li>
                <li>• Untested predictions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 4: Fix Issues */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              4
            </span>
            Fix Lint Issues
          </h2>
          <p className="text-sm text-muted-foreground">
            If the linter finds issues, you have two options:
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-4 rounded-xl border border-border bg-card/50 space-y-2">
              <p className="font-medium text-sm">Option A: Request Revision</p>
              <p className="text-xs text-muted-foreground">
                Send a message to the relevant agent asking for a fix.
              </p>
              <TutorialCodeBlock
                code={`brenner send \\
  --thread-id "$SESSION_ID" \\
  --from Orchestrator \\
  --to PurpleMountain \\
  --subject "REVISION: Add potency check" \\
  --body "Test 'Isolation A/B' needs a potency check."`}
                language="bash"
                title="Terminal"
              />
            </div>
            <div className="p-4 rounded-xl border border-border bg-card/50 space-y-2">
              <p className="font-medium text-sm">Option B: Manual Edit</p>
              <p className="text-xs text-muted-foreground">
                Edit the artifact directly for small fixes.
              </p>
              <TutorialCodeBlock
                code={`# Edit the artifact
vim sessions/$SESSION_ID/artifact.json

# Re-run lint to verify
brenner lint sessions/$SESSION_ID/artifact.json`}
                language="bash"
                title="Terminal"
              />
            </div>
          </div>
        </div>

        <Warning>
          <strong>Don&apos;t skip linting:</strong> Lint errors often indicate gaps in
          discriminative power. A test without a potency check might not actually discriminate
          between hypotheses.
        </Warning>

        <ProTip>
          Export the artifact as markdown for easier reading:
          <code className="ml-2">
            brenner artifact render --file artifact.json --format markdown
          </code>
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Artifact Clean?</strong>{" "}
            <span className="text-muted-foreground">
              When the linter passes with no errors, you&apos;re ready to score the session in the
              next step.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
