/**
 * Brenner Protocol Artifact Merge Algorithm
 *
 * Implements deterministic merge of agent deltas into research artifacts.
 * Follows the rules from artifact_delta_spec_v0.1.md
 *
 * Usage:
 * ```typescript
 * import { mergeArtifact, createEmptyArtifact, type Artifact } from "./artifact-merge";
 * import { extractValidDeltas } from "./delta-parser";
 *
 * const deltas = extractValidDeltas(messageBody);
 * const result = mergeArtifact(baseArtifact, deltas, agentName, timestamp);
 * if (result.ok) {
 *   // result.artifact contains the merged artifact
 * } else {
 *   // result.errors contains validation errors
 * }
 * ```
 */

import { type DeltaSection, generateNextId, type ValidDelta } from "./delta-parser";
import type { InterventionSummary } from "./schemas/operator-intervention";

// ============================================================================
// Types
// ============================================================================

/** Contributor record in artifact metadata */
export interface Contributor {
  agent: string;
  program?: string;
  model?: string;
  contributed_at?: string;
}

/** Research program status */
export type ResearchProgramStatus = "active" | "completed" | "paused";

/** Research program metadata for multi-session research efforts */
export interface ResearchProgram {
  program_id: string;
  program_name: string;
  prior_sessions?: string[];
  program_status?: ResearchProgramStatus;
}

/** Intervention summary for compiled artifacts */
export interface InterventionMetadata {
  /** Total number of operator interventions */
  count: number;
  /** Whether any major/critical interventions occurred */
  has_major: boolean;
  /** Count by severity level */
  by_severity?: {
    minor: number;
    moderate: number;
    major: number;
    critical: number;
  };
  /** List of operators who intervened */
  operators?: string[];
}

/** Artifact metadata header */
export interface ArtifactMetadata {
  session_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  contributors: Contributor[];
  status: "draft" | "active" | "closed";
  research_program?: ResearchProgram;
  /** Operator intervention summary (populated during compile) */
  interventions?: InterventionMetadata;
}

/** Base interface for all artifact items */
interface BaseItem {
  id: string;
  killed?: boolean;
  killed_by?: string;
  killed_at?: string;
  kill_reason?: string;
}

/** Cross-session reference relation types */
export type ReferenceRelation =
  | "extends"
  | "refines"
  | "refutes"
  | "informed_by"
  | "supersedes"
  | "replicates";

/** Cross-session reference to items in other sessions */
export interface Reference {
  session: string;
  item: string;
  relation: ReferenceRelation;
}

/** Research thread (singleton) */
export interface ResearchThreadItem extends BaseItem {
  statement: string;
  context: string;
  why_it_matters: string;
  anchors?: string[];
}

/** Hypothesis item */
export interface HypothesisItem extends BaseItem {
  name: string;
  claim: string;
  mechanism: string;
  anchors?: string[];
  third_alternative?: boolean;
  references?: Reference[];
}

/** Prediction item */
export interface PredictionItem extends BaseItem {
  condition: string;
  predictions: Record<string, string>;
  references?: Reference[];
}

/** Test score breakdown */
export interface TestScore {
  likelihood_ratio?: number;
  cost?: number;
  speed?: number;
  ambiguity?: number;
}

/** Experiment result attached to a test */
export interface TestLastRun {
  result_id: string;
  result_path: string;
  run_at: string;
  exit_code: number;
  timed_out: boolean;
  duration_ms?: number;
  summary?: string;
}

/** Test execution status */
export type TestStatus = "untested" | "passed" | "failed" | "blocked" | "error";

/** Discriminative test item */
export interface TestItem extends BaseItem {
  name: string;
  procedure: string;
  discriminates: string;
  expected_outcomes: Record<string, string>;
  potency_check: string;
  feasibility?: string;
  score?: TestScore;
  // Experiment result fields (optional)
  test_id?: string;
  last_run?: TestLastRun;
  status?: TestStatus;
  actual_outcomes?: Record<string, string>;
  references?: Reference[];
}

/** Assumption item */
export interface AssumptionItem extends BaseItem {
  name: string;
  statement: string;
  load: string;
  test: string;
  status?: "unchecked" | "verified" | "falsified";
  scale_check?: boolean;
  calculation?: string;
  implication?: string;
  references?: Reference[];
}

/** Anomaly item */
export interface AnomalyItem extends BaseItem {
  name: string;
  observation: string;
  conflicts_with: string[];
  status?: "active" | "resolved" | "deferred";
  resolution_plan?: string;
  references?: Reference[];
}

/** Critique item */
export interface CritiqueItem extends BaseItem {
  name: string;
  attack: string;
  evidence: string;
  current_status: string;
  real_third_alternative?: boolean;
  proposed_alternative?: string;
  references?: Reference[];
}

/** Union of all item types */
export type ArtifactItem =
  | ResearchThreadItem
  | HypothesisItem
  | PredictionItem
  | TestItem
  | AssumptionItem
  | AnomalyItem
  | CritiqueItem;

/** Artifact sections */
export interface ArtifactSections {
  research_thread: ResearchThreadItem | null;
  hypothesis_slate: HypothesisItem[];
  predictions_table: PredictionItem[];
  discriminative_tests: TestItem[];
  assumption_ledger: AssumptionItem[];
  anomaly_register: AnomalyItem[];
  adversarial_critique: CritiqueItem[];
}

/** Complete artifact structure */
export interface Artifact {
  metadata: ArtifactMetadata;
  sections: ArtifactSections;
}

/** Merge error types */
export type MergeErrorCode =
  | "INVALID_TARGET"
  | "TARGET_KILLED"
  | "SECTION_LIMIT_EXCEEDED"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_SECTION"
  | "RT_ADD_NOT_ALLOWED"
  | "NO_THIRD_ALTERNATIVE"
  | "BELOW_MINIMUM"
  | "DELTA_RUNTIME_ERROR";

/** Merge error */
export interface MergeError {
  code: MergeErrorCode;
  message: string;
  delta_raw?: string;
}

/** Merge warning */
export interface MergeWarning {
  code: string;
  message: string;
  delta_raw?: string;
}

/** Successful merge result */
export interface MergeSuccess {
  ok: true;
  artifact: Artifact;
  warnings: MergeWarning[];
  applied_count: number;
  skipped_count: number;
}

/** Failed merge result */
export interface MergeFailure {
  ok: false;
  artifact: Artifact;
  errors: MergeError[];
  warnings: MergeWarning[];
  applied_count: number;
  skipped_count: number;
}

/** Merge result */
export type MergeResult = MergeSuccess | MergeFailure;

/** Internal delta with timestamp for sorting */
interface TimestampedDelta extends ValidDelta {
  timestamp: string;
  agent: string;
}

// ============================================================================
// Section Limits
// ============================================================================

const SECTION_LIMITS: Partial<Record<DeltaSection, number>> = {
  hypothesis_slate: 6,
};

// ============================================================================
// Helpers
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const SYSTEM_ITEM_FIELDS = new Set([
  "id",
  "killed",
  "killed_by",
  "killed_at",
  "kill_reason",
  "reason",
]);
const FORBIDDEN_PAYLOAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Field alias map: agents sometimes use alternative field names.
 * Map each alias to the canonical field name the merge algorithm expects.
 */
const FIELD_ALIASES: Record<string, string> = {
  title: "name",
  protocol: "procedure",
  methodology: "procedure",
  rationale: "reason",
};

/**
 * Normalize payload fields by replacing known aliases with their canonical names.
 * Only applies when the canonical field is not already present (avoids clobbering).
 * Returns [normalizedPayload, corrections] where corrections lists what was renamed.
 */
function normalizePayloadFields(
  payload: Record<string, unknown>,
): [Record<string, unknown>, string[]] {
  const out = { ...payload };
  const corrections: string[] = [];
  for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
    if (alias in out && !(canonical in out)) {
      out[canonical] = out[alias];
      delete out[alias];
      corrections.push(`field "${alias}" renamed to "${canonical}"`);
    }
  }
  return [out, corrections];
}

function isForbiddenPayloadKey(key: string): boolean {
  return FORBIDDEN_PAYLOAD_KEYS.has(key);
}

/**
 * Domain fields that MUST be strings. When an LLM emits an object or array
 * for one of these, we JSON-stringify it so downstream code (e.g. `.trim()`)
 * never crashes on a non-string value.
 */
const DOMAIN_STRING_FIELDS = new Set([
  "calculation",
  "statement",
  "claim",
  "mechanism",
  "procedure",
  "discriminates",
  "potency_check",
  "feasibility",
  "observation",
  "attack",
  "evidence",
  "current_status",
  "implication",
  "resolution_plan",
  "proposed_alternative",
  "context",
  "why_it_matters",
  "condition",
  "load",
  "test",
  "name",
]);

/** Coerce known domain fields to strings in-place. Returns list of corrections applied. */
function coerceDomainStrings(payload: Record<string, unknown>): string[] {
  const corrections: string[] = [];
  for (const field of DOMAIN_STRING_FIELDS) {
    if (field in payload && typeof payload[field] !== "string") {
      const originalType = Array.isArray(payload[field]) ? "array" : typeof payload[field];
      payload[field] = JSON.stringify(payload[field]);
      corrections.push(`field "${field}" coerced from ${originalType} to string`);
    }
  }
  return corrections;
}

function getItemsForSection(artifact: Artifact, section: DeltaSection): BaseItem[] {
  if (section === "research_thread") {
    return artifact.sections.research_thread ? [artifact.sections.research_thread] : [];
  }
  return artifact.sections[section] as BaseItem[];
}

function getItemById(artifact: Artifact, section: DeltaSection, id: string): BaseItem | undefined {
  const items = getItemsForSection(artifact, section);
  return items.find((item) => item.id === id);
}

function getExistingIds(artifact: Artifact, section: DeltaSection): string[] {
  return getItemsForSection(artifact, section).map((item) => item.id);
}

function isKilled(item: BaseItem): boolean {
  return item.killed === true;
}

/** Merge array fields by union (for anchors, conflicts_with, etc.) */
function mergeArrayField(existing: unknown, incoming: unknown): string[] {
  const existingArr = Array.isArray(existing) ? existing : [];
  const incomingArr = Array.isArray(incoming) ? incoming : [];
  const combined = new Set([...existingArr, ...incomingArr]);
  return Array.from(combined).filter((v): v is string => typeof v === "string");
}

/** Merge reference arrays by deduping on value equality */
function mergeReferenceArray(existing: unknown, incoming: unknown): Reference[] {
  const existingArr = (Array.isArray(existing) ? existing : []) as Reference[];
  const incomingArr = (Array.isArray(incoming) ? incoming : []) as Reference[];

  const merged = [...existingArr];

  for (const inc of incomingArr) {
    // Check if reference already exists
    const exists = merged.some(
      (ex) => ex.session === inc.session && ex.item === inc.item && ex.relation === inc.relation,
    );

    if (!exists) {
      merged.push(inc);
    }
  }

  return merged;
}

