"use client";

/**
 * Agent-Assisted Step 5: Define Your Research Problem
 *
 * User provides their question, agent helps refine using Brenner criteria.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCodeBlock, TutorialStep, Warning } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-5",
  pathId: "agent-assisted",
  stepNumber: 5,
  title: "Define Your Research Problem",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "Brenner's criteria for good research questions",
    "How to distinguish productive questions from dead ends",
    "How to have your agent help refine your question",
  ],
  whatYouDo: [
    "Formulate your initial research question",
    "Give it to your agent for Brenner-style critique",
    "Iterate until the question is sharp and testable",
  ],
  troubleshooting: [
    {
      problem: "Agent says my question is too broad",
      solution:
        "This is actually good feedback! Ask the agent to suggest specific sub-questions or narrower framings.",
    },
    {
      problem: "Not sure what makes a question 'good'",
      solution:
        "Good questions have: a clear observable to measure, potential for exclusion (falsifiability), and implications if proven true or false.",
    },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep5() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(4);
  }, [tutorial]);

  const questionPrompt = `I have a research question I'd like to explore using the Brenner methodology you just learned. Here's my initial question:

[YOUR QUESTION HERE]

Please help me refine this question by:

1. **Evaluating against Brenner's criteria:**
   - Is there a clear observable I could measure?
   - Is there potential for exclusion (could this be proven false)?
   - What would change if I knew the answer?

2. **Applying Level Split:**
   - What level of analysis is this question at? (molecular, cellular, systems, behavioral?)
   - Should the question be asked at a different level?

3. **Checking for implicit assumptions:**
   - What am I assuming to be true that might not be?
   - Are there hidden premises in my framing?

4. **Suggesting refinements:**
   - If the question is too broad, suggest narrower versions
   - If too narrow, suggest what broader question it addresses
   - Reframe to make it more testable

Take your time. Be critical. I want a question that will actually lead somewhere.`;

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      onBack={() => router.push("/tutorial/agent-assisted/4")}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted/6");
      }}
    >
      <section className="space-y-6">
        {/* What Makes a Good Question */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What Makes a Good Research Question?</h2>
          <p className="text-muted-foreground">
            Brenner was ruthless about question quality. Most questions scientists ask are actually
            disguised statements or lead nowhere testable. Here are his criteria:
          </p>

          <div className="space-y-3">
            {[
              {
                criterion: "Observable",
                desc: "There must be something you can actually measure or observe. If you can't specify what you'd look for, it's not a question yet.",
                bad: "Why does consciousness exist?",
                good: "Does visual attention require intact prefrontal cortex?",
              },
              {
                criterion: "Excludable",
                desc: "A good question can be answered 'no'. If every possible observation confirms your hypothesis, you're not doing science.",
                bad: "Does stress affect health?",
                good: "Does cortisol elevation precede depressive episodes?",
              },
              {
                criterion: "Consequential",
                desc: "The answer should change what you do or believe. If nothing changes either way, why ask?",
                bad: "Are there many genes involved in development?",
                good: "Can we identify the minimal gene set for segment formation?",
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card/50">
                <h4 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">
                  {item.criterion}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <span className="font-semibold text-destructive">Weak:</span>
                    <span className="text-muted-foreground ml-1">{item.bad}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[oklch(0.72_0.19_145/0.1)] border border-[oklch(0.72_0.19_145/0.2)]">
                    <span className="font-semibold text-[oklch(0.72_0.19_145)]">Strong:</span>
                    <span className="text-muted-foreground ml-1">{item.good}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Question */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Formulating Your Question</h2>
          <p className="text-muted-foreground">
            Before giving your question to the agent, spend a moment thinking about it:
          </p>

          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>What phenomenon are you trying to explain?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>What&apos;s the current consensus (if any)?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Why do you suspect the consensus might be wrong or incomplete?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>What would you do differently if you had the answer?</span>
              </li>
            </ul>
          </div>
        </div>

        {/* The Prompt */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Give Your Question to the Agent</h2>
          <p className="text-muted-foreground">
            Copy this prompt, replace{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-xs">[YOUR QUESTION HERE]</code>{" "}
            with your actual question, and give it to your agent:
          </p>
          <TutorialCodeBlock code={questionPrompt} language="text" title="Prompt to your agent" />
        </div>

        {/* What to Expect */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What to Expect</h2>
          <p className="text-muted-foreground">
            Your agent should respond with a thorough critique. Don&apos;t be discouraged if it
            finds problems &mdash; that&apos;s exactly what you want at this stage.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Level Analysis",
                check: "Agent identifies what level your question operates at",
              },
              {
                title: "Assumption Surfacing",
                check: "Agent names things you're taking for granted",
              },
              {
                title: "Refined Versions",
                check: "Agent offers sharpened alternatives to your question",
              },
              {
                title: "Testability Check",
                check: "Agent evaluates whether the question can be answered",
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card/50">
                <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.check}</p>
              </div>
            ))}
          </div>
        </div>

        <Warning>
          Don&apos;t skip the critique step! It&apos;s tempting to rush ahead with your original
          question, but taking 5 minutes now to sharpen it will save you from building elaborate
          tests for the wrong question.
        </Warning>

        <ProTip>
          If your agent&apos;s critique reveals that your question is actually several questions
          bundled together, that&apos;s a valuable discovery. Pick the most important sub-question
          to proceed with.
        </ProTip>

        {/* Iteration */}
        <div className="p-5 rounded-xl border border-primary/30 bg-primary/5">
          <h3 className="font-semibold mb-3">Iterate Until Sharp</h3>
          <p className="text-sm text-muted-foreground mb-3">
            You may need 2-3 rounds of refinement. After the agent critiques your question, try a
            revised version:
          </p>
          <TutorialCodeBlock
            code={`Based on your critique, here's my refined question:

[REVISED QUESTION]

Does this address the issues you raised? What's still weak about it?`}
            language="text"
            title="Follow-up prompt"
          />
        </div>

        {/* Success Criteria */}
        <div className="p-5 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <h3 className="font-semibold text-[oklch(0.72_0.19_145)] mb-3">Success Criteria</h3>
          <p className="text-sm text-muted-foreground mb-3">You&apos;re ready to proceed when:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              You have a single, focused question (not a bundle)
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              You can specify what observation would answer it
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              The question could be answered &quot;no&quot; (it&apos;s falsifiable)
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[oklch(0.72_0.19_145)]" />
              You know what you&apos;d do differently with the answer
            </li>
          </ul>
        </div>

        {/* Next Step Preview */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 6, your agent will
            generate the formal inputs for the Brenner loop: hypothesis slate, assumption ledger,
            and more.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
