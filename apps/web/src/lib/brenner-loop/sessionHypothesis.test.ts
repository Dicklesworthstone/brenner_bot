/**
 * Tests for Session-Hypothesis Containment Model
 *
 * @see brenner_bot-0lff (bead)
 * @module brenner-loop/sessionHypothesis.test
 */

import { describe, expect, it } from "vitest";
import type { HypothesisCard } from "./hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "./hypothesis";
import {
  addCompetingHypothesis,
  archiveHypothesis,
  findCommonAncestor,
  getActiveHypotheses,
  getAllHypothesisIds,
  getEvolutionChain,
  getHypothesisCard,
  getHypothesisCounts,
  getHypothesisState,
  getRelatedHypotheses,
  getSessionHypotheses,
  hasThirdAlternative,
  resolveCompetition,
  restoreHypothesis,
  setPrimaryHypothesis,
} from "./sessionHypothesis";
import type { Session } from "./types";
import { createSession } from "./types";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestHypothesis(
  sessionId: string,
  sequence: number,
  overrides: Partial<Parameters<typeof createHypothesisCard>[0]> = {},
): HypothesisCard {
  const id = generateHypothesisCardId(sessionId, sequence, 1);
  return createHypothesisCard({
    id,
    statement: `Test hypothesis ${sequence} - This is a detailed statement`,
    mechanism: `Mechanism ${sequence} - Via causal pathway X to Y`,
    domain: ["test"],
    predictionsIfTrue: [`Prediction ${sequence} - We would observe X`],
    impossibleIfTrue: [`Falsification ${sequence} - If we observe Y, this is wrong`],
    sessionId,
    ...overrides,
  });
}

function createTestSession(): Session {
  const session = createSession({
    id: "TEST-20260104-001",
    researchQuestion: "Test research question",
    domain: "testing",
  });

  // Add a primary hypothesis
  const primary = createTestHypothesis(session.id, 1);
  session.primaryHypothesisId = primary.id;
  session.hypothesisCards[primary.id] = primary;

  return session;
}

function createSessionWithMultipleHypotheses(): Session {
  const session = createTestSession();

  // Add alternatives
  const alt1 = createTestHypothesis(session.id, 2);
  const alt2 = createTestHypothesis(session.id, 3);

  session.alternativeHypothesisIds = [alt1.id, alt2.id];
  session.hypothesisCards[alt1.id] = alt1;
  session.hypothesisCards[alt2.id] = alt2;

  // Add an archived hypothesis
  const archived = createTestHypothesis(session.id, 4);
  session.archivedHypothesisIds = [archived.id];
  session.hypothesisCards[archived.id] = archived;

  return session;
}

// ============================================================================
// Query Function Tests
// ============================================================================

describe("getSessionHypotheses", () => {
  it("should return the hypotheses structure", () => {
    const session = createSessionWithMultipleHypotheses();
    const result = getSessionHypotheses(session);

    expect(result.primary).toBe(session.primaryHypothesisId);
    expect(result.alternatives).toEqual(session.alternativeHypothesisIds);
    expect(result.archived).toEqual(session.archivedHypothesisIds);
  });
});

describe("getAllHypothesisIds", () => {
  it("should return all hypothesis IDs", () => {
    const session = createSessionWithMultipleHypotheses();
    const result = getAllHypothesisIds(session);

    expect(result).toContain(session.primaryHypothesisId);
    expect(result).toContain(session.alternativeHypothesisIds[0]);
    expect(result).toContain(session.alternativeHypothesisIds[1]);
    expect(result).toContain(session.archivedHypothesisIds[0]);
    expect(result).toHaveLength(4);
  });

  it("should return empty array for session with no hypotheses", () => {
    const session = createSession({ id: "EMPTY-001" });
    const result = getAllHypothesisIds(session);

    expect(result).toHaveLength(0);
  });
});

