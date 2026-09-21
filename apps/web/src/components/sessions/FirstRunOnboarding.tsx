"use client";

/**
 * FirstRunOnboarding
 *
 * A lightweight first-contact experience for the Sessions area.
 * Displays a welcome modal once (persisted in localStorage).
 *
 * @see brenner_bot-nnc6
 * @module components/sessions/FirstRunOnboarding
 */

import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "brennerbot:onboarding:sessions:v1";

type StepIndex = 0 | 1 | 2;

export interface FirstRunOnboardingProps {
  className?: string;
}

function readSeenFlag(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeenFlag(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

function StepIndicator({ step }: { step: StepIndex }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", step === 0 ? "bg-primary" : "bg-muted")} />
      <span className={cn("size-2 rounded-full", step === 1 ? "bg-primary" : "bg-muted")} />
      <span className={cn("size-2 rounded-full", step === 2 ? "bg-primary" : "bg-muted")} />
      <span className="ml-2">Step {step + 1} of 3</span>
    </div>
  );
}

export function FirstRunOnboarding({ className }: FirstRunOnboardingProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<StepIndex>(0);

  React.useEffect(() => {
    if (!readSeenFlag()) {
      setOpen(true);
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      markSeenFlag();
    }
    setOpen(nextOpen);
  };

  const handleSkip = () => {
    markSeenFlag();
    setOpen(false);
  };

  const goBack = () => setStep((prev) => (prev > 0 ? ((prev - 1) as StepIndex) : prev));
  const goNext = () => setStep((prev) => (prev < 2 ? ((prev + 1) as StepIndex) : prev));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" className={cn("overflow-hidden", className)}>
        <DialogHeader separated>
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Welcome to Sessions</DialogTitle>
              <DialogDescription>
                This is where you run a Brenner Loop: hypotheses → discriminative tests → evidence →
                synthesis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <StepIndicator step={step} />

          {step === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">What you’ll do</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Write a crisp hypothesis and mechanism.</li>
                  <li>Generate tests designed to prove you wrong.</li>
                  <li>Track evidence and update confidence with an audit trail.</li>
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/sessions/new"
                  className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                  onClick={() => markSeenFlag()}
                >
                  <div className="font-medium text-foreground">Start a new session</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Create your first thread and begin with intake.
                  </div>
                </Link>
                <Link
                  href="/method"
                  className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                  onClick={() => markSeenFlag()}
                >
                  <div className="font-medium text-foreground">Read the method</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    A guided overview of the Brenner approach.
                  </div>
                </Link>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Pick a path. You can switch later — these just help you get traction fast.
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  href="/tutorial/quick-start"
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                  onClick={() => markSeenFlag()}
                >
                  <div className="font-medium text-foreground">Quick Start</div>
                  <div className="text-xs text-muted-foreground mt-1">~30 min • minimal setup</div>
                </Link>

                <Link
                  href="/tutorial/agent-assisted"
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                  onClick={() => markSeenFlag()}
                >
                  <div className="font-medium text-foreground">Agent-Assisted</div>
                  <div className="text-xs text-muted-foreground mt-1">~45 min • 1 coding agent</div>
                </Link>

                <Link
                  href="/tutorial/multi-agent"
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                  onClick={() => markSeenFlag()}
                >
                  <div className="font-medium text-foreground">Multi-Agent Cockpit</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ~2 hrs • Agent Mail + roles
                  </div>
                </Link>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <BookOpen className="size-4 text-primary" />
                  Tip: don’t “argue” your hypothesis — stress-test it.
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  The system is strongest when you force crisp predictions and demand discriminative
                  tests.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/sessions/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                  onClick={() => markSeenFlag()}
                >
                  Start session
                  <ArrowRight className="size-4" />
                </Link>
                <Button variant="outline" onClick={handleSkip}>
                  I’ll explore on my own
                </Button>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter separated>
          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="ghost" onClick={handleSkip}>
              Don’t show again
            </Button>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={goBack}>
                  Back
                </Button>
              )}

              {step < 2 ? (
                <Button onClick={goNext}>
                  Next
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FirstRunOnboarding;
