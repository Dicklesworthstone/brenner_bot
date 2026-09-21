/**
 * Brenner Loop Session Data Model
 *
 * This module defines the core TypeScript interfaces for the Brenner Loop system.
 * The Session is the top-level container that orchestrates hypotheses, predictions,
 * tests, and evidence through the discriminative testing methodology.
 *
 * Design principles:
 * 1. Session state is immutable - changes create new versions
 * 2. All entities link back to the registries in ../schemas/
 * 3. Operator applications are first-class citizens
 * 4. Git-style versioning for audit trails
 *
 * @see ../schemas/hypothesis.ts - Hypothesis entity schema
 * @see ../schemas/prediction.ts - Prediction entity schema
 * @see ../schemas/test-record.ts - TestRecord entity schema
 * @see ../schemas/assumption.ts - Assumption entity schema
 * @see ./hypothesis.ts - HypothesisCard interface (bead an1n.1)
 * @see specs/artifact_schema_v0.1.md - Full artifact specification
 * @see brenner_bot-1v26.1 (bead)
 */

import type { DocCategory } from "../globalSearchTypes";
// Import and re-export HypothesisCard and related items from the dedicated module (bead an1n.1)
// This avoids duplication while making them available from this module
import type { HypothesisCard, IdentifiedConfound } from "./hypothesis";

export {
  createHypothesisCard,
  evolveHypothesisCard,
  isHypothesisCard,
  isIdentifiedConfound,
  validateHypothesisCard,
} from "./hypothesis";
// Re-export hypothesis history types and functions (bead an1n.2)
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
export type { HypothesisCard, IdentifiedConfound };

// ============================================================================
// Session Phases
// ============================================================================

/**
 * The phases of a Brenner Loop session.
 *
 * Flow:
 *   intake → sharpening → level_split → exclusion_test →
 *   object_transpose → scale_check → agent_dispatch →
 *   synthesis → evidence_gathering → revision → complete
 *
 * Simplified view (4 major phases):
 *   INTAKE → REFINEMENT → TESTING → SYNTHESIS
 *
 * @see brenner_bot-43o6 - Detailed phase definitions
 */
export type SessionPhase =
  | "intake" // Initial hypothesis capture
  | "sharpening" // Hypothesis refinement
  | "level_split" // Apply Σ operator - identify levels
  | "exclusion_test" // Apply ⊘ operator - design discriminative tests
  | "object_transpose" // Apply ⟳ operator - change reference frames
  | "scale_check" // Apply ⊙ operator - check scale-dependence
  | "agent_dispatch" // Send to agents for analysis
  | "synthesis" // Combine agent responses
  | "evidence_gathering" // Execute tests, collect evidence
  | "revision" // Revise based on evidence
  | "complete"; // Session finished

/**
 * Simplified 4-phase model for UI display
 */
export type SimplifiedPhase = "intake" | "refinement" | "testing" | "synthesis";

/**
 * Map detailed phases to simplified phases
 */
export function toSimplifiedPhase(phase: SessionPhase): SimplifiedPhase {
  switch (phase) {
    case "intake":
      return "intake";
    case "sharpening":
    case "level_split":
    case "exclusion_test":
    case "object_transpose":
    case "scale_check":
      return "refinement";
    case "agent_dispatch":
    case "evidence_gathering":
    case "revision":
      return "testing";
    case "synthesis":
    case "complete":
      return "synthesis";
  }
}

/**
 * Check if a phase transition is valid
 */
