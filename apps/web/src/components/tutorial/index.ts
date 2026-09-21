/**
 * Tutorial Component Library
 *
 * A comprehensive set of components for building interactive tutorials.
 * Adapted from ACFS patterns with brennerbot.org theming.
 *
 * Components:
 * - TutorialProgress: Step progress indicator (sidebar + mobile header)
 * - TutorialStep: Container for step content with navigation
 * - TutorialCodeBlock: Syntax highlighted code with copy button
 * - TutorialTip: Callout boxes (pro, warning, note, important)
 * - TutorialCheckpoint: Celebration milestone between steps
 * - TutorialPathCard: Card for selecting tutorial paths
 */

// Re-export types from lib
export type {
  CheckpointData,
  CodeBlockData,
  CodeDiff,
  CodeLanguage,
  DifficultyLevel,
  TipVariant,
  TroubleshootingItem,
  TutorialAccent,
  TutorialLayoutProps,
  TutorialLayoutVariant,
  TutorialNavigation,
  TutorialPath,
  TutorialPathId,
  TutorialProgress as TutorialProgressType,
  TutorialProgressJSON,
  TutorialStep as TutorialStepType,
  TutorialStepMeta,
  TutorialTipData,
} from "@/lib/tutorial-types";
export type { MobileDesktopGateProps } from "./MobileDesktopGate";
// Mobile desktop gate
export { MobileDesktopGate } from "./MobileDesktopGate";
export type { PromptCardProps, PromptListItemProps } from "./PromptCard";
// Prompt cards
export { PromptCard, PromptListItem } from "./PromptCard";
export type { TutorialCheckpointProps } from "./TutorialCheckpoint";
// Checkpoints
export { TutorialCheckpoint } from "./TutorialCheckpoint";
export type {
  InlineCodeProps,
  TutorialCodeBlockProps,
} from "./TutorialCodeBlock";
// Code blocks
export { InlineCode, TutorialCodeBlock } from "./TutorialCodeBlock";
export type {
  PathStatus,
  TutorialPathCardProps,
  TutorialPathGridProps,
} from "./TutorialPathCard";

// Path cards
export {
  TutorialPathCard,
  TutorialPathGrid,
} from "./TutorialPathCard";
export type { TutorialProgressProps } from "./TutorialProgress";
// Progress indicator
export {
  HeaderProgress,
  SidebarProgress,
  TutorialProgress,
} from "./TutorialProgress";
export type { TutorialStepProps } from "./TutorialStep";
// Step container
export { TutorialStep } from "./TutorialStep";
export type { TutorialTipProps } from "./TutorialTip";
// Tips and callouts
export {
  Important,
  Note,
  ProTip,
  TutorialTip,
  Warning,
} from "./TutorialTip";
