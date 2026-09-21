/**
 * Fixture-based tests for artifact linter.
 *
 * These tests load golden artifacts from __fixtures__/linter/ and verify
 * that the linter produces the expected output. This enables regression
 * testing when linter rules change.
 *
 * Run with: bun run test apps/web/src/lib/linter-fixtures.test.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, test } from "vitest";
import { type Artifact, formatLintReportJson, lintArtifact } from "./artifact-merge";

// ============================================================================
// Fixture Loader
// ============================================================================

const FIXTURES_DIR = join(__dirname, "__fixtures__", "linter");

function loadFixture(name: string): Artifact {
  const path = join(FIXTURES_DIR, `${name}.json`);
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content) as Artifact;
}

// ============================================================================
// Tests
// ============================================================================

describe("Linter Fixtures", () => {
  describe("valid-artifact", () => {
    test("passes linting with no errors", () => {
      const artifact = loadFixture("valid-artifact");
      const report = lintArtifact(artifact);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    test("has expected structure for regression comparison", () => {
      const artifact = loadFixture("valid-artifact");
      const report = lintArtifact(artifact);

      // Should have minimal warnings/info for a complete artifact
      expect(report.summary.warnings).toBeLessThanOrEqual(2);
      expect(report.summary.info).toBeLessThanOrEqual(3);
    });

    test("validates all required sections are present", () => {
      const artifact = loadFixture("valid-artifact");
      const report = lintArtifact(artifact);

      // No structural errors
      const structuralErrors = report.violations.filter(
        (v) => v.severity === "error" && (v.id.startsWith("ER-") || v.id.startsWith("EH-")),
      );
      expect(structuralErrors).toHaveLength(0);
    });
  });

  describe("invalid-artifact", () => {
    test("fails linting with multiple errors", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
    });

    test("detects missing session_id", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "EM-002")).toBe(true);
    });

    test("detects invalid timestamps", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "EM-003")).toBe(true);
      expect(report.violations.some((v) => v.id === "EM-004")).toBe(true);
    });

    test("detects missing research thread", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "ER-001")).toBe(true);
    });

    test("detects missing third alternative", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "EH-003")).toBe(true);
    });

    test("detects insufficient hypotheses", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      // Only 1 hypothesis instead of minimum 3
      expect(report.violations.some((v) => v.id === "EH-001")).toBe(true);
    });

    test("detects missing predictions", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "EP-001")).toBe(true);
    });

    test("detects missing discriminative tests", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "ET-001")).toBe(true);
    });

    test("detects missing assumptions", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "EA-001")).toBe(true);
    });

    test("detects missing adversarial critiques", () => {
      const artifact = loadFixture("invalid-artifact");
      const report = lintArtifact(artifact);

      expect(report.violations.some((v) => v.id === "EC-001")).toBe(true);
    });
  });

  describe("warning-artifact", () => {
    test("passes linting but has warnings", () => {
      const artifact = loadFixture("warning-artifact");
      const report = lintArtifact(artifact);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    test("has expected warnings for incomplete content", () => {
      const artifact = loadFixture("warning-artifact");
      const report = lintArtifact(artifact);

      // WC-001: No real_third_alternative in adversarial critiques
      // WH-001: No hypothesis has anchors marked as [inference]
      const warnings = report.violations.filter((v) => v.severity === "warning");
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe("mixed-citations", () => {
    test("passes linting with evidence pack citations as valid grounding", () => {
      const artifact = loadFixture("mixed-citations");
      const report = lintArtifact(artifact);

      expect(report.valid).toBe(true);
      expect(report.summary.errors).toBe(0);
    });

    test("accepts EV-NNN format as valid anchor", () => {
      const artifact = loadFixture("mixed-citations");
      const report = lintArtifact(artifact);

      // H1 uses only evidence citations (EV-001, EV-001#E1), no transcript §n
      // Should NOT trigger WH-001 (missing anchors) warning
      const missingAnchorWarnings = report.violations.filter(
        (v) => v.id === "WH-001" && v.message.includes("H1"),
      );
      expect(missingAnchorWarnings).toHaveLength(0);
    });

    test("accepts EV-NNN#EN format as valid anchor", () => {
      const artifact = loadFixture("mixed-citations");
      const report = lintArtifact(artifact);

      // H2 uses mixed evidence (EV-001#E2) + transcript (§155)
      // Should NOT trigger any anchor warnings
      const h2Warnings = report.violations.filter(
        (v) => v.message.includes("H2") && v.id.includes("-P"),
      );
      expect(h2Warnings).toHaveLength(0);
    });

    test("accepts mixed transcript + evidence citations", () => {
      const artifact = loadFixture("mixed-citations");
      const report = lintArtifact(artifact);

      // Research thread uses both §58 and EV-001#E1
      // Should NOT trigger WR-001 (missing anchors)
      const rtWarnings = report.violations.filter((v) => v.id === "WR-001");
      expect(rtWarnings).toHaveLength(0);
    });

    test("evidence citation with inference does not trigger WP-P02", () => {
      const artifact = loadFixture("mixed-citations");
      const report = lintArtifact(artifact);

      // H3 uses EV-003#E1 + [inference]
      // The evidence citation provides context, so WP-P02 should not fire
      const pureInferenceWarnings = report.violations.filter(
        (v) => v.id === "WP-P02" && v.message.includes("H3"),
      );
      expect(pureInferenceWarnings).toHaveLength(0);
    });
  });
});

describe("Linter Output Format", () => {
  test("JSON output is deterministic", () => {
    const artifact = loadFixture("valid-artifact");
    const report = lintArtifact(artifact);

    const json1 = formatLintReportJson(report, "GOLDEN-VALID-001");
    const json2 = formatLintReportJson(report, "GOLDEN-VALID-001");

    expect(json1).toBe(json2);
  });

  test("JSON output includes all required fields", () => {
    const artifact = loadFixture("invalid-artifact");
    const report = lintArtifact(artifact);

    const json = formatLintReportJson(report, "GOLDEN-INVALID");
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty("artifact");
    expect(parsed).toHaveProperty("valid");
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("violations");
    expect(parsed.summary).toHaveProperty("errors");
    expect(parsed.summary).toHaveProperty("warnings");
    expect(parsed.summary).toHaveProperty("info");
  });
});

// ============================================================================
// Snapshot Tests (for regression detection)
// ============================================================================

describe("Linter Output Snapshots", () => {
  test("valid artifact report matches snapshot", () => {
    const artifact = loadFixture("valid-artifact");
    const report = lintArtifact(artifact);

    // Create a deterministic representation for snapshot
    const snapshot = {
      valid: report.valid,
      summary: report.summary,
      violationIds: report.violations.map((v) => v.id).sort(),
    };

    expect(snapshot).toMatchSnapshot();
  });

  test("invalid artifact report matches snapshot", () => {
    const artifact = loadFixture("invalid-artifact");
    const report = lintArtifact(artifact);

    const snapshot = {
      valid: report.valid,
      summary: report.summary,
      violationIds: report.violations.map((v) => v.id).sort(),
    };

    expect(snapshot).toMatchSnapshot();
  });

  test("warning artifact report matches snapshot", () => {
    const artifact = loadFixture("warning-artifact");
    const report = lintArtifact(artifact);

    const snapshot = {
      valid: report.valid,
      summary: report.summary,
      violationIds: report.violations.map((v) => v.id).sort(),
    };

    expect(snapshot).toMatchSnapshot();
  });
});