export function isValidTransition(from: SessionPhase, to: SessionPhase): boolean {
  const transitions: Record<SessionPhase, SessionPhase[]> = {
    intake: ["sharpening"],
    sharpening: ["level_split", "exclusion_test", "agent_dispatch"],
    level_split: [
      "sharpening",
      "exclusion_test",
      "object_transpose",
      "scale_check",
      "agent_dispatch",
    ],
    exclusion_test: ["level_split", "object_transpose", "scale_check", "agent_dispatch"],
    object_transpose: ["exclusion_test", "scale_check", "agent_dispatch"],
    scale_check: ["object_transpose", "agent_dispatch"],
    agent_dispatch: ["scale_check", "synthesis", "evidence_gathering"],
    synthesis: ["agent_dispatch", "evidence_gathering", "revision", "complete"],
    evidence_gathering: ["revision", "synthesis"],
    revision: ["level_split", "agent_dispatch", "synthesis", "complete"],
    complete: [], // Terminal state
  };

  return transitions[from]?.includes(to) ?? false;
}

// ============================================================================
// Session-Specific Hypothesis Extensions
// ============================================================================

// HypothesisCard and IdentifiedConfound are imported from ./hypothesis.ts
// See bead brenner_bot-an1n.1 for the canonical implementation

/**
 * Record of a confidence update
 */
export interface ConfidenceUpdate {
  /** New confidence value */
  confidence: number;

  /** When the update occurred */
  timestamp: string;

  /** What caused the update */
  reason: string;

  /** Reference to evidence that triggered update */
  evidenceId?: string;
}

// ============================================================================
// Operator Results
// ============================================================================

/**
 * Result of applying the Level Split (Σ) operator.
 * Identifies different levels of explanation that might be conflated.
 *
 * @see specs/operator_library_v0.1.md - Level Split definition
 */
export interface LevelSplitResult {
  /** When was this operator applied */
  appliedAt: string;

  /** Who applied it (agent name or "user") */
  appliedBy: string;

  /** Identified levels of explanation */
  levels: LevelIdentification[];

  /** Any level conflation detected? */
  conflationDetected: boolean;

  /** Description of conflation if detected */
  conflationDescription?: string;

  /** Notes from the operator application */
  notes?: string;
}

/**
 * A single level of explanation identified
 */
export interface LevelIdentification {
  /** Level name (e.g., "molecular", "cellular", "organismal") */
  name: string;

  /** Description of this level */
  description: string;

  /** Which hypotheses operate at this level */
  hypothesisIds: string[];

  /** Is this the "program" or "interpreter" level? */
  levelType: "program" | "interpreter" | "both" | "unclear";
}

/**
 * Result of applying the Exclusion Test (⊘) operator.
 * Designs tests that could rule out hypotheses.
 *
 * @see specs/operator_library_v0.1.md - Exclusion Test definition
 */
export interface ExclusionTestResult {
  /** When was this operator applied */
  appliedAt: string;

  /** Who applied it */
  appliedBy: string;

  /** Designed tests that could rule out hypotheses */
  designedTests: DesignedTest[];

  /** Tests that were rejected and why */
  rejectedTests: RejectedTest[];

  /** Notes from the operator application */
  notes?: string;
}

/**
 * A test designed during Exclusion Test operator application
 */
export interface DesignedTest {
  /** Short name for the test */
  name: string;

  /** Description of the test procedure */
  procedure: string;

  /** Which hypotheses this test could rule out */
  couldExclude: string[];

  /** Expected discriminative power (0-3) */
  discriminativePower: number;

  /** Has this been formalized as a TestRecord? */
  formalizedAsTestId?: string;
}

/**
 * A test that was considered but rejected
 */
export interface RejectedTest {
  name: string;
  reason: string;
}

/**
 * Result of applying the Object Transpose (⟳) operator.
 * Changes the experimental system or reference frame.
 *
 * @see specs/operator_library_v0.1.md - Object Transpose definition
 */
export interface ObjectTransposeResult {
  /** When was this operator applied */
  appliedAt: string;

  /** Who applied it */
  appliedBy: string;

  /** Original experimental system */
  originalSystem: string;

  /** Alternative systems considered */
  alternativeSystems: AlternativeSystem[];

  /** Which system was selected (if any) */
  selectedSystem?: string;

  /** Rationale for selection */
  selectionRationale?: string;

  /** Notes from the operator application */
  notes?: string;
}

/**
 * An alternative experimental system considered
 */
