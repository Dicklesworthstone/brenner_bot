import { describe, expect, test } from "vitest";
import { lintArtifact } from "@/lib/artifact-merge";
import { BIOLOGY_CELL_FATE_ARTIFACT } from "./biology-cell-fate";
import { CS_LLM_HALLUCINATION_ARTIFACT } from "./cs-llm-hallucination";
import { SOCIAL_COMMUNITY_TOXICITY_ARTIFACT } from "./social-community-toxicity";

describe("tutorial domain examples", () => {
  test("biology example passes artifact linter", () => {
    const report = lintArtifact(BIOLOGY_CELL_FATE_ARTIFACT);
    expect(report.valid).toBe(true);
    expect(report.summary.errors).toBe(0);
  });

  test("CS example passes artifact linter", () => {
    const report = lintArtifact(CS_LLM_HALLUCINATION_ARTIFACT);
    expect(report.valid).toBe(true);
    expect(report.summary.errors).toBe(0);
  });

  test("social science example passes artifact linter", () => {
    const report = lintArtifact(SOCIAL_COMMUNITY_TOXICITY_ARTIFACT);
    expect(report.valid).toBe(true);
    expect(report.summary.errors).toBe(0);
  });
});
