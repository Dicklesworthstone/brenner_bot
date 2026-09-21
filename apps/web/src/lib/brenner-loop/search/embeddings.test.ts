/**
 * Tests for the embeddings module.
 *
 * @see brenner_bot-ukd1.1
 */

import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  EMBEDDING_DIMENSION,
  type EmbeddingEntry,
  embedText,
  findSimilar,
} from "./embeddings";

describe("embedText", () => {
  it("produces vectors of the correct dimension", () => {
    const embedding = embedText("Hello world");
    expect(embedding.length).toBe(EMBEDDING_DIMENSION);
  });

  it("produces normalized vectors (unit length)", () => {
    const embedding = embedText("Test normalization");
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it("produces deterministic embeddings", () => {
    const text = "The scientific method requires reproducibility";
    const embedding1 = embedText(text);
    const embedding2 = embedText(text);
    expect(embedding1).toEqual(embedding2);
  });

  it("produces different embeddings for different texts", () => {
    const embedding1 = embedText("Hypothesis testing");
    const embedding2 = embedText("Data visualization");
    expect(embedding1).not.toEqual(embedding2);
  });

  it("handles empty text gracefully", () => {
    const embedding = embedText("");
    expect(embedding.length).toBe(EMBEDDING_DIMENSION);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const vec = embedText("Test vector");
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
  });

  it("returns higher similarity for related texts", () => {
    const vec1 = embedText("Scientific hypothesis testing experimental design");
    const vec2 = embedText("Hypothesis experiment scientific method");
    const vec3 = embedText("Cooking recipes pasta Italian food");

    const sim12 = cosineSimilarity(vec1, vec2);
    const sim13 = cosineSimilarity(vec1, vec3);

    expect(sim12).toBeGreaterThan(sim13);
  });

  it("throws for mismatched dimensions", () => {
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0];

    expect(() => cosineSimilarity(vec1, vec2)).toThrow();
  });

  it("handles zero vectors", () => {
    const zeroVec = new Array(EMBEDDING_DIMENSION).fill(0);
    const otherVec = embedText("Test");

    expect(cosineSimilarity(zeroVec, otherVec)).toBe(0);
  });
});

describe("findSimilar", () => {
  const testEntries: EmbeddingEntry[] = [
    {
      id: "test-1",
      text: "Scientific hypothesis testing and experimental design",
      source: "transcript",
      section: 1,
      embedding: embedText("Scientific hypothesis testing and experimental design"),
    },
    {
      id: "test-2",
      text: "Cooking recipes and Italian pasta dishes",
      source: "transcript",
      section: 2,
      embedding: embedText("Cooking recipes and Italian pasta dishes"),
    },
    {
      id: "test-3",
      text: "Research methodology and empirical studies",
      source: "distillation",
      embedding: embedText("Research methodology and empirical studies"),
    },
  ];

  it("returns entries sorted by similarity", () => {
    const results = findSimilar("hypothesis experiment science", testEntries);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("test-1"); // Most similar to science query

    // Check that scores are in descending order
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("respects topK parameter", () => {
    const results = findSimilar("test query", testEntries, 2);
    expect(results.length).toBe(2);
  });

  it("accepts pre-computed embeddings as query", () => {
    const queryEmbedding = embedText("hypothesis experiment");
    const results = findSimilar(queryEmbedding, testEntries);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeDefined();
  });
});
