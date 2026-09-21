/**
 * Unit tests for evidence pack parsing and rendering
 *
 * Tests the core evidence pack logic:
 * - ID formatting (EV-001, EV-002, etc.)
 * - Access method inference from source URLs
 * - Markdown rendering (deterministic output)
 * - Anchor stability (same input → same output)
 *
 * Philosophy: NO mocks - test pure function behavior directly.
 */

import { describe, expect, it } from "vitest";

// =============================================================================
// Types (extracted from brenner.ts for testing)
// =============================================================================

type EvidenceType =
  | "paper"
  | "preprint"
  | "dataset"
  | "experiment"
  | "observation"
  | "prior_session"
  | "expert_opinion"
  | "code_artifact";

type EvidenceExcerpt = {
  anchor: string; // E1, E2, etc.
  text: string;
  verbatim: boolean;
  location?: string;
  note?: string;
};

type EvidenceRecord = {
  id: string; // EV-001, EV-002, etc.
  type: EvidenceType;
  title: string;
  authors?: string[];
  date?: string;
  source: string;
  access_method: "url" | "doi" | "file" | "session" | "manual";
  imported_at: string;
  imported_by: string;
  relevance: string;
  key_findings: string[];
  supports?: string[];
  refutes?: string[];
  informs?: string[];
  verified: boolean;
  verification_notes?: string;
  excerpts: EvidenceExcerpt[];
};

type EvidencePack = {
  version: "0.1";
  thread_id: string;
  created_at: string;
  updated_at: string;
  next_id: number;
  records: EvidenceRecord[];
};

// =============================================================================
// Functions under test (extracted from brenner.ts)
// =============================================================================

/**
 * Formats a numeric ID to the EV-NNN format (e.g., 1 → "EV-001")
 */
function formatEvidenceId(n: number): string {
  return `EV-${String(n).padStart(3, "0")}`;
}

/**
 * Infers access method from source string
 */
function inferAccessMethod(source: string): EvidenceRecord["access_method"] {
  if (source.startsWith("doi:") || source.startsWith("https://doi.org/")) return "doi";
  if (source.startsWith("http://") || source.startsWith("https://")) return "url";
  if (source.startsWith("file://") || source.startsWith("/") || source.startsWith("./"))
    return "file";
  if (source.startsWith("session://")) return "session";
  return "manual";
}

/**
 * Escapes pipe and newline characters for markdown tables
 */
