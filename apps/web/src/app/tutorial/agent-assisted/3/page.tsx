"use client";

/**
 * Agent-Assisted Step 3: Clone into Agent Context
 *
 * Clone the BrennerBot repository and give the agent access to files.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCodeBlock, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-3",
  pathId: "agent-assisted",
  stepNumber: 3,
  title: "Clone into Agent Context",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to clone the BrennerBot repository",
    "How to give your agent access to the codebase",
    "The key files your agent will need to read",
  ],
  whatYouDo: [
    "Clone the brenner_bot repository",
    "Navigate into the project directory",
    "Start your agent with project context",
  ],
  troubleshooting: [
    {
      problem: "Git clone fails",
      solution: "Ensure you have git installed and network access. Try: git --version",
    },
    {
      problem: "Agent can't see files",
      solution: "Make sure you're running the agent from inside the cloned directory.",
    },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep3() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(2);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      onBack={() => router.push("/tutorial/agent-assisted/2")}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted/4");
      }}
    >
      <section className="space-y-6">
        {/* Clone the Repository */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">1. Clone the Repository</h2>
          <p className="text-muted-foreground">
            First, clone the BrennerBot repository to your local machine:
          </p>
          <TutorialCodeBlock
            code={`git clone https://github.com/Dicklesworthstone/brenner_bot.git
cd brenner_bot`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Key Files */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">2. Key Files Your Agent Will Read</h2>
          <p className="text-muted-foreground">
            The repository contains these important files that your agent will internalize:
          </p>

          <div className="space-y-3">
            {[
              {
                file: "AGENTS.md",
                desc: "Project conventions and agent coordination rules",
              },
              {
                file: "README.md",
                desc: "Project overview and the Brenner methodology",
              },
              {
                file: "specs/operator_library_v0.1.md",
                desc: "The four cognitive operators with usage examples",
              },
              {
                file: "final_distillation_of_brenner_method_*.md",
                desc: "AI-generated distillations of Brenner's approach",
              },
              {
                file: "complete_brenner_transcript.md",
                desc: "The full primary source material",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <code className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono shrink-0">
                  {item.file}
                </code>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Start Agent */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">3. Start Your Agent</h2>
          <p className="text-muted-foreground">
            Now start your coding agent from inside the brenner_bot directory:
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-primary/30 bg-card">
              <h4 className="font-semibold text-sm mb-2">For Claude Code:</h4>
              <TutorialCodeBlock code="claude" language="bash" title="Terminal (in brenner_bot/)" />
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <h4 className="font-semibold text-sm mb-2">For Codex:</h4>
              <TutorialCodeBlock code="codex" language="bash" title="Terminal (in brenner_bot/)" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            The agent will now have access to all files in the repository. You can verify by asking
            it to list the files or describe the project structure.
          </p>
        </div>

        {/* Verification */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">4. Verify File Access</h2>
          <p className="text-muted-foreground">
            Test that your agent can see the files by asking a simple question:
          </p>
          <TutorialCodeBlock
            code={`"List the main files in this repository and briefly describe what each one contains."`}
            language="text"
            title="Prompt to your agent"
          />
          <p className="text-sm text-muted-foreground">
            Your agent should mention AGENTS.md, README.md, brenner.ts, and the various markdown
            files. If it says it can&apos;t access files, you may need to restart the agent from the
            correct directory.
          </p>
        </div>

        <ProTip>
          The agent builds its understanding of the codebase as it reads files. In the next step,
          we&apos;ll have it systematically study the methodology documents before applying them to
          your research question.
        </ProTip>

        {/* Next Step Preview */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 4, you&apos;ll guide your
            agent to study the Brenner methodology systematically. This is the key step where the
            agent internalizes the approach.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
