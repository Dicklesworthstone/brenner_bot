/**
 * Brenner Protocol Session Kickoff
 *
 * Implements deterministic session kickoff with role-specific prompts.
 * Per brenner_bot-5so.3.2.1: "one command/click can start a session deterministically"
 *
 * Usage:
 * ```typescript
 * import { composeKickoffMessages, AGENT_ROLES, type KickoffConfig } from "./session-kickoff";
 *
 * const config: KickoffConfig = {
 *   threadId: "RS-20251230-cell-fate",
 *   researchQuestion: "How do cells choose between lineage and gradient-based fate determination?",
 *   context: "The Brenner transcript discusses...",
 *   excerpt: "§58: Brenner emphasized 'reduction to one dimension'...",
 *   recipients: ["Codex", "Opus", "Gemini"],
 * };
 *
 * const messages = composeKickoffMessages(config);
 * // Returns array of { to, subject, body, ackRequired } per recipient
 * ```
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { type OperatorCard, parseOperatorCards, resolveOperatorCard } from "./operator-library";
import {
  AGENT_ROLE_VALUES,
  type AgentRole as SchemaAgentRole,
  type OperatorSelection as SchemaOperatorSelection,
} from "./schemas/session";

// ============================================================================
// Types
// ============================================================================

/** Agent role assignment for Brenner Protocol sessions */
export type AgentRole = SchemaAgentRole;

/** Operator selection per agent role */
export type OperatorSelection = SchemaOperatorSelection;

/** Role configuration with model and operator info */
export interface RoleConfig {
  role: AgentRole;
  displayName: string;
  model: string;
  operators: string[];
  description: string;
}

/** Map of agent names to their assigned roles */
export const AGENT_ROLES: Record<string, RoleConfig> = {
  // Codex / GPT agents → Hypothesis Generator
  Codex: {
    role: "hypothesis_generator",
    displayName: "Hypothesis Generator",
    model: "GPT-5.2",
    operators: ["⊘ Level-Split", "⊕ Cross-Domain", "◊ Paradox-Hunt"],
    description: "Generate hypotheses by hunting paradoxes and importing cross-domain patterns",
  },
  "codex-cli": {
    role: "hypothesis_generator",
    displayName: "Hypothesis Generator",
    model: "GPT-5.2",
    operators: ["⊘ Level-Split", "⊕ Cross-Domain", "◊ Paradox-Hunt"],
    description: "Generate hypotheses by hunting paradoxes and importing cross-domain patterns",
  },

  // Claude / Opus agents → Test Designer
  Opus: {
    role: "test_designer",
    displayName: "Test Designer",
    model: "Claude Opus 4.5",
    operators: ["✂ Exclusion-Test", "⌂ Materialize", "⟂ Object-Transpose", "🎭 Potency-Check"],
    description: "Design discriminative tests with potency controls",
  },
  Claude: {
    role: "test_designer",
    displayName: "Test Designer",
    model: "Claude Opus 4.5",
    operators: ["✂ Exclusion-Test", "⌂ Materialize", "⟂ Object-Transpose", "🎭 Potency-Check"],
    description: "Design discriminative tests with potency controls",
  },
  "claude-code": {
    role: "test_designer",
    displayName: "Test Designer",
    model: "Claude Opus 4.5",
    operators: ["✂ Exclusion-Test", "⌂ Materialize", "⟂ Object-Transpose", "🎭 Potency-Check"],
    description: "Design discriminative tests with potency controls",
  },

  // Gemini agents → Adversarial Critic
  Gemini: {
    role: "adversarial_critic",
    displayName: "Adversarial Critic",
    model: "Gemini 3",
    operators: ["ΔE Exception-Quarantine", "† Theory-Kill", "⊞ Scale-Check"],
    description: "Attack the framing, check scale constraints, quarantine anomalies",
  },
  "gemini-cli": {
    role: "adversarial_critic",
    displayName: "Adversarial Critic",
    model: "Gemini 3",
    operators: ["ΔE Exception-Quarantine", "† Theory-Kill", "⊞ Scale-Check"],
    description: "Attack the framing, check scale constraints, quarantine anomalies",
  },

  // Tribunal Roles
  "Devil's Advocate": {
    role: "devils_advocate",
    displayName: "Devil's Advocate",
    model: "Gemini 3",
    operators: ["† Theory-Kill", "◊ Paradox-Hunt"],
    description: "Finds holes, steelmans alternatives, challenges assumptions",
  },
  "Experiment Designer": {
    role: "experiment_designer",
    displayName: "Experiment Designer",
    model: "Claude Opus 4.5",
    operators: ["✂ Exclusion-Test", "🎭 Potency-Check"],
    description: "Proposes concrete, feasible study protocols",
  },
  Statistician: {
    role: "statistician",
    displayName: "Statistician",
    model: "Claude Opus 4.5",
    operators: ["⊞ Scale-Check", "P-Value-Check"],
    description: "Provides quantitative rigor and statistical evaluation",
  },
  "Brenner Channeler": {
    role: "brenner_channeler",
    displayName: "Brenner Channeler",
    model: "GPT-5.2",
    operators: ["⊘ Level-Split", "⟂ Object-Transpose"],
    description: "Channels Sydney Brenner's voice and thinking style",
  },
  Synthesis: {
    role: "synthesis",
    displayName: "Synthesis",
    model: "GPT-5.2",
    operators: ["∑ Synthesis"],
    description: "Integrates agent outputs into coherent assessment",
  },
};

