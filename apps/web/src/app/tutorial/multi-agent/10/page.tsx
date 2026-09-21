"use client";

/**
 * Multi-Agent Cockpit Step 10: Teardown and Review
 *
 * Clean up the session and reflect on what worked and what didn't.
 *
 * @see brenner_bot-nm89 (Tutorial Path: Multi-Agent Cockpit)
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialCodeBlock, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TroubleshootingItem, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const troubleshooting: TroubleshootingItem[] = [
  {
    problem: "Can't stop an agent",
    solution: "Try Ctrl+C in the agent's pane. If unresponsive, use `ntm kill <pane>`.",
  },
  {
    problem: "Lost my session files",
    solution:
      "Check the sessions/ directory. All artifacts and messages are persisted in the Agent Mail archive.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-10",
  pathId: "multi-agent-cockpit",
  stepNumber: 10,
  title: "Teardown and Review",
  estimatedTime: "~5 min",
  whatYouLearn: [
    "Proper session cleanup",
    "How to review agent performance",
    "Best practices for future sessions",
  ],
  whatYouDo: ["Stop all agents", "Archive the session", "Review what worked"],
  troubleshooting,
};

// ============================================================================
// Review Item Component
// ============================================================================

interface ReviewItemProps {
  question: string;
  description: string;
}

function ReviewItem({ question, description }: ReviewItemProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card/50 space-y-2">
      <p className="font-medium text-sm">{question}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep10() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(9);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/9");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Congratulations on completing your first multi-agent research session! Before moving on,
            let&apos;s properly clean up and extract lessons for future sessions.
          </p>
        </div>

        {/* Step 1: Stop Agents */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Stop All Agents
          </h2>
          <p className="text-sm text-muted-foreground">
            Gracefully stop each agent in their ntm panes:
          </p>

          <TutorialCodeBlock
            code={`# In each agent pane, press Ctrl+C or type:
exit

# Or use ntm to kill panes
ntm kill codex
ntm kill claude
ntm kill gemini

# Kill the entire session (optional)
ntm kill $SESSION_ID

# Verify no agents are running
ntm list`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Step 2: Archive Session */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              2
            </span>
            Archive the Session
          </h2>
          <p className="text-sm text-muted-foreground">
            Package all session files for future reference:
          </p>

          <TutorialCodeBlock
            code={`# Create archive
brenner session archive \\
  --thread-id "$SESSION_ID" \\
  --output archives/$SESSION_ID.tar.gz

# Contents of archive:
# - kickoff.md
# - all agent messages (DELTA, REVISION, etc.)
# - compiled artifact.json
# - score.json
# - session metadata

# View archive contents
tar -tzf archives/$SESSION_ID.tar.gz`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* Step 3: Review */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              3
            </span>
            Review the Session
          </h2>
          <p className="text-sm text-muted-foreground">
            Take a few minutes to reflect on what worked and what didn&apos;t:
          </p>

          <div className="grid gap-3">
            <ReviewItem
              question="Which agent performed best?"
              description="Note their model/config for future sessions with similar research questions."
            />
            <ReviewItem
              question="Where did you need to intervene?"
              description="Frequent interventions might indicate unclear kickoff prompts or role definitions."
            />
            <ReviewItem
              question="What hypotheses surprised you?"
              description="The best sessions produce ideas you wouldn't have generated alone."
            />
            <ReviewItem
              question="What would you change next time?"
              description="Capture specific improvements while the session is fresh in your mind."
            />
          </div>
        </div>

        {/* Session Log */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Export Session Log</h2>
          <p className="text-sm text-muted-foreground">
            Create a human-readable log for your research notes:
          </p>

          <TutorialCodeBlock
            code={`# Export as markdown
brenner session export \\
  --thread-id "$SESSION_ID" \\
  --format markdown \\
  --output sessions/$SESSION_ID/log.md

# View the log
cat sessions/$SESSION_ID/log.md`}
            language="bash"
            title="Terminal"
          />
        </div>

        {/* What's Next */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What&apos;s Next?</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">Run More Sessions</h3>
              <p className="text-sm text-muted-foreground">
                Practice makes perfect. Run sessions on different research questions to develop your
                orchestration intuition.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">Customize Roles</h3>
              <p className="text-sm text-muted-foreground">
                Create custom role definitions beyond the standard three. Experiment with specialist
                roles for your domain.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">Build Your Corpus</h3>
              <p className="text-sm text-muted-foreground">
                Add domain-specific excerpts to your corpus. Better context leads to better
                hypotheses.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">Automate Workflows</h3>
              <p className="text-sm text-muted-foreground">
                Use the brenner CLI in scripts to automate common patterns. Create templates for
                different research types.
              </p>
            </div>
          </div>
        </div>

        <ProTip>
          Start a &quot;session notes&quot; file. After each multi-agent session, jot down one thing
          that worked well and one thing to improve. This compounds over time.
        </ProTip>

        {/* Completion */}
        <div className="p-6 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)] space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h3 className="font-semibold text-[oklch(0.72_0.19_145)]">Tutorial Complete!</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve learned the full multi-agent cockpit workflow.
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>You now know how to:</p>
            <ul className="grid gap-1 ml-4">
              <li>• Set up the multi-agent infrastructure</li>
              <li>• Configure and assign agent roles</li>
              <li>• Write effective kickoff prompts</li>
              <li>• Launch and monitor sessions</li>
              <li>• Compile and score research artifacts</li>
              <li>• Iterate toward high-quality outputs</li>
            </ul>
          </div>
        </div>
      </section>
    </TutorialStep>
  );
}
