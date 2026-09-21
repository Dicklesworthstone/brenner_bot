import { describe, expect, it } from "vitest";
import {
  makeDistillationSectionDomId,
  makeTranscriptSectionDomId,
  quoteBankDomIdFromSectionId,
  quoteBankSectionIdFromDomId,
  slugifyHeadingForAnchor,
} from "./anchors";

describe("anchors", () => {
  describe("slugifyHeadingForAnchor", () => {
    it("lowercases and normalizes whitespace/punctuation to dashes", () => {
      expect(slugifyHeadingForAnchor("  Hello, World!  ")).toBe("hello-world");
    });

    it("collapses repeated separators and trims dashes", () => {
      expect(slugifyHeadingForAnchor(" -- A   B --- ")).toBe("a-b");
    });

    it("returns empty string for all-non-alphanumeric titles", () => {
      expect(slugifyHeadingForAnchor("   --- !!!   ")).toBe("");
    });
  });

  describe("makeTranscriptSectionDomId", () => {
    it("uses canonical section-N format", () => {
      expect(makeTranscriptSectionDomId(42)).toBe("section-42");
    });
  });

  describe("quote-bank section ids", () => {
    it("converts §N to section-N DOM ids", () => {
      expect(quoteBankDomIdFromSectionId("§12")).toBe("section-12");
      expect(quoteBankDomIdFromSectionId("  §12-3  ")).toBe("section-12-3");
    });

    it("rejects non-§ section ids", () => {
      expect(() => quoteBankDomIdFromSectionId("12")).toThrow(/Invalid quote-bank section id/);
    });

    it("converts section-N DOM ids back to §N", () => {
      expect(quoteBankSectionIdFromDomId("section-12")).toBe("§12");
      expect(quoteBankSectionIdFromDomId("  section-12-3 ")).toBe("§12-3");
    });

    it("rejects non-section DOM ids", () => {
      expect(() => quoteBankSectionIdFromDomId("§12")).toThrow(/Invalid quote-bank dom id/);
    });
  });

  describe("makeDistillationSectionDomId", () => {
    it("uses slugified title when available", () => {
      expect(makeDistillationSectionDomId({ title: "Some Heading", index: 5 })).toBe(
        "some-heading",
      );
    });

    it("falls back to section-{index} when title has no slug", () => {
      expect(makeDistillationSectionDomId({ title: "   ---   ", index: 7 })).toBe("section-7");
    });

    it("prefixes with part number when provided", () => {
      expect(makeDistillationSectionDomId({ title: "Intro", partNumber: 2, index: 0 })).toBe(
        "part-2-intro",
      );
      expect(makeDistillationSectionDomId({ title: "   ---   ", partNumber: 3, index: 1 })).toBe(
        "part-3-section-1",
      );
    });
  });
});
