/**
 * Delta Parser Tests
 *
 * Verifies the delta parsing and validation logic.
 * Philosophy: NO mocks - test real parsing with real fixtures.
 */

import { describe, expect, it } from "vitest";
import {
  extractValidDeltas,
  generateNextId,
  parseDeltaMessage,
  validateTargetIdPrefix,
  type DeltaSection,
} from "./delta-parser";

describe("parseDeltaMessage", () => {
  it("parses a valid ADD delta", () => {
    const body = `
Some prose explanation here.

## Deltas

\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Test Hypothesis",
    "claim": "X causes Y",
    "mechanism": "Via pathway Z"
  },
  "rationale": "Testing the parser"
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null,
    });
  });

  it("parses delta blocks with CRLF line endings", () => {
    const body =
      "Some prose.\r\n\r\n```delta\r\n{\r\n" +
      '  "operation": "ADD",\r\n' +
      '  "section": "hypothesis_slate",\r\n' +
      '  "target_id": null,\r\n' +
      '  "payload": {\r\n' +
      '    "name": "CRLF Hypothesis",\r\n' +
      '    "claim": "X causes Y",\r\n' +
      '    "mechanism": "Via Z"\r\n' +
      "  }\r\n" +
      "}\r\n```\r\n";

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null,
    });
  });

  it("parses :::delta blocks", () => {
    const body = `
:::delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Alt Fence Hypothesis",
    "claim": "X causes Y",
    "mechanism": "Via Z"
  }
}
:::
`;

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null,
    });
  });

  it("parses a valid EDIT delta with target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": {
    "name": "Updated Hypothesis",
    "claim": "X causes Y via W"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "EDIT",
      section: "hypothesis_slate",
      target_id: "H1",
    });
  });

  it("parses a valid KILL delta", () => {
    const body = `
\`\`\`delta
{
  "operation": "KILL",
  "section": "hypothesis_slate",
  "target_id": "H2",
  "payload": {
    "reason": "Evidence X contradicts core mechanism"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "KILL",
      section: "hypothesis_slate",
      target_id: "H2",
    });
  });

  it("accepts ADD with non-null target_id (ignores it for leniency)", () => {
    // Per the implementation: "We intentionally allow target_id in ADD (and ignore it)
    // to be lenient with agents." - the target_id is forced to null for ADD operations.
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": { "name": "Test" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null, // Forced to null for ADD
    });
  });

  it("rejects EDIT without target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "Test" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("EDIT operation requires target_id");
    }
  });

  it("rejects invalid operation", () => {
    const body = `
\`\`\`delta
{
  "operation": "DELETE",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": {}
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("Invalid operation");
    }
  });

  it("rejects invalid section", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "unknown_section",
  "target_id": null,
  "payload": {}
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("Invalid section");
    }
  });

  it("rejects KILL without reason", () => {
    const body = `
\`\`\`delta
{
  "operation": "KILL",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": {}
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("KILL operation requires payload with 'reason'");
    }
  });

  it("rejects research_thread with non-EDIT operation", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "research_thread",
  "target_id": null,
  "payload": { "context": "Test" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("research_thread section only supports EDIT");
    }
  });

  it("accepts research_thread EDIT with null target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "research_thread",
  "target_id": null,
  "payload": {
    "statement": "How do cells determine fate?",
    "context": "Based on Brenner transcript"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "EDIT",
      section: "research_thread",
      target_id: null,
    });
  });

  it("accepts research_thread EDIT with target_id RT", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "research_thread",
  "target_id": "RT",
  "payload": {
    "statement": "Why do gradients dominate lineage cues?",
    "context": "Testing RT updates with explicit target"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.deltas[0]).toMatchObject({
      valid: true,
      operation: "EDIT",
      section: "research_thread",
      target_id: "RT",
    });
  });

  it("rejects research_thread EDIT with non-RT target_id", () => {
    const body = `
\`\`\`delta
{
  "operation": "EDIT",
  "section": "research_thread",
  "target_id": "H1",
  "payload": {
    "statement": "Bad target id",
    "context": "Should fail"
  }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("research_thread target_id must be \"RT\"");
    }
  });

  it("handles multiple delta blocks", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "H1" }
}
\`\`\`

Some text.

\`\`\`delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": { "name": "T1" }
}
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(2);
    expect(result.validCount).toBe(2);
  });

  it("handles malformed JSON gracefully", () => {
    const body = `
\`\`\`delta
{ not valid json }
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.invalidCount).toBe(1);
    if (!result.deltas[0]?.valid) {
      expect(result.deltas[0].error).toContain("Invalid JSON");
    }
  });

  it("returns empty results for body with no delta blocks", () => {
    const body = `
Just regular markdown with no delta blocks.

\`\`\`typescript
const x = 1;
\`\`\`
`;

    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(0);
    expect(result.validCount).toBe(0);
    expect(result.deltas).toHaveLength(0);
  });

  it("parses blocks with 4 backticks (variable fence length)", () => {
    const body = `
\`\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "Variable Fence" }
}
\`\`\`\`
`;
    const result = parseDeltaMessage(body);
    expect(result.validCount).toBe(1);
  });

  it("parses nested code blocks correctly", () => {
    const body = `
\`\`\`\`delta
{
  "operation": "EDIT",
  "section": "research_thread",
  "target_id": null,
  "payload": {
    "context": "Here is a snippet: \`\`\` code \`\`\`"
  }
}
\`\`\`\`
`;
    const result = parseDeltaMessage(body);
    expect(result.validCount).toBe(1);
    // Type-narrow to ValidDelta to check payload content
    const delta = result.deltas[0];
    expect(delta.valid).toBe(true);
    if (delta.valid) {
      const payload = delta.payload as { context?: string };
      expect(payload.context).toContain("``` code ```");
    }
  });
});

