/**
 * Tests for Operator Intervention Audit Trail Schema
 *
 * @see operator-intervention.ts
 * @see brenner_bot-mqg7 (bead)
 */

import { describe, expect, test } from "vitest";
import {
  aggregateInterventions,
  createEmptyInterventionSummary,
  createInterventionId,
  determineInterventionSeverity,
  type InterventionSeverity,
  InterventionSummarySchema,
  type InterventionType,
  isCleanSession,
  type OperatorIntervention,
  OperatorInterventionSchema,
  validateIntervention,
} from "./operator-intervention";

// ============================================================================
// Test Helpers
// ============================================================================

function makeValidIntervention(
  overrides: Partial<OperatorIntervention> = {},
): OperatorIntervention {
  return {
    id: "INT-RS20251230-001",
    session_id: "RS-20251230",
    timestamp: "2025-12-30T10:00:00+00:00",
    operator_id: "human",
    type: "artifact_edit",
    severity: "minor",
    target: {},
    rationale: "Fixed a typo in hypothesis H1 claim",
    reversible: true,
    tags: [],
    ...overrides,
  };
}

// ============================================================================
// Tests: ID Generation
// ============================================================================

describe("createInterventionId", () => {
  test("creates valid ID with correct format", () => {
    const id = createInterventionId("RS20251230", 1);
    expect(id).toBe("INT-RS20251230-001");
  });

  test("pads sequence number to 3 digits", () => {
    expect(createInterventionId("RS20251230", 5)).toBe("INT-RS20251230-005");
    expect(createInterventionId("RS20251230", 42)).toBe("INT-RS20251230-042");
    expect(createInterventionId("RS20251230", 123)).toBe("INT-RS20251230-123");
  });
});

// ============================================================================
// Tests: Intervention Validation
// ============================================================================