describe("getHypothesisState", () => {
  it("should return 'primary' for primary hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const state = getHypothesisState(session, session.primaryHypothesisId);

    expect(state).toBe("primary");
  });

  it("should return 'alternative' for alternative hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const state = getHypothesisState(session, session.alternativeHypothesisIds[0]);

    expect(state).toBe("alternative");
  });

  it("should return 'archived' for archived hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const state = getHypothesisState(session, session.archivedHypothesisIds[0]);

    expect(state).toBe("archived");
  });

  it("should return 'orphaned' for unknown hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const state = getHypothesisState(session, "unknown-id");

    expect(state).toBe("orphaned");
  });
});

describe("getHypothesisCard", () => {
  it("should return the hypothesis card when found", () => {
    const session = createSessionWithMultipleHypotheses();
    const card = getHypothesisCard(session, session.primaryHypothesisId);

    expect(card).toBeDefined();
    expect(card?.id).toBe(session.primaryHypothesisId);
  });

  it("should return undefined when not found", () => {
    const session = createSessionWithMultipleHypotheses();
    const card = getHypothesisCard(session, "unknown-id");

    expect(card).toBeUndefined();
  });
});

describe("getActiveHypotheses", () => {
  it("should return primary and alternative hypotheses", () => {
    const session = createSessionWithMultipleHypotheses();
    const active = getActiveHypotheses(session);

    expect(active).toHaveLength(3); // 1 primary + 2 alternatives
    expect(active.some((h) => h.id === session.primaryHypothesisId)).toBe(true);
    expect(active.some((h) => h.id === session.alternativeHypothesisIds[0])).toBe(true);
    expect(active.some((h) => h.id === session.alternativeHypothesisIds[1])).toBe(true);
  });

  it("should not include archived hypotheses", () => {
    const session = createSessionWithMultipleHypotheses();
    const active = getActiveHypotheses(session);
    const archivedId = session.archivedHypothesisIds[0];

    expect(active.some((h) => h.id === archivedId)).toBe(false);
  });

  it("should return only alternatives when no primary", () => {
    const session = createSessionWithMultipleHypotheses();
    session.primaryHypothesisId = ""; // No primary

    const active = getActiveHypotheses(session);

    expect(active).toHaveLength(2); // Only alternatives
    expect(active.some((h) => h.id === session.alternativeHypothesisIds[0])).toBe(true);
    expect(active.some((h) => h.id === session.alternativeHypothesisIds[1])).toBe(true);
  });

  it("should skip alternatives not in hypothesisCards", () => {
    const session = createSessionWithMultipleHypotheses();
    // Add a dangling reference
    session.alternativeHypothesisIds.push("orphaned-id");

    const active = getActiveHypotheses(session);

    // Should only include the valid ones
    expect(active).toHaveLength(3);
    expect(active.some((h) => h.id === "orphaned-id")).toBe(false);
  });
});

describe("hasThirdAlternative", () => {
  it("should return true when alternatives exist", () => {
    const session = createSessionWithMultipleHypotheses();

    expect(hasThirdAlternative(session)).toBe(true);
  });

  it("should return false when no alternatives", () => {
    const session = createTestSession();

    expect(hasThirdAlternative(session)).toBe(false);
  });
});

describe("getHypothesisCounts", () => {
  it("should return correct counts", () => {
    const session = createSessionWithMultipleHypotheses();
    const counts = getHypothesisCounts(session);

    expect(counts.primary).toBe(1);
    expect(counts.alternatives).toBe(2);
    expect(counts.archived).toBe(1);
    expect(counts.total).toBe(4);
  });
});

// ============================================================================
// Mutation Function Tests
// ============================================================================

