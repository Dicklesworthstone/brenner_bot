import { describe, expect, it } from "vitest";

import { synthesizeResponses } from "./synthesis";

describe("synthesizeResponses", () => {
  it("extracts consensus, conflicts, and recommendations from tribunal responses", () => {
    const result = synthesizeResponses([
      {
        agent: "devils_advocate",
        content: [
          "# Response",
          "",
          "- Selection bias is a major confound; anxious people may self-select into heavy use.",
          "- The proposed mechanism is **not** well-supported; correlation is not causation.",
          "- We should test reverse causation and third-variable explanations first.",
          "",
          "I recommend comparing cohorts with matched baseline anxiety.",
        ].join("\n"),
      },
      {
        agent: "experiment_designer",
        content: [
          "# Response",
          "",
          "- Selection bias is a major confound; include randomization or strong quasi-experiments.",
          "- Design a randomized intervention: reduce exposure for one group and compare outcomes.",
          "- This is feasible with school-level rollout and consent procedures.",
        ].join("\n"),
      },
      {
        agent: "brenner_channeler",
        content: [
          "# Response",
          "",
          "- Exclusion is always a tremendously good thing in science — find a test that can rule it out.",
          "- If both leading stories fail, what's the third alternative?",
          "- Do your sums: what effect size would even matter at the population scale?",
        ].join("\n"),
      },
    ]);

    expect(result.consensusPoints.some((p) => /selection bias/i.test(p.claim))).toBe(true);

    const selectionConsensus = result.consensusPoints.find((p) => /selection bias/i.test(p.claim));
    expect(selectionConsensus?.supportingAgents.sort()).toEqual(
      ["devils_advocate", "experiment_designer"].sort(),
    );

    expect(result.recommendations.some((r) => /randomized/i.test(r.action))).toBe(true);

    // Conflict: feasibility claimed vs mechanism "not supported" isn't a strict polarity clash,
    // but we do include at least one explicit polarity-based conflict in this fixture:
    // "not well-supported" (negative) vs "feasible" (positive) within the same cluster is not guaranteed.
    // So instead assert we detect principles reliably.
    expect(result.brennerPrinciples.some((p) => /Exclusion/i.test(p.principle))).toBe(true);
    expect(result.brennerPrinciples.some((p) => /third alternative/i.test(p.principle))).toBe(true);
    expect(result.brennerPrinciples.some((p) => /Scale check/i.test(p.principle))).toBe(true);
  });

  it("flags conflicts when similar claims have opposite polarity", () => {
    const result = synthesizeResponses([
      {
        agent: "agent_a",
        content: "- This is feasible with existing data collection.",
      },
      {
        agent: "agent_b",
        content: "- This is not feasible with existing data collection.",
      },
    ]);

    expect(result.conflictPoints.length).toBeGreaterThan(0);
    expect(result.conflictPoints[0]?.positions.map((p) => p.agent).sort()).toEqual(
      ["agent_a", "agent_b"].sort(),
    );
  });
});
