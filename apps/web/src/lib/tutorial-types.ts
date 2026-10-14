/**
 * Tutorial System Types
 *
 * Type definitions for the BrennerBot tutorial system.
 * These types are used across all tutorial paths and components.
 */

import type * as React from "react";

// ============================================================================
// Path Types
// ============================================================================

/** The three tutorial paths available to users */
export type TutorialPathId = "quick-start" | "agent-assisted" | "multi-agent-cockpit";

/** Accent colors used in the design system */
export type TutorialAccent = "primary" | "accent" | "success";

/** Difficulty levels for tutorial paths */
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

/** Definition of a tutorial path (shown on landing page) */
export interface TutorialPath {
  /** Unique identifier for the path */
  id: string;
  /** Display title */
  title: string;
  /** Brief description of what this path covers */
  description: string;
  /** Icon component or name */
  icon?: React.ReactNode;
  /** Accent color for theming */
  accent?: TutorialAccent;
  /** Estimated completion time (e.g., "~30 min") */
  estimatedTime?: string;
  /** Estimated duration in human readable format */
  estimatedDuration: string;
  /** Difficulty level */
  difficulty: DifficultyLevel;
  /** Target audience description */
  audience?: string;
  /** List of prerequisites */
  prerequisites?: string[];
  /** Total number of steps */
  totalSteps: number;
  /** Step count (alias) */
  stepCount?: number;
  /** Whether this path is available (vs coming soon) */
  available?: boolean;
  /** URL to navigate to for this path */
  href?: string;
}

// ============================================================================
// Step Types
// ============================================================================

/** Troubleshooting item for common issues */
export interface TroubleshootingItem {
  /** The problem description */
  problem: string;
  /** Optional symptoms that indicate this issue */
  symptoms?: string[];
  /** How to fix it */
  solution: string;
  /** Optional shell commands to run */
  commands?: string[];
}

/** Checkpoint data (shown between steps) */
export interface CheckpointData {
  /** Celebration title */
  title: string;
  /** List of what the user accomplished */
  accomplishments: string[];
  /** Preview of what's next */
  nextPreview: string;
}

/** A single tutorial step */
export interface TutorialStep {
  /** Unique identifier within the path */
  id: string;
  /** Which path this step belongs to */
  pathId: TutorialPathId;
  /** Step number (1-indexed for display) */
  stepNumber: number;
  /** Step title */
  title: string;
  /** Estimated time for this step */
  estimatedTime: string;
  /** Learning objectives */
  whatYouLearn: string[];
  /** Action items to complete */
  whatYouDo: string[];
  /** Optional expandable details */
  moreDetails?: React.ReactNode;
  /** Optional troubleshooting section */
  troubleshooting?: TroubleshootingItem[];
  /** Optional checkpoint after completing this step */
  checkpoint?: CheckpointData;
  /** Whether this step requires a desktop computer (terminal, CLI commands) */
  requiresDesktop?: boolean;
  /** Optional content to show mobile users when step requires desktop */
  mobileAlternative?: string;
}

/** Metadata for displaying step progress */
export interface TutorialStepMeta {
  id: string;
  stepNumber: number;
  title: string;
  estimatedTime: string;
  completed: boolean;
  /** Whether this step requires a desktop computer (terminal, CLI commands) */
  requiresDesktop?: boolean;
  /** Optional content to show mobile users when step requires desktop */
  mobileAlternative?: string;
}

// ============================================================================
// Code Block Types
// ============================================================================

/** Supported languages for syntax highlighting */
export type CodeLanguage =
  | "bash"
  | "typescript"
  | "javascript"
  | "markdown"
  | "json"
  | "yaml"
  | "text";

/** Code block data for reusable examples */
export interface CodeBlockData {
  /** Unique identifier for the code block */
  id: string;
  /** The code content */
  code: string;
  /** Programming language */
  language: CodeLanguage;
  /** Optional title/filename */
  title?: string;
  /** Optional description */
  description?: string;
}

/** Diff data for before/after comparisons */
export interface CodeDiff {
  /** Code before the change */
  before: string;
  /** Code after the change */
  after: string;
  /** Language for both */
  language: CodeLanguage;
}

// ============================================================================
// Tip Types
// ============================================================================

/** Tip variants for different types of callouts */
export type TipVariant = "pro" | "warning" | "note" | "important";

/** Tip data for reusable tips */
export interface TutorialTipData {
  /** Unique identifier */
  id: string;
  /** Tip variant */
  variant: TipVariant;
  /** Optional title */
  title?: string;
  /** Tip content */
  content: React.ReactNode;
}

// ============================================================================
// Progress Types
// ============================================================================

/** Progress state for a tutorial path */
export interface TutorialProgress {
  /** Path being tracked */
  pathId: TutorialPathId;
  /** Current step index (0-based) */
  currentStep: number;
  /** Set of completed step IDs */
  completedSteps: Set<string>;
  /** Timestamp when started */
  startedAt: Date;
  /** Timestamp of last activity */
  lastActivityAt: Date;
}

/** Serializable version for localStorage */
export interface TutorialProgressJSON {
  pathId: TutorialPathId;
  currentStep: number;
  completedSteps: string[];
  startedAt: string;
  lastActivityAt: string;
}

// ============================================================================
// Navigation Types
// ============================================================================

/** Navigation callbacks for step components */
export interface TutorialNavigation {
  onBack: () => void;
  onNext: () => void;
  onStepClick?: (stepIndex: number) => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// ============================================================================
// Layout Types
// ============================================================================

/** Layout variant for different screen sizes */
export type TutorialLayoutVariant = "sidebar" | "header" | "minimal";

/** Props for the main tutorial layout */
export interface TutorialLayoutProps {
  /** The current path */
  path: TutorialPath;
  /** All steps for this path */
  steps: TutorialStepMeta[];
  /** Current step index */
  currentStep: number;
  /** Set of completed step indices */
  completedSteps: number[];
  /** Navigation callbacks */
  navigation: TutorialNavigation;
  /** Layout variant (responsive) */
  variant?: TutorialLayoutVariant;
  /** Children to render in main content area */
  children: React.ReactNode;
}
