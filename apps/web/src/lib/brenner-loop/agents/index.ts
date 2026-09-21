/**
 * Agent Prompts Module
 *
 * This module provides the system prompts for the multi-agent tribunal system.
 * Each agent has a distinct role in evaluating and refining hypotheses.
 *
 * @module brenner-loop/agents
 */

// ============================================================================
// Agent Role Types
// ============================================================================

/**
 * The available agent roles in the tribunal system
 */
export type TribunalAgentRole =
  | "devils_advocate"
  | "experiment_designer"
  | "statistician"
  | "brenner_channeler"
  | "synthesis";

/**
 * Configuration for a tribunal agent
 */
export interface TribunalAgentConfig {
  /** Unique identifier for the role */
  role: TribunalAgentRole;
  /** Display name for UI */
  displayName: string;
  /** Short description of the agent's purpose */
  description: string;
  /** Emoji icon for the agent */
  icon: string;
  /** Color theme for UI (Tailwind color) */
  color: string;
  /** Path to the prompt markdown file */
  promptPath: string;
}

// ============================================================================
// Agent Configurations
// ============================================================================

/**
 * Configuration for all tribunal agents
 */
export const TRIBUNAL_AGENTS: Record<TribunalAgentRole, TribunalAgentConfig> = {
  devils_advocate: {
    role: "devils_advocate",
    displayName: "Devil's Advocate",
    description: "Finds holes, steelmans alternatives, challenges assumptions",
    icon: "\u{1F534}", // Red circle
    color: "red",
    promptPath: "prompts/devils-advocate.md",
  },
  experiment_designer: {
    role: "experiment_designer",
    displayName: "Experiment Designer",
    description: "Proposes concrete, feasible study protocols",
    icon: "\u{1F7E2}", // Green circle
    color: "green",
    promptPath: "prompts/experiment-designer.md",
  },
  statistician: {
    role: "statistician",
    displayName: "Statistician",
    description: "Provides quantitative rigor (effect sizes, power, uncertainty)",
    icon: "\u{1F4CA}", // Bar chart
    color: "blue",
    promptPath: "prompts/statistician.md",
  },
  brenner_channeler: {
    role: "brenner_channeler",
    displayName: "Brenner Channeler",
    description: "Channels Sydney Brenner's voice and thinking style",
    icon: "\u{1F7E1}", // Yellow circle
    color: "yellow",
    promptPath: "prompts/brenner-channeler.md",
  },
  synthesis: {
    role: "synthesis",
    displayName: "Synthesis",
    description: "Integrates agent outputs into coherent assessment",
    icon: "\u{26A1}", // Lightning
    color: "purple",
    promptPath: "prompts/synthesis.md",
  },
};

// ============================================================================
// Prompt Loading
// ============================================================================

/**
 * Cache for loaded prompts
 */
const promptCache: Map<TribunalAgentRole, string> = new Map();
const ROLE_PROMPTS_SPEC_PATH = "specs/role_prompts_v0.1.md";
const ROLE_PROMPT_START_PREFIX = "<!-- BRENNER_ROLE_PROMPT_START ";
const ROLE_PROMPT_END_PREFIX = "<!-- BRENNER_ROLE_PROMPT_END ";
let rolePromptsSpecCache: string | null | undefined;

/**
 * Mapping from internal role names to spec marker names.
 * The spec file uses different naming conventions than the internal API.
 * Roles without matching prompts in the spec will fall back to placeholders.
 */
const ROLE_TO_SPEC_KEY: Record<TribunalAgentRole, string> = {
  devils_advocate: "adversarial_critic",
  experiment_designer: "test_designer",
  statistician: "statistician",
  brenner_channeler: "brenner_channeler",
  synthesis: "synthesis",
};

/**
 * Load a prompt file for an agent role.
 * In a browser environment, this fetches from the public directory.
 * In a Node environment, this reads from the filesystem.
 *
 * @param role - The agent role to load the prompt for
 * @returns The prompt content as a string
 */
