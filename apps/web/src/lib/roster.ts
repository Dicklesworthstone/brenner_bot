/**
 * Agent Roster Schema
 *
 * Maps Agent Mail identity names to Brenner Protocol roles.
 * See: specs/agent_roster_schema_v0.1.md
 *
 * @example
 * ```typescript
 * const roster: Roster = {
 *   mode: "role_separated",
 *   entries: [
 *     { agentName: "BlueLake", role: "hypothesis_generator", program: "codex-cli" },
 *     { agentName: "PurpleMountain", role: "test_designer", program: "claude-code" },
 *   ],
 * };
 *
 * const result = validateRoster(roster);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

/** The three canonical roles in the Brenner Protocol */
export type AgentRole = "hypothesis_generator" | "test_designer" | "adversarial_critic";

/** All valid agent roles */
export const VALID_AGENT_ROLES: AgentRole[] = [
  "hypothesis_generator",
  "test_designer",
  "adversarial_critic",
];

/** Known agent programs (CLI tools) */
export type AgentProgram = "codex-cli" | "claude-code" | "gemini-cli";

/** A single agent-to-role mapping */
export interface RosterEntry {
  /** Agent Mail identity name (e.g., "BlueLake"). REQUIRED. */
  agentName: string;

  /** Assigned role for this session. REQUIRED. */
  role: AgentRole;

  /** CLI tool used to run this agent. Optional. */
  program?: AgentProgram | string;

  /** Model identifier (human-readable). Optional. */
  model?: string;

  /** Free-form notes for audit trail. Optional. */
  notes?: string;
}

/** Roster mode determines how roles are applied */
export type RosterMode =
  | "role_separated" // Each agent gets role-specific prompt (default)
  | "unified" // All agents get the same prompt
  | "heuristic"; // DEPRECATED: Fall back to substring matching

/** A complete roster for a session */
export interface Roster {
  /** List of agent-to-role mappings. At least one entry required. */
  entries: RosterEntry[];

  /** Mode indicator. Default: "role_separated". */
  mode?: RosterMode;

  /** Human-readable name for this roster. Optional. */
  name?: string;

  /** When this roster was created/last modified. ISO 8601. Optional. */
  createdAt?: string;
}

/** Template entry for presets (no agentName, filled in at runtime) */
export type RosterEntryTemplate = Omit<RosterEntry, "agentName">;

/** A saved roster configuration for reuse */
export interface RosterPreset {
  /** Unique identifier for this preset. REQUIRED. */
  id: string;

  /** Display name. REQUIRED. */
  name: string;

  /** Description of when to use this preset. Optional. */
  description?: string;

  /** The roster entry templates. REQUIRED. */
  entries: RosterEntryTemplate[];
}

// ============================================================================
// Validation
// ============================================================================

/** Result of a validation check */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate a roster for internal consistency.
 *
 * Checks:
 * - No duplicate agents
 * - All roles are valid
 * - At least one entry exists
 */