/** Default role for unknown agents */
export const DEFAULT_ROLE: RoleConfig = {
  role: "hypothesis_generator",
  displayName: "Research Collaborator",
  model: "Unknown",
  operators: ["⊘ Level-Split", "⊕ Cross-Domain"],
  description: "Contribute hypotheses and analysis",
};

/** Configuration for a session kickoff */
export interface KickoffConfig {
  /** Thread ID for the session (e.g., "RS-20251230-cell-fate") */
  threadId: string;
  /** One-sentence problem statement */
  researchQuestion: string;
  /** 2-4 sentences of essential background */
  context: string;
  /** Relevant transcript excerpt(s) with §n citations */
  excerpt: string;
  /** Optional MEMORY CONTEXT (cass-memory) section markdown (include header + provenance) */
  memoryContext?: string;
  /** List of agent names to receive kickoff */
  recipients: string[];
  /**
   * Optional explicit roster mapping from recipient → role.
   *
   * When provided, kickoff composition must NOT rely on recipient name heuristics
   * (real Agent Mail identities are adjective+noun). This mapping is treated as
   * the source of truth and must cover every recipient.
   */
  recipientRoles?: Record<string, AgentRole>;
  /** Optional seed hypotheses */
  initialHypotheses?: string;
  /** Optional constraints (time bounds, scope limits) */
  constraints?: string;
  /** Optional specific requested outputs */
  requestedOutputs?: string;
  /** Optional operator focus per role (from OperatorSelector / prompt builder UI) */
  operatorSelection?: OperatorSelection;
}

/** A composed kickoff message ready to send */
export interface KickoffMessage {
  /** Recipient agent name */
  to: string;
  /** Message subject */
  subject: string;
  /** Message body (markdown) */
  body: string;
  /** Always true for KICKOFF messages */
  ackRequired: true;
  /** Role assigned to this agent */
  role: RoleConfig;
}

// ============================================================================
// Triangulated Kernel (single source of truth lives in specs/role_prompts_v0.1.md)
// ============================================================================

const ROLE_PROMPTS_SPEC_PATH = "specs/role_prompts_v0.1.md";
const KERNEL_START_MARKER = "<!-- BRENNER_TRIANGULATED_KERNEL_START -->";
const KERNEL_END_MARKER = "<!-- BRENNER_TRIANGULATED_KERNEL_END -->";
const ROLE_PROMPT_START_PREFIX = "<!-- BRENNER_ROLE_PROMPT_START ";
const ROLE_PROMPT_END_PREFIX = "<!-- BRENNER_ROLE_PROMPT_END ";
const OPERATOR_LIBRARY_SPEC_PATH = "specs/operator_library_v0.1.md";