export interface AlternativeSystem {
  /** System name (e.g., "zebrafish", "C. elegans", "in vitro") */
  name: string;

  /** Advantages of this system */
  pros: string[];

  /** Disadvantages of this system */
  cons: string[];

  /** Estimated cost difference vs original */
  relativeCost?: "cheaper" | "similar" | "more_expensive";

  /** Estimated time difference vs original */
  relativeTime?: "faster" | "similar" | "slower";
}

/**
 * Result of applying the Scale Check (⊙) operator.
 * Verifies physical/mathematical plausibility.
 *
 * @see specs/operator_library_v0.1.md - Scale Check definition
 */
export interface ScaleCheckResult {
  /** When was this operator applied */
  appliedAt: string;

  /** Who applied it */
  appliedBy: string;

  /** Calculations performed */
  calculations: ScaleCalculation[];

  /** Overall result: is the hypothesis plausible at this scale? */
  plausible: boolean;

  /** Which hypotheses are ruled out by scale constraints */
  ruledOutByScale: string[];

  /** Notes from the operator application */
  notes?: string;
}

/**
 * A scale calculation
 */
export interface ScaleCalculation {
  /** What quantity is being calculated */
  name: string;

  /** The calculation details */
  quantities: string;

  /** Numerical result */
  result: string;

  /** Units */
  units: string;

  /** What this implies */
  implication: string;

  /** Does this rule out any hypotheses? */
  rulesOut?: string[];
}

// ============================================================================
// Agent Responses
// ============================================================================

/**
 * Agent roles in the Brenner Protocol
 */
export type AgentRole = "hypothesis_generator" | "test_designer" | "adversarial_critic";

/**
 * Response from an agent during a session
 */
export interface AgentResponse {
  id: string;

  /** Agent name (e.g., "GreenCastle") */
  agentName: string;

  /** Agent role */
  role: AgentRole;

  /** Thread ID in Agent Mail */
  threadId: string;

  /** Message ID in Agent Mail */
  messageId: number;

  /** When was this response received */
  receivedAt: string;

  /** Has this response been acknowledged */
  acknowledged: boolean;

  /** When was it acknowledged */
  acknowledgedAt?: string;

  /** Summary of the response (for display) */
  summary: string;

  /** Full response body (markdown) */
  body?: string;

  /** Extracted deltas (hypothesis changes, new tests, etc.) */
  deltas?: AgentDelta[];

  /** Was there an error processing this response? */
  error?: string;
}

/**
 * A structured change proposed by an agent
 */
export interface AgentDelta {
  /** Type of change */
  type:
    | "hypothesis_add"
    | "hypothesis_edit"
    | "hypothesis_kill"
    | "prediction_add"
    | "test_add"
    | "assumption_add"
    | "anomaly_add"
    | "critique";

  /** Target entity ID (for edits/kills) */
  targetId?: string;

  /** The proposed change content */
  content: unknown; // Type depends on delta type

  /** Was this delta accepted */
  accepted?: boolean;

  /** Reason for rejection if not accepted */
  rejectionReason?: string;
}

// ============================================================================
// Evidence Ledger
// ============================================================================

/**
 * An entry in the session's embedded evidence ledger.
 *
 * **IMPORTANT**: This is the SIMPLIFIED evidence interface for session-embedded
 * evidence tracking. It captures test outcomes and their impact on hypotheses
 * with minimal overhead.
 *
 * For the COMPREHENSIVE evidence interface with full test descriptions,
 * pre-registered predictions, and detailed audit trails, use `FullEvidenceEntry`
 * from the module's exports (defined in `evidence.ts`).
 *
 * **When to use which:**
 * - `EvidenceEntry` (this): Lightweight tracking within Session.evidenceLedger
 * - `FullEvidenceEntry`: Detailed evidence analysis, validation, and export
 *
 * @see FullEvidenceEntry - The comprehensive evidence interface
 * @see evidence.ts - Module with full evidence tracking capabilities
 */
export interface EvidenceEntry {
  id: string;

