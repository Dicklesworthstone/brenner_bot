/**
 * Unit tests for tribunal objection extraction
 *
 * @see @/lib/brenner-loop/agents/objections
 */

import { describe, expect, it } from "vitest";
import { extractKeyObjectionBlocks, extractTribunalObjections } from "./objections";

describe("extractKeyObjectionBlocks", () => {
  it("extracts a single Key Objection block", () => {
    const md = [
      "## Critical Assessment",
      "",
      "### Key Objection",
      "The core issue is reverse causation: Y could cause X.",
      "",
      "### Alternative Explanations",
      "- Z drives both.",
    ].join("\n");

    expect(extractKeyObjectionBlocks(md)).toEqual([
      "The core issue is reverse causation: Y could cause X.",
    ]);
  });

  it("extracts multiple Key Objection blocks from one message", () => {
    const md = [
      "### Key Objection",
      "First objection.",
      "",
      "### Key Objection",
      "Second objection.",
      "",
      "### Falsification Criteria",
      "- Do X.",
    ].join("\n");

    expect(extractKeyObjectionBlocks(md)).toEqual(["First objection.", "Second objection."]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const md = [
      "### Key Objection",
      "Here is a fenced example:",
      "",
      "```md",
      "### Not A Real Heading",
      "```",
      "",
      "Still part of the objection.",
      "",
      "### Next Section",
      "ignored",
    ].join("\n");

    expect(extractKeyObjectionBlocks(md)).toEqual([
      [
        "Here is a fenced example:",
        "",
        "```md",
        "### Not A Real Heading",
        "```",
        "",
        "Still part of the objection.",
      ].join("\n"),
    ]);
  });

  it("accepts Key Objection headings with trailing punctuation", () => {
    const md = [
      "### Key Objection:",
      "Colon headings should still parse.",
      "",
      "### Next",
      "ignored",
    ].join("\n");
    expect(extractKeyObjectionBlocks(md)).toEqual(["Colon headings should still parse."]);
  });
});

describe("classifyObjectionType (via extractTribunalObjections)", () => {
  const makeMessage = (body: string) => ({
    id: 1,
    thread_id: "TRIBUNAL-SESSION-abc",
    subject: "TRIBUNAL[devils_advocate]: HYP-1",
    created_ts: "2026-01-01T00:00:00.000Z",
    from: "TestAgent",
    body_md: `### Key Objection\n${body}`,
  });

  it("classifies selection bias", () => {
    const objections = extractTribunalObjections([
      makeMessage("This has selection bias in the sample."),
    ]);
    expect(objections[0]!.type).toBe("selection_bias");
  });

  it("classifies self-selection as selection_bias", () => {
    const objections = extractTribunalObjections([
      makeMessage("The self-selection problem is clear."),
    ]);
    expect(objections[0]!.type).toBe("selection_bias");
  });

  it("classifies confound_identified", () => {
    const objections = extractTribunalObjections([
      makeMessage("There is a confounding variable Z."),
    ]);
    expect(objections[0]!.type).toBe("confound_identified");
  });

  it("classifies third variable as confound", () => {
    const objections = extractTribunalObjections([
      makeMessage("A third variable could explain this."),
    ]);
    expect(objections[0]!.type).toBe("confound_identified");
  });

  it("classifies measurement_issue", () => {
    const objections = extractTribunalObjections([
      makeMessage("The measurement approach is flawed."),
    ]);
    expect(objections[0]!.type).toBe("measurement_issue");
  });

  it("classifies self-report as measurement_issue", () => {
    const objections = extractTribunalObjections([makeMessage("Self-report data is unreliable.")]);
    expect(objections[0]!.type).toBe("measurement_issue");
  });

  it("classifies effect_size_concern", () => {
    const objections = extractTribunalObjections([
      makeMessage("The effect size is too small to matter."),
    ]);
    expect(objections[0]!.type).toBe("effect_size_concern");
  });

  it("classifies generalization_problem", () => {
    const objections = extractTribunalObjections([
      makeMessage("This has external validity issues."),
    ]);
    expect(objections[0]!.type).toBe("generalization_problem");
  });

  it("classifies generaliz keyword as generalization_problem", () => {
    const objections = extractTribunalObjections([
      makeMessage("The generalizability is questionable."),
    ]);
    expect(objections[0]!.type).toBe("generalization_problem");
  });

  it("classifies missing_evidence", () => {
    const objections = extractTribunalObjections([
      makeMessage("There is no evidence for this claim."),
    ]);
    expect(objections[0]!.type).toBe("missing_evidence");
  });

  it("classifies unsupported as missing_evidence", () => {
    const objections = extractTribunalObjections([makeMessage("This claim is unsupported.")]);
    expect(objections[0]!.type).toBe("missing_evidence");
  });

  it("classifies logic_error for non sequitur", () => {
    const objections = extractTribunalObjections([makeMessage("This is a non sequitur.")]);
    expect(objections[0]!.type).toBe("logic_error");
  });

  it("classifies logic_error for doesn't follow", () => {
    const objections = extractTribunalObjections([
      makeMessage("The conclusion doesn't follow from the premises."),
    ]);
    expect(objections[0]!.type).toBe("logic_error");
  });

  it("classifies alternative_explanation", () => {
    const objections = extractTribunalObjections([
      makeMessage("Another explanation is that Z causes both."),
    ]);
    expect(objections[0]!.type).toBe("alternative_explanation");
  });

  it("classifies could instead as alternative_explanation", () => {
    const objections = extractTribunalObjections([makeMessage("It could instead be due to Z.")]);
    expect(objections[0]!.type).toBe("alternative_explanation");
  });

  it("classifies unknown patterns as other", () => {
    const objections = extractTribunalObjections([
      makeMessage("Something vague about the approach."),
    ]);
    expect(objections[0]!.type).toBe("other");
  });
});

describe("classifySeverity (via extractTribunalObjections)", () => {
  const makeMessage = (body: string) => ({
    id: 1,
    thread_id: "TRIBUNAL-SESSION-abc",
    subject: "TRIBUNAL[devils_advocate]: HYP-1",
    created_ts: "2026-01-01T00:00:00.000Z",
    from: "TestAgent",
    body_md: `### Key Objection\n${body}`,
  });

  it("classifies deal-breaker as fatal", () => {
    const objections = extractTribunalObjections([makeMessage("This is a deal-breaker issue.")]);
    expect(objections[0]!.severity).toBe("fatal");
  });

  it("classifies cannot be true as fatal", () => {
    const objections = extractTribunalObjections([makeMessage("The hypothesis cannot be true.")]);
    expect(objections[0]!.severity).toBe("fatal");
  });

  it("classifies impossible as fatal", () => {
    const objections = extractTribunalObjections([makeMessage("This is physically impossible.")]);
    expect(objections[0]!.severity).toBe("fatal");
  });

  it("classifies rules out (without denial) as fatal", () => {
    const objections = extractTribunalObjections([
      makeMessage("This evidence rules out the hypothesis."),
    ]);
    expect(objections[0]!.severity).toBe("fatal");
  });

  it("classifies serious as serious", () => {
    const objections = extractTribunalObjections([makeMessage("This is a serious concern.")]);
    expect(objections[0]!.severity).toBe("serious");
  });

  it("classifies major as serious", () => {
    const objections = extractTribunalObjections([makeMessage("A major problem exists.")]);
    expect(objections[0]!.severity).toBe("serious");
  });

  it("classifies fundamental as serious", () => {
    const objections = extractTribunalObjections([
      makeMessage("This is fundamental to the argument."),
    ]);
    expect(objections[0]!.severity).toBe("serious");
  });

  it("classifies undermines as serious", () => {
    const objections = extractTribunalObjections([
      makeMessage("This undermines the whole thesis."),
    ]);
    expect(objections[0]!.severity).toBe("serious");
  });

  it("classifies strong objection as serious", () => {
    const objections = extractTribunalObjections([makeMessage("I have a strong objection here.")]);
    expect(objections[0]!.severity).toBe("serious");
  });

  it("classifies minor as minor", () => {
    const objections = extractTribunalObjections([
      makeMessage("A minor quibble with the wording."),
    ]);
    expect(objections[0]!.severity).toBe("minor");
  });

  it("classifies nit as minor", () => {
    const objections = extractTribunalObjections([makeMessage("Just a nit: formatting issue.")]);
    expect(objections[0]!.severity).toBe("minor");
  });

  it("defaults to moderate for unclassified text", () => {
    const objections = extractTribunalObjections([makeMessage("Some concern about the approach.")]);
    expect(objections[0]!.severity).toBe("moderate");
  });
});

describe("inferRoleFromSubject (via extractTribunalObjections)", () => {
  it("infers role from normalized subject containing role keyword", () => {
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "Statistician analysis of HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "StatBot",
        body_md: "### Key Objection\nSomething about statistics.",
      },
    ];
    const objections = extractTribunalObjections(messages);
    expect(objections[0]!.source.role).toBe("statistician");
  });

  it("returns null when subject has no recognizable role", () => {
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "Random unrelated subject",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "SomeAgent",
        body_md: "### Key Objection\nGeneric objection.",
      },
    ];
    const objections = extractTribunalObjections(messages);
    expect(objections[0]!.source.role).toBeNull();
  });
});

