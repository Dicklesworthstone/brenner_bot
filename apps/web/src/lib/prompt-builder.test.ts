/**
 * prompt-builder.ts Unit Tests
 *
 * Tests prompt bundle generation from selected operators.
 * Philosophy: NO mocks - test real implementations with realistic fixtures.
 *
 * Run with: cd apps/web && bun run test -- src/lib/prompt-builder.test.ts
 */

import { describe, expect, it } from "vitest";
import type { BrennerOperatorPaletteEntry } from "./operators";
import { generatePromptBundle, type PromptBundle } from "./prompt-builder";

// ============================================================================
// Test Fixtures - Realistic operator entries
// ============================================================================

function createTestOperator(
  canonicalTag: string,
  title: string,
  symbol: string,
  options: Partial<BrennerOperatorPaletteEntry> = {},
): BrennerOperatorPaletteEntry {
  return {
    canonicalTag,
    title,
    symbol,
    kind: options.kind ?? "core",
    definition: options.definition ?? `Definition of ${title} operator`,
    whenToUseTriggers: options.whenToUseTriggers ?? [
      `Trigger 1 for ${title}`,
      `Trigger 2 for ${title}`,
    ],
    failureModes: options.failureModes ?? [`Failure mode for ${title}`],
    quoteBankAnchors: options.quoteBankAnchors ?? [],
    transcriptAnchors: options.transcriptAnchors ?? "§58, §103",
    promptModule: options.promptModule ?? null,
    quotes: options.quotes ?? [],
    supportingQuotes: options.supportingQuotes ?? [],
  };
}

// Operators with known role affinities
const levelSplitOperator = createTestOperator("level-split", "Level-Split", "⊘", {
  definition: "Separate different levels of explanation",
  whenToUseTriggers: [
    "When mechanisms at different scales are being confused",
    "When causal chains cross abstraction boundaries",
  ],
  failureModes: ["Conflating genetic with developmental levels"],
});

const exclusionTestOperator = createTestOperator("exclusion-test", "Exclusion-Test", "✂", {
  definition: "Design experiments that can rule out hypotheses",
  whenToUseTriggers: ["When multiple hypotheses exist", "When evidence is ambiguous"],
  failureModes: ["Designing tests that can only confirm, not exclude"],
});

const theoryKillOperator = createTestOperator("theory-kill", "Theory-Kill", "⚔", {
  definition: "Actively seek to disprove current theories",
  whenToUseTriggers: ["When a theory has become consensus", "When anomalies are being ignored"],
  failureModes: ["Confirmation bias"],
});

// Additional operators for comprehensive testing
const crossDomainOperator = createTestOperator("cross-domain", "Cross-Domain", "↔", {
  definition: "Import patterns from other fields",
  whenToUseTriggers: ["When stuck in domain-specific thinking"],
  failureModes: ["Forcing inappropriate analogies"],
});

const materializeOperator = createTestOperator("materialize", "Materialize", "⬇", {
  definition: "Convert abstract ideas to testable predictions",
  whenToUseTriggers: ["When ideas are too vague"],
  failureModes: ["Premature operationalization"],
});

const scaleCheckOperator = createTestOperator("scale-check", "Scale-Check", "📏", {
  definition: "Verify that mechanisms work at the claimed scale",
  whenToUseTriggers: ["When extrapolating across scales"],
  failureModes: ["Ignoring scale-dependent effects"],
});

// ============================================================================
// generatePromptBundle Tests
// ============================================================================

