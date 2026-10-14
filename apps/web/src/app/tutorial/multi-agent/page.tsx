import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackground } from "@/components/ui/animated-element";

export const metadata: Metadata = {
  title: "Multi-Agent Cockpit",
  description:
    "Orchestrate a research group with Claude, GPT, and Gemini working in parallel via Agent Mail.",
};

// ============================================================================
// Icons
// ============================================================================

const ArrowLeftIcon = () => (
  <svg
    className="size-4 transition-transform group-hover:-translate-x-1"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="size-4 transition-transform group-hover:translate-x-1"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const UsersIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="size-4 text-muted-foreground"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    className="size-5 text-emerald-500 shrink-0"
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
// Steps Data
// ============================================================================

const steps = [
  {
    number: 1,
    title: "Install Infrastructure & Skill",
    duration: "~15 min",
    description:
      "Set up ntm (Named Tmux Manager), the /brennerbot-with-ntm skill via jsm, Agent Mail, and the brenner CLI.",
    whatYouLearn: [
      "How to install ntm and the /brennerbot-with-ntm skill via jeffreys-skills.md (jsm)",
      "The Agent Mail message-passing and NTM robot-flag control plane",
    ],
  },
  {
    number: 2,
    title: "Configure Agent Subscriptions",
    duration: "~10 min",
    description: "Ensure you have active CLI access to Claude Code, Codex CLI, and Gemini CLI.",
    whatYouLearn: [
      "Subscription-based CLI authentication across providers",
      "Rate limits, context management, and NTM health checks",
    ],
  },
  {
    number: 3,
    title: "Define Your Roster",
    duration: "~10 min",
    description:
      "Map agents to roles: Hypothesis Generator, Test Designer, Adversarial Critic, Devil's Advocate, and Synthesis.",
    whatYouLearn: ["Role-based agent orchestration", "The canonical Brenner research personas"],
  },
  {
    number: 4,
    title: "Write Your Kickoff Prompt",
    duration: "~10 min",
    description: "Craft the initial research prompt that will seed all collaborating agents.",
    whatYouLearn: ["Multi-agent prompt design", "How to seed productive disagreement"],
  },
  {
    number: 5,
    title: "Launch the Session",
    duration: "~5 min",
    description:
      "Use ntm spawn / ntm pipeline run and the brenner CLI to launch agents and send the kickoff via Agent Mail.",
    whatYouLearn: ["The session start & NTM pipeline workflow", "How Agent Mail threads work"],
  },
  {
    number: 6,
    title: "Monitor Agent Collaboration",
    duration: "~30 min",
    description:
      "Monitor with ntm --robot-snapshot / --robot-attention as agents debate, propose, and critique.",
    whatYouLearn: [
      "Event-driven monitoring with NTM robot flags",
      "When and how to intervene as operator",
    ],
  },
  {
    number: 7,
    title: "Compile Deltas into Artifact",
    duration: "~10 min",
    description:
      "Use the brenner CLI to merge agent contributions into a unified research artifact.",
    whatYouLearn: ["The delta merge algorithm", "Artifact structure and versioning"],
  },
  {
    number: 8,
    title: "Score the Session",
    duration: "~10 min",
    description:
      "Evaluate the session using the 7-dimension Brenner scorecard and Opportunity Matrix (Score >= 2.0).",
    whatYouLearn: ["The evaluation rubric", "How to identify session quality issues"],
  },
  {
    number: 9,
    title: "Iterate or Publish",
    duration: "~10 min",
    description: "Either start a new session round or publish the artifact for external review.",
    whatYouLearn: ["Multi-session research programs", "Sharing artifacts with collaborators"],
  },
  {
    number: 10,
    title: "Teardown and Review",
    duration: "~10 min",
    description: "Save NTM checkpoints, clean up resources, and review what you learned.",
    whatYouLearn: [
      "Checkpoint management and session replay",
      "Post-session retrospective practices",
    ],
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function MultiAgentPage() {
  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-24">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-0">
        <Link
          href="/tutorial"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon />
          Back to Tutorial Paths
        </Link>
      </div>

      {/* Hero Section */}
      <HeroBackground
        showOrbs
        showGrid
        className="rounded-2xl sm:rounded-3xl"
        primaryOrbClass="bg-primary/25 dark:bg-primary/30"
        accentOrbClass="bg-accent/20 dark:bg-accent/25"
      >
        <div className="py-10 sm:py-12 lg:py-16 text-center space-y-4 sm:space-y-6 px-4 sm:px-6">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/15 text-primary border border-primary/25 mb-4">
            <UsersIcon />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium">
            Advanced Path • NTM + Agent Mail Control Plane
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Multi-Agent Cockpit</span>
          </h1>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Orchestrate a research group with Claude, Codex, and Gemini working in parallel via{" "}
            <code className="font-mono text-foreground text-sm">ntm</code>,{" "}
            <code className="font-mono text-foreground text-sm">/brennerbot-with-ntm</code>, and
            Agent Mail.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ClockIcon />
              ~2 hours
            </span>
            <span>•</span>
            <span>10 steps</span>
            <span>•</span>
            <span>Full NTM cockpit setup</span>
          </div>
        </div>
      </HeroBackground>

      {/* Fast-Track Skill Spotlight */}
      <section className="px-4 sm:px-0">
        <div className="max-w-3xl mx-auto p-6 sm:p-7 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card to-accent/[0.05] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-mono font-semibold">
              NEW • /brennerbot-with-ntm Skill + NTM Pipelines
            </span>
            <a
              href="https://github.com/Dicklesworthstone/ntm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-primary hover:underline"
            >
              github.com/Dicklesworthstone/ntm ↗
            </a>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Automate the Cockpit with <code className="text-primary font-mono">jsm</code> and{" "}
            <code className="text-primary font-mono">ntm</code>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Instead of manually typing pane commands, you can install the{" "}
            <strong className="text-foreground">/brennerbot-with-ntm</strong> skill via{" "}
            <strong className="text-foreground">jeffreys-skills.md (jsm)</strong>. It teaches your
            orchestrator agent the mandatory 10-phase Brenner Loop, 15+1 cognitive operators, 6
            execution modes, and 6 declarative <code className="font-mono text-foreground">ntm</code>{" "}
            YAML pipelines (<code className="font-mono text-foreground">brenner-Standard.yaml</code>,{" "}
            <code className="font-mono text-foreground">brenner-Quick.yaml</code>,{" "}
            <code className="font-mono text-foreground">brenner-Adversarial.yaml</code>,{" "}
            <code className="font-mono text-foreground">brenner-Literature.yaml</code>,{" "}
            <code className="font-mono text-foreground">brenner-Design.yaml</code>,{" "}
            <code className="font-mono text-foreground">brenner-Synthesis.yaml</code>).
          </p>
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-200 overflow-x-auto">
            <pre className="leading-relaxed">{`# 1. Install ntm (Named Tmux Manager - Go control plane)
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/ntm/main/install.sh | bash

# 2. Install jeffreys-skills.md CLI (jsm) + /brennerbot-with-ntm
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/jeffreys-skills.md/main/install.sh | bash
jsm install brennerbot-with-ntm

# 3. Spawn multi-agent session & run the Standard 10-phase pipeline
ntm spawn brenner-rs --cc=2 --cod=1 --gmi=1 --agy=1
ntm pipeline run .ntm/pipelines/brenner-Standard.yaml --session=brenner-rs \\
  --var question="Your research question"`}</pre>
          </div>
        </div>
      </section>

      {/* Prerequisites */}
      <section className="px-4 sm:px-0">
        <div className="max-w-2xl mx-auto p-6 rounded-xl border border-primary/25 bg-primary/5">
          <h3 className="font-semibold mb-3">Prerequisites</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Claude Code CLI + Claude Max subscription
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Codex CLI + GPT Pro subscription
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Gemini CLI + Gemini Ultra subscription
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              <span>
                <code className="font-mono text-foreground">ntm</code> (Named Tmux Manager) +{" "}
                <code className="font-mono text-foreground">jsm install brennerbot-with-ntm</code>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Agent Mail server (local or hosted)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              <code className="font-mono text-foreground">brenner</code> CLI installed
            </li>
          </ul>
        </div>
      </section>

      {/* Steps Overview */}
      <section className="px-4 sm:px-0">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold">What You&apos;ll Do</h2>
            <p className="text-sm text-muted-foreground">
              Ten steps to multi-agent research orchestration — click any step to jump in
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <Link
                key={step.number}
                href={`/tutorial/multi-agent/${step.number}`}
                className="group relative flex gap-4 p-4 sm:p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all block"
              >
                {/* Step number */}
                <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {step.number}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {step.duration}
                      </span>
                      <ArrowRightIcon />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  <div className="pt-2 space-y-1.5">
                    {step.whatYouLearn.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircleIcon />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection line to next step */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[36px] top-full h-4 w-px bg-gradient-to-b from-border to-transparent" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 px-4 sm:px-0">
        <div className="max-w-xl mx-auto text-center space-y-6 p-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5">
          <h3 className="text-xl font-semibold">Ready to Begin?</h3>
          <p className="text-sm text-muted-foreground">
            This advanced path sets up your multi-agent research cockpit. Make sure you have the
            prerequisites above before starting. If you&apos;re new to Brenner-style research, try
            Quick Start first.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tutorial/multi-agent/1"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Start Multi-Agent Tutorial
              <ArrowRightIcon />
            </Link>
            <Link
              href="/tutorial/quick-start"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Try Quick Start First
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