/** Calculate total score for a test */
function calculateTotalScore(score?: TestScore): number {
  if (!score) return 0;
  return (
    (score.likelihood_ratio ?? 0) + (score.cost ?? 0) + (score.speed ?? 0) + (score.ambiguity ?? 0)
  );
}

/** Sort tests by score (highest first) */
function sortTestsByScore(tests: TestItem[]): void {
  tests.sort((a, b) => calculateTotalScore(b.score) - calculateTotalScore(a.score));
}

// ============================================================================
// Create Empty Artifact
// ============================================================================

/**
 * Create a new empty artifact with the given session ID.
 */
export function createEmptyArtifact(sessionId: string): Artifact {
  const now = new Date().toISOString();
  return {
    metadata: {
      session_id: sessionId,
      created_at: now,
      updated_at: now,
      version: 0,
      contributors: [],
      status: "draft",
    },
    sections: {
      research_thread: null,
      hypothesis_slate: [],
      predictions_table: [],
      discriminative_tests: [],
      assumption_ledger: [],
      anomaly_register: [],
      adversarial_critique: [],
    },
  };
}

// ============================================================================
// Apply Operations
// ============================================================================

function applyAdd(
  artifact: Artifact,
  delta: TimestampedDelta,
  errors: MergeError[],
  warnings: MergeWarning[],
): boolean {
  const { section, payload, raw } = delta;

  // Research thread cannot use ADD
  if (section === "research_thread") {
    errors.push({
      code: "RT_ADD_NOT_ALLOWED",
      message: "Research thread only supports EDIT operation, not ADD",
      delta_raw: raw,
    });
    return false;
  }

  // Check section limits
  const limit = SECTION_LIMITS[section];
  const currentItems = artifact.sections[section] as BaseItem[];
  const activeItems = currentItems.filter((item) => !isKilled(item));

  if (limit !== undefined && activeItems.length >= limit) {
    errors.push({
      code: "SECTION_LIMIT_EXCEEDED",
      message: `Section ${section} is at its limit of ${limit} active items`,
      delta_raw: raw,
    });
    return false;
  }

  // Generate next ID
  const existingIds = getExistingIds(artifact, section);
  const newId = generateNextId(section, existingIds);

  // Create new item from payload
  if (!isRecord(payload)) {
    errors.push({
      code: "MISSING_REQUIRED_FIELD",
      message: "ADD operation requires a payload object",
      delta_raw: raw,
    });
    return false;
  }

  const [normalizedPayload, aliasCorrections] = normalizePayloadFields(
    payload as Record<string, unknown>,
  );
  const sanitizedPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(normalizedPayload)) {
    if (SYSTEM_ITEM_FIELDS.has(key)) continue;
    if (isForbiddenPayloadKey(key)) {
      warnings.push({
        code: "FORBIDDEN_PAYLOAD_KEY",
        message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
        delta_raw: raw,
      });
      continue;
    }
    sanitizedPayload[key] = value;
  }

  // Type-coerce known domain fields that must be strings.
  // LLMs occasionally emit object-valued payloads for these fields (e.g., { calculation: { ... } }).
  const coerceCorrections = coerceDomainStrings(sanitizedPayload);

  // Emit warnings for any auto-corrections applied
  for (const c of [...aliasCorrections, ...coerceCorrections]) {
    warnings.push({ code: "AUTO_CORRECTED", message: `ADD on ${section}: ${c}`, delta_raw: raw });
  }

  const newItem: BaseItem = {
    ...sanitizedPayload,
    id: newId,
  };

  // Add to section
  (artifact.sections[section] as BaseItem[]).push(newItem);

  // Re-sort tests by score if applicable
  if (section === "discriminative_tests") {
    sortTestsByScore(artifact.sections.discriminative_tests);
  }

  return true;
}

function applyEdit(
  artifact: Artifact,
  delta: TimestampedDelta,
  errors: MergeError[],
  warnings: MergeWarning[],
): boolean {
  const { section, target_id, payload, raw } = delta;

  // Research thread: special handling
  if (section === "research_thread") {
    if (!artifact.sections.research_thread) {
      // Create the research thread if it doesn't exist
      if (!isRecord(payload)) {
        errors.push({
          code: "MISSING_REQUIRED_FIELD",
          message: "Research thread EDIT requires a payload object",
          delta_raw: raw,
        });
        return false;
      }

      const [normalizedPayload, aliasCorrections1] = normalizePayloadFields(
        payload as Record<string, unknown>,
      );
      const sanitizedPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(normalizedPayload)) {
        if (SYSTEM_ITEM_FIELDS.has(key)) continue;
        if (isForbiddenPayloadKey(key)) {
          warnings.push({
            code: "FORBIDDEN_PAYLOAD_KEY",
            message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
            delta_raw: raw,
          });
          continue;
        }
        sanitizedPayload[key] = value;
      }

      const coerceCorrections1 = coerceDomainStrings(sanitizedPayload);
      for (const c of [...aliasCorrections1, ...coerceCorrections1]) {
        warnings.push({
          code: "AUTO_CORRECTED",
          message: `EDIT on research_thread (create): ${c}`,
          delta_raw: raw,
        });
      }
      artifact.sections.research_thread = {
        statement: "",
        context: "",
        why_it_matters: "",
        ...sanitizedPayload,
        id: "RT",
      } as ResearchThreadItem;
      return true;
    }

    // Merge fields into existing research thread
    if (isRecord(payload)) {
      const [normalizedPayload, aliasCorrections2] = normalizePayloadFields(
        payload as Record<string, unknown>,
      );
      const coerceCorrections2 = coerceDomainStrings(normalizedPayload);
      for (const c of [...aliasCorrections2, ...coerceCorrections2]) {
        warnings.push({
          code: "AUTO_CORRECTED",
          message: `EDIT on research_thread: ${c}`,
          delta_raw: raw,
        });
      }
      const rt = artifact.sections.research_thread;
      const rtRecord = rt as unknown as Record<string, unknown>;
      const shouldReplace = normalizedPayload.replace === true;

      for (const [key, value] of Object.entries(normalizedPayload)) {
        if (SYSTEM_ITEM_FIELDS.has(key)) continue;
        if (isForbiddenPayloadKey(key)) {
          warnings.push({
            code: "FORBIDDEN_PAYLOAD_KEY",
            message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
            delta_raw: raw,
          });
          continue;
        }
        if (key === "anchors" && !shouldReplace) {
          rtRecord[key] = mergeArrayField(rtRecord[key], value);
        } else if (key !== "replace") {
          rtRecord[key] = value;
        }
      }
    }
    return true;
  }

  // Regular sections: find target item
  if (!target_id) {
    errors.push({
      code: "INVALID_TARGET",
      message: "EDIT operation requires target_id",
      delta_raw: raw,
    });
    return false;
  }

  const item = getItemById(artifact, section, target_id);
  if (!item) {
    errors.push({
      code: "INVALID_TARGET",
      message: `Target ${target_id} not found in ${section}`,
      delta_raw: raw,
    });
    return false;
  }

  if (isKilled(item)) {
    warnings.push({
      code: "TARGET_KILLED",
      message: `Skipping EDIT of killed item ${target_id}`,
      delta_raw: raw,
    });
    return false;
  }

  // Merge payload fields
  if (isRecord(payload)) {
    const [normalizedPayload, aliasCorrections3] = normalizePayloadFields(
      payload as Record<string, unknown>,
    );
    const coerceCorrections3 = coerceDomainStrings(normalizedPayload);
    for (const c of [...aliasCorrections3, ...coerceCorrections3]) {
      warnings.push({
        code: "AUTO_CORRECTED",
        message: `EDIT on ${section} (${target_id}): ${c}`,
        delta_raw: raw,
      });
    }
    const shouldReplace = normalizedPayload.replace === true;
    const itemRecord = item as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(normalizedPayload)) {
      if (key === "replace") continue;
      if (SYSTEM_ITEM_FIELDS.has(key)) continue;
      if (isForbiddenPayloadKey(key)) {
        warnings.push({
          code: "FORBIDDEN_PAYLOAD_KEY",
          message: `Ignoring forbidden payload key "${key}" (prototype pollution risk)`,
          delta_raw: raw,
        });
        continue;
      }

      // Array fields: merge by default, replace if explicitly requested
      if (
        Array.isArray(value) &&
        (key === "anchors" || key === "conflicts_with") &&
        !shouldReplace
      ) {
        itemRecord[key] = mergeArrayField(itemRecord[key], value);
      } else if (Array.isArray(value) && key === "references" && !shouldReplace) {
        itemRecord[key] = mergeReferenceArray(itemRecord[key], value);
      } else {
        itemRecord[key] = value;
      }
    }
  }

  // Re-sort tests if score was edited
  if (section === "discriminative_tests") {
    sortTestsByScore(artifact.sections.discriminative_tests);
  }

  return true;
}

function applyKill(
  artifact: Artifact,
  delta: TimestampedDelta,
  errors: MergeError[],
  warnings: MergeWarning[],
): boolean {
  const { section, target_id, payload, agent, timestamp, raw } = delta;

  // Research thread cannot be killed
  if (section === "research_thread") {
    errors.push({
      code: "INVALID_TARGET",
      message: "Research thread cannot be killed",
      delta_raw: raw,
    });
    return false;
  }

  if (!target_id) {
    errors.push({
      code: "INVALID_TARGET",
      message: "KILL operation requires target_id",
      delta_raw: raw,
    });
    return false;
  }

  const item = getItemById(artifact, section, target_id);
  if (!item) {
    errors.push({
      code: "INVALID_TARGET",
      message: `Target ${target_id} not found in ${section}`,
      delta_raw: raw,
    });
    return false;
  }

  // Idempotent: killing already-killed item is a no-op
  if (isKilled(item)) {
    return true;
  }

  // Extract kill reason
  const reason = isRecord(payload) && typeof payload.reason === "string" ? payload.reason : "";

  // Mark as killed
  item.killed = true;
  item.killed_by = agent;
  item.killed_at = timestamp;
  item.kill_reason = reason;

  // Check post-conditions
  if (section === "hypothesis_slate") {
    const activeHypotheses = artifact.sections.hypothesis_slate.filter((h) => !isKilled(h));
    const hasThirdAlternative = activeHypotheses.some((h) => h.third_alternative === true);
    if (!hasThirdAlternative) {
      warnings.push({
        code: "NO_THIRD_ALTERNATIVE",
        message: "No active third alternative hypothesis remains after KILL",
        delta_raw: raw,
      });
    }
  }

  if (section === "assumption_ledger") {
    const activeAssumptions = artifact.sections.assumption_ledger.filter((a) => !isKilled(a));
    const hasScaleCheck = activeAssumptions.some((a) => a.scale_check === true);
    if (!hasScaleCheck) {
      warnings.push({
        code: "NO_SCALE_CHECK",
        message: "No active scale/physics check assumption remains after KILL",
        delta_raw: raw,
      });
    }
  }

  return true;
}

