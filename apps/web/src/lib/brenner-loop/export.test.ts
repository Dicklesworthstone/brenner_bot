/**
 * Session Export / Import Tests
 *
 * @see brenner_bot-1v26.4 (bead)
 */

import { describe, expect, test } from "vitest";
import { exportSession, importSession } from "./export";
import type { Session } from "./types";
import { createSession } from "./types";

function buildTestSession(options?: { withAttachedQuote?: boolean }): Session {
  const now = new Date();
  const session = createSession({ id: "SESSION-TEST-EXPORT" });
  const card = {
    id: "HC-SESSION-TEST-EXPORT-001-v1",
    version: 1,
    statement: "Cells interpret morphogen gradients via thresholded transcription.",
    mechanism: "Gradient binds receptors to activate gene expression at a threshold.",
    domain: ["developmental biology"],
    predictionsIfTrue: ["Boundary appears at consistent gradient threshold."],
    predictionsIfFalse: ["Boundary position is random."],
    impossibleIfTrue: ["Boundary appears without any gradient."],
    confounds: [],
    assumptions: [],
    confidence: 50,
    createdAt: now,
    updatedAt: now,
  };

  session.primaryHypothesisId = card.id;
  session.hypothesisCards = { [card.id]: card };
  session.researchQuestion = "How do cells determine positional information?";
  session.updatedAt = now.toISOString();
  session.commits = [];
  session.headCommitId = "";

  if (options?.withAttachedQuote) {
    session.attachedQuotes = [
      {
        id: "AQ-TEST-001",
        hypothesisId: card.id,
        field: "general",
        attachedAt: now.toISOString(),
        docId: "transcript",
        docTitle: "Sydney Brenner Transcript",
        category: "transcript",
        title: "Design experiments that can exclude",
        snippet:
          "The most important thing is to design experiments that can give you a clean answer.",
        anchor: "§42",
        url: "/corpus/transcript#transcript-42",
      },
    ];
  }

  return session;
}