export function validateRoster(roster: Roster): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenAgents = new Set<string>();

  if (!roster.entries || roster.entries.length === 0) {
    errors.push("Roster must have at least one entry");
    return { valid: false, errors, warnings };
  }

  for (const entry of roster.entries) {
    // Check for empty agent name
    if (!entry.agentName || entry.agentName.trim() === "") {
      errors.push("Roster entry has empty agentName");
      continue;
    }

    // Check for duplicate agents
    if (seenAgents.has(entry.agentName)) {
      errors.push(`Duplicate agent in roster: ${entry.agentName}`);
    }
    seenAgents.add(entry.agentName);

    // Check role validity
    if (!VALID_AGENT_ROLES.includes(entry.role)) {
      errors.push(`Invalid role for ${entry.agentName}: ${entry.role}`);
    }
  }

  // Warn if using deprecated heuristic mode
  if (roster.mode === "heuristic") {
    warnings.push("Heuristic roster mode is deprecated. Use explicit role mappings.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate that a roster covers all recipients.
 *
 * Every recipient must have a roster entry.
 * Extra roster entries (for agents not in recipients) are allowed.
 */
export function validateRosterCoverage(roster: Roster, recipients: string[]): ValidationResult {
  const errors: string[] = [];
  const rosterAgents = new Set(roster.entries.map((e) => e.agentName));

  for (const recipient of recipients) {
    if (!rosterAgents.has(recipient)) {
      errors.push(`Missing roster entry for recipient: ${recipient}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get the roster entry for a specific agent.
 * Returns undefined if not found.
 */
export function getRosterEntry(roster: Roster, agentName: string): RosterEntry | undefined {
  return roster.entries.find((e) => e.agentName === agentName);
}

/**
 * Get all agents assigned to a specific role.
 */
export function getAgentsByRole(roster: Roster, role: AgentRole): string[] {
  return roster.entries.filter((e) => e.role === role).map((e) => e.agentName);
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Format roster as a markdown table for inclusion in kickoff messages.
 */
export function formatRosterAsMarkdown(roster: Roster): string {
  const lines: string[] = [];

  lines.push("## Session Configuration");
  lines.push("");
  lines.push(`**Roster Mode**: ${roster.mode || "role_separated"}`);
  if (roster.name) {
    lines.push(`**Roster Name**: ${roster.name}`);
  }
  lines.push("");
  lines.push("| Agent | Role | Program | Model |");
  lines.push("|-------|------|---------|-------|");

  for (const entry of roster.entries) {
    const program = entry.program || "-";
    const model = entry.model || "-";
    lines.push(`| ${entry.agentName} | ${entry.role} | ${program} | ${model} |`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Parse a roster from JSON string (for CLI --roster flag).
 * @throws {SyntaxError} If the JSON is malformed
 */
export function parseRosterJson(json: string): Roster {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new SyntaxError(`Invalid roster JSON: ${msg}`);
  }

  // Handle array of entries directly
  if (Array.isArray(parsed)) {
    return { entries: parsed, mode: "role_separated" };
  }

  // Handle full roster object
  return parsed as Roster;
}

// ============================================================================
// Presets
// ============================================================================

/** Default 3-agent preset for standard Brenner Protocol sessions */
export const DEFAULT_3_AGENT_PRESET: RosterPreset = {
  id: "default-3-agent",
  name: "Default 3-Agent Setup",
  description: "Standard Brenner Protocol with Codex/Opus/Gemini",
  entries: [
    { role: "hypothesis_generator", program: "codex-cli", model: "GPT-5.2" },
    { role: "test_designer", program: "claude-code", model: "Opus 4.5" },
    { role: "adversarial_critic", program: "gemini-cli", model: "Gemini 3" },
  ],
};

/** 2-agent preset for hypothesis + critique loop */
export const HYPOTHESIS_CRITIQUE_PRESET: RosterPreset = {
  id: "hypothesis-critique",
  name: "Hypothesis + Critique",
  description: "Two-agent loop: generate then attack",
  entries: [
    { role: "hypothesis_generator", program: "codex-cli", model: "GPT-5.2" },
    { role: "adversarial_critic", program: "gemini-cli", model: "Gemini 3" },
  ],
};

/** All built-in presets */
export const BUILT_IN_PRESETS: RosterPreset[] = [
  DEFAULT_3_AGENT_PRESET,
  HYPOTHESIS_CRITIQUE_PRESET,
];

/**
 * Apply a preset to a list of agent names, creating a roster.
 *
 * The preset entries are matched to agent names in order.
 * If there are more agents than preset entries, remaining agents get the first role.
 */
export function applyPreset(preset: RosterPreset, agentNames: string[]): Roster {
  const entries: RosterEntry[] = [];

  for (let i = 0; i < agentNames.length; i++) {
    const template = preset.entries[i] || preset.entries[0];
    entries.push({
      agentName: agentNames[i],
      ...template,
    });
  }

  return {
    mode: "role_separated",
    name: preset.name,
    entries,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Find a preset by ID.
 */
export function findPreset(
  presetId: string,
  customPresets: RosterPreset[] = [],
): RosterPreset | undefined {
  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
  return allPresets.find((p) => p.id === presetId);
}
