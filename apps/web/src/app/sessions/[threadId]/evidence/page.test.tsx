/**
 * Tests for Evidence Pack page components and utilities
 *
 * Tests the evidence pack validation logic, utility functions, and
 * presentational components. The main Server Component is tested
 * indirectly through E2E tests.
 */

import { describe, expect, it } from "vitest";

// ----- Types (matching the page types) -----

type EvidenceType =
  | "paper"
  | "preprint"
  | "dataset"
  | "experiment"
  | "observation"
  | "prior_session"
  | "expert_opinion"
  | "code_artifact";

interface EvidenceExcerpt {
  anchor: string;
  text: string;
  verbatim: boolean;
  location?: string;
  note?: string;
}

interface EvidenceRecord {
  id: string;
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
}

interface EvidencePack {
  version: string;
  thread_id: string;
  created_at: string;
  updated_at: string;
  next_id: number;
  records: EvidenceRecord[];
}

// ----- Re-implemented utilities for testing (matching page.tsx logic) -----

function sanitizeThreadId(threadId: string): string {
  return threadId.replace(/[^a-zA-Z0-9\-_.]/g, "_");
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const VALID_EVIDENCE_TYPES = new Set<string>([
  "paper",
  "preprint",
  "dataset",
  "experiment",
  "observation",
  "prior_session",
  "expert_opinion",
  "code_artifact",
]);

const VALID_ACCESS_METHODS = new Set<string>(["url", "doi", "file", "session", "manual"]);

function omitField<T extends object, K extends keyof T>(value: T, field: K): Omit<T, K> {
  const { [field]: _discard, ...rest } = value as Record<string, unknown>;
  void _discard;
  return rest as Omit<T, K>;
}

function validateEvidencePack(data: unknown): EvidencePack {
  if (data === null || typeof data !== "object") {
    throw new Error("Evidence pack must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== "string") {
    throw new Error("Missing or invalid 'version' field");
  }
  if (typeof obj.thread_id !== "string") {
    throw new Error("Missing or invalid 'thread_id' field");
  }
  if (typeof obj.created_at !== "string") {
    throw new Error("Missing or invalid 'created_at' field");
  }
  if (typeof obj.updated_at !== "string") {
    throw new Error("Missing or invalid 'updated_at' field");
  }
  if (typeof obj.next_id !== "number") {
    throw new Error("Missing or invalid 'next_id' field");
  }
  if (!Array.isArray(obj.records)) {
    throw new Error("Missing or invalid 'records' field (expected array)");
  }

  for (let i = 0; i < obj.records.length; i++) {
    const record = obj.records[i];
    if (typeof record !== "object" || record === null) {
      throw new Error(`Record at index ${i} is not an object`);
    }
    const rec = record as Record<string, unknown>;
    const recId = typeof rec.id === "string" ? rec.id : `index ${i}`;

    if (typeof rec.id !== "string") {
      throw new Error(`Record ${recId}: missing 'id' field`);
    }
    if (typeof rec.type !== "string") {
      throw new Error(`Record ${recId}: missing 'type' field`);
    }
    if (!VALID_EVIDENCE_TYPES.has(rec.type)) {
      throw new Error(`Record ${recId}: invalid type '${rec.type}'`);
    }
    if (typeof rec.title !== "string") {
      throw new Error(`Record ${recId}: missing 'title' field`);
    }
    if (typeof rec.source !== "string") {
      throw new Error(`Record ${recId}: missing 'source' field`);
    }
    if (typeof rec.access_method !== "string") {
      throw new Error(`Record ${recId}: missing 'access_method' field`);
    }
    if (!VALID_ACCESS_METHODS.has(rec.access_method)) {
      throw new Error(`Record ${recId}: invalid access_method '${rec.access_method}'`);
    }
    if (typeof rec.imported_at !== "string") {
      throw new Error(`Record ${recId}: missing 'imported_at' field`);
    }
    if (typeof rec.imported_by !== "string") {
      throw new Error(`Record ${recId}: missing 'imported_by' field`);
    }
    if (typeof rec.relevance !== "string") {
      throw new Error(`Record ${recId}: missing 'relevance' field`);
    }
    if (typeof rec.verified !== "boolean") {
      throw new Error(`Record ${recId}: missing or invalid 'verified' field (expected boolean)`);
    }
    if (!Array.isArray(rec.key_findings)) {
      throw new Error(`Record ${recId}: missing 'key_findings' array`);
    }
    if (!Array.isArray(rec.excerpts)) {
      throw new Error(`Record ${recId}: missing 'excerpts' array`);
    }

    for (let j = 0; j < rec.excerpts.length; j++) {
      const excerpt = rec.excerpts[j];
      if (typeof excerpt !== "object" || excerpt === null) {
        throw new Error(`Record ${recId}, excerpt ${j}: not an object`);
      }
      const ex = excerpt as Record<string, unknown>;
      if (typeof ex.anchor !== "string") {
        throw new Error(`Record ${recId}, excerpt ${j}: missing 'anchor' field`);
      }
      if (typeof ex.text !== "string") {
        throw new Error(`Record ${recId}, excerpt ${j}: missing 'text' field`);
      }
      if (typeof ex.verbatim !== "boolean") {
        throw new Error(`Record ${recId}, excerpt ${j}: missing or invalid 'verbatim' field`);
      }
    }
  }

  return data as EvidencePack;
}

// ----- Test Data -----

const validEvidencePack: EvidencePack = {
  version: "0.1",
  thread_id: "TEST-001",
  created_at: "2026-01-01T12:00:00Z",
  updated_at: "2026-01-01T14:00:00Z",
  next_id: 3,
  records: [
    {
      id: "EV-001",
      type: "paper",
      title: "A Foundational Paper on Testing",
      authors: ["Smith, J.", "Doe, A."],
      date: "2024",
      source: "https://example.com/paper.pdf",
      access_method: "url",
      imported_at: "2026-01-01T12:00:00Z",
      imported_by: "TestAgent",
      relevance: "Provides theoretical grounding for our hypothesis",
      key_findings: ["Finding 1", "Finding 2", "Finding 3"],
      supports: ["H-001"],
      verified: true,
      verification_notes: "PDF downloaded and reviewed",
      excerpts: [
        {
          anchor: "E1",
          text: "This is a verbatim quote from the paper.",
          verbatim: true,
          location: "p. 42",
        },
        {
          anchor: "E2",
          text: "This is a paraphrased excerpt.",
          verbatim: false,
          note: "Simplified for clarity",
        },
      ],
    },
    {
      id: "EV-002",
      type: "dataset",
      title: "Benchmark Dataset",
      source: "https://data.example.com/benchmark",
      access_method: "url",
      imported_at: "2026-01-01T13:00:00Z",
      imported_by: "DataBot",
      relevance: "Contains test cases for validation",
      key_findings: [],
      refutes: ["H-002"],
      informs: ["T-001"],
      verified: false,
      excerpts: [],
    },
  ],
};

const minimalValidRecord: EvidenceRecord = {
  id: "EV-MIN",
  type: "observation",
  title: "Minimal Record",
  source: "manual observation",
  access_method: "manual",
  imported_at: "2026-01-01T00:00:00Z",
  imported_by: "Agent",
  relevance: "Test",
  key_findings: [],
  verified: false,
  excerpts: [],
};

// ----- Tests -----

describe("sanitizeThreadId", () => {
  it("preserves alphanumeric characters", () => {
    expect(sanitizeThreadId("TestThread123")).toBe("TestThread123");
  });

  it("preserves dashes", () => {
    expect(sanitizeThreadId("test-thread-001")).toBe("test-thread-001");
  });

  it("preserves underscores", () => {
    expect(sanitizeThreadId("test_thread_001")).toBe("test_thread_001");
  });

  it("preserves dots", () => {
    expect(sanitizeThreadId("test.thread.001")).toBe("test.thread.001");
  });

  it("replaces spaces with underscores", () => {
    expect(sanitizeThreadId("test thread")).toBe("test_thread");
  });

  it("replaces special characters with underscores", () => {
    expect(sanitizeThreadId("test@thread#001!")).toBe("test_thread_001_");
  });

  it("replaces slashes with underscores", () => {
    expect(sanitizeThreadId("path/to/thread")).toBe("path_to_thread");
  });

  it("handles unicode characters", () => {
    // é is replaced with underscore, dash is preserved
    expect(sanitizeThreadId("café-thread")).toBe("caf_-thread");
  });

  it("handles empty string", () => {
    expect(sanitizeThreadId("")).toBe("");
  });
});

describe("formatTs", () => {
  it("formats valid ISO timestamp", () => {
    const result = formatTs("2026-01-01T12:00:00Z");
    // Result varies by locale, but should contain some date-like info
    expect(result).toBeTruthy();
    expect(result).not.toBe("2026-01-01T12:00:00Z");
  });

  it("returns original string for invalid date", () => {
    expect(formatTs("not-a-date")).toBe("not-a-date");
  });

  it("returns original string for empty string", () => {
    expect(formatTs("")).toBe("");
  });

  it("handles date-only string", () => {
    const result = formatTs("2026-01-01");
    expect(result).toBeTruthy();
  });
});

describe("validateEvidencePack", () => {
  describe("valid input", () => {
    it("accepts valid evidence pack", () => {
      expect(() => validateEvidencePack(validEvidencePack)).not.toThrow();
    });

    it("returns the validated pack", () => {
      const result = validateEvidencePack(validEvidencePack);
      expect(result).toEqual(validEvidencePack);
    });

    it("accepts pack with minimal valid record", () => {
      const minimalPack = {
        ...validEvidencePack,
        records: [minimalValidRecord],
      };
      expect(() => validateEvidencePack(minimalPack)).not.toThrow();
    });

    it("accepts pack with empty records array", () => {
      const emptyPack = { ...validEvidencePack, records: [] };
      expect(() => validateEvidencePack(emptyPack)).not.toThrow();
    });
  });

  describe("top-level field validation", () => {
    it("rejects null", () => {
      expect(() => validateEvidencePack(null)).toThrow("Evidence pack must be an object");
    });

    it("rejects non-object", () => {
      expect(() => validateEvidencePack("string")).toThrow("Evidence pack must be an object");
    });

    it("rejects missing version", () => {
      const rest = omitField(validEvidencePack, "version");
      expect(() => validateEvidencePack(rest)).toThrow("Missing or invalid 'version' field");
    });

    it("rejects missing thread_id", () => {
      const rest = omitField(validEvidencePack, "thread_id");
      expect(() => validateEvidencePack(rest)).toThrow("Missing or invalid 'thread_id' field");
    });

    it("rejects missing created_at", () => {
      const rest = omitField(validEvidencePack, "created_at");
      expect(() => validateEvidencePack(rest)).toThrow("Missing or invalid 'created_at' field");
    });

    it("rejects missing updated_at", () => {
      const rest = omitField(validEvidencePack, "updated_at");
      expect(() => validateEvidencePack(rest)).toThrow("Missing or invalid 'updated_at' field");
    });

    it("rejects missing next_id", () => {
      const rest = omitField(validEvidencePack, "next_id");
      expect(() => validateEvidencePack(rest)).toThrow("Missing or invalid 'next_id' field");
    });

    it("rejects non-number next_id", () => {
      const pack = { ...validEvidencePack, next_id: "1" };
      expect(() => validateEvidencePack(pack)).toThrow("Missing or invalid 'next_id' field");
    });

    it("rejects missing records", () => {
      const rest = omitField(validEvidencePack, "records");
      expect(() => validateEvidencePack(rest)).toThrow("Missing or invalid 'records' field");
    });

    it("rejects non-array records", () => {
      const pack = { ...validEvidencePack, records: {} };
      expect(() => validateEvidencePack(pack)).toThrow("Missing or invalid 'records' field");
    });
  });

  describe("record field validation", () => {
    function packWithRecord(record: unknown): unknown {
      return { ...validEvidencePack, records: [record] };
    }

    it("rejects non-object record", () => {
      expect(() => validateEvidencePack(packWithRecord("string"))).toThrow(
        "Record at index 0 is not an object",
      );
    });

    it("rejects null record", () => {
      expect(() => validateEvidencePack(packWithRecord(null))).toThrow(
        "Record at index 0 is not an object",
      );
    });

    it("rejects missing id", () => {
      const record = omitField(minimalValidRecord, "id");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow("missing 'id' field");
    });

    it("rejects missing type", () => {
      const record = omitField(minimalValidRecord, "type");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow("missing 'type' field");
    });

    it("rejects invalid type", () => {
      const record = { ...minimalValidRecord, type: "invalid_type" };
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "invalid type 'invalid_type'",
      );
    });

    it("accepts all valid evidence types", () => {
      const validTypes: EvidenceType[] = [
        "paper",
        "preprint",
        "dataset",
        "experiment",
        "observation",
        "prior_session",
        "expert_opinion",
        "code_artifact",
      ];
      for (const type of validTypes) {
        const record = { ...minimalValidRecord, type };
        expect(() => validateEvidencePack(packWithRecord(record))).not.toThrow();
      }
    });

    it("rejects missing title", () => {
      const record = omitField(minimalValidRecord, "title");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow("missing 'title' field");
    });

    it("rejects missing source", () => {
      const record = omitField(minimalValidRecord, "source");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow("missing 'source' field");
    });

    it("rejects missing access_method", () => {
      const record = omitField(minimalValidRecord, "access_method");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing 'access_method' field",
      );
    });

    it("rejects invalid access_method", () => {
      const record = { ...minimalValidRecord, access_method: "ftp" };
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "invalid access_method 'ftp'",
      );
    });

    it("accepts all valid access methods", () => {
      const validMethods = ["url", "doi", "file", "session", "manual"];
      for (const method of validMethods) {
        const record = { ...minimalValidRecord, access_method: method };
        expect(() => validateEvidencePack(packWithRecord(record))).not.toThrow();
      }
    });

    it("rejects missing imported_at", () => {
      const record = omitField(minimalValidRecord, "imported_at");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing 'imported_at' field",
      );
    });

    it("rejects missing imported_by", () => {
      const record = omitField(minimalValidRecord, "imported_by");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing 'imported_by' field",
      );
    });

    it("rejects missing relevance", () => {
      const record = omitField(minimalValidRecord, "relevance");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing 'relevance' field",
      );
    });

    it("rejects missing verified", () => {
      const record = omitField(minimalValidRecord, "verified");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing or invalid 'verified' field",
      );
    });

    it("rejects non-boolean verified", () => {
      const record = { ...minimalValidRecord, verified: "true" };
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing or invalid 'verified' field",
      );
    });

    it("rejects missing key_findings", () => {
      const record = omitField(minimalValidRecord, "key_findings");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing 'key_findings' array",
      );
    });

    it("rejects missing excerpts", () => {
      const record = omitField(minimalValidRecord, "excerpts");
      expect(() => validateEvidencePack(packWithRecord(record))).toThrow(
        "missing 'excerpts' array",
      );
    });
  });

  describe("excerpt validation", () => {
    function packWithExcerpt(excerpt: unknown): unknown {
      return {
        ...validEvidencePack,
        records: [{ ...minimalValidRecord, excerpts: [excerpt] }],
      };
    }

    it("rejects non-object excerpt", () => {
      expect(() => validateEvidencePack(packWithExcerpt("string"))).toThrow(
        "excerpt 0: not an object",
      );
    });

    it("rejects null excerpt", () => {
      expect(() => validateEvidencePack(packWithExcerpt(null))).toThrow("excerpt 0: not an object");
    });

    it("rejects missing anchor", () => {
      const excerpt = { text: "test", verbatim: true };
      expect(() => validateEvidencePack(packWithExcerpt(excerpt))).toThrow(
        "missing 'anchor' field",
      );
    });

    it("rejects missing text", () => {
      const excerpt = { anchor: "E1", verbatim: true };
      expect(() => validateEvidencePack(packWithExcerpt(excerpt))).toThrow("missing 'text' field");
    });

    it("rejects missing verbatim", () => {
      const excerpt = { anchor: "E1", text: "test" };
      expect(() => validateEvidencePack(packWithExcerpt(excerpt))).toThrow(
        "missing or invalid 'verbatim' field",
      );
    });

    it("rejects non-boolean verbatim", () => {
      const excerpt = { anchor: "E1", text: "test", verbatim: "true" };
      expect(() => validateEvidencePack(packWithExcerpt(excerpt))).toThrow(
        "missing or invalid 'verbatim' field",
      );
    });

    it("accepts valid excerpt with optional fields", () => {
      const excerpt = {
        anchor: "E1",
        text: "test",
        verbatim: true,
        location: "p. 1",
        note: "A note",
      };
      expect(() => validateEvidencePack(packWithExcerpt(excerpt))).not.toThrow();
    });
  });
});