let triangulatedKernelCache: string | null | undefined;
let rolePromptsSpecCache: string | null | undefined;
const rolePromptCache = new Map<AgentRole, string | null>();
let operatorCardsCache: OperatorCard[] | null | undefined;

function tryReadFromFilesystem(relativePathFromRepoRoot: string): string | null {
  const candidates = [
    // CLI / repo-root execution
    resolve(process.cwd(), relativePathFromRepoRoot),
    // Next.js runtime (cwd = apps/web)
    resolve(process.cwd(), "public/_corpus", relativePathFromRepoRoot),
    // Next.js runtime (cwd = apps/web) but repo root exists
    resolve(process.cwd(), "../..", relativePathFromRepoRoot),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      return readFileSync(path, "utf8");
    } catch {
      // continue
    }
  }

  return null;
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

function readRolePromptsSpecMarkdown(): string | null {
  if (rolePromptsSpecCache !== undefined) return rolePromptsSpecCache;
  rolePromptsSpecCache = tryReadFromFilesystem(ROLE_PROMPTS_SPEC_PATH);
  return rolePromptsSpecCache;
}

export function getTriangulatedBrennerKernelMarkdown(): string | null {
  if (triangulatedKernelCache !== undefined) return triangulatedKernelCache;

  const spec = readRolePromptsSpecMarkdown();
  if (!spec) {
    triangulatedKernelCache = null;
    return triangulatedKernelCache;
  }

  triangulatedKernelCache = extractBetweenMarkers(spec, KERNEL_START_MARKER, KERNEL_END_MARKER);
  return triangulatedKernelCache;
}

// ============================================================================
// Role Prompt Sections
// ============================================================================

function rolePromptMarkers(role: AgentRole): { start: string; end: string } {
  return {
    start: `${ROLE_PROMPT_START_PREFIX}${role} -->`,
    end: `${ROLE_PROMPT_END_PREFIX}${role} -->`,
  };
}

export function getRolePromptMarkdown(role: AgentRole): string | null {
  if (rolePromptCache.has(role)) return rolePromptCache.get(role) ?? null;

  const spec = readRolePromptsSpecMarkdown();
  if (!spec) {
    rolePromptCache.set(role, null);
    return null;
  }

  const { start, end } = rolePromptMarkers(role);
  const extracted = extractBetweenMarkers(spec, start, end);
  rolePromptCache.set(role, extracted);
  return extracted;
}

/**
 * Get the role-specific system prompt section.
 * These are condensed versions of the prompts in role_prompts_v0.1.md
 */
