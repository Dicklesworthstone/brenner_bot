"use client";

/**
 * ErrorBoundary Component
 *
 * Catches render errors in child component trees and displays
 * a recovery prompt.
 *
 * @see brenner_bot-ft14 (bead)
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { createRecoveryNotice } from "@/lib/brenner-loop/errorRecovery";
import { ErrorRecoveryModal } from "./ErrorRecoveryModal";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  info?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null, info: undefined });
  };

  render() {
    const { error } = this.state;
    const { fallback } = this.props;

    if (error) {
      if (typeof fallback === "function") {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      const notice = createRecoveryNotice(
        "Something went wrong",
        "An unexpected error interrupted this view. You can retry or continue without losing saved data.",
        "error",
        [
          { label: "Retry", action: this.reset, variant: "default" },
          { label: "Continue Without", action: this.reset, variant: "outline" },
        ],
        error.message,
      );

      return (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <ErrorRecoveryModal open notice={notice} onOpenChange={(open) => !open && this.reset()} />
          <div className="text-sm text-muted-foreground">{error.message}</div>
          <Button size="sm" variant="outline" onClick={this.reset}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
