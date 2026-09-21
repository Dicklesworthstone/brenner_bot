/**
 * Brenner Protocol Delta Parser
 *
 * Parses agent delta contributions from markdown message bodies.
 * Implements the parsing rules from delta_output_format_v0.1.md
 *
 * Usage:
 * ```typescript
 * import { parseDeltaMessage, type Delta } from "./delta-parser";
 *
 * const deltas = parseDeltaMessage(messageBody);
 * for (const delta of deltas) {
 *   if (delta.valid) {
 *     // Process valid delta
 *   } else {
 *     console.warn(`Invalid delta: ${delta.error}`);
 *   }
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/** Valid operation types for deltas */
export type DeltaOperation = "ADD" | "EDIT" | "KILL";

/** Valid section identifiers */
export type DeltaSection =
  | "hypothesis_slate"
  | "predictions_table"
  | "discriminative_tests"
  | "assumption_ledger"
  | "anomaly_register"
  | "adversarial_critique"
  | "research_thread";

/** Section ID prefixes for item identification */
export const SECTION_ID_PREFIXES: Record<DeltaSection, string> = {
  hypothesis_slate: "H",
  predictions_table: "P",
  discriminative_tests: "T",
  assumption_ledger: "A",
  anomaly_register: "X",
  adversarial_critique: "C",
  research_thread: "RT",
};

/** Hypothesis payload schema */
export interface HypothesisPayload {
  name: string;
  claim: string;
  mechanism: string;
  anchors?: string[];
  third_alternative?: boolean;
}

/** Predictions table row payload */
export interface PredictionPayload {
  condition: string;
  predictions: Record<string, string>;
}

/** Discriminative test payload */
export interface TestPayload {
  name: string;
  procedure: string;
  discriminates: string;
  expected_outcomes: Record<string, string>;
  potency_check: string;
  feasibility?: string;
  score?: {
    likelihood_ratio?: number;
    cost?: number;
    speed?: number;
    ambiguity?: number;
  };
}

/** Assumption ledger payload */
export interface AssumptionPayload {
  name: string;
  statement: string;
  load: string;
  test: string;
  status?: "unchecked" | "verified" | "falsified";
  scale_check?: boolean;
}

/** Anomaly register payload */
export interface AnomalyPayload {
  name: string;
  observation: string;
  conflicts_with: string[];
  status?: "active" | "resolved" | "deferred";
  resolution_plan?: string;
}

/** Adversarial critique payload */
export interface CritiquePayload {
  name: string;
  attack: string;
  evidence: string;
  current_status: string;
  real_third_alternative?: boolean;
}

/** Kill operation payload */
export interface KillPayload {
  reason: string;
}

/** Research thread payload (EDIT only) */
export interface ResearchThreadPayload {
  context?: string;
  [key: string]: unknown;
}

/** Union of all valid payloads */
export type DeltaPayload =
  | HypothesisPayload
  | PredictionPayload
  | TestPayload
  | AssumptionPayload
  | AnomalyPayload
  | CritiquePayload
  | KillPayload
  | ResearchThreadPayload
  | Record<string, unknown>;

/** Raw delta structure as parsed from JSON */
export interface RawDelta {
  operation: string;
  section: string;
  target_id: string | null;
  payload?: DeltaPayload;
  rationale?: string;
}

/** Validated delta structure */
export interface ValidDelta {
  valid: true;
  operation: DeltaOperation;
  section: DeltaSection;
  target_id: string | null;
  payload: DeltaPayload;
  rationale: string;
  /** Raw JSON source for debugging */
  raw: string;
}

/** Invalid delta with error information */
export interface InvalidDelta {
  valid: false;
  error: string;
  /** Raw JSON source for debugging */
  raw: string;
}

/** Parse result for a single delta block */
export type ParsedDelta = ValidDelta | InvalidDelta;

/** Result from parsing a full message */
export interface ParseResult {
  /** Successfully parsed deltas */
  deltas: ParsedDelta[];
  /** Number of delta blocks found */
  totalBlocks: number;
  /** Number of valid deltas */
  validCount: number;
  /** Number of invalid deltas */
  invalidCount: number;
}

// ============================================================================
// Validation
// ============================================================================

const VALID_OPERATIONS: DeltaOperation[] = ["ADD", "EDIT", "KILL"];

const VALID_SECTIONS: DeltaSection[] = [
  "hypothesis_slate",
  "predictions_table",
  "discriminative_tests",
  "assumption_ledger",
  "anomaly_register",
  "adversarial_critique",
  "research_thread",
];

function isValidOperation(op: unknown): op is DeltaOperation {
  return typeof op === "string" && VALID_OPERATIONS.includes(op as DeltaOperation);
}

