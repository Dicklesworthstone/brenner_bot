/**
 * Hypothesis Version History & Evolution Graph
 *
 * Tracks how hypotheses evolve over time, creating a navigable history
 * of intellectual development. This is critical for the Brenner approach
 * where refinement through challenge is central.
 *
 * Key features:
 * - Immutable version history (changes create new versions)
 * - Tree-structured evolution (supports branching)
 * - Diff capabilities between versions
 * - Graph visualization data for UI
 *
 * @see brenner_bot-an1n.2 (bead)
 * @see brenner_bot-an1n (parent epic: Hypothesis Engine)
 * @see ./hypothesis.ts - HypothesisCard interface
 * @module brenner-loop/hypothesis-history
 */

import type { HypothesisCard, IdentifiedConfound } from "./hypothesis";
import { evolveHypothesisCard } from "./hypothesis";

// ============================================================================
// Evolution Trigger Types
// ============================================================================

/**
 * What caused a hypothesis to evolve.
 *
 * Understanding the trigger helps interpret the evolution:
 * - `manual`: User edited directly
 * - `level_split`: Σ operator created sub-hypotheses
 * - `exclusion_test`: ⊘ operator refined it
 * - `object_transpose`: ⟳ operator suggested alternative
 * - `scale_check`: ⊙ operator adjusted scope
 * - `evidence`: Evidence ledger updated it
 * - `agent_feedback`: Agent suggested refinement
 */
export type EvolutionTrigger =
  | "manual"
  | "level_split"
  | "exclusion_test"
  | "object_transpose"
  | "scale_check"
  | "evidence"
  | "agent_feedback";

/**
 * Human-readable descriptions for evolution triggers
 */
export const EVOLUTION_TRIGGER_LABELS: Record<EvolutionTrigger, string> = {
  manual: "Manual edit",
  level_split: "Level Split operator (Σ)",
  exclusion_test: "Exclusion Test operator (⊘)",
  object_transpose: "Object Transpose operator (⟳)",
  scale_check: "Scale Check operator (⊙)",
  evidence: "Evidence update",
  agent_feedback: "Agent feedback",
};

// ============================================================================
// Hypothesis Version Interface
// ============================================================================

/**
 * A versioned hypothesis with evolution metadata.
 *
 * HypothesisVersion wraps a HypothesisCard with additional tracking:
 * - Parent link (where did this come from?)
 * - Children links (what evolved from this?)
 * - Evolution trigger (why did it change?)
 * - Evolution message (human explanation)
 */
export interface HypothesisVersion {
  /** Unique ID for this version (same as hypothesis.id) */
  id: string;

  /** The underlying hypothesis data */
  hypothesis: HypothesisCard;

  /** Parent version ID (undefined for root hypotheses) */
  parentId?: string;

  /** IDs of versions that evolved from this one */
  children: string[];

  // === Evolution metadata ===

  /** What caused this evolution */
  trigger: EvolutionTrigger;

  /** Human-readable explanation of why it changed */
  message: string;

  /** When this version was created */
  timestamp: Date;

  /** Who created this version */
  createdBy?: string;

  /** Reference to related entity (e.g., evidence ID, agent name) */
  relatedEntityId?: string;
}

// ============================================================================
// Hypothesis History Store
// ============================================================================

/**
 * A store for managing hypothesis version history.
 *
 * Provides:
 * - Version storage and retrieval
 * - Evolution tracking
 * - Tree navigation (ancestors, descendants)
 * - Diff computation
 */
export interface HypothesisHistoryStore {
  /** All versions, keyed by ID */
  versions: Record<string, HypothesisVersion>;

  /** Root hypothesis IDs (no parent) */
  roots: string[];

  /** Current/active hypothesis IDs */
  current: string[];

  /** Abandoned hypothesis IDs */
  abandoned: string[];
}

/**
 * Create an empty hypothesis history store.
 */
export function createHistoryStore(): HypothesisHistoryStore {
  return {
    versions: {},
    roots: [],
    current: [],
    abandoned: [],
  };
}

