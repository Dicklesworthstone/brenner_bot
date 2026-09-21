/**
 * Operator Documentation & In-Session Help
 *
 * Extended documentation for all Brenner Loop operators, providing:
 * - Conceptual explanations
 * - When to use guidance
 * - Key questions for each operator
 * - Brenner examples and quotes
 * - Form guidance tips
 *
 * @see brenner_bot-yh1c (bead)
 * @module brenner-loop/operators/docs
 */

import type { OperatorType } from "./framework";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended documentation for an operator
 */
export interface OperatorDocumentation {
  /** Operator type */
  type: OperatorType;

  /** Concise conceptual explanation */
  concept: string;

  /** Detailed explanation (markdown) */
  explanation: string;

  /** When to apply this operator */
  whenToUse: string[];

  /** Situations where this operator is NOT appropriate */
  whenNotToUse?: string[];

  /** The key question this operator answers */
  keyQuestion: string;

  /** Example from Brenner's work */
  brennerExample: {
    /** Title of the example */
    title: string;
    /** Description of how Brenner used this approach */
    description: string;
    /** Quote section reference (e.g., "§42") */
    quoteSection?: string;
  };

  /** Tips for each step of the operator */
  stepTips: Record<string, OperatorStepTip>;

  /** Relevant quote section IDs from the corpus */
  relevantQuoteSections: string[];

  /** Common mistakes to avoid */
  commonMistakes: string[];

  /** Success criteria - what a good output looks like */
  successCriteria: string[];
}

/**
 * A tip for a specific operator step
 */
export interface OperatorStepTip {
  /** Short headline */
  headline: string;
  /** Detailed guidance */
  guidance: string;
  /** Example input */
  example?: string;
  /** What NOT to do */
  antiPattern?: string;
}

// ============================================================================
// Level Split (Σ) Documentation
// ============================================================================

export const LEVEL_SPLIT_DOCS: OperatorDocumentation = {
  type: "level_split",

  concept:
    "Identify which level of explanation your hypothesis operates at, and whether you're accidentally conflating multiple levels.",

  explanation: `
The Level Split operator helps you recognize when your hypothesis is mixing
different levels of explanation. In biology, for instance, phenomena can be
explained at the molecular, cellular, tissue, organ, organism, or population
level. Brenner emphasized that confusing levels leads to muddled thinking.

**The Core Insight**: When you say "X causes Y", are X and Y at the same level?
If not, you need intermediate mechanisms. If you're measuring at one level but
theorizing at another, your test may not be discriminative.

Think of it like programming: you can't debug assembly by looking at the user
interface. You need to match your investigation to the right abstraction level.
  `.trim(),

  whenToUse: [
    "Your hypothesis spans from microscale to macroscale (e.g., 'genes cause behavior')",
    "You're unsure which measurements would actually test your claim",
    "Different experts give contradictory-seeming evidence",
    "The mechanism seems to 'skip' steps in the causal chain",
  ],

  whenNotToUse: [
    "Your hypothesis is already specific to a single level",
    "You're comparing alternatives at the same level",
  ],

  keyQuestion: "At what level of organization is this phenomenon actually happening?",

  brennerExample: {
    title: "Genetic Code vs. Protein Folding",
    description: `
Brenner was careful to distinguish the genetic CODE (information level) from
protein FOLDING (physical level). Early confusion arose because people assumed
DNA "caused" protein structure directly. Brenner recognized these were
different levels: the code specifies the sequence; physics determines the fold.

This level-separation allowed him to focus on the triplet coding problem without
getting distracted by folding questions that required different experimental
approaches.
    `.trim(),
    quoteSection: "§34",
  },

  stepTips: {
    "identify-x-levels": {
      headline: "Decompose the CAUSE",
      guidance:
        "Break down the 'X' (cause) into different levels. What's happening at the mechanism level? At the system level? At the population level?",
      example:
        "For 'coffee causes alertness': molecular (caffeine blocking adenosine), cellular (neuron firing), behavioral (attention), social (coffee culture).",
      antiPattern:
        "Don't assume your hypothesis is already at a single level just because it sounds simple.",
    },
    "identify-y-levels": {
      headline: "Decompose the EFFECT",
      guidance:
        "Break down the 'Y' (effect) into different levels. How would you measure it at each level?",
      example:
        "For 'depression': neurochemical (serotonin levels), psychological (mood self-report), behavioral (activity reduction), social (withdrawal from relationships).",
    },
    "review-level-matrix": {
      headline: "Match levels for testable claims",
      guidance:
        "Pair X-levels with Y-levels to create specific, testable sub-hypotheses. The most useful pairs are at the SAME level.",
      example:
        "Instead of 'social media → depression', try 'comparison behavior (behavioral) → negative self-evaluation (psychological)'.",
    },
    "generate-sub-hypotheses": {
      headline: "Review the generated sub-hypotheses",
      guidance:
        "Each X-Y combination becomes a focused sub-hypothesis. These are more testable than your original broad claim.",
    },
    "choose-focus": {
      headline: "Choose your primary level",
      guidance:
        "Select 1-2 level combinations that are most testable with available methods and most relevant to your core question.",
    },
  },

  relevantQuoteSections: ["§34", "§35", "§67", "§89"],

  commonMistakes: [
    "Treating all levels as equally testable with the same methods",
    "Assuming causal arrows pass directly from low to high levels without intermediates",
    "Conflating measurement level with phenomenon level",
    "Over-splitting into too many fine-grained levels",
  ],

  successCriteria: [
    "You can name 2-4 distinct levels relevant to your hypothesis",
    "You've identified which level your actual measurements address",
    "You have at least one matched-level sub-hypothesis to test",
    "You understand what's gained or lost at each level",
  ],
};

