"use client";

/**
 * Multi-Agent Cockpit Step 5: Launch the Session
 *
 * Use the brenner CLI to spawn agents and send the kickoff via Agent Mail.
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
    problem: "Agent Mail connection refused",
    symptoms: ["Connection error when starting session"],
    solution: "Make sure Agent Mail is running. Check: curl http://127.0.0.1:8765/mcp/health",
    commands: ["cd mcp-agent-mail && bun run start"],
  },
  {
    problem: "Agent not registered error",
    symptoms: ["from_agent not registered"],
    solution: "Register the orchestrator agent first using brenner CLI or Agent Mail directly.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-5",
  pathId: "multi-agent-cockpit",
  stepNumber: 5,
  title: "Launch the Session",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "The session start workflow",
    "How Agent Mail threads work",
    "Verifying session initialization",
  ],
  whatYouDo: [
    "Create a session thread",
    "Send kickoff to all agents",
    "Verify messages were delivered",
  ],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep5() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(4);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/4");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/6");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Now comes the exciting part — launching the multi-agent session. The brenner CLI will
            send role-specific kickoff messages to each agent via Agent Mail.
          </p>
        </div>

        {/* Step 1: Create Session */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Set Session Variables
          </h2>
          <p className="text-sm text-muted-foreground">
            First, define your session ID. Use a consistent naming convention to track sessions.
          </p>

          <TutorialCodeBlock
            code={`# Create a unique session ID
export SESSION_ID="RS-$(date +%Y%m%d)-cell-fate"
export PROJECT_KEY="$(pwd)"

echo "Session: $SESSION_ID"
echo "Project: $PROJECT_KEY"`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Step 2: The Big Command */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              2
            </span>
            Launch the Session
          </h2>
          <p className="text-sm text-muted-foreground">
            This is the main command that initializes everything:
          </p>

          <TutorialCodeBlock
            code={`brenner session start \\
  --project-key "$PROJECT_KEY" \\
  --thread-id "$SESSION_ID" \\
  --sender Orchestrator \\
  --to BlueLake,PurpleMountain,GreenValley \\
  --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,GreenValley=adversarial_critic" \\
  --kickoff-file sessions/$SESSION_ID/kickoff.md \\
  --excerpt-file excerpt.md`}
            language="bash"
            title="Terminal"
          />

          <div className="p-4 rounded-xl border border-border bg-card/50 space-y-3">
            <p className="text-sm font-medium">What this command does:</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-muted text-xs font-medium shrink-0">
                  1
                </span>
                <span>Registers the Orchestrator agent in Agent Mail</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-muted text-xs font-medium shrink-0">
                  2
                </span>
                <span>Creates a thread with the session ID</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-muted text-xs font-medium shrink-0">
                  3
                </span>
                <span>Sends role-specific kickoff messages to each agent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-muted text-xs font-medium shrink-0">
                  4
                </span>
                <span>Returns confirmation with message IDs</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Step 3: Verify Messages */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              3
            </span>
            Verify Messages Were Sent
          </h2>
          <p className="text-sm text-muted-foreground">
            Check that all three agents received their kickoff messages:
          </p>

          <TutorialCodeBlock
            code={`# Check session status
brenner session status --thread-id "$SESSION_ID"

# View the thread
brenner thread view --thread-id "$SESSION_ID" --limit 5

# Check each agent's inbox
brenner inbox --agent BlueLake --limit 3
brenner inbox --agent PurpleMountain --limit 3
brenner inbox --agent GreenValley --limit 3`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Understanding Agent Mail */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Understanding Agent Mail Threads</h2>
          <p className="text-sm text-muted-foreground">
            Agent Mail organizes messages into threads. Each session has its own thread ID.
          </p>

          <div className="p-4 rounded-xl border border-border bg-card/50 font-mono text-xs">
            <pre className="text-muted-foreground whitespace-pre-wrap">{`Thread: RS-2026-0105-cell-fate
├── [Orchestrator → BlueLake] KICKOFF: hypothesis_generator role
├── [Orchestrator → PurpleMountain] KICKOFF: test_designer role
├── [Orchestrator → GreenValley] KICKOFF: adversarial_critic role
└── (awaiting agent responses...)`}</pre>
          </div>
        </div>

        <Warning>
          <strong>Session ID is critical:</strong> Use the same session ID throughout. It&apos;s how
          Agent Mail groups related messages and how brenner compiles the final artifact.
        </Warning>

        <ProTip>
          You can watch the session in real-time with:{" "}
          <code>brenner session status --thread-id &quot;$SESSION_ID&quot; --watch</code>. This
          shows new messages as they arrive.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Session Launched?</strong>{" "}
            <span className="text-muted-foreground">
              If you see three KICKOFF messages in the thread, you&apos;re ready to run the agents
              in the next step.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
