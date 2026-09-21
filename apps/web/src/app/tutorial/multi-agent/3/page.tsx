"use client";

/**
 * Multi-Agent Cockpit Step 3: Define Your Roster
 *
 * Map agents to roles: Hypothesis Generator, Test Designer, Adversarial Critic.
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
    problem: "Unsure which agent to assign to which role",
    solution:
      "Start with the default mapping: Codex for hypotheses, Claude for tests, Gemini for critique. Adjust based on results.",
  },
  {
    problem: "One agent consistently underperforms",
    solution:
      "Try swapping roles. Sometimes Claude generates better hypotheses for certain domains, or Codex provides sharper critiques.",
  },
];

const stepData: TutorialStepType = {
  id: "mac-3",
  pathId: "multi-agent-cockpit",
  stepNumber: 3,
  title: "Define Your Roster",
  estimatedTime: "~10 min",
  whatYouLearn: [
    "Role-based agent orchestration",
    "The three canonical Brenner roles",
    "How to configure role-to-agent mapping",
  ],
  whatYouDo: [
    "Understand the three Brenner roles",
    "Map each agent to a role",
    "Configure the roster in brenner CLI",
  ],
  troubleshooting,
};

// ============================================================================
// Role Card Component
// ============================================================================

interface RoleCardProps {
  role: string;
  agent: string;
  agentColor: string;
  operators: string[];
  produces: string;
  discipline: string;
}

function RoleCard({ role, agent, agentColor, operators, produces, discipline }: RoleCardProps) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{role}</h3>
        <div
          className="px-3 py-1 rounded-full text-white text-xs font-medium"
          style={{ backgroundColor: agentColor }}
        >
          {agent}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Primary Operators
          </p>
          <div className="flex flex-wrap gap-2">
            {operators.map((op, i) => (
              <span key={i} className="px-2 py-1 rounded bg-muted text-xs font-mono">
                {op}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Produces
          </p>
          <p className="text-sm text-muted-foreground">{produces}</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/50 border-l-2 border-destructive">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Key Discipline
          </p>
          <p className="text-sm text-foreground">{discipline}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentStep3() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("multi-agent-cockpit", 10);
    tutorial.goToStep(2);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={10}
      onBack={() => {
        tutorial.goToPrevStep();
        router.push("/tutorial/multi-agent/2");
      }}
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/multi-agent/4");
      }}
    >
      <section className="space-y-8">
        {/* Introduction */}
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Brenner method uses <strong className="text-foreground">role specialization</strong>{" "}
            to ensure productive disagreement. Each agent gets a role-specific prompt that
            emphasizes different operators and disciplines.
          </p>

          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Why roles matter:</strong> Without role
              specialization, all three agents tend to converge on similar ideas. Roles force
              productive tension — the hypothesis generator proposes, the test designer challenges
              falsifiability, and the critic attacks the framing.
            </p>
          </div>
        </div>

        {/* The Three Roles */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The Three Canonical Roles</h2>

          <div className="grid gap-4">
            <RoleCard
              role="Hypothesis Generator"
              agent="Codex (GPT)"
              agentColor="#10B981"
              operators={["⊘ Level-split", "⊕ Cross-domain", "◊ Paradox-hunt"]}
              produces="Hypothesis slate with 2-5 candidates + third alternative"
              discipline="No mechanism = no hypothesis"
            />

            <RoleCard
              role="Test Designer"
              agent="Claude (Opus)"
              agentColor="#8B5CF6"
              operators={["✂ Exclusion-test", "⟂ Object-transpose", "🎭 Potency-check"]}
              produces="Discriminative tests that separate hypotheses"
              discipline="Every test needs a potency check"
            />

            <RoleCard
              role="Adversarial Critic"
              agent="Gemini"
              agentColor="#EA580C"
              operators={["ΔE Exception-quarantine", "† Theory-kill", "⊞ Scale-check"]}
              produces="Attacks on framing + assumption challenges"
              discipline="Attack the framing, not just the details"
            />
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              1
            </span>
            Configure the Roster
          </h2>
          <p className="text-sm text-muted-foreground">
            The brenner CLI accepts a role map that assigns each agent identity to a role. Agent
            identities in Agent Mail use adjective+noun names (like BlueLake, PurpleMountain).
          </p>

          <TutorialCodeBlock
            code={`# Example role map for brenner session start
--role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,GreenValley=adversarial_critic"

# Breaking it down:
# BlueLake     → Codex (GPT)   → hypothesis_generator
# PurpleMountain → Claude (Opus) → test_designer
# GreenValley  → Gemini       → adversarial_critic`}
            language="bash"
            title="Role Mapping"
          />
        </div>

        {/* Agent Names */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
              2
            </span>
            Agent Identity Names
          </h2>
          <p className="text-sm text-muted-foreground">
            Agent Mail uses adjective+noun names for agents. You&apos;ll pick names when registering
            each agent. Choose memorable names that help you track which agent is which.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">
                Codex Agent
              </p>
              <p className="text-xs text-muted-foreground mt-1">Suggested: BlueLake, GreenMeadow</p>
            </div>
            <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <p className="font-medium text-sm text-purple-600 dark:text-purple-400">
                Claude Agent
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Suggested: PurpleMountain, VioletForest
              </p>
            </div>
            <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
              <p className="font-medium text-sm text-orange-600 dark:text-orange-400">
                Gemini Agent
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Suggested: GreenValley, OrangeDesert
              </p>
            </div>
          </div>
        </div>

        {/* Alternative Mappings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Alternative Role Mappings</h2>
          <p className="text-sm text-muted-foreground">
            The default mapping works well for most research questions. But you can experiment:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium">Domain</th>
                  <th className="text-left py-2 pr-4 font-medium">Hypothesis Gen</th>
                  <th className="text-left py-2 pr-4 font-medium">Test Design</th>
                  <th className="text-left py-2 font-medium">Critic</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Biology/Medicine</td>
                  <td className="py-2 pr-4">Codex</td>
                  <td className="py-2 pr-4">Claude</td>
                  <td className="py-2">Gemini</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Computer Science</td>
                  <td className="py-2 pr-4">Claude</td>
                  <td className="py-2 pr-4">Codex</td>
                  <td className="py-2">Gemini</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Social Science</td>
                  <td className="py-2 pr-4">Gemini</td>
                  <td className="py-2 pr-4">Claude</td>
                  <td className="py-2">Codex</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Philosophy</td>
                  <td className="py-2 pr-4">Claude</td>
                  <td className="py-2 pr-4">Gemini</td>
                  <td className="py-2">Codex</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ProTip>
          Document your role mapping in a session notes file. This helps you track which
          configuration worked best for different research domains, and makes sessions reproducible.
        </ProTip>

        {/* Ready Checkpoint */}
        <div className="p-4 rounded-xl border border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]">
          <p className="text-sm">
            <strong className="text-[oklch(0.72_0.19_145)]">Roster Ready?</strong>{" "}
            <span className="text-muted-foreground">
              Pick your agent names and role assignments. In the next step, you&apos;ll write the
              kickoff prompt that seeds all three agents.
            </span>
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