// ============================================================================
// Merge Function
// ============================================================================

/**
 * Merge deltas into an artifact, producing a new artifact.
 *
 * Per the spec:
 * 1. Sort deltas by timestamp (oldest first)
 * 2. Apply each delta in order
 * 3. Collect errors and warnings
 * 4. Return merged artifact or errors
 *
 * @param base - The base artifact to merge into
 * @param deltas - Array of valid deltas to apply
 * @param agentName - Name of the agent applying the deltas
 * @param timestamp - Timestamp for the merge operation
 * @returns Merge result with artifact or errors
 */
export function mergeArtifact(
  base: Artifact,
  deltas: ValidDelta[],
  agentName: string,
  timestamp: string,
): MergeResult {
  // Deep clone to avoid mutating original
  const artifact = deepClone(base);

  // Convert to timestamped deltas (use provided timestamp for all)
  const timestampedDeltas: TimestampedDelta[] = deltas.map((d) => ({
    ...d,
    timestamp,
    agent: agentName,
  }));

  // Sort by timestamp (oldest first) - for now all have same timestamp
  // In a real scenario with multiple message sources, each delta would have its own timestamp
  timestampedDeltas.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const errors: MergeError[] = [];
  const warnings: MergeWarning[] = [];
  let appliedCount = 0;
  let skippedCount = 0;

  for (const delta of timestampedDeltas) {
    let applied = false;

    try {
      switch (delta.operation) {
        case "ADD":
          applied = applyAdd(artifact, delta, errors, warnings);
          break;
        case "EDIT":
          applied = applyEdit(artifact, delta, errors, warnings);
          break;
        case "KILL":
          applied = applyKill(artifact, delta, errors, warnings);
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        code: "DELTA_RUNTIME_ERROR",
        message: `${delta.operation} on ${delta.section}${delta.target_id ? ` (${delta.target_id})` : ""} threw: ${message}`,
        delta_raw: delta.raw,
      });
      applied = false;
    }

    if (applied) {
      appliedCount++;
    } else {
      skippedCount++;
    }
  }

  // Update metadata
  artifact.metadata.updated_at = timestamp;
  artifact.metadata.version++;

  // Add contributor if not already present
  const existingContributor = artifact.metadata.contributors.find((c) => c.agent === agentName);
  if (!existingContributor) {
    artifact.metadata.contributors.push({
      agent: agentName,
      contributed_at: timestamp,
    });
  } else {
    existingContributor.contributed_at = timestamp;
  }

  // Check post-conditions for errors
  const finalErrors: MergeError[] = [...errors];

  // If there are any errors, return failure (with partially-updated artifact)
  if (finalErrors.length > 0) {
    return {
      ok: false,
      artifact,
      errors: finalErrors,
      warnings,
      applied_count: appliedCount,
      skipped_count: skippedCount,
    };
  }

  return {
    ok: true,
    artifact,
    warnings,
    applied_count: appliedCount,
    skipped_count: skippedCount,
  };
}

/**
 * Merge deltas from multiple agents with individual timestamps.
 *
 * This version accepts deltas that already have timestamp and agent info,
 * sorting them by timestamp for deterministic ordering.
 *
 * @param base - The base artifact to merge into
 * @param deltas - Array of deltas with timestamp and agent info
 * @returns Merge result
 */
export function mergeArtifactWithTimestamps(
  base: Artifact,
  deltas: Array<ValidDelta & { timestamp: string; agent: string }>,
): MergeResult {
  // Deep clone to avoid mutating original
  const artifact = deepClone(base);

  // Sort by timestamp (oldest first)
  const sortedDeltas = [...deltas].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const errors: MergeError[] = [];
  const warnings: MergeWarning[] = [];
  let appliedCount = 0;
  let skippedCount = 0;

  let latestTimestamp = base.metadata.updated_at;

  for (const delta of sortedDeltas) {
    let applied = false;

    switch (delta.operation) {
      case "ADD":
        applied = applyAdd(artifact, delta, errors, warnings);
        break;
      case "EDIT":
        applied = applyEdit(artifact, delta, errors, warnings);
        break;
      case "KILL":
        applied = applyKill(artifact, delta, errors, warnings);
        break;
    }

    if (applied) {
      appliedCount++;
      if (delta.timestamp > latestTimestamp) {
        latestTimestamp = delta.timestamp;
      }

      // Track contributor
      const existingContributor = artifact.metadata.contributors.find(
        (c) => c.agent === delta.agent,
      );
      if (!existingContributor) {
        artifact.metadata.contributors.push({
          agent: delta.agent,
          contributed_at: delta.timestamp,
        });
      } else if (
        !existingContributor.contributed_at ||
        delta.timestamp > existingContributor.contributed_at
      ) {
        existingContributor.contributed_at = delta.timestamp;
      }
    } else {
      skippedCount++;
    }
  }

  // Update metadata
  artifact.metadata.updated_at = latestTimestamp;
  artifact.metadata.version++;

  if (errors.length > 0) {
    return {
      ok: false,
      artifact,
      errors,
      warnings,
      applied_count: appliedCount,
      skipped_count: skippedCount,
    };
  }

  return {
    ok: true,
    artifact,
    warnings,
    applied_count: appliedCount,
    skipped_count: skippedCount,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/** Valid reference relation types */
const VALID_REFERENCE_RELATIONS: ReferenceRelation[] = [
  "extends",
  "refines",
  "refutes",
  "informed_by",
  "supersedes",
  "replicates",
];

/**
 * Extract all references from an artifact for genealogy tracking.
 * Returns a map of item ID -> references for all items that have references.
 */
export function extractReferences(artifact: Artifact): Map<string, Reference[]> {
  const refMap = new Map<string, Reference[]>();

  const sections: Array<{ id: string; references?: Reference[] }[]> = [
    artifact.sections.hypothesis_slate,
    artifact.sections.predictions_table,
    artifact.sections.discriminative_tests,
    artifact.sections.assumption_ledger,
    artifact.sections.anomaly_register,
    artifact.sections.adversarial_critique,
  ];

  for (const section of sections) {
    for (const item of section) {
      if (item.references && item.references.length > 0) {
        refMap.set(item.id, item.references);
      }
    }
  }

  return refMap;
}

/**
 * Create intervention metadata for artifact from an intervention summary.
 * Used when compiling artifacts to include intervention audit trail info.
 */
export function createInterventionMetadata(summary: InterventionSummary): InterventionMetadata {
  return {
    count: summary.total_count,
    has_major: summary.has_major_interventions,
    by_severity: {
      minor: summary.by_severity.minor,
      moderate: summary.by_severity.moderate,
      major: summary.by_severity.major,
      critical: summary.by_severity.critical,
    },
    operators: summary.operators.length > 0 ? summary.operators : undefined,
  };
}

// ============================================================================
// Canonical Markdown Rendering
// ============================================================================

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function escapeInline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function escapeTableCell(value: unknown): string {
  return escapeInline(value).replaceAll("|", "\\|").replaceAll("\n", "<br/>");
}

function formatStringList(list: unknown, emptyValue = "inference"): string {
  if (!Array.isArray(list) || list.length === 0) return emptyValue;
  const strings = list.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return strings.length > 0 ? strings.join(", ") : emptyValue;
}

function idNumber(id: string): number | null {
  const match = id.match(/^[A-Z]+(\d+)$/);
  if (!match?.[1]) return null;
  return Number.parseInt(match[1], 10);
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const an = idNumber(a.id);
    const bn = idNumber(b.id);
    if (an !== null && bn !== null) return an - bn;
    if (an !== null) return -1;
    if (bn !== null) return 1;
    return a.id.localeCompare(b.id);
  });
}

function renderYamlFrontMatter(metadata: ArtifactMetadata): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`session_id: ${yamlString(metadata.session_id)}`);
  lines.push(`created_at: ${yamlString(metadata.created_at)}`);
  lines.push(`updated_at: ${yamlString(metadata.updated_at)}`);
  lines.push(`version: ${metadata.version}`);
  lines.push("contributors:");
  if (metadata.contributors.length === 0) {
    lines.push("  []");
  } else {
    for (const c of metadata.contributors) {
      lines.push(`  - agent: ${yamlString(c.agent)}`);
      if (c.program) lines.push(`    program: ${yamlString(c.program)}`);
      if (c.model) lines.push(`    model: ${yamlString(c.model)}`);
      if (c.contributed_at) lines.push(`    contributed_at: ${yamlString(c.contributed_at)}`);
    }
  }
  lines.push(`status: ${yamlString(metadata.status)}`);
  lines.push("---");
  return lines.join("\n");
}

function renderKillBlock(item: BaseItem): string[] {
  if (!isKilled(item)) return [];
  const lines: string[] = [];
  lines.push("");
  lines.push("**Killed**: true");
  if (item.killed_by) lines.push(`**Killed by**: ${item.killed_by}`);
  if (item.killed_at) lines.push(`**Killed at**: ${item.killed_at}`);
  if (item.kill_reason) lines.push(`**Kill reason**: ${item.kill_reason}`);
  return lines;
}

function renderResearchThread(rt: ResearchThreadItem | null): string[] {
  const lines: string[] = [];
  lines.push("## 1. Research Thread");
  lines.push("");
  lines.push(`**RT**: ${rt ? escapeInline(rt.statement) : ""}`);
  lines.push("");
  lines.push(`**Context**: ${rt ? escapeInline(rt.context) : ""}`);
  lines.push("");
  lines.push(`**Why it matters**: ${rt ? escapeInline(rt.why_it_matters) : ""}`);
  lines.push("");
  lines.push(`**Anchors**: ${rt ? formatStringList(rt.anchors) : "inference"}`);
  if (rt) lines.push(...renderKillBlock(rt));
  return lines;
}

function renderHypothesisSlate(items: HypothesisItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 2. Hypothesis Slate");
  lines.push("");
  for (const h of sortById(items)) {
    const thirdAlt = h.third_alternative === true;
    const name = escapeInline(h.name);
    const title =
      thirdAlt && !/third\s+alternative/i.test(name) ? `${name} (Third Alternative)` : name;
    const heading = isKilled(h) ? `### ~~${h.id}: ${title}~~` : `### ${h.id}: ${title}`;
    lines.push(heading);
    lines.push(`**Claim**: ${escapeInline(h.claim)}`);
    lines.push(`**Mechanism**: ${escapeInline(h.mechanism)}`);
    lines.push(`**Anchors**: ${formatStringList(h.anchors)}`);
    if (thirdAlt) lines.push("**Third alternative**: true");
    lines.push(...renderKillBlock(h));
    lines.push("");
  }
  return lines;
}

