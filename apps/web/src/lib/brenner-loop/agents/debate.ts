/**
 * Agent Debate Module
 *
 * Implements multi-round adversarial dialogue between tribunal agents.
 * Enables Oxford-style debates, Socratic questioning, and steel-manning contests.
 *
 * Key insight: Single-round responses are shallow. Debate sharpens arguments
 * through opposition, reveals weaknesses in real-time, and produces refined
 * experimental designs.
 *
 * @module brenner-loop/agents/debate
 * @see brenner_bot-xlk2.7 (Agent Debate Mode feature)
 */

import type { HypothesisCard } from "../hypothesis";
import { getPersona } from "./agent-personas";
import type { OperatorResults } from "./dispatch";
import { formatHypothesisForPrompt, formatOperatorResultsForPrompt } from "./dispatch";
import type { TribunalAgentRole } from "./index";

// ============================================================================
// Types
// ============================================================================

/**
 * Available debate formats
 */
export type DebateFormat =
  | "oxford_style" // Proposition vs Opposition with Judge
  | "socratic" // Probing questions reveal weaknesses
  | "steelman_contest"; // Each agent builds and attacks strongest version

/**
 * Status of an agent debate
 */
export type DebateStatus =
  | "not_started" // Debate created but not begun
  | "in_progress" // Actively exchanging rounds
  | "concluded" // Debate finished with conclusion
  | "timed_out"; // Debate exceeded max rounds or time

/**
 * Analysis extracted from a debate round
 */
export interface RoundAnalysis {
  /** New arguments or points introduced */
  newPointsMade: string[];
  /** Objections raised against previous statements */
  objectionsRaised: string[];
  /** Concessions or agreements with opponents */
  concessionsGiven: string[];
  /** Key quotes for extraction */
  keyQuotes: string[];
}

/**
 * A single round in the debate
 */
export interface DebateRound {
  /** Round number (1-indexed) */
  number: number;
  /** The agent speaking this round */
  speaker: TribunalAgentRole;
  /** The content of this round's statement */
  content: string;
  /** Agent Mail message ID for this round */
  messageId?: number;
  /** Which previous round this replies to (if any) */
  replyingTo?: number;
  /** When this round was recorded */
  recordedAt: string;
  /** Analysis of this round's contribution */
  analysis?: RoundAnalysis;
}

/**
 * Conclusion generated after debate concludes
 */
export interface DebateConclusion {
  /** Points all agents agreed on */
  consensus: string[];
  /** Genuine disagreements that remain */
  unresolved: string[];
  /** The most important takeaway from the debate */
  keyInsight: string;
  /** The strongest arguments made during debate */
  winningArguments: string[];
  /** Summary of the debate */
  summary: string;
  /** When conclusion was generated */
  generatedAt: string;
}

/**
 * User-injected question or challenge during debate
 */
export interface UserInjection {
  /** The question or challenge */
  content: string;
  /** Which agent should respond (or "all") */
  targetAgent: TribunalAgentRole | "all";
  /** When injected */
  injectedAt: string;
  /** Round number where injection occurs */
  afterRound: number;
}

/**
 * Full debate state
 */
export interface AgentDebate {
  /** Unique identifier */
  id: string;
  /** Session this debate belongs to */
  sessionId: string;
  /** The topic being debated */
  topic: string;
  /** The hypothesis under discussion */
  hypothesis: HypothesisCard;
  /** Operator results for context */
  operatorResults: OperatorResults;
  /** Debate format being used */
  format: DebateFormat;
  /** Participating agents */
  participants: TribunalAgentRole[];
  /** Moderator agent (or 'system') */
  moderator: TribunalAgentRole | "system";
  /** Agent Mail thread ID */
  threadId: string;
  /** All rounds in the debate */
  rounds: DebateRound[];
  /** Maximum allowed rounds */
  maxRounds: number;
  /** User injections during debate */
  userInjections: UserInjection[];
  /** Current debate status */
  status: DebateStatus;
  /** Final conclusion (if concluded) */
  conclusion?: DebateConclusion;
  /** When debate was created */
  createdAt: string;
  /** When debate was last updated */
  updatedAt: string;
}