describe("setPrimaryHypothesis", () => {
  it("should promote alternative to primary", () => {
    const session = createSessionWithMultipleHypotheses();
    const altId = session.alternativeHypothesisIds[0];
    const oldPrimaryId = session.primaryHypothesisId;

    const updated = setPrimaryHypothesis(session, altId);

    expect(updated.primaryHypothesisId).toBe(altId);
    expect(updated.alternativeHypothesisIds).toContain(oldPrimaryId);
    expect(updated.alternativeHypothesisIds).not.toContain(altId);
  });

  it("should return session unchanged when already primary", () => {
    const session = createSessionWithMultipleHypotheses();
    const primaryId = session.primaryHypothesisId;

    const updated = setPrimaryHypothesis(session, primaryId);

    expect(updated).toBe(session); // Same reference
  });

  it("should throw if hypothesis not found", () => {
    const session = createSessionWithMultipleHypotheses();

    expect(() => setPrimaryHypothesis(session, "unknown-id")).toThrow("not found in session");
  });

  it("should throw if trying to promote archived hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const archivedId = session.archivedHypothesisIds[0];

    expect(() => setPrimaryHypothesis(session, archivedId)).toThrow(
      "Cannot make archived hypothesis",
    );
  });
});

describe("addCompetingHypothesis", () => {
  it("should add a new competing hypothesis", () => {
    const session = createTestSession();
    const primaryId = session.primaryHypothesisId;

    const result = addCompetingHypothesis(session, primaryId, {
      statement: "Competing hypothesis - This is an alternative explanation",
      mechanism: "Alternative mechanism - Via pathway Z",
      predictionsIfTrue: ["Different prediction - We would observe Z"],
      impossibleIfTrue: ["Alternative falsification - If we observe W"],
    });

    expect(result.hypothesis).toBeDefined();
    expect(result.hypothesis.sessionId).toBe(session.id);
    expect(result.session.alternativeHypothesisIds).toContain(result.hypothesis.id);
    expect(result.session.hypothesisCards[result.hypothesis.id]).toBeDefined();
    expect(result.relationship).toBeDefined();
    expect(result.relationship.fromVersionId).toBe(primaryId);
  });

  it("should create evolution link", () => {
    const session = createTestSession();
    const primaryId = session.primaryHypothesisId;

    const result = addCompetingHypothesis(session, primaryId, {
      statement: "Competing hypothesis - This is an alternative explanation",
      mechanism: "Alternative mechanism - Via pathway Z",
      predictionsIfTrue: ["Different prediction"],
      impossibleIfTrue: ["Alternative falsification"],
    });

    expect(result.session.hypothesisEvolution).toHaveLength(1);
    expect(result.session.hypothesisEvolution[0].fromVersionId).toBe(primaryId);
    expect(result.session.hypothesisEvolution[0].toVersionId).toBe(result.hypothesis.id);
  });

  it("should throw if competing hypothesis not found", () => {
    const session = createTestSession();

    expect(() =>
      addCompetingHypothesis(session, "unknown-id", {
        statement: "Test statement that is long enough",
        mechanism: "Test mechanism that is long enough",
        predictionsIfTrue: ["Prediction"],
        impossibleIfTrue: ["Falsification"],
      }),
    ).toThrow("not found");
  });
});

describe("resolveCompetition", () => {
  it("should archive the loser", () => {
    const session = createSessionWithMultipleHypotheses();
    const winnerId = session.primaryHypothesisId;
    const loserId = session.alternativeHypothesisIds[0];

    const result = resolveCompetition(
      session,
      winnerId,
      loserId,
      "Evidence from test X supported winner",
    );

    expect(result.session.archivedHypothesisIds).toContain(loserId);
    expect(result.session.alternativeHypothesisIds).not.toContain(loserId);
  });

  it("should promote winner to primary if loser was primary", () => {
    const session = createSessionWithMultipleHypotheses();
    const loserId = session.primaryHypothesisId;
    const winnerId = session.alternativeHypothesisIds[0];

    const result = resolveCompetition(session, winnerId, loserId, "Evidence disproved primary");

    expect(result.session.primaryHypothesisId).toBe(winnerId);
    expect(result.session.archivedHypothesisIds).toContain(loserId);
  });

  it("should add evolution link", () => {
    const session = createSessionWithMultipleHypotheses();
    const winnerId = session.primaryHypothesisId;
    const loserId = session.alternativeHypothesisIds[0];

    const result = resolveCompetition(session, winnerId, loserId, "Test reason");

    const lastEvolution =
      result.session.hypothesisEvolution[result.session.hypothesisEvolution.length - 1];

    expect(lastEvolution.fromVersionId).toBe(loserId);
    expect(lastEvolution.toVersionId).toBe(winnerId);
    expect(lastEvolution.trigger).toBe("evidence");
  });

  it("should throw if trying to resolve with archived hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const archivedId = session.archivedHypothesisIds[0];
    const winnerId = session.primaryHypothesisId;

    expect(() => resolveCompetition(session, winnerId, archivedId, "Test")).toThrow(
      "already archived",
    );
  });

  it("should throw if winner not found", () => {
    const session = createSessionWithMultipleHypotheses();
    const loserId = session.alternativeHypothesisIds[0];

    expect(() => resolveCompetition(session, "unknown-winner", loserId, "Test")).toThrow(
      "Winner hypothesis",
    );
  });

  it("should throw if loser not found", () => {
    const session = createSessionWithMultipleHypotheses();
    const winnerId = session.primaryHypothesisId;

    expect(() => resolveCompetition(session, winnerId, "unknown-loser", "Test")).toThrow(
      "Loser hypothesis",
    );
  });
});

