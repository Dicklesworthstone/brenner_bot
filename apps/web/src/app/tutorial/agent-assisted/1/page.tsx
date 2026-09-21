"use client";

/**
 * Agent-Assisted Step 1: Why Agent-Assisted?
 *
 * Introduction to the agent-assisted research workflow:
 * - The leverage of having AI internalize methodology
 * - Human-AI collaboration model
 * - What makes this the "highest-leverage path"
 *
 * @see brenner_bot-w5p6 (Tutorial Path: Agent-Assisted Research)
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ProTip, TutorialStep } from "@/components/tutorial";
import { useTutorial } from "@/lib/tutorial-context";
import type { TutorialStep as TutorialStepType } from "@/lib/tutorial-types";

// ============================================================================
// Step Data
// ============================================================================

const stepData: TutorialStepType = {
  id: "aa-1",
  pathId: "agent-assisted",
  stepNumber: 1,
  title: "Why Agent-Assisted?",
  estimatedTime: "~3 min",
  whatYouLearn: [
    "Why having your AI agent internalize methodology is high-leverage",
    "The human-AI collaboration model for research",
    "What distinguishes this from prompting an AI directly",
  ],
  whatYouDo: [
    "Understand the agent-assisted approach",
    "Learn the division of labor between human and AI",
    "Set expectations for the tutorial",
  ],
  troubleshooting: [
    {
      problem: "Not sure if I need this path",
      solution:
        "If you have Claude Max or GPT Pro and want to run multiple research loops efficiently, this is your path. Otherwise, try Quick Start first.",
    },
    {
      problem: "Confused about what a coding agent is",
      solution:
        "Claude Code and Codex are AI assistants that run in your terminal with access to files and commands. They're different from chat interfaces.",
    },
  ],
};

// ============================================================================
// Icons
// ============================================================================

const BrainIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

const RocketIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
    />
  </svg>
);

const RepeatIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
    />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedStep1() {
  const router = useRouter();
  const tutorial = useTutorial();

  React.useEffect(() => {
    tutorial.setPath("agent-assisted", 8);
    tutorial.goToStep(0);
  }, [tutorial]);

  return (
    <TutorialStep
      step={stepData}
      totalSteps={8}
      disableBack
      onNext={() => {
        tutorial.completeAndAdvance();
        router.push("/tutorial/agent-assisted/2");
      }}
    >
      {/* The Core Insight */}
      <section className="space-y-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-accent/5 border border-amber-500/20">
          <h2 className="text-xl font-semibold mb-4">The Core Insight</h2>
          <p className="text-lg text-foreground leading-relaxed mb-4">
            <strong>AI agents can internalize methodology, not just follow instructions.</strong>
          </p>
          <p className="text-muted-foreground leading-relaxed">
            When you have Claude Code or Codex read the Brenner documentation, something different
            happens than when you paste a prompt into a chat interface. The agent builds a working
            understanding of the <em>method</em>, not just the <em>task</em>.
          </p>
        </div>

        {/* Comparison: Prompting vs Agent-Assisted */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What Makes This Different</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div
              className="p-5 rounded-xl border border-border bg-card"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                    />
                  </svg>
                </span>
                <h3 className="font-semibold text-muted-foreground">Direct Prompting</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>You write detailed prompts each time</li>
                <li>AI follows instructions literally</li>
                <li>Context resets with each conversation</li>
                <li>You do the methodological thinking</li>
              </ul>
            </motion.div>

            <motion.div
              className="p-5 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center size-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <BrainIcon />
                </span>
                <h3 className="font-semibold text-amber-600 dark:text-amber-400">Agent-Assisted</h3>
              </div>
              <ul className="space-y-2 text-sm text-foreground">
                <li>Agent internalizes the methodology once</li>
                <li>AI thinks with the method, not just about it</li>
                <li>Context persists across the session</li>
                <li>Agent provides methodological discipline</li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* The Collaboration Model */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">The Human-AI Collaboration</h2>
          <p className="text-muted-foreground">
            This isn&apos;t about replacing human judgment. It&apos;s about division of labor:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-xl border border-primary/30 bg-card">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                  <UserIcon />
                </span>
                <h3 className="font-semibold">You Provide</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">+</span>
                  <span>Domain expertise and context</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">+</span>
                  <span>The research question that matters to you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">+</span>
                  <span>Judgment on what&apos;s feasible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">+</span>
                  <span>Final decisions and direction</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-amber-500/30 bg-card">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center size-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <BrainIcon />
                </span>
                <h3 className="font-semibold">Agent Provides</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">+</span>
                  <span>Methodological discipline (from Brenner)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">+</span>
                  <span>Systematic hypothesis generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">+</span>
                  <span>Third alternatives you might miss</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">+</span>
                  <span>Structured artifact creation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Why This Is High-Leverage */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Why This Is the Highest-Leverage Path</h2>

          <div className="space-y-3">
            {[
              {
                icon: <RepeatIcon />,
                title: "Reusable across questions",
                desc: "Once the agent has internalized the method, you can apply it to any research question without re-explaining the methodology.",
              },
              {
                icon: <RocketIcon />,
                title: "Faster iteration",
                desc: "The agent remembers context within a session, so you can refine hypotheses and tests without starting over.",
              },
              {
                icon: <BrainIcon />,
                title: "Consistent methodology",
                desc: "The agent applies Brenner's operators systematically, catching blind spots you might miss under time pressure.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card/50"
              >
                <span className="flex items-center justify-center size-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  {item.icon}
                </span>
                <div>
                  <h4 className="font-medium text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ProTip>
          This tutorial requires Claude Code (with Claude Max) or Codex (with GPT Pro). If you
          don&apos;t have either, try the Quick Start path first &mdash; it works with any AI chat
          interface including free tiers.
        </ProTip>

        {/* What You'll Produce */}
        <div className="p-5 rounded-xl border border-border bg-card/50">
          <h3 className="font-semibold mb-3">What You&apos;ll Produce</h3>
          <p className="text-sm text-muted-foreground mb-3">
            By the end of this tutorial, your agent will have generated a complete research
            artifact:
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Hypothesis slate with third alternatives
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Discriminative tests ranked by potency
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Explicit assumption ledger
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Adversarial critique of your framing
            </li>
          </ul>
        </div>

        {/* Next Step Preview */}
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next up:</strong> In Step 2, you&apos;ll verify that
            you have Claude Code or Codex installed and ready to go.
          </p>
        </div>
      </section>
    </TutorialStep>
  );
}