  /** Which test produced this evidence */
  testId: string;

  /** When was this evidence recorded */
  recordedAt: string;

  /** The observed outcome */
  observation: string;

  /** Result of the evidence evaluation */
  result?: "supports" | "challenges" | "inconclusive";

  /** Did the potency check pass? */
  potencyCheckPassed: boolean;

  /** Notes on potency check */
  potencyNotes?: string;

  /** Which hypothesis's prediction matched? */
  matchedHypothesisId?: string;

  /** Confidence delta this evidence implies */
  confidenceDelta?: number;

  /** Raw data reference (file path, URL) */
  rawDataRef?: string;

  /** Was there anything unexpected? */
  surprises?: string[];

  /** Who recorded this evidence */
  recordedBy: string;

  /** Additional notes */
  notes?: string;
}

// ============================================================================
// Research Artifacts
// ============================================================================

/**
 * Types of research artifacts produced by a session
 */
export type ArtifactType =
  | "research_brief" // Final summary document
  | "hypothesis_slate" // Current hypothesis set
  | "predictions_table" // Predictions matrix
  | "test_queue" // Prioritized test list
  | "evidence_summary" // Evidence overview
  | "session_export"; // Full session export

/**
 * A research artifact produced during or after a session
 */
export interface ResearchArtifact {
  id: string;

  /** Type of artifact */
  type: ArtifactType;

  /** Version number */
  version: number;

  /** When was this version created */
  createdAt: string;

  /** Who created this artifact */
  createdBy: string;

  /** Content format */
  format: "markdown" | "json" | "pdf";

  /** Content (for inline artifacts) */
  content?: string;

  /** External reference (for large artifacts) */
  externalRef?: string;

  /** Checksum for integrity */
  checksum?: string;
}

// ============================================================================
// Session Commits (Version History)
// ============================================================================

/**
 * What triggered a session commit
 */
export type CommitTrigger =
  | "manual" // User explicitly saved
  | "operator" // Operator application
  | "agent_response" // Agent responded
  | "evidence" // Evidence recorded
  | "phase_change" // Phase transition
  | "auto_save"; // Periodic auto-save

/**
 * A commit in the session's version history
 */
export interface SessionCommit {
  id: string;

  /** Parent commit ID (null for initial commit) */
  parentId: string | null;

  /** When was this commit created */
  timestamp: string;

  /** What triggered this commit */
  trigger: CommitTrigger;

  /** Human-readable commit message */
  message: string;

  /** Snapshot of session state at this commit */
  snapshot: SessionSnapshot;

  /** Git-style hash for integrity */
  hash?: string;
}

/**
 * A snapshot of session state (stored in commits)
 */
export interface SessionSnapshot {
  phase: SessionPhase;
  hypothesisIds: string[];
  primaryHypothesisId: string;
  confidence: number;
  evidenceCount: number;
  testCount: number;
}

// ============================================================================
// Corpus Attachments
// ============================================================================

export type AttachedQuoteField = "statement" | "mechanism" | "prediction" | "general";

export interface AttachedQuote {
  /** Stable unique identifier (per attachment) */
  id: string;

  /** Hypothesis card this quote supports */
  hypothesisId: string;

  /** Which field it supports (UI hint) */
  field: AttachedQuoteField;

  /** When attached (ISO timestamp) */
  attachedAt: string;

  /** Global-search provenance */
  docId: string;
  docTitle: string;
  category: DocCategory;
  model?: "gpt" | "opus" | "gemini";
  title: string;
  snippet: string;
  anchor?: string;
  url: string;
}

// ============================================================================
// Session (Top-Level Container)
// ============================================================================

/**
 * A Brenner Loop Session is the top-level container for a research investigation.
 *
 * It orchestrates:
 * - Hypotheses (via HypothesisCard references)
 * - Predictions and Tests (via registry IDs)
 * - Operator applications and their results
 * - Agent coordination and responses
 * - Evidence collection and confidence updates
 * - Artifact generation
 * - Version history for audit trails
 */