function escapeTableValue(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/**
 * Renders an evidence pack to markdown format
 */
function renderEvidenceMd(pack: EvidencePack): string {
  const lines: string[] = [];
  lines.push(`# Evidence Pack: ${pack.thread_id}`);
  lines.push("");
  lines.push(`> Created: ${pack.created_at}`);
  lines.push(`> Updated: ${pack.updated_at}`);
  lines.push(`> Records: ${pack.records.length}`);
  lines.push("");
  lines.push("---");

  for (const rec of pack.records) {
    lines.push("");
    lines.push(`## ${rec.id}: ${escapeTableValue(rec.title)}`);
    lines.push("");
    lines.push("| Field | Value |");
    lines.push("|-------|-------|");
    lines.push(`| Type | ${rec.type} |`);
    if (rec.authors?.length)
      lines.push(`| Authors | ${escapeTableValue(rec.authors.join("; "))} |`);
    if (rec.date) lines.push(`| Date | ${escapeTableValue(rec.date)} |`);
    lines.push(`| Source | ${escapeTableValue(rec.source)} |`);
    lines.push(
      `| Verified | ${rec.verified ? `Yes${rec.verification_notes ? ` (${escapeTableValue(rec.verification_notes)})` : ""}` : "No"} |`,
    );
    if (rec.supports?.length)
      lines.push(`| Supports | ${escapeTableValue(rec.supports.join(", "))} |`);
    if (rec.refutes?.length)
      lines.push(`| Refutes | ${escapeTableValue(rec.refutes.join(", "))} |`);
    if (rec.informs?.length)
      lines.push(`| Informs | ${escapeTableValue(rec.informs.join(", "))} |`);
    lines.push("");
    lines.push(`**Relevance**: ${rec.relevance}`);
    lines.push("");
    if (rec.key_findings.length > 0) {
      lines.push("**Key Findings**:");
      for (const finding of rec.key_findings) {
        lines.push(`- ${finding}`);
      }
      lines.push("");
    }
    if (rec.excerpts.length > 0) {
      lines.push("### Excerpts");
      lines.push("");
      for (const ex of rec.excerpts) {
        const loc = ex.location ? `, ${ex.location}` : "";
        const type = ex.verbatim ? "verbatim" : "paraphrased";
        lines.push(`**${rec.id}#${ex.anchor}** (${type}${loc}):`);
        // Handle multi-line text by prefixing each line with >
        const textLines = ex.text.split("\n");
        for (const textLine of textLines) {
          lines.push(`> ${textLine}`);
        }
        if (ex.note) {
          lines.push(`>`);
          // Handle multi-line notes too
          const noteLines = ex.note.split("\n");
          for (const noteLine of noteLines) {
            lines.push(`> *${noteLine}*`);
          }
        }
        lines.push("");
      }
    }
    lines.push("---");
  }

  return lines.join("\n");
}

// =============================================================================
// Tests
// =============================================================================

describe("Evidence Pack - ID Formatting", () => {
  describe("formatEvidenceId()", () => {
    it("formats single digit to EV-00N", () => {
      expect(formatEvidenceId(1)).toBe("EV-001");
      expect(formatEvidenceId(5)).toBe("EV-005");
      expect(formatEvidenceId(9)).toBe("EV-009");
    });

    it("formats double digit to EV-0NN", () => {
      expect(formatEvidenceId(10)).toBe("EV-010");
      expect(formatEvidenceId(42)).toBe("EV-042");
      expect(formatEvidenceId(99)).toBe("EV-099");
    });

    it("formats triple digit to EV-NNN", () => {
      expect(formatEvidenceId(100)).toBe("EV-100");
      expect(formatEvidenceId(123)).toBe("EV-123");
      expect(formatEvidenceId(999)).toBe("EV-999");
    });

    it("handles numbers beyond 999", () => {
      expect(formatEvidenceId(1000)).toBe("EV-1000");
      expect(formatEvidenceId(9999)).toBe("EV-9999");
    });

    it("produces deterministic output for same input", () => {
      const first = formatEvidenceId(42);
      const second = formatEvidenceId(42);
      expect(first).toBe(second);
    });
  });
});

describe("Evidence Pack - Access Method Inference", () => {
  describe("inferAccessMethod()", () => {
    it("infers DOI from doi: prefix", () => {
      expect(inferAccessMethod("doi:10.1234/example")).toBe("doi");
      expect(inferAccessMethod("doi:10.1038/s41586-021-03819-2")).toBe("doi");
    });

    it("infers DOI from doi.org URL", () => {
      expect(inferAccessMethod("https://doi.org/10.1234/example")).toBe("doi");
      expect(inferAccessMethod("https://doi.org/10.1038/nature")).toBe("doi");
    });

    it("infers URL from http/https", () => {
      expect(inferAccessMethod("http://example.com/paper.pdf")).toBe("url");
      expect(inferAccessMethod("https://arxiv.org/abs/2301.12345")).toBe("url");
      expect(inferAccessMethod("https://github.com/user/repo")).toBe("url");
    });

    it("infers file from file:// prefix", () => {
      expect(inferAccessMethod("file://data/results.json")).toBe("file");
      expect(inferAccessMethod("file:///absolute/path/data.csv")).toBe("file");
    });

    it("infers file from absolute path", () => {
      expect(inferAccessMethod("/data/results.json")).toBe("file");
      expect(inferAccessMethod("/home/user/documents/paper.pdf")).toBe("file");
    });

    it("infers file from relative path", () => {
      expect(inferAccessMethod("./data/results.json")).toBe("file");
      expect(inferAccessMethod("./benchmarks/test.csv")).toBe("file");
    });

    it("infers session from session:// prefix", () => {
      expect(inferAccessMethod("session://RS-20251228-initial")).toBe("session");
      expect(inferAccessMethod("session://brenner_bot-5so.10")).toBe("session");
    });

    it("defaults to manual for unknown formats", () => {
      expect(inferAccessMethod("personal communication")).toBe("manual");
      expect(inferAccessMethod("Smith et al. 2024")).toBe("manual");
      expect(inferAccessMethod("internal memo #42")).toBe("manual");
    });
  });
});

describe("Evidence Pack - Table Value Escaping", () => {
  describe("escapeTableValue()", () => {
    it("escapes pipe characters", () => {
      expect(escapeTableValue("foo | bar")).toBe("foo \\| bar");
      expect(escapeTableValue("a|b|c")).toBe("a\\|b\\|c");
    });

    it("replaces newlines with spaces", () => {
      expect(escapeTableValue("line1\nline2")).toBe("line1 line2");
      expect(escapeTableValue("a\nb\nc")).toBe("a b c");
    });

    it("handles combined pipes and newlines", () => {
      expect(escapeTableValue("foo | bar\nbaz | qux")).toBe("foo \\| bar baz \\| qux");
    });

    it("leaves regular text unchanged", () => {
      expect(escapeTableValue("normal text")).toBe("normal text");
      expect(escapeTableValue("Smith, J.; Jones, A.")).toBe("Smith, J.; Jones, A.");
    });
  });
});

describe("Evidence Pack - Markdown Rendering", () => {
  const baseTimestamp = "2025-12-31T12:00:00.000Z";

  function createBasePack(overrides?: Partial<EvidencePack>): EvidencePack {
    return {
      version: "0.1",
      thread_id: "RS-20251231-test",
      created_at: baseTimestamp,
      updated_at: baseTimestamp,
      next_id: 1,
      records: [],
      ...overrides,
    };
  }

  function createBaseRecord(overrides?: Partial<EvidenceRecord>): EvidenceRecord {
    return {
      id: "EV-001",
      type: "paper",
      title: "Test Paper",
      source: "doi:10.1234/test",
      access_method: "doi",
      imported_at: baseTimestamp,
      imported_by: "operator",
      relevance: "Test relevance",
      key_findings: [],
      verified: false,
      excerpts: [],
      ...overrides,
    };
  }

  describe("renderEvidenceMd() - Header", () => {
    it("includes thread ID in title", () => {
      const pack = createBasePack({ thread_id: "MY-THREAD-ID" });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("# Evidence Pack: MY-THREAD-ID");
    });

    it("includes created/updated timestamps", () => {
      const pack = createBasePack({
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T12:00:00Z",
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("> Created: 2025-01-01T00:00:00Z");
      expect(md).toContain("> Updated: 2025-01-02T12:00:00Z");
    });

    it("includes record count", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ id: "EV-001" }), createBaseRecord({ id: "EV-002" })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("> Records: 2");
    });
  });

  describe("renderEvidenceMd() - Records", () => {
    it("renders record heading with ID and title", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ id: "EV-001", title: "Important Paper" })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("## EV-001: Important Paper");
    });

    it("escapes pipes in titles", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ title: "Analysis | Results" })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("## EV-001: Analysis \\| Results");
    });

    it("renders type field", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ type: "dataset" })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("| Type | dataset |");
    });

    it("renders authors when present", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ authors: ["Smith, J.", "Jones, A."] })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("| Authors | Smith, J.; Jones, A. |");
    });

    it("omits authors when not present", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ authors: undefined })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).not.toContain("| Authors |");
    });

    it("renders verified status", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ verified: true })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("| Verified | Yes |");
    });

    it("renders verification notes when present", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ verified: true, verification_notes: "Peer-reviewed" })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("| Verified | Yes (Peer-reviewed) |");
    });

    it("renders supports/refutes/informs arrays", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            supports: ["H1", "H2"],
            refutes: ["H3"],
            informs: ["T1"],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("| Supports | H1, H2 |");
      expect(md).toContain("| Refutes | H3 |");
      expect(md).toContain("| Informs | T1 |");
    });

    it("renders relevance", () => {
      const pack = createBasePack({
        records: [createBaseRecord({ relevance: "Critical for hypothesis validation" })],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("**Relevance**: Critical for hypothesis validation");
    });

    it("renders key findings as bullet list", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            key_findings: ["Finding one", "Finding two", "Finding three"],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("**Key Findings**:");
      expect(md).toContain("- Finding one");
      expect(md).toContain("- Finding two");
      expect(md).toContain("- Finding three");
    });
  });

  describe("renderEvidenceMd() - Excerpts", () => {
    it("renders excerpt with anchor ID", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            excerpts: [{ anchor: "E1", text: "Excerpt text", verbatim: true }],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("**EV-001#E1** (verbatim):");
    });

    it("indicates paraphrased excerpts", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            excerpts: [{ anchor: "E1", text: "Paraphrased text", verbatim: false }],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("**EV-001#E1** (paraphrased):");
    });

    it("includes location when present", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            excerpts: [{ anchor: "E1", text: "Text", verbatim: true, location: "p. 42" }],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("**EV-001#E1** (verbatim, p. 42):");
    });

    it("renders excerpt text as blockquote", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            excerpts: [{ anchor: "E1", text: "The key insight is X.", verbatim: true }],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("> The key insight is X.");
    });

    it("handles multi-line excerpt text", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            excerpts: [{ anchor: "E1", text: "Line one.\nLine two.", verbatim: true }],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("> Line one.");
      expect(md).toContain("> Line two.");
    });

    it("renders excerpt notes in italics", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            excerpts: [{ anchor: "E1", text: "Text", verbatim: false, note: "Important note" }],
          }),
        ],
      });
      const md = renderEvidenceMd(pack);
      expect(md).toContain("> *Important note*");
    });
  });

  describe("renderEvidenceMd() - Determinism", () => {
    it("produces identical output for identical input", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            id: "EV-001",
            title: "Test",
            key_findings: ["A", "B"],
            excerpts: [{ anchor: "E1", text: "Quote", verbatim: true }],
          }),
        ],
      });

      const first = renderEvidenceMd(pack);
      const second = renderEvidenceMd(pack);

      expect(first).toBe(second);
    });

    it("preserves record order", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({ id: "EV-001", title: "First" }),
          createBaseRecord({ id: "EV-002", title: "Second" }),
          createBaseRecord({ id: "EV-003", title: "Third" }),
        ],
      });

      const md = renderEvidenceMd(pack);
      const firstIdx = md.indexOf("EV-001");
      const secondIdx = md.indexOf("EV-002");
      const thirdIdx = md.indexOf("EV-003");

      expect(firstIdx).toBeLessThan(secondIdx);
      expect(secondIdx).toBeLessThan(thirdIdx);
    });

    it("preserves excerpt order within record", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            excerpts: [
              { anchor: "E1", text: "First", verbatim: true },
              { anchor: "E2", text: "Second", verbatim: true },
              { anchor: "E3", text: "Third", verbatim: true },
            ],
          }),
        ],
      });

      const md = renderEvidenceMd(pack);
      const e1Idx = md.indexOf("EV-001#E1");
      const e2Idx = md.indexOf("EV-001#E2");
      const e3Idx = md.indexOf("EV-001#E3");

      expect(e1Idx).toBeLessThan(e2Idx);
      expect(e2Idx).toBeLessThan(e3Idx);
    });
  });

  describe("renderEvidenceMd() - Anchor Stability", () => {
    it("uses stable anchor format EV-NNN#EN", () => {
      const pack = createBasePack({
        records: [
          createBaseRecord({
            id: "EV-042",
            excerpts: [
              { anchor: "E1", text: "First", verbatim: true },
              { anchor: "E12", text: "Twelfth", verbatim: true },
            ],
          }),
        ],
      });

      const md = renderEvidenceMd(pack);
      expect(md).toContain("**EV-042#E1**");
      expect(md).toContain("**EV-042#E12**");
    });

    it("anchors are predictable from record ID and excerpt anchor", () => {
      const record = createBaseRecord({
        id: "EV-007",
        excerpts: [{ anchor: "E3", text: "Text", verbatim: true }],
      });

      const expectedAnchor = `**${record.id}#${record.excerpts[0].anchor}**`;
      const pack = createBasePack({ records: [record] });
      const md = renderEvidenceMd(pack);

      expect(md).toContain(expectedAnchor);
    });
  });
});

