"use client";

/**
 * Quick Start Step 5: Build an Excerpt
 *
 * Compose relevant transcript sections into a curated excerpt.
 *
 * @see brenner_bot-s797 (Tutorial Path: Quick Start)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { Note, ProTip, TutorialCodeBlock, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TroubleshootingItem, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const troubleshooting: TroubleshootingItem[] = [
  {
    problem: "Section number not found",
    symptoms: ["Error: section §X not found"],
    solution:
      "Double-check the section number from your search results. Use ./brenner corpus list to see all available sections.",
  },
  {
    problem: "Output file is empty",
    symptoms: ["Created file has no content"],
    solution: "Make sure you're using valid section numbers separated by commas, with no spaces.",
    commands: ["./brenner excerpt build --sections 58,78,161 > my_excerpt.md"],
  },
];

const stepData: TutorialStepType = {
  id: "qs-5",
  pathId: "quick-start",
  stepNumber: 5,
  title: "Build an Excerpt",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "Why excerpts matter for grounding research in Brenner's wisdom",
    "How to compose sections into a personalized reference document",
  ],
  whatYouDo: [
    "Run the excerpt build command with your section numbers",
    "Save the excerpt to a file",
    "Review the compiled content",
  ],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function QuickStartStep5() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("quick-start", 7);
    tutorial.goToStep(4);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={7}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/quick-start/4");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/quick-start/6");
      }}
    >
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          An <strong>excerpt</strong> is a curated collection of Brenner passages relevant to your
          research question. It grounds your AI session in specific wisdom rather than generic
          prompts.
        </p>

        {/* Why Excerpts Matter */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <h3 className="font-semibold text-foreground">Why Build an Excerpt?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Grounding:</strong> Your AI gets specific Brenner context, not generic
                research advice
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Citation:</strong> §n anchors let you trace insights back to the original
                transcript
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Focus:</strong> Only include what&apos;s relevant to YOUR question
              </span>
            </li>
          </ul>
        </div>

        {/* Build Command */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              1
            </span>
            Build Your Excerpt
          </h2>
          <p className="text-sm text-muted-foreground">
            Use the section numbers you noted in Step 4. Replace the example numbers with yours:
          </p>
          <TutorialCodeBlock
            code={`# Replace with YOUR section numbers from Step 4
./brenner excerpt build --sections 58,78,161 > my_excerpt.md

# Or use search to find sections first
./brenner corpus search "your topic" --format sections
./brenner excerpt build --sections THOSE_SECTIONS > my_excerpt.md`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* View Excerpt */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              2
            </span>
            Review Your Excerpt
          </h2>
          <p className="text-sm text-muted-foreground">
            Open the file to see what you&apos;ve compiled:
          </p>
          <TutorialCodeBlock code="cat my_excerpt.md" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">
            Your excerpt should look something like this:
          </p>
          <TutorialCodeBlock
            code={`# Research Excerpt

## Relevant Brenner Segments

### §58: Working Out of Phase
"The best thing in science is to work out of phase.
While everyone else is doing X, you should be doing Y.
That's how you make real discoveries..."

### §78: Choosing the Right Problem
"You have to choose the right problem. That's the most
important thing. And the right problem is one where you
can actually make progress, where the tools exist..."

### §161: Mechanism vs Correlation
"The real question is always: what is the mechanism?
Not what is the correlation, but what causes what.
Correlation is the beginning, not the end..."`}
            language="markdown"
            title="my_excerpt.md"
          />
        </div>

        {/* Customize */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              3
            </span>
            Customize (Optional)
          </h2>
          <p className="text-sm text-muted-foreground">
            You can edit the excerpt file to add your own notes or remove less relevant parts. The
            file is just Markdown — feel free to annotate it.
          </p>
        </div>

        <ProTip>
          Quality over quantity! 3-5 well-chosen sections are better than 20 vaguely related ones.
          Your AI session will be more focused if the excerpt is tight and relevant.
        </ProTip>

        <Note>
          Keep your <code>my_excerpt.md</code> file handy — you&apos;ll use it in the next step to
          compose your session prompt.
        </Note>

        {/* Next Step */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> You&apos;ll use your excerpt to
            compose a kickoff prompt and run your first Brenner-style research session.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