// ============================================================================
// Exclusion Test (⊘) Documentation
// ============================================================================

export const EXCLUSION_TEST_DOCS: OperatorDocumentation = {
  type: "exclusion_test",

  concept:
    "Design tests that can EXCLUDE your hypothesis — not merely weaken it, but definitively rule it out.",

  explanation: `
The Exclusion Test is THE key operator in the Brenner approach. It shifts focus
from "how do I prove I'm right?" to "what would prove I'm WRONG?"

**The Core Insight**: A hypothesis that can't be excluded isn't really a
hypothesis — it's just a belief. Science advances by elimination. When you
design an exclusion test, you're asking: what observation would force me to
completely abandon this idea?

The test must give a CLEAN answer. If every possible outcome is consistent with
your hypothesis, you haven't designed a test — you've designed a ritual.
  `.trim(),

  whenToUse: [
    "You have a clear hypothesis to test",
    "You want to discriminate between competing explanations",
    "You need to prioritize which experiments to run",
    "You're not sure if your evidence is actually discriminative",
  ],

  whenNotToUse: [
    "You're still in exploratory mode without clear hypotheses",
    "Your hypothesis is unfalsifiable by design (e.g., untestable metaphysics)",
  ],

  keyQuestion: "What would prove you wrong — not 'less right' — definitively wrong?",

  brennerExample: {
    title: "The Triplet Code Exclusion",
    description: `
When testing whether the genetic code was based on triplets, Brenner designed
experiments that could EXCLUDE alternatives. A doublet code would produce
different frame-shift patterns. An overlapping code would limit which amino
acid sequences were possible.

He didn't just look for evidence supporting triplets — he specifically designed
tests where non-triplet codes would give different, identifiable results. When
those alternatives were excluded, triplets remained by elimination.
    `.trim(),
    quoteSection: "§89",
  },

  stepTips: {
    "review-hypothesis": {
      headline: "Identify what you're claiming",
      guidance:
        "Before designing tests, be crystal clear about what your hypothesis actually predicts. What MUST be true if you're right?",
      antiPattern:
        "Don't proceed if your hypothesis is vague or unfalsifiable. Go back and sharpen it first.",
    },
    "generate-tests": {
      headline: "Focus on discriminative power",
      guidance:
        "The best tests are ones where your hypothesis and alternatives make DIFFERENT predictions. Look for natural experiments, mechanism blocks, and cross-context tests.",
      example:
        "If you claim X causes Y, a strong test is: find situations where X is absent/blocked and check if Y still occurs.",
    },
    "select-tests": {
      headline: "Choose 2-3 high-power tests",
      guidance:
        "Don't select too many tests. Focus on the ones with highest discriminative power that you can actually conduct.",
      antiPattern:
        "Don't pick easy tests that wouldn't really exclude your hypothesis if they 'failed'.",
    },
    "generate-protocols": {
      headline: "Be specific about pass/fail criteria",
      guidance:
        "Define BEFORE running the test exactly what result would falsify your hypothesis. Write it down. No post-hoc reinterpretation.",
      example:
        "'If we observe X > 0.5, hypothesis is supported. If X < 0.2, hypothesis is falsified. If X is 0.2-0.5, test is inconclusive.'",
    },
    "record-tests": {
      headline: "Commit to the tests",
      guidance:
        "These tests are now part of your research plan. Run them honestly and accept the results, even if they falsify your hypothesis.",
    },
  },

  relevantQuoteSections: ["§89", "§90", "§91", "§42"],

  commonMistakes: [
    "Designing tests where all outcomes support the hypothesis",
    "Choosing 'safe' tests that couldn't really exclude anything",
    "Moving the goalposts after seeing results",
    "Confusing 'consistent with' for 'evidence for'",
    "Ignoring negative results",
  ],

  successCriteria: [
    "You have at least one test that could definitively exclude your hypothesis",
    "You can state exactly what observation would prove you wrong",
    "Your tests differentiate YOUR hypothesis from alternatives",
    "You've written down pass/fail criteria BEFORE running the test",
  ],
};

