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
    className="size-5 text-destructive"
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
    title: "Install Infrastructure",
    duration: "~15 min",
    description: "Set up ntm (Named Tmux Manager), Agent Mail, and the brenner CLI.",
    whatYouLearn: [
      "How to orchestrate multiple terminal sessions",
      "The Agent Mail message-passing architecture",
    ],
  },
  {
    number: 2,
    title: "Configure Agent Subscriptions",
    duration: "~10 min",
    description: "Ensure you have active API access to Claude, GPT, and Gemini.",
    whatYouLearn: ["API key management across providers", "Rate limits and cost considerations"],
  },
  {
    number: 3,
    title: "Define Your Roster",
    duration: "~10 min",
    description: "Map agents to roles: Hypothesis Generator, Test Designer, Adversarial Critic.",
    whatYouLearn: ["Role-based agent orchestration", "The three canonical Brenner roles"],
  },
  {
    number: 4,
    title: "Write Your Kickoff Prompt",
    duration: "~10 min",
    description: "Craft the initial research prompt that will seed all three agents.",
    whatYouLearn: ["Multi-agent prompt design", "How to seed productive disagreement"],
  },
  {
    number: 5,
    title: "Launch the Session",
    duration: "~5 min",
    description: "Use the brenner CLI to spawn agents and send the kickoff via Agent Mail.",
    whatYouLearn: ["The session start workflow", "How Agent Mail threads work"],
  },
  {
    number: 6,
    title: "Monitor Agent Collaboration",
    duration: "~30 min",
    description: "Watch as agents debate, propose, and critique. Intervene when needed.",
    whatYouLearn: [
      "Reading multi-agent conversation flows",
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
    description: "Evaluate the session using the 7-dimension Brenner scorecard.",
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
    description: "Clean up resources and review what you learned.",
    whatYouLearn: [
      "Resource management for multi-agent setups",
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
        primaryOrbClass="bg-destructive/25 dark:bg-destructive/30"
        accentOrbClass="bg-accent/20 dark:bg-accent/25"
      >
        <div className="py-10 sm:py-12 lg:py-16 text-center space-y-4 sm:space-y-6 px-4 sm:px-6">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-destructive/20 text-destructive mb-4">
            <UsersIcon />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs sm:text-sm font-medium">
            Advanced Path
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Multi-Agent Cockpit</span>
          </h1>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Orchestrate a research group with Claude, GPT, and Gemini working in parallel via Agent
            Mail. Full infrastructure setup for serious research.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ClockIcon />
              ~2 hours
            </span>
            <span>•</span>
            <span>10 steps</span>
            <span>•</span>
            <span>Full setup required</span>
          </div>
        </div>
      </HeroBackground>

      {/* Prerequisites */}
      <section className="px-4 sm:px-0">
        <div className="max-w-2xl mx-auto p-6 rounded-xl border border-destructive/30 bg-destructive/5">
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
              ntm (Named Tmux Manager) installed
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Agent Mail server (local or hosted)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              brenner CLI installed
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
              Ten steps to multi-agent research orchestration
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="group relative flex gap-4 p-4 sm:p-6 rounded-xl border border-border bg-card hover:border-destructive/30 hover:shadow-lg hover:shadow-destructive/5 transition-all"
              >
                {/* Step number */}
                <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-full bg-destructive/10 text-destructive font-bold">
                  {step.number}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-foreground group-hover:text-destructive transition-colors">
                      {step.title}
                    </h3>
                    <span className="flex-shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {step.duration}
                    </span>
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 px-4 sm:px-0">
        <div className="max-w-xl mx-auto text-center space-y-6 p-8 rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/5 via-destructive/10 to-accent/5">
          <h3 className="text-xl font-semibold">Ready to Begin?</h3>
          <p className="text-sm text-muted-foreground">
            This advanced path requires infrastructure setup. Make sure you have the prerequisites
            above before starting. If you&apos;re new to Brenner-style research, try Quick Start
            first.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tutorial/multi-agent/1"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
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
