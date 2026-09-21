"use client";

/**
 * Undo/Redo Controls Component
 *
 * Provides UI for undo/redo functionality in Brenner Loop sessions.
 * Displays undo/redo buttons with tooltips.
 *
 * @see brenner_bot-sedg (Undo/Redo System)
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SessionCommand } from "@/lib/brenner-loop/undoManager";
import { cn } from "@/lib/utils";

// ============================================================================
// Icons (inline SVGs to avoid import dependencies)
// ============================================================================

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

// ============================================================================
// Types
// ============================================================================

export interface UndoRedoControlsProps {
  /** Whether undo is available */
  canUndo: boolean;

  /** Whether redo is available */
  canRedo: boolean;

  /** Description of the next undo action */
  nextUndoDescription: string | null;

  /** Description of the next redo action */
  nextRedoDescription: string | null;

  /** Recent command history */
  recentHistory: SessionCommand[];

  /** Called when undo button is clicked */
  onUndo: () => void;

  /** Called when redo button is clicked */
  onRedo: () => void;

  /** Called when a history item is clicked (to undo to that point) */
  onUndoToCommand?: (commandId: string) => void;

  /** Additional class names */
  className?: string;

  /** Show history dropdown */
  showHistory?: boolean;

  /** Compact mode (icons only) */
  compact?: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

interface HistoryItemProps {
  command: SessionCommand;
  onClick?: () => void;
}

function HistoryItem({ command, onClick }: HistoryItemProps) {
  const time = new Date(command.timestamp);
  const timeStr = time.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-left",
        "hover:bg-muted rounded-md transition-colors",
        "group",
      )}
    >
      <div className="flex-shrink-0">
        <UndoIcon className="size-4 text-muted-foreground group-hover:text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{command.description}</p>
        <p className="text-xs text-muted-foreground">{timeStr}</p>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UndoRedoControls({
  canUndo,
  canRedo,
  nextUndoDescription,
  nextRedoDescription,
  recentHistory,
  onUndo,
  onRedo,
  onUndoToCommand,
  className,
  showHistory = true,
  compact = false,
}: UndoRedoControlsProps) {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "Cmd" : "Ctrl";

  return (
    <TooltipProvider>
      <div className={cn("relative", className)}>
        <div className="flex items-center gap-1">
          {/* Undo Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={compact ? "icon" : "sm"}
                onClick={onUndo}
                disabled={!canUndo}
                className={cn("gap-1.5", !canUndo && "opacity-50 cursor-not-allowed")}
              >
                <UndoIcon className="size-4" />
                {!compact && <span>Undo</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {canUndo ? (
                <div className="text-center">
                  <p className="font-medium">Undo</p>
                  <p className="text-xs text-muted-foreground">{nextUndoDescription}</p>
                  <p className="text-xs text-muted-foreground mt-1">{modKey}+Z</p>
                </div>
              ) : (
                <p>Nothing to undo</p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Redo Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={compact ? "icon" : "sm"}
                onClick={onRedo}
                disabled={!canRedo}
                className={cn("gap-1.5", !canRedo && "opacity-50 cursor-not-allowed")}
              >
                <RedoIcon className="size-4" />
                {!compact && <span>Redo</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {canRedo ? (
                <div className="text-center">
                  <p className="font-medium">Redo</p>
                  <p className="text-xs text-muted-foreground">{nextRedoDescription}</p>
                  <p className="text-xs text-muted-foreground mt-1">{modKey}+Shift+Z</p>
                </div>
              ) : (
                <p>Nothing to redo</p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* History Toggle Button */}
          {showHistory && recentHistory.length > 0 && (
            <Button
              variant="ghost"
              size={compact ? "icon" : "sm"}
              onClick={() => setHistoryOpen(!historyOpen)}
              className={cn(historyOpen && "bg-muted")}
            >
              <HistoryIcon className="size-4" />
              {!compact && (
                <span className="ml-1.5 text-xs text-muted-foreground">{recentHistory.length}</span>
              )}
            </Button>
          )}
        </div>

        {/* History Dropdown */}
        {historyOpen && showHistory && recentHistory.length > 0 && (
          <div className="absolute right-0 top-full mt-2 w-72 p-2 rounded-lg border bg-card shadow-lg z-50">
            <div className="space-y-1">
              <div className="px-3 py-2">
                <h4 className="text-sm font-medium">Recent Actions</h4>
                <p className="text-xs text-muted-foreground">Click to undo to that point</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {recentHistory.map((cmd) => (
                  <HistoryItem
                    key={cmd.id}
                    command={cmd}
                    onClick={() => {
                      onUndoToCommand?.(cmd.id);
                      setHistoryOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Inline Controls (for embedding in other components)
// ============================================================================

export interface InlineUndoButtonProps {
  canUndo: boolean;
  description: string | null;
  onClick: () => void;
  className?: string;
}

/**
 * Inline undo button for use next to individual actions
 */
export function InlineUndoButton({
  canUndo,
  description,
  onClick,
  className,
}: InlineUndoButtonProps) {
  if (!canUndo) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1 text-xs text-muted-foreground",
              "hover:text-foreground transition-colors",
              className,
            )}
          >
            <UndoIcon className="size-3" />
            <span>Undo</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{description ?? "Undo last action"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Keyboard Shortcut Display
// ============================================================================

export function KeyboardShortcutHint() {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "Cmd" : "Ctrl";

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">{modKey}+Z</kbd>
        <span>Undo</span>
      </div>
      <div className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">{modKey}+Shift+Z</kbd>
        <span>Redo</span>
      </div>
    </div>
  );
}