describe("edge cases", () => {
  it("skips messages with empty body_md", () => {
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "Agent",
        body_md: "",
      },
    ];
    expect(extractTribunalObjections(messages)).toEqual([]);
  });

  it("skips objection blocks that collapse to empty summary", () => {
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "Agent",
        body_md: "### Key Objection\n```\ncode only\n```\n\n### Next",
      },
    ];
    // The block has only a code block which is stripped, leaving empty summary
    expect(extractTribunalObjections(messages)).toEqual([]);
  });

  it("handles messages without from field", () => {
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        body_md: "### Key Objection\nValid objection content.",
      },
    ];
    const objections = extractTribunalObjections(messages);
    expect(objections[0]!.source.agentName).toBeNull();
  });

  it("truncates very long summaries with ellipsis", () => {
    const longText = "A".repeat(300);
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "Agent",
        body_md: `### Key Objection\n${longText}`,
      },
    ];
    const objections = extractTribunalObjections(messages);
    expect(objections[0]!.summary.length).toBeLessThanOrEqual(220);
    expect(objections[0]!.summary.endsWith("…")).toBe(true);
  });
});

describe("extractTribunalObjections", () => {
  it("builds extracted objections with stable ids and role inference", () => {
    const messages = [
      {
        id: 123,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "DevilBot",
        body_md: [
          "## Critical Assessment",
          "",
          "### Key Objection",
          "This looks like reverse causation (fatal).",
          "",
          "### Alternative Explanations",
          "- Z explains both.",
        ].join("\n"),
      },
    ];

    const objections = extractTribunalObjections(messages);
    expect(objections).toHaveLength(1);

    const obj = objections[0]!;
    expect(obj.id).toBe("123:0");
    expect(obj.type).toBe("reverse_causation");
    expect(obj.severity).toBe("fatal");
    expect(obj.summary).toMatch(/reverse causation/i);
    expect(obj.fullArgument).toMatch(/fatal/i);
    expect(obj.source.role).toBe("devils_advocate");
    expect(obj.source.messageId).toBe(123);
    expect(obj.source.agentName).toBe("DevilBot");
  });

  it("returns empty when no Key Objection blocks exist", () => {
    const messages = [
      {
        id: 1,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[experiment_designer]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        body_md: "## Methods\nNo objections here.",
      },
    ];

    expect(extractTribunalObjections(messages)).toEqual([]);
  });

  it("does not misclassify 'biological' as a logic error", () => {
    const messages = [
      {
        id: 2,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        body_md: ["### Key Objection", "The biological mechanism is underspecified."].join("\n"),
      },
    ];

    const objections = extractTribunalObjections(messages);
    expect(objections).toHaveLength(1);
    expect(objections[0]!.type).not.toBe("logic_error");
  });

  it("does not treat 'does not rule out' as a fatal severity marker", () => {
    const messages = [
      {
        id: 3,
        thread_id: "TRIBUNAL-SESSION-abc",
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        body_md: [
          "### Key Objection",
          "This does not rule out the hypothesis; it highlights uncertainty.",
        ].join("\n"),
      },
    ];

    const objections = extractTribunalObjections(messages);
    expect(objections).toHaveLength(1);
    expect(objections[0]!.severity).not.toBe("fatal");
  });
});