/**
 * Options for creating a new debate
 */
export interface CreateDebateOptions {
  /** Session ID */
  sessionId: string;
  /** Hypothesis to debate */
  hypothesis: HypothesisCard;
  /** Operator results for context */
  operatorResults?: OperatorResults;
  /** Debate format (default: oxford_style) */
  format?: DebateFormat;
  /** Topic/motion for the debate */
  topic?: string;
  /** Participating agents (default: format-dependent) */
  participants?: TribunalAgentRole[];
  /** Moderator (default: format-dependent) */
  moderator?: TribunalAgentRole | "system";
  /** Maximum rounds (default: 5) */
  maxRounds?: number;
}

/**
 * Configuration for debate formats
 */
export interface DebateFormatConfig {
  /** Display name */
  name: string;
  /** Description of the format */
  description: string;
  /** Default participants for this format */
  defaultParticipants: TribunalAgentRole[];
  /** Default moderator */
  defaultModerator: TribunalAgentRole | "system";
  /** Recommended max rounds */
  recommendedMaxRounds: number;
  /** Speaking order pattern */
  speakingOrder: "alternating" | "round_robin" | "moderated";
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Configuration for each debate format
 */
export const DEBATE_FORMAT_CONFIGS: Record<DebateFormat, DebateFormatConfig> = {
  oxford_style: {
    name: "Oxford-Style Debate",
    description: "Proposition argues for, Opposition argues against, Judge evaluates",
    defaultParticipants: ["experiment_designer", "devils_advocate"],
    defaultModerator: "brenner_channeler",
    recommendedMaxRounds: 6,
    speakingOrder: "alternating",
  },
  socratic: {
    name: "Socratic Questioning",
    description: "Probing questions reveal weak points through dialogue",
    defaultParticipants: ["devils_advocate", "experiment_designer", "statistician"],
    defaultModerator: "brenner_channeler",
    recommendedMaxRounds: 8,
    speakingOrder: "moderated",
  },
  steelman_contest: {
    name: "Steel-Manning Contest",
    description: "Each agent builds the strongest version, then attacks it",
    defaultParticipants: ["devils_advocate", "experiment_designer"],
    defaultModerator: "system",
    recommendedMaxRounds: 4,
    speakingOrder: "round_robin",
  },
};

/**
 * Subject prefix for debate messages
 */
export const DEBATE_SUBJECT_PREFIX = "DEBATE[";

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate a unique debate ID
 */
export function generateDebateId(sessionId: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `DEBATE-${sessionId}-${crypto.randomUUID().slice(0, 8)}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const rnd = new Uint32Array(1);
    crypto.getRandomValues(rnd);
    // Use first 32 bits for randomness
    const randomHex = rnd[0].toString(16).toUpperCase().padStart(8, "0");
    return `DEBATE-${sessionId}-${randomHex}`;
  }

  // Fallback for very old environments (unlikely in this stack)
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEBATE-${sessionId}-${timestamp}-${random}`;
}

/**
 * Generate a thread ID for a debate
 */
export function generateDebateThreadId(debateId: string): string {
  return `${debateId}-THREAD`;
}

/**
 * Create a new agent debate
 */
export function createDebate(options: CreateDebateOptions): AgentDebate {
  const format = options.format ?? "oxford_style";
  const formatConfig = DEBATE_FORMAT_CONFIGS[format];

  const debateId = generateDebateId(options.sessionId);

  // Generate topic from hypothesis if not provided
  const topic = options.topic ?? generateDefaultTopic(options.hypothesis, format);

  return {
    id: debateId,
    sessionId: options.sessionId,
    topic,
    hypothesis: options.hypothesis,
    operatorResults: options.operatorResults ?? {},
    format,
    participants: options.participants ?? formatConfig.defaultParticipants,
    moderator: options.moderator ?? formatConfig.defaultModerator,
    threadId: generateDebateThreadId(debateId),
    rounds: [],
    maxRounds: options.maxRounds ?? formatConfig.recommendedMaxRounds,
    userInjections: [],
    status: "not_started",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a default debate topic from hypothesis
 */
export function generateDefaultTopic(hypothesis: HypothesisCard, format: DebateFormat): string {
  switch (format) {
    case "oxford_style":
      return `Motion: "${hypothesis.statement}" is a testable, falsifiable hypothesis`;
    case "socratic":
      return `Examining the foundations of: ${hypothesis.statement}`;
    case "steelman_contest":
      return `Strongest case for and against: ${hypothesis.statement}`;
    default:
      return hypothesis.statement;
  }
}

/**
 * Get the next speaker in the debate based on format
 */
export function getNextSpeaker(debate: AgentDebate): TribunalAgentRole | null {
  if (debate.status !== "not_started" && debate.status !== "in_progress") {
    return null;
  }

  if (debate.rounds.length >= debate.maxRounds) {
    return null;
  }

  const formatConfig = DEBATE_FORMAT_CONFIGS[debate.format];
  const roundNum = debate.rounds.length;

  switch (formatConfig.speakingOrder) {
    case "alternating": {
      // Alternate between first two participants
      const speakerIndex = roundNum % 2;
      return debate.participants[speakerIndex] ?? null;
    }
    case "round_robin": {
      // Cycle through all participants
      const speakerIndex = roundNum % debate.participants.length;
      return debate.participants[speakerIndex] ?? null;
    }
    case "moderated": {
      // For Socratic, moderator asks questions, others respond
      if (debate.moderator !== "system" && roundNum % 2 === 0) {
        return debate.moderator;
      }
      // Non-moderator participants take turns responding
      const respondentIndex = Math.floor(roundNum / 2) % debate.participants.length;
      return debate.participants[respondentIndex] ?? null;
    }
    default:
      return debate.participants[0] ?? null;
  }
}

/**
 * Build the opening prompt for a debate
 */
export function buildDebateOpeningPrompt(debate: AgentDebate, speaker: TribunalAgentRole): string {
  const persona = getPersona(speaker);
  const formatConfig = DEBATE_FORMAT_CONFIGS[debate.format];
  const hypothesisContext = formatHypothesisForPrompt(debate.hypothesis);
  const operatorContext = formatOperatorResultsForPrompt(debate.operatorResults);

  const parts: string[] = [
    `# ${formatConfig.name} - Opening Statement`,
    "",
    `**Topic**: ${debate.topic}`,
    "",
    `**Your Role**: ${persona.displayName}`,
    "",
    `**Format**: ${formatConfig.description}`,
    "",
    "---",
    "",
    hypothesisContext,
  ];

  if (operatorContext.trim()) {
    parts.push("---", "", operatorContext);
  }

  parts.push(
    "---",
    "",
    "## Your Task",
    "",
    getOpeningInstructions(debate.format, speaker, debate.participants),
    "",
    "Provide your opening statement. Be specific, challenging, and substantive.",
    "",
    "**Important**: Structure your response with clear points that can be responded to.",
    "",
  );

  return parts.join("\n");
}

/**
 * Build a follow-up prompt for a debate round
 */
export function buildDebateFollowUpPrompt(
  debate: AgentDebate,
  speaker: TribunalAgentRole,
  previousRounds: DebateRound[],
): string {
  const persona = getPersona(speaker);
  const roundNum = previousRounds.length + 1;

  const parts: string[] = [
    `# ${DEBATE_FORMAT_CONFIGS[debate.format].name} - Round ${roundNum}`,
    "",
    `**Topic**: ${debate.topic}`,
    "",
    `**Your Role**: ${persona.displayName}`,
    "",
    "---",
    "",
    "## Previous Rounds",
    "",
  ];

  // Include previous rounds for context
  for (const round of previousRounds) {
    const roundPersona = getPersona(round.speaker);
    parts.push(`### Round ${round.number} - ${roundPersona.displayName}`, "", round.content, "");
  }

  parts.push(
    "---",
    "",
    "## Your Task",
    "",
    getFollowUpInstructions(debate.format, speaker, previousRounds),
    "",
    "Respond directly to the previous statements. Be specific about what you agree with, disagree with, or want to challenge.",
    "",
  );

  return parts.join("\n");
}

/**
 * Get opening instructions based on format and role
 */
function getOpeningInstructions(
  format: DebateFormat,
  speaker: TribunalAgentRole,
  participants: TribunalAgentRole[],
): string {
  const isFirst = participants[0] === speaker;

  switch (format) {
    case "oxford_style":
      if (isFirst) {
        return `As the **Proposition**, make the strongest case FOR the motion. Present your key arguments clearly.`;
      }
      return `As the **Opposition**, make the strongest case AGAINST the motion. Challenge the proposition's assumptions.`;

    case "socratic":
      if (speaker === "brenner_channeler") {
        return `As the **Questioner**, pose probing questions that reveal assumptions, gaps, or weaknesses in the hypothesis. Do not argue - only ask questions.`;
      }
      return `Respond to the Brenner Channeler's questions thoughtfully and honestly. If a question reveals a weakness, acknowledge it.`;

    case "steelman_contest":
      return `First, present the **strongest possible version** of the hypothesis - the steelman. Then, identify the **most devastating** critique of your own steelman.`;

    default:
      return `Present your analysis of the hypothesis.`;
  }
}

/**
 * Get follow-up instructions based on format and context
 */
function getFollowUpInstructions(
  format: DebateFormat,
  speaker: TribunalAgentRole,
  previousRounds: DebateRound[],
): string {
  const lastRound = previousRounds[previousRounds.length - 1];

  switch (format) {
    case "oxford_style":
      return `Respond to ${getPersona(lastRound?.speaker ?? speaker).displayName}'s arguments. Address their strongest points directly. Do not concede without good reason, but acknowledge valid criticisms.`;

    case "socratic":
      if (speaker === "brenner_channeler") {
        return `Based on the responses so far, ask a follow-up question that probes deeper. If they've conceded a point, explore its implications. If they've defended, find another angle.`;
      }
      return `Answer the question directly. If it exposes a real weakness, acknowledge it and explain what it would take to address it.`;

    case "steelman_contest":
      return `Respond to your opponent's steelman and critique. Can you find flaws in their strongest version? Can you defend against their critique of yours?`;

    default:
      return `Continue the dialogue, responding to what was said.`;
  }
}

/**
 * Add a round to the debate
 */
export function addRound(
  debate: AgentDebate,
  round: Omit<DebateRound, "number" | "recordedAt">,
): AgentDebate {
  const newRound: DebateRound = {
    ...round,
    number: debate.rounds.length + 1,
    recordedAt: new Date().toISOString(),
  };

  const updatedDebate: AgentDebate = {
    ...debate,
    rounds: [...debate.rounds, newRound],
    status: debate.status === "not_started" ? "in_progress" : debate.status,
    updatedAt: new Date().toISOString(),
  };

  // Check if we've reached max rounds
  if (updatedDebate.rounds.length >= updatedDebate.maxRounds) {
    return {
      ...updatedDebate,
      status: "in_progress", // Will be concluded by concludeDebate
    };
  }

  return updatedDebate;
}

/**
 * Add a user injection to the debate
 */
export function addUserInjection(
  debate: AgentDebate,
  content: string,
  targetAgent: TribunalAgentRole | "all" = "all",
): AgentDebate {
  const injection: UserInjection = {
    content,
    targetAgent,
    injectedAt: new Date().toISOString(),
    afterRound: debate.rounds.length,
  };

  return {
    ...debate,
    userInjections: [...debate.userInjections, injection],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Analyze a debate round to extract key elements
 */
export function analyzeRound(round: DebateRound): RoundAnalysis {
  const analysis: RoundAnalysis = {
    newPointsMade: [],
    objectionsRaised: [],
    concessionsGiven: [],
    keyQuotes: [],
  };

  // Extract sentences for analysis
  const sentences = round.content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    // Detect objections
    if (
      lower.includes("however") ||
      lower.includes("but ") ||
      lower.includes("disagree") ||
      lower.includes("challenge") ||
      lower.includes("flaw") ||
      lower.includes("problem with") ||
      lower.includes("doesn't account") ||
      lower.includes("fails to")
    ) {
      analysis.objectionsRaised.push(sentence);
    }

    // Detect concessions
    if (
      lower.includes("agree") ||
      lower.includes("valid point") ||
      lower.includes("concede") ||
      lower.includes("you're right") ||
      lower.includes("fair criticism") ||
      lower.includes("acknowledge")
    ) {
      analysis.concessionsGiven.push(sentence);
    }

    // Detect new points (assertions, proposals)
    if (
      lower.includes("propose") ||
      lower.includes("suggest") ||
      lower.includes("argue that") ||
      lower.includes("therefore") ||
      lower.includes("key point") ||
      lower.includes("importantly")
    ) {
      analysis.newPointsMade.push(sentence);
    }
  }

  // Extract key quotes (first sentence of each markdown list item)
  const bulletPoints = round.content.match(/^[-*]\s+(.+)$/gm);
  if (bulletPoints) {
    analysis.keyQuotes.push(...bulletPoints.slice(0, 5).map((b) => b.replace(/^[-*]\s+/, "")));
  }

  return analysis;
}

/**
 * Generate a debate conclusion from completed rounds
 */
export function generateConclusion(debate: AgentDebate): DebateConclusion {
  const allAnalyses = debate.rounds.map((round) => ({
    round,
    analysis: round.analysis ?? analyzeRound(round),
  }));

  // Collect all objections and concessions
  const allObjections = allAnalyses.flatMap((a) => a.analysis.objectionsRaised);
  const allConcessions = allAnalyses.flatMap((a) => a.analysis.concessionsGiven);
  const allPoints = allAnalyses.flatMap((a) => a.analysis.newPointsMade);

  // Find consensus (points that weren't objected to or were conceded)
  const consensus: string[] = [];
  const unresolved: string[] = [];

  // Simple heuristic: if a point was made and later conceded by opponent, it's consensus
  for (const concession of allConcessions.slice(0, 3)) {
    if (concession.length > 10) {
      consensus.push(concession);
    }
  }

  // Unresolved are objections that weren't addressed
  for (const objection of allObjections.slice(0, 3)) {
    if (objection.length > 10) {
      unresolved.push(objection);
    }
  }

  // Winning arguments are the most substantive new points
  const winningArguments = allPoints.filter((p) => p.length > 50).slice(0, 3);

  // Generate key insight
  const keyInsight = generateKeyInsight(debate, allAnalyses);

  // Generate summary
  const summary = `${debate.format === "oxford_style" ? "Oxford-style debate" : debate.format === "socratic" ? "Socratic examination" : "Steel-manning contest"} on "${debate.topic}" with ${debate.rounds.length} rounds. ${consensus.length} points of consensus, ${unresolved.length} unresolved disagreements.`;

  return {
    consensus,
    unresolved,
    keyInsight,
    winningArguments,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate the key insight from a debate
 */
function generateKeyInsight(
  debate: AgentDebate,
  analyses: Array<{ round: DebateRound; analysis: RoundAnalysis }>,
): string {
  // Look for the most impactful objection or concession
  const allContent = analyses.map((a) => a.round.content).join(" ");

  // Simple heuristic: find sentences with "key", "crucial", "important", "fundamental"
  const impactfulMatches = allContent.match(
    /[^.!?]*(?:key|crucial|important|fundamental|critical)[^.!?]*[.!?]/gi,
  );

  if (impactfulMatches && impactfulMatches.length > 0) {
    return impactfulMatches[0]!.trim();
  }

  // Fallback: use the topic and round count
  return `After ${debate.rounds.length} rounds of debate, the key question remains: ${debate.topic}`;
}

/**
 * Conclude a debate and generate final analysis
 */
export function concludeDebate(debate: AgentDebate): AgentDebate {
  const conclusion = generateConclusion(debate);

  return {
    ...debate,
    status: "concluded",
    conclusion,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if debate should auto-conclude
 */
export function shouldConclude(debate: AgentDebate): boolean {
  // Already concluded or timed out
  if (debate.status === "concluded" || debate.status === "timed_out") {
    return false;
  }

  // Reached max rounds
  if (debate.rounds.length >= debate.maxRounds) {
    return true;
  }

  // Check for natural conclusion (repeated concessions or agreement)
  if (debate.rounds.length >= 3) {
    const recentRounds = debate.rounds.slice(-3);
    const concessionCount = recentRounds.reduce((count, round) => {
      const analysis = round.analysis ?? analyzeRound(round);
      return count + analysis.concessionsGiven.length;
    }, 0);

    // If lots of concessions, debate has reached natural end
    if (concessionCount >= 4) {
      return true;
    }
  }

  return false;
}

/**
 * Get debate status summary
 */
export function getDebateStatus(debate: AgentDebate): {
  roundsCompleted: number;
  maxRounds: number;
  currentSpeaker: TribunalAgentRole | null;
  participantStats: Record<
    TribunalAgentRole,
    { rounds: number; objections: number; concessions: number }
  >;
  readyToConclude: boolean;
} {
  const currentSpeaker = getNextSpeaker(debate);
  const readyToConclude = shouldConclude(debate);

  const participantStats: Record<
    TribunalAgentRole,
    { rounds: number; objections: number; concessions: number }
  > = {} as Record<TribunalAgentRole, { rounds: number; objections: number; concessions: number }>;

  for (const participant of debate.participants) {
    participantStats[participant] = { rounds: 0, objections: 0, concessions: 0 };
  }

  for (const round of debate.rounds) {
    const stats = participantStats[round.speaker];
    if (stats) {
      stats.rounds++;
      const analysis = round.analysis ?? analyzeRound(round);
      stats.objections += analysis.objectionsRaised.length;
      stats.concessions += analysis.concessionsGiven.length;
    }
  }

  return {
    roundsCompleted: debate.rounds.length,
    maxRounds: debate.maxRounds,
    currentSpeaker,
    participantStats,
    readyToConclude,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid DebateFormat
 */
export function isDebateFormat(value: unknown): value is DebateFormat {
  return (
    typeof value === "string" &&
    (value === "oxford_style" || value === "socratic" || value === "steelman_contest")
  );
}

/**
 * Check if a value is a valid DebateStatus
 */
export function isDebateStatus(value: unknown): value is DebateStatus {
  return (
    typeof value === "string" &&
    (value === "not_started" ||
      value === "in_progress" ||
      value === "concluded" ||
      value === "timed_out")
  );
}

/**
 * Check if a value is a valid AgentDebate
 */
export function isAgentDebate(value: unknown): value is AgentDebate {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    typeof obj.sessionId === "string" &&
    typeof obj.topic === "string" &&
    isDebateFormat(obj.format) &&
    Array.isArray(obj.participants) &&
    Array.isArray(obj.rounds) &&
    isDebateStatus(obj.status)
  );
}
