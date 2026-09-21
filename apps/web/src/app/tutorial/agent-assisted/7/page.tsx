"use client";

/**
 * Agent-Assisted Step 7: Agent Runs the Brenner Loop
 *
 * Agent produces the full research artifact: discriminative tests + potency ranking,
 * updated hypothesis slate, assumption ledger, and adversarial critique.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { Important, ProTip, TutorialCodeBlock, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-7",
  pathId: "agent-assisted",
  stepNumber: 7,
  title: "Agent Runs the Brenner Loop",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "How to force discriminative (not confirmatory) tests",
    "How potency checks prevent weak experiments",
    "What a complete Brenner research artifact looks like",
  ],
  whatYouDo: [
    "Give the full-loop prompt to your agent",
    "Inspect the tests for discriminative power",
    "Ask for revisions if anything is missing",
  ],
  troubleshooting: [
    {
      problem: "Tests are all 'collect more data'",
      solution:
        "Ask the agent to propose tests where at least two hypotheses predict different outcomes and to include a potency check for each test.",
    },
    {
      problem: "Agent ignores third alternatives",
      solution:
        "Explicitly demand at least one genuine third alternative and require it to be treated as a first-class hypothesis with its own predictions.",
    },
    {
      problem: "Output is unstructured or rambly",
      solution:
        "Ask for a strict sectioned artifact (headings) and a table for discriminative tests with columns for predictions under each hypothesis.",
    },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep7() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(6);
  }, [tutorial]);

  const loopPrompt = `I want you to run a full Brenner Loop on my research question using the artifacts you already generated.

## Inputs

### Research question
[PASTE YOUR REFINED QUESTION FROM STEP 5]

### Hypothesis slate
[PASTE THE HYPOTHESIS SLATE FROM STEP 6]

### Assumption ledger
[PASTE THE ASSUMPTION LEDGER FROM STEP 6]

### Third alternatives
[PASTE THE THIRD ALTERNATIVES FROM STEP 6]

### Scale checks / plausibility notes (if any)
[PASTE ANY SCALE CHECK NOTES FROM STEP 6]

---

## Requirements (Brenner disciplines)

1) **Discriminative tests only (⊘ Exclusion Test):**
   - Propose tests where at least two hypotheses predict different outcomes.
   - Each test must specify: what observation would EXCLUDE which hypothesis.

2) **Potency check each test (🎭):**
   - If the test comes back null/negative, what do we learn?
   - If the test is likely to be ambiguous, rewrite it until it isn't.

3) **Keep the hypothesis space honest (Σ + ⟳):**
   - Ensure hypotheses are not level-mixed (Σ Level Split).
   - Ensure at least one genuine third alternative is included (⟳ Object Transpose).

4) **Scale sanity (⊙):**
   - Where relevant, include order-of-magnitude or numeric plausibility checks.

---

## Output format (strict)

Produce a single markdown artifact with these sections:

1. **Single triangulated kernel** (3–6 bullets): your best current hypothesis + the single most discriminative next test + why.
2. **Hypothesis slate (revised)**: 4+ hypotheses, each with mechanism + 1–2 key assumptions.
3. **Discriminative tests (ranked)**: a table with:
   - Test name
   - What you do / measure
   - Predictions if H1/H2/H3/... true
   - Exclusion logic (what outcome rules out what)
   - Potency check (🎭)
   - Feasibility (time/cost/skill)
4. **Assumption ledger (updated)**: grouped by hypothesis and by type (theoretical / methodological / background).
5. **Adversarial critique**: attack the framing; propose 1–2 alternative framings.
6. **Recommended next steps**: the next 3 actions, ordered by discriminative power.

Take your time and be ruthless about discriminative power.`;

  const handleBack = () => {
    tutorial.goToPrevStep();
    router.push("/tutorial/agent-assisted/6");
  };

  const handleNext = () => {
    tutorial.completeAndAdvance();
    router.push("/tutorial/agent-assisted/8");
  };

  return (
    <TutorialStep step={stepData} totalSteps={8} onBack={handleBack} onNext={handleNext}>
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          This is where the method becomes operational: your agent turns the hypothesis slate into
          discriminative tests, ranks them by potency, and produces a complete research artifact.
        </p>

        <Important>
          Don&apos;t accept weak tests. The point is not to &quot;gather more information&quot; —
          it&apos;s to design tests that can actually exclude hypotheses.
        </Important>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The Full-Loop Prompt</h2>
          <p className="text-muted-foreground">
            Copy this prompt, fill in the bracketed sections from Steps 5–6, and give it to your
            agent:
          </p>
          <TutorialCodeBlock code={loopPrompt} language="text" title="Prompt to your agent" />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What to Look For</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Tests that make different predictions under different hypotheses.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>A potency check for every test (what you learn if the result is null).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>
                A revised hypothesis slate that stays mechanistic and includes a real third
                alternative.
              </span>
            </li>
          </ul>
        </div>

        <ProTip>
          If the agent produces a huge artifact, ask it to additionally output a one-screen
          &quot;single triangulated kernel&quot; summary: best current hypothesis + best next test +
          why.
        </ProTip>

        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 8, you&apos;ll do a human
            review using a checklist that catches the most common failure modes.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