describe("archiveHypothesis", () => {
  it("should archive an alternative hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const altId = session.alternativeHypothesisIds[0];

    const updated = archiveHypothesis(session, altId, "No longer relevant");

    expect(updated.archivedHypothesisIds).toContain(altId);
    expect(updated.alternativeHypothesisIds).not.toContain(altId);
  });

  it("should promote first alternative when archiving primary", () => {
    const session = createSessionWithMultipleHypotheses();
    const primaryId = session.primaryHypothesisId;
    const firstAltId = session.alternativeHypothesisIds[0];

    const updated = archiveHypothesis(session, primaryId, "Disproved");

    expect(updated.primaryHypothesisId).toBe(firstAltId);
    expect(updated.archivedHypothesisIds).toContain(primaryId);
  });

  it("should throw if trying to archive only active hypothesis", () => {
    const session = createTestSession();

    expect(() => archiveHypothesis(session, session.primaryHypothesisId, "Test")).toThrow(
      "Cannot archive the only active hypothesis",
    );
  });

  it("should return session unchanged if already archived", () => {
    const session = createSessionWithMultipleHypotheses();
    const archivedId = session.archivedHypothesisIds[0];

    const updated = archiveHypothesis(session, archivedId, "Test");

    expect(updated).toBe(session); // Same reference
  });

  it("should throw if hypothesis is orphaned", () => {
    const session = createSessionWithMultipleHypotheses();

    expect(() => archiveHypothesis(session, "orphaned-id", "Test")).toThrow("not found in session");
  });
});

describe("restoreHypothesis", () => {
  it("should restore archived hypothesis to alternatives", () => {
    const session = createSessionWithMultipleHypotheses();
    const archivedId = session.archivedHypothesisIds[0];

    const updated = restoreHypothesis(session, archivedId);

    expect(updated.alternativeHypothesisIds).toContain(archivedId);
    expect(updated.archivedHypothesisIds).not.toContain(archivedId);
  });

  it("should throw if hypothesis is not archived", () => {
    const session = createSessionWithMultipleHypotheses();
    const altId = session.alternativeHypothesisIds[0];

    expect(() => restoreHypothesis(session, altId)).toThrow("is not archived");
  });
});

// ============================================================================
// Evolution Graph Tests
// ============================================================================