describe("OperatorInterventionSchema", () => {
  test("accepts valid intervention", () => {
    const intervention = makeValidIntervention();
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(true);
  });

  test("requires rationale with minimum length", () => {
    const intervention = makeValidIntervention({ rationale: "short" });
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("at least 10 characters");
    }
  });

  test("validates intervention ID format", () => {
    const intervention = makeValidIntervention({ id: "invalid-id" });
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(false);
  });

  test("validates timestamp format", () => {
    const intervention = makeValidIntervention({ timestamp: "not-a-timestamp" });
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(false);
  });

  test("accepts all intervention types", () => {
    const types: InterventionType[] = [
      "artifact_edit",
      "delta_exclusion",
      "delta_injection",
      "decision_override",
      "session_control",
      "role_reassignment",
    ];

    for (const type of types) {
      const intervention = makeValidIntervention({ type });
      const result = OperatorInterventionSchema.safeParse(intervention);
      expect(result.success).toBe(true);
    }
  });

  test("accepts all severity levels", () => {
    const severities: InterventionSeverity[] = ["minor", "moderate", "major", "critical"];

    for (const severity of severities) {
      const intervention = makeValidIntervention({ severity });
      const result = OperatorInterventionSchema.safeParse(intervention);
      expect(result.success).toBe(true);
    }
  });

  test("accepts intervention with full target", () => {
    const intervention = makeValidIntervention({
      target: {
        message_id: 123,
        artifact_version: 2,
        item_id: "H-RS20251230-001",
        item_type: "hypothesis",
      },
    });
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(true);
  });

  test("accepts intervention with state change", () => {
    const intervention = makeValidIntervention({
      state_change: {
        before: '{"claim": "Original claim"}',
        after: '{"claim": "Fixed claim"}',
        before_hash: "abc123",
        after_hash: "def456",
      },
    });
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(true);
  });

  test("accepts intervention with session control action", () => {
    const intervention = makeValidIntervention({
      type: "session_control",
      severity: "critical",
      session_control_action: "terminate_early",
    });
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(true);
  });

  test("accepts reversed intervention", () => {
    const intervention = makeValidIntervention({
      reversible: true,
      reversed_at: "2025-12-30T11:00:00+00:00",
      reversed_by: "operator2",
    });
    const result = OperatorInterventionSchema.safeParse(intervention);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Tests: Severity Determination
// ============================================================================

describe("determineInterventionSeverity", () => {
  test("session_control is always critical", () => {
    expect(determineInterventionSeverity("session_control", {})).toBe("critical");
  });

  test("role_reassignment is major", () => {
    expect(determineInterventionSeverity("role_reassignment", {})).toBe("major");
  });

  test("decision_override is major", () => {
    expect(determineInterventionSeverity("decision_override", {})).toBe("major");
  });

  test("hypothesis edit is major", () => {
    expect(determineInterventionSeverity("artifact_edit", { item_type: "hypothesis" })).toBe(
      "major",
    );
  });

  test("hypothesis injection is major", () => {
    expect(determineInterventionSeverity("delta_injection", { item_type: "hypothesis" })).toBe(
      "major",
    );
  });

  test("delta_exclusion is moderate", () => {
    expect(determineInterventionSeverity("delta_exclusion", {})).toBe("moderate");
  });

  test("artifact_edit with item_type is moderate", () => {
    expect(determineInterventionSeverity("artifact_edit", { item_type: "test" })).toBe("moderate");
  });

  test("artifact_edit without item_type is minor", () => {
    expect(determineInterventionSeverity("artifact_edit", {})).toBe("minor");
  });
});

// ============================================================================
// Tests: Intervention Summary
// ============================================================================

describe("createEmptyInterventionSummary", () => {
  test("creates summary with all zeros", () => {
    const summary = createEmptyInterventionSummary();
    expect(summary.total_count).toBe(0);
    expect(summary.by_severity.minor).toBe(0);
    expect(summary.by_severity.moderate).toBe(0);
    expect(summary.by_severity.major).toBe(0);
    expect(summary.by_severity.critical).toBe(0);
    expect(summary.has_major_interventions).toBe(false);
    expect(summary.operators).toEqual([]);
  });
});

describe("aggregateInterventions", () => {
  test("returns empty summary for empty array", () => {
    const summary = aggregateInterventions([]);
    expect(summary.total_count).toBe(0);
    expect(summary.operators).toEqual([]);
  });

  test("counts interventions correctly", () => {
    const interventions = [
      makeValidIntervention({ severity: "minor", operator_id: "op1" }),
      makeValidIntervention({
        id: "INT-RS20251230-002",
        severity: "moderate",
        operator_id: "op2",
      }),
      makeValidIntervention({
        id: "INT-RS20251230-003",
        severity: "minor",
        operator_id: "op1",
      }),
    ];

    const summary = aggregateInterventions(interventions);
    expect(summary.total_count).toBe(3);
    expect(summary.by_severity.minor).toBe(2);
    expect(summary.by_severity.moderate).toBe(1);
    expect(summary.operators).toEqual(["op1", "op2"]);
  });

  test("detects major interventions", () => {
    const interventions = [
      makeValidIntervention({ severity: "minor" }),
      makeValidIntervention({ id: "INT-RS20251230-002", severity: "major" }),
    ];

    const summary = aggregateInterventions(interventions);
    expect(summary.has_major_interventions).toBe(true);
  });

  test("detects critical interventions", () => {
    const interventions = [
      makeValidIntervention({ severity: "minor" }),
      makeValidIntervention({
        id: "INT-RS20251230-002",
        severity: "critical",
        type: "session_control",
      }),
    ];

    const summary = aggregateInterventions(interventions);
    expect(summary.has_major_interventions).toBe(true);
  });

  test("tracks timestamps", () => {
    const interventions = [
      makeValidIntervention({ timestamp: "2025-12-30T12:00:00+00:00" }),
      makeValidIntervention({
        id: "INT-RS20251230-002",
        timestamp: "2025-12-30T10:00:00+00:00",
      }),
      makeValidIntervention({
        id: "INT-RS20251230-003",
        timestamp: "2025-12-30T14:00:00+00:00",
      }),
    ];

    const summary = aggregateInterventions(interventions);
    expect(summary.first_intervention_at).toBe("2025-12-30T10:00:00+00:00");
    expect(summary.last_intervention_at).toBe("2025-12-30T14:00:00+00:00");
  });

  test("counts by type correctly", () => {
    const interventions = [
      makeValidIntervention({ type: "artifact_edit" }),
      makeValidIntervention({ id: "INT-RS20251230-002", type: "delta_exclusion" }),
      makeValidIntervention({ id: "INT-RS20251230-003", type: "artifact_edit" }),
    ];

    const summary = aggregateInterventions(interventions);
    expect(summary.by_type.artifact_edit).toBe(2);
    expect(summary.by_type.delta_exclusion).toBe(1);
  });
});

// ============================================================================
// Tests: Validation Helpers
// ============================================================================

describe("validateIntervention", () => {
  test("returns valid result for valid intervention", () => {
    const intervention = makeValidIntervention();
    const result = validateIntervention(intervention);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.id).toBe(intervention.id);
    }
  });

  test("returns errors for invalid intervention", () => {
    const result = validateIntervention({ id: "bad-id" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("isCleanSession", () => {
  test("returns true for session with no major interventions", () => {
    const summary = createEmptyInterventionSummary();
    summary.total_count = 5;
    summary.by_severity.minor = 3;
    summary.by_severity.moderate = 2;
    expect(isCleanSession(summary)).toBe(true);
  });

  test("returns false for session with major interventions", () => {
    const summary = createEmptyInterventionSummary();
    summary.has_major_interventions = true;
    expect(isCleanSession(summary)).toBe(false);
  });
});

// ============================================================================
// Tests: Intervention Summary Schema
// ============================================================================

describe("InterventionSummarySchema", () => {
  test("validates correct summary", () => {
    const summary = aggregateInterventions([
      makeValidIntervention(),
      makeValidIntervention({ id: "INT-RS20251230-002", severity: "moderate" }),
    ]);

    const result = InterventionSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  test("validates empty summary", () => {
    const summary = createEmptyInterventionSummary();
    const result = InterventionSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});
