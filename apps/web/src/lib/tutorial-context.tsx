"use client";

/**
 * Tutorial Context Provider
 *
 * Manages tutorial state across the application:
 * - Current path and step tracking
 * - Progress persistence to localStorage
 * - Navigation controls
 * - Cross-tab synchronization
 *
 * @module lib/tutorial-context
 * @see brenner_bot-e521 (Tutorial Layout)
 */

import * as React from "react";
import type { TutorialPathId, TutorialProgressJSON } from "./tutorial-types";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFIX = "brenner-tutorial-";
const STORAGE_CHANGE_EVENT = "tutorial-progress-change";

// ============================================================================
// Types
// ============================================================================

export interface TutorialContextValue {
  /** Current tutorial path (null if on landing page) */
  currentPath: TutorialPathId | null;
  /** Current step index (0-based) */
  currentStep: number;
  /** Total steps in current path */
  totalSteps: number;
  /** Array of completed step indices */
  completedSteps: number[];
  /** Whether the context is loading from storage */
  isLoading: boolean;
  /** Whether the tutorial is hydrated from storage */
  isHydrated: boolean;

  // Navigation
  /** Go to a specific step */
  goToStep: (stepIndex: number) => void;
  /** Go to the next step */
  goToNextStep: () => void;
  /** Go to the previous step */
  goToPrevStep: () => void;
  /** Mark a step as complete */
  markStepComplete: (stepIndex: number) => void;
  /** Mark current step complete and advance */
  completeAndAdvance: () => void;

  // Path management
  /** Set the current path (clears step if different path) */
  setPath: (pathId: TutorialPathId, totalSteps: number) => void;
  /** Reset progress for current path */
  resetProgress: () => void;
  /** Clear all tutorial progress */
  clearAllProgress: () => void;

  // Computed values
  /** Whether we can go to the next step */
  canGoNext: boolean;
  /** Whether we can go to the previous step */
  canGoBack: boolean;
  /** Whether on the first step */
  isFirstStep: boolean;
  /** Whether on the last step */
  isLastStep: boolean;
  /** Progress percentage (0-100) */
  progressPercent: number;
}

// ============================================================================
// Context
// ============================================================================

const TutorialContext = React.createContext<TutorialContextValue | null>(null);

// ============================================================================
// Storage Helpers
// ============================================================================

function getStorageKey(pathId: TutorialPathId): string {
  return `${STORAGE_KEY_PREFIX}${pathId}-progress`;
}

function loadProgress(pathId: TutorialPathId): TutorialProgressJSON | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(pathId));
    if (!stored) return null;

    const parsed = JSON.parse(stored) as TutorialProgressJSON;
    // Validate structure
    if (
      typeof parsed.pathId === "string" &&
      typeof parsed.currentStep === "number" &&
      Array.isArray(parsed.completedSteps)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveProgress(progress: TutorialProgressJSON): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getStorageKey(progress.pathId as TutorialPathId),
      JSON.stringify(progress),
    );
    // Dispatch custom event for cross-tab sync
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: progress }));
  } catch (e) {
    console.warn("Failed to save tutorial progress:", e);
  }
}

function clearProgress(pathId: TutorialPathId): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(getStorageKey(pathId));
  } catch (e) {
    console.warn("Failed to clear tutorial progress:", e);
  }
}

// ============================================================================
// Provider Component
// ============================================================================

export interface TutorialProviderProps {
  children: React.ReactNode;
  /** Initial path (if starting on a path page) */
  initialPath?: TutorialPathId;
  /** Total steps for initial path */
  initialTotalSteps?: number;
}

