/**
 * Level Split (Σ) Operator
 *
 * Helps users separate confounded levels in their hypothesis.
 * Most hypotheses conflate multiple levels of analysis - this operator
 * makes those separations explicit.
 *
 * Brenner's Principle: "Separate the levels of analysis before you start"
 *
 * @see brenner_bot-vw6p.2 (bead)
 * @module brenner-loop/operators/level-split
 */

import type { HypothesisCard } from "../hypothesis";
import type { OperatorSession, OperatorStepConfig } from "./framework";

// ============================================================================
// Types
// ============================================================================

/**
 * A level of analysis for X (cause) or Y (effect)
 */
export interface Level {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of this level */
  description: string;
  /** Category: temporal, measurement, population, mechanism, etc. */
  category: LevelCategory;
  /** Whether this level is selected by the user */
  selected?: boolean;
}

/**
 * Categories of analysis levels
 */
export type LevelCategory =
  | "temporal" // Acute vs chronic, immediate vs delayed
  | "measurement" // How is the variable operationalized?
  | "population" // Who is affected? Individual vs group
  | "mechanism" // What pathway? Direct vs indirect
  | "implementation" // Platform level vs algorithm level
  | "scale" // Micro vs macro effects
  | "other";

/**
 * A combination of X and Y levels
 */
export interface LevelCombination {
  /** The X (cause) level */
  xLevel: Level;
  /** The Y (effect) level */
  yLevel: Level;
  /** Whether this combination is selected */
  selected: boolean;
  /** Generated sub-hypothesis for this combination */
  subHypothesis?: SubHypothesis;
}

/**
 * A sub-hypothesis generated from level splitting
 */
export interface SubHypothesis {
  /** Unique identifier */
  id: string;
  /** The refined statement */
  statement: string;
  /** Which X level it addresses */
  xLevelId: string;
  /** Which Y level it addresses */
  yLevelId: string;
  /** Is this the chosen focus? */
  isFocused?: boolean;
}

/**
 * Result of the Level Split operator
 */
export interface LevelSplitResult {
  /** Identified levels for X (cause) */
  xLevels: Level[];
  /** Identified levels for Y (effect) */
  yLevels: Level[];
  /** Selected level combinations */
  selectedCombinations: LevelCombination[];
  /** Generated sub-hypotheses */
  subHypotheses: SubHypothesis[];
  /** ID of the focused sub-hypothesis */
  focusedHypothesisId: string | null;
  /** The focused sub-hypothesis as a full HypothesisCard (if generated) */
  focusedHypothesis?: HypothesisCard;
}

// ============================================================================
// Step Configurations
// ============================================================================

/**
 * Step IDs for the Level Split operator
 */
export const LEVEL_SPLIT_STEP_IDS = {
  IDENTIFY_X: "identify-x-levels",
  IDENTIFY_Y: "identify-y-levels",
  REVIEW_MATRIX: "review-level-matrix",
  GENERATE_SUB: "generate-sub-hypotheses",
  CHOOSE_FOCUS: "choose-focus",
} as const;

/**
 * Check if X levels have been selected
 */
function hasXLevelsSelected(session: OperatorSession): boolean {
  const xLevels = session.userSelections[LEVEL_SPLIT_STEP_IDS.IDENTIFY_X] as Level[] | undefined;
  return Array.isArray(xLevels) && xLevels.some((l) => l.selected);
}

/**
 * Check if Y levels have been selected
 */
function hasYLevelsSelected(session: OperatorSession): boolean {
  const yLevels = session.userSelections[LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y] as Level[] | undefined;
  return Array.isArray(yLevels) && yLevels.some((l) => l.selected);
}

/**
 * Check if combinations have been selected
 */
function hasCombinationsSelected(session: OperatorSession): boolean {
  const combinations = session.userSelections[LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX] as
    | LevelCombination[]
    | undefined;
  return Array.isArray(combinations) && combinations.some((c) => c.selected);
}

/**
 * Check if sub-hypotheses have been generated
 */
function hasSubHypotheses(session: OperatorSession): boolean {
  const subs = session.generatedContent[LEVEL_SPLIT_STEP_IDS.GENERATE_SUB] as
    | SubHypothesis[]
    | undefined;
  return Array.isArray(subs) && subs.length > 0;
}

/**
 * Check if a focus has been chosen
 */
