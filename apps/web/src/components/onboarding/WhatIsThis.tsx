"use client";

/**
 * WhatIsThis - Onboarding section for first-time visitors
 *
 * Provides:
 * 1. Brief explanation of what BrennerBot is
 * 2. Guided entry points based on user intent
 * 3. Can be dismissed and remembered via localStorage
 */

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface GuidedPath {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
}

// ============================================================================
// Icons
// ============================================================================

const BookOpenIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const BeakerIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5"
    />
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

const XIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LightbulbIcon = () => (
  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

// ============================================================================
// Data
// ============================================================================

const guidedPaths: GuidedPath[] = [
  {
    id: "new",
    title: "New to Brenner?",
    description: "Start with curated excerpts that capture his core insights",
    href: "/corpus/quote-bank",
    icon: <BookOpenIcon />,
    accent: "primary",
  },
  {
    id: "compare",
    title: "Compare AI syntheses",
    description: "See how GPT, Claude, and Gemini interpret his method",
    href: "/distillations",
    icon: <SparklesIcon />,
    accent: "accent",
  },
  {
    id: "method",
    title: "Learn the framework",
    description: "Explore the operators and Bayesian crosswalk",
    href: "/method",
    icon: <BeakerIcon />,
    accent: "success",
  },
];

// ============================================================================
// localStorage
// ============================================================================

const STORAGE_KEY = "brenner-onboarding-dismissed";

function useOnboardingDismissed() {
  const [dismissed, setDismissed] = React.useState<boolean | null>(null);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setDismissed(true);
    } catch {
      setDismissed(true);
    }
  }, []);

  const reset = React.useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, []);

  return { dismissed, dismiss, reset, isLoading: dismissed === null };
}

// ============================================================================
// Main Component
// ============================================================================

export function WhatIsThis({ className }: { className?: string }) {
  const { dismissed, dismiss, isLoading } = useOnboardingDismissed();

  // Don't render while loading from localStorage (prevents flash)
  if (isLoading) {
    return null;
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3 }}
          className={cn("relative", className)}
        >
          <div className="rounded-2xl border border-border bg-gradient-to-br from-muted/30 via-background to-muted/20 overflow-hidden">
            {/* Dismiss button */}
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors z-10 touch-manipulation active:scale-95"
              aria-label="Dismiss introduction"
            >
              <XIcon />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary shrink-0">
                  <LightbulbIcon />
                </div>
                <div className="space-y-2 pr-8">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    What is BrennerBot?
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Sydney Brenner</strong> (1927–2019) was one
                    of the most successful experimental biologists in history. But his{" "}
                    <em>method</em> is more valuable than any single discovery.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    This project reverse-engineers his cognitive architecture and makes it
                    <strong className="text-foreground">
                      {" "}
                      executable for AI-assisted research
                    </strong>
                    .
                  </p>
                </div>
              </div>

              {/* Guided Entry Points */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Choose your path:</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {guidedPaths.map((path) => (
                    <GuidedPathCard key={path.id} path={path} />
                  ))}
                </div>
              </div>

              {/* Dismiss hint */}
              <p className="text-xs text-muted-foreground/70 text-center">
                This introduction won&apos;t show again once you dismiss it.
              </p>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function GuidedPathCard({ path }: { path: GuidedPath }) {
  const accentClasses: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
    accent: { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30" },
    success: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  };

  const colors = accentClasses[path.accent] || accentClasses.primary;

  return (
    <Link
      href={path.href}
      className={cn(
        "group flex flex-col p-4 rounded-xl border bg-card transition-all",
        "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        colors.border,
        "hover:border-opacity-60",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "flex items-center justify-center size-8 rounded-lg",
            colors.bg,
            colors.text,
          )}
        >
          {path.icon}
        </div>
        <span className={cn("text-sm font-semibold", colors.text)}>{path.title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1">{path.description}</p>
      <div
        className={cn(
          "flex items-center gap-1 mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity",
          colors.text,
        )}
      >
        <span>Get started</span>
        <ArrowRightIcon />
      </div>
    </Link>
  );
}

// ============================================================================
// Export hook for external reset functionality
// ============================================================================

export { useOnboardingDismissed };
