/**
 * Brenner Loop Module
 *
 * Core data models and utilities for the Brenner Loop hypothesis engine.
 * This module provides the foundational types for discriminative hypothesis testing.
 *
 * @module brenner-loop
 * @see brenner_bot-1v26.1 (Session Data Model)
 * @see brenner_bot-an1n.1 (HypothesisCard Interface)
 */

// ============================================================================
// Hypothesis Engine (bead an1n.1)
// ============================================================================

export {
  // Utility functions
  calculateFalsifiabilityScore,
  calculateSpecificityScore,
  createHypothesisCard,
  evolveHypothesisCard,
  generateConfoundId,
  // Factory functions
  generateHypothesisCardId,
  // Core interfaces
  type HypothesisCard,
  type IdentifiedConfound,
  interpretConfidence,
  // Type guards
  isHypothesisCard,
  isIdentifiedConfound,
  type ValidationError,
  type ValidationErrorCode,
  // Validation types
  type ValidationResult,
  type ValidationWarning,
  type ValidationWarningCode,
  validateConfound,
  // Validation functions
  validateHypothesisCard,
} from "./hypothesis";

// ============================================================================
// Confound Detection (bead ukd1.3)
// ============================================================================

export {
  BIOLOGY_CONFOUNDS,
  COMPUTER_SCIENCE_CONFOUNDS,
  type ConfoundDetectionResult,
  type ConfoundTemplate,
  // Detection functions
  classifyDomain,
  detectConfounds,
  ECONOMICS_CONFOUNDS,
  EPIDEMIOLOGY_CONFOUNDS,
  GENERAL_CONFOUNDS,
  getConfoundQuestions,
  getConfoundTemplates,
  getSupportedDomains,
  NEUROSCIENCE_CONFOUNDS,
  // Domain confound libraries
  PSYCHOLOGY_CONFOUNDS,
  // Types
  type ResearchDomain,
  SOCIOLOGY_CONFOUNDS,
} from "./confound-detection";

// ============================================================================
// Session Data Model (bead 1v26.1)
// ============================================================================

export type {
  AgentContribution,
  AgentDelta,
  AgentResponse,
  // Agent types
  AgentRole,
  AlternativeSystem,
  // Artifact types
  ArtifactType,
  // Session versioning types
  CommitTrigger,
  ConfidenceUpdate,
  DesignedTest,
  Disagreement,
  // Evidence types
  EvidenceEntry,
  ExclusionTestResult,
  // Evolution types
  HypothesisEvolution,
  LevelIdentification,
  // Operator result types
  LevelSplitResult,
  ObjectTransposeResult,
  PendingAgentRequest,
  RejectedTest,
  ResearchArtifact,
  ScaleCalculation,
  ScaleCheckResult,
  // Main session type
  Session,
  SessionCommit,
  // Session phases
  SessionPhase,
  SessionSnapshot,
  SimplifiedPhase,
  SynthesisResult,
} from "./types";

export {
  // Constants
  CURRENT_SESSION_VERSION,
  // Factory functions
  createSession,
  generateSessionId,
  isAgentRole,
  isSession,
  // Type guards
  isSessionPhase,
  isValidTransition,
  // Phase utilities
  toSimplifiedPhase,
} from "./types";

// ============================================================================
// Storage Layer (bead 1v26.2)
// ============================================================================

export type {
  SessionResumeEntry,
  SessionResumeLocation,
  // Storage interface
  SessionStorage,
  SessionSummary,
  StorageChangeCallback,
  StorageErrorCode,
  StorageStats,
} from "./storage";

export {
  buildSessionPath,
  cleanupOldSessions,
  estimateRemainingStorage,
  getSessionResumeEntry,
  // Storage implementation
  LocalStorageSessionStorage,
  listSessionResumeEntries,
  // Cross-tab sync
  onStorageChange,
  recordSessionResumeEntry,
  // Recovery utilities
  recoverSessions,
  removeSessionResumeEntry,
  // Resume metadata
  SESSION_RESUME_LOCATION_LABELS,
  StorageError,
  sessionStorage,
} from "./storage";

