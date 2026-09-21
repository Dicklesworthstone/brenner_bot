import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackground } from "@/components/ui/animated-element";

export const metadata: Metadata = {
  title: "Agent-Assisted Research",
  description: "Let your AI coding agent learn and apply the Brenner methodology alongside you.",
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

const CpuIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"
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
    className="size-5 text-amber-500"
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
    title: "Why Agent-Assisted?",
    duration: "~3 min",
    href: "/tutorial/agent-assisted/1",
    description:
      "Understand the leverage of having AI internalize methodology, not just follow instructions.",
    whatYouLearn: [
      "Why agents that internalize methodology outperform prompt-following",
      "The human-AI collaboration model for research",
    ],
  },
  {
    number: 2,
    title: "Prerequisites",
    duration: "~5 min",
    href: "/tutorial/agent-assisted/2",
    description: "Verify you have Claude Code or Codex installed and ready to go.",
    whatYouLearn: [
      "How to verify your coding agent is installed",
      "The subscription requirements for each tool",
    ],
  },
  {
    number: 3,
    title: "Clone into Agent Context",
    duration: "~5 min",
    href: "/tutorial/agent-assisted/3",
    description: "Clone the BrennerBot repository and give your agent access to the codebase.",
    whatYouLearn: [
      "How to give your agent access to the Brenner corpus",
      "The key files your agent will read",
    ],
  },
  {
    number: 4,
    title: "Agent Studies the System",
    duration: "~10 min",
    href: "/tutorial/agent-assisted/4",
    description:
      "Have your agent systematically study the Brenner documentation and internalize the methodology.",
    whatYouLearn: [
      "How to have your agent build a working understanding",
      "What the agent should extract from each document",
    ],
  },
  {
    number: 5,
    title: "Define Your Research Problem",
    duration: "~5 min",
    href: "/tutorial/agent-assisted/5",
    description:
      "Formulate your research question and have the agent help refine it using Brenner criteria.",
    whatYouLearn: [
      "Brenner's criteria for good research questions",
      "How to sharpen vague questions into testable ones",
    ],
  },
  {
    number: 6,
    title: "Agent Builds the Inputs",
    duration: "~10 min",
    href: "/tutorial/agent-assisted/6",
    description:
      "Generate hypothesis slate, assumption ledger, and third alternatives using Brenner operators.",
    whatYouLearn: [
      "What artifacts the Brenner loop requires",
      "How the agent uses operators to generate alternatives",
    ],
  },
  {
    number: 7,
    title: "Agent Runs the Brenner Loop",
    duration: "~10 min",
    href: "/tutorial/agent-assisted/7",
    description:
      "Full loop execution: generate discriminative tests, rank by potency, identify exclusions.",
    whatYouLearn: [
      "How to design tests that distinguish hypotheses",
      "What makes a test 'potent' vs. weak",
    ],
  },
  {
    number: 8,
    title: "Human Review",
    duration: "~5 min",
    href: "/tutorial/agent-assisted/8",
    description:
      "Work through an interactive checklist to evaluate output quality before using results.",
    whatYouLearn: [
      "How to evaluate agent-generated research artifacts",
      "Common failure modes and how to fix them",
    ],
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAssistedPage() {
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
        primaryOrbClass="bg-amber-500/25 dark:bg-amber-500/30"
        accentOrbClass="bg-accent/20 dark:bg-accent/25"
      >
        <div className="py-10 sm:py-12 lg:py-16 text-center space-y-4 sm:space-y-6 px-4 sm:px-6">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-4">
            <CpuIcon />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium">
            Highest-Leverage Path
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Agent-Assisted Research</span>
          </h1>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Let your AI coding agent internalize and apply the Brenner methodology. The most
            powerful path for users with Claude Code or Codex.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ClockIcon />
              ~50 min
            </span>
            <span>•</span>
            <span>8 steps</span>
            <span>•</span>
            <span>Requires Claude Max or GPT Pro</span>
          </div>
        </div>
      </HeroBackground>

      {/* Prerequisites */}
      <section className="px-4 sm:px-0">
        <div className="max-w-2xl mx-auto p-6 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <h3 className="font-semibold mb-3">Prerequisites</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Claude Code CLI or Codex CLI installed
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Active Claude Max or GPT Pro subscription
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon />
              Familiarity with terminal commands
            </li>
          </ul>
        </div>
      </section>

      {/* Steps Overview */}
      <section className="px-4 sm:px-0">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold">Tutorial Steps</h2>
            <p className="text-sm text-muted-foreground">Eight steps to agent-augmented research</p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <Link
                key={step.number}
                href={step.href}
                className="group relative flex gap-4 p-4 sm:p-6 rounded-xl border border-border bg-card hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all block"
              >
                {/* Step number */}
                <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold group-hover:bg-amber-500/20 transition-colors">
                  {step.number}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
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

                {/* Arrow indicator */}
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRightIcon />
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
        <div className="max-w-xl mx-auto text-center space-y-6 p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-accent/5">
          <h3 className="text-xl font-semibold">Ready to Begin?</h3>
          <p className="text-sm text-muted-foreground">
            Start with Step 1 to understand what makes agent-assisted research different, then
            proceed through the tutorial at your own pace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tutorial/agent-assisted/1"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Start Tutorial
              <ArrowRightIcon />
            </Link>
            <Link
              href="/tutorial/quick-start"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Try Quick Start Instead
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
