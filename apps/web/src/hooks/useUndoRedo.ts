"use client";

/**
 * useUndoRedo - React hook for managing undo/redo state in Brenner Loop sessions
 *
 * Provides:
 * - Undo/redo functionality with keyboard shortcuts
 * - Command execution helpers
 * - LocalStorage persistence
 *
 * @see brenner_bot-sedg (Undo/Redo System)
 */

import { useCallback, useEffect, useMemo } from "react";
import type { EvidenceEntry, Session, SessionPhase } from "@/lib/brenner-loop/types";
import {
  canRedo,
  canUndo,
  clearHistory,
  createAddTagCommand,
  createArchiveCommand,
  createConfidenceCommand,
  createEvidenceCommand,
  createNotesCommand,
  createPhaseCommand,
  createRemoveTagCommand,
  createRestoreCommand,
  createSetPrimaryCommand,
  createUndoStack,
  deserializeUndoStack,
  executeCommand,
  getNextRedoDescription,
  getNextUndoDescription,
  getRecentHistory,
  redo,
  type SessionCommand,
  serializeUndoStack,
  type UndoStack,
  undo,
} from "@/lib/brenner-loop/undoManager";
import { useLocalStorage } from "./useLocalStorage";

// ============================================================================
// Types
// ============================================================================

export interface UseUndoRedoOptions {
  /** Session ID for localStorage key */
  sessionId: string;
  /** Maximum history size (default: 50) */
  maxHistory?: number;
  /** Enable keyboard shortcuts (default: true) */
  enableShortcuts?: boolean;
}

export interface UseUndoRedoResult {
  /** The current undo stack */
  stack: UndoStack;

  /** Whether undo is available */
  canUndo: boolean;

  /** Whether redo is available */
  canRedo: boolean;

  /** Description of next undo action */
  nextUndoDescription: string | null;

  /** Description of next redo action */
  nextRedoDescription: string | null;

  /** Recent command history for display */
  recentHistory: SessionCommand[];

  /**
   * Execute a command and update session
   * @returns Updated session
   */
  execute: (session: Session, command: SessionCommand) => Session;

  /**
   * Undo the last command
   * @returns Updated session or null if nothing to undo
   */
  performUndo: (session: Session) => Session | null;

  /**
   * Redo the last undone command
   * @returns Updated session or null if nothing to redo
   */
  performRedo: (session: Session) => Session | null;

  /**
   * Clear all history
   */
  clearAll: () => void;

  // Command helpers
  updateConfidence: (
    session: Session,
    hypothesisId: string,
    previousConfidence: number,
    newConfidence: number,
    reason: string,
    evidenceId?: string,
  ) => Session;

  setPrimary: (session: Session, newPrimaryId: string, previousPrimaryId: string) => Session;

  archiveHypothesis: (session: Session, hypothesisId: string, reason: string) => Session;

  restoreHypothesis: (session: Session, hypothesisId: string) => Session;

  recordEvidence: (session: Session, evidence: EvidenceEntry) => Session;

  transitionPhase: (
    session: Session,
    previousPhase: SessionPhase,
    newPhase: SessionPhase,
  ) => Session;

  updateNotes: (session: Session, previousNotes: string, newNotes: string) => Session;

  addTag: (session: Session, tag: string) => Session;

