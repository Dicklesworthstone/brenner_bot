import { describe, expect, it } from "vitest";
import { loadBrennerOperatorPalette } from "./operators";

describe("operators", () => {
  it("loads the core operator palette from the operator library spec", async () => {
    const ops = await loadBrennerOperatorPalette();
    expect(ops).toHaveLength(17);

    // Track how many operators have full quote-bank coverage
    let opsWithQuotes = 0;

    for (const op of ops) {
      expect(op.canonicalTag.length).toBeGreaterThan(0);
      expect(op.symbol.length).toBeGreaterThan(0);
      expect(op.title.length).toBeGreaterThan(0);

      // Operators with quoteBankAnchors should have matching supportingQuotes
      if (op.quoteBankAnchors.length > 0) {
        expect(op.supportingQuotes.length).toBeGreaterThan(0);
        opsWithQuotes++;

        for (const quote of op.supportingQuotes) {
          expect(quote.tags).toContain(op.canonicalTag);
          expect(op.quoteBankAnchors).toContain(quote.sectionId);
        }
      }
    }

    // Quickie/Pilot is the only operator without quote-bank anchors.
    expect(opsWithQuotes).toBeGreaterThanOrEqual(16);
  });
});
