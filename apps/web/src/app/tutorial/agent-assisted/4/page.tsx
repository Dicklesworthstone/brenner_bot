"use client";

/**
 * Agent-Assisted Step 4: Agent Studies the System
 *
 * THE KEY STEP: Have the agent read and internalize the Brenner methodology.
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
  id: "aa-4",
  pathId: "agent-assisted",
  stepNumber: 4,
  title: "Agent Studies the System",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "How to have your agent systematically study documentation",
    "What the agent should extract from each document",
    "How to verify the agent has internalized the methodology",
  ],
  whatYouDo: [
    "Give your agent the study prompt",
    "Wait while it reads the key documents",
    "Review its summary to verify understanding",
  ],
  troubleshooting: [
    {
      problem: "Agent's summary is too superficial",
      solution:
        "Ask follow-up questions about specific operators or concepts to deepen its understanding.",
    },
    {
      problem: "Agent didn't mention all four operators",
      solution:
        "Explicitly ask it to read specs/operator_library_v0.1.md and summarize each operator.",
    },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep4() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(3);
  }, [tutorial]);

  const studyPrompt = `Please study the Brenner methodology by reading these documents in order:

1. First, read README.md to understand the project overview
2. Then read specs/operator_library_v0.1.md to learn the four cognitive operators
3. Finally, read one of the distillation files (e.g., final_distillation_of_brenner_method_by_opus45.md)

After reading, provide a summary that includes:
- The core insight of Brenner's approach to scientific research
- The four operators (Level Split, Exclusion Test, Object Transpose, Scale Check) and what each does
- The concept of "discriminative experiments" vs confirmation-seeking
- How to generate "third alternatives"

Take your time to read carefully. This will inform how you help with research questions.`;

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      onBack={() => router.push("/tutorial/agent-assisted/3")}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted/5");
      }}
    >
      <section className="space-y-6">
        {/* Why This Step Matters */}
        <motion.div
          className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm">
              !
            </span>
            <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              This Is the Key Step
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            This is where the magic happens. By having your agent systematically study the Brenner
            documentation, it builds a working understanding of the methodology. It won&apos;t just
            follow instructions &mdash; it will <em>think with</em> the cognitive operators.
          </p>
        </motion.div>

        {/* The Study Prompt */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The Study Prompt</h2>
          <p className="text-muted-foreground">
            Copy and paste this prompt to your agent. It will read the key documents and build its
            understanding:
          </p>
          <TutorialCodeBlock code={studyPrompt} language="text" title="Prompt to your agent" />
        </div>

        {/* What to Expect */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What to Expect</h2>
          <p className="text-muted-foreground">
            Your agent will spend a few minutes reading the documents. When it responds, its summary
            should demonstrate understanding of:
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Level Split (Σ)",
                check: "Breaking problems into appropriate levels of analysis",
              },
              {
                title: "Exclusion Test (⊘)",
                check: "Designing experiments that can falsify hypotheses",
              },
              {
                title: "Object Transpose (⟳)",
                check: "Considering reversed causation and third variables",
              },
              {
                title: "Scale Check (⊙)",
                check: "Verifying effect sizes make physical/biological sense",
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card/50">
                <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.check}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Questions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Verification Questions</h2>
          <p className="text-muted-foreground">
            If the agent&apos;s summary seems shallow, ask these follow-up questions:
          </p>

          <div className="space-y-3">
            {[
              "What makes an experiment 'discriminative' rather than 'confirmation-seeking'?",
              "When should I use Level Split vs Object Transpose?",
              "What is a 'third alternative' and why is it important?",
              "How do I know if my hypothesis is at the right level of abstraction?",
            ].map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">&ldquo;{q}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>

        <Important>
          Don&apos;t rush this step. The quality of the agent&apos;s research assistance depends on
          how well it has internalized the methodology. Spending 10 minutes here will save you hours
          of suboptimal guidance later.
        </Important>

        <ProTip>
          You can ask the agent to quote specific passages from the transcript that illustrate each
          operator. This deepens its understanding and gives you concrete examples to reference
          later.
        </ProTip>

        {/* Success Criteria */}
        <div className="p-5 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <h3 className="font-semibold text-[oklch(0.72_0.19_145)] mb-3">Success Criteria</h3>
          <p className="text-sm text-muted-foreground mb-3">
            You&apos;re ready to proceed when your agent can:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Explain each of the four operators in its own words
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Distinguish discriminative experiments from confirmation-seeking
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Explain why &ldquo;third alternatives&rdquo; matter
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Reference specific concepts from the Brenner corpus
            </li>
          </ul>
        </div>

        {/* Next Step Preview */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 5, you&apos;ll define your
            research problem and have the agent help refine it using Brenner&apos;s criteria for
            good questions.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
