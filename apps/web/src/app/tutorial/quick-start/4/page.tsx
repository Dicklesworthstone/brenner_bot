"use client";

/**
 * Quick Start Step 4: Search the Corpus
 *
 * Learn to search Brenner's wisdom using the CLI.
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
    problem: "No results found for my search",
    symptoms: ["Empty results", "No matching segments"],
    solution:
      "Try broader or different terms. The corpus uses Brenner's vocabulary, which may differ from modern terminology.",
    commands: ['./brenner corpus search "mechanism"', './brenner corpus search "experiment"'],
  },
  {
    problem: "Command not found: brenner",
    symptoms: ["'brenner' is not recognized"],
    solution: "Make sure you're in the brenner_bot directory and use the full path.",
    commands: ['./brenner corpus search "your topic"'],
  },
];

const stepData: TutorialStepType = {
  id: "qs-4",
  pathId: "quick-start",
  stepNumber: 4,
  title: "Search the Corpus",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How corpus search finds relevant transcript segments",
    "Understanding §n references for stable citations",
  ],
  whatYouDo: [
    "Run example corpus searches",
    "Search for your own research topic",
    "Note 3-5 §n references that seem relevant",
  ],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function QuickStartStep4() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("quick-start", 7);
    tutorial.goToStep(3);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={7}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/quick-start/3");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/quick-start/5");
      }}
    >
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          BrennerBot includes Brenner&apos;s complete interview transcript and distilled insights.
          The corpus search helps you find passages relevant to your research question.
        </p>

        {/* Basic Search */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              1
            </span>
            Try an Example Search
          </h2>
          <p className="text-sm text-muted-foreground">
            Let&apos;s start with a search Brenner would have loved — pattern formation in
            development:
          </p>
          <TutorialCodeBlock
            code={`./brenner corpus search "pattern formation"`}
            language="bash"
            title="Terminal"
          />
          <p className="text-sm text-muted-foreground">
            You&apos;ll see results with <strong>§n</strong> section numbers — these are stable
            anchors for citing specific passages:
          </p>
          <TutorialCodeBlock
            code={`§58: "The best thing in science is to work out of phase.
      While everyone else is doing X, you should be doing Y..."

§78: "You have to choose the right problem. That's the most
      important thing. And the right problem is one where..."

§161: "The real question is always: what is the mechanism?
       Not what is the correlation, but what causes what..."`}
            language="text"
            title="Sample Results"
          />
        </div>

        {/* Section Numbers */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <h3 className="font-semibold text-foreground">Understanding §n References</h3>
          <p className="text-sm text-muted-foreground">
            Each <strong>§n</strong> is a stable reference to a specific section of the transcript.
            These don&apos;t change between versions, so you can cite them reliably:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>
              • <strong>§58</strong> — Always refers to the same passage
            </li>
            <li>
              • <strong>§78</strong> — Can be linked to the full transcript
            </li>
            <li>
              • <strong>§161</strong> — Works as citation anchors in your artifacts
            </li>
          </ul>
        </div>

        {/* Your Search */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              2
            </span>
            Search Your Topic
          </h2>
          <p className="text-sm text-muted-foreground">
            Now try searching for something related to YOUR research domain:
          </p>
          <TutorialCodeBlock
            code={`# Replace with your topic
./brenner corpus search "YOUR_TOPIC_HERE"

# Examples:
./brenner corpus search "causation"
./brenner corpus search "experimental design"
./brenner corpus search "hypothesis testing"`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Note References */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-[oklch(0.72_0.19_145/0.15)] text-[oklch(0.72_0.19_145)] text-sm font-bold">
              ✎
            </span>
            Note Your References
          </h2>
          <p className="text-sm text-muted-foreground">
            As you search, <strong>note 3-5 §n references</strong> that seem most relevant to your
            question. You&apos;ll use these in the next step to build an excerpt.
          </p>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-sm font-medium text-muted-foreground mb-2">My relevant sections:</p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-sm text-muted-foreground"
                >
                  §___
                </div>
              ))}
            </div>
          </div>
        </div>

        <ProTip>
          Don&apos;t worry about finding &quot;perfect&quot; matches. Brenner&apos;s wisdom often
          applies metaphorically — insights about molecular biology can illuminate problems in
          economics or computer science. Look for methodological parallels, not just topic matches.
        </ProTip>

        <Note>
          The corpus includes three distillation sources (GPT, Gemini, Opus) that provide different
          perspectives on Brenner&apos;s ideas. Try <code>./brenner corpus list</code> to see all
          available content.
        </Note>

        {/* Next Step */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> You&apos;ll take your noted §n
            references and build them into a focused excerpt document.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