// ============================================================================
// Error Recovery (bead ft14)
// ============================================================================

export type {
  RecoveryAction,
  RecoveryNotice,
  RecoveryResult,
  RecoverySeverity,
  RetryOptions,
  TimeoutOptions,
} from "./errorRecovery";

export {
  createRecoveryNotice,
  loadSessionWithRecovery,
  TimeoutError,
  withRetry,
  withTimeout,
} from "./errorRecovery";

// ============================================================================
// Export / Import (bead 1v26.4)
// ============================================================================

export type { SessionExport, SessionExportFormat, SessionImportResult } from "./export";

export { exportSession, importSession } from "./export";

// ============================================================================
// Personal Analytics (bead 1v26.5)
// ============================================================================

export type {
  Achievement,
  ObjectionStats,
  PersonalAnalytics,
  TrendData,
  TrendPoint,
} from "./analytics";

export {
  computePersonalAnalytics,
  findThreadIdsForSession,
  loadObjectionStatsFromStorage,
} from "./analytics";

// ============================================================================
// Session Context Provider & Hooks (bead 1v26.3)
// ============================================================================

export type { SessionContextValue } from "./session-context";

export {
  // Constants
  PHASE_ORDER,
  SessionContext,
  // Provider
  SessionProvider,
  useCurrentPhase,
  useHypothesis,
  usePhaseNavigation,
  // Hooks
  useSession,
} from "./session-context";

// ============================================================================
// Session State Machine (bead reew.3)
// ============================================================================

export type {
  // Event types
  SessionEvent,
  SessionEventType,
  SessionMachineConfig,
  StateConfig,
  TransitionAction,
  TransitionDef,
  // Configuration types
  TransitionGuard,
  // Result types
  TransitionResult,
} from "./session-machine";

export {
  canGoBack,
  canSend,
  canTransitionTo,
  getAvailableEvents,
  getDefaultNextPhase,
  getPhaseDescription,
  // Display helpers
  getPhaseName,
  getPhaseSymbol,
  getReachablePhases,
  hasAgentResponses,
  hasEvidence,
  hasPendingAgentRequests,
  hasPredictions,
  // Guards (for custom use)
  hasPrimaryHypothesis,
  isComplete,
  // Machine config
  sessionMachineConfig,
  // Core functions
  transition,
} from "./session-machine";

// Hook and helpers
export type { SessionMachineState, UseSessionMachineOptions } from "./use-session-machine";

export {
  getPhaseStatusClass,
  getSessionProgress,
  useSessionMachine,
} from "./use-session-machine";

// ============================================================================
// Hypothesis History (bead an1n.2)
// ============================================================================

export type {
  EvolutionGraph,
  EvolutionGraphEdge,
  EvolutionGraphNode,
  EvolutionStatus,
  EvolutionTrigger,
  HypothesisChange,
  HypothesisDiff,
  HypothesisHistoryStore,
  HypothesisVersion,
} from "./hypothesis-history";

export {
  abandonHypothesis,
  addRootHypothesis,
  createHistoryStore,
  diffHypotheses,
  EVOLUTION_TRIGGER_LABELS,
  evolveHypothesis,
  findByTimeRange,
  findByTrigger,
  findCommonAncestor,
  generateEvolutionGraph,
  generateLineageGraph,
  getAncestors,
  getDescendants,
  getEvolutionStats,
  getLeaves,
  getRoot,
  isAncestor,
} from "./hypothesis-history";

// ============================================================================
// Hypothesis Arena (bead an1n.6)
// ============================================================================

export type {
  ArenaHypothesis,
  ArenaHypothesisStatus,
  ArenaTest,
  ComparisonMatrix,
  ComparisonMatrixRow,
  HypothesisArena,
  HypothesisSource,
  HypothesisTestResult,
  PredictionBoldness,
  ScoredPrediction,
  // Core types
  TestResultType,
} from "./hypothesis-arena";

