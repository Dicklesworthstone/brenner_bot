/**
 * Hypothesis Comparison Utilities
 *
 * Provides helpers to compare two hypotheses field-by-field and
 * summarize discriminating test results between them.
 *
 * @see brenner_bot-y8px (bead)
 */

import type { HypothesisCard } from "./hypothesis";
import type { ComparisonMatrix, TestResultType } from "./hypothesis-arena";

// ============================================================================
// Types
// ============================================================================

export type ComparisonField =
  | "statement"
  | "mechanism"
  | "predictionsIfTrue"
  | "predictionsIfFalse"
  | "impossibleIfTrue"
  | "assumptions"
  | "confounds"
  | "confidence";

export interface ComparisonResult {
  field: ComparisonField;
  label: string;
  valueA: string;
  valueB: string;
  similarity: number;
  isConflicting: boolean;
}

export interface PredictionConflictRow {
  testId: string;
  testName: string;
  appliedAt?: Date;
  resultA: TestResultType | "pending";
  resultB: TestResultType | "pending";
  discriminating: boolean;
}

export interface ComparisonEvidenceSummary {
  total: number;
  pending: number;
  discriminating: number;
  favorsA: number;
  favorsB: number;
  ties: number;
}

// ============================================================================
// Internal helpers
// ============================================================================

const FIELD_CONFIG: Array<{
  field: ComparisonField;
  label: string;
  accessor: (hypothesis: HypothesisCard) => string | string[] | number;
}> = [
  { field: "statement", label: "Statement", accessor: (h) => h.statement },
  { field: "mechanism", label: "Mechanism", accessor: (h) => h.mechanism },
  {
    field: "predictionsIfTrue",
    label: "Predictions if True",
    accessor: (h) => h.predictionsIfTrue,
  },
  {
    field: "predictionsIfFalse",
    label: "Predictions if False",
    accessor: (h) => h.predictionsIfFalse,
  },
  {
    field: "impossibleIfTrue",
    label: "Falsification Conditions",
    accessor: (h) => h.impossibleIfTrue,
  },
  { field: "assumptions", label: "Assumptions", accessor: (h) => h.assumptions },
  { field: "confounds", label: "Confounds", accessor: (h) => h.confounds.map((c) => c.name) },
  { field: "confidence", label: "Confidence", accessor: (h) => h.confidence },
];

const RESULT_SCORES: Record<TestResultType | "pending", number> = {
  supports: 2,
  neutral: 1,
  challenges: 0,
  eliminates: -1,
  pending: 0,
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): Set<string> {
  const normalized = normalizeText(value);
  if (!normalized) return new Set();
  return new Set(normalized.split(" "));
}

function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function stringifyValue(value: string | string[] | number): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    return value.join("\n");
  }
  if (typeof value === "number") return Number.isFinite(value) ? `${value}` : "";
  return value;
}

function computeSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  return jaccardSimilarity(a, b);
}

// ============================================================================
// Public API
// ============================================================================

export function buildComparisonResults(
  hypothesisA: HypothesisCard,
  hypothesisB: HypothesisCard,
  fields: ComparisonField[] = FIELD_CONFIG.map((entry) => entry.field),
): ComparisonResult[] {
  return fields.map((field) => {
    const config = FIELD_CONFIG.find((entry) => entry.field === field);
    if (!config) {
      return {
        field,
        label: field,
        valueA: "",
        valueB: "",
        similarity: 0,
        isConflicting: false,
      };
    }

    const valueA = stringifyValue(config.accessor(hypothesisA));
    const valueB = stringifyValue(config.accessor(hypothesisB));
    const similarity = computeSimilarity(valueA, valueB);

    return {
      field,
      label: config.label,
      valueA,
      valueB,
      similarity,
      isConflicting: similarity < 0.5 && valueA !== valueB,
    };
  });
}

export function buildPredictionConflictMatrix(
  matrix: ComparisonMatrix | null | undefined,
  hypothesisAId: string,
  hypothesisBId: string,
): PredictionConflictRow[] {
  if (!matrix) return [];

  const rowA = matrix.rows.find((row) => row.hypothesisId === hypothesisAId);
  const rowB = matrix.rows.find((row) => row.hypothesisId === hypothesisBId);

  if (!rowA || !rowB) return [];

  return matrix.tests.map((test) => {
    const resultA = rowA.testResults[test.id] ?? "pending";
    const resultB = rowB.testResults[test.id] ?? "pending";
    const discriminating = resultA !== "pending" && resultB !== "pending" && resultA !== resultB;

    return {
      testId: test.id,
      testName: test.name,
      appliedAt: test.appliedAt,
      resultA,
      resultB,
      discriminating,
    };
  });
}

export function buildEvidenceSummary(rows: PredictionConflictRow[]): ComparisonEvidenceSummary {
  let discriminating = 0;
  let favorsA = 0;
  let favorsB = 0;
  let pending = 0;
  let ties = 0;

  for (const row of rows) {
    if (row.resultA === "pending" || row.resultB === "pending") {
      pending += 1;
      continue;
    }

    const scoreA = RESULT_SCORES[row.resultA];
    const scoreB = RESULT_SCORES[row.resultB];

    if (scoreA === scoreB) {
      ties += 1;
      continue;
    }

    discriminating += 1;
    if (scoreA > scoreB) {
      favorsA += 1;
    } else {
      favorsB += 1;
    }
  }

  return {
    total: rows.length,
    pending,
    discriminating,
    favorsA,
    favorsB,
    ties,
  };
}
