"use client";

/**
 * Agent-Assisted Step 6: Agent Builds the Inputs
 *
 * Agent generates hypothesis slate, assumption ledger, third alternatives
 * using Brenner operators.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Important, ProTip, TutorialCodeBlock, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-6",
  pathId: "agent-assisted",
  stepNumber: 6,
  title: "Agent Builds the Inputs",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "What artifacts the Brenner loop requires",
    "How the agent uses operators to generate alternatives",
    "What makes a good hypothesis slate",
  ],
  whatYouDo: [
    "Give your agent the input generation prompt",
    "Review the generated hypothesis slate",
    "Verify the assumption ledger and third alternatives",
  ],
  troubleshooting: [
    {
      problem: "Agent only generated 2 hypotheses",
      solution:
        "Explicitly ask for more alternatives. 'What other mechanisms could produce the same observation?'",
    },
    {
      problem: "Third alternatives seem far-fetched",
      solution:
        "That's often intentional! The point is to expand your hypothesis space. Evaluate them later.",
    },
    {
      problem: "Assumption ledger is too short",
      solution:
        "Prompt the agent to consider methodological, theoretical, and background assumptions separately.",
    },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep6() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(5);
  }, [tutorial]);

  const inputPrompt = `Now I need you to build the formal inputs for a Brenner research loop. My refined research question is:

[YOUR REFINED QUESTION FROM STEP 5]

Please generate the following artifacts:

## 1. Hypothesis Slate (minimum 4 hypotheses)

For each hypothesis:
- State it clearly and specifically
- Explain the mechanism it proposes
- Note what evidence would support it
- Note what evidence would falsify it

Include at least:
- The "obvious" hypothesis (what most people would assume)
- A mechanistic alternative (different underlying mechanism)
- A reversed causation hypothesis (effect causes apparent cause)
- A third-variable hypothesis (both are caused by something else)

Use **Object Transpose (⟳)** to generate the reversal and third-variable options.

## 2. Assumption Ledger

List every assumption underlying each hypothesis. Categorize them as:
- **Theoretical**: Assumptions about how things work
- **Methodological**: Assumptions about how we'd measure/observe
- **Background**: Taken-for-granted facts that might be wrong

Use **Level Split (Σ)** to check if assumptions hold at different levels.

## 3. Third Alternatives

For any pair of hypotheses that seem like the only options, generate a third possibility that:
- Is neither hypothesis A nor hypothesis B
- Could explain the same observations
- Comes from applying Object Transpose or Level Split

## 4. Critical Evaluation

For each hypothesis, apply **Scale Check (⊙)** to verify:
- Is the proposed effect size plausible?
- Do the numbers make physical/biological sense?
- What would have to be true for this mechanism to work?

Take your time. Be thorough. This is the foundation for everything that follows.`;

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      onBack={() => router.push("/tutorial/agent-assisted/5")}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted/7");
      }}
    >
      <section className="space-y-6">
        {/* What We're Building */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What We&apos;re Building</h2>
          <p className="text-muted-foreground">
            The Brenner loop needs structured inputs to work with. Your agent will generate these
            using the operators it learned earlier:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "Hypothesis Slate",
                icon: "H",
                desc: "Multiple competing explanations, not just the obvious one",
                operator: "Object Transpose (⟳)",
              },
              {
                name: "Assumption Ledger",
                icon: "A",
                desc: "Every hidden premise that could be wrong",
                operator: "Level Split (Σ)",
              },
              {
                name: "Third Alternatives",
                icon: "3",
                desc: "Options beyond the obvious binary choices",
                operator: "Object Transpose (⟳)",
              },
              {
                name: "Scale Checks",
                icon: "⊙",
                desc: "Reality checks on effect sizes and plausibility",
                operator: "Scale Check (⊙)",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-4 rounded-xl border border-border bg-card/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    {item.icon}
                  </span>
                  <h4 className="font-semibold text-sm">{item.name}</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  Uses {item.operator}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* The Prompt */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The Input Generation Prompt</h2>
          <p className="text-muted-foreground">
            Replace{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
              [YOUR REFINED QUESTION FROM STEP 5]
            </code>{" "}
            with your actual refined question and give this to your agent:
          </p>
          <TutorialCodeBlock code={inputPrompt} language="text" title="Prompt to your agent" />
        </div>

        {/* What Good Outputs Look Like */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What Good Outputs Look Like</h2>

          <div className="space-y-4">
            {/* Hypothesis Slate Example */}
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h4 className="font-semibold text-sm mb-3 text-amber-600 dark:text-amber-400">
                Good Hypothesis Slate
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong>H1 (Obvious):</strong> X directly causes Y through mechanism M.
                </p>
                <p>
                  <strong>H2 (Alternative mechanism):</strong> X causes Y, but through mechanism N,
                  not M.
                </p>
                <p>
                  <strong>H3 (Reversed causation):</strong> Y causes X, and we&apos;ve misidentified
                  the direction.
                </p>
                <p>
                  <strong>H4 (Third variable):</strong> Z causes both X and Y; they&apos;re
                  correlated but neither causes the other.
                </p>
                <p>
                  <strong>H5 (Level shift):</strong> The relationship holds at molecular level but
                  not at systems level (or vice versa).
                </p>
              </div>
            </div>

            {/* Assumption Ledger Example */}
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h4 className="font-semibold text-sm mb-3 text-amber-600 dark:text-amber-400">
                Good Assumption Ledger
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong>Theoretical:</strong> &quot;We assume X and Y are distinct entities, not
                  different manifestations of the same process.&quot;
                </p>
                <p>
                  <strong>Methodological:</strong> &quot;We assume our measurement of X doesn&apos;t
                  itself affect Y.&quot;
                </p>
                <p>
                  <strong>Background:</strong> &quot;We assume the standard model of [domain] is
                  correct in this context.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        <Important>
          The quality of your hypothesis slate determines everything. If you only consider one
          explanation, no amount of testing will save you from confirmation bias. Demand at least 4
          genuinely different hypotheses.
        </Important>

        {/* Reviewing the Output */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Reviewing the Output</h2>
          <p className="text-muted-foreground">
            After your agent generates the inputs, check each one:
          </p>

          <div className="space-y-3">
            {[
              {
                check: "Hypothesis slate",
                question: "Are the hypotheses genuinely different, or variations on a theme?",
                fix: "Ask for alternatives that would require different tests to distinguish.",
              },
              {
                check: "Assumption ledger",
                question: "Are there assumptions so obvious you almost missed them?",
                fix: "Ask the agent to list 'background' assumptions about your field.",
              },
              {
                check: "Third alternatives",
                question: "Do any feel like they were generated just to fill a slot?",
                fix: "Ask the agent to explain what observation would make each plausible.",
              },
              {
                check: "Scale checks",
                question: "Has the agent done actual calculations, or just hand-waved?",
                fix: "Ask for order-of-magnitude estimates with explicit numbers.",
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-muted/30">
                <h4 className="font-semibold text-sm mb-1">{item.check}</h4>
                <p className="text-sm text-muted-foreground mb-2">{item.question}</p>
                <p className="text-xs text-primary">
                  <strong>If weak:</strong> {item.fix}
                </p>
              </div>
            ))}
          </div>
        </div>

        <ProTip>
          Save the agent&apos;s output! Copy it to a file or note. You&apos;ll reference these
          artifacts throughout the rest of the loop, and you&apos;ll want them for documentation
          when you&apos;re done.
        </ProTip>

        {/* Success Criteria */}
        <div className="p-5 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <h3 className="font-semibold text-[oklch(0.72_0.19_145)] mb-3">Success Criteria</h3>
          <p className="text-sm text-muted-foreground mb-3">
            You&apos;re ready to proceed when you have:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              At least 4 genuinely distinct hypotheses
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Assumptions identified for each hypothesis
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              At least one &quot;third alternative&quot; you hadn&apos;t considered
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Scale checks that include actual numbers
            </li>
          </ul>
        </div>

        {/* Next Step Preview */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 7, you&apos;ll have your
            agent run the full Brenner loop &mdash; designing discriminative tests and ranking them
            by potency.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