describe("exportSession / importSession", () => {
  test("exports JSON with format and checksum", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "json");
    const text = await blob.text();
    const parsed = JSON.parse(text) as { format: string; checksum: string; session: Session };

    expect(parsed.format).toBe("brenner-session-v1");
    expect(parsed.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.session.id).toBe(session.id);
  });

  test("round-trips a session via JSON import", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "json");
    const text = await blob.text();
    const file = new File([text], "session.json", { type: "application/json" });

    const result = await importSession(file);
    expect(result.session.id).toBe(session.id);
  });

  test("round-trips attached quotes via JSON import", async () => {
    const session = buildTestSession({ withAttachedQuote: true });
    const blob = await exportSession(session, "json");
    const text = await blob.text();
    const file = new File([text], "session.json", { type: "application/json" });

    const result = await importSession(file);

    expect(Array.isArray(result.session.attachedQuotes)).toBe(true);
    expect(result.session.attachedQuotes?.length).toBe(1);
    expect(result.session.attachedQuotes?.[0]?.hypothesisId).toBe(session.primaryHypothesisId);
    expect(result.session.attachedQuotes?.[0]?.docId).toBe("transcript");
  });

  test("warns on checksum mismatch", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "json");
    const text = await blob.text();
    const parsed = JSON.parse(text) as { session: Session };
    parsed.session.id = "SESSION-TAMPERED";

    const file = new File([JSON.stringify(parsed)], "session.json", { type: "application/json" });
    const result = await importSession(file);

    expect(result.warnings.join(" ")).toMatch(/Checksum mismatch/);
  });

  test("exports readable markdown", async () => {
    const session = buildTestSession();
    const blob = await exportSession(session, "markdown");
    const markdown = await blob.text();

    expect(markdown).toContain(`# Brenner Loop Session ${session.id}`);
    expect(markdown).toContain("## Hypotheses");
  });

  test("includes attached quotes in markdown export", async () => {
    const session = buildTestSession({ withAttachedQuote: true });
    const blob = await exportSession(session, "markdown");
    const markdown = await blob.text();

    expect(markdown).toContain("Attached Quotes: 1");
    expect(markdown).toContain("Sydney Brenner Transcript");
    expect(markdown).toContain("transcript-42");
  });

  test("renders operator applications and evidence in markdown", async () => {
    const session = buildTestSession();
    session.tags = ["alpha", "beta"];
    session.operatorApplications = {
      levelSplit: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "tester",
          levels: [{ name: "X", levelType: "x", description: "desc" }],
        },
      ],
      exclusionTest: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "tester",
          designedTests: [{ name: "T1", procedure: "Do it" }],
        },
      ],
      objectTranspose: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "tester",
          originalSystem: "System",
          alternativeSystems: [{ name: "Alt" }],
        },
      ],
      scaleCheck: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "tester",
          plausible: true,
          calculations: [{ name: "Calc", result: 1, units: "u", implication: "imp" }],
        },
      ],
    } as never;
    session.evidenceLedger = [
      { recordedAt: "2026-01-01T00:00:00Z", observation: "Observed" },
    ] as never;

    const blob = await exportSession(session, "markdown");
    const markdown = await blob.text();

    expect(markdown).toContain("Operator Applications");
    expect(markdown).toContain("Level Split Results");
    expect(markdown).toContain("Exclusion Test Results");
    expect(markdown).toContain("Object Transpose Results");
    expect(markdown).toContain("Scale Check Results");
    expect(markdown).toContain("Evidence Ledger");
    expect(markdown).toContain("Tags: alpha, beta");
  });

  test("renders markdown even when primary card is missing", async () => {
    const session = buildTestSession();
    session.primaryHypothesisId = "HC-MISSING";
    session.hypothesisCards = {};
    session.alternativeHypothesisIds = ["HC-ALT-1"];

    const blob = await exportSession(session, "markdown");
    const markdown = await blob.text();

    expect(markdown).toContain("- Primary Hypothesis ID: HC-MISSING");
    expect(markdown).toContain("Missing hypothesis card for HC-ALT-1");
  });

  test("throws on missing file or invalid JSON payloads", async () => {
    await expect(importSession(undefined as never)).rejects.toThrow(/No file provided/);

    const invalid = new File(["not-json"], "session.json", { type: "application/json" });
    await expect(importSession(invalid)).rejects.toThrow(/not valid JSON/);

    const malformed = new File([JSON.stringify([])], "session.json", { type: "application/json" });
    await expect(importSession(malformed)).rejects.toThrow(/malformed export payload/);
  });

  test("collects warnings and normalizes imported sessions", async () => {
    const session = buildTestSession({ withAttachedQuote: true });

    const payload = {
      format: "wrong-format",
      exportedAt: null,
      session: {
        ...session,
        _version: 999,
        predictionIds: [123, "P-1"],
        commits: [{ id: "commit-import-1" }],
        headCommitId: "",
        attachedQuotes: [
          { nope: true },
          {
            hypothesisId: session.primaryHypothesisId,
            docId: "transcript",
            docTitle: "Transcript",
            category: "transcript",
            title: "A quote",
            snippet: "Some snippet",
            url: "/corpus/transcript#transcript-1",
            field: "not-a-field",
          },
        ],
      },
    };

    const file = new File([JSON.stringify(payload)], "session.json", { type: "application/json" });
    const result = await importSession(file);

    expect(result.warnings.join(" ")).toMatch(/Unexpected export format/);
    expect(result.warnings.join(" ")).toMatch(/Export timestamp missing or invalid/);
    expect(result.warnings.join(" ")).toMatch(/Checksum missing/);
    expect(result.warnings.join(" ")).toMatch(/newer than supported/);

    expect(result.session.predictionIds).toEqual(["P-1"]);
    expect(result.session.headCommitId).toBe("commit-import-1");
    expect(result.session.attachedQuotes?.length).toBe(1);
    expect(result.session.attachedQuotes?.[0]?.field).toBe("general");
    expect(result.session.attachedQuotes?.[0]?.id).toMatch(/^AQ-import-/);
  });
});