describe("extractValidDeltas", () => {
  it("filters to only valid deltas", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "Valid" }
}
\`\`\`

\`\`\`delta
{ "invalid": true }
\`\`\`

\`\`\`delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": { "name": "Also Valid" }
}
\`\`\`
`;

    const deltas = extractValidDeltas(body);

    expect(deltas).toHaveLength(2);
    expect(deltas[0]?.section).toBe("hypothesis_slate");
    expect(deltas[1]?.section).toBe("discriminative_tests");
  });
});

describe("validateTargetIdPrefix", () => {
  it("validates correct prefixes", () => {
    const cases: Array<{ id: string; section: DeltaSection; expected: boolean }> = [
      { id: "H1", section: "hypothesis_slate", expected: true },
      { id: "H42", section: "hypothesis_slate", expected: true },
      { id: "T1", section: "discriminative_tests", expected: true },
      { id: "P5", section: "predictions_table", expected: true },
      { id: "A3", section: "assumption_ledger", expected: true },
      { id: "X2", section: "anomaly_register", expected: true },
      { id: "C1", section: "adversarial_critique", expected: true },
      { id: "RT", section: "research_thread", expected: true },
      // Wrong prefixes
      { id: "T1", section: "hypothesis_slate", expected: false },
      { id: "H1", section: "discriminative_tests", expected: false },
    ];

    for (const { id, section, expected } of cases) {
      expect(validateTargetIdPrefix(id, section)).toBe(expected);
    }
  });
});

describe("generateNextId", () => {
  it("generates sequential IDs", () => {
    expect(generateNextId("hypothesis_slate", [])).toBe("H1");
    expect(generateNextId("hypothesis_slate", ["H1"])).toBe("H2");
    expect(generateNextId("hypothesis_slate", ["H1", "H2", "H3"])).toBe("H4");
    expect(generateNextId("discriminative_tests", ["T1", "T5"])).toBe("T6");
  });

  it("handles non-matching IDs", () => {
    // IDs from other sections should be ignored
    expect(generateNextId("hypothesis_slate", ["T1", "A2", "X3"])).toBe("H1");
  });

  it("handles empty existing IDs", () => {
    expect(generateNextId("anomaly_register", [])).toBe("X1");
    expect(generateNextId("adversarial_critique", [])).toBe("C1");
  });
});

