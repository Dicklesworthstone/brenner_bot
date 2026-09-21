"use client";

/**
 * Multi-Agent Cockpit Step 6: Monitor Agent Collaboration
 *
 * Watch as agents debate, propose, and critique. Intervene when needed.
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
    problem: "Agent is stuck or not responding",
    symptoms: ["No new messages for 5+ minutes", "Agent seems to be in a loop"],
    solution:
      "Check the agent's terminal for errors. You may need to restart the agent or send a nudge message.",
    commands: [
      "brenner send --to BlueLake --subject 'Nudge' --body 'Please continue with your analysis.'",
    ],
  },
  {
    problem: "Agents are all agreeing too much",
    solution:
      "Send an intervention asking the adversarial critic to challenge the consensus more aggressively.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-6",
  pathId: "multi-agent-cockpit",
  stepNumber: 6,
  title: "Monitor Agent Collaboration",
  estimatedTime: "~30 min",
  whatYouLearn: [
    "Reading multi-agent conversation flows",
    "When and how to intervene as operator",
    "Recognizing productive vs unproductive patterns",
  ],
  whatYouDo: ["Start agents in ntm panes", "Watch the conversation unfold", "Intervene if needed"],
  troubleshooting,
};

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep6() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(5);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/5");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/7");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            This is where the magic happens. You&apos;ll start each agent in its ntm pane, and
            they&apos;ll check Agent Mail, see their kickoff messages, and begin producing research
            artifacts.
          </p>
        </div>

        {/* Step 1: Create ntm Session */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Create ntm Session Layout
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up a tmux session with three panes — one for each agent:
          </p>

          <TutorialCodeBlock
            code={`# Create new ntm session
ntm new $SESSION_ID

# Create panes for each agent
ntm split -n codex
ntm split -n claude
ntm split -n gemini

# Verify layout
ntm list`}
            language="bash"
            title="Terminal"
          />

          <div className="p-4 rounded-xl border border-border bg-muted/30 font-mono text-xs">
            <pre className="text-muted-foreground whitespace-pre-wrap">{`┌─────────────────────────────────────────────┐
│ Pane 0: Control (you run commands here)     │
├──────────────┬──────────────┬───────────────┤
│ Pane 1:      │ Pane 2:      │ Pane 3:       │
│ codex        │ claude       │ gemini        │
│ (BlueLake)   │ (Purple...)  │ (GreenVal...) │
└──────────────┴──────────────┴───────────────┘`}</pre>
          </div>
        </div>

        {/* Step 2: Start Agents */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              2
            </span>
            Start Each Agent
          </h2>
          <p className="text-sm text-muted-foreground">
            In each ntm pane, start the corresponding agent with the session context:
          </p>

          <TutorialCodeBlock
            code={`# In Pane 1 (codex)
codex --project "$PROJECT_KEY" \\
  --agent-name BlueLake \\
  --session "$SESSION_ID"

# In Pane 2 (claude)
claude --project "$PROJECT_KEY" \\
  --agent-name PurpleMountain \\
  --session "$SESSION_ID"

# In Pane 3 (gemini)
gemini --project "$PROJECT_KEY" \\
  --agent-name GreenValley \\
  --session "$SESSION_ID"`}
            language="bash"
            title="Each Pane"
          />

          <div className="p-4 rounded-xl border border-border bg-card/50 space-y-3">
            <p className="text-sm font-medium">What each agent will do:</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Register with Agent Mail (if not already)</li>
              <li>2. Check inbox for kickoff message</li>
              <li>3. Process the kickoff based on their role</li>
              <li>4. Post a DELTA message with their contribution</li>
              <li>5. Continue iterating based on other agents&apos; responses</li>
            </ol>
          </div>
        </div>

        {/* Step 3: Monitor Progress */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              3
            </span>
            Monitor the Conversation
          </h2>
          <p className="text-sm text-muted-foreground">
            From your control pane, watch the session progress:
          </p>

          <TutorialCodeBlock
            code={`# Watch session status (updates every 5s)
brenner session status --thread-id "$SESSION_ID" --watch

# View recent messages in the thread
brenner thread view --thread-id "$SESSION_ID" --tail

# Check who has responded
brenner session contributors --thread-id "$SESSION_ID"`}
            language="bash"
            title="Control Pane"
          />
        </div>

        {/* Intervention Patterns */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">When to Intervene</h2>
          <p className="text-sm text-muted-foreground">
            As the operator, you may need to steer the conversation:
          </p>

          <div className="grid gap-3">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                🔄 Agents are looping
              </p>
              <p className="text-xs text-muted-foreground">
                Send a message asking them to move forward with current hypotheses.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                🤝 Too much agreement
              </p>
              <p className="text-xs text-muted-foreground">
                Ask the adversarial critic to challenge the consensus more aggressively.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                ❓ Missing third alternative
              </p>
              <p className="text-xs text-muted-foreground">
                Prompt: &quot;What if both leading hypotheses are wrong?&quot;
              </p>
            </div>
          </div>

          <TutorialCodeBlock
            code={`# Send an intervention message
brenner send \\
  --thread-id "$SESSION_ID" \\
  --from Orchestrator \\
  --to BlueLake,PurpleMountain,GreenValley \\
  --subject "INTERVENTION: Need third alternative" \\
  --body "Both H1 and H2 assume X is the key driver. What if neither is true?"`}
            language="bash"
            title="Intervention Example"
          />
        </div>

        <Warning>
          <strong>Let them work:</strong> Resist the urge to intervene too early. Some apparent
          disagreement is productive. Wait at least 10-15 minutes before intervening unless
          there&apos;s a clear problem.
        </Warning>

        <ProTip>
          Take notes on the conversation patterns. Which agent tends to generate the most creative
          ideas? Which asks the best critical questions? This informs future role assignments.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Session Complete?</strong>{" "}
            <span className="text-muted-foreground">
              When all three agents have posted their DELTA messages (usually 20-40 minutes),
              you&apos;re ready to compile the artifact in the next step.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