function renderPredictionsTable(items: PredictionItem[], hypothesisIds: string[]): string[] {
  const lines: string[] = [];
  lines.push("## 3. Predictions Table");
  lines.push("");

  const headerCells = ["ID", "Observation/Condition", ...hypothesisIds];
  lines.push(`| ${headerCells.join(" | ")} |`);
  lines.push(`| ${headerCells.map(() => "---").join(" | ")} |`);

  for (const p of sortById(items)) {
    const idCell = isKilled(p) ? `~~${p.id}~~` : p.id;
    const row: string[] = [idCell, escapeTableCell(p.condition)];
    for (const hid of hypothesisIds) {
      const value = (p.predictions ?? {})[hid] ?? (p.predictions ?? {})[hid.toLowerCase()] ?? "—";
      row.push(escapeTableCell(value));
    }
    lines.push(`| ${row.join(" | ")} |`);
  }

  return lines;
}

function renderTests(items: TestItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 4. Discriminative Tests");
  lines.push("");

  for (const t of sortById(items)) {
    const totalScore = calculateTotalScore(t.score);
    const headingBase = `${t.id}: ${escapeInline(t.name)} (Score: ${totalScore}/12)`;
    const heading = isKilled(t) ? `### ~~${headingBase}~~` : `### ${headingBase}`;

    lines.push(heading);
    if (t.test_id) lines.push(`**Test ID**: ${escapeInline(t.test_id)}`);
    lines.push(`**Procedure**: ${escapeInline(t.procedure)}`);
    lines.push(`**Discriminates**: ${escapeInline(t.discriminates)}`);
    lines.push("**Expected outcomes**:");
    for (const [key, value] of Object.entries(t.expected_outcomes ?? {})) {
      lines.push(`- ${key}: ${escapeInline(value)}`);
    }
    lines.push(`**Potency check**: ${escapeInline(t.potency_check)}`);
    if (t.feasibility) lines.push(`**Feasibility**: ${escapeInline(t.feasibility)}`);
    if (t.score) {
      const lr = t.score.likelihood_ratio ?? 0;
      const cost = t.score.cost ?? 0;
      const speed = t.score.speed ?? 0;
      const ambiguity = t.score.ambiguity ?? 0;
      lines.push(
        `**Evidence-per-week score**: LR=${lr}, Cost=${cost}, Speed=${speed}, Ambiguity=${ambiguity}`,
      );
    }
    // Experiment result fields
    if (t.status) lines.push(`**Status**: ${escapeInline(t.status)}`);
    if (t.last_run) {
      lines.push("**Last run**:");
      lines.push(`- Result ID: \`${escapeInline(t.last_run.result_id)}\``);
      lines.push(`- Run at: ${escapeInline(t.last_run.run_at)}`);
      lines.push(`- Exit code: ${t.last_run.exit_code}`);
      if (t.last_run.timed_out) lines.push(`- Timed out: yes`);
      if (typeof t.last_run.duration_ms === "number")
        lines.push(`- Duration: ${(t.last_run.duration_ms / 1000).toFixed(2)}s`);
      if (t.last_run.summary) lines.push(`- Summary: ${escapeInline(t.last_run.summary)}`);
      lines.push(`- Result file: \`${escapeInline(t.last_run.result_path)}\``);
    }
    if (t.actual_outcomes && Object.keys(t.actual_outcomes).length > 0) {
      lines.push("**Actual outcomes**:");
      for (const [key, value] of Object.entries(t.actual_outcomes)) {
        lines.push(`- ${key}: ${escapeInline(value)}`);
      }
    }
    lines.push(...renderKillBlock(t));
    lines.push("");
  }

  return lines;
}

function renderAssumptions(items: AssumptionItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 5. Assumption Ledger");
  lines.push("");

  for (const a of sortById(items)) {
    const heading = isKilled(a)
      ? `### ~~${a.id}: ${escapeInline(a.name)}~~`
      : `### ${a.id}: ${escapeInline(a.name)}`;
    lines.push(heading);
    lines.push(`**Statement**: ${escapeInline(a.statement)}`);
    lines.push(`**Load**: ${escapeInline(a.load)}`);
    lines.push(`**Test**: ${escapeInline(a.test)}`);
    if (a.status) lines.push(`**Status**: ${escapeInline(a.status)}`);
    if (a.scale_check) lines.push("**Scale check**: true");
    if (a.calculation) lines.push(`**Calculation**: ${escapeInline(a.calculation)}`);
    if (a.implication) lines.push(`**Implication**: ${escapeInline(a.implication)}`);
    lines.push(...renderKillBlock(a));
    lines.push("");
  }

  return lines;
}

function renderAnomalies(items: AnomalyItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 6. Anomaly Register");
  lines.push("");

  const active = items.filter((x) => !isKilled(x));
  if (active.length === 0) {
    lines.push("None registered.");
    lines.push("");
    return lines;
  }

  for (const x of sortById(items)) {
    const heading = isKilled(x)
      ? `### ~~${x.id}: ${escapeInline(x.name)}~~`
      : `### ${x.id}: ${escapeInline(x.name)}`;
    lines.push(heading);
    lines.push(`**Observation**: ${escapeInline(x.observation)}`);
    lines.push(`**Conflicts with**: ${formatStringList(x.conflicts_with, "—")}`);
    if (x.status) lines.push(`**Quarantine status**: ${escapeInline(x.status)}`);
    if (x.resolution_plan) lines.push(`**Resolution plan**: ${escapeInline(x.resolution_plan)}`);
    lines.push(...renderKillBlock(x));
    lines.push("");
  }

  return lines;
}

function renderCritiques(items: CritiqueItem[]): string[] {
  const lines: string[] = [];
  lines.push("## 7. Adversarial Critique");
  lines.push("");

  for (const c of sortById(items)) {
    const heading = isKilled(c)
      ? `### ~~${c.id}: ${escapeInline(c.name)}~~`
      : `### ${c.id}: ${escapeInline(c.name)}`;
    lines.push(heading);
    lines.push(`**Attack**: ${escapeInline(c.attack)}`);
    lines.push(`**Evidence**: ${escapeInline(c.evidence)}`);
    lines.push(`**Current status**: ${escapeInline(c.current_status)}`);
    if (c.real_third_alternative) lines.push("**Real third alternative**: true");
    lines.push(...renderKillBlock(c));
    lines.push("");
  }

  return lines;
}

/**
 * Render a merged artifact into canonical markdown per artifact_schema_v0.1.md.
 */
export function renderArtifactMarkdown(artifact: Artifact): string {
  const lines: string[] = [];

  lines.push(renderYamlFrontMatter(artifact.metadata));
  lines.push("");
  lines.push(`# Brenner Protocol Artifact: ${artifact.metadata.session_id}`);
  lines.push("");

  lines.push(...renderResearchThread(artifact.sections.research_thread));
  lines.push("");

  lines.push(...renderHypothesisSlate(artifact.sections.hypothesis_slate));

  const hypothesisIds = sortById(artifact.sections.hypothesis_slate).map((h) => h.id);
  lines.push(...renderPredictionsTable(artifact.sections.predictions_table, hypothesisIds));
  lines.push("");

  lines.push(...renderTests(artifact.sections.discriminative_tests));
  lines.push(...renderAssumptions(artifact.sections.assumption_ledger));
  lines.push(...renderAnomalies(artifact.sections.anomaly_register));
  lines.push(...renderCritiques(artifact.sections.adversarial_critique));

  return lines.join("\n").trimEnd() + "\n";
}

// ============================================================================
// Artifact Linter (Guardrails)
// ============================================================================

export type LintSeverity = "error" | "warning" | "info";

export interface LintViolation {
  id: string;
  severity: LintSeverity;
  message: string;
  fix?: string;
}

export interface LintReport {
  valid: boolean;
  summary: { errors: number; warnings: number; info: number };
  violations: LintViolation[];
}

function severityRank(severity: LintSeverity): number {
  switch (severity) {
    case "error":
      return 0;
    case "warning":
      return 1;
    case "info":
      return 2;
  }
}