// ============================================================================
// Object Transpose (⟳) Documentation
// ============================================================================

export const OBJECT_TRANSPOSE_DOCS: OperatorDocumentation = {
  type: "object_transpose",

  concept:
    "Consider alternative explanations by systematically transposing your view — what if the cause and effect are reversed, or a third variable explains both?",

  explanation: `
The Object Transpose operator forces you to consider that your X→Y hypothesis
might be wrong in fundamental ways. Maybe Y causes X. Maybe Z causes both.
Maybe the relationship is bidirectional or coincidental.

**The Core Insight**: Correlation does not imply causation, but our brains
naturally jump to causal explanations. This operator makes you systematically
generate alternatives and then design tests to discriminate between them.

Think of it as devil's advocate, but structured. You're not just asking "what
else could it be?" — you're generating specific alternative explanations that
would need different evidence to rule out.
  `.trim(),

  whenToUse: [
    "You've observed a correlation and want to test causation",
    "You're worried about reverse causation or confounding",
    "Your hypothesis feels too convenient or confirms your priors",
    "Someone challenges your causal interpretation",
  ],

  whenNotToUse: [
    "You're testing a well-established mechanism with known direction",
    "You're in early exploratory phase without specific claims yet",
  ],

  keyQuestion: "What if you've got the direction or cause completely wrong?",

  brennerExample: {
    title: "Asking What the Gene DOESN'T Do",
    description: `
Instead of always asking "what does this gene do?", Brenner sometimes asked
"what does this gene NOT do?" or "what if the observed effect is a side-effect
rather than the main function?" This transposition revealed hidden assumptions
and alternative explanations.

By asking the inverted question, he often discovered that phenomena attributed
to one mechanism were actually caused by something else entirely.
    `.trim(),
    quoteSection: "§56",
  },

  stepTips: {
    "state-hypothesis": {
      headline: "State your causal arrow clearly",
      guidance:
        "Make explicit the direction of causation you're claiming. X → Y means X causes Y. Be specific.",
    },
    "generate-alternatives": {
      headline: "Generate all major alternative explanations",
      guidance:
        "Consider: (1) Reverse causation (Y→X), (2) Third variable (Z→X and Z→Y), (3) Selection effects, (4) Bidirectional, (5) Pure coincidence.",
      example:
        "If 'exercise causes happiness': Maybe happy people exercise more (reverse). Maybe healthy lifestyle causes both (third variable). Maybe we only study gym-goers (selection).",
      antiPattern: "Don't generate weak strawman alternatives. Make them genuinely plausible.",
    },
    "rate-plausibility": {
      headline: "Honestly assess each alternative",
      guidance:
        "Rate how plausible each alternative is. Don't dismiss alternatives just because they're inconvenient for your preferred theory.",
    },
    "identify-tests": {
      headline: "Design tests that distinguish YOUR hypothesis from alternatives",
      guidance:
        "For each plausible alternative, design a test where your hypothesis and the alternative make different predictions.",
      example:
        "To distinguish X→Y from Y→X: find situations where X is manipulated (not just observed). If manipulating X changes Y, but manipulating Y doesn't change X, direction is established.",
    },
  },

  relevantQuoteSections: ["§56", "§67", "§78"],

  commonMistakes: [
    "Generating weak strawman alternatives",
    "Not considering bidirectional relationships",
    "Forgetting about selection effects",
    "Assuming correlation direction matches causation direction",
    "Dismissing alternatives without discriminating tests",
  ],

  successCriteria: [
    "You've generated at least 3 serious alternative explanations",
    "You've rated their plausibility honestly",
    "You have discriminating tests for the most plausible alternatives",
    "You know what evidence would distinguish your hypothesis from each alternative",
  ],
};

// ============================================================================
// Scale Check (⊙) Documentation
// ============================================================================