export interface Session {
  /** Unique session ID (format: SESSION-{date}-{seq}) */
  id: string;

  /** Schema version for migrations */
  _version: number;

  /** When was this session created */
  createdAt: string;

  /** When was this session last updated */
  updatedAt: string;

  /** Current phase */
  phase: SessionPhase;

  // === HYPOTHESES ===

  /**
   * The primary hypothesis being investigated.
   * References a HypothesisCard.
   */
  primaryHypothesisId: string;

  /**
   * Alternative hypotheses under consideration.
   * Must include at least one third_alternative.
   */
  alternativeHypothesisIds: string[];

  /**
   * Archived/discarded hypotheses.
   * Kept for learning and audit trails.
   */
  archivedHypothesisIds: string[];

  /**
   * Full HypothesisCard objects (denormalized for performance).
   * Keyed by hypothesis ID.
   */
  hypothesisCards: Record<string, HypothesisCard>;

  /**
   * Evolution history linking hypothesis versions.
   */
  hypothesisEvolution: HypothesisEvolution[];

  // === CORPUS / CITATIONS ===

  /**
   * Corpus excerpts/quotes attached to hypotheses for provenance and export.
   */
  attachedQuotes?: AttachedQuote[];

  // === OPERATOR APPLICATIONS ===

  /**
   * Results from operator applications.
   * Multiple applications allowed per operator.
   */
  operatorApplications: {
    levelSplit: LevelSplitResult[];
    exclusionTest: ExclusionTestResult[];
    objectTranspose: ObjectTransposeResult[];
    scaleCheck: ScaleCheckResult[];
  };

  // === PREDICTIONS & TESTS ===

  /**
   * IDs of predictions created in this session.
   * References the Prediction registry.
   */
  predictionIds: string[];

  /**
   * IDs of tests designed in this session.
   * References the TestRecord registry.
   */
  testIds: string[];

  /**
   * IDs of assumptions recorded in this session.
   * References the Assumption registry.
   */
  assumptionIds: string[];

  // === AGENTS ===

  /**
   * Pending agent requests (awaiting response).
   */
  pendingAgentRequests: PendingAgentRequest[];

  /**
   * Agent responses received.
   */
  agentResponses: AgentResponse[];

  /**
   * Synthesized result from agent responses.
   */
  synthesis?: SynthesisResult;

  // === EVIDENCE ===

  /**
   * Evidence collected during this session.
   */
  evidenceLedger: EvidenceEntry[];

  // === ARTIFACTS ===

  /**
   * Research artifacts produced by this session.
   */
  artifacts: ResearchArtifact[];

  // === VERSION HISTORY ===

  /**
   * Git-style commit history.
   */
  commits: SessionCommit[];

  /**
   * Current commit ID (head of history).
   */
  headCommitId: string;

  // === METADATA ===

  /**
   * Research question being investigated.
   */
  researchQuestion?: string;

  /**
   * Theme or topic area.
   */
  theme?: string;

  /**
   * Domain (e.g., "molecular biology").
   */
  domain?: string;

  /**
   * Tags for categorization.
   */
  tags?: string[];

  /**
   * Session notes.
   */
  notes?: string;

  /**
   * Who created this session.
   */
  createdBy?: string;
}

/**
 * A pending agent request
 */
export interface PendingAgentRequest {
  /** Agent Mail thread ID */
  threadId: string;

  /** Target agent name */
  agentName: string;

  /** Agent role */
  role: AgentRole;

  /** When was the request sent */
  requestedAt: string;

  /** Request status */
  status: "pending" | "in_progress" | "completed" | "failed" | "timeout";

  /** Error message if failed */
  error?: string;
}

/**
 * Synthesis result from combining agent responses
 */
export interface SynthesisResult {
  /** When was synthesis completed */
  completedAt: string;

  /** Key insights from all agents */
  keyInsights: string[];

  /** Points of agreement between agents */
  consensus: string[];

