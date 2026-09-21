import { describe, expect, it } from "vitest";
import validArtifact from "./__fixtures__/linter/valid-artifact.json";
import {
  type ArtifactInput,
  extractMemoryRules,
  formatForPlaybook,
  formatForReview,
} from "./artifact-to-memory";

describe("artifact-to-memory", () => {
  describe("extractMemoryRules", () => {
    it("extracts rules from golden artifact", () => {
      const result = extractMemoryRules(validArtifact as ArtifactInput);

      expect(result.sourceArtifact.sessionId).toBe("GOLDEN-VALID-001");
      expect(result.sourceArtifact.version).toBe(1);
      expect(result.rules.length).toBeGreaterThan(0);
      expect(result.stats.totalExtracted).toBe(result.rules.length);
    });

    it("extracts potency control rules from tests", () => {
      const result = extractMemoryRules(validArtifact as ArtifactInput);

      const potencyRules = result.rules.filter(
        (r) => r.category === "evidence-per-week" && r.rule.includes("potency"),
      );

      expect(potencyRules.length).toBeGreaterThan(0);
      expect(potencyRules[0].confidence).toBe("high");
      expect(potencyRules[0].sourceId).toMatch(/^T\d+$/);
    });

    it("extracts scale check rules from assumptions", () => {
      const result = extractMemoryRules(validArtifact as ArtifactInput);

      const scaleRules = result.rules.filter(
        (r) => r.rule.includes("scale") && r.sourceId.startsWith("A"),
      );

      expect(scaleRules.length).toBeGreaterThan(0);
      expect(scaleRules[0].category).toBe("evidence-per-week");
    });

    it("extracts third alternative rules from critiques", () => {
      const result = extractMemoryRules(validArtifact as ArtifactInput);

      const thirdAltRules = result.rules.filter(
        (r) => r.rule.includes("third alternative") && r.sourceId.startsWith("C"),
      );

      expect(thirdAltRules.length).toBeGreaterThan(0);
      expect(thirdAltRules[0].confidence).toBe("high");
    });

    it("extracts third alternative from hypothesis slate", () => {
      const result = extractMemoryRules(validArtifact as ArtifactInput);

      const hypothesisRules = result.rules.filter(
        (r) => r.category === "protocol-kernel" && r.sourceId.startsWith("H"),
      );

      expect(hypothesisRules.length).toBe(1);
      expect(hypothesisRules[0].rule).toContain("third alternative");
    });

    it("handles empty sections gracefully", () => {
      const emptyArtifact: ArtifactInput = {
        metadata: { session_id: "EMPTY-001", version: 1 },
        sections: {},
      };

      const result = extractMemoryRules(emptyArtifact);

      expect(result.rules).toHaveLength(0);
      expect(result.stats.totalExtracted).toBe(0);
    });

    it("handles artifact with empty anomaly register", () => {
      // The golden artifact has empty anomaly_register
      const result = extractMemoryRules(validArtifact as ArtifactInput);

      const anomalyRules = result.rules.filter((r) => r.sourceId.startsWith("AN"));
      expect(anomalyRules).toHaveLength(0);
    });

    it("computes stats correctly", () => {
      const result = extractMemoryRules(validArtifact as ArtifactInput);

      // Verify category counts sum to total
      const categorySum = Object.values(result.stats.byCategory).reduce((a, b) => a + b, 0);
      expect(categorySum).toBe(result.stats.totalExtracted);

      // Verify confidence counts sum to total
      const confidenceSum = Object.values(result.stats.byConfidence).reduce((a, b) => a + b, 0);
      expect(confidenceSum).toBe(result.stats.totalExtracted);
    });
  });

  describe("formatForPlaybook", () => {
    it("formats rules as JSON for cm playbook add --file", () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);
      const json = formatForPlaybook(exportData);
      const parsed = JSON.parse(json);

      expect(parsed.meta.sessionId).toBe("GOLDEN-VALID-001");
      expect(Array.isArray(parsed.rules)).toBe(true);
      expect(parsed.rules.length).toBeGreaterThan(0);
    });

    it("includes provenance in rule text", () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);
      const json = formatForPlaybook(exportData);
      const parsed = JSON.parse(json);

      for (const rule of parsed.rules) {
        expect(rule.rule).toContain("[Provenance:");
        expect(rule.rule).toContain("Thread: GOLDEN-VALID-001");
      }
    });

    it("filters by confidence level", () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);

      const highOnly = JSON.parse(formatForPlaybook(exportData, { minConfidence: "high" }));
      const mediumAndUp = JSON.parse(formatForPlaybook(exportData, { minConfidence: "medium" }));
      const all = JSON.parse(formatForPlaybook(exportData, { minConfidence: "low" }));

      expect(highOnly.rules.length).toBeLessThanOrEqual(mediumAndUp.rules.length);
      expect(mediumAndUp.rules.length).toBeLessThanOrEqual(all.rules.length);
    });

    it('prefixes rules with "Rule:"', () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);
      const json = formatForPlaybook(exportData);
      const parsed = JSON.parse(json);

      for (const rule of parsed.rules) {
        expect(rule.rule).toMatch(/^Rule:/);
      }
    });
  });

  describe("formatForReview", () => {
    it("generates markdown for human review", () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);
      const md = formatForReview(exportData);

      expect(md).toContain("# Memory Export Review");
      expect(md).toContain("GOLDEN-VALID-001");
      expect(md).toContain("## Statistics");
      expect(md).toContain("## Extracted Rules");
      expect(md).toContain("*Human review required");
    });

    it("groups rules by category", () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);
      const md = formatForReview(exportData);

      // Should have category headers for non-empty categories
      expect(md).toContain("### evidence-per-week");
      expect(md).toContain("### prompt-hygiene");
    });

    it("includes confidence indicators", () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);
      const md = formatForReview(exportData);

      expect(md).toMatch(/\*\*\[high\]\*\*/);
    });

    it("includes source IDs and rationale", () => {
      const exportData = extractMemoryRules(validArtifact as ArtifactInput);
      const md = formatForReview(exportData);

      expect(md).toContain("*Source*:");
      expect(md).toContain("*Rationale*:");
    });
  });

  describe("extraction heuristics", () => {
    it("assigns high confidence to potency controls", () => {
      const artifact: ArtifactInput = {
        metadata: { session_id: "TEST-001", version: 1 },
        sections: {
          discriminative_tests: [
            {
              id: "T1",
              name: "Test with controls",
              discriminates: "H1 vs H2",
              expected_outcomes: { H1: "A", H2: "B" },
              potency_check: "Verify reagent works",
            },
          ],
        },
      };

      const result = extractMemoryRules(artifact);
      const potencyRule = result.rules.find((r) => r.rule.includes("potency"));

      expect(potencyRule?.confidence).toBe("high");
    });

    it("assigns high confidence to real third alternatives", () => {
      const artifact: ArtifactInput = {
        metadata: { session_id: "TEST-002", version: 1 },
        sections: {
          adversarial_critique: [
            {
              id: "C1",
              name: "Fundamental challenge",
              attack: "The whole framing is wrong",
              real_third_alternative: true,
            },
          ],
        },
      };

      const result = extractMemoryRules(artifact);
      const thirdAltRule = result.rules.find((r) => r.sourceId === "C1");

      expect(thirdAltRule?.confidence).toBe("high");
    });

    it("assigns medium confidence to verified assumptions", () => {
      const artifact: ArtifactInput = {
        metadata: { session_id: "TEST-003", version: 1 },
        sections: {
          assumption_ledger: [
            {
              id: "A1",
              name: "Core assumption",
              statement: "X is true",
              load: "If false, everything breaks",
              status: "verified",
            },
          ],
        },
      };

      const result = extractMemoryRules(artifact);
      const assumptionRule = result.rules.find((r) => r.sourceId === "A1");

      expect(assumptionRule?.confidence).toBe("medium");
    });

    it("assigns low confidence to unchecked assumptions", () => {
      const artifact: ArtifactInput = {
        metadata: { session_id: "TEST-004", version: 1 },
        sections: {
          assumption_ledger: [
            {
              id: "A1",
              name: "Unchecked assumption",
              statement: "X might be true",
              load: "Could matter",
              test: "Test X directly",
              status: "unchecked",
            },
          ],
        },
      };

      const result = extractMemoryRules(artifact);
      const assumptionRule = result.rules.find((r) => r.sourceId === "A1");

      expect(assumptionRule?.confidence).toBe("low");
    });
  });

  describe("edge cases", () => {
    it("handles tests without scores", () => {
      const artifact: ArtifactInput = {
        metadata: { session_id: "EDGE-001", version: 1 },
        sections: {
          discriminative_tests: [
            {
              id: "T1",
              name: "Minimal test",
              discriminates: "H1 vs H2",
              expected_outcomes: { H1: "A", H2: "B" },
              // No score, no potency_check
            },
          ],
        },
      };

      const result = extractMemoryRules(artifact);
      // Should still extract documentation pattern rule
      expect(result.rules.some((r) => r.sourceId === "T1")).toBe(true);
    });

    it("handles critiques without real_third_alternative flag", () => {
      const artifact: ArtifactInput = {
        metadata: { session_id: "EDGE-002", version: 1 },
        sections: {
          adversarial_critique: [
            {
              id: "C1",
              name: "Minor critique",
              attack: "Something is off",
              evidence: "Some data suggests this",
              // No real_third_alternative
            },
          ],
        },
      };

      const result = extractMemoryRules(artifact);
      // Should extract evidence-grounded critique rule
      const evidenceRule = result.rules.find((r) => r.rule.includes("Ground critiques"));
      expect(evidenceRule).toBeDefined();
    });

    it("handles high priority status detection", () => {
      const artifact: ArtifactInput = {
        metadata: { session_id: "EDGE-003", version: 1 },
        sections: {
          adversarial_critique: [
            {
              id: "C1",
              name: "Urgent critique",
              attack: "This is critical",
              current_status: "High priority for investigation",
            },
          ],
        },
      };

      const result = extractMemoryRules(artifact);
      const priorityRule = result.rules.find((r) => r.rule.includes("high priority"));
      expect(priorityRule?.category).toBe("evidence-per-week");
    });
  });
});
