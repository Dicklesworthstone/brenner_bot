/**
 * Thread Status Computation
 *
 * Computes status for Agent Mail threads based on the Brenner Protocol.
 * Detects role completion, pending acks, and latest compiled artifact.
 *
 * Usage:
 * ```typescript
 * import { computeThreadStatus, type ThreadStatus } from "./threadStatus";
 *
 * const messages = await agentMailClient.readThread({ projectKey, threadId, includeBodies: true });
 * const status = computeThreadStatus(messages.messages);
 *
 * // Check overall completion
 * if (status.isComplete) { ... }
 *
 * // Check role completion
 * if (status.roles.hypothesis_generator.completed) { ... }
 *
 * // Get latest artifact
 * if (status.latestArtifact) {
 *   console.log(`Latest artifact v${status.latestArtifact.version}`);
 * }
 * ```
 *
 * Per brenner_bot-5so.3.3.2: "Compute thread/session status (responses, acks, latest artifact)"
 */

import type { AgentMailMessage, AgentMailThread } from "./agentMail";

// ============================================================================
// Types
// ============================================================================

/** Role types from Brenner Protocol */
export type BrennerRole = "hypothesis_generator" | "test_designer" | "adversarial_critic";

/** Status of a specific role within a session */
export interface RoleStatus {
  /** Whether this role has submitted at least one DELTA */
  completed: boolean;
  /** Agent names that have contributed to this role */
  contributors: string[];
  /** Latest DELTA message from this role */
  latestDelta: AgentMailMessage | null;
  /** Timestamp of latest contribution */
  lastUpdated: string | null;
}

/** Status of pending acknowledgements */
export interface AckStatus {
  /** Messages that require acknowledgement */
  pendingAcks: AgentMailMessage[];
  /** Count of messages awaiting ack */
  pendingCount: number;
  /** Agents who have been requested to ack but haven't */
  awaitingFrom: string[];
}

/** Information about a compiled artifact */
export interface ArtifactInfo {
  /** Message containing the compiled artifact */
  message: AgentMailMessage;
  /** Extracted version number (if present) */
  version: number | null;
  /** Agents that contributed to this version */
  contributors: string[];
  /** Timestamp of compilation */
  compiledAt: string;
}

/** Session lifecycle phase */
export type SessionPhase =
  | "not_started" // No KICKOFF message found
  | "awaiting_responses" // KICKOFF sent, awaiting DELTAs
  | "partially_complete" // Some roles have responded
  | "awaiting_compilation" // All roles responded, no COMPILED yet
  | "compiled" // COMPILED message exists
  | "in_critique" // CRITIQUE messages after COMPILED
  | "closed"; // Thread explicitly closed

/** Complete thread status */
export interface ThreadStatus {
  /** Thread ID being analyzed */
  threadId: string | null;
  /** Current phase of the session */
  phase: SessionPhase;
  /** Whether all expected roles have contributed */
  isComplete: boolean;
  /** Per-role status */
  roles: Record<BrennerRole, RoleStatus>;
  /** Acknowledgement tracking */
  acks: AckStatus;
  /** Latest compiled artifact (if any) */
  latestArtifact: ArtifactInfo | null;
  /** KICKOFF message (if found) */
  kickoff: AgentMailMessage | null;
  /** Total message count in thread */
  messageCount: number;
  /**
   * Current round number.
   * - Round 0: Initial collection phase (KICKOFF → first COMPILED)
   * - Round 1+: Post-compile iteration (COMPILED v1 exists, working toward v2, etc.)
   * Round number equals the count of COMPILED messages (or version number - 1).
   */
  round: number;
  /**
   * Number of DELTAs contributed in the current round (since last COMPILED or KICKOFF).
   * Useful for tracking progress within a round.
   */
  deltasInCurrentRound: number;
  /**
   * Number of CRITIQUEs received in the current round (since last COMPILED).
   * Only relevant for rounds > 0.
   */
  critiquesInCurrentRound: number;
  /** Summary statistics */
  stats: {
    totalDeltas: number;
    totalCritiques: number;
    totalAcks: number;
    participants: string[];
  };
}