export {
  // Arena operations
  addCompetitor,
  // Boldness assessment
  assessPredictionBoldness,
  BASE_SCORE_DELTAS,
  // Constants
  BOLDNESS_MULTIPLIERS,
  // Comparison matrix
  buildComparisonMatrix,
  calculateDiscriminativePower,
  calculateScoreDelta,
  createArena,
  createArenaHypothesis,
  createArenaTest,
  eliminateHypothesis,
  // Factory functions
  generateArenaId,
  generateArenaTestId,
  generateTestResultId,
  // Query functions
  getActiveHypotheses,
  getAverageBoldness,
  getEliminatedHypotheses,
  getLeader,
  getRankedHypotheses,
  isArenaHypothesis,
  // Type guards
  isHypothesisArena,
  recordTestResult,
  resolveArena,
  SOURCE_LABELS,
  STATUS_CONFIG,
  scorePredictions,
} from "./hypothesis-arena";

// ============================================================================
// Hypothesis Comparison View (bead y8px)
// ============================================================================

export type {
  ComparisonEvidenceSummary,
  ComparisonField,
  ComparisonResult,
  PredictionConflictRow,
} from "./comparison";

export {
  buildComparisonResults,
  buildEvidenceSummary,
  buildPredictionConflictMatrix,
} from "./comparison";

// ============================================================================
// Hypothesis Lifecycle State Machine (bead se2r)
// ============================================================================

export type {
  HypothesisLifecycleEvent,
  // Core types
  HypothesisState,
  // Configuration types
  HypothesisStateConfig,
  HypothesisWithLifecycle,
  LifecycleSideEffect,
  // Statistics
  LifecycleStats,
  LifecycleTransitionResult,
} from "./hypothesis-lifecycle";

export {
  // Statistics
  calculateLifecycleStats,
  canTransition,
  canTransitionWithEvent,
  // Factory functions
  createHypothesisWithLifecycle,
  getAvailableTransitions,
  getStateColors,
  getStateDescription,
  getStateIcon,
  // Display helpers
  getStateLabel,
  // State configuration
  HYPOTHESIS_STATE_CONFIG,
  // Type guards
  isHypothesisState,
  isHypothesisWithLifecycle,
  isResolvable,
  isStateDeletable,
  isStateEditable,
  // State queries
  isTerminalState,
  shouldBeDormant,
  // Core transition functions
  transitionHypothesis,
  upgradeToLifecycle,
} from "./hypothesis-lifecycle";

// ============================================================================
// Prediction Lock System (bead rffy)
// ============================================================================

export type {
  LockedPrediction,
  // Result types
  LockResult,
  // Display types
  LockStateDisplay,
  PredictionAmendment,
  // Core types
  PredictionLockState,
  PredictionLockStats,
  PredictionType,
  RevealResult,
  VerificationResult,
} from "./prediction-lock";

export {
  amendPrediction,
  // Statistics & scoring
  calculatePredictionLockStats,
  calculateRobustnessMultiplier,
  formatLockTimestamp,
  // Cryptographic functions
  generateHash,
  // ID generation
  generatePredictionLockId,
  getLockStateDisplay,
  getShortHash,
  isLockedPrediction,
  // Type guards
  isPredictionLockState,
  isPredictionType,
  // Display helpers
  LOCK_STATE_DISPLAY,
  // Core lock operations
  lockPrediction,
  revealPrediction,
  verifyPrediction,
} from "./prediction-lock";

