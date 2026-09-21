/**
 * Session-Hypothesis Containment Model
 *
 * This module defines the relationship between Sessions and Hypotheses:
 * - A session CONTAINS multiple hypotheses (one-to-many)
 * - A hypothesis BELONGS TO exactly one session
 * - Hypotheses can be: primary, alternative, or archived
 * - Competition resolution tracks winner/loser with reasoning
 *
 * Key relationship types:
 * - alternative_to: Competing with another hypothesis
 * - refinement_of: Evolved from another hypothesis
 * - supersedes: Replaced another hypothesis after evidence
 *
 * @see brenner_bot-0lff (bead)
 * @see brenner_bot-1v26.1 - Session Data Model
 * @see brenner_bot-an1n.1 - HypothesisCard Interface
 * @module brenner-loop/sessionHypothesis
 */

import type { HypothesisCard } from "./hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "./hypothesis";
import type { HypothesisEvolution, Session } from "./types";

// ============================================================================
// Relationship Types
// ============================================================================

/**
 * Relationship between hypotheses within a session
 */
export type HypothesisRelationshipType =
  | "alternative_to" // Competing hypothesis
  | "refinement_of" // Evolved/refined from parent
  | "supersedes"; // Replaced another after evidence

/**
 * A link describing the relationship between two hypotheses
 */
export interface HypothesisRelationship {
  /** The hypothesis this relationship is FROM */
  fromId: string;

  /** The hypothesis this relationship is TO */
  toId: string;

  /** Type of relationship */
  type: HypothesisRelationshipType;

  /** Why this relationship exists */
  reason: string;

  /** When the relationship was established */
  establishedAt: string;
}

/**
 * The hypotheses structure within a session
 */
export interface SessionHypotheses {
  /** The primary hypothesis ID */
  primary: string;

  /** IDs of alternative/competing hypotheses */
  alternatives: string[];

  /** IDs of archived (superseded/discarded) hypotheses */
  archived: string[];
}

/**
 * Result of adding a competing hypothesis
 */
export interface AddCompetingResult {
  /** The newly created hypothesis */
  hypothesis: HypothesisCard;

  /** Updated session */
  session: Session;

  /** The relationship that was created */
  relationship: HypothesisEvolution;
}

/**
 * Result of resolving competition between hypotheses
 */
export interface ResolveCompetitionResult {
  /** The winning hypothesis ID */
  winnerId: string;

  /** The losing hypothesis ID (now archived) */
  loserId: string;

  /** Updated session */
  session: Session;

  /** Reason for the resolution */
  reason: string;
}

/**
 * Hypothesis state within a session
 */
export type HypothesisSessionState =
  | "primary" // The main hypothesis being investigated
  | "alternative" // A competing hypothesis
  | "archived" // Discarded or superseded
  | "orphaned"; // Not in any list (error state)

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get the hypotheses structure from a session
 *
 * @param session - The session to query
 * @returns The hypotheses structure
 */
export function getSessionHypotheses(session: Session): SessionHypotheses {
  return {
    primary: session.primaryHypothesisId,
    alternatives: session.alternativeHypothesisIds,
    archived: session.archivedHypothesisIds,
  };
}

/**
 * Get all hypothesis IDs in a session (primary + alternatives + archived)
 *
 * @param session - The session to query
 * @returns Array of all hypothesis IDs
 */
export function getAllHypothesisIds(session: Session): string[] {
  const ids: string[] = [];

  if (session.primaryHypothesisId) {
    ids.push(session.primaryHypothesisId);
  }

  ids.push(...session.alternativeHypothesisIds);
  ids.push(...session.archivedHypothesisIds);

  return ids;
}

/**
 * Get the state of a hypothesis within a session
 *
 * @param session - The session to check
 * @param hypothesisId - The hypothesis ID to find
 * @returns The hypothesis state
 */
export function getHypothesisState(session: Session, hypothesisId: string): HypothesisSessionState {
  if (session.primaryHypothesisId === hypothesisId) {
    return "primary";
  }

  if (session.alternativeHypothesisIds.includes(hypothesisId)) {
    return "alternative";
  }

  if (session.archivedHypothesisIds.includes(hypothesisId)) {
    return "archived";
  }

  return "orphaned";
}

/**
 * Get a hypothesis card from a session by ID
 *
 * @param session - The session containing the hypothesis
 * @param hypothesisId - The hypothesis ID to retrieve
 * @returns The HypothesisCard or undefined if not found
 */
export function getHypothesisCard(
  session: Session,
  hypothesisId: string,
): HypothesisCard | undefined {
  return session.hypothesisCards[hypothesisId];
}

/**
 * Get all active (non-archived) hypotheses in a session
 *
 * @param session - The session to query
 * @returns Array of active HypothesisCards
 */
