"use client";

/**
 * Quick Start Step 3: Clone & Install
 *
 * Get the BrennerBot repository and verify the installation.
 *
 * @see brenner_bot-s797 (Tutorial Path: Quick Start)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Note,
  ProTip,
  TutorialCheckpoint,
  TutorialCodeBlock,
  TutorialStep,
} from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type {
  CheckpointData,
  TroubleshootingItem,
  TutorialStep as TutorialStepType,
} from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const troubleshooting: TroubleshootingItem[] = [
  {
    problem: "Clone fails with 'Permission denied (publickey)'",
    symptoms: ["SSH authentication error during git clone"],
    solution: "Use the HTTPS URL instead, or set up SSH keys for GitHub.",
    commands: ["git clone https://github.com/Dicklesworthstone/brenner_bot.git"],
  },
  {
    problem: "bun install hangs or times out",
    symptoms: ["Installation seems stuck", "Network timeouts"],
    solution:
      "Check your internet connection. If behind a corporate proxy, configure Bun's proxy settings.",
  },
  {
    problem: "Doctor command shows warnings",
    symptoms: ["Yellow warnings in doctor output"],
    solution:
      "Warnings about Agent Mail or optional features are fine for Quick Start. Only errors (red) need attention.",
  },
];

const checkpoint: CheckpointData = {
  title: "Installation Complete!",
  accomplishments: [
    "Cloned the BrennerBot repository",
    "Installed all dependencies",
    "Verified the installation with doctor",
  ],
  nextPreview: "Next, you'll learn to search Brenner's corpus for relevant wisdom.",
};

const stepData: TutorialStepType = {
  id: "qs-3",
  pathId: "quick-start",
  stepNumber: 3,
  title: "Clone & Install",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to set up the local BrennerBot environment",
    "Using the doctor command to verify installation",
  ],
  whatYouDo: [
    "Clone the brenner_bot repository",
    "Install dependencies with bun",
    "Run the doctor command to verify",
  ],
  troubleshooting,
  checkpoint,
};

// ============================================================================
// Main Component
// ============================================================================

export default function QuickStartStep3() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("quick-start", 7);
    tutorial.goToStep(2);
  }, [tutorial]);

  const handleNext = () => {
    tutorial.completeAndAdvance();
    router.push("/tutorial/quick-start/4");
  };

  const handleBack = () => {
    tutorial.goToPrevStep();
    router.push("/tutorial/quick-start/2");
  };

  return (
    <TutorialStep step={stepData} totalSteps={7} onBack={handleBack} onNext={handleNext}>
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Now let&apos;s get BrennerBot running on your machine. This involves cloning the
          repository, installing dependencies, and verifying everything works.
        </p>

        {/* Clone */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              1
            </span>
            Clone the Repository
          </h2>
          <p className="text-sm text-muted-foreground">
            Open your terminal and navigate to where you want to store BrennerBot, then run:
          </p>
          <TutorialCodeBlock
            code={`git clone https://github.com/Dicklesworthstone/brenner_bot.git
cd brenner_bot`}
            language="bash"
            title="Terminal"
          />
          <p className="text-sm text-muted-foreground">
            This creates a{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">brenner_bot</code>{" "}
            directory with all the source code.
          </p>
        </div>

        {/* Install */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              2
            </span>
            Install Dependencies
          </h2>
          <p className="text-sm text-muted-foreground">Bun will install all required packages:</p>
          <TutorialCodeBlock code="bun install" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">
            This may take a minute or two depending on your connection. You&apos;ll see progress as
            packages are downloaded.
          </p>
        </div>

        {/* Verify */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              3
            </span>
            Verify the Installation
          </h2>
          <p className="text-sm text-muted-foreground">
            Run the doctor command to check that everything is set up correctly:
          </p>
          <TutorialCodeBlock code="./brenner doctor" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">You should see output like this:</p>
          <TutorialCodeBlock
            code={`BrennerBot Doctor Report
========================
✓ Bun runtime: 1.x.x
✓ Dependencies installed
✓ Corpus files present
✓ CLI executable
⚠ Agent Mail: not running (optional for Quick Start)`}
            language="text"
            title="Expected Output"
          />
        </div>

        <Note>
          <strong>About the Agent Mail warning:</strong> You might see a warning that Agent Mail
          isn&apos;t running. That&apos;s perfectly fine! Agent Mail is for the advanced Multi-Agent
          Cockpit tutorial. Quick Start works without it.
        </Note>

        <ProTip>
          If you already have a <code>brenner_bot</code> clone, just run <code>git pull</code> and
          <code>bun install</code> to update to the latest version.
        </ProTip>

        {/* Checkpoint */}
        <TutorialCheckpoint data={checkpoint} onContinue={handleNext} />
      </section>
    </TutorialStep>
  );
}