// ============================================================================
// Evidence Ledger (bead njjo.1)
// ============================================================================
//
// NOTE: There are TWO EvidenceEntry interfaces in this codebase:
//
// 1. `EvidenceEntry` (from types.ts, exported in Session types above):
//    - SIMPLIFIED interface for session-embedded evidence tracking
//    - Used in Session.evidenceLedger for lightweight storage
//    - Fields: id, testId, recordedAt, observation, potencyCheckPassed, etc.
//
// 2. `FullEvidenceEntry` (from evidence.ts, exported below):
//    - COMPREHENSIVE interface with full audit trails
//    - Used for evidence analysis, validation, and detailed reporting
//    - Fields: id, sessionId, test (TestDescription), predictionIfTrue/False,
//      result, observation, confidenceBefore/After, interpretation, etc.
//
// When in doubt:
// - Use `EvidenceEntry` for storing in Session.evidenceLedger
// - Use `FullEvidenceEntry` for evidence validation, analysis, or export
// ============================================================================

export type {
  DiscriminativePower,
  // Comprehensive evidence interface (see note above)
  // Aliased to distinguish from simplified EvidenceEntry in types.ts
  EvidenceEntry as FullEvidenceEntry,
  EvidenceResult,
  EvidenceValidationError,
  EvidenceValidationErrorCode,
  // Validation types
  EvidenceValidationResult,
  EvidenceValidationWarning,
  EvidenceValidationWarningCode,
  TestDescription,
  // Core types
  TestType,
} from "./evidence";

export {
  // Utility functions
  calculateConfidenceDelta,
  createEvidenceEntry,
  DISCRIMINATIVE_POWER_LABELS,
  EVIDENCE_ID_PATTERN,
  // Factory functions
  generateEvidenceId,
  getResultColor,
  isDiscriminativePower,
  isEvidenceEntry,
  isEvidenceResult,
  isTestDescription,
  // Type guards
  isTestType,
  summarizeEvidenceResult,
  // Constants
  TEST_TYPE_LABELS,
  // Validation
  validateEvidenceEntry,
} from "./evidence";

// ============================================================================
// Calibration Tracking (bead x3xg)
// ============================================================================

export type {
  CalibrationBin,
  CalibrationMetrics,
  CalibrationProgress,
  PredictionRecord,
  ResolutionFeedback,
} from "./calibration";

export {
  // Calibration calculation
  binPredictions,
  CALIBRATION_ERROR_THRESHOLD,
  calculateBias,
  calculateBrierScore,
  calculateCalibrationError,
  calculateCalibrationMetrics,
  calculateDomainAccuracy,
  calculateSharpness,
  createPredictionRecord,
  // Constants
  DEFAULT_BIN_BOUNDARIES,
  // Utility functions
  formatBrierScore,
  formatCalibrationError,
  // Record creation
  generatePredictionId,
  generateResolutionFeedback,
  // Feedback generation
  getCalibrationAtConfidence,
  getCalibrationQualityAssessment,
  identifyCalibrationStrengths,
  // Type guards
  isPredictionOutcome,
  isPredictionRecord,
  MIN_PREDICTIONS_FOR_METRICS,
  MIN_PREDICTIONS_PER_BIN,
  resolvePrediction,
  // Progress tracking
  trackCalibrationProgress,
} from "./calibration";

// ============================================================================
// Artifact Templates (bead nu8g.1)
// ============================================================================

export type {
  AgentAnalysis,
  // Note: HypothesisEvolution omitted - already exported from types.ts
  // The artifacts version uses a different shape for template rendering
  DiscriminativeStructure,
  EvidenceSummary as ResearchBriefEvidenceSummary,
  HypothesisStatement,
  OperatorAppliedSummary,
  ResearchBriefMetadata,
  ResearchBriefStatus,
  ResearchBriefTemplateInput,
} from "./artifacts/research-brief-template";

export {
  createResearchBriefTemplate,
  RESEARCH_BRIEF_TEMPLATE_VERSION,
  renderResearchBriefTemplate,
} from "./artifacts/research-brief-template";

// ============================================================================
// Citation Manager (bead nu8g.3)
// ============================================================================

export type {
  BrennerCitation,
  CitationIndex,
  CitationIndexRenderOptions,
  ExternalCitation,
  ExternalCitationType,
} from "./artifacts/citations";