export const SCALE_CHECK_DOCS: OperatorDocumentation = {
  type: "scale_check",

  concept:
    "Verify that your claimed effect makes sense at the scale you're proposing — is the magnitude plausible? Does it hold at different scales?",

  explanation: `
The Scale Check operator asks whether your effect size is physically and
practically plausible. A 50% change in one variable might be unremarkable in
one domain but revolutionary in another.

**The Core Insight**: Before trusting an effect, ask whether it makes sense in
magnitude. Is the claimed effect size typical for this domain? What would
happen if you scaled the cause up or down by 10x?

This catches both inflation (effects that seem too large to be real) and
dismissal (effects that seem small but are actually important in context).
  `.trim(),

  whenToUse: [
    "You have quantitative results and want to assess significance",
    "An effect seems surprisingly large or small",
    "You're extrapolating from a study to a different scale",
    "You want to compare your effect to established benchmarks",
  ],

  whenNotToUse: [
    "You're still in qualitative/exploratory phase",
    "The phenomenon is inherently non-quantitative",
  ],

  keyQuestion: "Does this effect size make sense at the scale you're proposing?",

  brennerExample: {
    title: "Checking Whether Molecular Mechanisms Scale to Organism Effects",
    description: `
Brenner was always careful to check whether molecular-level mechanisms could
actually produce organism-level effects. A mutation that changes a single
protein must somehow propagate through many layers to produce the phenotype
you observe.

He would often do back-of-envelope calculations: if this pathway is the
mechanism, what magnitude of effect should we see? Does that match observations?
    `.trim(),
    quoteSection: "§45",
  },

  stepTips: {
    "quantify-effect": {
      headline: "State your effect size clearly",
      guidance:
        "Express your effect in standardized terms if possible (Cohen's d, odds ratio, correlation, percentage change). What is the actual magnitude of change?",
      example:
        "'Treatment group showed d=0.5 improvement' or 'Exposure associated with OR=2.1 for outcome'.",
    },
    "contextualize-scale": {
      headline: "Compare to domain benchmarks",
      guidance:
        "What are typical effect sizes in this domain? In psychology, d=0.5 is medium. In medicine, OR=2.0 is substantial. How does your effect compare?",
      example:
        "Psychology: Most effects are d=0.2-0.4. Your d=0.8 is either a major finding or a red flag for measurement problems.",
    },
    "measurement-precision": {
      headline: "Verify measurement isn't inflating or deflating",
      guidance:
        "Are you measuring the effect correctly? Could your measurement be biased, unreliable, or mismatched to the phenomenon?",
      antiPattern:
        "Don't use unreliable measures and then interpret effect sizes as if they were precise.",
    },
    "practical-significance": {
      headline: "Translate to real-world impact",
      guidance:
        "What does this effect mean in practice? If your intervention works, what's the tangible change for real people/systems?",
      example:
        "A d=0.3 improvement in test scores means about 12 percentile points on average — is that meaningful for education policy?",
    },
    "population-individual": {
      headline: "Consider variation across groups",
      guidance:
        "Does your average effect hide important variation? Are there subgroups with different (or opposite) effects?",
      example:
        "An average d=0.3 might include responders (d=1.0) and non-responders (d=0). Who benefits most?",
    },
  },

  relevantQuoteSections: ["§45", "§92"],

  commonMistakes: [
    "Ignoring domain norms for effect sizes",
    "Confusing statistical significance with practical significance",
    "Not converting to standardized effect sizes for comparison",
    "Assuming small effects are unimportant (or large effects are trustworthy)",
    "Forgetting that measurement error inflates some effects",
  ],

  successCriteria: [
    "You've stated your effect size in standardized terms",
    "You've compared to typical effects in your domain",
    "You've assessed practical significance, not just statistical",
    "You understand what the effect means at different scales",
  ],
};

// ============================================================================
// Documentation Index
// ============================================================================

/**
 * All operator documentation indexed by type
 */
export const OPERATOR_DOCUMENTATION: Record<OperatorType, OperatorDocumentation> = {
  level_split: LEVEL_SPLIT_DOCS,
  exclusion_test: EXCLUSION_TEST_DOCS,
  object_transpose: OBJECT_TRANSPOSE_DOCS,
  scale_check: SCALE_CHECK_DOCS,
};

/**
 * Get documentation for an operator
 */
export function getOperatorDocumentation(operatorType: OperatorType): OperatorDocumentation {
  return OPERATOR_DOCUMENTATION[operatorType];
}

/**
 * Get step tip for a specific operator step
 */
export function getStepTip(
  operatorType: OperatorType,
  stepId: string,
): OperatorStepTip | undefined {
  return OPERATOR_DOCUMENTATION[operatorType]?.stepTips[stepId];
}

/**
 * Get common mistakes for an operator
 */
export function getCommonMistakes(operatorType: OperatorType): string[] {
  return OPERATOR_DOCUMENTATION[operatorType]?.commonMistakes ?? [];
}

/**
 * Get success criteria for an operator
 */
export function getSuccessCriteria(operatorType: OperatorType): string[] {
  return OPERATOR_DOCUMENTATION[operatorType]?.successCriteria ?? [];
}