  removeTag: (session: Session, tag: string) => Session;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing undo/redo in Brenner Loop sessions
 */
export function useUndoRedo(options: UseUndoRedoOptions): UseUndoRedoResult {
  const { sessionId, maxHistory = 50, enableShortcuts = true } = options;

  // Persist undo stack to localStorage
  const [stackData, setStackData] = useLocalStorage<string>(
    `brenner-undo-${sessionId}`,
    serializeUndoStack(createUndoStack(maxHistory)),
  );

  // Parse the stack from storage
  const stack = useMemo(() => {
    const parsed = deserializeUndoStack(stackData);
    return parsed ?? createUndoStack(maxHistory);
  }, [stackData, maxHistory]);

  // Execute a command
  const execute = useCallback(
    (session: Session, command: SessionCommand): Session => {
      const result = executeCommand(session, stack, command);
      setStackData(serializeUndoStack(result.stack));
      return result.session;
    },
    [stack, setStackData],
  );

  // Undo
  const performUndo = useCallback(
    (session: Session): Session | null => {
      const result = undo(session, stack);
      if (!result) return null;
      setStackData(serializeUndoStack(result.stack));
      return result.session;
    },
    [stack, setStackData],
  );

  // Redo
  const performRedo = useCallback(
    (session: Session): Session | null => {
      const result = redo(session, stack);
      if (!result) return null;
      setStackData(serializeUndoStack(result.stack));
      return result.session;
    },
    [stack, setStackData],
  );

  // Clear all
  const clearAll = useCallback(() => {
    setStackData(serializeUndoStack(clearHistory(stack)));
  }, [stack, setStackData]);

  // Command helpers
  const updateConfidence = useCallback(
    (
      session: Session,
      hypothesisId: string,
      previousConfidence: number,
      newConfidence: number,
      reason: string,
      evidenceId?: string,
    ): Session => {
      const cmd = createConfidenceCommand(
        hypothesisId,
        previousConfidence,
        newConfidence,
        reason,
        evidenceId,
      );
      return execute(session, cmd);
    },
    [execute],
  );

  const setPrimary = useCallback(
    (session: Session, newPrimaryId: string, previousPrimaryId: string): Session => {
      const cmd = createSetPrimaryCommand(newPrimaryId, previousPrimaryId);
      return execute(session, cmd);
    },
    [execute],
  );

  const archiveHypothesis = useCallback(
    (session: Session, hypothesisId: string, reason: string): Session => {
      const cmd = createArchiveCommand(hypothesisId, reason);
      return execute(session, cmd);
    },
    [execute],
  );

  const restoreHypothesis = useCallback(
    (session: Session, hypothesisId: string): Session => {
      const cmd = createRestoreCommand(hypothesisId);
      return execute(session, cmd);
    },
    [execute],
  );

  const recordEvidence = useCallback(
    (session: Session, evidence: EvidenceEntry): Session => {
      const cmd = createEvidenceCommand(evidence);
      return execute(session, cmd);
    },
    [execute],
  );

  const transitionPhase = useCallback(
    (session: Session, previousPhase: SessionPhase, newPhase: SessionPhase): Session => {
      const cmd = createPhaseCommand(previousPhase, newPhase);
      return execute(session, cmd);
    },
    [execute],
  );

  const updateNotes = useCallback(
    (session: Session, previousNotes: string, newNotes: string): Session => {
      const cmd = createNotesCommand(previousNotes, newNotes);
      return execute(session, cmd);
    },
    [execute],
  );

  const addTag = useCallback(
    (session: Session, tag: string): Session => {
      const cmd = createAddTagCommand(tag);
      return execute(session, cmd);
    },
    [execute],
  );

  const removeTag = useCallback(
    (session: Session, tag: string): Session => {
      const cmd = createRemoveTagCommand(tag);
      return execute(session, cmd);
    },
    [execute],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier || e.key.toLowerCase() !== "z") return;

      // Prevent default browser undo/redo
      e.preventDefault();

      if (e.shiftKey) {
        // Ctrl+Shift+Z or Cmd+Shift+Z = Redo
        // Note: The actual redo will be handled by the component
        // that has access to the session state
        document.dispatchEvent(new CustomEvent("brenner:redo"));
      } else {
        // Ctrl+Z or Cmd+Z = Undo
        document.dispatchEvent(new CustomEvent("brenner:undo"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableShortcuts]);

  return {
    stack,
    canUndo: canUndo(stack),
    canRedo: canRedo(stack),
    nextUndoDescription: getNextUndoDescription(stack),
    nextRedoDescription: getNextRedoDescription(stack),
    recentHistory: getRecentHistory(stack),
    execute,
    performUndo,
    performRedo,
    clearAll,
    updateConfidence,
    setPrimary,
    archiveHypothesis,
    restoreHypothesis,
    recordEvidence,
    transitionPhase,
    updateNotes,
    addTag,
    removeTag,
  };
}