export {
  buildBrennerCitations,
  buildCitationIndex,
  buildTranscriptSectionHref,
  extractBrennerSectionIdsFromText,
  formatBrennerAnchor,
  formatExternalCitation,
  parseBrennerSectionIds,
  renderCitationIndexSection,
} from "./artifacts/citations";

// ============================================================================
// Research Brief Export (bead nu8g.2)
// ============================================================================

export type {
  ResearchBriefExportFormat,
  ResearchBriefExportOptions,
  ResearchBriefExportResult,
  ResearchBriefJSONExport,
} from "./artifacts/research-brief-export";

export {
  downloadResearchBrief,
  exportToJSON,
  exportToMarkdown,
  exportToPDF,
  importResearchBrief,
  printResearchBrief,
} from "./artifacts/research-brief-export";

// ============================================================================
// Robustness Score (bead an1n.4)
// ============================================================================

export type {
  RobustnessComponents,
  RobustnessConfig,
  RobustnessInterpretation,
  RobustnessScore,
} from "./robustness";

export {
  aggregateRobustness,
  // Comparison & aggregation
  compareRobustness,
  computeFalsifiabilityScore,
  computeRobustness,
  // Core calculation
  computeSpecificityScore,
  // Constants
  DEFAULT_ROBUSTNESS_CONFIG,
  formatRobustnessScore,
  // Display helpers
  getRobustnessDisplay,
  // Type guards
  isRobustnessInterpretation,
  isRobustnessScore,
  ROBUSTNESS_LABELS,
  summarizeRobustness,
} from "./robustness";

// ============================================================================
// Embeddings (bead ukd1.1)
// ============================================================================

export type {
  EmbeddingEntry,
  EmbeddingIndex,
  EmbeddingMatch,
  EmbeddingSource,
} from "./search/embeddings";

export {
  cosineSimilarity,
  EMBEDDING_DIMENSION,
  EMBEDDING_INDEX_VERSION,
  embedText,
  findSimilar,
  loadEmbeddings,
} from "./search/embeddings";

// ============================================================================
// Multi-Agent Tribunal System (bead xlk2.1)
// ============================================================================

export type {
  AgentBehavior,
  AgentPersona,
  InteractionPattern,
  InvocationTrigger,
  ModelConfig as AgentModelConfig,
  // Agent persona types (beads njiu, oytk)
  PersonaPhaseGroup,
  SessionPhase as AgentSessionPhase, // Deprecated alias
  ToneCalibration,
  TribunalAgentConfig,
  // Agent types
  TribunalAgentRole,
} from "./agents";

export {
  AGENT_PERSONAS,
  type AgentDispatch,
  type AgentTask,
  // Agent dispatch types (bead xlk2.2)
  type AgentTaskStatus,
  BRENNER_CHANNELER_PERSONA,
  buildAgentPrompt,
  buildSystemPromptContext,
  type CreateDispatchOptions,
  checkAgentAvailability,
  clearPromptCache,
  // Agent dispatch functions
  createDispatch,
  // Agent dispatch constants
  DEFAULT_DISPATCH_ROLES,
  // Agent personas (beads njiu, oytk)
  DEVILS_ADVOCATE_PERSONA,
  DISPATCH_SUBJECT_PREFIX,
  dispatchAgentTask,
  dispatchAllTasks,
  EXPERIMENT_DESIGNER_PERSONA,
  FALLBACK_BRENNER_QUOTES,
  formatHypothesisForPrompt,
  formatOperatorResultsForPrompt,
  generateThreadId,
  getActivePersonasForPhase,
  getAgentConfig,
  getBehaviorsByPriority,
  getDispatchStatus,
  getFallbackContent,
  getInteractionExamples,
  getModelConfig,
  // Persona utility functions
  getPersona,
  getPersonasForTrigger,
  // Agent helpers
  getTribunalAgentsInOrder,
  // Type guards
  isTribunalAgentRole,
  loadPrompt,
  // Phase mapping (converts detailed SessionPhase to PersonaPhaseGroup)
  mapSessionPhaseToPersonaGroup,
  type OperatorResults,
  type PollOptions,
  pollForResponses,
  STATISTICIAN_PERSONA,
  SYNTHESIS_PERSONA,
  shouldInvokePersona,
  // Agent configurations
  TRIBUNAL_AGENTS,
  TRIBUNAL_ORDER,
  type TribunalAgentResponse,
} from "./agents";