// ============================================================================
// Core Operations
// ============================================================================

/**
 * Add an initial hypothesis to the store (no parent).
 *
 * @param store - The history store
 * @param hypothesis - The hypothesis to add
 * @param message - Explanation for creating this hypothesis
 * @param createdBy - Who created it
 * @returns The created version and updated store
 */
export function addRootHypothesis(
  store: HypothesisHistoryStore,
  hypothesis: HypothesisCard,
  message: string,
  createdBy?: string,
): { version: HypothesisVersion; store: HypothesisHistoryStore } {
  const version: HypothesisVersion = {
    id: hypothesis.id,
    hypothesis,
    parentId: undefined,
    children: [],
    trigger: "manual",
    message,
    timestamp: new Date(),
    createdBy,
  };

  const newStore: HypothesisHistoryStore = {
    ...store,
    versions: {
      ...store.versions,
      [version.id]: version,
    },
    roots: [...store.roots, version.id],
    current: [...store.current, version.id],
  };

  return { version, store: newStore };
}

/**
 * Create a new version from an existing hypothesis.
 *
 * This is the primary way to evolve hypotheses. The current version
 * becomes a parent, and a new version is created with the changes.
 *
 * @param store - The history store
 * @param currentId - ID of the hypothesis to evolve
 * @param changes - Partial changes to apply
 * @param trigger - What caused this evolution
 * @param message - Explanation of why it changed
 * @param createdBy - Who created the new version
 * @param relatedEntityId - Related entity (evidence ID, agent name, etc.)
 * @returns The new version and updated store
 */
export function evolveHypothesis(
  store: HypothesisHistoryStore,
  currentId: string,
  changes: Partial<Omit<HypothesisCard, "id" | "version" | "parentVersion" | "createdAt">>,
  trigger: EvolutionTrigger,
  message: string,
  createdBy?: string,
  relatedEntityId?: string,
): { version: HypothesisVersion; store: HypothesisHistoryStore } {
  const currentVersion = store.versions[currentId];
  if (!currentVersion) {
    throw new Error(`Hypothesis version not found: ${currentId}`);
  }

  // Use the hypothesis.ts evolveHypothesisCard function
  const evolvedCard = evolveHypothesisCard(currentVersion.hypothesis, changes, message, createdBy);

  const newVersion: HypothesisVersion = {
    id: evolvedCard.id,
    hypothesis: evolvedCard,
    parentId: currentId,
    children: [],
    trigger,
    message,
    timestamp: new Date(),
    createdBy,
    relatedEntityId,
  };

  // Update parent's children
  const updatedParent: HypothesisVersion = {
    ...currentVersion,
    children: [...currentVersion.children, newVersion.id],
  };

  // Update current list (replace old with new)
  const newCurrent = store.current.filter((id) => id !== currentId).concat(newVersion.id);

  const newStore: HypothesisHistoryStore = {
    ...store,
    versions: {
      ...store.versions,
      [currentId]: updatedParent,
      [newVersion.id]: newVersion,
    },
    current: newCurrent,
  };

  return { version: newVersion, store: newStore };
}

/**
 * Mark a hypothesis as abandoned (no longer being pursued).
 *
 * @param store - The history store
 * @param versionId - ID of the hypothesis to abandon
 * @returns Updated store
 */
export function abandonHypothesis(
  store: HypothesisHistoryStore,
  versionId: string,
): HypothesisHistoryStore {
  if (!store.versions[versionId]) {
    throw new Error(`Hypothesis version not found: ${versionId}`);
  }

  return {
    ...store,
    current: store.current.filter((id) => id !== versionId),
    abandoned: [...store.abandoned, versionId],
  };
}

// ============================================================================
// Navigation Functions
// ============================================================================

/**
 * Get all ancestor versions of a hypothesis (from parent to root).
 *
 * @param store - The history store
 * @param versionId - The starting version ID
 * @returns Array of ancestor versions, from immediate parent to root
 */
