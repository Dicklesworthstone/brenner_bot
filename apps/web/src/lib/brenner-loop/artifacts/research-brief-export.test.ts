/**
 * Research Brief Export Tests
 *
 * @see brenner_bot-nu8g.2 (Implement Multi-Format Export)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { ResearchBriefTemplateInput } from "./research-brief-template";
import {
  exportToMarkdown,
  exportToJSON,
  exportToPDF,
  exportToLaTeX,
  importResearchBrief,
  downloadResearchBrief,
} from "./research-brief-export";

// ============================================================================
// Test Data
// ============================================================================

function createTestBrief(
  overrides?: Partial<ResearchBriefTemplateInput>
): ResearchBriefTemplateInput {
  return {
    metadata: {
      type: "research_brief",
      version: "1.0",
      sessionId: "TEST-SESSION-001",
      hypothesisId: "HC-TEST-001-v1",
      createdAt: "2026-01-05T12:00:00.000Z",
      finalConfidence: 65,
      status: "supported",
      operatorsApplied: ["Level Split", "Exclusion Test"],
      agentsConsulted: ["Devil's Advocate", "Experiment Designer"],
      testsIdentified: 5,
      testsCompleted: 3,
      brennerCitations: ["§42", "§127"],
    },
    executiveSummary:
      "Hypothesis shows strong support after level split and exclusion testing.",
    hypothesisStatement: {
      statement: "Social media algorithms cause depression in teenagers",
      mechanism: "Algorithmic amplification of negative content",
      domain: ["psychology", "technology"],
    },
    discriminativeStructure: {
      predictionsIfTrue: [
        "Higher screen time correlates with depression",
        "Algorithm changes affect mood scores",
      ],
      predictionsIfFalse: [
        "No correlation between algorithm exposure and mood",
      ],
      falsificationConditions: [
        "Improved mood with increased algorithmic exposure",
      ],
    },
    recommendedNextSteps: [
      "Run longitudinal study with algorithm variants",
      "Survey participants on content perception",
    ],
    ...overrides,
  };
}

// ============================================================================
// Markdown Export Tests
// ============================================================================

describe("exportToMarkdown", () => {
  test("returns a blob with markdown content", () => {
    const brief = createTestBrief();
    const result = exportToMarkdown(brief);

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.mimeType).toBe("text/markdown");
    expect(result.filename).toMatch(/\.md$/);
  });

  test("generates appropriate filename from session ID", () => {
    const brief = createTestBrief();
    const result = exportToMarkdown(brief);

    expect(result.filename).toContain("TEST-SESSION-001");
    expect(result.filename).toMatch(/research-brief-TEST-SESSION-001-\d{4}-\d{2}-\d{2}\.md$/);
  });

  test("uses custom filename when provided", () => {
    const brief = createTestBrief();
    const result = exportToMarkdown(brief, { filename: "my-custom-brief" });

    expect(result.filename).toBe("my-custom-brief.md");
  });

  test("blob contains markdown content", async () => {
    const brief = createTestBrief();
    const result = exportToMarkdown(brief);
    const text = await result.blob.text();

    expect(text).toContain("# Research Brief");
    expect(text).toContain("## Executive Summary");
    expect(text).toContain("Social media algorithms cause depression");
  });

  test("handles minimal brief input", () => {
    const result = exportToMarkdown({});

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.filename).toMatch(/research-brief-unknown-.*\.md$/);
  });
});

// ============================================================================
// JSON Export Tests
// ============================================================================

describe("exportToJSON", () => {
  test("returns a blob with JSON content", async () => {
    const brief = createTestBrief();
    const result = await exportToJSON(brief);

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.mimeType).toBe("application/json");
    expect(result.filename).toMatch(/\.json$/);
  });

  test("includes format version and checksum", async () => {
    const brief = createTestBrief();
    const result = await exportToJSON(brief);
    const text = await result.blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.format).toBe("brenner-research-brief-v1");
    expect(parsed.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.exportedAt).toBeDefined();
  });

  test("includes the brief data", async () => {
    const brief = createTestBrief();
    const result = await exportToJSON(brief);
    const text = await result.blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.brief.executiveSummary).toBe(brief.executiveSummary);
    expect(parsed.brief.metadata?.sessionId).toBe("TEST-SESSION-001");
  });

  test("generates valid checksum", async () => {
    const brief = createTestBrief();
    const result1 = await exportToJSON(brief);
    const result2 = await exportToJSON(brief);

    const parsed1 = JSON.parse(await result1.blob.text());
    const parsed2 = JSON.parse(await result2.blob.text());

    // Same brief should produce same checksum
    expect(parsed1.checksum).toBe(parsed2.checksum);
  });

  test("different briefs produce different checksums", async () => {
    const brief1 = createTestBrief();
    const brief2 = createTestBrief({ executiveSummary: "Different summary" });

    const result1 = await exportToJSON(brief1);
    const result2 = await exportToJSON(brief2);

    const parsed1 = JSON.parse(await result1.blob.text());
    const parsed2 = JSON.parse(await result2.blob.text());

    expect(parsed1.checksum).not.toBe(parsed2.checksum);
  });

  test("pretty prints by default", async () => {
    const brief = createTestBrief();
    const result = await exportToJSON(brief);
    const text = await result.blob.text();

    // Pretty-printed JSON should have newlines
    expect(text).toContain("\n");
    expect(text.split("\n").length).toBeGreaterThan(10);
  });

  test("can disable pretty printing", async () => {
    const brief = createTestBrief();
    const result = await exportToJSON(brief, { prettyPrint: false });
    const text = await result.blob.text();

    // Non-pretty JSON is a single line (no newlines except within strings)
    expect(text.split("\n").length).toBe(1);
  });
});

// ============================================================================
// PDF Export Tests
// ============================================================================

describe("exportToPDF", () => {
  test("returns a blob with HTML content for printing", async () => {
    const brief = createTestBrief();
    const result = await exportToPDF(brief);

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.filename).toMatch(/\.pdf$/);
  });

  test("HTML includes proper structure", async () => {
    const brief = createTestBrief();
    const result = await exportToPDF(brief);
    const text = await result.blob.text();

    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain("<html");
    expect(text).toContain("</html>");
    expect(text).toContain("<style>");
    expect(text).toContain("@media print");
  });

  test("HTML includes brief content", async () => {
    const brief = createTestBrief();
    const result = await exportToPDF(brief);
    const text = await result.blob.text();

    expect(text).toContain("Research Brief");
    expect(text).toContain("Executive Summary");
  });

  test("includes print-specific CSS", async () => {
    const brief = createTestBrief();
    const result = await exportToPDF(brief);
    const text = await result.blob.text();

    expect(text).toContain("@page");
    expect(text).toContain("margin:");
  });

  test("handles nested bold and italic formatting", async () => {
    const brief = createTestBrief({
      executiveSummary: "This has **bold with *nested italic* inside** text.",
    });
    const result = await exportToPDF(brief);
    const text = await result.blob.text();

    expect(text).toContain("<strong>bold with <em>nested italic</em> inside</strong>");
  });

  test("handles italic containing bold", async () => {
    const brief = createTestBrief({
      executiveSummary: "This has *italic with **bold** inside* text.",
    });
    const result = await exportToPDF(brief);
    const text = await result.blob.text();

    expect(text).toContain("<em>italic with <strong>bold</strong> inside</em>");
  });

  test("handles mixed list types correctly", async () => {
    const brief = createTestBrief({
      recommendedNextSteps: ["First ordered", "Second ordered"],
      // The template renders these as ordered list items
    });
    const result = await exportToPDF(brief);
    const text = await result.blob.text();

    // Ordered lists should be wrapped in <ol>
    expect(text).toContain("<ol>");
    expect(text).toContain("</ol>");
  });

  test("converts horizontal rules correctly", async () => {
    const brief = createTestBrief({
      executiveSummary: "Before rule\n\n---\n\nAfter rule",
    });
    const result = await exportToPDF(brief);
    const text = await result.blob.text();

    expect(text).toContain("<hr>");
    expect(text).not.toContain("<p>---</p>");
  });
});

// ============================================================================
// Import Tests
// ============================================================================

describe("importResearchBrief", () => {
  test("successfully imports valid JSON export", async () => {
    const brief = createTestBrief();
    const exported = await exportToJSON(brief);
    const text = await exported.blob.text();
    const file = new File([text], "brief.json", { type: "application/json" });

    const result = await importResearchBrief(file);

    expect(result.brief.executiveSummary).toBe(brief.executiveSummary);
    expect(result.warnings).toHaveLength(0);
  });

  test("warns on checksum mismatch", async () => {
    const brief = createTestBrief();
    const exported = await exportToJSON(brief);
    const text = await exported.blob.text();
    const parsed = JSON.parse(text);

    // Tamper with the brief
    parsed.brief.executiveSummary = "Tampered content";

    const file = new File([JSON.stringify(parsed)], "brief.json", {
      type: "application/json",
    });

    const result = await importResearchBrief(file);

    expect(result.warnings).toContain(
      "Checksum mismatch; brief data may be modified."
    );
  });

  test("warns on missing checksum", async () => {
    const brief = createTestBrief();
    const payload = {
      format: "brenner-research-brief-v1",
      exportedAt: new Date().toISOString(),
      brief,
      // No checksum
    };

    const file = new File([JSON.stringify(payload)], "brief.json", {
      type: "application/json",
    });

    const result = await importResearchBrief(file);

    expect(result.warnings).toContain(
      "Checksum missing; integrity could not be verified."
    );
  });

  test("warns on unexpected format", async () => {
    const payload = {
      format: "unknown-format-v99",
      exportedAt: new Date().toISOString(),
      brief: createTestBrief(),
      checksum: "abc123",
    };

    const file = new File([JSON.stringify(payload)], "brief.json", {
      type: "application/json",
    });

    const result = await importResearchBrief(file);

    expect(result.warnings.some((w) => w.includes("Unexpected format"))).toBe(
      true
    );
  });

  test("throws on invalid JSON", async () => {
    const file = new File(["not valid json"], "brief.json", {
      type: "application/json",
    });

    await expect(importResearchBrief(file)).rejects.toThrow(
      "file is not valid JSON"
    );
  });

  test("throws on missing brief payload", async () => {
    const payload = {
      format: "brenner-research-brief-v1",
      exportedAt: new Date().toISOString(),
      // No brief
    };

    const file = new File([JSON.stringify(payload)], "brief.json", {
      type: "application/json",
    });

    await expect(importResearchBrief(file)).rejects.toThrow(
      "missing or invalid brief payload"
    );
  });

  test("throws when no file provided", async () => {
    await expect(importResearchBrief(null as unknown as File)).rejects.toThrow(
      "No file provided"
    );
  });
});

// ============================================================================
// Download Utility Tests
// ============================================================================

describe("downloadResearchBrief", () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clickSpy = vi.fn();

    const mockLink = {
      href: "",
      download: "",
      click: clickSpy,
    };

    vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
    removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("creates object URL and triggers download", () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const result = {
      blob,
      filename: "test.md",
      mimeType: "text/markdown",
    };

    downloadResearchBrief(result);

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test");
  });
});

// ============================================================================
// Round-Trip Tests
// ============================================================================

describe("round-trip export/import", () => {
  test("JSON export/import preserves all data", async () => {
    const original = createTestBrief();
    const exported = await exportToJSON(original);
    const text = await exported.blob.text();
    const file = new File([text], "brief.json", { type: "application/json" });

    const { brief: imported } = await importResearchBrief(file);

    expect(imported.executiveSummary).toBe(original.executiveSummary);
    expect(imported.metadata?.sessionId).toBe(original.metadata?.sessionId);
    expect(imported.hypothesisStatement?.statement).toBe(
      original.hypothesisStatement?.statement
    );
    expect(imported.discriminativeStructure?.predictionsIfTrue).toEqual(
      original.discriminativeStructure?.predictionsIfTrue
    );
    expect(imported.recommendedNextSteps).toEqual(original.recommendedNextSteps);
  });

  test("complex brief survives round-trip", async () => {
    const complex = createTestBrief({
      operatorsApplied: [
        {
          operator: "Level Split",
          discoveries: ["Found 3 levels of analysis"],
          outputs: ["Individual", "Group", "Societal"],
        },
        {
          operator: "Exclusion Test",
          discoveries: ["Natural experiment identified"],
          outputs: ["Algorithm A/B test results"],
        },
      ],
      agentAnalysis: {
        devilsAdvocate: ["Selection bias concern", "Reverse causation possible"],
        experimentDesigner: ["RCT design proposed", "Sample size calculated"],
        consensus: ["Need longitudinal data"],
        conflicts: ["Feasibility vs rigor tradeoff"],
      },
      evidenceSummary: {
        testsRun: ["Correlation analysis", "Cross-sectional survey"],
        results: ["Moderate positive correlation (r=0.45)"],
        confidenceTrajectory: ["Initial 50%", "Post-correlation 60%", "Final 65%"],
      },
    });

    const exported = await exportToJSON(complex);
    const text = await exported.blob.text();
    const file = new File([text], "brief.json", { type: "application/json" });

    const { brief: imported, warnings } = await importResearchBrief(file);

    expect(warnings).toHaveLength(0);
    expect(imported.operatorsApplied).toHaveLength(2);
    expect(imported.agentAnalysis?.devilsAdvocate).toHaveLength(2);
    expect(imported.evidenceSummary?.confidenceTrajectory).toHaveLength(3);
  });
});

describe("exportToLaTeX", () => {
  test("exports valid .tex document with escaped characters and Brenner anchors", async () => {
    const brief = createTestBrief();
    const result = exportToLaTeX(brief, { filename: "brenner-brief" });

    expect(result.filename).toBe("brenner-brief.tex");
    expect(result.mimeType).toBe("application/x-latex");

    const text = await result.blob.text();
    expect(text).toContain("\\documentclass[11pt,a4paper]{article}");
    expect(text).toContain("\\section{Hypothesis \\& Causal Mechanism}");
    expect(text).toContain("Social media algorithms cause depression in teenagers");
    expect(text).toContain("\\S{}42");
  });
});