// ============================================================================
// Hypothesis Graveyard (bead an1n.7)
// ============================================================================

export type {
  // Core types
  DeathType,
  FailurePattern,
  FalsificationLearning,
  FalsifiedHypothesis,
  // Statistics types
  GraveyardStats,
  GraveyardValidationError,
  GraveyardValidationErrorCode,
  // Validation types
  GraveyardValidationResult,
  GraveyardValidationWarning,
  GraveyardValidationWarningCode,
} from "./graveyard";

export {
  addContributedTo,
  // Operations
  addSuccessor,
  analyzeFailurePatterns,
  BRENNER_FALSIFICATION_QUOTES,
  // Statistics & Analysis
  calculateGraveyardStats,
  createFalsifiedHypothesis,
  DEATH_TYPE_DESCRIPTIONS,
  DEATH_TYPE_ICONS,
  // Constants
  DEATH_TYPE_LABELS,
  formatFalsificationDate,
  GRAVEYARD_ID_PATTERN,
  // Factory functions
  generateGraveyardId,
  getDeathTypeDisplay,
  // Display helpers
  getRandomBrennerQuote,
  // Type guards
  isDeathType,
  isFalsifiedHypothesis,
  summarizeFalsification,
  updateEpitaph,
  updateLearning,
  // Validation
  validateFalsifiedHypothesis,
} from "./graveyard";

// ============================================================================
// Test Queue (bead njjo.5)
// ============================================================================

export type {
  TestQueueItem,
  TestQueuePriority,
  TestQueueSource,
  TestQueueStats,
  TestQueueStatus,
} from "./test-queue";

export {
  addExclusionTestsToQueue,
  addManualQueueItem,
  clearTestQueue,
  generateQueueItemId,
  getTestQueueStats,
  isPredictionsLocked,
  loadTestQueue,
  lockQueueItemPredictions,
  priorityFromPower,
  saveTestQueue,
  updateQueueItem,
} from "./test-queue";

// ============================================================================
// What-If Scenario Explorer (bead njjo.6)
// ============================================================================

export type {
  AssumedTestResult,
  ScenarioAnalysis,
  TestComparison,
  TestComparisonResult,
  WhatIfScenario,
} from "./what-if";

export {
  addTestToScenario,
  // Scenario analysis
  analyzeScenario,
  // Single test analysis
  analyzeTestQueueItem,
  calculateRecommendationRating,
  calculateScenarioOutcome,
  // Test comparison
  compareTests,
  // Preset scenarios
  createBestCaseScenario,
  createMixedScenario,
  // Scenario creation and manipulation
  createScenario,
  createWorstCaseScenario,
  // Utility functions
  formatInformationValue,
  getRecommendationColor,
  getRecommendationStars,
  // Constants
  RECOMMENDATION_LABELS,
  removeTestFromScenario,
  summarizeScenario,
  updateTestInScenario,
} from "./what-if";

// ============================================================================
// Literature Integration (bead njjo.7)
// ============================================================================

export type {
  BibTeXEntry,
  // Import types
  DOIImportInput,
  LiteratureSearch,
  // Search types
  LiteratureSearchFilters,
  // Source types
  LiteratureSource,
  PaperResult,
  // Evidence recording types
  RecordPaperAsEvidenceInput,
  SuggestedSearches,
} from "./literature";

