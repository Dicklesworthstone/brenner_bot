"use client";

/**
 * Multi-Agent Cockpit Step 4: Write Your Kickoff Prompt
 *
 * Craft the initial research prompt that will seed all three agents.
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
    problem: "Prompt is too vague, agents produce generic output",
    solution:
      "Add specific context: excerpt anchors, concrete examples, constraints on the hypothesis space.",
  },
  {
    problem: "Agents all converge on the same hypothesis",
    solution:
      "Explicitly ask for a 'third alternative' and emphasize that the obvious answer might be wrong.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-4",
  pathId: "multi-agent-cockpit",
  stepNumber: 4,
  title: "Write Your Kickoff Prompt",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "Multi-agent prompt design",
    "How to seed productive disagreement",
    "Using corpus excerpts for grounding",
  ],
  whatYouDo: ["Choose a research question", "Build a corpus excerpt", "Write the kickoff prompt"],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep4() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(3);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/3");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/5");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The kickoff prompt is what seeds all three agents with your research question and
            relevant context. A well-crafted kickoff leads to productive disagreement; a vague one
            leads to generic convergence.
          </p>
        </div>

        {/* Step 1: Research Question */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Choose Your Research Question
          </h2>
          <p className="text-sm text-muted-foreground">
            Good research questions are <strong className="text-foreground">discriminative</strong>:
            different answers would lead to different actions (experiments, decisions, models).
          </p>

          <div className="grid gap-3">
            <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
              <p className="text-xs font-medium text-[oklch(0.72_0.19_145)] uppercase tracking-wide mb-2">
                Good Example
              </p>
              <p className="text-sm">
                &quot;What determines whether a cell becomes a neuron vs a muscle cell during
                development?&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Different answers → different experiments
              </p>
            </div>
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">
                Bad Example
              </p>
              <p className="text-sm">&quot;What is the meaning of life?&quot;</p>
              <p className="text-xs text-muted-foreground mt-2">
                Too vague, no discriminative power
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Build Excerpt */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              2
            </span>
            Build a Corpus Excerpt
          </h2>
          <p className="text-sm text-muted-foreground">
            Ground your research in Brenner&apos;s wisdom. Search the corpus for relevant sections
            and compile them into an excerpt file.
          </p>

          <TutorialCodeBlock
            code={`# Search the corpus for relevant material
brenner corpus search "cell fate determination" --limit 20
brenner corpus search "developmental biology" --limit 20

# Build an excerpt from relevant sections
brenner excerpt build --sections 58,78,161,203 > excerpt.md

# Review the excerpt
cat excerpt.md`}
            language="bash"
            title="Terminal"
          />

          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Why excerpts matter:</strong> They provide shared
              context that all three agents can reference. This reduces hallucination and keeps
              agents grounded in the Brenner methodology.
            </p>
          </div>
        </div>

        {/* Step 3: Write the Kickoff */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              3
            </span>
            Write the Kickoff Prompt
          </h2>
          <p className="text-sm text-muted-foreground">
            The kickoff prompt should include: your research question, the excerpt, and explicit
            instructions for productive disagreement.
          </p>

          <TutorialCodeBlock
            code={`# Example kickoff structure

## Research Question
What determines whether a neural progenitor cell commits to a
neuronal vs glial fate during CNS development?

## Context
I'm investigating the molecular mechanisms of cell fate determination.
The key puzzle is why genetically identical cells in the same niche
sometimes differentiate into different cell types.

## Relevant Brenner Wisdom
[Include your excerpt.md content here]

## Instructions for This Session
1. Generate 2-5 competing hypotheses (including a "third alternative")
2. Each hypothesis must specify a mechanism, not just a description
3. Design tests that can discriminate between hypotheses
4. Explicitly challenge the framing — what assumptions are we making?

## Constraints
- Focus on tractable mechanisms (testable in current model systems)
- Consider both cell-autonomous and non-autonomous factors
- Don't ignore the obvious — but question why it's "obvious"`}
            language="markdown"
            title="kickoff.md"
          />
        </div>

        {/* Save as File */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              4
            </span>
            Save Your Kickoff
          </h2>
          <p className="text-sm text-muted-foreground">
            Save the kickoff to a file. The brenner CLI will read it when starting the session.
          </p>

          <TutorialCodeBlock
            code={`# Create a sessions directory
mkdir -p sessions/RS-$(date +%Y%m%d)

# Save your kickoff
cat > sessions/RS-$(date +%Y%m%d)/kickoff.md << 'EOF'
## Research Question
[Your question here]

## Context
[Your context here]

## Relevant Brenner Wisdom
[Paste excerpt.md content]

## Instructions for This Session
[Your instructions]
EOF`}
            language="bash"
            title="Terminal"
          />
        </div>

        <Warning>
          <strong>Quality of input → quality of output:</strong> The agents can only be as good as
          the kickoff you give them. Spend time on this step — a well-crafted kickoff saves
          iteration time later.
        </Warning>

        <ProTip>
          Include at least one &quot;surprising constraint&quot; in your kickoff — something that
          forces agents to think outside their default patterns. For example: &quot;Assume the most
          obvious answer is wrong. What would that imply?&quot;
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Kickoff Ready?</strong>{" "}
            <span className="text-muted-foreground">
              Save your kickoff file. In the next step, you&apos;ll use the brenner CLI to launch
              the session and dispatch the kickoff to all three agents.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
