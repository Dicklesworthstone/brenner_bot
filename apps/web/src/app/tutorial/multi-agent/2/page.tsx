"use client";

/**
 * Multi-Agent Cockpit Step 2: Configure Agent Subscriptions
 *
 * Ensure you have active API access to Claude, GPT, and Gemini.
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
    problem: "Claude Code authentication fails",
    symptoms: ["'Authentication required' errors", "Unable to start Claude Code"],
    solution:
      "Run 'claude auth' to re-authenticate. Make sure you have an active Claude Max subscription.",
    commands: ["claude auth"],
  },
  {
    problem: "Codex quota exceeded",
    symptoms: ["Rate limit errors", "429 responses"],
    solution:
      "Check your OpenAI usage dashboard. Consider upgrading your tier or waiting for quota reset.",
  },
  {
    problem: "Gemini CLI not connecting",
    symptoms: ["Connection timeouts", "API errors"],
    solution: "Verify your Google AI Studio API key is valid and has Gemini access.",
    commands: ["gemini auth status"],
  },
];

const stepData: TutorialStepType = {
  id: "mac-2",
  pathId: "multi-agent-cockpit",
  stepNumber: 2,
  title: "Configure Agent Subscriptions",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "API key management across providers",
    "Rate limits and cost considerations",
    "How to verify agent access",
  ],
  whatYouDo: [
    "Verify Claude Code / Claude Max access",
    "Verify Codex / GPT Pro access",
    "Verify Gemini CLI / Gemini Ultra access",
  ],
  troubleshooting,
};

// ============================================================================
// Agent Card Component
// ============================================================================

interface AgentCardProps {
  name: string;
  model: string;
  subscription: string;
  color: string;
  children: React.ReactNode;
}

function AgentCard({ name, model, subscription, color, children }: AgentCardProps) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: color }}
        >
          {name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-xs text-muted-foreground">
            {model} • {subscription}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep2() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(1);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/1");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/3");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Multi-agent research requires active subscriptions to three AI providers. Each agent
            brings unique strengths to the research process.
          </p>

          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Cost Consideration:</strong> Running all three
              agents for a full session (1-2 hours) typically costs $5-15 in API usage, depending on
              context length and iteration count. Monitor your usage dashboards.
            </p>
          </div>
        </div>

        {/* Claude Configuration */}
        <AgentCard name="Claude" model="Opus 4.5" subscription="Claude Max" color="#8B5CF6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Claude Code is Anthropic&apos;s coding agent CLI. It requires a Claude Max
              subscription for access to Opus 4.5 (the most capable model).
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Install & Verify
              </p>
              <TutorialCodeBlock
                code={`# Install Claude Code (if not already installed)
# See: https://github.com/anthropics/claude-code

# Verify installation
claude --version

# Authenticate (opens browser)
claude auth

# Test with a simple prompt
claude "What is 2 + 2?"`}
                language="bash"
                title="Terminal"
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-purple-500"></span>
              <span className="text-muted-foreground">
                Best for: Test design, careful reasoning, nuanced analysis
              </span>
            </div>
          </div>
        </AgentCard>

        {/* GPT/Codex Configuration */}
        <AgentCard name="Codex" model="GPT 5.2" subscription="GPT Pro" color="#10B981">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Codex CLI is OpenAI&apos;s coding agent. GPT Pro subscription unlocks extended context
              and higher rate limits needed for research sessions.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Install & Verify
              </p>
              <TutorialCodeBlock
                code={`# Install Codex CLI (if not already installed)
# See: https://github.com/openai/codex-cli

# Verify installation
codex --version

# Set your API key
export OPENAI_API_KEY="your-key-here"

# Test with a simple prompt
codex "What is 2 + 2?"`}
                language="bash"
                title="Terminal"
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-emerald-500"></span>
              <span className="text-muted-foreground">
                Best for: Creative hypotheses, broad knowledge, cross-domain connections
              </span>
            </div>
          </div>
        </AgentCard>

        {/* Gemini Configuration */}
        <AgentCard name="Gemini" model="Gemini 3" subscription="Gemini Ultra" color="#EA580C">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Gemini CLI is Google&apos;s coding agent. Gemini Ultra provides access to the most
              powerful Gemini model with extended context.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Install & Verify
              </p>
              <TutorialCodeBlock
                code={`# Install Gemini CLI (if not already installed)
# See: Google AI Studio for API access

# Verify installation
gemini --version

# Set your API key
export GOOGLE_AI_API_KEY="your-key-here"

# Test with a simple prompt
gemini "What is 2 + 2?"`}
                language="bash"
                title="Terminal"
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full bg-orange-500"></span>
              <span className="text-muted-foreground">
                Best for: Adversarial critique, edge-case finding, skeptical analysis
              </span>
            </div>
          </div>
        </AgentCard>

        {/* Verification Script */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-[oklch(0.72_0.19_145/0.15)] text-[oklch(0.72_0.19_145)] text-sm font-bold">
              ✓
            </span>
            Verify All Agents
          </h2>
          <p className="text-sm text-muted-foreground">
            Run this script to verify all three agents are accessible:
          </p>
          <TutorialCodeBlock
            code={`#!/bin/bash
echo "=== Multi-Agent Prereq Check ==="

# Check Claude Code
claude --version && echo "✓ Claude Code" || echo "✗ Claude Code missing"

# Check Codex
codex --version && echo "✓ Codex" || echo "✗ Codex missing"

# Check Gemini CLI
gemini --version && echo "✓ Gemini CLI" || echo "✗ Gemini CLI missing"

echo "=== End Check ==="`}
            language="bash"
            title="check-agents.sh"
          />
        </div>

        <Warning>
          <strong>API Keys are sensitive:</strong> Never commit API keys to version control. Use
          environment variables or a secrets manager. The brenner CLI can read keys from environment
          variables or a <code>.env</code> file.
        </Warning>

        <ProTip>
          If budget is a concern, you can start with just one or two agents. Claude + Codex is a
          strong pair for hypothesis generation and test design. Add Gemini for the full adversarial
          critique capability.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">All Agents Ready?</strong>{" "}
            <span className="text-muted-foreground">
              If all three CLI tools respond to <code>--version</code>, you&apos;re ready to define
              your research roster in the next step.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
