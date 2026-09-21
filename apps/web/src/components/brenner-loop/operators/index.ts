/**
 * Operator UI Components
 *
 * Common UI components for the Brenner Loop operator sessions.
 * These components provide consistent navigation, progress tracking,
 * and Brenner quote integration across all operator types.
 *
 * @see brenner_bot-vw6p.6 (bead)
 * @module components/brenner-loop/operators
 */

// Brenner quotes sidebar
export {
  BrennerQuoteSidebar,
  type BrennerQuoteSidebarProps,
} from "./BrennerQuoteSidebar";
// Help & Tips - bead yh1c
export {
  OperatorHelp,
  OperatorHelpPanel,
  type OperatorHelpPanelProps,
  type OperatorHelpProps,
} from "./OperatorHelp";
// Navigation controls
export {
  CompactNavigation,
  type CompactNavigationProps,
  OperatorNavigation,
  type OperatorNavigationProps,
} from "./OperatorNavigation";
// Progress indicator
export { OperatorProgress, type OperatorProgressProps } from "./OperatorProgress";
// Shell component
export { OperatorShell, type OperatorShellProps } from "./OperatorShell";

export {
  CustomTip,
  type CustomTipProps,
  OperatorTip,
  type OperatorTipProps,
} from "./OperatorTip";

// ============================================================================
// Operator Sessions (bead vw6p.2+)
// ============================================================================

// Level Split (Σ) - bead vw6p.2
export {
  LevelSplitSession,
  type LevelSplitSessionProps,
} from "./LevelSplitSession";

// Object Transpose (⟳) - bead vw6p.4
export {
  ObjectTransposeSession,
  type ObjectTransposeSessionProps,
} from "./ObjectTransposeSession";