export function getAncestors(
  store: HypothesisHistoryStore,
  versionId: string,
): HypothesisVersion[] {
  const ancestors: HypothesisVersion[] = [];
  let currentId: string | undefined = store.versions[versionId]?.parentId;

  while (currentId) {
    const version = store.versions[currentId];
    if (!version) break;
    ancestors.push(version);
    currentId = version.parentId;
  }

  return ancestors;
}

/**
 * Get all descendant versions of a hypothesis (breadth-first).
 *
 * @param store - The history store
 * @param versionId - The starting version ID
 * @returns Array of all descendant versions
 */
export function getDescendants(
  store: HypothesisHistoryStore,
  versionId: string,
): HypothesisVersion[] {
  const descendants: HypothesisVersion[] = [];
  const queue: string[] = [...(store.versions[versionId]?.children ?? [])];

  while (queue.length > 0) {
    const childId = queue.shift();
    if (!childId) break;
    const version = store.versions[childId];
    if (version) {
      descendants.push(version);
      queue.push(...version.children);
    }
  }

  return descendants;
}

/**
 * Get the root ancestor of a hypothesis.
 *
 * @param store - The history store
 * @param versionId - The starting version ID
 * @returns The root version, or the current version if it's already a root
 */
export function getRoot(
  store: HypothesisHistoryStore,
  versionId: string,
): HypothesisVersion | undefined {
  const ancestors = getAncestors(store, versionId);
  if (ancestors.length === 0) {
    return store.versions[versionId];
  }
  return ancestors[ancestors.length - 1];
}

/**
 * Get all leaf versions (no children) in a subtree.
 *
 * @param store - The history store
 * @param versionId - The root of the subtree (or undefined for all roots)
 * @returns Array of leaf versions
 */
export function getLeaves(store: HypothesisHistoryStore, versionId?: string): HypothesisVersion[] {
  const startIds = versionId ? [versionId] : store.roots;
  const leaves: HypothesisVersion[] = [];

  function collectLeaves(id: string) {
    const version = store.versions[id];
    if (!version) return;

    if (version.children.length === 0) {
      leaves.push(version);
    } else {
      version.children.forEach(collectLeaves);
    }
  }

  startIds.forEach(collectLeaves);
  return leaves;
}

/**
 * Find the common ancestor of two versions.
 *
 * @param store - The history store
 * @param versionId1 - First version ID
 * @param versionId2 - Second version ID
 * @returns The common ancestor, or undefined if they have no common ancestor
 */
export function findCommonAncestor(
  store: HypothesisHistoryStore,
  versionId1: string,
  versionId2: string,
): HypothesisVersion | undefined {
  const ancestors1 = new Set([versionId1, ...getAncestors(store, versionId1).map((v) => v.id)]);

  let currentId: string | undefined = versionId2;
  while (currentId) {
    if (ancestors1.has(currentId)) {
      return store.versions[currentId];
    }
    currentId = store.versions[currentId]?.parentId;
  }

  return undefined;
}

// ============================================================================
// Diff Types
// ============================================================================

/**
 * A single change between two hypothesis versions.
 */
export interface HypothesisChange {
  /** Which field changed */
  field: keyof HypothesisCard | string;

  /** Type of change */
  changeType: "added" | "removed" | "modified";

  /** Old value (undefined for additions) */
  oldValue?: unknown;

  /** New value (undefined for removals) */
  newValue?: unknown;
}

/**
 * Complete diff between two hypothesis versions.
 */
export interface HypothesisDiff {
  /** ID of the older version */
  fromId: string;

  /** ID of the newer version */
  toId: string;

  /** Number of versions between them (0 if direct parent-child) */
  distance: number;

  /** List of individual changes */
  changes: HypothesisChange[];

  /** Summary statistics */
  summary: {
    fieldsChanged: number;
    predictionsAdded: number;
    predictionsRemoved: number;
    confoundsAdded: number;
    confoundsRemoved: number;
    confidenceDelta: number;
  };
}

// ============================================================================
// Diff Functions
// ============================================================================