describe("generatePromptBundle", () => {
  describe("empty operators", () => {
    it("returns placeholder kickoff when no operators selected", () => {
      const bundle = generatePromptBundle([]);

      expect(bundle.kickoff).toContain("No operators selected");
    });

    it("returns empty role prompts when no operators selected", () => {
      const bundle = generatePromptBundle([]);

      expect(bundle.roles.codex).toBe("");
      expect(bundle.roles.opus).toBe("");
      expect(bundle.roles.gemini).toBe("");
    });

    it("returns empty selectedOperators array", () => {
      const bundle = generatePromptBundle([]);

      expect(bundle.selectedOperators).toEqual([]);
    });

    it("includes generatedAt timestamp", () => {
      const before = new Date().toISOString();
      const bundle = generatePromptBundle([]);
      const after = new Date().toISOString();

      expect(bundle.generatedAt).toBeTruthy();
      expect(bundle.generatedAt >= before).toBe(true);
      expect(bundle.generatedAt <= after).toBe(true);
    });
  });

  describe("kickoff prompt", () => {
    it("includes selected operators section", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("## Selected Operators");
    });

    it("includes operator title and symbol", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("⊘ Level-Split");
    });

    it("includes operator canonical tag", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("`level-split`");
    });

    it("includes operator definition", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("Separate different levels of explanation");
    });

    it("includes when to use section", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("## When to Apply These Operators");
    });

    it("includes triggers from operators", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("When mechanisms at different scales");
    });

    it("includes failure modes section", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("## Failure Modes to Avoid");
    });

    it("includes failure modes from operators", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("Conflating genetic with developmental levels");
    });

    it("includes instructions footer", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.kickoff).toContain("**Instructions**");
      expect(bundle.kickoff).toContain("cognitive guardrails");
    });

    it("includes multiple operators", () => {
      const bundle = generatePromptBundle([levelSplitOperator, exclusionTestOperator]);

      expect(bundle.kickoff).toContain("⊘ Level-Split");
      expect(bundle.kickoff).toContain("✂ Exclusion-Test");
    });
  });

  describe("role prompts", () => {
    it("generates all three role prompts", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      expect(bundle.roles.codex).toBeTruthy();
      expect(bundle.roles.opus).toBeTruthy();
      expect(bundle.roles.gemini).toBeTruthy();
    });

    describe("codex role", () => {
      it("includes Hypothesis Generator title", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        expect(bundle.roles.codex).toContain("Hypothesis Generator (Codex)");
      });

      it("includes role introduction", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        expect(bundle.roles.codex).toContain("HYPOTHESIS GENERATOR");
        expect(bundle.roles.codex).toContain("generate candidate hypotheses");
      });

      it("marks codex-affinity operators as primary", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        // level-split has codex affinity
        expect(bundle.roles.codex).toContain("Level-Split (Primary)");
      });

      it("includes hypothesis delta format", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        expect(bundle.roles.codex).toContain("hypothesis_slate");
        expect(bundle.roles.codex).toContain('"operation": "ADD"');
      });
    });

    describe("opus role", () => {
      it("includes Test Designer title", () => {
        const bundle = generatePromptBundle([exclusionTestOperator]);

        expect(bundle.roles.opus).toContain("Test Designer (Opus)");
      });

      it("includes role introduction", () => {
        const bundle = generatePromptBundle([exclusionTestOperator]);

        expect(bundle.roles.opus).toContain("TEST DESIGNER");
        expect(bundle.roles.opus).toContain("discriminative tests");
      });

      it("marks opus-affinity operators as primary", () => {
        const bundle = generatePromptBundle([exclusionTestOperator]);

        // exclusion-test has opus affinity
        expect(bundle.roles.opus).toContain("Exclusion-Test (Primary)");
      });

      it("includes test delta format", () => {
        const bundle = generatePromptBundle([exclusionTestOperator]);

        expect(bundle.roles.opus).toContain("discriminative_tests");
        expect(bundle.roles.opus).toContain("potency_check");
      });
    });

    describe("gemini role", () => {
      it("includes Adversarial Critic title", () => {
        const bundle = generatePromptBundle([theoryKillOperator]);

        expect(bundle.roles.gemini).toContain("Adversarial Critic (Gemini)");
      });

      it("includes role introduction", () => {
        const bundle = generatePromptBundle([theoryKillOperator]);

        expect(bundle.roles.gemini).toContain("ADVERSARIAL CRITIC");
        expect(bundle.roles.gemini).toContain("attack the current framing");
      });

      it("marks gemini-affinity operators as primary", () => {
        const bundle = generatePromptBundle([theoryKillOperator]);

        // theory-kill has gemini affinity
        expect(bundle.roles.gemini).toContain("Theory-Kill (Primary)");
      });

      it("includes critique delta format", () => {
        const bundle = generatePromptBundle([theoryKillOperator]);

        expect(bundle.roles.gemini).toContain("adversarial_critique");
        expect(bundle.roles.gemini).toContain("attack");
      });
    });

    describe("common elements", () => {
      it("all roles include operating constraints", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        expect(bundle.roles.codex).toContain("## Operating Constraints");
        expect(bundle.roles.opus).toContain("## Operating Constraints");
        expect(bundle.roles.gemini).toContain("## Operating Constraints");
      });

      it("all roles include citation rules", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        expect(bundle.roles.codex).toContain("## Citation Rules");
        expect(bundle.roles.opus).toContain("## Citation Rules");
        expect(bundle.roles.gemini).toContain("## Citation Rules");
      });

      it("all roles include transcript anchor requirement", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        expect(bundle.roles.codex).toContain("§n");
        expect(bundle.roles.opus).toContain("§n");
        expect(bundle.roles.gemini).toContain("§n");
      });

      it("all roles include checklist", () => {
        const bundle = generatePromptBundle([levelSplitOperator]);

        expect(bundle.roles.codex).toContain("## Checklist Before Submitting");
        expect(bundle.roles.opus).toContain("## Checklist Before Submitting");
        expect(bundle.roles.gemini).toContain("## Checklist Before Submitting");
      });
    });
  });

  describe("operator distribution", () => {
    it("distributes operators to primary and supporting roles", () => {
      const bundle = generatePromptBundle([
        levelSplitOperator, // codex primary
        exclusionTestOperator, // opus primary
        theoryKillOperator, // gemini primary
      ]);

      // Each role should have its primary operator
      expect(bundle.roles.codex).toContain("Level-Split (Primary)");
      expect(bundle.roles.opus).toContain("Exclusion-Test (Primary)");
      expect(bundle.roles.gemini).toContain("Theory-Kill (Primary)");
    });

    it("includes non-primary operators as supporting", () => {
      const bundle = generatePromptBundle([
        levelSplitOperator, // codex primary
        exclusionTestOperator, // opus primary
      ]);

      // Opus role should have exclusion-test as primary
      expect(bundle.roles.opus).toContain("Exclusion-Test (Primary)");
      // And level-split as supporting (not marked as Primary)
      expect(bundle.roles.opus).toContain("Level-Split");
      // But NOT as Primary in opus
      const opusContent = bundle.roles.opus;
      const levelSplitInOpus = opusContent.indexOf("Level-Split");
      const primaryAfterLS = opusContent.indexOf("(Primary)", levelSplitInOpus);
      // If there's a (Primary) after Level-Split, it shouldn't be immediately after
      if (primaryAfterLS > levelSplitInOpus) {
        expect(primaryAfterLS - levelSplitInOpus).toBeGreaterThan(15);
      }
    });
  });

  describe("selectedOperators array", () => {
    it("includes canonical tags of selected operators", () => {
      const bundle = generatePromptBundle([levelSplitOperator, exclusionTestOperator]);

      expect(bundle.selectedOperators).toContain("level-split");
      expect(bundle.selectedOperators).toContain("exclusion-test");
    });

    it("matches number of input operators", () => {
      const bundle = generatePromptBundle([
        levelSplitOperator,
        exclusionTestOperator,
        theoryKillOperator,
      ]);

      expect(bundle.selectedOperators.length).toBe(3);
    });
  });

  describe("generatedAt timestamp", () => {
    it("is a valid ISO timestamp", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      const parsed = new Date(bundle.generatedAt);
      expect(parsed.toISOString()).toBe(bundle.generatedAt);
    });

    it("is recent (within last minute)", () => {
      const bundle = generatePromptBundle([levelSplitOperator]);

      const generated = new Date(bundle.generatedAt);
      const now = new Date();
      const diffMs = now.getTime() - generated.getTime();

      expect(diffMs).toBeLessThan(60000);
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("type exports", () => {
  it("PromptBundle type has correct shape", () => {
    const bundle: PromptBundle = {
      kickoff: "kickoff content",
      roles: {
        codex: "codex prompt",
        opus: "opus prompt",
        gemini: "gemini prompt",
      },
      selectedOperators: ["op1", "op2"],
      generatedAt: new Date().toISOString(),
    };

    expect(bundle.kickoff).toBe("kickoff content");
    expect(bundle.roles.codex).toBe("codex prompt");
    expect(bundle.roles.opus).toBe("opus prompt");
    expect(bundle.roles.gemini).toBe("gemini prompt");
    expect(bundle.selectedOperators).toEqual(["op1", "op2"]);
    expect(bundle.generatedAt).toBeTruthy();
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("full operator set", () => {
  it("handles many operators without error", () => {
    const operators = [
      levelSplitOperator,
      exclusionTestOperator,
      theoryKillOperator,
      crossDomainOperator,
      materializeOperator,
      scaleCheckOperator,
    ];

    const bundle = generatePromptBundle(operators);

    expect(bundle.kickoff).toBeTruthy();
    expect(bundle.roles.codex).toBeTruthy();
    expect(bundle.roles.opus).toBeTruthy();
    expect(bundle.roles.gemini).toBeTruthy();
    expect(bundle.selectedOperators.length).toBe(6);
  });

  it("limits triggers and failure modes in kickoff", () => {
    // The kickoff limits to 6 triggers and 4 failure modes
    const operators = [
      levelSplitOperator,
      exclusionTestOperator,
      theoryKillOperator,
      crossDomainOperator,
      materializeOperator,
      scaleCheckOperator,
    ];

    const bundle = generatePromptBundle(operators);

    // Count trigger lines (lines starting with "- " in When to Apply section)
    const whenSection = bundle.kickoff.split("## When to Apply")[1]?.split("##")[0] ?? "";
    const triggerLines = whenSection.match(/^- /gm) ?? [];
    expect(triggerLines.length).toBeLessThanOrEqual(6);

    // Count failure mode lines
    const failureSection = bundle.kickoff.split("## Failure Modes")[1]?.split("---")[0] ?? "";
    const failureLines = failureSection.match(/^- /gm) ?? [];
    expect(failureLines.length).toBeLessThanOrEqual(4);
  });
});
