import type { Metadata } from "next";
import Link from "next/link";
import { PromptLibraryClient } from "./client";

export const metadata: Metadata = {
  title: "Prompt Templates Library | BrennerBot",
  description:
    "Versioned, tested prompts for Agent-Assisted research. Copy and paste these prompts to have your AI agent apply the Brenner methodology.",
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

const BookOpenIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

export default function PromptsPage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-0">
        <Link
          href="/tutorial"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon />
          Back to Tutorial
        </Link>
      </div>

      {/* Hero Section */}
      <div className="px-4 sm:px-0">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <BookOpenIcon />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Prompt Templates Library
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Versioned, tested prompts for the Agent-Assisted tutorial path. Each prompt has been
            verified with Claude Code and Codex CLI to produce reliable research artifacts.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[oklch(0.72_0.19_145)]" />
              Tested with Claude & Codex
            </span>
            <span>•</span>
            <span>Semver versioned</span>
            <span>•</span>
            <span>One-click copy</span>
          </div>
        </div>
      </div>

      {/* Client-side interactive content */}
      <PromptLibraryClient />

      {/* Usage Tips */}
      <section className="px-4 sm:px-0">
        <div className="max-w-3xl mx-auto p-6 rounded-xl border border-border bg-card/50">
          <h2 className="text-lg font-semibold mb-4">How to Use These Prompts</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                1
              </span>
              <span>
                <strong className="text-foreground">Fill in the variables.</strong> Each prompt has
                highlighted placeholders like{" "}
                <code className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                  [YOUR QUESTION]
                </code>{" "}
                that you need to replace with your own content.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                2
              </span>
              <span>
                <strong className="text-foreground">Copy the prompt.</strong> Click the copy button
                to get the full prompt text.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                3
              </span>
              <span>
                <strong className="text-foreground">Paste into your agent.</strong> Give the prompt
                to Claude Code, Codex, or another AI coding agent.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                4
              </span>
              <span>
                <strong className="text-foreground">Review the output.</strong> The agent will
                produce structured artifacts. Use the{" "}
                <Link
                  href="/tutorial/agent-assisted/8"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Human Review checklist
                </Link>{" "}
                to evaluate quality.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* Link to Tutorial */}
      <section className="px-4 sm:px-0 py-8">
        <div className="max-w-xl mx-auto text-center space-y-4 p-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5">
          <h3 className="text-lg font-semibold">New to Agent-Assisted Research?</h3>
          <p className="text-sm text-muted-foreground">
            These prompts are designed to be used in sequence as part of the Agent-Assisted
            tutorial. Start from the beginning to get the full context.
          </p>
          <Link
            href="/tutorial/agent-assisted"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98] touch-manipulation"
          >
            Start the Tutorial
            <svg
              className="size-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
