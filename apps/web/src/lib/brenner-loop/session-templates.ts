/**
 * Session Templates
 *
 * Pre-configured session types for different use cases.
 * Templates define which phases are required, optional, or skipped,
 * and configure default agent dispatch settings.
 *
 * @see brenner_bot-reew.7 - FEATURE: Session Templates
 * @module brenner-loop/session-templates
 */

import type { TribunalAgentRole } from "./agents";
import type { SessionPhase } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Agent roles that can be dispatched during a session.
 */
export type AgentRole = TribunalAgentRole;

/**
 * Session depth levels.
 */
export type SessionDepth = "quick" | "standard" | "deep";

/**
 * A session template configuration.
 */
export interface SessionTemplate {
  /** Unique template ID */
  id: string;

  /** Display name */
  name: string;

  /** Short description of when to use this template */
  description: string;

  /** Icon (emoji or icon name) */
  icon: string;

  /** Color class for styling */
  colorClass: string;

  // === Phase Configuration ===

  /**
   * Phases that must be completed.
   * These cannot be skipped.
   */
  requiredPhases: SessionPhase[];

  /**
   * Phases that can optionally be completed.
   * User can choose to skip these.
   */
  optionalPhases: SessionPhase[];

  /**
   * Phases that are skipped by default in this template.
   * User can still enable them if desired.
   */
  skippedPhases: SessionPhase[];

  // === Agent Configuration ===

  /**
   * Which agents to dispatch by default.
   */
  defaultAgents: AgentRole[];

  /**
   * Default analysis depth.
   */
  defaultDepth: SessionDepth;

  // === User Guidance ===

  /**
   * Expected time to complete (human-readable).
   */
  expectedDuration: string;

  /**
   * Use cases this template is best for.
   */
  bestFor: string[];

  /**
   * A compelling tagline for the template.
   */
  tagline: string;

  // === Customization ===

  /**
   * Whether users can modify phase/agent settings.
   */
  allowCustomization: boolean;

  /**
   * Whether this is a featured/recommended template.
   */
  featured?: boolean;

  /**
   * Order for display (lower = first).
   */
  displayOrder: number;
}

/**
 * Settings for a session based on a template.
 * These are applied when creating a new session.
 */
export interface SessionTemplateSettings {
  /** The template ID used */
  templateId: string;

  /** Customized phases (if user modified) */
  customizedPhases?: {
    required: SessionPhase[];
    optional: SessionPhase[];
    skipped: SessionPhase[];
  };

  /** Customized agents (if user modified) */
  customizedAgents?: AgentRole[];

  /** When template was applied */
  appliedAt: string;
}

// ============================================================================
// Pre-Built Templates
// ============================================================================

/**
 * Quick Check - Fast sanity check for ideas.
 *
 * Skips most operators and agents, focuses on getting quick feedback
 * on whether an idea is worth pursuing.
 */
const QUICK_CHECK: SessionTemplate = {
  id: "quick-check",
  name: "Quick Check",
  description: "Fast sanity check of an idea. Get quick feedback on whether it's worth pursuing.",
  icon: "Zap",
  colorClass: "bg-yellow-500",

  requiredPhases: ["intake", "sharpening", "exclusion_test"],
  optionalPhases: ["synthesis"],
  skippedPhases: [
    "level_split",
    "object_transpose",
    "scale_check",
    "evidence_gathering",
    "revision",
  ],

  defaultAgents: ["devils_advocate"],
  defaultDepth: "quick",

  expectedDuration: "15-30 min",
  bestFor: ["Early-stage ideas", "Gut checks before deeper analysis", "Quick hypothesis triage"],
  tagline: "Is this idea worth pursuing? Get quick pushback.",

  allowCustomization: true,
  featured: true,
  displayOrder: 1,
};

/**
 * Full Analysis - Comprehensive rigorous analysis.
 *
 * All operators enabled, all agents dispatched.
 * The complete Brenner Loop experience.
 */