/**
 * Compute the diff between two hypothesis versions.
 *
 * @param v1 - The older hypothesis card
 * @param v2 - The newer hypothesis card
 * @returns A detailed diff
 */
export function diffHypotheses(v1: HypothesisCard, v2: HypothesisCard): HypothesisDiff {
  const changes: HypothesisChange[] = [];

  // Compare scalar fields
  const scalarFields: (keyof HypothesisCard)[] = ["statement", "mechanism", "confidence", "notes"];

  for (const field of scalarFields) {
    const oldVal = v1[field];
    const newVal = v2[field];
    if (oldVal !== newVal) {
      changes.push({
        field,
        changeType: oldVal === undefined ? "added" : newVal === undefined ? "removed" : "modified",
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  // Compare array fields
  const arrayFields: (keyof HypothesisCard)[] = [
    "domain",
    "predictionsIfTrue",
    "predictionsIfFalse",
    "impossibleIfTrue",
    "assumptions",
    "tags",
  ];

  let predictionsAdded = 0;
  let predictionsRemoved = 0;

  for (const field of arrayFields) {
    const oldArr = (v1[field] as string[] | undefined) ?? [];
    const newArr = (v2[field] as string[] | undefined) ?? [];

    const added = newArr.filter((item) => !oldArr.includes(item));
    const removed = oldArr.filter((item) => !newArr.includes(item));

    if (field === "predictionsIfTrue" || field === "predictionsIfFalse") {
      predictionsAdded += added.length;
      predictionsRemoved += removed.length;
    }

    if (added.length > 0) {
      changes.push({
        field,
        changeType: "added",
        newValue: added,
      });
    }

    if (removed.length > 0) {
      changes.push({
        field,
        changeType: "removed",
        oldValue: removed,
      });
    }
  }

  // Compare confounds
  const oldConfoundIds = new Set(v1.confounds.map((c) => c.id));
  const newConfoundIds = new Set(v2.confounds.map((c) => c.id));

  const confoundsAdded = v2.confounds.filter((c) => !oldConfoundIds.has(c.id));
  const confoundsRemoved = v1.confounds.filter((c) => !newConfoundIds.has(c.id));

  if (confoundsAdded.length > 0) {
    changes.push({
      field: "confounds",
      changeType: "added",
      newValue: confoundsAdded,
    });
  }

  if (confoundsRemoved.length > 0) {
    changes.push({
      field: "confounds",
      changeType: "removed",
      oldValue: confoundsRemoved,
    });
  }

  // Check for modified confounds
  for (const newConf of v2.confounds) {
    const oldConf = v1.confounds.find((c) => c.id === newConf.id);
    if (oldConf) {
      const confoundChanges = diffConfounds(oldConf, newConf);
      if (confoundChanges.length > 0) {
        changes.push({
          field: `confounds[${newConf.id}]`,
          changeType: "modified",
          oldValue: oldConf,
          newValue: newConf,
        });
      }
    }
  }

  // Calculate version distance
  let distance = 0;
  if (v1.id !== v2.id) {
    distance = Math.abs(v2.version - v1.version);
  }

  return {
    fromId: v1.id,
    toId: v2.id,
    distance,
    changes,
    summary: {
      fieldsChanged: changes.length,
      predictionsAdded,
      predictionsRemoved,
      confoundsAdded: confoundsAdded.length,
      confoundsRemoved: confoundsRemoved.length,
      confidenceDelta: v2.confidence - v1.confidence,
    },
  };
}

/**
 * Helper to diff two confounds.
 */
function diffConfounds(c1: IdentifiedConfound, c2: IdentifiedConfound): string[] {
  const changes: string[] = [];
  if (c1.name !== c2.name) changes.push("name");
  if (c1.description !== c2.description) changes.push("description");
  if (c1.likelihood !== c2.likelihood) changes.push("likelihood");
  if (c1.domain !== c2.domain) changes.push("domain");
  if (c1.addressed !== c2.addressed) changes.push("addressed");
  return changes;
}

// ============================================================================
// Graph Visualization Types
// ============================================================================

/**
 * Status of a hypothesis in the evolution graph.
 */
export type EvolutionStatus = "current" | "ancestor" | "abandoned";

/**
 * A node in the evolution graph visualization.
 */
export interface EvolutionGraphNode {
  /** Version ID */
  id: string;

  /** Short label (truncated statement or custom) */
  label: string;

  /** Current confidence */
  confidence: number;

  /** Status in the graph */
  status: EvolutionStatus;

  /** IDs of child nodes */
  children: string[];

  /** ID of parent node (undefined for roots) */
  parentId?: string;

  /** Evolution trigger that created this node */
  trigger: EvolutionTrigger;

  /** When this version was created */
  timestamp: Date;

  /** Version number */
  version: number;
}

/**
 * An edge in the evolution graph.
 */
export interface EvolutionGraphEdge {
  /** Source node ID */
  from: string;

  /** Target node ID */
  to: string;

  /** Evolution trigger */
  trigger: EvolutionTrigger;

  /** Edge label (evolution message) */
  label?: string;
}

/**
 * Complete evolution graph for visualization.
 */
export interface EvolutionGraph {
  /** All nodes */
  nodes: EvolutionGraphNode[];

  /** All edges */
  edges: EvolutionGraphEdge[];

  /** Root node IDs */
  roots: string[];

  /** Current/active node IDs */
  current: string[];
}

// ============================================================================
// Graph Generation
// ============================================================================

/**
 * Generate an evolution graph from a history store.
 *
 * @param store - The history store
 * @param maxLabelLength - Maximum characters for node labels (default 50)
 * @returns An EvolutionGraph ready for visualization
 */
export function generateEvolutionGraph(
  store: HypothesisHistoryStore,
  maxLabelLength: number = 50,
): EvolutionGraph {
  const nodes: EvolutionGraphNode[] = [];
  const edges: EvolutionGraphEdge[] = [];

  const currentSet = new Set(store.current);
  const abandonedSet = new Set(store.abandoned);

  for (const [id, version] of Object.entries(store.versions)) {
    // Determine status
    let status: EvolutionStatus = "ancestor";
    if (currentSet.has(id)) {
      status = "current";
    } else if (abandonedSet.has(id)) {
      status = "abandoned";
    }

    // Create truncated label
    let label = version.hypothesis.statement;
    if (label.length > maxLabelLength) {
      label = label.slice(0, maxLabelLength - 3) + "...";
    }

    nodes.push({
      id,
      label,
      confidence: version.hypothesis.confidence,
      status,
      children: version.children,
      parentId: version.parentId,
      trigger: version.trigger,
      timestamp: version.timestamp,
      version: version.hypothesis.version,
    });

    // Create edges to children
    for (const childId of version.children) {
      const childVersion = store.versions[childId];
      if (childVersion) {
        edges.push({
          from: id,
          to: childId,
          trigger: childVersion.trigger,
          label: childVersion.message.slice(0, 30),
        });
      }
    }
  }

  return {
    nodes,
    edges,
    roots: store.roots,
    current: store.current,
  };
}

/**
 * Generate a subgraph for a specific hypothesis lineage.
 *
 * @param store - The history store
 * @param versionId - The focal version ID
 * @param includeDescendants - Whether to include descendants (default true)
 * @returns A subgraph focused on the specified version's lineage
 */
export function generateLineageGraph(
  store: HypothesisHistoryStore,
  versionId: string,
  includeDescendants: boolean = true,
): EvolutionGraph {
  const relevantIds = new Set<string>();

  // Add ancestors
  const ancestors = getAncestors(store, versionId);
  ancestors.forEach((v) => relevantIds.add(v.id));

  // Add focal version
  relevantIds.add(versionId);

  // Optionally add descendants
  if (includeDescendants) {
    const descendants = getDescendants(store, versionId);
    descendants.forEach((v) => relevantIds.add(v.id));
  }

  const nodes: EvolutionGraphNode[] = [];
  const edges: EvolutionGraphEdge[] = [];
  const currentSet = new Set(store.current);
  const abandonedSet = new Set(store.abandoned);
  const relevantRoots = new Set<string>();
  const relevantCurrent = new Set<string>();

  for (const id of relevantIds) {
    const version = store.versions[id];
    if (!version) continue;

    // Determine status
    let status: EvolutionStatus = "ancestor";
    if (currentSet.has(id)) {
      status = "current";
      relevantCurrent.add(id);
    } else if (abandonedSet.has(id)) {
      status = "abandoned";
    }

    // Create truncated label
    let label = version.hypothesis.statement;
    // 50 chars hardcoded or passed as arg? The original fn signature didn't take maxLabelLength.
    // The previous implementation called generateEvolutionGraph which took maxLabelLength=50 default.
    const maxLabelLength = 50;
    if (label.length > maxLabelLength) {
      label = label.slice(0, maxLabelLength - 3) + "...";
    }

    nodes.push({
      id,
      label,
      confidence: version.hypothesis.confidence,
      status,
      children: version.children,
      parentId: version.parentId,
      trigger: version.trigger,
      timestamp: version.timestamp,
      version: version.hypothesis.version,
    });

    if (!version.parentId) {
      relevantRoots.add(id);
    }

    // Create edges to children IF they are in the relevant set
    for (const childId of version.children) {
      if (relevantIds.has(childId)) {
        const childVersion = store.versions[childId];
        if (childVersion) {
          edges.push({
            from: id,
            to: childId,
            trigger: childVersion.trigger,
            label: childVersion.message.slice(0, 30),
          });
        }
      }
    }
  }

  return {
    nodes,
    edges,
    roots: Array.from(relevantRoots),
    current: Array.from(relevantCurrent),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get evolution statistics for a history store.
 */
export function getEvolutionStats(store: HypothesisHistoryStore): {
  totalVersions: number;
  rootCount: number;
  currentCount: number;
  abandonedCount: number;
  maxDepth: number;
  avgBranchingFactor: number;
  triggerCounts: Record<EvolutionTrigger, number>;
} {
  const triggerCounts: Record<EvolutionTrigger, number> = {
    manual: 0,
    level_split: 0,
    exclusion_test: 0,
    object_transpose: 0,
    scale_check: 0,
    evidence: 0,
    agent_feedback: 0,
  };

  let maxDepth = 0;
  let totalChildren = 0;
  let nodesWithChildren = 0;

  for (const version of Object.values(store.versions)) {
    triggerCounts[version.trigger]++;

    if (version.children.length > 0) {
      totalChildren += version.children.length;
      nodesWithChildren++;
    }

    // Calculate depth for this node
    const depth = getAncestors(store, version.id).length;
    maxDepth = Math.max(maxDepth, depth);
  }

  return {
    totalVersions: Object.keys(store.versions).length,
    rootCount: store.roots.length,
    currentCount: store.current.length,
    abandonedCount: store.abandoned.length,
    maxDepth,
    avgBranchingFactor: nodesWithChildren > 0 ? totalChildren / nodesWithChildren : 0,
    triggerCounts,
  };
}

/**
 * Find versions by trigger type.
 */
export function findByTrigger(
  store: HypothesisHistoryStore,
  trigger: EvolutionTrigger,
): HypothesisVersion[] {
  return Object.values(store.versions).filter((v) => v.trigger === trigger);
}

/**
 * Find versions within a time range.
 */
export function findByTimeRange(
  store: HypothesisHistoryStore,
  startTime: Date,
  endTime: Date,
): HypothesisVersion[] {
  return Object.values(store.versions).filter(
    (v) => v.timestamp >= startTime && v.timestamp <= endTime,
  );
}

/**
 * Check if a version is an ancestor of another.
 */
export function isAncestor(
  store: HypothesisHistoryStore,
  potentialAncestorId: string,
  descendantId: string,
): boolean {
  const ancestors = getAncestors(store, descendantId);
  return ancestors.some((a) => a.id === potentialAncestorId);
}
