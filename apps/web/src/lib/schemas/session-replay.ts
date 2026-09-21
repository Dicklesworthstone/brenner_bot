import { z } from "zod";
import { InterventionSummarySchema, OperatorInterventionSchema } from "./operator-intervention";

/**
 * Session Replay Schema
 *
 * Defines the infrastructure for recording and replaying Brenner Loop sessions
 * to enable deterministic reproducibility, debugging, and training.
 *
 * From the Brenner method:
 * - Scientific reproducibility (can someone else replicate this?)
 * - Transparency (what inputs produced what outputs?)
 * - Learning (how do different agents handle the same problem?)
 *
 * @see brenner_bot-4u0u (bead)
 * @see specs/session_replay_spec_v0.1.md
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Session Record ID format: REC-{session_id}-{timestamp}
 * @example "REC-RS20260101-1704067200"
 */
const recordIdPattern = /^REC-[A-Za-z0-9][\w-]*-\d+$/;

// ============================================================================
// Enums
// ============================================================================

/**
 * Agent roles in a Brenner Loop session.
 */
export const AgentRoleSchema = z.enum([
  "hypothesis_generator",
  "test_designer",
  "adversarial_critic",
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

/**
 * Message types in session trace.
 */
export const MessageTypeSchema = z.enum([
  "KICKOFF",
  "DELTA",
  "CRITIQUE",
  "ACK",
  "EVIDENCE",
  "RESULT",
  "ADMIN",
  "COMPILE",
  "PUBLISH",
]);

export type MessageType = z.infer<typeof MessageTypeSchema>;

/**
 * Replay mode types.
 */
export const ReplayModeSchema = z.enum([
  "verification", // Re-run with same agents to verify outputs match
  "comparison", // Re-run with different agents to compare
  "trace", // Step through recorded messages without re-running
]);

export type ReplayMode = z.infer<typeof ReplayModeSchema>;

/**
 * Divergence severity in replay comparison.
 */
export const DivergenceSeveritySchema = z.enum([
  "none", // Identical or semantically equivalent
  "minor", // Slight wording differences, same meaning
  "moderate", // Different approach, similar conclusions
  "major", // Fundamentally different conclusions
]);

export type DivergenceSeverity = z.infer<typeof DivergenceSeveritySchema>;

// ============================================================================
// Kickoff Input Schema
// ============================================================================

/**
 * Operator selection of Brenner operators for the session.
 */
export const OperatorSelectionSchema = z.object({
  /** Primary operators to apply */
  primary: z.array(z.string()),
  /** Secondary operators (optional) */
  secondary: z.array(z.string()).optional(),
  /** Forbidden operators (to avoid) */
  forbidden: z.array(z.string()).optional(),
});

export type OperatorSelection = z.infer<typeof OperatorSelectionSchema>;

/**
 * Session kickoff input data.
 */
export const KickoffInputSchema = z.object({
  /** Thread ID (global join key) */
  thread_id: z.string().min(1),

  /** Research question or problem statement */
  question: z.string().optional(),

  /** Corpus excerpt (anchored §n citations) */
  excerpt: z.string().optional(),

  /** Research theme (e.g., "cell-fate", "concurrency") */
  theme: z.string().optional(),

  /** Research domain (e.g., "biology", "software") */
  domain: z.string().optional(),

  /** Selected Brenner operators */
  operator_selection: OperatorSelectionSchema.optional(),

  /** Raw kickoff message body */
  kickoff_body_md: z.string().optional(),
});

export type KickoffInput = z.infer<typeof KickoffInputSchema>;

// ============================================================================
// External Evidence Schema (for replay)
// ============================================================================

/**
 * Evidence record summary for session replay.
 * Links to full evidence pack without embedding content.
 */
export const EvidenceRecordSummarySchema = z.object({
  /** Evidence ID (e.g., "EV-001") */
  id: z.string(),

  /** Type of evidence */
  type: z.enum([
    "paper",
    "preprint",
    "dataset",
    "experiment",
    "observation",
    "prior_session",
    "expert_opinion",
    "code_artifact",
  ]),

  /** Source reference (DOI, URL, session ID) */
  source: z.string(),

  /** Number of excerpts in this record */
  excerpt_count: z.number().int().nonnegative(),

  /** SHA256 hash of evidence content for verification */
  content_hash: z.string().optional(),
});

export type EvidenceRecordSummary = z.infer<typeof EvidenceRecordSummarySchema>;

// ============================================================================
// Agent Roster Schema
// ============================================================================

/**
 * Agent roster entry for session replay.
 */
export const AgentRosterEntrySchema = z.object({
  /** Agent name (adjective+noun, e.g., "BlueLake") */
  agent_name: z.string().min(1),

  /** Assigned role */
  role: AgentRoleSchema,

  /** Agent program (e.g., "claude-code", "codex-cli") */
  program: z.string().min(1),

  /** Model name (e.g., "opus-4.5", "gpt-5.2") */
  model: z.string().min(1),

  /** Model version or git hash */
  model_version: z.string().optional(),

  /** Temperature setting (if known) */
  temperature: z.number().min(0).max(2).optional(),
});

export type AgentRosterEntry = z.infer<typeof AgentRosterEntrySchema>;

// ============================================================================
// Protocol Versions Schema
// ============================================================================

/**
 * Protocol version information for reproducibility.
 */
export const ProtocolVersionsSchema = z.object({
  /** Role prompts version or git hash */
  role_prompts: z.string().optional(),

  /** Delta format version */
  delta_format: z.string().default("v0.1"),

  /** Artifact schema version */
  artifact_schema: z.string().default("v0.1"),

  /** Evaluation rubric version */
  evaluation_rubric: z.string().optional(),

  /** Evidence pack version */
  evidence_pack: z.string().optional(),
});

export type ProtocolVersions = z.infer<typeof ProtocolVersionsSchema>;

// ============================================================================
// Session Inputs Schema
// ============================================================================

/**
 * Complete session inputs (deterministic).
 */
export const SessionInputsSchema = z.object({
  /** Kickoff configuration */
  kickoff: KickoffInputSchema,

  /** External evidence summaries */
  external_evidence: z.array(EvidenceRecordSummarySchema).default([]),

  /** Agent roster with role assignments */
  agent_roster: z.array(AgentRosterEntrySchema),

  /** Protocol versions for reproducibility */
  protocol_versions: ProtocolVersionsSchema,
});

export type SessionInputs = z.infer<typeof SessionInputsSchema>;

// ============================================================================
// Trace Message Schema
// ============================================================================

/**
 * Message record in session trace.
 */
export const TraceMessageSchema = z.object({
  /** Message ID from Agent Mail */
  message_id: z.number().int().positive().optional(),

  /** ISO 8601 timestamp */
  timestamp: z.string().datetime({ offset: true }),

  /** Sender agent name */
  from: z.string().min(1),

  /** Message type */
  type: MessageTypeSchema,

  /** SHA256 hash of message body for verification */
  content_hash: z.string(),

  /** Message body length in bytes */
  content_length: z.number().int().nonnegative(),

  /** Subject line (for context) */
  subject: z.string().optional(),

  /** Whether message was acknowledged */
  acknowledged: z.boolean().default(false),
});

export type TraceMessage = z.infer<typeof TraceMessageSchema>;

// ============================================================================
// Trace Round Schema
// ============================================================================

/**
 * A round in the session execution trace.
 */
export const TraceRoundSchema = z.object({
  /** Round number (0-indexed) */
  round_number: z.number().int().nonnegative(),

  /** Round start timestamp */
  started_at: z.string().datetime({ offset: true }),

  /** Round end timestamp */
  ended_at: z.string().datetime({ offset: true }).optional(),

  /** Messages in this round */
  messages: z.array(TraceMessageSchema),

  /** Compiled artifact hash after this round (if compiled) */
  compiled_artifact_hash: z.string().optional(),

  /** Round duration in milliseconds */
  duration_ms: z.number().int().nonnegative().optional(),
});

export type TraceRound = z.infer<typeof TraceRoundSchema>;

// ============================================================================
// Session Trace Schema
// ============================================================================

/**
 * Complete session execution trace.
 */
export const SessionTraceSchema = z.object({
  /** Execution rounds */
  rounds: z.array(TraceRoundSchema),

  /** Operator interventions during session */
  interventions: z.array(OperatorInterventionSchema).default([]),

  /** Intervention summary */
  intervention_summary: InterventionSummarySchema.optional(),

  /** Total session duration in milliseconds */
  total_duration_ms: z.number().int().nonnegative(),

  /** Session start timestamp */
  started_at: z.string().datetime({ offset: true }),

  /** Session end timestamp */
  ended_at: z.string().datetime({ offset: true }).optional(),
});

export type SessionTrace = z.infer<typeof SessionTraceSchema>;

// ============================================================================
// Lint Result Schema
// ============================================================================

/**
 * Artifact lint results.
 */
export const LintResultSchema = z.object({
  /** Number of lint errors */
  errors: z.number().int().nonnegative(),

  /** Number of lint warnings */
  warnings: z.number().int().nonnegative(),

  /** Whether artifact is valid */
  valid: z.boolean(),

  /** Error messages (if any) */
  error_messages: z.array(z.string()).default([]),

  /** Warning messages (if any) */
  warning_messages: z.array(z.string()).default([]),
});

export type LintResult = z.infer<typeof LintResultSchema>;

// ============================================================================
// Session Outputs Schema
// ============================================================================

/**
 * Session output summary.
 */
export const SessionOutputsSchema = z.object({
  /** SHA256 hash of final artifact */
  final_artifact_hash: z.string(),

  /** Lint result for final artifact */
  lint_result: LintResultSchema,

  /** Number of hypotheses in final artifact */
  hypothesis_count: z.number().int().nonnegative(),

  /** Number of tests in final artifact */
  test_count: z.number().int().nonnegative(),

  /** Number of assumptions in final artifact */
  assumption_count: z.number().int().nonnegative().optional(),

  /** Number of anomalies in final artifact */
  anomaly_count: z.number().int().nonnegative().optional(),

  /** Number of critiques in final artifact */
  critique_count: z.number().int().nonnegative().optional(),

  /** Scorecard result (if evaluated) */
  scorecard_grade: z.string().optional(),

  /** Scorecard total points (if evaluated) */
  scorecard_points: z.number().optional(),
});

export type SessionOutputs = z.infer<typeof SessionOutputsSchema>;

// ============================================================================
// Main Session Record Schema
// ============================================================================

/**
 * Complete Session Record for replay.
 *
 * Captures everything needed to reproduce or analyze a session:
 * - Deterministic inputs
 * - Execution trace with message hashes
 * - Operator interventions
 * - Output summary with verification hashes
 */
export const SessionRecordSchema = z.object({
  /** Unique record ID (format: REC-{session}-{timestamp}) */
  id: z.string().regex(recordIdPattern, {
    message: "Record ID must match format: REC-{session}-{timestamp}",
  }),

  /** Session ID (thread_id) */
  session_id: z.string().min(1),

  /** Record creation timestamp */
  created_at: z.string().datetime({ offset: true }),

  /** Session inputs (deterministic) */
  inputs: SessionInputsSchema,

  /** Execution trace */
  trace: SessionTraceSchema,

  /** Session outputs */
  outputs: SessionOutputsSchema,

  /** Schema version */
  schema_version: z.string().default("0.1"),

  /** Optional notes */
  notes: z.string().optional(),
});

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// ============================================================================
// Divergence Schema (for replay comparison)
// ============================================================================

/**
 * A divergence between original and replayed session.
 */
export const DivergenceSchema = z.object({
  /** Round where divergence occurred */
  round_number: z.number().int().nonnegative(),

  /** Message index within round */
  message_index: z.number().int().nonnegative(),

  /** Agent that produced the divergent output */
  agent: z.string(),

  /** Divergence severity */
  severity: DivergenceSeveritySchema,

  /** Original content summary */
  original_summary: z.string(),

  /** Replayed content summary */
  replayed_summary: z.string(),

  /** Whether semantically equivalent */
  semantic_match: z.boolean(),

  /** Explanation of divergence */
  explanation: z.string().optional(),
});

export type Divergence = z.infer<typeof DivergenceSchema>;

// ============================================================================
// Replay Report Schema
// ============================================================================

/**
 * Report from session replay.
 */
export const ReplayReportSchema = z.object({
  /** Original session ID */
  original_session_id: z.string(),

  /** Replay mode used */
  mode: ReplayModeSchema,

  /** Replay timestamp */
  replayed_at: z.string().datetime({ offset: true }),

  /** Agent roster used (same or different) */
  roster: z.array(AgentRosterEntrySchema),

  /** Whether replay matches original */
  matches: z.boolean(),

  /** Overall similarity percentage (0-100) */
  similarity_percentage: z.number().min(0).max(100),

  /** Rounds completed */
  rounds_completed: z.number().int().nonnegative(),

  /** Total rounds expected */
  rounds_expected: z.number().int().nonnegative(),

  /** Messages matched */
  messages_matched: z.number().int().nonnegative(),

  /** Total messages expected */
  messages_expected: z.number().int().nonnegative(),

  /** Final artifact similarity */
  artifact_similarity: z.number().min(0).max(100),

  /** Divergences found */
  divergences: z.array(DivergenceSchema).default([]),

  /** Conclusion summary */
  conclusion: z.string(),
});

export type ReplayReport = z.infer<typeof ReplayReportSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new session record ID.
 */
export function createRecordId(sessionId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `REC-${sessionId}-${timestamp}`;
}

/**
 * Creates an empty session record with required fields.
 */
export function createEmptySessionRecord(sessionId: string): SessionRecord {
  const now = new Date().toISOString();
  return {
    id: createRecordId(sessionId),
    session_id: sessionId,
    created_at: now,
    inputs: {
      kickoff: { thread_id: sessionId },
      external_evidence: [],
      agent_roster: [],
      protocol_versions: {
        delta_format: "v0.1",
        artifact_schema: "v0.1",
      },
    },
    trace: {
      rounds: [],
      interventions: [],
      total_duration_ms: 0,
      started_at: now,
    },
    outputs: {
      final_artifact_hash: "",
      lint_result: {
        errors: 0,
        warnings: 0,
        valid: true,
        error_messages: [],
        warning_messages: [],
      },
      hypothesis_count: 0,
      test_count: 0,
    },
    schema_version: "0.1",
  };
}

/**
 * Computes SHA256 hash of content for verification.
 */
export async function computeContentHash(content: string): Promise<string> {
  const crypto = globalThis.crypto;
  if (!crypto || !crypto.subtle) {
    throw new Error(
      "Secure hashing unavailable: crypto.subtle is required for session replay verification. Ensure you are running in a secure context (HTTPS/localhost) or Node/Bun environment.",
    );
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates a trace message record.
 */
export async function createTraceMessage(
  from: string,
  type: MessageType,
  body: string,
  options?: {
    message_id?: number;
    subject?: string;
    acknowledged?: boolean;
  },
): Promise<TraceMessage> {
  return {
    message_id: options?.message_id,
    timestamp: new Date().toISOString(),
    from,
    type,
    content_hash: await computeContentHash(body),
    content_length: new TextEncoder().encode(body).length,
    subject: options?.subject,
    acknowledged: options?.acknowledged ?? false,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates a session record.
 */
export function validateSessionRecord(
  record: unknown,
): { valid: true; data: SessionRecord } | { valid: false; errors: string[] } {
  const result = SessionRecordSchema.safeParse(record);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

/**
 * Checks if a session record can be replayed.
 */
export function isReplayable(record: SessionRecord): boolean {
  // Must have at least one round
  if (record.trace.rounds.length === 0) return false;

  // Must have agent roster
  if (record.inputs.agent_roster.length === 0) return false;

  // Must have valid outputs
  if (!record.outputs.final_artifact_hash) return false;

  return true;
}

/**
 * Checks if replay matches original within threshold.
 */
export function isReplayMatch(
  report: ReplayReport,
  thresholds?: {
    similarity?: number;
    max_major_divergences?: number;
  },
): boolean {
  const similarityThreshold = thresholds?.similarity ?? 80;
  const maxMajorDivergences = thresholds?.max_major_divergences ?? 0;

  // Check similarity percentage
  if (report.similarity_percentage < similarityThreshold) {
    return false;
  }

  // Check major divergences
  const majorDivergences = report.divergences.filter((d) => d.severity === "major").length;
  if (majorDivergences > maxMajorDivergences) {
    return false;
  }

  return true;
}
