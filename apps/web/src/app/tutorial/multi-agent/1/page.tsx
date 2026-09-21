"use client";

/**
 * Multi-Agent Cockpit Step 1: Install Infrastructure
 *
 * Set up ntm (Named Tmux Manager), Agent Mail, and the brenner CLI.
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
    problem: "ntm: command not found",
    symptoms: ["Terminal shows 'command not found' after running ntm"],
    solution:
      "Make sure ntm is installed and in your PATH. Restart your terminal after installation.",
    commands: ["cargo install ntm", "# Or download binary from releases"],
  },
  {
    problem: "Agent Mail server won't start",
    symptoms: ["Error binding to port 8765", "Connection refused"],
    solution:
      "Check if another process is using port 8765. You can specify a different port with --port.",
    commands: ["lsof -i :8765", "# Kill the process or use a different port"],
  },
  {
    problem: "brenner CLI not found after install",
    symptoms: ["'brenner: command not found' after running install script"],
    solution: "The install script adds brenner to ~/bin. Make sure this is in your PATH.",
    commands: ['export PATH="$HOME/bin:$PATH"', "# Add to ~/.bashrc or ~/.zshrc"],
  },
];

const stepData: TutorialStepType = {
  id: "mac-1",
  pathId: "multi-agent-cockpit",
  stepNumber: 1,
  title: "Install Infrastructure",
  estimatedTime: "~15 min",
  whatYouLearn: [
    "How to orchestrate multiple terminal sessions with ntm",
    "The Agent Mail message-passing architecture",
    "Setting up the brenner CLI for session management",
  ],
  whatYouDo: [
    "Install ntm (Named Tmux Manager)",
    "Set up and start Agent Mail server",
    "Install and verify the brenner CLI",
  ],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep1() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(0);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      disableBack
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/2");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-destructive/5 via-destructive/10 to-accent/5 border border-destructive/20">
          <h2 className="text-xl font-semibold mb-4">The Multi-Agent Stack</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Running three AI agents in parallel requires coordination infrastructure. You&apos;ll
            set up:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center size-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong className="text-foreground">ntm</strong> — Named Tmux Manager for running
                agents in persistent terminal sessions
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center size-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong className="text-foreground">Agent Mail</strong> — Message-passing server for
                agent coordination
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center size-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold shrink-0 mt-0.5">
                3
              </span>
              <span>
                <strong className="text-foreground">brenner CLI</strong> — Session management and
                artifact compilation
              </span>
            </li>
          </ul>
        </div>

        {/* ntm Installation */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Install ntm (Named Tmux Manager)
          </h2>
          <p className="text-sm text-muted-foreground">
            ntm lets you create named tmux sessions and panes. Each AI agent will run in its own
            pane, allowing you to monitor all three simultaneously.
          </p>

          <div className="p-4 rounded-xl border border-border bg-card/50 space-y-3">
            <p className="text-sm font-medium">Install via Cargo (Rust):</p>
            <TutorialCodeBlock code="cargo install ntm" language="bash" title="Terminal" />
            <p className="text-xs text-muted-foreground">
              Don&apos;t have Rust? Install with:{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted">
                curl --proto &apos;=https&apos; --tlsv1.2 -sSf https://sh.rustup.rs | sh
              </code>
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card/50 space-y-3">
            <p className="text-sm font-medium">Or download pre-built binary:</p>
            <TutorialCodeBlock
              code={`# Visit releases page and download for your platform
# https://github.com/Dicklesworthstone/ntm/releases

# Example for Linux x64:
wget https://github.com/Dicklesworthstone/ntm/releases/latest/download/ntm-linux-x64
chmod +x ntm-linux-x64
sudo mv ntm-linux-x64 /usr/local/bin/ntm`}
              language="bash"
              title="Terminal"
            />
          </div>

          <p className="text-sm text-muted-foreground">Verify installation:</p>
          <TutorialCodeBlock code="ntm --version" language="bash" title="Terminal" />
        </div>

        {/* Agent Mail Installation */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              2
            </span>
            Set Up Agent Mail
          </h2>
          <p className="text-sm text-muted-foreground">
            Agent Mail is the coordination bus. Agents post messages to threads, read their inbox,
            and acknowledge receipt. This enables asynchronous collaboration.
          </p>

          <TutorialCodeBlock
            code={`# Clone the Agent Mail repository
git clone https://github.com/Dicklesworthstone/mcp-agent-mail.git
cd mcp-agent-mail

# Install dependencies
bun install

# Start the server
bun run start`}
            language="bash"
            title="Terminal"
          />

          <p className="text-sm text-muted-foreground">
            In a <strong>new terminal</strong>, verify the server is running:
          </p>
          <TutorialCodeBlock
            code={`curl http://127.0.0.1:8765/mcp/health
# Expected: {"status":"ok","version":"..."}`}
            language="bash"
            title="Terminal"
          />

          <ProTip>
            Keep Agent Mail running in its own terminal tab. You can also run it as a background
            service or use tmux to keep it alive. The server persists messages to disk, so
            restarting is safe.
          </ProTip>
        </div>

        {/* brenner CLI Installation */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              3
            </span>
            Install the brenner CLI
          </h2>
          <p className="text-sm text-muted-foreground">
            The brenner CLI manages research sessions, compiles artifacts from agent deltas, and
            provides utilities for corpus search and excerpt building.
          </p>

          <TutorialCodeBlock
            code={`# Clone the BrennerBot repository
git clone https://github.com/Dicklesworthstone/brenner_bot.git
cd brenner_bot

# Run the installer
./install.sh`}
            language="bash"
            title="Terminal"
          />

          <p className="text-sm text-muted-foreground">Verify installation:</p>
          <TutorialCodeBlock
            code={`brenner --version
brenner doctor`}
            language="bash"
            title="Terminal"
          />

          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-sm font-medium mb-2">
              What <code>brenner doctor</code> checks:
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✓ Corpus file exists and is readable</li>
              <li>✓ Dependencies are installed</li>
              <li>✓ Configuration is valid</li>
              <li>✓ Agent Mail is reachable (if configured)</li>
            </ul>
          </div>
        </div>

        {/* Verification */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-[oklch(0.72_0.19_145/0.15)] text-[oklch(0.72_0.19_145)] text-sm font-bold">
              ✓
            </span>
            Verify Everything
          </h2>
          <p className="text-sm text-muted-foreground">
            Run these commands to confirm all infrastructure is ready:
          </p>
          <TutorialCodeBlock
            code={`# Check ntm
ntm --version

# Check Agent Mail health
curl http://127.0.0.1:8765/mcp/health

# Check brenner CLI
brenner --version
brenner doctor`}
            language="bash"
            title="Terminal"
          />
        </div>

        <Warning>
          <strong>Hardware requirements:</strong> Running three AI agents simultaneously requires
          significant resources. We recommend at least 32GB RAM and 8+ CPU cores. A 64GB RAM VPS
          (like Contabo Cloud VPS 50) works well for persistent sessions.
        </Warning>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Infrastructure Ready?</strong>{" "}
            <span className="text-muted-foreground">
              If all three tools are working, you&apos;re ready to configure your AI agent
              subscriptions in the next step.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
