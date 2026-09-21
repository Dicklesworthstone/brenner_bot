"use client";

/**
 * Agent-Assisted Step 2: Prerequisites
 *
 * Verify that the user has Claude Code or Codex installed.
 * Uses tool-specific tabs to show instructions for each.
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCodeBlock, TutorialStep, Warning } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-2",
  pathId: "agent-assisted",
  stepNumber: 2,
  title: "Prerequisites",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "How to verify your coding agent is installed and working",
    "The difference between Claude Code and Codex",
    "How to check your subscription tier",
  ],
  whatYouDo: [
    "Select your preferred coding agent (Claude Code or Codex)",
    "Verify installation with a test command",
    "Confirm you have the required subscription tier",
  ],
  troubleshooting: [
    {
      problem: "claude command not found",
      solution:
        "Install Claude Code: npm install -g @anthropic-ai/claude-code (requires Claude Max subscription)",
    },
    {
      problem: "codex command not found",
      solution: "Install Codex: npm install -g @openai/codex-cli (requires GPT Pro subscription)",
    },
    {
      problem: "Authentication failed",
      solution: "Run the login command for your agent and ensure your subscription is active.",
    },
  ],
};

// ============================================================================
// Types
// ============================================================================

type AgentTool = "claude-code" | "codex";

// ============================================================================
// Icons
// ============================================================================

const CheckCircleIcon = () => (
  <svg
    className="size-5 text-[oklch(0.72_0.19_145)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ============================================================================
// Tool Tab Content
// ============================================================================

function ClaudeCodeTab() {
  return (
    <div className="space-y-6">
      {/* Requirements */}
      <div className="p-4 rounded-xl border border-border bg-card/50">
        <h4 className="font-semibold mb-3">Requirements</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircleIcon />
            <span>
              <strong className="text-foreground">Claude Max</strong> subscription ($100/month or
              usage-based)
            </span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircleIcon />
            <span>Node.js 18+ installed</span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircleIcon />
            <span>Terminal access</span>
          </li>
        </ul>
      </div>

      {/* Installation */}
      <div className="space-y-3">
        <h4 className="font-semibold">1. Install Claude Code</h4>
        <p className="text-sm text-muted-foreground">
          If you haven&apos;t already, install Claude Code globally:
        </p>
        <TutorialCodeBlock
          code="npm install -g @anthropic-ai/claude-code"
          language="bash"
          title="Terminal"
        />
      </div>

      {/* Verification */}
      <div className="space-y-3">
        <h4 className="font-semibold">2. Verify Installation</h4>
        <p className="text-sm text-muted-foreground">
          Check that Claude Code is installed and accessible:
        </p>
        <TutorialCodeBlock code="claude --version" language="bash" title="Terminal" />
        <p className="text-sm text-muted-foreground">
          You should see output like:{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs">claude-code v1.x.x</code>
        </p>
      </div>

      {/* Authentication */}
      <div className="space-y-3">
        <h4 className="font-semibold">3. Authenticate</h4>
        <p className="text-sm text-muted-foreground">Log in to your Anthropic account:</p>
        <TutorialCodeBlock code="claude login" language="bash" title="Terminal" />
        <p className="text-sm text-muted-foreground">
          This will open a browser window for authentication. Ensure you&apos;re logging in with an
          account that has Claude Max.
        </p>
      </div>

      {/* Test */}
      <div className="space-y-3">
        <h4 className="font-semibold">4. Quick Test</h4>
        <p className="text-sm text-muted-foreground">Verify everything works with a simple test:</p>
        <TutorialCodeBlock
          code={`claude "What model are you running on?"`}
          language="bash"
          title="Terminal"
        />
        <p className="text-sm text-muted-foreground">
          You should see a response mentioning <strong>Opus 4.5</strong> (or similar). If you see an
          error about rate limits or authentication, check your subscription.
        </p>
      </div>
    </div>
  );
}