// ============================================================================
// Constants
// ============================================================================

/** Map of subject prefix patterns to role shorthand */
const ROLE_SHORTHAND_MAP: Record<string, BrennerRole> = {
  opus: "test_designer",
  claude: "test_designer",
  claude_code: "test_designer",
  gpt: "hypothesis_generator",
  codex: "hypothesis_generator",
  codex_cli: "hypothesis_generator",
  gemini: "adversarial_critic",
  gemini_cli: "adversarial_critic",
  human: "hypothesis_generator", // Default human contributions to hypothesis

  // Allow role names as delta tags (e.g. DELTA[Test Designer]) for robustness.
  hypothesis_generator: "hypothesis_generator",
  hypothesisgenerator: "hypothesis_generator",
  test_designer: "test_designer",
  testdesigner: "test_designer",
  adversarial_critic: "adversarial_critic",
  adversarialcritic: "adversarial_critic",
  research_collaborator: "hypothesis_generator",
};

/** Regex patterns for parsing subject lines */
const SUBJECT_PATTERNS = {
  kickoff: /^(KICKOFF:|\[[^\]]+\]\s+Brenner Loop kickoff\b)/i,
  delta: /^DELTA\[([^\]]+)\]:/i,
  tribunal: /^TRIBUNAL\[[^\]]+\]:/i,
  compiled: /^COMPILED:/i,
  critique: /^CRITIQUE:/i,
  ack: /^ACK:/i,
  claim: /^CLAIM:/i,
  handoff: /^HANDOFF:/i,
  blocked: /^BLOCKED:/i,
  question: /^QUESTION:/i,
  info: /^INFO:/i,
};

// ============================================================================
// Parsing Helpers
// ============================================================================