const FULL_ANALYSIS: SessionTemplate = {
  id: "full-analysis",
  name: "Full Analysis",
  description: "Comprehensive rigorous analysis with all operators and agents.",
  icon: "Microscope",
  colorClass: "bg-blue-600",

  requiredPhases: [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
  ],
  optionalPhases: ["evidence_gathering", "revision"],
  skippedPhases: [],

  defaultAgents: [
    "devils_advocate",
    "experiment_designer",
    "statistician",
    "brenner_channeler",
    "synthesis",
  ],
  defaultDepth: "deep",

  expectedDuration: "2-4 hours",
  bestFor: [
    "Important hypotheses",
    "Formal research questions",
    "Pre-publication review",
    "Grant proposal preparation",
  ],
  tagline: "Leave no stone unturned. Full Brenner treatment.",

  allowCustomization: true,
  featured: true,
  displayOrder: 2,
};

/**
 * Literature Review - Focus on existing research.
 *
 * Evaluates hypothesis against literature without running experiments.
 */
const LITERATURE_REVIEW: SessionTemplate = {
  id: "literature-review",
  name: "Literature Review",
  description: "Evaluate your hypothesis against existing research and literature.",
  icon: "BookOpen",
  colorClass: "bg-emerald-600",

  requiredPhases: ["intake", "sharpening", "exclusion_test", "evidence_gathering"],
  optionalPhases: ["synthesis"],
  skippedPhases: ["level_split", "object_transpose", "scale_check", "agent_dispatch", "revision"],

  defaultAgents: [],
  defaultDepth: "standard",

  expectedDuration: "1-2 hours",
  bestFor: [
    "Checking what's already known",
    "Finding prior art",
    "Literature gap analysis",
    "Pre-experiment background research",
  ],
  tagline: "What does the literature already say about this?",

  allowCustomization: true,
  featured: true,
  displayOrder: 3,
};

/**
 * Design Focus - Plan experiments to test hypothesis.
 *
 * Emphasizes experiment design and methodology.
 */
const DESIGN_FOCUS: SessionTemplate = {
  id: "design-focus",
  name: "Design Focus",
  description: "Plan experiments and tests to rigorously evaluate your hypothesis.",
  icon: "FlaskConical",
  colorClass: "bg-purple-600",

  requiredPhases: ["intake", "sharpening", "level_split", "exclusion_test", "agent_dispatch"],
  optionalPhases: ["scale_check", "synthesis"],
  skippedPhases: ["object_transpose", "evidence_gathering", "revision"],

  defaultAgents: ["experiment_designer", "statistician"],
  defaultDepth: "standard",

  expectedDuration: "1-2 hours",
  bestFor: [
    "Planning research methodology",
    "Designing controlled experiments",
    "Grant proposals",
    "Protocol development",
  ],
  tagline: "What experiments would test this properly?",

  allowCustomization: true,
  featured: true,
  displayOrder: 4,
};

/**
 * Adversarial Deep Dive - Maximum challenge.
 *
 * Throws everything at the hypothesis to try to break it.
 * Includes debate mode if available.
 */
const ADVERSARIAL_DEEP_DIVE: SessionTemplate = {
  id: "adversarial-deep-dive",
  name: "Adversarial Deep Dive",
  description: "Maximum adversarial pressure. Try to destroy this hypothesis before critics do.",
  icon: "Swords",
  colorClass: "bg-red-600",

  requiredPhases: [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
  ],
  optionalPhases: ["evidence_gathering", "revision"],
  skippedPhases: [],

  defaultAgents: [
    "devils_advocate",
    "experiment_designer",
    "statistician",
    "brenner_channeler",
    "synthesis",
  ],
  defaultDepth: "deep",

  expectedDuration: "2-3 hours",
  bestFor: [
    "High-stakes hypotheses",
    "Preparing for critics",
    "Pre-publication stress testing",
    "Career-critical claims",
  ],
  tagline: "Try to destroy this hypothesis before critics do.",

  allowCustomization: true,
  featured: true,
  displayOrder: 5,
};

