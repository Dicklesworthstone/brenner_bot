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
      "Install the /brennerbot-with-ntm skill via jsm and let your AI coding agent run the 10-phase Brenner Loop alongside you.",
    estimatedDuration: "~45 min",
    difficulty: "intermediate",
    audience: "Power users with Claude Code or Codex",
    prerequisites: ["Claude Max or GPT Pro subscription", "jsm (optional)"],
    totalSteps: 8,
    available: true,
    href: "/tutorial/agent-assisted",
  },
  {
    id: "multi-agent-cockpit",
    title: "Multi-Agent Cockpit",
    description:
      "Orchestrate a research group with Claude, Codex, and Gemini working in parallel via ntm (Named Tmux Manager), /brennerbot-with-ntm pipelines, and Agent Mail.",
    estimatedDuration: "~2 hours",
    difficulty: "advanced",
    audience: "Advanced practitioners",
    prerequisites: ["All three CLI agents", "ntm + /brennerbot-with-ntm", "Agent Mail"],
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
      "Start with Quick Start if you're new. It requires no special setup and gives you a taste of the methodology. Move to Agent-Assisted if you already use Claude Code or Codex — installing /brennerbot-with-ntm via jsm makes it the highest-leverage single-agent path. Choose Multi-Agent Cockpit when you want parallel Claude + Codex + Gemini sessions orchestrated via ntm and Agent Mail.",
  },
  {
    question: "What is /brennerbot-with-ntm and how do I install it?",
    answer:
      "The /brennerbot-with-ntm skill (installed via jeffreys-skills.md / jsm) packages the mandatory 10-phase Brenner Loop, all 15+1 cognitive operators, 6 execution modes, and 6 declarative ntm YAML pipelines so your coding agents can execute the method automatically.",
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
            Interactive Tutorial • Powered by /brennerbot-with-ntm &amp; ntm
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

        {/* Fast-Track /brennerbot-with-ntm Callout */}
        <div className="max-w-4xl mx-auto mt-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-card to-accent/[0.04] p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-primary">
                <span>⚡ FAST-TRACK SKILL</span>
                <span>•</span>
                <span>jeffreys-skills.md + ntm</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Using Claude Code or Codex? Install{" "}
                <code className="font-mono text-primary">/brennerbot-with-ntm</code>
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Install the skill via <code className="font-mono text-foreground">jsm</code> and pair
                it with <code className="font-mono text-foreground">ntm</code> (Named Tmux Manager)
                to run the 10-phase Brenner Loop, 15+1 operators, and 6 YAML pipelines directly from
                your terminal.
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 font-mono text-xs text-emerald-400 shrink-0">
              <div>$ jsm install brennerbot-with-ntm</div>
              <div className="text-zinc-400">$ ntm spawn brenner-rs --cc=2 --cod=1 --gmi=1</div>
            </div>
          </div>
        </div>
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
