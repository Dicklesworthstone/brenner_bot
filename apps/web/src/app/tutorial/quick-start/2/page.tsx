"use client";

/**
 * Quick Start Step 2: Prerequisites
 *
 * Verify Git, terminal, and Bun are installed.
 *
 * @see brenner_bot-s797 (Tutorial Path: Quick Start)
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
    problem: "bun: command not found",
    symptoms: ["Terminal shows 'command not found' after running bun"],
    solution:
      "Bun needs to be added to your PATH. Restart your terminal after installing, or source your shell config.",
    commands: ["source ~/.bashrc", "# or: source ~/.zshrc"],
  },
  {
    problem: "Windows: commands don't work in PowerShell",
    symptoms: ["Errors running git or bun in PowerShell"],
    solution:
      "Use WSL2 (Windows Subsystem for Linux) for the best experience. BrennerBot is designed for Unix-like environments.",
    commands: ["wsl --install"],
  },
  {
    problem: "Permission denied errors",
    symptoms: ["'Permission denied' when installing bun"],
    solution: "Use the user-level install (no sudo required) or check your directory permissions.",
  },
];

const stepData: TutorialStepType = {
  id: "qs-2",
  pathId: "quick-start",
  stepNumber: 2,
  title: "Prerequisites",
  estimatedTime: "~2 min",
  whatYouLearn: ["How to verify your development environment", "Platform-specific setup tips"],
  whatYouDo: ["Check that Git is installed", "Verify terminal access", "Install Bun (if needed)"],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function QuickStartStep2() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("quick-start", 7);
    tutorial.goToStep(1);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={7}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/quick-start/1");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/quick-start/3");
      }}
    >
      <section className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Before we clone the BrennerBot repository, let&apos;s make sure you have the required
          tools. This should only take a minute or two.
        </p>

        {/* Git Check */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              1
            </span>
            Check Git
          </h2>
          <p className="text-sm text-muted-foreground">
            Git is required to clone the repository. Most systems have it pre-installed.
          </p>
          <TutorialCodeBlock code="git --version" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">
            You should see something like{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">
              git version 2.x.x
            </code>
            . If not, install Git from{" "}
            <a
              href="https://git-scm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              git-scm.com
            </a>
            .
          </p>
        </div>

        {/* Terminal Check */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              2
            </span>
            Terminal Access
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="font-medium text-sm">macOS</p>
              <p className="text-xs text-muted-foreground mt-1">Use Terminal.app or iTerm2</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="font-medium text-sm">Linux</p>
              <p className="text-xs text-muted-foreground mt-1">Any terminal emulator works</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="font-medium text-sm">Windows</p>
              <p className="text-xs text-muted-foreground mt-1">Use WSL2 (recommended)</p>
            </div>
          </div>
        </div>

        {/* Bun Check */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              3
            </span>
            Check or Install Bun
          </h2>
          <p className="text-sm text-muted-foreground">
            Bun is a fast JavaScript runtime that BrennerBot uses. Check if you have it:
          </p>
          <TutorialCodeBlock code="bun --version" language="bash" title="Terminal" />
          <p className="text-sm text-muted-foreground">
            If Bun isn&apos;t installed, install it with this one-liner:
          </p>
          <TutorialCodeBlock
            code="curl -fsSL https://bun.sh/install | bash"
            language="bash"
            title="Install Bun"
          />
          <p className="text-sm text-muted-foreground">
            After installing, restart your terminal or run{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">source ~/.bashrc</code>{" "}
            (or <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">~/.zshrc</code>).
          </p>
        </div>

        {/* Verify All */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-[oklch(0.72_0.19_145/0.15)] text-[oklch(0.72_0.19_145)] text-sm font-bold">
              ✓
            </span>
            Verify Everything
          </h2>
          <p className="text-sm text-muted-foreground">
            Run both commands to confirm you&apos;re ready:
          </p>
          <TutorialCodeBlock
            code={`git --version
bun --version`}
            language="bash"
            title="Terminal"
          />
        </div>

        <Warning>
          <strong>Windows users:</strong> We strongly recommend using WSL2 (Windows Subsystem for
          Linux). BrennerBot&apos;s CLI is designed for Unix-like environments. Run{" "}
          <code>wsl --install</code> in PowerShell as Administrator, then follow the Linux
          instructions inside WSL.
        </Warning>

        <ProTip>
          If you already have Node.js and npm, they&apos;ll work too — but Bun is significantly
          faster for our use case. The tutorial assumes Bun, but you can substitute <code>npm</code>{" "}
          commands if needed.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Ready?</strong>{" "}
            <span className="text-muted-foreground">
              If both commands show version numbers, you&apos;re all set! Click Next to clone the
              repository.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