describe("getRelatedHypotheses", () => {
  it("should return alternatives for primary hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();

    const related = getRelatedHypotheses(session, session.primaryHypothesisId);

    expect(related.alternatives).toEqual(session.alternativeHypothesisIds);
  });

  it("should return primary and other alternatives for alternative hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const altId = session.alternativeHypothesisIds[0];

    const related = getRelatedHypotheses(session, altId);

    expect(related.alternatives).toContain(session.primaryHypothesisId);
    expect(related.alternatives).toContain(session.alternativeHypothesisIds[1]);
    expect(related.alternatives).not.toContain(altId);
  });

  it("should return empty alternatives for archived hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();
    const archivedId = session.archivedHypothesisIds[0];

    const related = getRelatedHypotheses(session, archivedId);

    expect(related.alternatives).toHaveLength(0);
  });

  it("should return empty alternatives for orphaned hypothesis", () => {
    const session = createSessionWithMultipleHypotheses();

    const related = getRelatedHypotheses(session, "orphaned-id");

    expect(related.alternatives).toHaveLength(0);
  });

  it("should return ancestors and descendants from evolution links", () => {
    const session = createTestSession();
    const primaryId = session.primaryHypothesisId;

    // Create a competing hypothesis (establishes evolution link)
    const result = addCompetingHypothesis(session, primaryId, {
      statement: "Competing hypothesis - statement long enough",
      mechanism: "Competing mechanism - long enough",
      predictionsIfTrue: ["Prediction"],
      impossibleIfTrue: ["Falsification"],
    });

    // Check the new hypothesis has the primary as ancestor
    const relatedNew = getRelatedHypotheses(result.session, result.hypothesis.id);
    expect(relatedNew.ancestors).toContain(primaryId);

    // Check the primary has the new one as descendant
    const relatedPrimary = getRelatedHypotheses(result.session, primaryId);
    expect(relatedPrimary.descendants).toContain(result.hypothesis.id);
  });
});

describe("getEvolutionChain", () => {
  it("should return chain from root to current", () => {
    const session = createTestSession();

    // Add a competing hypothesis
    const result1 = addCompetingHypothesis(session, session.primaryHypothesisId, {
      statement: "First evolution - statement long enough",
      mechanism: "First evolution - mechanism long enough",
      predictionsIfTrue: ["Prediction"],
      impossibleIfTrue: ["Falsification"],
    });

    // Evolve that one further (resolve competition with original winning)
    const result2 = resolveCompetition(
      result1.session,
      result1.hypothesis.id,
      session.primaryHypothesisId,
      "Evidence supported the alternative",
    );

    const chain = getEvolutionChain(result2.session, result1.hypothesis.id);

    expect(chain).toContain(session.primaryHypothesisId);
    expect(chain).toContain(result1.hypothesis.id);
    expect(chain.indexOf(session.primaryHypothesisId)).toBeLessThan(
      chain.indexOf(result1.hypothesis.id),
    );
  });
});

describe("findCommonAncestor", () => {
  it("should find common ancestor for diverged hypotheses", () => {
    const session = createTestSession();
    const rootId = session.primaryHypothesisId;

    // Create two branches from the same root
    const result1 = addCompetingHypothesis(session, rootId, {
      statement: "Branch 1 - statement long enough for validation",
      mechanism: "Branch 1 - mechanism long enough for validation",
      predictionsIfTrue: ["Branch 1 prediction"],
      impossibleIfTrue: ["Branch 1 falsification"],
    });

    const result2 = addCompetingHypothesis(result1.session, rootId, {
      statement: "Branch 2 - statement long enough for validation",
      mechanism: "Branch 2 - mechanism long enough for validation",
      predictionsIfTrue: ["Branch 2 prediction"],
      impossibleIfTrue: ["Branch 2 falsification"],
    });

    const ancestor = findCommonAncestor(
      result2.session,
      result1.hypothesis.id,
      result2.hypothesis.id,
    );

    expect(ancestor).toBe(rootId);
  });

  it("should return undefined for unrelated hypotheses", () => {
    // Create two separate sessions with unrelated hypotheses
    const session = createTestSession();
    const hypo1 = createTestHypothesis(session.id, 10);
    const hypo2 = createTestHypothesis(session.id, 20);

    session.alternativeHypothesisIds.push(hypo1.id, hypo2.id);
    session.hypothesisCards[hypo1.id] = hypo1;
    session.hypothesisCards[hypo2.id] = hypo2;
    // No evolution links between them

    const ancestor = findCommonAncestor(session, hypo1.id, hypo2.id);

    expect(ancestor).toBeUndefined();
  });
});