function normalizeDeltaTag(rawTag: string): string {
  return rawTag
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Extract the message type from a subject line.
 */
export function parseSubjectType(subject: string): {
  type:
    | "kickoff"
    | "delta"
    | "tribunal"
    | "compiled"
    | "critique"
    | "ack"
    | "claim"
    | "handoff"
    | "blocked"
    | "question"
    | "info"
    | "unknown";
  role?: BrennerRole;
  shorthand?: string;
} {
  const trimmed = subject.trim();

  // Check DELTA first (has role info)
  const deltaMatch = trimmed.match(SUBJECT_PATTERNS.delta);
  if (deltaMatch) {
    const shorthand = normalizeDeltaTag(deltaMatch[1]);
    const role = ROLE_SHORTHAND_MAP[shorthand];
    return { type: "delta", role, shorthand };
  }

  // Check other patterns
  for (const [type, pattern] of Object.entries(SUBJECT_PATTERNS)) {
    if (type === "delta") continue; // Already handled
    if (pattern.test(trimmed)) {
      return {
        type: type as
          | "kickoff"
          | "tribunal"
          | "compiled"
          | "critique"
          | "ack"
          | "claim"
          | "handoff"
          | "blocked"
          | "question"
          | "info",
      };
    }
  }

  return { type: "unknown" };
}

/**
 * Extract version number from COMPILED subject line.
 * Examples:
 *   "COMPILED: v3 artifact with contributions" → 3
 *   "COMPILED: Final version" → null
 */
export function extractVersion(subject: string): number | null {
  const match = subject.match(/v(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get the role of an agent based on their registered program.
 * Falls back to checking contributor patterns if program unknown.
 */
export function inferRoleFromProgram(program?: string): BrennerRole | null {
  if (!program) return null;
  const lower = program.toLowerCase();
  if (lower.includes("claude") || lower.includes("opus")) return "test_designer";
  if (lower.includes("codex") || lower.includes("gpt")) return "hypothesis_generator";
  if (lower.includes("gemini")) return "adversarial_critic";
  return null;
}

// ============================================================================
// Main Computation
// ============================================================================

/**
 * Compute comprehensive thread status from messages.
 *
 * @param messages - Array of messages from a thread (with or without bodies)
 * @param options - Optional configuration
 * @returns Computed thread status
 */
export function computeThreadStatus(
  messages: AgentMailMessage[],
  options?: {
    /** Expected roles that should respond (defaults to all three) */
    expectedRoles?: BrennerRole[];
  },
): ThreadStatus {
  const expectedRoles = options?.expectedRoles ?? [
    "hypothesis_generator",
    "test_designer",
    "adversarial_critic",
  ];

  // Initialize role status
  const roles: Record<BrennerRole, RoleStatus> = {
    hypothesis_generator: {
      completed: false,
      contributors: [],
      latestDelta: null,
      lastUpdated: null,
    },
    test_designer: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
    adversarial_critic: {
      completed: false,
      contributors: [],
      latestDelta: null,
      lastUpdated: null,
    },
  };

  // Track various message types
  let kickoff: AgentMailMessage | null = null;
  const kickoffMessages: AgentMailMessage[] = [];
  let latestCompiled: AgentMailMessage | null = null;
  const participants = new Set<string>();
  const compiledMessages: AgentMailMessage[] = [];

  let totalDeltas = 0;
  let totalCritiques = 0;
  let totalAcks = 0;

  // Get thread ID from first message (they should all have the same)
  const threadId = messages.length > 0 ? messages[0].thread_id : null;

  // Sort messages by timestamp for proper sequencing
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_ts).getTime() - new Date(b.created_ts).getTime(),
  );

  // Process each message
  for (const msg of sortedMessages) {
    // Track participant
    if (msg.from) {
      participants.add(msg.from);
    }

    const parsed = parseSubjectType(msg.subject);

    switch (parsed.type) {
      case "kickoff":
        // First KICKOFF is the session start
        if (!kickoff) {
          kickoff = msg;
        }
        kickoffMessages.push(msg);
        break;

      case "delta":
        totalDeltas++;
        if (parsed.role) {
          const roleStatus = roles[parsed.role];
          roleStatus.completed = true;
          if (msg.from && !roleStatus.contributors.includes(msg.from)) {
            roleStatus.contributors.push(msg.from);
          }
          // Update latest if this is newer
          if (
            !roleStatus.latestDelta ||
            new Date(msg.created_ts) > new Date(roleStatus.latestDelta.created_ts)
          ) {
            roleStatus.latestDelta = msg;
            roleStatus.lastUpdated = msg.created_ts;
          }
        }
        break;

      case "compiled":
        // Track all compiled messages for round counting
        compiledMessages.push(msg);
        // Track latest compiled (in case of multiple compilations)
        if (!latestCompiled || new Date(msg.created_ts) > new Date(latestCompiled.created_ts)) {
          latestCompiled = msg;
        }
        break;

      case "critique":
        totalCritiques++;
        break;

      case "ack":
        totalAcks++;
        break;
    }
  }

  // Compute pending acks (those who received KICKOFF but haven't acknowledged or replied).
  // NOTE: Agent Mail acknowledgements are not represented as thread messages, so we treat
  // any post-kickoff reply from a recipient as implicit acknowledgement.
  const awaitingFrom: string[] = [];
  const recipientKickoffTimes = new Map<string, { name: string; time: number }>();
  const normalizeAgentName = (name: string): string => name.trim().toLowerCase();
  for (const kickoffMessage of kickoffMessages) {
    if (!kickoffMessage.ack_required) continue;
    const kickoffTime = new Date(kickoffMessage.created_ts).getTime();
    const recipients = [
      ...(kickoffMessage.to ?? []),
      ...(kickoffMessage.cc ?? []),
      ...(kickoffMessage.bcc ?? []),
    ];
    for (const recipient of recipients) {
      const key = normalizeAgentName(recipient);
      if (!key) continue;
      const existing = recipientKickoffTimes.get(key);
      if (!existing || kickoffTime > existing.time) {
        recipientKickoffTimes.set(key, { name: recipient, time: kickoffTime });
      }
    }
  }

  for (const [recipientKey, kickoffEntry] of recipientKickoffTimes.entries()) {
    const hasReplyAfterKickoff = sortedMessages.some((m) => {
      if (!m.from) return false;
      return (
        normalizeAgentName(m.from) === recipientKey &&
        new Date(m.created_ts).getTime() > kickoffEntry.time
      );
    });
    if (!hasReplyAfterKickoff) {
      awaitingFrom.push(kickoffEntry.name);
    }
  }

  // Determine session phase
  let phase: SessionPhase;
  if (!kickoff) {
    phase = "not_started";
  } else if (latestCompiled) {
    // Check if there are critiques after compilation
    const compiledTime = new Date(latestCompiled.created_ts).getTime();
    const hasCritiqueAfter = sortedMessages.some(
      (m) =>
        parseSubjectType(m.subject).type === "critique" &&
        new Date(m.created_ts).getTime() > compiledTime,
    );
    phase = hasCritiqueAfter ? "in_critique" : "compiled";
  } else {
    // Check role completion
    const completedRoles = expectedRoles.filter((r) => roles[r].completed);
    if (completedRoles.length === 0) {
      phase = "awaiting_responses";
    } else if (completedRoles.length < expectedRoles.length) {
      phase = "partially_complete";
    } else {
      phase = "awaiting_compilation";
    }
  }

  // Compute if all expected roles are complete
  const isComplete = expectedRoles.every((r) => roles[r].completed);

  // Build artifact info
  let latestArtifact: ArtifactInfo | null = null;
  if (latestCompiled) {
    // Collect all contributors from DELTAs before this compilation
    const compiledTime = new Date(latestCompiled.created_ts).getTime();
    const contributors = sortedMessages
      .filter(
        (m): m is typeof m & { from: string } =>
          parseSubjectType(m.subject).type === "delta" &&
          new Date(m.created_ts).getTime() < compiledTime &&
          !!m.from,
      )
      .map((m) => m.from)
      .filter((v, i, a) => a.indexOf(v) === i); // unique

    latestArtifact = {
      message: latestCompiled,
      version: extractVersion(latestCompiled.subject),
      contributors,
      compiledAt: latestCompiled.created_ts,
    };
  }

  // Compute round information
  // Round = number of COMPILED messages (0 = before first compile, 1 = after v1 exists, etc.)
  const round = compiledMessages.length;

  // Find the boundary timestamp for "current round" messages
  // If no COMPILED yet, use KICKOFF time (or epoch if no kickoff)
  // If COMPILED exists, use the latest COMPILED time
  const roundBoundaryTime = latestCompiled
    ? new Date(latestCompiled.created_ts).getTime()
    : kickoff
      ? new Date(kickoff.created_ts).getTime()
      : 0;

  // Count DELTAs and CRITIQUEs in current round (after the boundary)
  const allowCritiques = latestCompiled !== null;
  let deltasInCurrentRound = 0;
  let critiquesInCurrentRound = 0;

  for (const msg of sortedMessages) {
    const msgTime = new Date(msg.created_ts).getTime();
    // Messages after the boundary (or all messages if no boundary)
    if (msgTime > roundBoundaryTime) {
      const msgType = parseSubjectType(msg.subject).type;
      if (msgType === "delta") {
        deltasInCurrentRound++;
      } else if (msgType === "critique" && allowCritiques) {
        critiquesInCurrentRound++;
      }
    }
  }

  return {
    threadId,
    phase,
    isComplete,
    roles,
    acks: {
      pendingAcks: awaitingFrom.length > 0 ? kickoffMessages.filter((msg) => msg.ack_required) : [],
      pendingCount: awaitingFrom.length,
      awaitingFrom,
    },
    latestArtifact,
    kickoff,
    messageCount: messages.length,
    round,
    deltasInCurrentRound,
    critiquesInCurrentRound,
    stats: {
      totalDeltas,
      totalCritiques,
      totalAcks,
      participants: Array.from(participants),
    },
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a human-readable summary of thread status.
 */
export function formatThreadStatusSummary(status: ThreadStatus): string {
  const lines: string[] = [];

  // Phase indicator
  const phaseEmoji: Record<SessionPhase, string> = {
    not_started: "⬜",
    awaiting_responses: "🟡",
    partially_complete: "🟠",
    awaiting_compilation: "🔵",
    compiled: "🟢",
    in_critique: "🟣",
    closed: "⬛",
  };

  lines.push(`${phaseEmoji[status.phase]} Thread: ${status.threadId ?? "(no thread)"}`);
  lines.push(`Phase: ${status.phase.replace(/_/g, " ")} | Round ${status.round}`);
  lines.push("");

  // Round info
  if (status.round > 0) {
    lines.push(
      `🔄 Round ${status.round} (${status.deltasInCurrentRound} new deltas, ${status.critiquesInCurrentRound} critiques)`,
    );
    lines.push("");
  }

  // Role completion
  lines.push("Roles:");
  for (const [role, roleStatus] of Object.entries(status.roles)) {
    const icon = roleStatus.completed ? "✅" : "⏳";
    const contributors =
      roleStatus.contributors.length > 0 ? ` (${roleStatus.contributors.join(", ")})` : "";
    lines.push(`  ${icon} ${role}${contributors}`);
  }
  lines.push("");

  // Pending acks
  const pendingCount = status.acks?.pendingCount ?? 0;
  const awaitingFrom = status.acks?.awaitingFrom ?? [];
  if (pendingCount > 0) {
    lines.push(`⚠️  Awaiting ACK from: ${awaitingFrom.join(", ")}`);
    lines.push("");
  }

  // Artifact info
  if (status.latestArtifact) {
    const version = status.latestArtifact.version ? `v${status.latestArtifact.version}` : "latest";
    const contributors = status.latestArtifact.contributors ?? [];
    const compiledAt = status.latestArtifact.compiledAt || "unknown";
    lines.push(`📄 Compiled artifact: ${version}`);
    lines.push(`   Contributors: ${contributors.join(", ")}`);
    lines.push(`   Compiled at: ${compiledAt}`);
    lines.push("");
  }

  // Stats
  const stats = status.stats ?? {
    totalDeltas: 0,
    totalCritiques: 0,
    totalAcks: 0,
    participants: [],
  };
  lines.push(
    `📊 Stats: ${stats.totalDeltas} deltas, ${stats.totalCritiques} critiques, ${status.messageCount} total messages`,
  );
  lines.push(`👥 Participants: ${stats.participants.join(", ")}`);

  return lines.join("\n");
}

/**
 * Check if a thread needs attention (pending acks or incomplete).
 */
export function threadNeedsAttention(status: ThreadStatus): boolean {
  return (
    status.acks.pendingCount > 0 ||
    (status.phase !== "compiled" && status.phase !== "closed" && status.phase !== "not_started")
  );
}

/**
 * Get roles that are still pending.
 */
export function getPendingRoles(status: ThreadStatus): BrennerRole[] {
  return (Object.entries(status.roles) as [BrennerRole, RoleStatus][])
    .filter(([, roleStatus]) => !roleStatus.completed)
    .map(([role]) => role);
}

// ============================================================================
// Thread-Level Convenience Functions
// ============================================================================

/**
 * Compute thread status from an AgentMailThread object.
 * Convenience wrapper for use with readThread() responses.
 */
export function computeThreadStatusFromThread(
  thread: AgentMailThread,
  options?: { expectedRoles?: BrennerRole[] },
): ThreadStatus {
  return computeThreadStatus(thread.messages, options);
}

/**
 * Compute a minimal status summary for display in list views.
 * Useful when full ThreadStatus is too heavy.
 */
export function computeThreadStatusSummary(
  messages: AgentMailMessage[],
  options?: { expectedRoles?: BrennerRole[] },
): {
  threadId: string | null;
  phase: SessionPhase;
  respondedRoleCount: number;
  totalRoleCount: number;
  pendingAcks: number;
  hasArtifact: boolean;
  isComplete: boolean;
  round: number;
  deltasInCurrentRound: number;
  critiquesInCurrentRound: number;
  summary: string;
} {
  const status = computeThreadStatus(messages, options);
  const expectedRoles = options?.expectedRoles ?? [
    "hypothesis_generator",
    "test_designer",
    "adversarial_critic",
  ];
  const respondedRoleCount = expectedRoles.filter((r) => status.roles[r].completed).length;

  const roundInfo = status.round > 0 ? ` | Round ${status.round}` : "";
  return {
    threadId: status.threadId,
    phase: status.phase,
    respondedRoleCount,
    totalRoleCount: expectedRoles.length,
    pendingAcks: status.acks.pendingCount,
    hasArtifact: status.latestArtifact !== null,
    isComplete: status.isComplete,
    round: status.round,
    deltasInCurrentRound: status.deltasInCurrentRound,
    critiquesInCurrentRound: status.critiquesInCurrentRound,
    summary: `${respondedRoleCount}/${expectedRoles.length} roles | Phase: ${status.phase.replace(/_/g, " ")}${roundInfo}${status.acks.pendingCount > 0 ? ` | ${status.acks.pendingCount} pending acks` : ""}`,
  };
}

/**
 * Check if a thread is waiting for a specific role to respond.
 */
export function isWaitingForRole(
  messages: AgentMailMessage[],
  role: BrennerRole,
  options?: { expectedRoles?: BrennerRole[] },
): boolean {
  const status = computeThreadStatus(messages, options);
  return !status.roles[role].completed;
}

/**
 * Get agents who have pending acknowledgements (were requested but haven't ACKed).
 */
export function getAgentsWithPendingAcks(messages: AgentMailMessage[]): string[] {
  const status = computeThreadStatus(messages);
  return status.acks.awaitingFrom;
}

/**
 * Get agents who haven't responded with a DELTA yet.
 * Note: Only tracks agents who have sent messages - doesn't know about invited agents
 * who haven't participated at all.
 */
export function getPendingAgents(messages: AgentMailMessage[]): string[] {
  const status = computeThreadStatus(messages);
  // Find participants who haven't contributed any DELTA
  const deltaContributors = new Set<string>();
  for (const roleStatus of Object.values(status.roles)) {
    for (const contributor of roleStatus.contributors) {
      deltaContributors.add(contributor);
    }
  }
  const participants = status.stats?.participants ?? [];
  return participants.filter((p) => !deltaContributors.has(p));
}

/**
 * Get messages that belong to the current round.
 *
 * For round 0: Returns all DELTA messages after KICKOFF (or all if no KICKOFF).
 * For round 1+: Returns all DELTA and CRITIQUE messages after the latest COMPILED.
 *
 * This is the core function for round-aware compilation - use it to get only
 * the deltas that should be merged for the next version.
 */
export function getMessagesInCurrentRound(messages: AgentMailMessage[]): AgentMailMessage[] {
  // Sort by timestamp
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_ts).getTime() - new Date(b.created_ts).getTime(),
  );

  // Find the boundary: latest COMPILED or KICKOFF (or epoch)
  let boundaryTime = 0;
  let hasCompiled = false;

  // First, find the latest COMPILED
  for (const msg of sortedMessages) {
    if (parseSubjectType(msg.subject).type === "compiled") {
      boundaryTime = new Date(msg.created_ts).getTime();
      hasCompiled = true;
    }
  }

  // If no COMPILED, use KICKOFF as boundary
  if (boundaryTime === 0) {
    for (const msg of sortedMessages) {
      if (parseSubjectType(msg.subject).type === "kickoff") {
        boundaryTime = new Date(msg.created_ts).getTime();
        break;
      }
    }
  }

  // Return messages after boundary with relevant types (DELTA or CRITIQUE)
  return sortedMessages.filter((msg) => {
    const msgTime = new Date(msg.created_ts).getTime();
    if (msgTime <= boundaryTime) return false;

    const msgType = parseSubjectType(msg.subject).type;
    if (msgType === "delta") return true;
    return hasCompiled && msgType === "critique";
  });
}

/**
 * Get only DELTA messages for the current round (for compilation).
 * Note: this function returns only messages whose subject parses as `DELTA[...]`.
 */
export function getDeltaMessagesForCurrentRound(messages: AgentMailMessage[]): AgentMailMessage[] {
  return getMessagesInCurrentRound(messages).filter(
    (msg) => parseSubjectType(msg.subject).type === "delta",
  );
}