  /** Points of disagreement between agents */
  disagreements: Disagreement[];

  /** Recommended next steps */
  recommendations: string[];

  /** Agent contributions */
  contributions: Record<string, AgentContribution>;

  /** Overall synthesis quality (0-3) */
  quality: number;
}

/**
 * A disagreement between agents
 */
export interface Disagreement {
  topic: string;
  positions: Record<string, string>; // agent name -> position
  resolution?: string;
}

/**
 * A single agent's contribution to synthesis
 */
export interface AgentContribution {
  agentName: string;
  role: AgentRole;
  hypothesesProposed: number;
  testsDesigned: number;
  critiquesRaised: number;
  keyPoints: string[];
}

/**
 * Evolution link between hypothesis versions
 */
export interface HypothesisEvolution {
  fromVersionId: string;
  toVersionId: string;
  reason: string;
  trigger: "level_split" | "exclusion_test" | "evidence" | "agent_feedback" | "manual";
  timestamp: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for SessionPhase
 */
export function isSessionPhase(value: unknown): value is SessionPhase {
  const validPhases: SessionPhase[] = [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
    "evidence_gathering",
    "revision",
    "complete",
  ];
  return typeof value === "string" && validPhases.includes(value as SessionPhase);
}

/**
 * Type guard for AgentRole
 */
export function isAgentRole(value: unknown): value is AgentRole {
  const validRoles: AgentRole[] = ["hypothesis_generator", "test_designer", "adversarial_critic"];
  return typeof value === "string" && validRoles.includes(value as AgentRole);
}

/**
 * Type guard for Session (basic structure check)
 */
export function isSession(obj: unknown): obj is Session {
  if (typeof obj !== "object" || obj === null) return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s._version === "number" &&
    typeof s.createdAt === "string" &&
    typeof s.phase === "string" &&
    isSessionPhase(s.phase) &&
    typeof s.primaryHypothesisId === "string" &&
    Array.isArray(s.alternativeHypothesisIds)
  );
}

// isHypothesisCard is exported from ./hypothesis.ts
// See bead brenner_bot-an1n.1 for the canonical implementation

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Current schema version for migrations
 */
export const CURRENT_SESSION_VERSION = 1;

/**
 * Create an empty session with sensible defaults
 */
export function createSession(input: {
  id: string;
  researchQuestion?: string;
  theme?: string;
  domain?: string;
  createdBy?: string;
}): Session {
  const now = new Date().toISOString();
  const initialCommit: SessionCommit = {
    id: `commit-${Date.now()}-001`,
    parentId: null,
    timestamp: now,
    trigger: "manual",
    message: "Session created",
    snapshot: {
      phase: "intake",
      hypothesisIds: [],
      primaryHypothesisId: "",
      confidence: 0,
      evidenceCount: 0,
      testCount: 0,
    },
  };

  return {
    id: input.id,
    _version: CURRENT_SESSION_VERSION,
    createdAt: now,
    updatedAt: now,
    phase: "intake",

    primaryHypothesisId: "",
    alternativeHypothesisIds: [],
    archivedHypothesisIds: [],
    hypothesisCards: {},
    hypothesisEvolution: [],
    attachedQuotes: [],

    operatorApplications: {
      levelSplit: [],
      exclusionTest: [],
      objectTranspose: [],
      scaleCheck: [],
    },

    predictionIds: [],
    testIds: [],
    assumptionIds: [],

    pendingAgentRequests: [],
    agentResponses: [],

    evidenceLedger: [],
    artifacts: [],

    commits: [initialCommit],
    headCommitId: initialCommit.id,

    researchQuestion: input.researchQuestion,
    theme: input.theme,
    domain: input.domain,
    createdBy: input.createdBy,
  };
}

// createHypothesisCard is exported from ./hypothesis.ts
// See bead brenner_bot-an1n.1 for the canonical implementation

/**
 * Generate a new session ID
 */
export function generateSessionId(existingIds: string[] = []): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `SESSION-${dateStr}-`;

  const sequences = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}
