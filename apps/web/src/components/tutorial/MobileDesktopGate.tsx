"use client";

/**
 * MobileDesktopGate - Gates terminal-required tutorial steps on mobile
 *
 * Shows a friendly notice when mobile users encounter steps that require
 * a desktop computer (terminal, CLI commands, agent execution).
 *
 * On desktop, renders children normally.
 * On mobile with desktop-required steps, shows the gate message with options.
 *
 * @see brenner_bot-1cv2 (Tutorial Mobile UX)
 * @module components/tutorial/MobileDesktopGate
 */

import { motion } from "framer-motion";
import { Bookmark, BookOpen, ChevronRight, ExternalLink, Monitor } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TutorialStepMeta } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface MobileDesktopGateProps {
  /** Step metadata (includes requiresDesktop flag) */
  step: TutorialStepMeta;
  /** Content to render on desktop or if step doesn't require desktop */
  children: React.ReactNode;
  /** Whether to still show content below the notice (read-only mode) */
  showContentOnMobile?: boolean;
  /** Callback when user clicks "Continue Anyway" */
  onContinue?: () => void;
  /** URL of the next step (for mobile skip option) */
  nextStepUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const TerminalIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
    />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

export function MobileDesktopGate({
  step,
  children,
  showContentOnMobile = true,
  onContinue,
  nextStepUrl,
  className,
}: MobileDesktopGateProps) {
  const isMobile = useIsMobile();
  const [showContent, setShowContent] = React.useState(false);

  // Desktop: render children normally
  if (!isMobile) {
    return <>{children}</>;
  }

  // Mobile: check if step requires desktop
  if (!step.requiresDesktop) {
    return <>{children}</>;
  }

  // Mobile + desktop-required: show gate
  return (
    <div className={cn("space-y-6", className)}>
      {/* Desktop Required Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-6 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <motion.div
            className="flex items-center justify-center size-12 rounded-xl bg-primary/20 text-primary shadow-sm"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Monitor className="size-6" />
          </motion.div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              This step requires a desktop computer
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              The commands below need to run in a terminal on your Mac, Windows (WSL), or Linux
              computer.
            </p>
          </div>
        </div>

        {/* What this step involves */}
        <div className="mt-5 p-4 rounded-xl bg-card/50 border border-border/50">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
            <TerminalIcon className="text-muted-foreground" />
            <span>What you&apos;ll do on desktop</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Step {step.stepNumber}: {step.title}
            </p>
            {step.mobileAlternative && <p className="text-xs italic">{step.mobileAlternative}</p>}
          </div>
        </div>

        {/* Options */}
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-foreground">You can:</p>
          <div className="grid gap-3">
            {/* Option 1: Read through */}
            {showContentOnMobile && (
              <button
                onClick={() => setShowContent((v) => !v)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                  <BookOpen className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">
                    {showContent ? "Hide step content" : "Read through this step"}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    Understand what&apos;s involved before trying on desktop
                  </span>
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    showContent && "rotate-90",
                  )}
                />
              </button>
            )}

            {/* Option 2: Bookmark */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 text-left">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <Bookmark className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Bookmark this page</span>
                <span className="text-xs text-muted-foreground block">
                  Return when you&apos;re on your computer
                </span>
              </div>
            </div>

            {/* Option 3: Continue to next */}
            {nextStepUrl && (
              <Link
                href={nextStepUrl}
                className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <div className="flex items-center justify-center size-9 rounded-lg bg-primary/20">
                  <ExternalLink className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-primary">Skip to next step</span>
                  <span className="text-xs text-muted-foreground block">
                    Some steps are mobile-friendly
                  </span>
                </div>
                <ChevronRight className="size-4 text-primary" />
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content (shown in read-only mode if user clicks through) */}
      {showContentOnMobile && showContent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="relative"
        >
          {/* Read-only overlay indicator */}
          <div className="absolute top-0 right-0 px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-bl-lg rounded-tr-xl z-10">
            Read-only preview
          </div>

          {/* Actual content */}
          <div className="pt-6 opacity-80">{children}</div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default MobileDesktopGate;