export async function loadPrompt(role: TribunalAgentRole): Promise<string> {
  // Check cache first
  const cached = promptCache.get(role);
  if (cached) {
    return cached;
  }

  const config = TRIBUNAL_AGENTS[role];
  if (!config) {
    throw new Error(`Unknown agent role: ${role}`);
  }

  // For now, we'll return placeholder content
  // In production, this would fetch from the filesystem or API
  const prompt = await fetchPromptContent(config.promptPath, role);
  promptCache.set(role, prompt);
  return prompt;
}

/**
 * Fetch prompt content from the appropriate source.
 *
 * Loads role prompt blocks from the role_prompts spec if available.
 * Falls back to a placeholder containing promptPath when missing.
 */
async function fetchPromptContent(promptPath: string, role: TribunalAgentRole): Promise<string> {
  const spec = await readRolePromptsSpecMarkdown();
  if (spec) {
    const { start, end } = rolePromptMarkers(role);
    const extracted = extractBetweenMarkers(spec, start, end);
    if (extracted) return extracted;
  }

  return `[Prompt at: ${promptPath}]`;
}

function rolePromptMarkers(role: TribunalAgentRole): { start: string; end: string } {
  const specKey = ROLE_TO_SPEC_KEY[role];
  return {
    start: `${ROLE_PROMPT_START_PREFIX}${specKey} -->`,
    end: `${ROLE_PROMPT_END_PREFIX}${specKey} -->`,
  };
}

function extractBetweenMarkers(
  markdown: string,
  startMarker: string,
  endMarker: string,
): string | null {
  const start = markdown.indexOf(startMarker);
  if (start === -1) return null;
  const from = start + startMarker.length;
  const end = markdown.indexOf(endMarker, from);
  if (end === -1) return null;
  return markdown.slice(from, end).trim();
}

async function readRolePromptsSpecMarkdown(): Promise<string | null> {
  if (rolePromptsSpecCache !== undefined) return rolePromptsSpecCache;

  if (typeof window === "undefined") {
    rolePromptsSpecCache = await readRolePromptsSpecFromFilesystem();
    return rolePromptsSpecCache;
  }

  rolePromptsSpecCache = await readRolePromptsSpecFromPublic();
  return rolePromptsSpecCache;
}

