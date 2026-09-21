"use client";

/**
 * Quick Start Step 6: Your First Session
 *
 * Compose a kickoff prompt and run it through any AI chat interface.
 *
 * @see brenner_bot-s797 (Tutorial Path: Quick Start)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { Important, ProTip, TutorialCodeBlock, TutorialStep, Warning } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TroubleshootingItem, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const troubleshooting: TroubleshootingItem[] = [
  {
    problem: "Prompt file is too long for my AI",
    symptoms: ["Token limit exceeded", "Message too long"],
    solution:
      "Trim your excerpt to fewer sections, or use a model with a larger context window (Claude, GPT-4).",
  },
  {
    problem: "AI doesn't follow the format",
    symptoms: ["Output missing sections", "Unstructured response"],
    solution:
      "Make sure you copied the ENTIRE prompt including all instructions. Some AIs need explicit formatting reminders.",
  },
  {
    problem: "Command not found",
    symptoms: ["brenner: command not found"],
    solution:
      "Make sure you're in the brenner_bot directory and using ./brenner (with the dot-slash).",
    commands: ["cd brenner_bot", "./brenner prompt compose --help"],
  },
];

const stepData: TutorialStepType = {
  id: "qs-6",
  pathId: "quick-start",
  stepNumber: 6,
  title: "Your First Session",
  estimatedTime: "~8 min",
  whatYouLearn: [
    "How to generate structured prompts with the Brenner methodology",
    "Running sessions in 'local mode' with any AI",
  ],
  whatYouDo: [
    "Compose a kickoff prompt using your excerpt",
    "Copy the prompt to your AI chat interface",
    "Run the session and save the output",
  ],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function QuickStartStep6() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("quick-start", 7);
    tutorial.goToStep(5);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={7}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/quick-start/5");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/quick-start/7");
      }}
    >
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          This is the big moment! You&apos;ll compose a structured prompt that encodes
          Brenner&apos;s methodology, then run it through any AI chat interface.
        </p>

        {/* Compose Prompt */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              1
            </span>
            Compose Your Prompt
          </h2>
          <p className="text-sm text-muted-foreground">
            Use the prompt compose command with your excerpt and research question:
          </p>
          <TutorialCodeBlock
            code={`./brenner prompt compose \\
  --excerpt-file my_excerpt.md \\
  --question "How do cells determine their position in a developing embryo?" \\
  --role unified \\
  --output-file my_prompt.md`}
            language="bash"
            title="Terminal"
          />
          <p className="text-sm text-muted-foreground">
            Replace the question with YOUR research question. The <code>--role unified</code> flag
            means you get a single comprehensive prompt (other options split by role).
          </p>
        </div>

        {/* View Prompt */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              2
            </span>
            View the Composed Prompt
          </h2>
          <p className="text-sm text-muted-foreground">Check what was generated:</p>
          <TutorialCodeBlock code="cat my_prompt.md" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">The prompt includes:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Your Brenner excerpt for grounding</li>
            <li>• Your research question</li>
            <li>• Detailed instructions for producing a research artifact</li>
            <li>• Output format specification</li>
          </ul>
        </div>

        <Important>
          <strong>Don&apos;t modify the instructions!</strong> The prompt includes specific
          formatting that encodes the Brenner methodology. Changing it might break the structured
          output.
        </Important>

        {/* Run Session */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              3
            </span>
            Run Your Session
          </h2>
          <p className="text-sm text-muted-foreground">
            Now the fun part — run your prompt through any AI:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg border border-border bg-card text-center">
              <p className="font-medium text-sm">Claude</p>
              <p className="text-xs text-muted-foreground mt-1">claude.ai</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card text-center">
              <p className="font-medium text-sm">ChatGPT</p>
              <p className="text-xs text-muted-foreground mt-1">chat.openai.com</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card text-center">
              <p className="font-medium text-sm">Gemini</p>
              <p className="text-xs text-muted-foreground mt-1">gemini.google.com</p>
            </div>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 ml-4 mt-4">
            <li>
              <strong>1.</strong> Copy the contents of <code>my_prompt.md</code>
            </li>
            <li>
              <strong>2.</strong> Paste into your AI chat interface
            </li>
            <li>
              <strong>3.</strong> Press Enter and wait for the response
            </li>
            <li>
              <strong>4.</strong> Save the AI&apos;s response (you&apos;ll analyze it next)
            </li>
          </ol>
        </div>

        <ProTip>
          Free tiers work fine! Claude Free, ChatGPT Free, or Gemini Free all produce usable
          artifacts. Paid tiers give longer context windows and better reasoning, but aren&apos;t
          required.
        </ProTip>

        {/* Save Output */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              4
            </span>
            Save the Output
          </h2>
          <p className="text-sm text-muted-foreground">
            Copy the AI&apos;s response and save it to a file:
          </p>
          <TutorialCodeBlock
            code={`# Create a file and paste the response
# (Or copy directly from the AI interface)

# macOS:
pbpaste > my_artifact.md

# Linux (with xclip):
xclip -selection clipboard -o > my_artifact.md

# Or just paste into a text editor and save`}
            language="bash"
            title="Terminal"
          />
        </div>

        <Warning>
          <strong>AI responses vary!</strong> Your artifact might look different from the examples.
          That&apos;s normal — each AI interprets prompts slightly differently. The key sections
          (Hypothesis Slate, Tests, Assumptions) should still be present.
        </Warning>

        {/* Next Step */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Got your artifact?</strong>{" "}
            <span className="text-muted-foreground">
              In the final step, you&apos;ll learn to read and interpret each section of your
              research artifact.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
