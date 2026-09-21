"use client";

/**
 * PredictionLock Component
 *
 * UI component for displaying and managing prediction locks in the Brenner Loop system.
 * This is the key anti-rationalization mechanism - once predictions are locked,
 * they cannot be modified (though amendments can be flagged).
 *
 * Features:
 * - Lock state visualization (draft/locked/revealed/amended)
 * - Lock button with confirmation
 * - Hash display for verification
 * - Reveal workflow for comparing predictions to outcomes
 * - Amendment tracking with credibility penalties
 *
 * @see brenner_bot-rffy (bead)
 * @see apps/web/src/lib/brenner-loop/prediction-lock.ts
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  amendPrediction,
  formatLockTimestamp,
  getLockStateDisplay,
  getShortHash,
  type LockedPrediction,
  lockPrediction,
  type PredictionLockState,
  type PredictionType,
  revealPrediction,
} from "@/lib/brenner-loop";
import { cn } from "@/lib/utils";

// ============================================================================
// Icons
// ============================================================================

const LockClosedIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const LockOpenIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
    />
  </svg>
);

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
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

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const HashtagIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5"
    />
  </svg>
);

// ============================================================================
// Helper Functions
// ============================================================================

function getStateIcon(state: PredictionLockState) {
  switch (state) {
    case "draft":
      return <PencilIcon className="size-4" />;
    case "locked":
      return <LockClosedIcon className="size-4" />;
    case "revealed":
      return <EyeIcon className="size-4" />;
    case "amended":
      return <ExclamationTriangleIcon className="size-4" />;
  }
}

function getStateColorClasses(state: PredictionLockState) {
  switch (state) {
    case "draft":
      return {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-600 dark:text-slate-400",
        border: "border-slate-300 dark:border-slate-600",
        badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
      };
    case "locked":
      return {
        bg: "bg-blue-50 dark:bg-blue-950",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-300 dark:border-blue-700",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      };
    case "revealed":
      return {
        bg: "bg-green-50 dark:bg-green-950",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-300 dark:border-green-700",
        badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      };
    case "amended":
      return {
        bg: "bg-amber-50 dark:bg-amber-950",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-300 dark:border-amber-700",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      };
  }
}

// ============================================================================
// Single Prediction Lock Item Component
// ============================================================================

interface PredictionLockItemProps {
  prediction: LockedPrediction;
  index: number;
  onReveal?: (outcome: string, match: "confirmed" | "refuted" | "inconclusive") => void;
  onAmend?: (
    amendmentType: "clarification" | "reinterpretation" | "scope_change" | "retraction",
    text: string,
    reason?: string,
  ) => void;
  readOnly?: boolean;
}

function PredictionLockItem({
  prediction,
  index,
  onReveal,
  onAmend,
  readOnly = false,
}: PredictionLockItemProps) {
  const [showRevealDialog, setShowRevealDialog] = React.useState(false);
  const [showAmendDialog, setShowAmendDialog] = React.useState(false);
  const [outcome, setOutcome] = React.useState("");
  const [outcomeMatch, setOutcomeMatch] = React.useState<"confirmed" | "refuted" | "inconclusive">(
    "inconclusive",
  );
  const [amendText, setAmendText] = React.useState("");
  const [amendReason, setAmendReason] = React.useState("");

  const display = getLockStateDisplay(prediction.state);
  const colors = getStateColorClasses(prediction.state);

  const handleReveal = () => {
    onReveal?.(outcome, outcomeMatch);
    setShowRevealDialog(false);
    setOutcome("");
    setOutcomeMatch("inconclusive");
  };

  const handleAmend = () => {
    onAmend?.("clarification", amendText, amendReason || undefined);
    setShowAmendDialog(false);
    setAmendText("");
    setAmendReason("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-lg border p-4", colors.border, colors.bg)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* State Icon */}
          <div className={cn("mt-0.5", colors.text)}>{getStateIcon(prediction.state)}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">
                Prediction #{index + 1}
              </span>
              <Badge variant="outline" className={cn("text-xs", colors.badge)}>
                {display.label}
              </Badge>
              {prediction.outcomeMatch === "confirmed" && (
                <CheckCircleIcon className="size-4 text-green-500" />
              )}
              {prediction.outcomeMatch === "refuted" && (
                <XCircleIcon className="size-4 text-red-500" />
              )}
            </div>

            {/* Prediction Text */}
            <p
              className={cn("text-sm", prediction.state === "amended" && "line-through opacity-70")}
            >
              {prediction.originalText}
            </p>

            {/* Amended Text (if exists) */}
            {prediction.amendments && prediction.amendments.length > 0 && (
              <div className="mt-2 p-2 rounded border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                  Post-Evidence Amendment:
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {prediction.amendments[prediction.amendments.length - 1].text}
                </p>
              </div>
            )}

            {/* Lock Info */}
            {prediction.state !== "draft" && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help">
                        <LockClosedIcon className="size-3" />
                        {formatLockTimestamp(prediction.lockTimestamp)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sealed on {formatLockTimestamp(prediction.lockTimestamp)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 font-mono cursor-help">
                        <HashtagIcon className="size-3" />
                        {getShortHash(prediction.lockHash)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lock hash: {prediction.lockHash}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used to verify prediction integrity
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Observed Outcome */}
            {prediction.observedOutcome && (
              <div className="mt-2 p-2 rounded border border-muted bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-1">Observed Outcome:</p>
                <p className="text-sm">{prediction.observedOutcome}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            {prediction.state === "locked" && onReveal && (
              <Button variant="outline" size="sm" onClick={() => setShowRevealDialog(true)}>
                <EyeIcon className="size-4 mr-1" />
                Reveal
              </Button>
            )}
            {(prediction.state === "revealed" || prediction.state === "amended") && onAmend && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAmendDialog(true)}
                className="text-amber-600 hover:text-amber-700"
              >
                <PencilIcon className="size-4 mr-1" />
                Amend
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Reveal Dialog */}
      <Dialog open={showRevealDialog} onOpenChange={setShowRevealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal Prediction</DialogTitle>
            <DialogDescription>
              Record the observed outcome and compare it to your prediction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded bg-muted">
              <p className="text-sm font-medium mb-1">Your Prediction:</p>
              <p className="text-sm text-muted-foreground">{prediction.originalText}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">What Actually Happened?</Label>
              <Textarea
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Describe the observed outcome..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Outcome Assessment</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={outcomeMatch === "confirmed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOutcomeMatch("confirmed")}
                  className={outcomeMatch === "confirmed" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <CheckCircleIcon className="size-4 mr-1" />
                  Confirmed
                </Button>
                <Button
                  type="button"
                  variant={outcomeMatch === "refuted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOutcomeMatch("refuted")}
                  className={outcomeMatch === "refuted" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <XCircleIcon className="size-4 mr-1" />
                  Refuted
                </Button>
                <Button
                  type="button"
                  variant={outcomeMatch === "inconclusive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOutcomeMatch("inconclusive")}
                >
                  Inconclusive
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevealDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReveal} disabled={!outcome.trim()}>
              Record Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amend Dialog */}
      <Dialog open={showAmendDialog} onOpenChange={setShowAmendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ExclamationTriangleIcon className="size-5" />
              Amend Prediction (Post-Hoc)
            </DialogTitle>
            <DialogDescription>
              <span className="text-amber-600 font-medium">Warning:</span> Amending a prediction
              after seeing evidence will be flagged and may reduce your hypothesis&apos;s
              credibility score. The original prediction will be preserved for audit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded bg-muted">
              <p className="text-sm font-medium mb-1">Original Prediction:</p>
              <p className="text-sm text-muted-foreground">{prediction.originalText}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amendment">Amendment</Label>
              <Textarea
                id="amendment"
                value={amendText}
                onChange={(e) => setAmendText(e.target.value)}
                placeholder="Your amended prediction..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Amendment (Required)</Label>
              <Textarea
                id="reason"
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                placeholder="Why are you amending this prediction?"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAmendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAmend}
              disabled={!amendText.trim() || !amendReason.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Submit Amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ============================================================================
// Unlocked Prediction Item (for draft predictions)
// ============================================================================

interface UnlockedPredictionItemProps {
  text: string;
  index: number;
  type: PredictionType;
  hypothesisId: string;
  onLock: (lockedPrediction: LockedPrediction) => void;
  readOnly?: boolean;
}

function UnlockedPredictionItem({
  text,
  index,
  type,
  hypothesisId,
  onLock,
  readOnly = false,
}: UnlockedPredictionItemProps) {
  const [isLocking, setIsLocking] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleLock = async () => {
    setIsLocking(true);
    try {
      const result = await lockPrediction(hypothesisId, type, index, text);
      if (result.success && result.lockedPrediction) {
        onLock(result.lockedPrediction);
      }
    } finally {
      setIsLocking(false);
      setShowConfirm(false);
    }
  };

  const colors = getStateColorClasses("draft");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-lg border p-4", colors.border, colors.bg)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5", colors.text)}>
            <LockOpenIcon className="size-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">
                Prediction #{index + 1}
              </span>
              <Badge variant="outline" className={cn("text-xs", colors.badge)}>
                Draft
              </Badge>
            </div>

            <p className="text-sm">{text}</p>
          </div>
        </div>

        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={isLocking}
            className="text-blue-600 hover:text-blue-700"
          >
            <LockClosedIcon className="size-4 mr-1" />
            Lock
          </Button>
        )}
      </div>

      {/* Lock Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockClosedIcon className="size-5 text-blue-600" />
              Lock Prediction?
            </DialogTitle>
            <DialogDescription>
              Once locked, this prediction <strong>cannot be changed</strong>. This is the key
              anti-rationalization mechanism - you&apos;re committing to this prediction before
              seeing evidence.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded bg-muted my-4">
            <p className="text-sm font-medium mb-1">Prediction to Lock:</p>
            <p className="text-sm">{text}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLock}
              disabled={isLocking}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLocking ? "Locking..." : "I Understand - Lock It"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ============================================================================
// Main PredictionLock Component
// ============================================================================

export interface PredictionLockProps {
  /** Hypothesis ID for locking new predictions */
  hypothesisId: string;

  /** Predictions that haven't been locked yet (from HypothesisCard) */
  draftPredictions?: {
    ifTrue: string[];
    ifFalse: string[];
    impossible: string[];
  };

  /** Already locked predictions */
  lockedPredictions?: LockedPrediction[];

  /** Callback when a prediction is locked */
  onPredictionLocked?: (prediction: LockedPrediction) => void;

  /** Callback when a prediction is revealed */
  onPredictionRevealed?: (prediction: LockedPrediction) => void;

  /** Callback when a prediction is amended */
  onPredictionAmended?: (prediction: LockedPrediction) => void;

  /** Read-only mode */
  readOnly?: boolean;

  /** CSS class name */
  className?: string;
}

export function PredictionLock({
  hypothesisId,
  draftPredictions,
  lockedPredictions = [],
  onPredictionLocked,
  onPredictionRevealed,
  onPredictionAmended,
  readOnly = false,
  className,
}: PredictionLockProps) {
  const handleLock = (lockedPrediction: LockedPrediction) => {
    onPredictionLocked?.(lockedPrediction);
  };

  const handleReveal = (
    prediction: LockedPrediction,
    outcome: string,
    match: "confirmed" | "refuted" | "inconclusive",
  ) => {
    const result = revealPrediction(prediction, outcome, match);
    if (result.success && result.prediction) {
      onPredictionRevealed?.(result.prediction);
    }
  };

  const handleAmend = (
    prediction: LockedPrediction,
    amendmentType: "clarification" | "reinterpretation" | "scope_change" | "retraction",
    text: string,
    reason?: string,
  ) => {
    const amended = amendPrediction(prediction, amendmentType, text, reason);
    onPredictionAmended?.(amended);
  };

  // Group locked predictions by type
  const lockedByType = {
    if_true: lockedPredictions.filter((p) => p.predictionType === "if_true"),
    if_false: lockedPredictions.filter((p) => p.predictionType === "if_false"),
    impossible_if_true: lockedPredictions.filter((p) => p.predictionType === "impossible_if_true"),
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Predictions If True */}
      {(draftPredictions?.ifTrue?.length || lockedByType.if_true.length > 0) && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Predictions If True</h4>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {/* Locked predictions */}
              {lockedByType.if_true.map((pred) => (
                <PredictionLockItem
                  key={pred.id}
                  prediction={pred}
                  index={pred.originalIndex}
                  onReveal={(outcome, match) => handleReveal(pred, outcome, match)}
                  onAmend={(type, text, reason) => handleAmend(pred, type, text, reason)}
                  readOnly={readOnly}
                />
              ))}

              {/* Draft predictions */}
              {draftPredictions?.ifTrue?.map((text, idx) => {
                // Skip if already locked
                const isLocked = lockedByType.if_true.some((p) => p.originalIndex === idx);
                if (isLocked) return null;

                return (
                  <UnlockedPredictionItem
                    key={`draft-if-true-${idx}`}
                    text={text}
                    index={idx}
                    type="if_true"
                    hypothesisId={hypothesisId}
                    onLock={handleLock}
                    readOnly={readOnly}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Predictions If False */}
      {(draftPredictions?.ifFalse?.length || lockedByType.if_false.length > 0) && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Predictions If False</h4>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {lockedByType.if_false.map((pred) => (
                <PredictionLockItem
                  key={pred.id}
                  prediction={pred}
                  index={pred.originalIndex}
                  onReveal={(outcome, match) => handleReveal(pred, outcome, match)}
                  onAmend={(type, text, reason) => handleAmend(pred, type, text, reason)}
                  readOnly={readOnly}
                />
              ))}

              {draftPredictions?.ifFalse?.map((text, idx) => {
                const isLocked = lockedByType.if_false.some((p) => p.originalIndex === idx);
                if (isLocked) return null;

                return (
                  <UnlockedPredictionItem
                    key={`draft-if-false-${idx}`}
                    text={text}
                    index={idx}
                    type="if_false"
                    hypothesisId={hypothesisId}
                    onLock={handleLock}
                    readOnly={readOnly}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Falsification Conditions */}
      {(draftPredictions?.impossible?.length || lockedByType.impossible_if_true.length > 0) && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Falsification Conditions (If True, These Are Impossible)
          </h4>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {lockedByType.impossible_if_true.map((pred) => (
                <PredictionLockItem
                  key={pred.id}
                  prediction={pred}
                  index={pred.originalIndex}
                  onReveal={(outcome, match) => handleReveal(pred, outcome, match)}
                  onAmend={(type, text, reason) => handleAmend(pred, type, text, reason)}
                  readOnly={readOnly}
                />
              ))}

              {draftPredictions?.impossible?.map((text, idx) => {
                const isLocked = lockedByType.impossible_if_true.some(
                  (p) => p.originalIndex === idx,
                );
                if (isLocked) return null;

                return (
                  <UnlockedPredictionItem
                    key={`draft-impossible-${idx}`}
                    text={text}
                    index={idx}
                    type="impossible_if_true"
                    hypothesisId={hypothesisId}
                    onLock={handleLock}
                    readOnly={readOnly}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { PredictionLockItem, UnlockedPredictionItem };