function hasFocusChosen(session: OperatorSession): boolean {
  const focusId = session.userSelections[LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS] as string | undefined;
  return typeof focusId === "string" && focusId.length > 0;
}

/**
 * Step configurations for the Level Split operator
 */
export const LEVEL_SPLIT_STEPS: OperatorStepConfig[] = [
  {
    id: LEVEL_SPLIT_STEP_IDS.IDENTIFY_X,
    name: "Identify X Levels",
    description:
      "Your hypothesis involves a cause (X). This could refer to several different things at different levels of analysis. Select all that apply.",
    helpText: `
**Why this matters:**
Most causes actually span multiple levels. "Social media use" could mean:
- Daily screen time (temporal)
- Specific platforms (implementation)
- Active vs passive use (mechanism)
- Adolescents vs adults (population)

Select all levels that could apply to your X variable.
    `.trim(),
    isComplete: hasXLevelsSelected,
    validate: (session) => {
      if (!hasXLevelsSelected(session)) {
        return {
          valid: false,
          errors: ["Select at least one level for X"],
          warnings: [],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
  {
    id: LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y,
    name: "Identify Y Levels",
    description: "Now consider your outcome (Y). It also spans multiple levels of analysis.",
    helpText: `
**Why this matters:**
Outcomes are measured and defined in many ways. "Depression" could mean:
- Clinical diagnosis (measurement)
- Self-reported symptoms (measurement)
- Acute episode vs chronic state (temporal)
- Individual suffering vs population burden (scale)

Select all levels that could apply to your Y variable.
    `.trim(),
    isComplete: hasYLevelsSelected,
    validate: (session) => {
      if (!hasYLevelsSelected(session)) {
        return {
          valid: false,
          errors: ["Select at least one level for Y"],
          warnings: [],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
  {
    id: LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX,
    name: "Review Level Matrix",
    description:
      "Here are all the combinations of X and Y levels. Select which combinations you're actually investigating.",
    helpText: `
**Why this matters:**
Not every X-Y combination makes sense. You might be studying:
- Acute exposure → Chronic effects
- Platform-level changes → Individual outcomes

Select only the combinations that apply to your research question.
    `.trim(),
    isComplete: hasCombinationsSelected,
    validate: (session) => {
      if (!hasCombinationsSelected(session)) {
        return {
          valid: false,
          errors: ["Select at least one X-Y combination"],
          warnings: [],
        };
      }
      const combinations = session.userSelections[
        LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX
      ] as LevelCombination[];
      const selectedCount = combinations.filter((c) => c.selected).length;
      if (selectedCount > 5) {
        return {
          valid: true,
          errors: [],
          warnings: ["Consider focusing on fewer combinations for clarity"],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
  {
    id: LEVEL_SPLIT_STEP_IDS.GENERATE_SUB,
    name: "Generate Sub-Hypotheses",
    description:
      "Based on your selections, we can generate focused sub-hypotheses for each combination.",
    helpText: `
**What happens here:**
Each X-Y combination becomes a distinct, testable sub-hypothesis.
These are more precise than your original hypothesis and can be
investigated independently.
    `.trim(),
    isComplete: hasSubHypotheses,
  },
  {
    id: LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS,
    name: "Choose Focus",
    description: "Which sub-hypothesis will you pursue first? The others can be addressed later.",
    helpText: `
**Why focus matters:**
Brenner emphasized focusing ruthlessly. You can't investigate everything
at once. Choose the sub-hypothesis that is:
- Most tractable experimentally
- Most likely to provide discriminative information
- Most important to your research goals
    `.trim(),
    isComplete: hasFocusChosen,
    validate: (session) => {
      if (!hasFocusChosen(session)) {
        return {
          valid: false,
          errors: ["Choose a sub-hypothesis to focus on"],
          warnings: [],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
];

// ============================================================================
// Level Generation
// ============================================================================

/**
 * Default X level templates by category
 */
export const X_LEVEL_TEMPLATES: Record<LevelCategory, Level[]> = {
  temporal: [
    {
      id: "x-acute",
      name: "Acute Exposure",
      description: "Short-term, immediate exposure",
      category: "temporal",
    },
    {
      id: "x-chronic",
      name: "Chronic Exposure",
      description: "Long-term, sustained exposure",
      category: "temporal",
    },
  ],
  measurement: [
    {
      id: "x-self-report",
      name: "Self-Reported",
      description: "Based on participant reports",
      category: "measurement",
    },
    {
      id: "x-objective",
      name: "Objective Measure",
      description: "Based on tracked/logged data",
      category: "measurement",
    },
  ],
  population: [
    {
      id: "x-individual",
      name: "Individual Level",
      description: "Effect on specific persons",
      category: "population",
    },
    {
      id: "x-group",
      name: "Group/Population Level",
      description: "Aggregate population effects",
      category: "population",
    },
  ],
  mechanism: [
    {
      id: "x-direct",
      name: "Direct Effect",
      description: "Immediate causal pathway",
      category: "mechanism",
    },
    {
      id: "x-indirect",
      name: "Indirect Effect",
      description: "Mediated through other variables",
      category: "mechanism",
    },
  ],
  implementation: [
    {
      id: "x-platform",
      name: "Platform Level",
      description: "The system/platform itself",
      category: "implementation",
    },
    {
      id: "x-algorithm",
      name: "Algorithm Level",
      description: "Specific algorithmic features",
      category: "implementation",
    },
    {
      id: "x-interface",
      name: "Interface Level",
      description: "User interface design",
      category: "implementation",
    },
  ],
  scale: [
    {
      id: "x-micro",
      name: "Micro Scale",
      description: "Small-scale effects",
      category: "scale",
    },
    {
      id: "x-macro",
      name: "Macro Scale",
      description: "Large-scale effects",
      category: "scale",
    },
  ],
  other: [],
};

/**
 * Default Y level templates by category
 */
export const Y_LEVEL_TEMPLATES: Record<LevelCategory, Level[]> = {
  temporal: [
    {
      id: "y-immediate",
      name: "Immediate Outcome",
      description: "Short-term effects",
      category: "temporal",
    },
    {
      id: "y-delayed",
      name: "Delayed Outcome",
      description: "Long-term effects",
      category: "temporal",
    },
  ],
  measurement: [
    {
      id: "y-clinical",
      name: "Clinical Measure",
      description: "Clinician-assessed outcome",
      category: "measurement",
    },
    {
      id: "y-self-report",
      name: "Self-Reported",
      description: "Participant-reported outcome",
      category: "measurement",
    },
    {
      id: "y-behavioral",
      name: "Behavioral Measure",
      description: "Observable behavior",
      category: "measurement",
    },
  ],
  population: [
    {
      id: "y-individual",
      name: "Individual Outcome",
      description: "Per-person effect",
      category: "population",
    },
    {
      id: "y-aggregate",
      name: "Aggregate Outcome",
      description: "Population-level effect",
      category: "population",
    },
  ],
  mechanism: [
    {
      id: "y-proximal",
      name: "Proximal Outcome",
      description: "Near/direct consequence",
      category: "mechanism",
    },
    {
      id: "y-distal",
      name: "Distal Outcome",
      description: "Far/downstream consequence",
      category: "mechanism",
    },
  ],
  implementation: [],
  scale: [
    {
      id: "y-minor",
      name: "Minor Effect",
      description: "Small magnitude",
      category: "scale",
    },
    {
      id: "y-major",
      name: "Major Effect",
      description: "Large magnitude",
      category: "scale",
    },
  ],
  other: [],
};

/**
 * Generate X levels based on hypothesis content
 */
export function generateXLevels(hypothesis: HypothesisCard): Level[] {
  // Start with relevant templates
  const levels: Level[] = [];

  // Add temporal levels (almost always relevant)
  levels.push(...X_LEVEL_TEMPLATES.temporal);

  // Add measurement levels
  levels.push(...X_LEVEL_TEMPLATES.measurement);

  // Add mechanism levels
  levels.push(...X_LEVEL_TEMPLATES.mechanism);

  // Add population levels if domain includes social/psych
  const domains = hypothesis.domain.map((d) => d.toLowerCase());
  if (
    domains.some(
      (d) =>
        d.includes("social") ||
        d.includes("psych") ||
        d.includes("health") ||
        d.includes("epidemiology"),
    )
  ) {
    levels.push(...X_LEVEL_TEMPLATES.population);
  }

  // Add implementation levels if domain includes tech/media
  if (
    domains.some(
      (d) =>
        d.includes("tech") ||
        d.includes("media") ||
        d.includes("digital") ||
        d.includes("software"),
    )
  ) {
    levels.push(...X_LEVEL_TEMPLATES.implementation);
  }

  return levels;
}

/**
 * Generate Y levels based on hypothesis content
 */
export function generateYLevels(hypothesis: HypothesisCard): Level[] {
  const levels: Level[] = [];

  // Add temporal levels
  levels.push(...Y_LEVEL_TEMPLATES.temporal);

  // Add measurement levels (almost always relevant)
  levels.push(...Y_LEVEL_TEMPLATES.measurement);

  // Add mechanism levels
  levels.push(...Y_LEVEL_TEMPLATES.mechanism);

  // Add population levels if relevant
  const domains = hypothesis.domain.map((d) => d.toLowerCase());
  if (
    domains.some(
      (d) =>
        d.includes("social") ||
        d.includes("psych") ||
        d.includes("health") ||
        d.includes("epidemiology"),
    )
  ) {
    levels.push(...Y_LEVEL_TEMPLATES.population);
  }

  // Add scale levels
  levels.push(...Y_LEVEL_TEMPLATES.scale);

  return levels;
}

/**
 * Generate the level combination matrix
 */
export function generateCombinationMatrix(xLevels: Level[], yLevels: Level[]): LevelCombination[] {
  const selectedXLevels = xLevels.filter((l) => l.selected);
  const selectedYLevels = yLevels.filter((l) => l.selected);

  const combinations: LevelCombination[] = [];

  for (const xLevel of selectedXLevels) {
    for (const yLevel of selectedYLevels) {
      combinations.push({
        xLevel,
        yLevel,
        selected: false,
      });
    }
  }

  return combinations;
}

/**
 * Generate a sub-hypothesis for a level combination
 */
export function generateSubHypothesis(
  originalHypothesis: HypothesisCard,
  combination: LevelCombination,
): SubHypothesis {
  const id = `sub-${combination.xLevel.id}-${combination.yLevel.id}`;

  // Create a more specific statement
  const statement = refineStatement(
    originalHypothesis.statement,
    combination.xLevel,
    combination.yLevel,
  );

  return {
    id,
    statement,
    xLevelId: combination.xLevel.id,
    yLevelId: combination.yLevel.id,
  };
}

/**
 * Refine the hypothesis statement for a specific level combination
 */
function refineStatement(originalStatement: string, xLevel: Level, yLevel: Level): string {
  // Extract key parts and refine
  // This is a simplified version - could be enhanced with NLP
  const xQualifier = xLevel.name.toLowerCase();
  const yQualifier = yLevel.name.toLowerCase();

  // Add qualifiers to make the statement more specific
  return `Specifically regarding ${xQualifier}: ${originalStatement} (measured as ${yQualifier})`;
}

/**
 * Build the complete Level Split result from session state
 */
export function buildLevelSplitResult(
  session: OperatorSession<LevelSplitResult>,
): LevelSplitResult {
  const xLevels = (session.userSelections[LEVEL_SPLIT_STEP_IDS.IDENTIFY_X] as Level[]) ?? [];
  const yLevels = (session.userSelections[LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y] as Level[]) ?? [];
  const combinations =
    (session.userSelections[LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX] as LevelCombination[]) ?? [];
  const subHypotheses =
    (session.generatedContent[LEVEL_SPLIT_STEP_IDS.GENERATE_SUB] as SubHypothesis[]) ?? [];
  const focusedHypothesisId =
    (session.userSelections[LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS] as string) ?? null;

  return {
    xLevels: xLevels.filter((l) => l.selected),
    yLevels: yLevels.filter((l) => l.selected),
    selectedCombinations: combinations.filter((c) => c.selected),
    subHypotheses,
    focusedHypothesisId,
  };
}

// ============================================================================
// Brenner Quotes for Level Split
// ============================================================================

/**
 * Quote bank section IDs relevant to Level Split
 */
export const LEVEL_SPLIT_QUOTE_ANCHORS = [
  "§42", // Level separation
  "§43", // Levels of explanation
  "§57", // Model organism levels
];

/**
 * Fallback quotes if quote bank is unavailable
 */
export const LEVEL_SPLIT_FALLBACK_QUOTES = [
  {
    sectionId: "§42",
    title: "Level Separation",
    quote:
      "You have to separate the levels of analysis before you start. Otherwise you're testing something that's a mixture of many different things.",
    context: "Brenner on the importance of distinguishing analytical levels",
    tags: ["level-split", "analysis"],
  },
];