export {
  bibTeXToPaperResult,
  // Relevance scoring
  calculateRelevance,
  // Factory functions
  createLiteratureSearch,
  createPaperResult,
  DOI_PATTERN,
  doiToUrl,
  extractDOI,
  // Evidence recording
  formatCitation,
  formatPaperSource,
  generatePaperId,
  // ID generation
  generateSearchId,
  // Search query generation
  generateSearchQueries,
  getPaperAgeCategory,
  getRelevanceColor,
  getRelevanceLabel,
  isLiteratureSearch,
  // Type guards
  isPaperResult,
  // DOI utilities
  isValidDOI,
  LITERATURE_SEARCH_ID_PATTERN,
  // Constants
  LITERATURE_SOURCE_LABELS,
  MAX_SEARCH_RESULTS,
  // Citation parsing
  parseBibTeX,
  preparePaperEvidenceData,
  RELEVANCE_THRESHOLDS,
  rankByRelevance,
  // Utility functions
  summarizePaper,
} from "./literature";

// ============================================================================
// Hypothesis Templates (bead 838e)
// ============================================================================

export type {
  HypothesisTemplate,
  HypothesisTemplateContent,
  TemplateCategory,
} from "./hypothesis-templates";

export {
  getFeaturedTemplates,
  // Helper functions
  getTemplate,
  getTemplatesByDifficulty,
  getTemplatesByDomain,
  getTemplatesByTag,
  // Template registry
  HYPOTHESIS_TEMPLATES,
  searchTemplates,
  TEMPLATE_BY_ID,
  TEMPLATE_CATEGORIES,
  templateToPartialCard,
} from "./hypothesis-templates";

// ============================================================================
// Session Templates (bead reew.7)
// ============================================================================

export type {
  AgentRole as SessionAgentRole,
  SessionDepth,
  // Core types
  SessionTemplate,
  SessionTemplateSettings,
} from "./session-templates";

export {
  // Agent role helpers
  AGENT_ROLE_INFO,
  // Settings functions
  createTemplateSettings,
  customizeTemplateSettings,
  getActivePhases,
  getAgentRoleDescription,
  getAgentRoleName,
  getEffectiveAgents,
  getEffectivePhases,
  getFeaturedSessionTemplates,
  getPhaseOrderForTemplate,
  // Query functions
  getSessionTemplate,
  getSortedSessionTemplates,
  getTemplateForTimeConstraint,
  getTemplatesByDepth,
  isPhaseEnabled,
  isPhaseOptional,
  // Phase helpers
  isPhaseRequired,
  isPhaseSkipped,
  // Template registry
  SESSION_TEMPLATES,
  TEMPLATE_BY_ID as SESSION_TEMPLATE_BY_ID,
  // Validation
  validateTemplate,
} from "./session-templates";

// ============================================================================
// Coach Mode (bead reew.8)
// ============================================================================

export type {
  // Context value
  CoachContextValue,
  // Settings types
  CoachLevel,
  CoachSettings,
  ConceptCategory,
  ConceptId,
  LearningProgress,
  PhaseCoachingContent,
} from "./coach-context";

export {
  CoachContext,
  // Provider
  CoachProvider,
  LEVEL_THRESHOLDS,
  // Constants
  PHASE_COACHING,
  // Hooks
  useCoach,
  useCoachActive,
  useCoachProgress,
  usePhaseCoaching,
} from "./coach-context";

// ============================================================================
// Failure Mode Analytics (bead 4lv6)
// ============================================================================

export type {
  DomainFailureDistribution,
  FailureAnalytics,
  FailureInsight,
  // Core types
  FailureMode,
  FailureModeOccurrence,
  OperatorFailurePattern,
  StructuralPatternFailure,
} from "./failure-analytics";

export {
  // Core analytics
  computeFailureAnalytics,
  // Pattern detectors
  STRUCTURAL_PATTERNS,
  summarizeFailureAnalytics,
} from "./failure-analytics";