describe("Evidence Pack - Full Integration", () => {
  it("renders a complete evidence pack correctly", () => {
    const pack: EvidencePack = {
      version: "0.1",
      thread_id: "RS-20251230-bio-rrp",
      created_at: "2025-12-30T19:00:00Z",
      updated_at: "2025-12-30T20:30:00Z",
      next_id: 4,
      records: [
        {
          id: "EV-001",
          type: "paper",
          title: "Synaptic vesicle depletion dynamics",
          authors: ["Smith, J.", "Jones, A."],
          date: "2024-03-15",
          source: "doi:10.1234/neuro.2024.001",
          access_method: "doi",
          imported_at: "2025-12-30T19:05:00Z",
          imported_by: "operator",
          relevance: "Provides timescales for H1",
          key_findings: ["RRP follows exponential decay", "Recovery is activity-dependent"],
          supports: ["H1"],
          verified: true,
          verification_notes: "Peer-reviewed",
          excerpts: [
            {
              anchor: "E1",
              text: "Time constant of 487 +/- 32 ms",
              verbatim: true,
              location: "p. 4",
            },
          ],
        },
        {
          id: "EV-002",
          type: "dataset",
          title: "Synthetic benchmark v2",
          source: "file://benchmarks/synth.json",
          access_method: "file",
          imported_at: "2025-12-30T19:15:00Z",
          imported_by: "BlueLake",
          relevance: "Test stimuli for T5",
          key_findings: ["1000 stimulus pairs"],
          informs: ["T5"],
          verified: true,
          excerpts: [],
        },
      ],
    };

    const md = renderEvidenceMd(pack);

    // Header checks
    expect(md).toContain("# Evidence Pack: RS-20251230-bio-rrp");
    expect(md).toContain("> Records: 2");

    // First record
    expect(md).toContain("## EV-001: Synaptic vesicle depletion dynamics");
    expect(md).toContain("| Type | paper |");
    expect(md).toContain("| Authors | Smith, J.; Jones, A. |");
    expect(md).toContain("| Verified | Yes (Peer-reviewed) |");
    expect(md).toContain("| Supports | H1 |");
    expect(md).toContain("**EV-001#E1** (verbatim, p. 4):");
    expect(md).toContain("> Time constant of 487 +/- 32 ms");

    // Second record
    expect(md).toContain("## EV-002: Synthetic benchmark v2");
    expect(md).toContain("| Type | dataset |");
    expect(md).toContain("| Informs | T5 |");
  });
});