function getRolePromptSection(role: RoleConfig): string {
  const fromSpec = getRolePromptMarkdown(role.role);
  if (fromSpec) {
    return ["## Role Prompt (System)", fromSpec].join("\n");
  }

  let promptSection: string;

  switch (role.role) {
    case "hypothesis_generator":
    case "brenner_channeler":
      promptSection = `## Your Role: ${role.displayName}

You generate candidate hypotheses by hunting for paradoxes, importing cross-domain patterns, and rigorously separating levels of explanation.

**Primary Operators**: ${role.operators.join(", ")}

**You MUST**:
1. Always include a "third alternative" hypothesis (both others could be wrong)
2. Never conflate different levels (program/interpreter, message/machine)
3. Cite transcript anchors (§n) or evidence pack refs (EV-NNN) when referencing sources
4. Output structured deltas, not narrative prose
5. Apply ⊘ Level-Split before proposing any mechanism

**Citation Conventions**:
- Brenner transcript: \`(§58)\` or \`(§127-§129)\`
- Evidence pack: \`(EV-001)\` for record, \`(EV-001#E1)\` for specific excerpt
- Inference: \`[inference]\` when reasoning beyond cited evidence

**Example**: "The exponential decay model (EV-001#E2) aligns with Brenner's emphasis on reduction to testable predictions (§58) [inference]."

**Output Format**: Use \`\`\`delta blocks with operation: "ADD", section: "hypothesis_slate"`;
      break;

    case "test_designer":
    case "experiment_designer":
    case "statistician":
      promptSection = `## Your Role: ${role.displayName}

You convert hypotheses into discriminative tests—experiments designed to KILL models, not just collect data. Every test must include a potency check.

**Primary Operators**: ${role.operators.join(", ")}

**You MUST**:
1. Design tests that maximize "evidence per week" (likelihood ratio × speed / ambiguity)
2. Include a potency check for every test (chastity vs impotence control)
3. Score every test on the 4-dimension rubric (0-3 each)
4. Consider object transposition—is there a better experimental system?
5. Cite transcript (§n) or evidence pack (EV-NNN) when referencing prior results

**Citation Conventions**:
- Brenner transcript: \`(§42)\` for methodology guidance
- Evidence pack: \`(EV-002#E1)\` for prior experimental results, \`(EV-003)\` for datasets
- Inference: \`[inference]\` for novel test design rationale

**Example**: "Use paired-pulse protocol per EV-002#E1 with potency check from §142."

**Scoring Rubric**: likelihood_ratio, cost, speed, ambiguity (0-3 each)

**Output Format**: Use \`\`\`delta blocks with operation: "ADD", section: "discriminative_tests"`;
      break;

    case "adversarial_critic":
    case "devils_advocate":
      promptSection = `## Your Role: ${role.displayName}

You attack the current framing. You find what would make everything wrong. You check scale constraints and quarantine anomalies. You are the immune system against self-deception.

**Primary Operators**: ${role.operators.join(", ")}

**You MUST**:
1. Calculate actual numbers (scale checks) before accepting any mechanism
2. Quarantine anomalies explicitly—never sweep them under the carpet
3. Kill theories when they "go ugly"—don't let attachment persist
4. Propose real third alternatives, not just "both wrong"
5. Cite transcript (§n) or evidence pack (EV-NNN) when referencing attacks

**Citation Conventions**:
- Brenner transcript: \`(§205)\` for epistemic hygiene principles
- Evidence pack: \`(EV-003#E1)\` to cite prior failed hypotheses or contradicting data
- Inference: \`[inference]\` for novel critiques not directly sourced

**Example**: "Prior session killed a similar H2 variant (EV-003#E1)—avoid repeating."

**Output Sections**: anomaly_register, adversarial_critique, assumption_ledger (for scale checks)

**Output Format**: Use \`\`\`delta blocks with appropriate section and operation`;
      break;

    case "synthesis":
      promptSection = `## Your Role: ${role.displayName}

You integrate the outputs of other agents into a coherent research brief. You identify consensus, disagreements, and next steps.

**Primary Operators**: ${role.operators.join(", ")}

**You MUST**:
1. Summarize the state of the debate
2. Highlight key disagreements and their roots
3. Recommend the next best action (e.g. run Test T-1)

**Output Format**: Use markdown with "## Synthesis" section`;
      break;

    default:
      promptSection = `## Your Role: ${role.displayName}

${role.description}

**Primary Operators**: ${role.operators.join(", ")}

**Output Format**: Use \`\`\`delta blocks per delta_output_format_v0.1.md`;
      break;
  }

  return promptSection;
}

// ============================================================================
// Operator Cards (from specs/operator_library_v0.1.md)
// ============================================================================

function getOperatorCards(): OperatorCard[] | null {
  if (operatorCardsCache !== undefined) return operatorCardsCache;

  const spec = tryReadFromFilesystem(OPERATOR_LIBRARY_SPEC_PATH);
  if (!spec) {
    operatorCardsCache = null;
    return operatorCardsCache;
  }

  try {
    operatorCardsCache = parseOperatorCards(spec);
  } catch {
    operatorCardsCache = null;
  }

  return operatorCardsCache;
}

