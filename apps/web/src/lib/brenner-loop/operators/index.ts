/**
 * Brenner Loop Operators Module
 *
 * Exports all operator-related types, functions, and configurations.
 *
 * @module brenner-loop/operators
 */

// ============================================================================
// Framework (bead vw6p.1)
// ============================================================================

export type {
  OperatorInsight,
  OperatorMetadata,
  // Session types
  OperatorSession,
  OperatorSessionAction,
  OperatorSessionStatus,
  // Step types
  OperatorStepConfig,
  OperatorStepState,
  // Core types
  OperatorType,
  StepValidation,
} from "./framework";

export {
  canGoBack,
  canProceedToNext,
  canSkipCurrent,
  createSession,
  createStepStates,
  deserializeSession,
  generateInsightId,
  // Factory functions
  generateSessionId,
  // Utility functions
  getCurrentStep,
  getCurrentStepConfig,
  getProgress,
  getSessionSummary,
  // Type guards
  isOperatorType,
  // Metadata
  OPERATOR_METADATA,
  // Serialization
  serializeSession,
  // State management
  sessionReducer,
} from "./framework";

// ============================================================================
// Level Split Operator (bead vw6p.2)
// ============================================================================

export type {
  Level,
  LevelCategory,
  LevelCombination,
  LevelSplitResult,
  SubHypothesis,
} from "./level-split";

export {
  buildLevelSplitResult,
  generateCombinationMatrix,
  generateSubHypothesis,
  // Generation functions
  generateXLevels,
  generateYLevels,
  LEVEL_SPLIT_FALLBACK_QUOTES,
  // Quote references
  LEVEL_SPLIT_QUOTE_ANCHORS,
  // Step configurations
  LEVEL_SPLIT_STEP_IDS,
  LEVEL_SPLIT_STEPS,
  // Level templates
  X_LEVEL_TEMPLATES,
  Y_LEVEL_TEMPLATES,
} from "./level-split";

// ============================================================================
// Exclusion Test Operator (bead vw6p.3)
// ============================================================================

export type {
  ExclusionTest,
  ExclusionTestCategory,
  ExclusionTestResult,
  TestFeasibility,
  TestProtocol,
} from "./exclusion-test";

export {
  buildExclusionTestResult,
  CATEGORY_DEFAULT_POWER,
  createCustomTest,
  // Labels and constants
  EXCLUSION_TEST_CATEGORY_LABELS,
  EXCLUSION_TEST_FALLBACK_QUOTES,
  // Quote references
  EXCLUSION_TEST_QUOTE_ANCHORS,
  // Step configurations
  EXCLUSION_TEST_STEP_IDS,
  EXCLUSION_TEST_STEPS,
  FEASIBILITY_LABELS,
  generateExclusionTests,
  generateProtocols,
  generateProtocolTemplate,
  // Generation functions
  generateTestId,
  getCategoryColor,
  getDiscriminativePowerLabel,
  // Display utilities
  getDiscriminativePowerStars,
  getFeasibilityColor,
} from "./exclusion-test";

// ============================================================================
// Object Transpose Operator (bead vw6p.4)
// ============================================================================

export type {
  AlternativeExplanation,
  AlternativeType,
  DiscriminatingTest,
  ObjectTransposeResult,
  PlausibilityRating,
} from "./object-transpose";

export {
  buildObjectTransposeResult,
  generateAlternatives,
  generateBidirectional,
  generateCoincidence,
  generateDiscriminatingTests,
  // Generation functions
  generateReverseCausation,
  generateSelectionEffect,
  generateThirdVariables,
  OBJECT_TRANSPOSE_FALLBACK_QUOTES,
  // Quote references
  OBJECT_TRANSPOSE_QUOTE_ANCHORS,
  // Step configurations
  OBJECT_TRANSPOSE_STEP_IDS,
  OBJECT_TRANSPOSE_STEPS,
  // Third variable templates
  THIRD_VARIABLE_TEMPLATES,
} from "./object-transpose";

// ============================================================================
// Scale Check Operator (bead vw6p.5)
// ============================================================================

export type {
  Benchmark,
  ContextComparison,
  DomainContext,
  EffectDirection,
  EffectMagnitude,
  EffectSizeSpec,
  EffectSizeType,
  MeasurementAssessment,
  PopulationConsideration,
  PracticalSignificance,
  ScaleCheckResult,
  TypicalEffect,
} from "./scale-check";

export {
  approximateSampleSize,
  buildScaleCheckResult,
  classifyEffectSize,
  // Domain context
  DOMAIN_CONTEXTS,
  // Effect size utilities
  EFFECT_SIZE_CONVENTIONS,
  estimateToValue,
  // Generation functions
  generateContextComparison,
  generatePopulationConsiderations,
  getDomainContext,
  SCALE_CHECK_FALLBACK_QUOTES,
  // Quote references
  SCALE_CHECK_QUOTE_ANCHORS,
  // Step configurations
  SCALE_CHECK_STEP_IDS,
  SCALE_CHECK_STEPS,
  varianceExplained,
} from "./scale-check";

// ============================================================================
// Operator Documentation (bead yh1c)
// ============================================================================

export type {
  OperatorDocumentation,
  OperatorStepTip,
} from "./docs";

export {
  EXCLUSION_TEST_DOCS,
  getCommonMistakes,
  // Utility functions
  getOperatorDocumentation,
  getStepTip,
  getSuccessCriteria,
  // Documentation by operator
  LEVEL_SPLIT_DOCS,
  OBJECT_TRANSPOSE_DOCS,
  // Documentation index
  OPERATOR_DOCUMENTATION,
  SCALE_CHECK_DOCS,
} from "./docs";
