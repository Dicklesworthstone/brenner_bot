import type { Metadata } from "next";
import Link from "next/link";
import { type PathStatus, TutorialPathGrid } from "@/components/tutorial/TutorialPathCard";
import { HeroBackground } from "@/components/ui/animated-element";
import { CollapsibleCard } from "@/components/ui/collapsible";
import type { TutorialPath } from "@/lib/tutorial-types";

export const metadata: Metadata = {
  title: "Tutorial",
  description:
    "Learn to apply the Brenner Method to your research with guided learning paths from quick start to multi-agent orchestration.",
};

// ============================================================================
// Path Definitions
// ============================================================================

const tutorialPaths: TutorialPath[] = [
  {
    id: "quick-start",
    title: "Quick Start",
    description:
      "Apply the Brenner method to your research question in 30 minutes. No special setup required — just your browser and curiosity.",
    estimatedDuration: "~30 min",
    difficulty: "beginner",
    audience: "Curious researchers, first-timers",
    prerequisites: ["git", "terminal basics", "bun"],
    totalSteps: 7,
    available: true,
    href: "/tutorial/quick-start",
  },
  {
    id: "agent-assisted",
    title: "Agent-Assisted Research",
    description:
      "Let your AI coding agent learn and apply the methodology alongside you. The highest-leverage path for power users.",
    estimatedDuration: "~45 min",
    difficulty: "intermediate",
    audience: "Power users with Claude Code or Codex",
    prerequisites: ["Claude Max or GPT Pro subscription"],
    totalSteps: 8,
    available: true,
    href: "/tutorial/agent-assisted",
  },
  {
    id: "multi-agent-cockpit",
    title: "Multi-Agent Cockpit",
    description:
      "Orchestrate a research group with Claude, GPT, and Gemini working in parallel via Agent Mail. Full infrastructure setup.",
    estimatedDuration: "~2 hours",
    difficulty: "advanced",
    audience: "Advanced practitioners",
    prerequisites: ["All three CLI agents", "ntm", "Agent Mail"],
    totalSteps: 10,
    available: true,
    href: "/tutorial/multi-agent",
  },
];

// Default status for all paths (in a real app, this would come from localStorage/API)
const defaultPathStatus: Record<string, PathStatus> = {
  "quick-start": "available",
  "agent-assisted": "available",
  "multi-agent-cockpit": "available",
};

// ============================================================================
// FAQ Data
// ============================================================================

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Which path is right for me?",
    answer:
      "Start with Quick Start if you're new. It requires no special setup and gives you a taste of the methodology. Move to Agent-Assisted if you already use Claude Code or Codex — it's the highest-leverage path. Only choose Multi-Agent if you're ready to run persistent infrastructure.",
  },
  {
    question: "What if I get stuck?",
    answer:
      'Every step has a "Troubleshooting" section. If that doesn\'t help, check our GitHub Issues or file a new one describing your problem.',
  },
  {
    question: "Can I switch paths?",
    answer:
      "Yes! The paths share some concepts. If Quick Start feels too basic, jump to Agent-Assisted. If Agent-Assisted is missing orchestration, move to Multi-Agent.",
  },
  {
    question: "Do I need to pay for AI subscriptions?",
    answer:
      "Quick Start works with any AI chat interface (even free tiers). Agent-Assisted requires Claude Max or GPT Pro. Multi-Agent requires all three subscriptions (Claude Max, GPT Pro, Gemini Ultra).",
  },
];

// ============================================================================
// Icons
// ============================================================================

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

// ============================================================================
// Main Component
// ============================================================================

export default function TutorialPage() {
  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-24">
      {/* Hero Section */}
      <HeroBackground
        showOrbs
        showGrid
        className="rounded-2xl sm:rounded-3xl"
        primaryOrbClass="bg-primary/25 dark:bg-primary/30"
        accentOrbClass="bg-accent/20 dark:bg-accent/25"
      >
        <div className="py-10 sm:py-12 lg:py-20 text-center space-y-4 sm:space-y-6 px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium animate-fade-in">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
            </span>
            Interactive Tutorial
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight animate-fade-in-up stagger-1">
            <span className="text-gradient-primary">Apply the Brenner Method</span>
            <br />
            <span className="text-foreground">to Your Research</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed animate-fade-in-up stagger-2">
            Three learning paths from quick start to multi-agent orchestration. Choose your level
            and start applying Brenner&apos;s scientific methodology today.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-4 px-4 sm:px-0 animate-fade-in-up stagger-3">
            <Link
              href="#paths"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Choose Your Path
              <ArrowRightIcon />
            </Link>
            <Link
              href="/method"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl border border-border bg-card text-foreground font-medium shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
            >
              Learn the Method First
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </HeroBackground>

      {/* Path Selection Section */}
      <section id="paths" className="scroll-mt-8 space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div className="text-center space-y-2 sm:space-y-3">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
            Choose Your Learning Path
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Each path is designed for different skill levels and time commitments. Start where you
            are — you can always switch later.
          </p>
        </div>

        <TutorialPathGrid
          paths={tutorialPaths}
          pathStatus={defaultPathStatus}
          recommendedPathId="quick-start"
        />
      </section>

      {/* FAQ Section */}
      <section className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div className="text-center space-y-2 sm:space-y-3">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Common questions about the tutorial paths
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqItems.map((item, index) => (
            <CollapsibleCard key={index} title={item.question} defaultOpen={index === 0}>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
            </CollapsibleCard>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-8 px-4 sm:px-0">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Not sure where to start?</p>
          <Link
            href="/tutorial/quick-start"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
          >
            Start with Quick Start
            <ArrowRightIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}