function isValidSection(section: unknown): section is DeltaSection {
  return typeof section === "string" && VALID_SECTIONS.includes(section as DeltaSection);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate a raw delta object for required fields and structure.
 */
function validateDelta(raw: unknown, rawJson: string): ParsedDelta {
  if (!isRecord(raw)) {
    return { valid: false, error: "Delta is not an object", raw: rawJson };
  }

  const { operation, section, target_id, payload, rationale } = raw;

  // Validate operation
  if (!isValidOperation(operation)) {
    return {
      valid: false,
      error: `Invalid operation: "${operation}". Must be one of: ${VALID_OPERATIONS.join(", ")}`,
      raw: rawJson,
    };
  }

  // Validate section
  if (!isValidSection(section)) {
    return {
      valid: false,
      error: `Invalid section: "${section}". Must be one of: ${VALID_SECTIONS.join(", ")}`,
      raw: rawJson,
    };
  }

  // Validate target_id based on operation
  // Note: We intentionally allow target_id in ADD (and ignore it) to be lenient with agents.

  // KILL always requires target_id
  if (operation === "KILL" && typeof target_id !== "string") {
    return {
      valid: false,
      error: "KILL operation requires target_id as a string",
      raw: rawJson,
    };
  }

  // EDIT requires target_id, except for research_thread which allows null
  // (research_thread is a singleton that can be created/updated without target_id)
  if (operation === "EDIT" && typeof target_id !== "string" && section !== "research_thread") {
    return {
      valid: false,
      error: "EDIT operation requires target_id as a string",
      raw: rawJson,
    };
  }

  // Validate payload exists for ADD/EDIT
  // Arrays are handled upstream (expandArrayPayload) — by this point payload must be a record
  if ((operation === "ADD" || operation === "EDIT") && !isRecord(payload)) {
    return {
      valid: false,
      error: `${operation} operation requires a payload object`,
      raw: rawJson,
    };
  }

  // Validate KILL has reason (accept kill_reason as alias)
  if (operation === "KILL") {
    if (isRecord(payload) && payload.kill_reason && !payload.reason) {
      payload.reason = payload.kill_reason;
      delete payload.kill_reason;
    }
    if (!isRecord(payload) || typeof payload.reason !== "string") {
      return {
        valid: false,
        error: "KILL operation requires payload with 'reason' string",
        raw: rawJson,
      };
    }
  }

  // Validate research_thread is EDIT only
  if (section === "research_thread" && operation !== "EDIT") {
    return {
      valid: false,
      error: "research_thread section only supports EDIT operation",
      raw: rawJson,
    };
  }

  // Validate research_thread target_id (optional but if present must be RT)
  if (section === "research_thread") {
    if (target_id !== null && target_id !== undefined && typeof target_id !== "string") {
      return {
        valid: false,
        error: 'research_thread target_id must be a string ("RT") or null',
        raw: rawJson,
      };
    }
    if (typeof target_id === "string" && target_id !== "RT") {
      return {
        valid: false,
        error: `research_thread target_id must be "RT" (got "${target_id}")`,
        raw: rawJson,
      };
    }
  }

  return {
    valid: true,
    operation,
    section,
    // Force null target_id for ADD (ignore agent hallucinations), otherwise preserve string or null
    target_id: operation === "ADD" ? null : typeof target_id === "string" ? target_id : null,
    payload: (payload ?? {}) as DeltaPayload,
    rationale: typeof rationale === "string" ? rationale : "",
    raw: rawJson,
  };
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Regular expression to find fenced delta blocks.
 *
 * Matches either:
 * ```delta
 * { ... }
 * ```
 *
 * or
 *
 * :::delta
 * { ... }
 * :::
 *
 * Uses backreferences (\1 and \3) to match the closing fence length to the opening fence.
 * This allows for nested code blocks (e.g. 3 backticks inside 4 backticks).
 */
const DELTA_BLOCK_REGEX =
  /(`{3,})delta(?:[ \t].*)?\r?\n([\s\S]*?)\1|(:{3,})delta(?:[ \t].*)?\r?\n([\s\S]*?)\3/g;

/**
 * Extract all delta blocks from a markdown message body.
 *
 * @param body - The markdown message body
 * @returns Array of raw JSON strings from delta blocks
 */
function extractDeltaBlocks(body: string): string[] {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  DELTA_BLOCK_REGEX.lastIndex = 0;

  while ((match = DELTA_BLOCK_REGEX.exec(body)) !== null) {
    // Group 2 is content for backticks, Group 4 is content for colons
    const content = (match[2] ?? match[4])?.trim();
    if (content) {
      blocks.push(content);
    }
  }

  return blocks;
}

/**
 * Sanitize JSON string to handle common LLM errors.
 * - Removes single-line comments (//)
 * - Removes multi-line comments (/* ... *\/)
 * - Removes trailing commas
 */
function sanitizeJson(str: string): string {
  // 1. Remove comments while preserving strings
  // Matches: "string" OR // comment OR /* comment */
  const commentRegex = /("(?:[^"\\]|\\.)*")|(\/\/.*)|(\/\*[\s\S]*?\*\/)/g;

  let cleaned = str.replace(commentRegex, (match, strGroup) => {
    if (strGroup) return match; // Preserved string
    return ""; // Removed comment
  });

  // 2. Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  return cleaned;
}

/**
 * If an ADD delta has an array payload (e.g. "payload": [{...}, {...}]),
 * expand it into individual ADD deltas — one per array element.
 * Non-ADD operations or non-array payloads are returned as-is.
 */
function expandArrayPayload(parsed: unknown, rawJson: string): ParsedDelta[] {
  if (!isRecord(parsed)) return [validateDelta(parsed, rawJson)];

  const { operation, payload } = parsed;
  if (operation !== "ADD" || !Array.isArray(payload)) {
    return [validateDelta(parsed, rawJson)];
  }

  // Expand each array element into its own ADD delta
  const results: ParsedDelta[] = [];
  for (let i = 0; i < payload.length; i++) {
    const item = payload[i];
    if (!isRecord(item)) {
      results.push({
        valid: false,
        error: `Array payload item [${i}] is not an object`,
        raw: rawJson,
      });
      continue;
    }
    const expanded = { ...parsed, payload: item };
    results.push(validateDelta(expanded, rawJson));
  }
  return results.length > 0 ? results : [validateDelta(parsed, rawJson)];
}

/**
 * Parse a single delta JSON string.
 *
 * Handles array payloads for ADD operations by expanding them into
 * individual deltas (one per array element).
 *
 * @param jsonStr - Raw JSON string from a delta block
 * @returns Parsed and validated delta(s)
 */
function parseDeltaBlock(jsonStr: string): ParsedDelta[] {
  try {
    const parsed: unknown = JSON.parse(jsonStr);
    return expandArrayPayload(parsed, jsonStr);
  } catch (e) {
    // Try sanitizing common errors (trailing commas, comments)
    try {
      const sanitized = sanitizeJson(jsonStr);
      const parsed = JSON.parse(sanitized);
      return expandArrayPayload(parsed, jsonStr); // Use original raw for debugging
    } catch {
      const error = e instanceof Error ? e.message : "Unknown JSON parse error";
      return [{ valid: false, error: `Invalid JSON: ${error}`, raw: jsonStr }];
    }
  }
}

/**
 * Parse all delta blocks from a markdown message body.
 *
 * Per the spec:
 * 1. Identifies delta blocks (fenced code with `delta` language tag)
 * 2. Parses JSON from each block
 * 3. Validates structure per operation type
 *
 * @param body - The markdown message body
 * @returns Parse result with all deltas and statistics
 */
export function parseDeltaMessage(body: string): ParseResult {
  const blocks = extractDeltaBlocks(body);
  // parseDeltaBlock returns an array (array payloads expand to multiple deltas)
  const deltas = blocks.flatMap(parseDeltaBlock);

  const validCount = deltas.filter((d) => d.valid).length;
  const invalidCount = deltas.length - validCount;

  return {
    deltas,
    totalBlocks: blocks.length,
    validCount,
    invalidCount,
  };
}

/**
 * Extract only valid deltas from a message body.
 *
 * Convenience function that filters to only successfully parsed deltas.
 *
 * @param body - The markdown message body
 * @returns Array of valid deltas
 */
export function extractValidDeltas(body: string): ValidDelta[] {
  const { deltas } = parseDeltaMessage(body);
  return deltas.filter((d): d is ValidDelta => d.valid);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get the ID prefix for a section.
 */
export function getSectionIdPrefix(section: DeltaSection): string {
  return SECTION_ID_PREFIXES[section];
}

/**
 * Validate that a target_id matches the expected prefix for its section.
 *
 * @param targetId - The target ID to validate
 * @param section - The section the ID should belong to
 * @returns True if the ID has the correct prefix
 */
export function validateTargetIdPrefix(targetId: string, section: DeltaSection): boolean {
  const prefix = SECTION_ID_PREFIXES[section];
  return targetId.startsWith(prefix);
}

/**
 * Generate the next ID for a section given existing IDs.
 *
 * @param section - The section to generate an ID for
 * @param existingIds - Array of existing IDs in the section
 * @returns The next available ID (e.g., "H4" if H1-H3 exist)
 */
export function generateNextId(section: DeltaSection, existingIds: string[]): string {
  const prefix = SECTION_ID_PREFIXES[section];
  const regex = new RegExp(`^${prefix}(\\d+)$`);

  let maxNum = 0;
  for (const id of existingIds) {
    const match = id.match(regex);
    if (match?.[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${prefix}${maxNum + 1}`;
}