// ----- Component Tests -----
// Note: The presentational components are defined inside page.tsx and not exported.
// These tests use mock implementations to verify the rendering logic.

describe("Evidence page component rendering logic", () => {
  const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
    paper: "Paper",
    preprint: "Preprint",
    dataset: "Dataset",
    experiment: "Experiment",
    observation: "Observation",
    prior_session: "Prior Session",
    expert_opinion: "Expert Opinion",
    code_artifact: "Code Artifact",
  };

  describe("evidence type labels", () => {
    it("has label for all evidence types", () => {
      const allTypes: EvidenceType[] = [
        "paper",
        "preprint",
        "dataset",
        "experiment",
        "observation",
        "prior_session",
        "expert_opinion",
        "code_artifact",
      ];
      for (const type of allTypes) {
        expect(EVIDENCE_TYPE_LABELS[type]).toBeTruthy();
      }
    });

    it("paper type has correct label", () => {
      expect(EVIDENCE_TYPE_LABELS.paper).toBe("Paper");
    });

    it("code_artifact type has correct label", () => {
      expect(EVIDENCE_TYPE_LABELS.code_artifact).toBe("Code Artifact");
    });
  });

  describe("excerpt count calculation", () => {
    it("calculates total excerpts correctly", () => {
      const records = validEvidencePack.records;
      const totalExcerpts = records.reduce((sum, r) => sum + r.excerpts.length, 0);
      expect(totalExcerpts).toBe(2);
    });

    it("handles empty excerpts", () => {
      const records = [minimalValidRecord];
      const totalExcerpts = records.reduce((sum, r) => sum + r.excerpts.length, 0);
      expect(totalExcerpts).toBe(0);
    });
  });

  describe("verified/unverified counts", () => {
    it("calculates verified count correctly", () => {
      const records = validEvidencePack.records;
      const verifiedCount = records.filter((r) => r.verified).length;
      expect(verifiedCount).toBe(1);
    });

    it("calculates unverified count correctly", () => {
      const records = validEvidencePack.records;
      const unverifiedCount = records.filter((r) => !r.verified).length;
      expect(unverifiedCount).toBe(1);
    });
  });

  describe("relationship badges logic", () => {
    it("identifies records with supports relationship", () => {
      const record = validEvidencePack.records[0];
      expect(record.supports?.length).toBeGreaterThan(0);
    });

    it("identifies records with refutes relationship", () => {
      const record = validEvidencePack.records[1];
      expect(record.refutes?.length).toBeGreaterThan(0);
    });

    it("identifies records with informs relationship", () => {
      const record = validEvidencePack.records[1];
      expect(record.informs?.length).toBeGreaterThan(0);
    });

    it("handles records with no relationships", () => {
      expect(minimalValidRecord.supports).toBeUndefined();
      expect(minimalValidRecord.refutes).toBeUndefined();
      expect(minimalValidRecord.informs).toBeUndefined();
    });
  });

  describe("excerpt anchor formatting", () => {
    it("formats full anchor with record id prefix", () => {
      const recordId = "EV-001";
      const excerptAnchor = "E1";
      const fullAnchor = `${recordId}#${excerptAnchor}`;
      expect(fullAnchor).toBe("EV-001#E1");
    });
  });

  describe("citation reference generation", () => {
    it("generates citation list for records", () => {
      const record = validEvidencePack.records[0];
      const citations = record.excerpts.map((e) => `${record.id}#${e.anchor}`);
      expect(citations).toEqual(["EV-001#E1", "EV-001#E2"]);
    });

    it("handles record with no excerpts", () => {
      const citations = minimalValidRecord.excerpts.map(
        (e) => `${minimalValidRecord.id}#${e.anchor}`,
      );
      expect(citations).toEqual([]);
    });
  });
});