/**
 * Custom Session - User configures everything.
 *
 * Starts with no preset phases, user builds their own session.
 */
const CUSTOM: SessionTemplate = {
  id: "custom",
  name: "Custom Session",
  description: "Configure your own session with custom phases and agents.",
  icon: "Settings",
  colorClass: "bg-slate-600",

  requiredPhases: ["intake", "sharpening"],
  optionalPhases: [
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
    "evidence_gathering",
    "revision",
  ],
  skippedPhases: [],

  defaultAgents: [],
  defaultDepth: "standard",

  expectedDuration: "Varies",
  bestFor: ["Experienced users", "Specific workflows", "Unusual research questions"],
  tagline: "Build your own workflow.",

  allowCustomization: true,
  featured: false,
  displayOrder: 99,
};

// ============================================================================
// Template Registry
// ============================================================================

/**
 * All available session templates.
 */
export const SESSION_TEMPLATES: SessionTemplate[] = [
  QUICK_CHECK,
  FULL_ANALYSIS,
  LITERATURE_REVIEW,
  DESIGN_FOCUS,
  ADVERSARIAL_DEEP_DIVE,
  CUSTOM,
];

/**
 * Template lookup by ID.
 */
export const TEMPLATE_BY_ID = new Map<string, SessionTemplate>(
  SESSION_TEMPLATES.map((t) => [t.id, t]),
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a template by ID.
 */
export function getSessionTemplate(id: string): SessionTemplate | undefined {
  return TEMPLATE_BY_ID.get(id);
}

/**
 * Get all featured templates (sorted by display order).
 */
export function getFeaturedSessionTemplates(): SessionTemplate[] {
  return SESSION_TEMPLATES.filter((t) => t.featured).sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

/**
 * Get templates sorted by display order.
 */
export function getSortedSessionTemplates(): SessionTemplate[] {
  return [...SESSION_TEMPLATES].sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get templates by depth level.
 */
export function getTemplatesByDepth(depth: SessionDepth): SessionTemplate[] {
  return SESSION_TEMPLATES.filter((t) => t.defaultDepth === depth);
}

/**
 * Get the recommended template for a given time constraint.
 */
export function getTemplateForTimeConstraint(maxMinutes: number): SessionTemplate {
  if (maxMinutes <= 30) {
    return QUICK_CHECK;
  } else if (maxMinutes <= 90) {
    return LITERATURE_REVIEW;
  } else if (maxMinutes <= 150) {
    return DESIGN_FOCUS;
  } else {
    return FULL_ANALYSIS;
  }
}

/**
 * Check if a phase is required in a template.
 */
export function isPhaseRequired(template: SessionTemplate, phase: SessionPhase): boolean {
  return template.requiredPhases.includes(phase);
}

/**
 * Check if a phase is optional in a template.
 */
export function isPhaseOptional(template: SessionTemplate, phase: SessionPhase): boolean {
  return template.optionalPhases.includes(phase);
}

/**
 * Check if a phase is skipped in a template.
 */
export function isPhaseSkipped(template: SessionTemplate, phase: SessionPhase): boolean {
  return template.skippedPhases.includes(phase);
}

/**
 * Check if a phase is enabled (required or optional) in a template.
 */
export function isPhaseEnabled(template: SessionTemplate, phase: SessionPhase): boolean {
  return template.requiredPhases.includes(phase) || template.optionalPhases.includes(phase);
}

/**
 * Get the active phases for a template.
 * These are phases that are not skipped.
 */
export function getActivePhases(template: SessionTemplate): SessionPhase[] {
  return [...template.requiredPhases, ...template.optionalPhases];
}

/**
 * Get all phases in order for a template.
 * Includes both active and skipped phases in their natural order.
 */
export function getPhaseOrderForTemplate(
  template: SessionTemplate,
): { phase: SessionPhase; status: "required" | "optional" | "skipped" }[] {
  const phaseOrder: SessionPhase[] = [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
    "evidence_gathering",
    "revision",
    "complete",
  ];

  return phaseOrder.map((phase) => ({
    phase,
    status: isPhaseRequired(template, phase)
      ? "required"
      : isPhaseOptional(template, phase)
        ? "optional"
        : "skipped",
  }));
}

/**
 * Create default template settings for a new session.
 */
export function createTemplateSettings(templateId: string): SessionTemplateSettings {
  return {
    templateId,
    appliedAt: new Date().toISOString(),
  };
}

/**
 * Apply customizations to template settings.
 */
export function customizeTemplateSettings(
  settings: SessionTemplateSettings,
  phases?: {
    required: SessionPhase[];
    optional: SessionPhase[];
    skipped: SessionPhase[];
  },
  agents?: AgentRole[],
): SessionTemplateSettings {
  return {
    ...settings,
    customizedPhases: phases,
    customizedAgents: agents,
  };
}

/**
 * Get effective phases for a session, considering customizations.
 */
export function getEffectivePhases(
  template: SessionTemplate,
  settings?: SessionTemplateSettings,
): {
  required: SessionPhase[];
  optional: SessionPhase[];
  skipped: SessionPhase[];
} {
  if (settings?.customizedPhases) {
    return settings.customizedPhases;
  }

  return {
    required: template.requiredPhases,
    optional: template.optionalPhases,
    skipped: template.skippedPhases,
  };
}

/**
 * Get effective agents for a session, considering customizations.
 */
export function getEffectiveAgents(
  template: SessionTemplate,
  settings?: SessionTemplateSettings,
): AgentRole[] {
  if (settings?.customizedAgents) {
    return settings.customizedAgents;
  }

  return template.defaultAgents;
}

/**
 * Validate that a template configuration is internally consistent.
 */
export function validateTemplate(template: SessionTemplate): string[] {
  const errors: string[] = [];

  const allPhases = [
    ...template.requiredPhases,
    ...template.optionalPhases,
    ...template.skippedPhases,
  ];

  // Check for duplicates
  const seen = new Set<SessionPhase>();
  for (const phase of allPhases) {
    if (seen.has(phase)) {
      errors.push(`Phase "${phase}" appears in multiple categories`);
    }
    seen.add(phase);
  }

  // Intake must always be required
  if (!template.requiredPhases.includes("intake")) {
    errors.push("Intake phase must be required");
  }

  // Sharpening must always be required
  if (!template.requiredPhases.includes("sharpening")) {
    errors.push("Sharpening phase must be required");
  }

  return errors;
}

// ============================================================================
// Agent Role Helpers
// ============================================================================

/**
 * Display information for agent roles.
 */
export const AGENT_ROLE_INFO: Record<
  AgentRole,
  { name: string; description: string; icon: string }
> = {
  devils_advocate: {
    name: "Devil's Advocate",
    description: "Challenges your hypothesis and finds weaknesses",
    icon: "ShieldAlert",
  },
  experiment_designer: {
    name: "Experiment Designer",
    description: "Designs rigorous tests and experiments",
    icon: "FlaskConical",
  },
  statistician: {
    name: "Statistician",
    description: "Evaluates statistical validity and power",
    icon: "BarChart3",
  },
  brenner_channeler: {
    name: "Brenner Channeler",
    description: "Channels Brenner's voice to challenge sloppy thinking",
    icon: "MessageSquareQuote",
  },
  synthesis: {
    name: "Synthesis",
    description: "Integrates agent responses into a coherent brief",
    icon: "Sparkles",
  },
};

/**
 * Get display name for an agent role.
 */
export function getAgentRoleName(role: AgentRole): string {
  return AGENT_ROLE_INFO[role].name;
}

/**
 * Get description for an agent role.
 */
export function getAgentRoleDescription(role: AgentRole): string {
  return AGENT_ROLE_INFO[role].description;
}