async function readRolePromptsSpecFromPublic(): Promise<string | null> {
  if (typeof fetch !== "function") return null;

  const url = `/_corpus/${ROLE_PROMPTS_SPEC_PATH}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function readRolePromptsSpecFromFilesystem(): Promise<string | null> {
  const [{ access, readFile }, { resolve }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);

  const candidates = [
    resolve(process.cwd(), ROLE_PROMPTS_SPEC_PATH),
    resolve(process.cwd(), "public/_corpus", ROLE_PROMPTS_SPEC_PATH),
    resolve(process.cwd(), "../..", ROLE_PROMPTS_SPEC_PATH),
  ];

  for (const path of candidates) {
    try {
      await access(path);
      return await readFile(path, "utf8");
    } catch {
      // Keep searching
    }
  }

  return null;
}

/**
 * Clear the prompt cache (useful for development)
 */
export function clearPromptCache(): void {
  promptCache.clear();
  rolePromptsSpecCache = undefined;
}

// ============================================================================
// Agent Order & Display
// ============================================================================

/**
 * The order in which agents should be invoked for a tribunal session
 */
export const TRIBUNAL_ORDER: readonly TribunalAgentRole[] = [
  "devils_advocate",
  "experiment_designer",
  "statistician",
  "brenner_channeler",
  "synthesis",
] as const;

/**
 * Get display information for all agents in tribunal order
 */
export function getTribunalAgentsInOrder(): TribunalAgentConfig[] {
  return TRIBUNAL_ORDER.map((role) => TRIBUNAL_AGENTS[role]);
}

/**
 * Get a specific agent's configuration
 */
export function getAgentConfig(role: TribunalAgentRole): TribunalAgentConfig | undefined {
  return TRIBUNAL_AGENTS[role];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * All valid tribunal agent role values (derived from TRIBUNAL_AGENTS keys)
 */
const VALID_TRIBUNAL_ROLES = Object.keys(TRIBUNAL_AGENTS) as TribunalAgentRole[];

/**
 * Check if a string is a valid tribunal agent role
 */
export function isTribunalAgentRole(value: unknown): value is TribunalAgentRole {
  return typeof value === "string" && VALID_TRIBUNAL_ROLES.includes(value as TribunalAgentRole);
}

// ============================================================================
// Agent Personas (beads njiu, oytk)
// ============================================================================

export type {
  // Behavior & interaction types
  AgentBehavior,
  // Main persona type
  AgentPersona,
  InteractionPattern,
  InvocationTrigger,
  ModelConfig,
  // Phase & invocation types
  PersonaPhaseGroup,
  SessionPhase, // Deprecated alias for PersonaPhaseGroup
  ToneCalibration,
} from "./agent-personas";

export {
  // Registry
  AGENT_PERSONAS,
  BRENNER_CHANNELER_PERSONA,
  buildSystemPromptContext,
  // Individual personas
  DEVILS_ADVOCATE_PERSONA,
  EXPERIMENT_DESIGNER_PERSONA,
  getActivePersonasForPhase,
  getBehaviorsByPriority,
  getInteractionExamples,
  getModelConfig,
  // Utility functions
  getPersona,
  getPersonasForTrigger,
  // Phase mapping
  mapSessionPhaseToPersonaGroup,
  STATISTICIAN_PERSONA,
  SYNTHESIS_PERSONA,
  shouldInvokePersona,
} from "./agent-personas";

// ============================================================================
// Agent Dispatch (bead xlk2.2)
// ============================================================================

export type {
  AgentDispatch,
  AgentTask,
  // Task types
  AgentTaskStatus,
  CreateDispatchOptions,
  OperatorResults,
  PollOptions,
  TribunalAgentResponse,
} from "./dispatch";

export {
  buildAgentPrompt,
  checkAgentAvailability,
  // Core functions
  createDispatch,
  // Constants
  DEFAULT_DISPATCH_ROLES,
  DISPATCH_SUBJECT_PREFIX,
  dispatchAgentTask,
  dispatchAllTasks,
  FALLBACK_BRENNER_QUOTES,
  formatHypothesisForPrompt,
  formatOperatorResultsForPrompt,
  generateThreadId,
  getDispatchStatus,
  getFallbackContent,
  pollForResponses,
} from "./dispatch";

// ============================================================================
// Heuristic Synthesis (bead xlk2.4)
// ============================================================================

export type {
  AppliedPrinciple,
  ConflictPoint,
  ConsensusPoint,
  Recommendation,
  RecommendationPriority,
  SynthesisInputResponse,
  SynthesisOptions,
  SynthesisResult,
  SynthesisStrength,
} from "./synthesis";

export { synthesizeResponses } from "./synthesis";

// ============================================================================
// Agent Debate Mode (bead xlk2.7)
// ============================================================================

export type {
  AgentDebate,
  CreateDebateOptions,
  DebateConclusion,
  DebateFormat,
  DebateFormatConfig,
  DebateRound,
  DebateStatus,
  RoundAnalysis,
  UserInjection,
} from "./debate";

export {
  addRound,
  addUserInjection,
  analyzeRound,
  buildDebateFollowUpPrompt,
  buildDebateOpeningPrompt,
  concludeDebate,
  createDebate,
  DEBATE_FORMAT_CONFIGS,
  DEBATE_SUBJECT_PREFIX,
  generateConclusion,
  generateDebateId,
  generateDebateThreadId,
  generateDefaultTopic,
  getDebateStatus,
  getNextSpeaker,
  isAgentDebate,
  isDebateFormat,
  isDebateStatus,
  shouldConclude,
} from "./debate";
