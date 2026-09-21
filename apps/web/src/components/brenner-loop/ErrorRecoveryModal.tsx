"use client";

/**
 * ErrorRecoveryModal Component
 *
 * Presents a user-facing recovery prompt with actions.
 *
 * @see brenner_bot-ft14 (bead)
 */

import { AlertTriangle, HelpCircle, RefreshCcw } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RecoveryAction, RecoveryNotice } from "@/lib/brenner-loop/errorRecovery";
import { cn } from "@/lib/utils";

export interface ErrorRecoveryModalProps {
  open: boolean;
  notice: RecoveryNotice;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const severityStyles: Record<RecoveryNotice["severity"], string> = {
  info: "bg-blue-500/10 text-blue-600",
  warning: "bg-amber-500/10 text-amber-600",
  error: "bg-red-500/10 text-red-600",
};

function actionButtonVariant(action?: RecoveryAction): "default" | "outline" | "destructive" {
  if (!action?.variant) return "outline";
  return action.variant;
}

export function ErrorRecoveryModal({
  open,
  notice,
  onOpenChange,
  className,
}: ErrorRecoveryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader separated>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                severityStyles[notice.severity],
              )}
            >
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <DialogTitle>{notice.title}</DialogTitle>
              <DialogDescription>{notice.message}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {notice.detail && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              {notice.detail}
            </div>
          )}

          {notice.safeStateMessage && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700">
              {notice.safeStateMessage}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(notice.actions ?? []).map((action, index) => (
              <Button
                key={`${action.label}-${index}`}
                size="sm"
                variant={actionButtonVariant(action)}
                onClick={action.action}
              >
                {action.label}
              </Button>
            ))}

            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => onOpenChange?.(false)}
            >
              <HelpCircle className="mr-2 size-4" />
              Close
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCcw className="size-4" />
            You can retry or continue without losing saved session data.
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default ErrorRecoveryModal;
