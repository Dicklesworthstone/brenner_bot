/**
 * Unit Tests for metaprompt-parser.ts
 *
 * Tests the markdown parsing logic for metaprompt documents.
 * Uses real data fixtures - no mocks.
 */

import { describe, expect, it } from "vitest";
import { parseMetaprompt } from "./metaprompt-parser";

// ============================================================================
// Test Fixtures
// ============================================================================

const SIMPLE_METAPROMPT = `# Brenner Session Metaprompt

This is the guiding prompt for research sessions.

## Context

You are a research agent following the Brenner methodology.

## Instructions

1. Start with problem selection
2. Generate competing hypotheses
3. Design discriminative tests

### Detailed Instructions

More specific guidance here.

## Output Format

Produce structured artifacts.
`;

const EMPTY_METAPROMPT = "";

const NO_SECTIONS_METAPROMPT = `# Just a Title

Some content without any sections.
`;

const NESTED_SECTIONS = `# Metaprompt

Description here.

## Level 2 Section

Content at level 2.

### Level 3 Section

Content at level 3.

#### Level 4 Section

Content at level 4.

## Another Level 2

Back to level 2.
`;

// ============================================================================
// Tests: parseMetaprompt
// ============================================================================

describe("parseMetaprompt", () => {
  describe("basic parsing", () => {
    it("extracts title from H1 header", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      expect(result.title).toBe("Brenner Session Metaprompt");
    });

    it("extracts description from first paragraph", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      expect(result.description).toBe("This is the guiding prompt for research sessions.");
    });

    it("counts words correctly", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it("counts all sections", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      // Context, Instructions, Detailed Instructions, Output Format
      expect(result.sections.length).toBe(4);
    });
  });

  describe("section parsing", () => {
    it("extracts section titles correctly", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      expect(result.sections.some((s) => s.title === "Context")).toBe(true);
      expect(result.sections.some((s) => s.title === "Instructions")).toBe(true);
      expect(result.sections.some((s) => s.title === "Output Format")).toBe(true);
    });

    it("sets section levels correctly", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      const contextSection = result.sections.find((s) => s.title === "Context");
      const detailedSection = result.sections.find((s) => s.title === "Detailed Instructions");

      // h2 = level 1, h3 = level 2
      expect(contextSection?.level).toBe(1);
      expect(detailedSection?.level).toBe(2);
    });

    it("extracts section content", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      const contextSection = result.sections.find((s) => s.title === "Context");
      expect(contextSection?.content).toContain("research agent");
    });

    it("handles nested sections with correct levels", () => {
      const result = parseMetaprompt(NESTED_SECTIONS);

      const level2 = result.sections.find((s) => s.title === "Level 2 Section");
      const level3 = result.sections.find((s) => s.title === "Level 3 Section");
      const level4 = result.sections.find((s) => s.title === "Level 4 Section");

      expect(level2?.level).toBe(1); // h2 -> level 1
      expect(level3?.level).toBe(2); // h3 -> level 2
      expect(level4?.level).toBe(3); // h4 -> level 3
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const result = parseMetaprompt(EMPTY_METAPROMPT);
      expect(result.title).toBe("Metaprompt");
      expect(result.sections.length).toBe(0);
      expect(result.wordCount).toBe(0);
    });

    it("provides rawContent when no sections found", () => {
      const result = parseMetaprompt(NO_SECTIONS_METAPROMPT);
      expect(result.sections.length).toBe(0);
      expect(result.rawContent).toBeDefined();
      expect(result.rawContent).toContain("Just a Title");
    });

    it("handles missing description", () => {
      const noDesc = `# Title

## Section

Content here.
`;
      const result = parseMetaprompt(noDesc);
      expect(result.description).toBeUndefined();
    });

    it("handles description with special characters", () => {
      const withSpecial = `# Title

This is a description with *emphasis* and **bold** and \`code\`.

## Section

Content.
`;
      const result = parseMetaprompt(withSpecial);
      expect(result.description).toContain("emphasis");
    });
  });

  describe("content boundaries", () => {
    it("section content ends at next section", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      const contextSection = result.sections.find((s) => s.title === "Context");

      // Should not contain content from Instructions section
      expect(contextSection?.content).not.toContain("Start with problem selection");
    });

    it("last section content extends to end of document", () => {
      const result = parseMetaprompt(SIMPLE_METAPROMPT);
      const lastSection = result.sections[result.sections.length - 1];

      expect(lastSection?.title).toBe("Output Format");
      expect(lastSection?.content).toContain("structured artifacts");
    });
  });
});

// ============================================================================
// Tests: Real corpus integration
// ============================================================================

describe("real corpus integration", () => {
  it("parses a realistic metaprompt", () => {
    const realLike = `# Brenner Research Session Metaprompt v0.2

This metaprompt guides multi-agent research sessions using the Brenner methodology.

## Role Definition

You are a research agent specializing in hypothesis generation and testing.
Your goal is to produce discriminative experiments, not confirmatory ones.

## Core Constraints

- Always generate at least 2 competing hypotheses
- Design tests that can falsify, not just confirm
- Prefer cheap, fast experiments over expensive ones

### The Third Alternative

When presented with A vs B, always ask: what if both are wrong?

## Output Artifact Schema

Produce the following sections:
1. Research Thread (question + context + why it matters)
2. Hypothesis Slate (competing explanations)
3. Discriminative Tests (experiments that distinguish)
`;

    const result = parseMetaprompt(realLike);

    expect(result.title).toBe("Brenner Research Session Metaprompt v0.2");
    expect(result.description).toContain("multi-agent research sessions");

    // Check sections
    expect(result.sections.length).toBe(4);
    expect(result.sections.some((s) => s.title === "Role Definition")).toBe(true);
    expect(result.sections.some((s) => s.title === "Core Constraints")).toBe(true);
    expect(result.sections.some((s) => s.title === "The Third Alternative")).toBe(true);
    expect(result.sections.some((s) => s.title === "Output Artifact Schema")).toBe(true);

    // Check levels
    const coreConstraints = result.sections.find((s) => s.title === "Core Constraints");
    const thirdAlt = result.sections.find((s) => s.title === "The Third Alternative");
    expect(coreConstraints?.level).toBe(1); // h2
    expect(thirdAlt?.level).toBe(2); // h3

    // Check content
    expect(coreConstraints?.content).toContain("competing hypotheses");
    expect(thirdAlt?.content).toContain("both are wrong");
  });
});