export function getActiveHypotheses(session: Session): HypothesisCard[] {
  const cards: HypothesisCard[] = [];

  if (session.primaryHypothesisId && session.hypothesisCards[session.primaryHypothesisId]) {
    cards.push(session.hypothesisCards[session.primaryHypothesisId]);
  }

  for (const altId of session.alternativeHypothesisIds) {
    if (session.hypothesisCards[altId]) {
      cards.push(session.hypothesisCards[altId]);
    }
  }

  return cards;
}

/**
 * Check if a session has any third alternatives
 * (hypotheses that challenge the primary framing)
 *
 * @param session - The session to check
 * @returns True if there's at least one alternative hypothesis
 */
export function hasThirdAlternative(session: Session): boolean {
  return session.alternativeHypothesisIds.length > 0;
}

/**
 * Get the count of hypotheses by state
 *
 * @param session - The session to query
 * @returns Object with counts by state
 */
export function getHypothesisCounts(session: Session): {
  primary: number;
  alternatives: number;
  archived: number;
  total: number;
} {
  const primary = session.primaryHypothesisId ? 1 : 0;
  const alternatives = session.alternativeHypothesisIds.length;
  const archived = session.archivedHypothesisIds.length;

  return {
    primary,
    alternatives,
    archived,
    total: primary + alternatives + archived,
  };
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Set the primary hypothesis for a session.
 * If there's an existing primary, it moves to alternatives.
 *
 * @param session - The session to update
 * @param hypothesisId - The hypothesis ID to make primary
 * @returns Updated session
 */
export function setPrimaryHypothesis(session: Session, hypothesisId: string): Session {
  if (!session.hypothesisCards[hypothesisId]) {
    throw new Error(`Hypothesis ${hypothesisId} not found in session`);
  }

  const currentState = getHypothesisState(session, hypothesisId);

  if (currentState === "primary") {
    return session; // Already primary
  }

  if (currentState === "archived") {
    throw new Error(`Cannot make archived hypothesis ${hypothesisId} primary`);
  }

  const now = new Date().toISOString();
  const oldPrimary = session.primaryHypothesisId;

  // Build new alternatives list
  let newAlternatives = [...session.alternativeHypothesisIds];

  // Remove new primary from alternatives if it was there
  newAlternatives = newAlternatives.filter((id) => id !== hypothesisId);

  // Add old primary to alternatives (if it exists)
  if (oldPrimary && !newAlternatives.includes(oldPrimary)) {
    newAlternatives.unshift(oldPrimary);
  }

  return {
    ...session,
    primaryHypothesisId: hypothesisId,
    alternativeHypothesisIds: newAlternatives,
    updatedAt: now,
  };
}

/**
 * Add a new hypothesis to a session as a competing alternative.
 *
 * @param session - The session to update
 * @param competingWith - ID of the hypothesis this competes with
 * @param newHypothesis - Partial data for the new hypothesis
 * @returns Result with the new hypothesis and updated session
 */
export function addCompetingHypothesis(
  session: Session,
  competingWith: string,
  newHypothesis: {
    statement: string;
    mechanism: string;
    domain?: string[];
    predictionsIfTrue: string[];
    predictionsIfFalse?: string[];
    impossibleIfTrue: string[];
    confounds?: HypothesisCard["confounds"];
    assumptions?: string[];
    confidence?: number;
    createdBy?: string;
  },
): AddCompetingResult {
  // Validate the competing hypothesis exists
  if (!session.hypothesisCards[competingWith]) {
    throw new Error(`Competing hypothesis ${competingWith} not found in session`);
  }

  const now = new Date().toISOString();

  // Generate ID for new hypothesis
  const existingIds = Object.keys(session.hypothesisCards);
  const maxSequence = existingIds.reduce((max, id) => {
    const match = id.match(/-(\d{3})-v/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  const newId = generateHypothesisCardId(session.id, maxSequence + 1, 1);

  // Create the hypothesis card
  const hypothesis = createHypothesisCard({
    id: newId,
    ...newHypothesis,
    sessionId: session.id,
  });

  // Create evolution link
  const evolutionLink: HypothesisEvolution = {
    fromVersionId: competingWith,
    toVersionId: newId,
    reason: `Alternative hypothesis competing with ${competingWith}`,
    trigger: "manual",
    timestamp: now,
  };

  // Update session
  const updatedSession: Session = {
    ...session,
    alternativeHypothesisIds: [...session.alternativeHypothesisIds, newId],
    hypothesisCards: {
      ...session.hypothesisCards,
      [newId]: hypothesis,
    },
    hypothesisEvolution: [...session.hypothesisEvolution, evolutionLink],
    updatedAt: now,
  };

  return {
    hypothesis,
    session: updatedSession,
    relationship: evolutionLink,
  };
}

/**
 * Resolve competition between hypotheses, archiving the loser.
 *
 * @param session - The session to update
 * @param winnerId - ID of the winning hypothesis
 * @param loserId - ID of the losing hypothesis (will be archived)
 * @param reason - Reason for the resolution (e.g., "Evidence from test X")
 * @returns Result with updated session
 */
export function resolveCompetition(
  session: Session,
  winnerId: string,
  loserId: string,
  reason: string,
): ResolveCompetitionResult {
  // Validate both hypotheses exist
  if (!session.hypothesisCards[winnerId]) {
    throw new Error(`Winner hypothesis ${winnerId} not found in session`);
  }
  if (!session.hypothesisCards[loserId]) {
    throw new Error(`Loser hypothesis ${loserId} not found in session`);
  }

  // Can't resolve against archived hypothesis
  const loserState = getHypothesisState(session, loserId);
  if (loserState === "archived") {
    throw new Error(`Hypothesis ${loserId} is already archived`);
  }

  const now = new Date().toISOString();

  // Update the losing hypothesis with superseded info
  const loserCard = session.hypothesisCards[loserId];
  const updatedLoserCard: HypothesisCard = {
    ...loserCard,
    updatedAt: new Date(),
    notes: loserCard.notes
      ? `${loserCard.notes}\n\nSuperseded by ${winnerId}: ${reason}`
      : `Superseded by ${winnerId}: ${reason}`,
  };

  // Create evolution link showing supersession
  const evolutionLink: HypothesisEvolution = {
    fromVersionId: loserId,
    toVersionId: winnerId,
    reason: `Superseded: ${reason}`,
    trigger: "evidence",
    timestamp: now,
  };

  // Build updated state
  let newPrimaryId = session.primaryHypothesisId;
  let newAlternatives = [...session.alternativeHypothesisIds];
  const newArchived = [...session.archivedHypothesisIds];

  // If loser was primary, winner becomes primary
  if (session.primaryHypothesisId === loserId) {
    newPrimaryId = winnerId;
    // Remove winner from alternatives if it was there
    newAlternatives = newAlternatives.filter((id) => id !== winnerId);
  }

  // Remove loser from alternatives (if it was there)
  newAlternatives = newAlternatives.filter((id) => id !== loserId);

  // Add loser to archived
  if (!newArchived.includes(loserId)) {
    newArchived.push(loserId);
  }

  // Ensure winner is either primary or in alternatives
  const winnerState = getHypothesisState(session, winnerId);
  if (winnerState === "alternative" && newPrimaryId !== winnerId) {
    // Winner stays in alternatives - no change needed
  } else if (winnerState !== "primary" && newPrimaryId !== winnerId) {
    // Winner was orphaned or somewhere else, add to alternatives
    if (!newAlternatives.includes(winnerId)) {
      newAlternatives.push(winnerId);
    }
  }

  const updatedSession: Session = {
    ...session,
    primaryHypothesisId: newPrimaryId,
    alternativeHypothesisIds: newAlternatives,
    archivedHypothesisIds: newArchived,
    hypothesisCards: {
      ...session.hypothesisCards,
      [loserId]: updatedLoserCard,
    },
    hypothesisEvolution: [...session.hypothesisEvolution, evolutionLink],
    updatedAt: now,
  };

  return {
    winnerId,
    loserId,
    session: updatedSession,
    reason,
  };
}

/**
 * Archive a hypothesis without a competition resolution.
 * Used when a hypothesis is discarded for reasons other than losing to another.
 *
 * @param session - The session to update
 * @param hypothesisId - ID of the hypothesis to archive
 * @param reason - Reason for archiving
 * @returns Updated session
 */
export function archiveHypothesis(session: Session, hypothesisId: string, reason: string): Session {
  const state = getHypothesisState(session, hypothesisId);

  if (state === "archived") {
    return session; // Already archived
  }

  if (state === "orphaned") {
    throw new Error(`Hypothesis ${hypothesisId} not found in session`);
  }

  // Can't archive the primary if it's the only active hypothesis
  if (state === "primary" && session.alternativeHypothesisIds.length === 0) {
    throw new Error("Cannot archive the only active hypothesis. Add an alternative first.");
  }

  const now = new Date().toISOString();

  // Update the hypothesis with archive reason
  const card = session.hypothesisCards[hypothesisId];
  const updatedCard: HypothesisCard = {
    ...card,
    updatedAt: new Date(),
    notes: card.notes ? `${card.notes}\n\nArchived: ${reason}` : `Archived: ${reason}`,
  };

  // Build updated state
  let newPrimaryId = session.primaryHypothesisId;
  let newAlternatives = [...session.alternativeHypothesisIds];

  // If archiving primary, promote first alternative
  if (state === "primary") {
    newPrimaryId = newAlternatives[0];
    newAlternatives = newAlternatives.slice(1);
  } else {
    // Remove from alternatives
    newAlternatives = newAlternatives.filter((id) => id !== hypothesisId);
  }

  return {
    ...session,
    primaryHypothesisId: newPrimaryId,
    alternativeHypothesisIds: newAlternatives,
    archivedHypothesisIds: [...session.archivedHypothesisIds, hypothesisId],
    hypothesisCards: {
      ...session.hypothesisCards,
      [hypothesisId]: updatedCard,
    },
    updatedAt: now,
  };
}

/**
 * Restore an archived hypothesis to alternatives.
 *
 * @param session - The session to update
 * @param hypothesisId - ID of the hypothesis to restore
 * @returns Updated session
 */
export function restoreHypothesis(session: Session, hypothesisId: string): Session {
  const state = getHypothesisState(session, hypothesisId);

  if (state !== "archived") {
    throw new Error(`Hypothesis ${hypothesisId} is not archived (state: ${state})`);
  }

  const now = new Date().toISOString();

  // Update the hypothesis with restore note
  const card = session.hypothesisCards[hypothesisId];
  const updatedCard: HypothesisCard = {
    ...card,
    updatedAt: new Date(),
    notes: card.notes ? `${card.notes}\n\nRestored at ${now}` : `Restored at ${now}`,
  };

  return {
    ...session,
    alternativeHypothesisIds: [...session.alternativeHypothesisIds, hypothesisId],
    archivedHypothesisIds: session.archivedHypothesisIds.filter((id) => id !== hypothesisId),
    hypothesisCards: {
      ...session.hypothesisCards,
      [hypothesisId]: updatedCard,
    },
    updatedAt: now,
  };
}

// ============================================================================
// Evolution Graph Queries
// ============================================================================

/**
 * Get all hypotheses that are related to a given hypothesis.
 *
 * @param session - The session to query
 * @param hypothesisId - The hypothesis ID to find relations for
 * @returns Object with arrays of related hypothesis IDs
 */
export function getRelatedHypotheses(
  session: Session,
  hypothesisId: string,
): {
  /** Hypotheses that this one evolved from */
  ancestors: string[];
  /** Hypotheses that evolved from this one */
  descendants: string[];
  /** Direct alternatives (siblings in the competition) */
  alternatives: string[];
} {
  const ancestors: string[] = [];
  const descendants: string[] = [];
  const alternatives: string[] = [];

  for (const evolution of session.hypothesisEvolution) {
    // Check if this hypothesis is the target (evolved from something)
    if (evolution.toVersionId === hypothesisId) {
      ancestors.push(evolution.fromVersionId);
    }

    // Check if this hypothesis is the source (something evolved from it)
    if (evolution.fromVersionId === hypothesisId) {
      descendants.push(evolution.toVersionId);
    }
  }

  // Alternatives are other active hypotheses in the session
  const state = getHypothesisState(session, hypothesisId);
  if (state === "primary") {
    alternatives.push(...session.alternativeHypothesisIds);
  } else if (state === "alternative") {
    // Include primary and other alternatives
    if (session.primaryHypothesisId) {
      alternatives.push(session.primaryHypothesisId);
    }
    alternatives.push(...session.alternativeHypothesisIds.filter((id) => id !== hypothesisId));
  }

  return { ancestors, descendants, alternatives };
}

/**
 * Get the evolution chain for a hypothesis (from root to this version).
 *
 * @param session - The session to query
 * @param hypothesisId - The hypothesis ID to trace
 * @returns Array of hypothesis IDs from oldest to newest
 */
export function getEvolutionChain(session: Session, hypothesisId: string): string[] {
  const chain: string[] = [hypothesisId];
  let currentId = hypothesisId;

  // Walk backwards through evolution
  while (true) {
    const evolution = session.hypothesisEvolution.find((e) => e.toVersionId === currentId);
    if (!evolution) break;
    chain.unshift(evolution.fromVersionId);
    currentId = evolution.fromVersionId;
  }

  return chain;
}

/**
 * Find the common ancestor of two hypotheses in the session.
 *
 * @param session - The session to query
 * @param hypo1Id - First hypothesis ID
 * @param hypo2Id - Second hypothesis ID
 * @returns Common ancestor ID or undefined if none found
 */
export function findCommonAncestor(
  session: Session,
  hypo1Id: string,
  hypo2Id: string,
): string | undefined {
  const chain1 = new Set(getEvolutionChain(session, hypo1Id));
  const chain2 = getEvolutionChain(session, hypo2Id);

  // Find first common element (walking from root)
  for (const id of chain2) {
    if (chain1.has(id)) {
      return id;
    }
  }

  return undefined;
}