function isIsoTimestamp(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isAllowedStatus(status: string): boolean {
  return status === "draft" || status === "active" || status === "closed";
}

function hasThirdAlternative(hypotheses: HypothesisItem[]): boolean {
  return hypotheses.some((h) => {
    if (isKilled(h)) return false;
    if (h.third_alternative === true) return true;
    return typeof h.name === "string" && /third\s+alternative/i.test(h.name);
  });
}

function hasScaleCheck(assumptions: AssumptionItem[]): boolean {
  return assumptions.some((a) => !isKilled(a) && a.scale_check === true);
}

function pushViolation(violations: LintViolation[], violation: LintViolation): void {
  violations.push(violation);
}

/**
 * Lint an artifact object against machine-checkable guardrails.
 *
 * This lints the structured artifact (not raw markdown), so line numbers are not provided.
 */
export function lintArtifact(artifact: Artifact): LintReport {
  const violations: LintViolation[] = [];

  // --------------------------------------------------------------------------
  // Metadata (M)
  // --------------------------------------------------------------------------

  if (!artifact.metadata.session_id || artifact.metadata.session_id.trim().length === 0) {
    pushViolation(violations, {
      id: "EM-002",
      severity: "error",
      message: "Metadata.session_id is required",
      fix: "Set artifact.metadata.session_id to a non-empty thread/session identifier",
    });
  }

  if (!isIsoTimestamp(artifact.metadata.created_at)) {
    pushViolation(violations, {
      id: "EM-003",
      severity: "error",
      message: "Metadata.created_at must be an ISO-8601 timestamp",
      fix: "Set artifact.metadata.created_at to new Date().toISOString()",
    });
  }

  if (!isIsoTimestamp(artifact.metadata.updated_at)) {
    pushViolation(violations, {
      id: "EM-003b",
      severity: "error",
      message: "Metadata.updated_at must be an ISO-8601 timestamp",
      fix: "Set artifact.metadata.updated_at to new Date().toISOString()",
    });
  }

  if (!isAllowedStatus(artifact.metadata.status)) {
    pushViolation(violations, {
      id: "EM-004",
      severity: "error",
      message: "Metadata.status must be one of: draft | active | closed",
      fix: "Set artifact.metadata.status to 'draft', 'active', or 'closed'",
    });
  }

  if (artifact.metadata.contributors.length === 0) {
    pushViolation(violations, {
      id: "WM-001",
      severity: "warning",
      message: "No contributors recorded",
      fix: "Ensure merge pipeline stamps artifact.metadata.contributors",
    });
  }

  if (
    isIsoTimestamp(artifact.metadata.created_at) &&
    isIsoTimestamp(artifact.metadata.updated_at) &&
    Date.parse(artifact.metadata.updated_at) < Date.parse(artifact.metadata.created_at)
  ) {
    pushViolation(violations, {
      id: "WM-002",
      severity: "warning",
      message: "updated_at is earlier than created_at",
      fix: "Ensure updated_at is >= created_at",
    });
  }

  if (!Number.isInteger(artifact.metadata.version)) {
    pushViolation(violations, {
      id: "IM-002",
      severity: "info",
      message: "Metadata.version should be an integer",
      fix: "Set artifact.metadata.version to an integer",
    });
  }

  // --------------------------------------------------------------------------
  // Research Thread (R)
  // --------------------------------------------------------------------------

  const rt = artifact.sections.research_thread;
  if (!rt || rt.statement.trim().length === 0) {
    pushViolation(violations, {
      id: "ER-001",
      severity: "error",
      message: "Research thread statement is missing",
      fix: "Add an EDIT delta to section 'research_thread' with a non-empty statement",
    });
  }
  if (!rt || rt.context.trim().length === 0) {
    pushViolation(violations, {
      id: "ER-002",
      severity: "error",
      message: "Research thread context is missing",
      fix: "Add an EDIT delta to section 'research_thread' with a non-empty context",
    });
  }
  if (!rt || !Array.isArray(rt.anchors) || rt.anchors.length === 0) {
    pushViolation(violations, {
      id: "WR-001",
      severity: "warning",
      message: "Research thread anchors are missing",
      fix: "Add at least one anchor: transcript (§42), evidence (EV-001), or 'inference'",
    });
  }

  // --------------------------------------------------------------------------
  // Hypothesis Slate (H)
  // --------------------------------------------------------------------------

  const hypotheses = artifact.sections.hypothesis_slate.filter((h) => !isKilled(h));
  if (hypotheses.length < 3) {
    pushViolation(violations, {
      id: "EH-001",
      severity: "error",
      message: `Hypothesis slate has ${hypotheses.length} active items (minimum 3)`,
      fix: "Add hypotheses (including a third alternative) via ADD deltas",
    });
  }
  if (hypotheses.length > 6) {
    pushViolation(violations, {
      id: "EH-002",
      severity: "error",
      message: `Hypothesis slate has ${hypotheses.length} active items (maximum 6)`,
      fix: "KILL or consolidate hypotheses to <= 6 items",
    });
  }
  if (!hasThirdAlternative(artifact.sections.hypothesis_slate)) {
    pushViolation(violations, {
      id: "EH-003",
      severity: "error",
      message: "No third alternative hypothesis is present",
      fix: "Ensure at least one hypothesis is explicitly labeled as the third alternative",
    });
  }

  for (const h of hypotheses) {
    if (!h.claim || h.claim.trim().length === 0) {
      pushViolation(violations, {
        id: "EH-004",
        severity: "error",
        message: `${h.id} is missing claim`,
        fix: "Add a non-empty claim field",
      });
    }
    if (!Array.isArray(h.anchors) || h.anchors.length === 0) {
      pushViolation(violations, {
        id: "WH-001",
        severity: "warning",
        message: `${h.id} is missing anchors`,
        fix: "Add anchors: transcript (§42), evidence (EV-001), or 'inference'",
      });
    }
  }

  // --------------------------------------------------------------------------
  // Predictions Table (P)
  // --------------------------------------------------------------------------

  const predictions = artifact.sections.predictions_table.filter((p) => !isKilled(p));
  if (predictions.length < 3) {
    pushViolation(violations, {
      id: "EP-001",
      severity: "error",
      message: `Predictions table has ${predictions.length} active items (minimum 3)`,
      fix: "Add predictions via ADD deltas",
    });
  }

  // Use only active hypotheses for discrimination check (not killed ones)
  const activeHypothesisIds = sortById(hypotheses).map((h) => h.id);
  for (const p of predictions) {
    const values = activeHypothesisIds.map((hid) => (p.predictions ?? {})[hid] ?? "");
    const normalized = values.map((v) => v.trim()).filter(Boolean);
    const unique = new Set(normalized);
    if (normalized.length > 0 && unique.size <= 1 && activeHypothesisIds.length >= 2) {
      pushViolation(violations, {
        id: "WP-001",
        severity: "warning",
        message: `${p.id} does not discriminate (all hypothesis outcomes identical or missing)`,
        fix: "Adjust prediction so at least two hypotheses differ in expected outcome",
      });
    }
  }

  // --------------------------------------------------------------------------
  // Discriminative Tests (T)
  // --------------------------------------------------------------------------

  const tests = artifact.sections.discriminative_tests.filter((t) => !isKilled(t));
  if (tests.length < 2) {
    pushViolation(violations, {
      id: "ET-001",
      severity: "error",
      message: `Discriminative tests has ${tests.length} active items (minimum 2)`,
      fix: "Add discriminative tests via ADD deltas",
    });
  }
  for (const t of tests) {
    if (!t.procedure || t.procedure.trim().length === 0) {
      pushViolation(violations, {
        id: "ET-002",
        severity: "error",
        message: `${t.id} is missing procedure`,
        fix: "Add a non-empty procedure field",
      });
    }
    if (!t.expected_outcomes || Object.keys(t.expected_outcomes).length === 0) {
      pushViolation(violations, {
        id: "ET-003",
        severity: "error",
        message: `${t.id} is missing expected outcomes`,
        fix: "Add expected_outcomes mapping (e.g., {'H1': '...', 'H2': '...'})",
      });
    }
    if (!t.potency_check || t.potency_check.trim().length === 0) {
      pushViolation(violations, {
        id: "WT-001",
        severity: "warning",
        message: `${t.id} is missing potency check`,
        fix: "Add a potency_check that distinguishes chastity vs impotence",
      });
    }
    if (!t.score) {
      pushViolation(violations, {
        id: "WT-003",
        severity: "warning",
        message: `${t.id} is missing score breakdown`,
        fix: "Add score: {likelihood_ratio, cost, speed, ambiguity} with 0-3 values",
      });
    }
  }

  for (let i = 1; i < tests.length; i++) {
    const prev = calculateTotalScore(tests[i - 1]?.score);
    const cur = calculateTotalScore(tests[i]?.score);
    if (cur > prev) {
      pushViolation(violations, {
        id: "WT-002",
        severity: "warning",
        message: "Tests are not ranked by score (non-increasing order violated)",
        fix: "Sort tests by descending total score (LR+cost+speed+ambiguity)",
      });
      break;
    }
  }

  // --------------------------------------------------------------------------
  // Assumption Ledger (A)
  // --------------------------------------------------------------------------

  const assumptions = artifact.sections.assumption_ledger.filter((a) => !isKilled(a));
  if (assumptions.length < 3) {
    pushViolation(violations, {
      id: "EA-001",
      severity: "error",
      message: `Assumption ledger has ${assumptions.length} active items (minimum 3)`,
      fix: "Add assumptions via ADD deltas",
    });
  }
  if (!hasScaleCheck(artifact.sections.assumption_ledger)) {
    pushViolation(violations, {
      id: "EA-002",
      severity: "error",
      message: "No scale/physics check assumption found",
      fix: "Add an assumption with scale_check: true and a calculation",
    });
  }
  for (const a of assumptions) {
    if (!a.statement || a.statement.trim().length === 0) {
      pushViolation(violations, {
        id: "EA-003",
        severity: "error",
        message: `${a.id} is missing statement`,
        fix: "Add a non-empty statement field",
      });
    }
    if (
      a.scale_check === true &&
      (!a.calculation || (typeof a.calculation === "string" && a.calculation.trim().length === 0))
    ) {
      pushViolation(violations, {
        id: "WA-003",
        severity: "warning",
        message: `${a.id} is a scale check but missing calculation`,
        fix: "Add a calculation field with explicit numbers and units",
      });
    }
  }

  // --------------------------------------------------------------------------
  // Adversarial Critique (C)
  // --------------------------------------------------------------------------

  const critiques = artifact.sections.adversarial_critique.filter((c) => !isKilled(c));
  if (critiques.length < 2) {
    pushViolation(violations, {
      id: "EC-001",
      severity: "error",
      message: `Adversarial critique has ${critiques.length} active items (minimum 2)`,
      fix: "Add critiques via ADD deltas",
    });
  }
  for (const c of critiques) {
    if (!c.attack || c.attack.trim().length === 0) {
      pushViolation(violations, {
        id: "EC-002",
        severity: "error",
        message: `${c.id} is missing attack`,
        fix: "Add an attack field describing how the framing could be wrong",
      });
    }
    if (!c.evidence || c.evidence.trim().length === 0) {
      pushViolation(violations, {
        id: "WC-002",
        severity: "warning",
        message: `${c.id} is missing evidence`,
        fix: "Add evidence describing what would confirm the critique",
      });
    }
    if (!c.current_status || c.current_status.trim().length === 0) {
      pushViolation(violations, {
        id: "IC-001",
        severity: "info",
        message: `${c.id} is missing current status`,
        fix: "Add current_status describing how seriously to take this critique",
      });
    }
  }
  if (!critiques.some((c) => c.real_third_alternative === true)) {
    pushViolation(violations, {
      id: "WC-001",
      severity: "warning",
      message: "No critique marked as a real third alternative",
      fix: "Mark at least one critique with real_third_alternative: true",
    });
  }

  // --------------------------------------------------------------------------
  // Provenance & Citation (P) - from artifact_linter_spec_v0.1.md
  // --------------------------------------------------------------------------

  // Max section in transcript (Brenner's Web of Stories has 236 sections)
  const MAX_TRANSCRIPT_SECTION = 236;

  /**
   * Extract §n anchor references from an anchors array.
   * Returns array of section numbers referenced.
   */
  function extractAnchorRefs(anchors: string[] | undefined): number[] {
    if (!Array.isArray(anchors)) return [];
    const refs: number[] = [];
    for (const anchor of anchors) {
      // Match §42, § 42, §42-45 (range), or multiple like §42, §57
      const matches = anchor.matchAll(/§\s*(\d+)(?:-(\d+))?/g);
      for (const match of matches) {
        const start = Number.parseInt(match[1], 10);
        const end = match[2] ? Number.parseInt(match[2], 10) : start;
        for (let i = start; i <= end; i++) {
          refs.push(i);
        }
      }
    }
    return refs;
  }

  /**
   * Check if anchors contain evidence pack citations (EV-NNN or EV-NNN#EN).
   * Evidence citations are valid grounding alongside transcript anchors.
   */
  function hasEvidenceCitations(anchors: string[] | undefined): boolean {
    if (!Array.isArray(anchors)) return false;
    // Match EV-001, EV-42, EV-001#E1, EV-003#E12, etc.
    const evidencePattern = /EV-\d+(?:#E\d+)?/i;
    return anchors.some((a) => evidencePattern.test(a));
  }

  /**
   * Check if anchors contain [inference] without source context.
   * Returns false if there are transcript §n anchors or evidence EV-* citations
   * alongside the inference label (those count as source context).
   */
  function isPureInference(anchors: string[] | undefined): boolean {
    if (!Array.isArray(anchors)) return false;
    // If there are transcript anchors or evidence citations, inference has context
    const transcriptRefs = extractAnchorRefs(anchors);
    if (transcriptRefs.length > 0) return false;
    if (hasEvidenceCitations(anchors)) return false;
    // Check if any anchor is pure inference (no "from" qualifier)
    return anchors.some((a) => {
      const lower = a.toLowerCase();
      return (
        lower === "inference" ||
        lower === "[inference]" ||
        (lower.includes("[inference]") && !lower.includes("from"))
      );
    });
  }

  // Collect all anchor references across the artifact for EP-P01
  const allAnchors: Array<{ section: string; id: string; refs: number[] }> = [];

  // Research thread anchors
  if (rt) {
    allAnchors.push({ section: "research_thread", id: "RT", refs: extractAnchorRefs(rt.anchors) });
  }

  // Hypothesis anchors
  for (const h of hypotheses) {
    allAnchors.push({ section: "hypothesis_slate", id: h.id, refs: extractAnchorRefs(h.anchors) });

    // WP-P02: Pure inference without source context
    if (isPureInference(h.anchors)) {
      pushViolation(violations, {
        id: "WP-P02",
        severity: "warning",
        message: `${h.id} uses [inference] without source context`,
        fix: "Add source context: §n (transcript), EV-NNN (evidence), or use [inference] from §n",
      });
    }
  }

  // EP-P01: Validate all anchor references are in range
  for (const { id, refs } of allAnchors) {
    for (const ref of refs) {
      if (ref < 1 || ref > MAX_TRANSCRIPT_SECTION) {
        pushViolation(violations, {
          id: "EP-P01",
          severity: "error",
          message: `${id} references §${ref} which is out of range (valid: 1-${MAX_TRANSCRIPT_SECTION})`,
          fix: `Update anchor to reference a valid transcript section (1-${MAX_TRANSCRIPT_SECTION})`,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Reference Integrity (Refs)
  // --------------------------------------------------------------------------

  function checkReferences(item: { id: string; references?: unknown }): void {
    const references = item.references;
    if (references === null || references === undefined) return;

    if (!Array.isArray(references)) {
      pushViolation(violations, {
        id: "ER-REF-001",
        severity: "error",
        message: `${item.id}: references must be an array`,
        fix: "Ensure references field is an array of objects",
      });
      return;
    }

    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      if (!ref || typeof ref !== "object") {
        pushViolation(violations, {
          id: "ER-REF-002",
          severity: "error",
          message: `${item.id}: reference[${i}] must be an object`,
          fix: "Remove invalid reference",
        });
        continue;
      }

      const r = ref as Record<string, unknown>;
      if (typeof r.session !== "string" || r.session.trim() === "") {
        pushViolation(violations, {
          id: "ER-REF-003",
          severity: "error",
          message: `${item.id}: reference[${i}] missing 'session'`,
          fix: "Add session ID to reference",
        });
      }
      if (typeof r.item !== "string" || r.item.trim() === "") {
        pushViolation(violations, {
          id: "ER-REF-004",
          severity: "error",
          message: `${item.id}: reference[${i}] missing 'item'`,
          fix: "Add item ID to reference",
        });
      }
      if (
        typeof r.relation !== "string" ||
        !VALID_REFERENCE_RELATIONS.includes(r.relation as ReferenceRelation)
      ) {
        pushViolation(violations, {
          id: "ER-REF-005",
          severity: "error",
          message: `${item.id}: reference[${i}] has invalid relation '${r.relation}'`,
          fix: `Set relation to one of: ${VALID_REFERENCE_RELATIONS.join(", ")}`,
        });
      }
    }
  }

  // Check references for all items
  for (const h of hypotheses) checkReferences(h);
  for (const p of predictions) checkReferences(p);
  for (const t of tests) checkReferences(t);
  for (const a of assumptions) checkReferences(a);
  for (const c of critiques) checkReferences(c);
  for (const x of artifact.sections.anomaly_register) checkReferences(x);

  // IP-P02: Potency checks should cite §50 (Brenner's chastity principle)
  for (const t of tests) {
    if (t.potency_check && t.potency_check.trim().length > 0) {
      if (!t.potency_check.includes("§50") && !t.potency_check.includes("§ 50")) {
        pushViolation(violations, {
          id: "IP-P02",
          severity: "info",
          message: `${t.id} potency check doesn't cite §50 (Brenner's chastity principle)`,
          fix: "Consider referencing §50 for the canonical statement of the chastity principle",
        });
      }
    }
  }

  const sorted = [...violations].sort((a, b) => {
    const sr = severityRank(a.severity) - severityRank(b.severity);
    if (sr !== 0) return sr;
    return a.id.localeCompare(b.id);
  });

  const summary = {
    errors: sorted.filter((v) => v.severity === "error").length,
    warnings: sorted.filter((v) => v.severity === "warning").length,
    info: sorted.filter((v) => v.severity === "info").length,
  };

  return {
    valid: summary.errors === 0,
    summary,
    violations: sorted,
  };
}

// ============================================================================
// Lint Report Formatters
// ============================================================================

/**
 * Format a lint report as human-readable text.
 *
 * Example output:
 * ```
 * Artifact Linter Report
 * ======================
 * Artifact: RS-20251230-cell-fate
 * Status: INVALID (3 errors, 5 warnings, 2 info)
 *
 * Errors (must fix):
 *   EH-003: Third alternative not explicitly labeled
 *   ...
 * ```
 */
export function formatLintReportHuman(report: LintReport, artifactName?: string): string {
  const lines: string[] = [];
  const name = artifactName ?? "artifact";

  lines.push("Artifact Linter Report");
  lines.push("======================");
  lines.push(`Artifact: ${name}`);
  lines.push(
    `Status: ${report.valid ? "VALID" : "INVALID"} (${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info)`,
  );
  lines.push("");

  if (report.summary.errors > 0) {
    lines.push("Errors (must fix):");
    for (const v of report.violations.filter((v) => v.severity === "error")) {
      lines.push(`  ${v.id}: ${v.message}`);
      if (v.fix) lines.push(`    → ${v.fix}`);
    }
    lines.push("");
  }

  if (report.summary.warnings > 0) {
    lines.push("Warnings (should fix):");
    for (const v of report.violations.filter((v) => v.severity === "warning")) {
      lines.push(`  ${v.id}: ${v.message}`);
      if (v.fix) lines.push(`    → ${v.fix}`);
    }
    lines.push("");
  }

  if (report.summary.info > 0) {
    lines.push("Info:");
    for (const v of report.violations.filter((v) => v.severity === "info")) {
      lines.push(`  ${v.id}: ${v.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a lint report as JSON.
 *
 * Returns a deterministic, pretty-printed JSON string.
 */
export function formatLintReportJson(report: LintReport, artifactName?: string): string {
  const output = {
    artifact: artifactName ?? "artifact",
    valid: report.valid,
    summary: report.summary,
    violations: report.violations,
  };
  return JSON.stringify(output, null, 2);
}

// ============================================================================
// Artifact Semantic Diff
// ============================================================================

/** Change entry for an added item */
export interface AddedChange {
  id: string;
  name: string;
  by_agent?: string;
}

/** Change entry for a killed item */
export interface KilledChange {
  id: string;
  name: string;
  rationale: string;
  by_agent?: string;
}

/** Change entry for an edited item */
export interface EditedChange {
  id: string;
  field: string;
  old_value: string;
  new_value: string;
}

/** Changes for hypothesis slate section */
export interface HypothesisChanges {
  added: AddedChange[];
  killed: KilledChange[];
  edited: EditedChange[];
}

/** Changes for test battery section */
export interface TestChanges {
  added: Array<{ id: string; name: string; targets: string[] }>;
  killed: KilledChange[];
  edited: EditedChange[];
}

/** Changes for assumption ledger section */
export interface AssumptionChanges {
  added: Array<{ id: string; assumption: string; by_agent?: string }>;
  killed: KilledChange[];
  edited: EditedChange[];
  challenged: Array<{ id: string; challenger: string; challenge: string }>;
}

/** Changes for anomaly register section */
export interface AnomalyChanges {
  added: Array<{ id: string; description: string }>;
  killed: KilledChange[];
  promoted: Array<{ id: string; promoted_to: string }>;
  dismissed: Array<{ id: string; reason: string }>;
}

/** Changes for adversarial critique section */
export interface CritiqueChanges {
  added: Array<{ id: string; target: string; critique: string; by_agent?: string }>;
  killed: KilledChange[];
  resolved: Array<{ id: string; resolution: string }>;
}

/** Changes for predictions table section */
export interface PredictionChanges {
  added: Array<{ id: string; condition: string }>;
  killed: KilledChange[];
  edited: EditedChange[];
}

/** All changes between two artifact versions */
export interface ArtifactChanges {
  research_thread: {
    edited: EditedChange[];
  };
  hypothesis_slate: HypothesisChanges;
  predictions_table: PredictionChanges;
  discriminative_tests: TestChanges;
  assumption_ledger: AssumptionChanges;
  anomaly_register: AnomalyChanges;
  adversarial_critique: CritiqueChanges;
}

/** Summary statistics for the diff */
export interface DiffSummary {
  hypotheses_added: number;
  hypotheses_killed: number;
  hypotheses_net: number;
  tests_added: number;
  tests_killed: number;
  assumptions_added: number;
  assumptions_killed: number;
  critiques_added: number;
  critiques_resolved: number;
  anomalies_added: number;
  anomalies_resolved: number;
  total_additions: number;
  total_removals: number;
  progress_score: ProgressLevel;
}

/** Progress heuristic level */
export type ProgressLevel = "NONE" | "MINIMAL" | "MODERATE" | "GOOD" | "EXCELLENT";

/** Full artifact diff result */
export interface ArtifactDiff {
  from_version: number;
  to_version: number;
  from_session_id: string;
  to_session_id: string;
  changes: ArtifactChanges;
  summary: DiffSummary;
}

/**
 * Extract a displayable name from an item.
 */
function getItemName(item: BaseItem): string {
  if ("name" in item && typeof (item as { name?: string }).name === "string") {
    return (item as { name: string }).name;
  }
  if ("statement" in item && typeof (item as { statement?: string }).statement === "string") {
    return (item as { statement: string }).statement.substring(0, 50);
  }
  if ("condition" in item && typeof (item as { condition?: string }).condition === "string") {
    return (item as { condition: string }).condition.substring(0, 50);
  }
  if ("observation" in item && typeof (item as { observation?: string }).observation === "string") {
    return (item as { observation: string }).observation.substring(0, 50);
  }
  if ("attack" in item && typeof (item as { attack?: string }).attack === "string") {
    return (item as { attack: string }).attack.substring(0, 50);
  }
  return item.id;
}

/**
 * Index items by ID for efficient lookup.
 */
function indexById<T extends BaseItem>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

/**
 * Compare scalar fields between two items and return edits.
 */
function compareItemFields(
  id: string,
  oldItem: BaseItem,
  newItem: BaseItem,
  fieldsToCompare: string[],
): EditedChange[] {
  const edits: EditedChange[] = [];
  const oldRecord = oldItem as unknown as Record<string, unknown>;
  const newRecord = newItem as unknown as Record<string, unknown>;

  for (const field of fieldsToCompare) {
    const oldVal = oldRecord[field];
    const newVal = newRecord[field];

    // Skip undefined/null comparisons
    if (oldVal === undefined && newVal === undefined) continue;
    if (oldVal === null && newVal === null) continue;

    // Convert to strings for comparison
    const oldStr = oldVal === undefined || oldVal === null ? "" : String(oldVal);
    const newStr = newVal === undefined || newVal === null ? "" : String(newVal);

    if (oldStr !== newStr) {
      edits.push({
        id,
        field,
        old_value: oldStr.substring(0, 100),
        new_value: newStr.substring(0, 100),
      });
    }
  }

  return edits;
}

/**
 * Diff hypothesis slate between two artifacts.
 */
function diffHypotheses(v1Items: HypothesisItem[], v2Items: HypothesisItem[]): HypothesisChanges {
  const v1Index = indexById(v1Items);
  const v2Index = indexById(v2Items);

  const added: AddedChange[] = [];
  const killed: KilledChange[] = [];
  const edited: EditedChange[] = [];

  // Find added and edited items
  for (const item of v2Items) {
    const oldItem = v1Index.get(item.id);
    if (!oldItem) {
      // New item added
      added.push({
        id: item.id,
        name: item.name,
        by_agent: undefined, // Could extract from contributors if needed
      });
    } else if (!isKilled(oldItem) && isKilled(item)) {
      // Item was killed
      killed.push({
        id: item.id,
        name: item.name,
        rationale: item.kill_reason ?? "",
        by_agent: item.killed_by,
      });
    } else if (!isKilled(item)) {
      // Compare fields for edits
      const edits = compareItemFields(item.id, oldItem, item, [
        "name",
        "claim",
        "mechanism",
        "third_alternative",
      ]);
      edited.push(...edits);
    }
  }

  // Find items that existed in v1 but not in v2 (rare, but possible if structure changed)
  for (const item of v1Items) {
    if (!v2Index.has(item.id) && !isKilled(item)) {
      killed.push({
        id: item.id,
        name: item.name,
        rationale: "Removed from artifact",
        by_agent: undefined,
      });
    }
  }

  return { added, killed, edited };
}

/**
 * Diff discriminative tests between two artifacts.
 */
function diffTests(v1Items: TestItem[], v2Items: TestItem[]): TestChanges {
  const v1Index = indexById(v1Items);
  const v2Index = indexById(v2Items);

  const added: Array<{ id: string; name: string; targets: string[] }> = [];
  const killed: KilledChange[] = [];
  const edited: EditedChange[] = [];

  for (const item of v2Items) {
    const oldItem = v1Index.get(item.id);
    if (!oldItem) {
      // Parse discriminates to get targets
      const targets = item.discriminates
        ? item.discriminates
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      added.push({
        id: item.id,
        name: item.name,
        targets,
      });
    } else if (!isKilled(oldItem) && isKilled(item)) {
      killed.push({
        id: item.id,
        name: item.name,
        rationale: item.kill_reason ?? "",
        by_agent: item.killed_by,
      });
    } else if (!isKilled(item)) {
      // Compare fields for edits
      const edits = compareItemFields(item.id, oldItem, item, [
        "name",
        "procedure",
        "discriminates",
        "potency_check",
        "feasibility",
        "status",
      ]);
      edited.push(...edits);
    }
  }

  // Find items that existed in v1 but not in v2 (rare, but possible if structure changed)
  for (const item of v1Items) {
    if (!v2Index.has(item.id) && !isKilled(item)) {
      killed.push({
        id: item.id,
        name: item.name,
        rationale: "Removed from artifact",
        by_agent: undefined,
      });
    }
  }

  return { added, killed, edited };
}

/**
 * Diff assumptions between two artifacts.
 */
function diffAssumptions(v1Items: AssumptionItem[], v2Items: AssumptionItem[]): AssumptionChanges {
  const v1Index = indexById(v1Items);
  const v2Index = indexById(v2Items);

  const added: Array<{ id: string; assumption: string; by_agent?: string }> = [];
  const killed: KilledChange[] = [];
  const edited: EditedChange[] = [];
  const challenged: Array<{ id: string; challenger: string; challenge: string }> = [];

  for (const item of v2Items) {
    const oldItem = v1Index.get(item.id);
    if (!oldItem) {
      added.push({
        id: item.id,
        assumption: item.statement,
        by_agent: undefined,
      });
    } else if (!isKilled(oldItem) && isKilled(item)) {
      // Item was killed
      killed.push({
        id: item.id,
        name: item.name,
        rationale: item.kill_reason ?? "",
        by_agent: item.killed_by,
      });
    } else if (!isKilled(item)) {
      // Compare fields for edits
      const edits = compareItemFields(item.id, oldItem, item, [
        "name",
        "statement",
        "load",
        "test",
        "status",
      ]);
      edited.push(...edits);

      // Check for status changes (unchecked -> challenged, verified -> falsified)
      if (oldItem.status !== item.status) {
        if (item.status === "falsified") {
          // If it became falsified, it was likely a challenge
          challenged.push({
            id: item.id,
            challenger: "evaluation",
            challenge: `Status changed from ${oldItem.status ?? "unchecked"} to falsified`,
          });
        }
      }
    }
  }

  // Find items that existed in v1 but not in v2 (rare, but possible if structure changed)
  for (const item of v1Items) {
    if (!v2Index.has(item.id) && !isKilled(item)) {
      killed.push({
        id: item.id,
        name: item.name,
        rationale: "Removed from artifact",
        by_agent: undefined,
      });
    }
  }

  return { added, killed, edited, challenged };
}

/**
 * Diff anomalies between two artifacts.
 */
function diffAnomalies(v1Items: AnomalyItem[], v2Items: AnomalyItem[]): AnomalyChanges {
  const v1Index = indexById(v1Items);
  const v2Index = indexById(v2Items);

  const added: Array<{ id: string; description: string }> = [];
  const killed: KilledChange[] = [];
  const promoted: Array<{ id: string; promoted_to: string }> = [];
  const dismissed: Array<{ id: string; reason: string }> = [];

  for (const item of v2Items) {
    const oldItem = v1Index.get(item.id);
    if (!oldItem) {
      // New anomaly added
      added.push({
        id: item.id,
        description: item.observation,
      });
    } else if (!isKilled(oldItem) && isKilled(item)) {
      // Item was killed
      killed.push({
        id: item.id,
        name: item.name,
        rationale: item.kill_reason ?? "",
        by_agent: item.killed_by,
      });
    } else if (!isKilled(item)) {
      // Check for status changes
      if (oldItem.status !== item.status) {
        if (item.status === "resolved" && item.resolution_plan) {
          // Check if it became a hypothesis
          if (
            item.resolution_plan.toLowerCase().includes("promoted") ||
            item.resolution_plan.match(/H\d+/)
          ) {
            const match = item.resolution_plan.match(/H\d+/);
            promoted.push({
              id: item.id,
              promoted_to: match ? match[0] : "hypothesis",
            });
          } else {
            dismissed.push({
              id: item.id,
              reason: item.resolution_plan,
            });
          }
        } else if (item.status === "deferred") {
          dismissed.push({
            id: item.id,
            reason: "Deferred for later investigation",
          });
        }
      }
    }
  }

  // Find items that existed in v1 but not in v2 (rare, but possible if structure changed)
  for (const item of v1Items) {
    if (!v2Index.has(item.id) && !isKilled(item)) {
      killed.push({
        id: item.id,
        name: item.name,
        rationale: "Removed from artifact",
        by_agent: undefined,
      });
    }
  }

  return { added, killed, promoted, dismissed };
}

/**
 * Diff critiques between two artifacts.
 */
function diffCritiques(v1Items: CritiqueItem[], v2Items: CritiqueItem[]): CritiqueChanges {
  const v1Index = indexById(v1Items);
  const v2Index = indexById(v2Items);

  const added: Array<{ id: string; target: string; critique: string; by_agent?: string }> = [];
  const killed: KilledChange[] = [];
  const resolved: Array<{ id: string; resolution: string }> = [];

  for (const item of v2Items) {
    const oldItem = v1Index.get(item.id);
    if (!oldItem) {
      // New critique added
      added.push({
        id: item.id,
        target: item.name,
        critique: item.attack,
        by_agent: undefined,
      });
    } else if (!isKilled(oldItem) && isKilled(item)) {
      // Item was killed
      killed.push({
        id: item.id,
        name: item.name,
        rationale: item.kill_reason ?? "",
        by_agent: item.killed_by,
      });
    } else if (!isKilled(item)) {
      // Check for status changes
      if (oldItem.current_status !== item.current_status) {
        const newStatus = item.current_status.toLowerCase();
        if (
          newStatus.includes("resolved") ||
          newStatus.includes("addressed") ||
          newStatus.includes("fixed")
        ) {
          resolved.push({
            id: item.id,
            resolution: item.current_status,
          });
        }
      }
    }
  }

  // Find items that existed in v1 but not in v2 (rare, but possible if structure changed)
  for (const item of v1Items) {
    if (!v2Index.has(item.id) && !isKilled(item)) {
      killed.push({
        id: item.id,
        name: item.name,
        rationale: "Removed from artifact",
        by_agent: undefined,
      });
    }
  }

  return { added, killed, resolved };
}

/**
 * Diff predictions between two artifacts.
 */
function diffPredictions(v1Items: PredictionItem[], v2Items: PredictionItem[]): PredictionChanges {
  const v1Index = indexById(v1Items);
  const v2Index = indexById(v2Items);

  const added: Array<{ id: string; condition: string }> = [];
  const killed: KilledChange[] = [];
  const edited: EditedChange[] = [];

  for (const item of v2Items) {
    const oldItem = v1Index.get(item.id);
    if (!oldItem) {
      // New prediction added
      added.push({
        id: item.id,
        condition: item.condition,
      });
    } else if (!isKilled(oldItem) && isKilled(item)) {
      // Item was killed
      killed.push({
        id: item.id,
        name: getItemName(item),
        rationale: item.kill_reason ?? "",
        by_agent: item.killed_by,
      });
    } else if (!isKilled(item)) {
      // Compare fields for edits
      const edits = compareItemFields(item.id, oldItem, item, ["condition"]);
      edited.push(...edits);
    }
  }

  // Find items that existed in v1 but not in v2 (rare, but possible if structure changed)
  for (const item of v1Items) {
    if (!v2Index.has(item.id) && !isKilled(item)) {
      killed.push({
        id: item.id,
        name: getItemName(item),
        rationale: "Removed from artifact",
        by_agent: undefined,
      });
    }
  }

  return { added, killed, edited };
}

/**
 * Diff research thread between two artifacts.
 */
function diffResearchThread(
  v1: ResearchThreadItem | null,
  v2: ResearchThreadItem | null,
): { edited: EditedChange[] } {
  const edited: EditedChange[] = [];

  if (!v1 && v2) {
    edited.push({
      id: "RT",
      field: "statement",
      old_value: "",
      new_value: v2.statement.substring(0, 100),
    });
  } else if (v1 && v2) {
    const edits = compareItemFields("RT", v1, v2, ["statement", "context", "why_it_matters"]);
    edited.push(...edits);
  }

  return { edited };
}

/**
 * Calculate progress level based on diff summary.
 */
function calculateProgressLevel(summary: Omit<DiffSummary, "progress_score">): ProgressLevel {
  const testProgress = summary.tests_added;
  const critiquesResolved = summary.critiques_resolved;
  const anomaliesResolved = summary.anomalies_resolved;

  // Calculate a simple progress score
  let score = 0;

  // Hypothesis refinement (killing bad ones is good progress)
  if (summary.hypotheses_killed > 0 && summary.hypotheses_added > 0) {
    score += 2; // Active refinement
  } else if (summary.hypotheses_killed > 0) {
    score += 1; // Narrowing focus
  } else if (summary.hypotheses_added > 0) {
    score += 1; // Expansion
  }

  // Test progress
  if (testProgress >= 2) score += 2;
  else if (testProgress >= 1) score += 1;

  // Critique resolution
  if (critiquesResolved >= 2) score += 2;
  else if (critiquesResolved >= 1) score += 1;

  // Anomaly handling
  if (anomaliesResolved > 0) score += 1;

  // Total activity check
  const totalChanges = summary.total_additions + summary.total_removals;
  if (totalChanges === 0) return "NONE";

  // Map score to level
  if (score >= 6) return "EXCELLENT";
  if (score >= 4) return "GOOD";
  if (score >= 2) return "MODERATE";
  if (score >= 1) return "MINIMAL";
  return "NONE";
}

/**
 * Compute semantic diff between two artifact versions.
 *
 * Shows WHAT changed (not just whether valid):
 * - Added hypotheses, tests, assumptions, critiques, anomalies
 * - Killed items with rationales
 * - Edited items with field-level changes
 * - Summary statistics and progress heuristic
 *
 * @param v1 - The older artifact version
 * @param v2 - The newer artifact version
 * @returns Semantic diff with changes and summary
 */
export function diffArtifacts(v1: Artifact, v2: Artifact): ArtifactDiff {
  // Diff each section
  const hypothesisChanges = diffHypotheses(
    v1.sections.hypothesis_slate,
    v2.sections.hypothesis_slate,
  );

  const testChanges = diffTests(v1.sections.discriminative_tests, v2.sections.discriminative_tests);

  const assumptionChanges = diffAssumptions(
    v1.sections.assumption_ledger,
    v2.sections.assumption_ledger,
  );

  const anomalyChanges = diffAnomalies(v1.sections.anomaly_register, v2.sections.anomaly_register);

  const critiqueChanges = diffCritiques(
    v1.sections.adversarial_critique,
    v2.sections.adversarial_critique,
  );

  const predictionChanges = diffPredictions(
    v1.sections.predictions_table,
    v2.sections.predictions_table,
  );

  const researchThreadChanges = diffResearchThread(
    v1.sections.research_thread,
    v2.sections.research_thread,
  );

  // Calculate summary
  const partialSummary = {
    hypotheses_added: hypothesisChanges.added.length,
    hypotheses_killed: hypothesisChanges.killed.length,
    hypotheses_net: hypothesisChanges.added.length - hypothesisChanges.killed.length,
    tests_added: testChanges.added.length,
    tests_killed: testChanges.killed.length,
    assumptions_added: assumptionChanges.added.length,
    assumptions_killed: assumptionChanges.killed.length,
    critiques_added: critiqueChanges.added.length,
    critiques_resolved: critiqueChanges.resolved.length,
    anomalies_added: anomalyChanges.added.length,
    anomalies_resolved: anomalyChanges.promoted.length + anomalyChanges.dismissed.length,
    total_additions:
      hypothesisChanges.added.length +
      testChanges.added.length +
      assumptionChanges.added.length +
      critiqueChanges.added.length +
      anomalyChanges.added.length +
      predictionChanges.added.length,
    total_removals:
      hypothesisChanges.killed.length +
      testChanges.killed.length +
      assumptionChanges.killed.length +
      critiqueChanges.killed.length +
      anomalyChanges.killed.length +
      predictionChanges.killed.length,
  };

  const summary: DiffSummary = {
    ...partialSummary,
    progress_score: calculateProgressLevel(partialSummary),
  };

  return {
    from_version: v1.metadata.version,
    to_version: v2.metadata.version,
    from_session_id: v1.metadata.session_id,
    to_session_id: v2.metadata.session_id,
    changes: {
      research_thread: researchThreadChanges,
      hypothesis_slate: hypothesisChanges,
      predictions_table: predictionChanges,
      discriminative_tests: testChanges,
      assumption_ledger: assumptionChanges,
      anomaly_register: anomalyChanges,
      adversarial_critique: critiqueChanges,
    },
    summary,
  };
}

/**
 * Format an artifact diff as human-readable text for CLI output.
 *
 * Example output:
 * ```
 * === Artifact Diff: v1 → v2 ===
 *
 * HYPOTHESES
 *   + [H4] Epigenetic microcode (by: GreenCastle)
 *   ✗ [H2] Gradient reading - KILLED: "contradicted by T3 results" (by: RedForest)
 *   ~ [H1] Lineage counting - edited: mechanism field refined
 *
 * TESTS
 *   + [T5] Digital handle task (targets: H1, H4)
 *
 * SUMMARY: +1 hypothesis, +1 test, 1 critique resolved | Progress: MODERATE
 * ```
 */
export function formatDiffHuman(diff: ArtifactDiff): string {
  const lines: string[] = [];

  lines.push(`=== Artifact Diff: v${diff.from_version} → v${diff.to_version} ===`);
  lines.push("");

  // Research Thread
  if (diff.changes.research_thread.edited.length > 0) {
    lines.push("RESEARCH THREAD");
    for (const edit of diff.changes.research_thread.edited) {
      lines.push(`  ~ [${edit.id}] ${edit.field} changed`);
    }
    lines.push("");
  }

  // Hypotheses
  const h = diff.changes.hypothesis_slate;
  if (h.added.length > 0 || h.killed.length > 0 || h.edited.length > 0) {
    lines.push("HYPOTHESES");
    for (const item of h.added) {
      const byAgent = item.by_agent ? ` (by: ${item.by_agent})` : "";
      lines.push(`  + [${item.id}] ${item.name}${byAgent}`);
    }
    for (const item of h.killed) {
      const byAgent = item.by_agent ? ` (by: ${item.by_agent})` : "";
      const rationale = item.rationale ? `: "${item.rationale}"` : "";
      lines.push(`  ✗ [${item.id}] ${item.name} - KILLED${rationale}${byAgent}`);
    }
    for (const edit of h.edited) {
      lines.push(`  ~ [${edit.id}] edited: ${edit.field} changed`);
    }
    lines.push("");
  }

  // Tests
  const t = diff.changes.discriminative_tests;
  if (t.added.length > 0 || t.killed.length > 0 || t.edited.length > 0) {
    lines.push("TESTS");
    for (const item of t.added) {
      const targets = item.targets.length > 0 ? ` (targets: ${item.targets.join(", ")})` : "";
      lines.push(`  + [${item.id}] ${item.name}${targets}`);
    }
    for (const item of t.killed) {
      const byAgent = item.by_agent ? ` (by: ${item.by_agent})` : "";
      lines.push(`  ✗ [${item.id}] ${item.name} - KILLED${byAgent}`);
    }
    for (const edit of t.edited) {
      lines.push(`  ~ [${edit.id}] edited: ${edit.field}`);
    }
    lines.push("");
  }

  // Assumptions
  const a = diff.changes.assumption_ledger;
  if (a.added.length > 0 || a.killed.length > 0 || a.challenged.length > 0) {
    lines.push("ASSUMPTIONS");
    for (const item of a.added) {
      const byAgent = item.by_agent ? ` (by: ${item.by_agent})` : "";
      lines.push(`  + [${item.id}] ${item.assumption}${byAgent}`);
    }
    for (const item of a.killed) {
      lines.push(`  ✗ [${item.id}] ${item.name} - KILLED`);
    }
    for (const item of a.challenged) {
      lines.push(`  ⚠ [${item.id}] CHALLENGED: ${item.challenge}`);
    }
    lines.push("");
  }

  // Critiques
  const c = diff.changes.adversarial_critique;
  if (c.added.length > 0 || c.resolved.length > 0 || c.killed.length > 0) {
    lines.push("CRITIQUES");
    for (const item of c.added) {
      const byAgent = item.by_agent ? ` (by: ${item.by_agent})` : "";
      lines.push(`  + [${item.id}] ${item.target}${byAgent}`);
    }
    for (const item of c.resolved) {
      lines.push(`  ✓ [${item.id}] RESOLVED: ${item.resolution}`);
    }
    for (const item of c.killed) {
      lines.push(`  ✗ [${item.id}] ${item.name} - KILLED`);
    }
    lines.push("");
  }

  // Anomalies
  const x = diff.changes.anomaly_register;
  if (x.added.length > 0 || x.promoted.length > 0 || x.dismissed.length > 0) {
    lines.push("ANOMALIES");
    for (const item of x.added) {
      lines.push(`  + [${item.id}] ${item.description.substring(0, 60)}`);
    }
    for (const item of x.promoted) {
      lines.push(`  ↑ [${item.id}] PROMOTED TO ${item.promoted_to}`);
    }
    for (const item of x.dismissed) {
      lines.push(`  ○ [${item.id}] dismissed: ${item.reason}`);
    }
    lines.push("");
  }

  // Summary
  const s = diff.summary;
  const parts: string[] = [];
  if (s.hypotheses_net !== 0) {
    parts.push(
      `${s.hypotheses_net > 0 ? "+" : ""}${s.hypotheses_net} hypothesis${Math.abs(s.hypotheses_net) !== 1 ? "es" : ""}`,
    );
  }
  if (s.tests_added > 0) {
    parts.push(`+${s.tests_added} test${s.tests_added !== 1 ? "s" : ""}`);
  }
  if (s.critiques_resolved > 0) {
    parts.push(`${s.critiques_resolved} critique${s.critiques_resolved !== 1 ? "s" : ""} resolved`);
  }
  if (s.anomalies_resolved > 0) {
    parts.push(
      `${s.anomalies_resolved} anomal${s.anomalies_resolved !== 1 ? "ies" : "y"} resolved`,
    );
  }

  if (parts.length > 0) {
    lines.push(`SUMMARY: ${parts.join(", ")} | Progress: ${s.progress_score}`);
  } else {
    lines.push(`SUMMARY: No significant changes | Progress: ${s.progress_score}`);
  }

  return lines.join("\n");
}

/**
 * Format an artifact diff as JSON.
 */
export function formatDiffJson(diff: ArtifactDiff): string {
  return JSON.stringify(diff, null, 2);
}
