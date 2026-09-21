import { describe, expect, it } from "vitest";
import { createEmptyArtifact, lintArtifact } from "./artifact-merge";

describe("artifact-merge repro: anchor regex", () => {
  it("should validate anchors with spaces (e.g. § 42) as transcript references", () => {
    const artifact = createEmptyArtifact("TEST-REGEX");
    artifact.sections.research_thread = {
      id: "RT",
      statement: "S",
      context: "C",
      why_it_matters: "W",
      // This anchor has a space. If not parsed, it might be seen as "pure inference"
      // or at least fail range validation if we tried to range-check it (but here we just check recognition).
      // Actually, EP-P01 range check only fires if it *extracts* a number.
      // If it doesn't extract, it's just a random string.
      // But WP-P02 warns if anchors are "pure inference" (inference without source).
      // If "§ 42" is treated as "not a source", and we also have "[inference]",
      // it should warn. If "§ 42" IS treated as a source, it should NOT warn.
      anchors: ["§ 42", "[inference]"],
    };

    // Fill other sections to pass basic checks
    artifact.sections.hypothesis_slate = [
      {
        id: "H1",
        name: "H1",
        claim: "C",
        mechanism: "M",
        anchors: ["§1"],
        third_alternative: true,
      },
      { id: "H2", name: "H2", claim: "C", mechanism: "M", anchors: ["§1"] },
      { id: "H3", name: "H3", claim: "C", mechanism: "M", anchors: ["§1"] },
    ];
    artifact.sections.predictions_table = [
      { id: "P1", condition: "C", predictions: { H1: "P", H2: "P", H3: "P" } },
      { id: "P2", condition: "C", predictions: { H1: "P", H2: "P", H3: "P" } },
      { id: "P3", condition: "C", predictions: { H1: "P", H2: "P", H3: "P" } },
    ];
    artifact.sections.discriminative_tests = [
      {
        id: "T1",
        name: "T1",
        procedure: "P",
        discriminates: "D",
        expected_outcomes: { H1: "O" },
        potency_check: "PC §50",
        score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
      },
      {
        id: "T2",
        name: "T2",
        procedure: "P",
        discriminates: "D",
        expected_outcomes: { H1: "O" },
        potency_check: "PC §50",
        score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
      },
    ];
    artifact.sections.assumption_ledger = [
      {
        id: "A1",
        name: "A1",
        statement: "S",
        load: "L",
        test: "T",
        scale_check: true,
        calculation: "1",
      },
      { id: "A2", name: "A2", statement: "S", load: "L", test: "T" },
      { id: "A3", name: "A3", statement: "S", load: "L", test: "T" },
    ];
    artifact.sections.adversarial_critique = [
      {
        id: "C1",
        name: "C1",
        attack: "A",
        evidence: "E",
        current_status: "S",
        real_third_alternative: true,
      },
      { id: "C2", name: "C2", attack: "A", evidence: "E", current_status: "S" },
    ];

    const report = lintArtifact(artifact);

    // Check for WP-P02 on RT (Research Thread).
    // Wait, lintArtifact checks hypotheses for WP-P02.
    // Let's modify H1 to have the spaced anchor.
    artifact.sections.hypothesis_slate[0].anchors = ["§ 42", "[inference]"];

    const report2 = lintArtifact(artifact);
    // If § 42 is not recognized as a source, WP-P02 (pure inference) should trigger
    // because it sees "[inference]" but no recognized transcript/evidence anchor.
    const warning = report2.violations.find((v) => v.id === "WP-P02");

    // We expect NO warning if "§ 42" is recognized.
    // If it fails (warns), then "§ 42" was NOT recognized.
    expect(warning).toBeUndefined();
  });
});