function renderOperatorCardMarkdown(card: OperatorCard): string {
  const lines: string[] = [];
  const tag = card.canonicalTag ? ` (${card.canonicalTag})` : "";

  lines.push(`### ${card.symbol} ${card.title}${tag}`);
  lines.push("");
  lines.push(`**Definition**: ${card.definition}`);
  lines.push("");

  if (card.whenToUseTriggers.length > 0) {
    lines.push("**When-to-use triggers**:");
    for (const trigger of card.whenToUseTriggers.slice(0, 3)) {
      lines.push(`- ${trigger}`);
    }
    lines.push("");
  }

  if (card.failureModes.length > 0) {
    lines.push("**Failure modes**:");
    for (const mode of card.failureModes.slice(0, 3)) {
      lines.push(`- ${mode}`);
    }
    lines.push("");
  }

  if (card.promptModule) {
    lines.push("**Prompt module (copy/paste)**:");
    lines.push("```text");
    lines.push(card.promptModule.trim());
    lines.push("```");
    lines.push("");
  }

  lines.push(`**Transcript anchors**: ${card.transcriptAnchors}`);
  lines.push("");

  return lines.join("\n").trimEnd();
}

function renderOperatorCardsSection(selectedOperators: string[]): string | null {
  const cards = getOperatorCards();
  if (!cards) return null;

  const resolved: OperatorCard[] = [];
  for (const query of selectedOperators) {
    const card = resolveOperatorCard(cards, query);
    if (card) resolved.push(card);
  }

  if (resolved.length === 0) return null;

  const lines: string[] = [];
  lines.push("## Operator Focus (selected)");
  lines.push(
    "Apply these explicitly; name them in your rationales. If an operator doesn’t fit, say why and propose the next operator to apply.",
  );
  lines.push("");
  lines.push(`Selected: ${selectedOperators.join(", ")}`);
  lines.push("");

  for (const card of resolved) {
    lines.push(renderOperatorCardMarkdown(card));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

// ============================================================================
// Message Composition
// ============================================================================

function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && AGENT_ROLE_VALUES.includes(value as AgentRole);
}

function normalizeRecipientKey(name: string): string {
  return name.trim().toLowerCase();
}

function buildRecipientRoleMap(
  recipientRoles: Record<string, AgentRole> | undefined,
): Map<string, AgentRole> | null {
  if (!recipientRoles) return null;

  const map = new Map<string, AgentRole>();
  for (const [recipient, role] of Object.entries(recipientRoles)) {
    const key = normalizeRecipientKey(recipient);
    if (!key) throw new Error("Invalid recipientRoles: empty recipient name.");
    if (!isAgentRole(role))
      throw new Error(`Invalid recipientRoles entry for "${recipient}": "${String(role)}".`);
    map.set(key, role);
  }
  return map;
}

const ROLE_CONFIG_BY_AGENT_ROLE: Record<AgentRole, RoleConfig> = {
  hypothesis_generator: AGENT_ROLES["Codex"],
  test_designer: AGENT_ROLES["Opus"],
  adversarial_critic: AGENT_ROLES["Gemini"],
  devils_advocate: AGENT_ROLES["Devil's Advocate"],
  experiment_designer: AGENT_ROLES["Experiment Designer"],
  statistician: AGENT_ROLES["Statistician"],
  brenner_channeler: AGENT_ROLES["Brenner Channeler"],
  synthesis: AGENT_ROLES["Synthesis"],
};

/**
 * Get the role configuration for an agent name.
 * Falls back to DEFAULT_ROLE for unknown agents.
 */
export function getAgentRole(agentName: string): RoleConfig {
  // Check exact match first
  if (agentName in AGENT_ROLES) {
    return AGENT_ROLES[agentName];
  }

  // Check lowercase match
  const lowerName = agentName.toLowerCase();
  for (const [key, config] of Object.entries(AGENT_ROLES)) {
    if (key.toLowerCase() === lowerName) {
      return config;
    }
  }

  // Check if name contains known keywords
  if (lowerName.includes("codex") || lowerName.includes("gpt")) {
    return AGENT_ROLES["Codex"];
  }
  if (lowerName.includes("claude") || lowerName.includes("opus")) {
    return AGENT_ROLES["Opus"];
  }
  if (lowerName.includes("gemini")) {
    return AGENT_ROLES["Gemini"];
  }

  return DEFAULT_ROLE;
}

const ROLE_DELTA_SUBJECT_TAG: Record<AgentRole, string> = {
  hypothesis_generator: "gpt",
  test_designer: "opus",
  adversarial_critic: "gemini",
  devils_advocate: "gemini",
  experiment_designer: "opus",
  statistician: "opus",
  brenner_channeler: "gpt",
  synthesis: "gpt",
};

/**
 * Compose the kickoff message body for a specific agent.
 */
function composeKickoffBody(config: KickoffConfig, role: RoleConfig): string {
  const sections: string[] = [];

  // Title
  sections.push(`# Brenner Protocol Session: ${config.threadId}`);
  sections.push("");

  // Explicit roster (when provided)
  const explicitRoles = buildRecipientRoleMap(config.recipientRoles);
  if (explicitRoles) {
    sections.push("## Roster (explicit)");
    for (const recipient of config.recipients) {
      const assigned = explicitRoles.get(normalizeRecipientKey(recipient));
      const label = assigned ? ROLE_CONFIG_BY_AGENT_ROLE[assigned].displayName : "Unassigned";
      sections.push(`- ${recipient}: ${label}`);
    }
    sections.push("");
  }

  // Triangulated kernel (single, shared invariants across roles)
  const kernel = getTriangulatedBrennerKernelMarkdown();
  if (kernel) {
    sections.push("## Triangulated Brenner Kernel (single)");
    sections.push(kernel);
    sections.push("");
  }

  // Role assignment
  sections.push(getRolePromptSection(role));
  sections.push("");

  // Optional: operator focus cards (from operatorSelection)
  const selectedOperators = config.operatorSelection?.[role.role];
  if (Array.isArray(selectedOperators) && selectedOperators.length > 0) {
    const operatorCards = renderOperatorCardsSection(selectedOperators);
    if (operatorCards) {
      sections.push(operatorCards);
      sections.push("");
    }
  }

  // Research question (becomes RT in artifact)
  sections.push("## Research Question");
  sections.push(config.researchQuestion);
  sections.push("");

  // Context
  sections.push("## Context");
  sections.push(config.context);
  sections.push("");

  // Excerpt
  sections.push("## Transcript Excerpt");
  sections.push(config.excerpt);
  sections.push("");

  // Optional: Memory context (cass-memory)
  if (config.memoryContext) {
    sections.push(config.memoryContext.trim());
    sections.push("");
  }

  // Optional: Initial hypotheses
  if (config.initialHypotheses) {
    sections.push("## Initial Hypotheses (Seed)");
    sections.push(config.initialHypotheses);
    sections.push("");
  }

  // Optional: Constraints
  if (config.constraints) {
    sections.push("## Constraints");
    sections.push(config.constraints);
    sections.push("");
  }

  // Requested outputs
  sections.push("## Requested Outputs");
  if (config.requestedOutputs) {
    sections.push(config.requestedOutputs);
  } else {
    switch (role.role) {
      case "hypothesis_generator":
      case "brenner_channeler":
        sections.push("- 2-4 hypotheses including a third alternative");
        sections.push("- Each with claim, mechanism, and transcript anchors");
        break;
      case "test_designer":
      case "experiment_designer":
      case "statistician":
        sections.push("- 2-3 discriminative tests for each hypothesis pair");
        sections.push("- Each with procedure, expected outcomes, potency check, and scores");
        break;
      case "adversarial_critic":
      case "devils_advocate":
        sections.push("- Scale checks for any quantitative claims");
        sections.push("- Explicit anomaly quarantine for contradictions");
        sections.push("- At least one real third alternative critique");
        break;
      case "synthesis":
        sections.push("- A synthesis memo: consensus, disagreements, and best next action");
        sections.push("- A short list of discriminative tests to run next (ranked)");
        break;
    }
  }
  sections.push("");

  // Instructions
  sections.push("## Response Format");
  const deltaTag = ROLE_DELTA_SUBJECT_TAG[role.role];
  sections.push(`Reply to this thread with subject \`DELTA[${deltaTag}]: <description>\`.`);
  sections.push(
    "(Role tags: hypotheses → `gpt`/`codex`; tests → `opus`/`claude`; critique → `gemini`.)",
  );
  sections.push(
    "Include your reasoning as prose, followed by `## Deltas` with your structured contributions.",
  );
  sections.push("");

  return sections.join("\n");
}

/**
 * Compose kickoff messages for all recipients.
 * Each recipient gets a role-specific message.
 */
export function composeKickoffMessages(config: KickoffConfig): KickoffMessage[] {
  const explicitRoles = buildRecipientRoleMap(config.recipientRoles);
  if (explicitRoles) {
    const missing = config.recipients.filter((r) => !explicitRoles.has(normalizeRecipientKey(r)));
    if (missing.length > 0) {
      throw new Error(`Missing recipient role mapping for: ${missing.join(", ")}`);
    }
  }

  return config.recipients.map((recipient) => {
    const explicitRoleKey = explicitRoles?.get(normalizeRecipientKey(recipient));
    const role = explicitRoleKey
      ? ROLE_CONFIG_BY_AGENT_ROLE[explicitRoleKey]
      : getAgentRole(recipient);
    const subject = `KICKOFF: [${config.threadId}] ${config.researchQuestion.slice(0, 60)}${config.researchQuestion.length > 60 ? "..." : ""}`;
    const body = composeKickoffBody(config, role);

    return {
      to: recipient,
      subject,
      body,
      ackRequired: true,
      role,
    };
  });
}

/**
 * Compose a single unified kickoff message (for simple cases).
 * This sends the same content to all recipients without role differentiation.
 */
export function composeUnifiedKickoff(config: KickoffConfig): {
  subject: string;
  body: string;
  ackRequired: true;
} {
  const sections: string[] = [];

  sections.push(`# Brenner Protocol Session: ${config.threadId}`);
  sections.push("");

  const kernel = getTriangulatedBrennerKernelMarkdown();
  if (kernel) {
    sections.push("## Triangulated Brenner Kernel (single)");
    sections.push(kernel);
    sections.push("");
  }

  if (config.operatorSelection) {
    sections.push("## ROLE OPERATOR ASSIGNMENTS");
    for (const roleKey of AGENT_ROLE_VALUES) {
      const operators = config.operatorSelection[roleKey] ?? [];
      if (operators.length > 0) {
        sections.push(
          `- ${ROLE_CONFIG_BY_AGENT_ROLE[roleKey].displayName}: ${operators.join(", ")}`,
        );
      }
    }
    sections.push("");
  }

  sections.push("## Research Question");
  sections.push(config.researchQuestion);
  sections.push("");
  sections.push("## Context");
  sections.push(config.context);
  sections.push("");
  sections.push("## Transcript Excerpt");
  sections.push(config.excerpt);
  sections.push("");

  if (config.memoryContext) {
    sections.push(config.memoryContext.trim());
    sections.push("");
  }

  if (config.initialHypotheses) {
    sections.push("## Initial Hypotheses");
    sections.push(config.initialHypotheses);
    sections.push("");
  }

  if (config.constraints) {
    sections.push("## Constraints");
    sections.push(config.constraints);
    sections.push("");
  }

  if (config.requestedOutputs) {
    sections.push("## Requested Outputs");
    sections.push(config.requestedOutputs);
    sections.push("");
  }

  sections.push("## Response Format");
  sections.push("Reply to this thread with subject `DELTA: <description>`.");
  sections.push(
    "Include your reasoning as prose, followed by ```delta blocks with your structured contributions.",
  );
  sections.push("");

  const subject = `KICKOFF: [${config.threadId}] ${config.researchQuestion.slice(0, 60)}${config.researchQuestion.length > 60 ? "..." : ""}`;

  return {
    subject,
    body: sections.join("\n"),
    ackRequired: true,
  };
}