function CodexTab() {
  return (
    <div className="space-y-6">
      {/* Requirements */}
      <div className="p-4 rounded-xl border border-border bg-card/50">
        <h4 className="font-semibold mb-3">Requirements</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircleIcon />
            <span>
              <strong className="text-foreground">GPT Pro</strong> subscription ($200/month)
            </span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircleIcon />
            <span>Node.js 18+ installed</span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircleIcon />
            <span>Terminal access</span>
          </li>
        </ul>
      </div>

      {/* Installation */}
      <div className="space-y-3">
        <h4 className="font-semibold">1. Install Codex</h4>
        <p className="text-sm text-muted-foreground">
          If you haven&apos;t already, install Codex CLI globally:
        </p>
        <TutorialCodeBlock
          code="npm install -g @openai/codex-cli"
          language="bash"
          title="Terminal"
        />
      </div>

      {/* Verification */}
      <div className="space-y-3">
        <h4 className="font-semibold">2. Verify Installation</h4>
        <p className="text-sm text-muted-foreground">
          Check that Codex is installed and accessible:
        </p>
        <TutorialCodeBlock code="codex --version" language="bash" title="Terminal" />
        <p className="text-sm text-muted-foreground">
          You should see output like:{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs">codex-cli v1.x.x</code>
        </p>
      </div>

      {/* Authentication */}
      <div className="space-y-3">
        <h4 className="font-semibold">3. Authenticate</h4>
        <p className="text-sm text-muted-foreground">Log in to your OpenAI account:</p>
        <TutorialCodeBlock code="codex login" language="bash" title="Terminal" />
        <p className="text-sm text-muted-foreground">
          This will open a browser window for authentication. Ensure you&apos;re logging in with an
          account that has GPT Pro.
        </p>
      </div>

      {/* Test */}
      <div className="space-y-3">
        <h4 className="font-semibold">4. Quick Test</h4>
        <p className="text-sm text-muted-foreground">Verify everything works with a simple test:</p>
        <TutorialCodeBlock
          code={`codex "What model are you running on?"`}
          language="bash"
          title="Terminal"
        />
        <p className="text-sm text-muted-foreground">
          You should see a response mentioning <strong>GPT 5.2</strong> (or similar). If you see an
          error about rate limits or authentication, check your subscription.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep2() {
  const router = useRouter();
  const tutorial = useTutorial();
  const [selectedTool, setSelectedTool] = React.useState<AgentTool>("claude-code");

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(1);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      onBack={() => router.push("/tutorial/agent-assisted/1")}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted/3");
      }}
    >
      <section className="space-y-6">
        {/* Tool Selection */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Your Coding Agent</h2>
          <p className="text-muted-foreground">
            This tutorial works with either Claude Code or Codex. Select the one you have:
          </p>

          <div className="flex gap-2 p-1 rounded-xl bg-muted/50 border border-border">
            <button
              onClick={() => setSelectedTool("claude-code")}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  selectedTool === "claude-code"
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
              </svg>
              Claude Code
            </button>
            <button
              onClick={() => setSelectedTool("codex")}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  selectedTool === "codex"
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Codex
            </button>
          </div>
        </div>

        {/* Tool-Specific Instructions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTool}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedTool === "claude-code" ? <ClaudeCodeTab /> : <CodexTab />}
          </motion.div>
        </AnimatePresence>

        <Warning>
          If your test command returns an authentication or subscription error, you&apos;ll need to
          resolve that before continuing. Both Claude Max and GPT Pro are paid subscriptions &mdash;
          free tiers won&apos;t work for the coding agent features we need.
        </Warning>

        <ProTip>
          Remember which tool you chose! The rest of the tutorial will reference your selected
          agent. You can always come back here to switch if needed.
        </ProTip>

        {/* Next Step Preview */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 3, you&apos;ll clone the
            BrennerBot repository and give your agent access to the codebase.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
