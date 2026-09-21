/**
 * Coach Mode Components
 *
 * Components for the Guided Coach Mode feature.
 *
 * @see brenner_bot-reew.8 (bead)
 */

// Explanation components
export {
  CoachExplanation,
  type CoachExplanationProps,
  CoachTip,
  type CoachTipProps,
} from "./CoachExplanation";
// Progress components
export {
  type Achievement,
  AchievementCard,
  type AchievementCardProps,
  CoachProgressStats,
  type CoachProgressStatsProps,
  LevelBadge,
  type LevelBadgeProps,
  ProgressCelebration,
  type ProgressCelebrationProps,
} from "./CoachProgress";
// Settings components
export {
  CoachSettingsPanel,
  type CoachSettingsPanelProps,
  CoachToggle,
  type CoachToggleProps,
} from "./CoachSettingsPanel";
// Quality checkpoint components
export {
  type CheckSeverity,
  HypothesisQualityChecker,
  type HypothesisQualityCheckerProps,
  QualityCheckpoint,
  type QualityCheckpointProps,
  type QualityCheckResult,
  type QualityIssue,
} from "./QualityCheckpoint";