export function TutorialProvider({
  children,
  initialPath,
  initialTotalSteps = 0,
}: TutorialProviderProps) {
  // State
  const [currentPath, setCurrentPath] = React.useState<TutorialPathId | null>(initialPath ?? null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [totalSteps, setTotalSteps] = React.useState(initialTotalSteps);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Track original start time (preserved across saves)
  const startedAtRef = React.useRef<string | null>(null);

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    if (currentPath) {
      const stored = loadProgress(currentPath);
      if (stored) {
        setCurrentStep(stored.currentStep);
        setCompletedSteps(stored.completedSteps.map(Number));
        startedAtRef.current = stored.startedAt ?? null;
      }
    }
    setIsLoading(false);
    setIsHydrated(true);
  }, [currentPath]);

  // Persist to localStorage when state changes
  React.useEffect(() => {
    if (!isHydrated || !currentPath) return;

    // Preserve original startedAt, only set if this is a new session
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }

    const progress: TutorialProgressJSON = {
      pathId: currentPath,
      currentStep,
      completedSteps: completedSteps.map(String),
      startedAt: startedAtRef.current,
      lastActivityAt: new Date().toISOString(),
    };
    saveProgress(progress);
  }, [currentPath, currentStep, completedSteps, isHydrated]);

  // Cross-tab synchronization
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (!currentPath) return;
      if (e.key === getStorageKey(currentPath) && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as TutorialProgressJSON;
          setCurrentStep(updated.currentStep);
          setCompletedSteps(updated.completedSteps.map(Number));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [currentPath]);

  // Navigation functions
  const goToStep = React.useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < totalSteps) {
        setCurrentStep(stepIndex);
      }
    },
    [totalSteps],
  );

  const goToNextStep = React.useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const goToPrevStep = React.useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const markStepComplete = React.useCallback((stepIndex: number) => {
    setCompletedSteps((prev) => {
      if (prev.includes(stepIndex)) return prev;
      return [...prev, stepIndex].sort((a, b) => a - b);
    });
  }, []);

  const completeAndAdvance = React.useCallback(() => {
    markStepComplete(currentStep);
    goToNextStep();
  }, [currentStep, markStepComplete, goToNextStep]);

  // Path management
  const setPath = React.useCallback(
    (pathId: TutorialPathId, steps: number) => {
      if (pathId !== currentPath) {
        setCurrentPath(pathId);
        setTotalSteps(steps);
        // Load stored progress for this path
        const stored = loadProgress(pathId);
        if (stored) {
          setCurrentStep(stored.currentStep);
          setCompletedSteps(stored.completedSteps.map(Number));
          startedAtRef.current = stored.startedAt ?? null;
        } else {
          setCurrentStep(0);
          setCompletedSteps([]);
          startedAtRef.current = null;
        }
      }
    },
    [currentPath],
  );

  const resetProgress = React.useCallback(() => {
    if (currentPath) {
      clearProgress(currentPath);
      setCurrentStep(0);
      setCompletedSteps([]);
      startedAtRef.current = null;
    }
  }, [currentPath]);

  const clearAllProgress = React.useCallback(() => {
    const paths: TutorialPathId[] = ["quick-start", "agent-assisted", "multi-agent-cockpit"];
    paths.forEach(clearProgress);
    setCurrentStep(0);
    setCompletedSteps([]);
    startedAtRef.current = null;
  }, []);

  // Computed values
  const canGoNext = currentStep < totalSteps - 1;
  const canGoBack = currentStep > 0;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0;

  const value: TutorialContextValue = {
    currentPath,
    currentStep,
    totalSteps,
    completedSteps,
    isLoading,
    isHydrated,
    goToStep,
    goToNextStep,
    goToPrevStep,
    markStepComplete,
    completeAndAdvance,
    setPath,
    resetProgress,
    clearAllProgress,
    canGoNext,
    canGoBack,
    isFirstStep,
    isLastStep,
    progressPercent,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access the tutorial context.
 * Must be used within a TutorialProvider.
 */
export function useTutorial(): TutorialContextValue {
  const context = React.useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}

/**
 * Optional version that returns null outside provider.
 * Useful for components that may or may not be in tutorial context.
 */
export function useTutorialOptional(): TutorialContextValue | null {
  return React.useContext(TutorialContext);
}

// ============================================================================
// Export Context for advanced use cases
// ============================================================================

export { TutorialContext };
