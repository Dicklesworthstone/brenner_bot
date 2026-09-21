import { describe, expect, it } from "vitest";
import { fetchCorpusDoc, fetchCorpusDocs, fetchCorpusList } from "./corpusActions";

describe("corpusActions", () => {
  it("fetchCorpusList returns a non-empty corpus list", async () => {
    const docs = await fetchCorpusList();
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBeGreaterThan(0);
  });

  it("fetchCorpusDoc returns doc + content", async () => {
    const { doc, content } = await fetchCorpusDoc("transcript");
    expect(doc.id).toBe("transcript");
    expect(typeof content).toBe("string");
    expect(content.length).toBeGreaterThan(1000);
  });

  it("fetchCorpusDocs batch-fetches multiple docs", async () => {
    const results = await fetchCorpusDocs(["metaprompt", "initial-metaprompt"]);
    expect(results).toHaveLength(2);
    expect(results[0]?.doc.id).toBe("metaprompt");
    expect(results[1]?.doc.id).toBe("initial-metaprompt");
    expect(results.every((r) => typeof r.content === "string" && r.content.length > 10)).toBe(true);
  });
});