describe("inline JSON detection (for diagnose command)", () => {
  it("detects body with JSON but no fenced delta block", () => {
    // This simulates a DELTA message where the agent forgot the ```delta fence
    const inlineJsonBody = `
Here is my hypothesis:

{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Test Hypothesis",
    "claim": "X causes Y"
  }
}
`;

    const result = parseDeltaMessage(inlineJsonBody);

    // Parser should find NO delta blocks (because there's no fence)
    expect(result.totalBlocks).toBe(0);
    expect(result.validCount).toBe(0);
    expect(result.deltas).toHaveLength(0);

    // But the body still contains JSON-like content that can be detected
    expect(inlineJsonBody).toContain('"operation"');
    expect(inlineJsonBody).toContain('"section"');
  });

  it("detects body with partial JSON fragments", () => {
    // Agent might output malformed JSON or partial deltas
    const partialJsonBody = `
I'm going to add a hypothesis with:
- operation: ADD
- section: hypothesis_slate

The "operation" should be ADD and the "section" is hypothesis_slate.
`;

    const result = parseDeltaMessage(partialJsonBody);

    expect(result.totalBlocks).toBe(0);
    expect(result.deltas).toHaveLength(0);

    // Body contains keywords but no valid JSON blocks
    expect(partialJsonBody).toContain('"operation"');
  });

  it("correctly parses fenced delta alongside prose with JSON keywords", () => {
    // Make sure we don't false-positive when there IS a proper fenced block
    const bodyWithFencedDelta = `
I mentioned "operation" and "section" in my prose.

\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": { "name": "Valid Hypothesis" }
}
\`\`\`
`;

    const result = parseDeltaMessage(bodyWithFencedDelta);

    expect(result.totalBlocks).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.deltas[0]?.valid).toBe(true);
  });

  it("handles empty body gracefully", () => {
    const emptyBody = "";
    const result = parseDeltaMessage(emptyBody);

    expect(result.totalBlocks).toBe(0);
    expect(result.validCount).toBe(0);
    expect(result.deltas).toHaveLength(0);
  });

  it("handles whitespace-only body", () => {
    const whitespaceBody = "   \n\n   \t   ";
    const result = parseDeltaMessage(whitespaceBody);

    expect(result.totalBlocks).toBe(0);
    expect(result.validCount).toBe(0);
    expect(result.deltas).toHaveLength(0);
  });
});

// ============================================================================
// Array ADD payloads (brenner_bot upstream fix 9e4ddb1) — an agent that emits
// "payload": [{...}, {...}] on an ADD should get one delta per array element
// instead of a single rejected delta.
// ============================================================================

describe("parseDeltaMessage — array ADD payloads", () => {
  it("expands an array payload on ADD into one valid delta per element", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": [
    { "name": "Hypothesis One", "claim": "First claim" },
    { "name": "Hypothesis Two", "claim": "Second claim" }
  ],
  "rationale": "batch add"
}
\`\`\`
`;
    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(1);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);

    const valid = result.deltas.filter((d) => d.valid) as Array<
      Extract<(typeof result.deltas)[number], { valid: true }>
    >;
    expect(valid).toHaveLength(2);
    expect(valid[0]?.payload).toMatchObject({ name: "Hypothesis One" });
    expect(valid[1]?.payload).toMatchObject({ name: "Hypothesis Two" });
  });

  it("leaves a single-item array as a rejected item rather than silently dropping it", () => {
    const body = `
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": [ "not-an-object" ],
  "rationale": "malformed batch add"
}
\`\`\`
`;
    const result = parseDeltaMessage(body);

    expect(result.totalBlocks).toBe(1);
    expect(result.validCount).toBe(0);
    expect(result.invalidCount).toBe(1);
  });
});
