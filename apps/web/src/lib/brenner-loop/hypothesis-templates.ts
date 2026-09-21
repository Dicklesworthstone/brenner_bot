/**
 * Hypothesis Template Library
 *
 * Pre-made hypothesis templates by domain that users can start from.
 * Users shouldn't start from blank - they should pick a template that
 * matches their domain and customize from there.
 *
 * @see brenner_bot-838e - FEATURE: Hypothesis Template Library
 * @module brenner-loop/hypothesis-templates
 */

import type { HypothesisCard, IdentifiedConfound } from "./hypothesis";

// ============================================================================
// Types
// ============================================================================

/**
 * A hypothesis template that users can start from.
 * Contains partial HypothesisCard fields with example content.
 */
export interface HypothesisTemplate {
  /** Unique identifier for this template */
  id: string;

  /** Display name */
  name: string;

  /** Short description of what this template is for */
  description: string;

  /** Research domain(s) this template applies to */
  domains: string[];

  /** Tags for categorization */
  tags: string[];

  /** Difficulty level of the example */
  difficulty: "beginner" | "intermediate" | "advanced";

  /** The template content (partial HypothesisCard) */
  template: HypothesisTemplateContent;

  /** Optional source or citation for the example */
  source?: string;

  /** Whether this template is featured on the landing page */
  featured?: boolean;
}

/**
 * Partial HypothesisCard content for templates.
 * These are the fields users will start with and customize.
 */
export interface HypothesisTemplateContent {
  /** Example hypothesis statement */
  statement: string;

  /** Example mechanism */
  mechanism: string;

  /** Example predictions if true */
  predictionsIfTrue: string[];

  /** Example predictions if false */
  predictionsIfFalse: string[];

  /** Example falsification conditions */
  impossibleIfTrue: string[];

  /** Example confounds to consider */
  confounds: Partial<IdentifiedConfound>[];

  /** Example background assumptions */
  assumptions: string[];

  /** Suggested initial confidence */
  suggestedConfidence: number;
}

/**
 * Category for organizing templates in the UI.
 */
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorClass: string;
  templateIds: string[];
}

// ============================================================================
// Template Definitions
// ============================================================================

/**
 * Psychology / Social Science Templates
 */
const psychologyTemplates: HypothesisTemplate[] = [
  {
    id: "psych-intervention",
    name: "Behavioral Intervention Effect",
    description: "Test whether a psychological intervention produces the claimed effect",
    domains: ["psychology", "social_science"],
    tags: ["intervention", "behavior_change", "rct"],
    difficulty: "beginner",
    featured: true,
    template: {
      statement:
        "[Intervention X] increases [outcome Y] in [population Z] through [psychological mechanism].",
      mechanism:
        "The intervention activates [cognitive/emotional process] which leads to [behavioral change] because [theoretical reason].",
      predictionsIfTrue: [
        "Intervention group shows statistically significant improvement on [outcome measure]",
        "Effect persists at [timeframe] follow-up",
        "Effect is moderated by [theoretically relevant factor]",
      ],
      predictionsIfFalse: [
        "No significant difference between intervention and control",
        "Effect disappears at follow-up (suggesting demand characteristics)",
        "Effect present equally across all conditions (suggesting non-specific factors)",
      ],
      impossibleIfTrue: [
        "Control group shows equal or greater improvement than intervention group",
        "The proposed mechanism is blocked but the effect persists",
        "Effect reverses when the intervention is intensified",
      ],
      confounds: [
        {
          id: "demand-char",
          name: "Demand Characteristics",
          description: "Participants may guess the hypothesis and behave accordingly",
          likelihood: 0.35,
          domain: "psychology",
        },
        {
          id: "placebo",
          name: "Placebo Effects",
          description: "Improvement may come from belief in treatment, not the specific mechanism",
          likelihood: 0.4,
          domain: "psychology",
        },
        {
          id: "regression",
          name: "Regression to Mean",
          description: "Extreme baseline scores naturally move toward average",
          likelihood: 0.25,
          domain: "statistics",
        },
      ],
      assumptions: [
        "The outcome measure validly captures the construct of interest",
        "Participants understood and engaged with the intervention",
        "Randomization successfully balanced confounds",
      ],
      suggestedConfidence: 40,
    },
  },
  {
    id: "psych-correlation",
    name: "Psychological Correlation Claim",
    description: "Test whether a claimed correlation reflects a causal relationship",
    domains: ["psychology", "social_science"],
    tags: ["correlation", "causation", "observational"],
    difficulty: "intermediate",
    template: {
      statement:
        "[Variable A] causally affects [Variable B] because [mechanism], not merely correlates with it.",
      mechanism:
        "[Variable A] produces [intermediate effect] which then changes [Variable B] through [specific pathway].",
      predictionsIfTrue: [
        "Temporal precedence: A changes before B changes",
        "Dose-response: Stronger A leads to stronger effect on B",
        "Blocking the proposed mechanism reduces or eliminates the A-B relationship",
      ],
      predictionsIfFalse: [
        "Third variable C explains both A and B",
        "Reverse causation: B actually causes A",
        "Relationship disappears when controlling for [specific confound]",
      ],
      impossibleIfTrue: [
        "Manipulating A has no effect on B in experimental settings",
        "Natural experiments (twins, adoption) show no relationship",
        "The relationship reverses across different populations",
      ],
      confounds: [
        {
          id: "third-var",
          name: "Third Variable Problem",
          description: "An unmeasured variable causes both A and B",
          likelihood: 0.5,
          domain: "methodology",
        },
        {
          id: "reverse-cause",
          name: "Reverse Causation",
          description: "B might actually cause A",
          likelihood: 0.3,
          domain: "methodology",
        },
        {
          id: "selection",
          name: "Selection Effects",
          description: "People who have A differ systematically from those who don't",
          likelihood: 0.35,
          domain: "epidemiology",
        },
      ],
      assumptions: [
        "Measurement of A and B is valid and reliable",
        "Sample is representative of the population of interest",
        "No unmeasured confounds systematically bias the relationship",
      ],
      suggestedConfidence: 30,
    },
  },
];

/**
 * Biology / Medicine Templates
 */
const biologyTemplates: HypothesisTemplate[] = [
  {
    id: "bio-mechanism",
    name: "Biological Mechanism Hypothesis",
    description: "Test whether a proposed biological mechanism produces the observed effect",
    domains: ["biology_medicine", "neuroscience"],
    tags: ["mechanism", "molecular", "pathway"],
    difficulty: "intermediate",
    featured: true,
    template: {
      statement:
        "[Molecule/Process X] causes [biological effect Y] by [mechanism] in [cell type/tissue/organism].",
      mechanism:
        "X binds to [receptor/target] which activates [signaling pathway], leading to [downstream effect] and ultimately [phenotypic outcome].",
      predictionsIfTrue: [
        "Blocking X prevents Y from occurring",
        "Increasing X dose increases Y (within physiological range)",
        "The intermediate steps (receptor binding, pathway activation) are detectable",
        "Genetic knockout of pathway component eliminates the effect",
      ],
      predictionsIfFalse: [
        "Y occurs even when X is absent or blocked",
        "The proposed intermediate steps don't occur",
        "Alternative pathways can fully substitute for the blocked mechanism",
      ],
      impossibleIfTrue: [
        "Y increases when X is knocked out or pharmacologically blocked",
        "Y occurs in cell types that lack the proposed receptor/pathway",
        "Time course is wrong (Y happens before X could act)",
      ],
      confounds: [
        {
          id: "off-target",
          name: "Off-Target Effects",
          description: "Drug or manipulation affects other pathways beyond the target",
          likelihood: 0.4,
          domain: "biology_medicine",
        },
        {
          id: "compensation",
          name: "Compensatory Mechanisms",
          description: "Organism compensates for manipulation, masking true effects",
          likelihood: 0.3,
          domain: "biology_medicine",
        },
        {
          id: "batch",
          name: "Batch Effects",
          description: "Technical variation between experimental batches",
          likelihood: 0.35,
          domain: "biology_medicine",
        },
      ],
      assumptions: [
        "The model system (cell line, animal) is relevant to the question",
        "Measurements are specific to the target molecule/process",
        "Manipulations are specific and don't have confounding effects",
      ],
      suggestedConfidence: 35,
    },
  },
  {
    id: "bio-drug-target",
    name: "Drug Target Validation",
    description: "Validate that a molecular target is responsible for drug efficacy",
    domains: ["biology_medicine"],
    tags: ["drug_discovery", "target_validation", "pharmacology"],
    difficulty: "advanced",
    template: {
      statement:
        "[Drug D] produces therapeutic effect by inhibiting/activating [Target T], not through off-target effects.",
      mechanism:
        "D binds to T with [affinity], causing [conformational change/activity modulation], which leads to [downstream effect] and [therapeutic outcome].",
      predictionsIfTrue: [
        "Genetic knockdown/knockout of T phenocopies drug effect",
        "Resistant mutations in T eliminate drug efficacy",
        "Structurally distinct drugs targeting T produce similar effects",
        "Drug effect correlates with target engagement biomarkers",
      ],
      predictionsIfFalse: [
        "Drug effect persists when T is absent",
        "Drug effects dissociate from target binding",
        "Highly selective T modulators don't reproduce the effect",
      ],
      impossibleIfTrue: [
        "T knockout has opposite effect to drug treatment",
        "Drug effect occurs faster than target engagement",
        "Effect size doesn't correlate with target occupancy",
      ],
      confounds: [
        {
          id: "polypharm",
          name: "Polypharmacology",
          description: "Drug hits multiple targets beyond the intended one",
          likelihood: 0.45,
          domain: "biology_medicine",
        },
        {
          id: "metabolite",
          name: "Active Metabolites",
          description: "Drug metabolites may have different activity profile",
          likelihood: 0.25,
          domain: "biology_medicine",
        },
        {
          id: "genetic-bg",
          name: "Genetic Background",
          description: "Knockout effects depend on genetic background",
          likelihood: 0.3,
          domain: "biology_medicine",
        },
      ],
      assumptions: [
        "Binding assays reflect in vivo target engagement",
        "Genetic models are representative of drug action",
        "Dose-response relationships are monotonic",
      ],
      suggestedConfidence: 30,
    },
  },
];

/**
 * Economics / Business Templates
 */
const economicsTemplates: HypothesisTemplate[] = [
  {
    id: "econ-intervention",
    name: "Economic Policy Effect",
    description: "Test whether an economic policy produces its intended effect",
    domains: ["economics"],
    tags: ["policy", "causal_inference", "quasi_experiment"],
    difficulty: "intermediate",
    featured: true,
    template: {
      statement:
        "[Policy X] causes [economic outcome Y] by changing [behavioral/market mechanism].",
      mechanism:
        "Policy X changes [incentives/constraints/information], leading agents to [behavioral response], which aggregates to [market/macro outcome].",
      predictionsIfTrue: [
        "Y changes after policy implementation (with appropriate lag)",
        "Effect is larger in regions/groups more exposed to the policy",
        "Effect size is consistent with theoretical predictions",
        "Behavioral mechanism is observable in micro data",
      ],
      predictionsIfFalse: [
        "Y follows same trend in treated and control regions",
        "Pre-existing trends explain the observed changes",
        "Effect appears in placebo periods before implementation",
      ],
      impossibleIfTrue: [
        "Outcome Y changed before the policy was implemented",
        "Effect is present in control groups not exposed to policy",
        "Effect persists when policy is reversed",
      ],
      confounds: [
        {
          id: "selection-treat",
          name: "Selection into Treatment",
          description: "Regions/agents that adopt policy differ systematically",
          likelihood: 0.45,
          domain: "economics",
        },
        {
          id: "concurrent",
          name: "Concurrent Events",
          description: "Other changes happened at the same time as the policy",
          likelihood: 0.35,
          domain: "economics",
        },
        {
          id: "anticipation",
          name: "Anticipation Effects",
          description: "Agents changed behavior in anticipation of the policy",
          likelihood: 0.25,
          domain: "economics",
        },
      ],
      assumptions: [
        "Parallel trends: Treatment and control would have followed same path absent policy",
        "No spillovers between treatment and control groups",
        "Policy implementation was as planned (no compliance issues)",
      ],
      suggestedConfidence: 35,
    },
  },
  {
    id: "econ-market",
    name: "Market Mechanism Hypothesis",
    description: "Test a claim about how a specific market mechanism operates",
    domains: ["economics"],
    tags: ["market_design", "mechanism", "microeconomics"],
    difficulty: "advanced",
    template: {
      statement:
        "[Market feature X] produces [outcome Y] through [economic mechanism], not through [alternative explanation].",
      mechanism:
        "X changes [information/incentives/transaction costs], which leads rational agents to [behavioral response], resulting in [equilibrium outcome Y].",
      predictionsIfTrue: [
        "Y emerges when X is present but not when X is absent",
        "Y is stronger when X is more intense (dose-response)",
        "Agent behavior matches the predicted rational response",
        "Y persists in repeated interactions (not just one-shot)",
      ],
      predictionsIfFalse: [
        "Y occurs even without X (alternative mechanism dominates)",
        "Agent behavior contradicts rational predictions",
        "Y disappears when information/framing changes (behavioral explanation)",
      ],
      impossibleIfTrue: [
        "Y reverses when X is intensified",
        "Markets with X perform worse than those without",
        "Agent behavior is random with respect to X",
      ],
      confounds: [
        {
          id: "bounded-rat",
          name: "Bounded Rationality",
          description: "Agents may not behave as rationally as assumed",
          likelihood: 0.4,
          domain: "economics",
        },
        {
          id: "info-asym",
          name: "Information Asymmetries",
          description: "Some agents may have more/better information",
          likelihood: 0.35,
          domain: "economics",
        },
        {
          id: "external",
          name: "Externalities",
          description: "Effects on third parties not captured in model",
          likelihood: 0.3,
          domain: "economics",
        },
      ],
      assumptions: [
        "Market participants are reasonably rational",
        "Transaction costs are not prohibitive",
        "Market is in approximate equilibrium",
      ],
      suggestedConfidence: 40,
    },
  },
];

/**
 * Computer Science / Machine Learning Templates
 */
const csTemplates: HypothesisTemplate[] = [
  {
    id: "ml-method",
    name: "ML Method Improvement Claim",
    description: "Test whether a proposed ML method actually improves over baselines",
    domains: ["computer_science"],
    tags: ["machine_learning", "benchmark", "ablation"],
    difficulty: "intermediate",
    featured: true,
    template: {
      statement:
        "[Method X] outperforms [baseline methods] on [task] because of [architectural/algorithmic innovation].",
      mechanism:
        "The [specific innovation] enables the model to [capture patterns/reduce bias/improve optimization] that baselines cannot, leading to better [metric] on [benchmark].",
      predictionsIfTrue: [
        "X outperforms baselines on held-out test sets",
        "Improvement persists across multiple random seeds",
        "Ablating the key innovation removes the advantage",
        "Improvement generalizes to related tasks/datasets",
      ],
      predictionsIfFalse: [
        "Performance matches baselines when properly tuned",
        "Improvement comes from hyperparameter tuning, not architecture",
        "Results don't replicate with different random seeds",
        "Performance degrades on out-of-distribution data",
      ],
      impossibleIfTrue: [
        "Baseline methods consistently outperform X across seeds",
        "X performs worse when the key innovation is added vs removed",
        "X fails on the exact task it was designed for",
      ],
      confounds: [
        {
          id: "compute-confound",
          name: "Compute Confound",
          description: "X may just use more compute/parameters than baselines",
          likelihood: 0.45,
          domain: "computer_science",
        },
        {
          id: "hyperopt",
          name: "Hyperparameter Optimization",
          description: "X may benefit from better tuning than baselines",
          likelihood: 0.4,
          domain: "computer_science",
        },
        {
          id: "data-leakage",
          name: "Data Leakage",
          description: "Test data may have leaked into training",
          likelihood: 0.2,
          domain: "computer_science",
        },
      ],
      assumptions: [
        "Baselines are properly implemented and tuned",
        "Benchmark is representative of the task of interest",
        "Evaluation metric captures what we care about",
      ],
      suggestedConfidence: 35,
    },
  },
  {
    id: "cs-system",
    name: "System Design Hypothesis",
    description: "Test whether a system design decision produces claimed benefits",
    domains: ["computer_science"],
    tags: ["systems", "architecture", "performance"],
    difficulty: "advanced",
    template: {
      statement:
        "[Design choice X] improves [performance metric Y] by [mechanism] compared to [alternative designs].",
      mechanism:
        "X reduces [bottleneck/overhead] by [technical approach], which enables [improved behavior] under [workload conditions].",
      predictionsIfTrue: [
        "X shows better Y under representative workloads",
        "Improvement scales with workload intensity",
        "Removing X degrades performance",
        "Alternative designs show the predicted limitations",
      ],
      predictionsIfFalse: [
        "Performance is similar across designs",
        "Different workloads favor different designs",
        "Improvement comes from implementation quality, not design",
      ],
      impossibleIfTrue: [
        "X performs worse than simpler alternatives consistently",
        "The mechanism X optimizes isn't actually the bottleneck",
        "X introduces overhead that exceeds its benefits",
      ],
      confounds: [
        {
          id: "impl-quality",
          name: "Implementation Quality",
          description: "Better implementation may explain performance differences",
          likelihood: 0.4,
          domain: "computer_science",
        },
        {
          id: "workload-fit",
          name: "Workload Fit",
          description: "Design may only benefit specific workload patterns",
          likelihood: 0.35,
          domain: "computer_science",
        },
        {
          id: "micro-bench",
          name: "Microbenchmark Bias",
          description: "Synthetic benchmarks may not reflect real usage",
          likelihood: 0.3,
          domain: "computer_science",
        },
      ],
      assumptions: [
        "Benchmarks are representative of real-world usage",
        "Compared systems have similar implementation maturity",
        "Hardware/environment is controlled across comparisons",
      ],
      suggestedConfidence: 40,
    },
  },
];

/**
 * Neuroscience Templates
 */
const neuroscienceTemplates: HypothesisTemplate[] = [
  {
    id: "neuro-region",
    name: "Brain Region Function Hypothesis",
    description: "Test whether a brain region is necessary/sufficient for a cognitive function",
    domains: ["neuroscience", "psychology"],
    tags: ["neuroimaging", "lesion", "cognitive"],
    difficulty: "intermediate",
    template: {
      statement:
        "[Brain region R] is necessary for [cognitive function F] because [neural mechanism].",
      mechanism:
        "Region R performs [computational operation] which is required for [cognitive process] underlying behavior F.",
      predictionsIfTrue: [
        "Lesions/TMS to R impair F",
        "R shows increased activity during F (but correlation, not causation alone)",
        "Temporary inactivation of R disrupts F",
        "Stimulation of R modulates F",
      ],
      predictionsIfFalse: [
        "Damage to R spares F (other regions sufficient)",
        "R activity doesn't track F demands",
        "Inactivation of R has no effect on F",
        "F relies on distributed networks, not single region",
      ],
      impossibleIfTrue: [
        "Complete destruction of R leaves F intact",
        "F occurs before R becomes active",
        "Patients with R damage show improved F performance",
      ],
      confounds: [
        {
          id: "reverse-inf",
          name: "Reverse Inference",
          description: "Activity in R doesn't prove R is for F (R may do many things)",
          likelihood: 0.45,
          domain: "neuroscience",
        },
        {
          id: "network",
          name: "Network Effects",
          description: "Lesion/stimulation affects connected regions",
          likelihood: 0.4,
          domain: "neuroscience",
        },
        {
          id: "compensation",
          name: "Compensation",
          description: "Other regions may compensate after damage",
          likelihood: 0.35,
          domain: "neuroscience",
        },
      ],
      assumptions: [
        "The task validly measures the cognitive function of interest",
        "Manipulations are sufficiently focal",
        "Timing of measurement captures the relevant neural activity",
      ],
      suggestedConfidence: 35,
    },
  },
];

/**
 * Generic / Cross-Domain Templates
 */
const genericTemplates: HypothesisTemplate[] = [
  {
    id: "generic-blank",
    name: "Blank Template",
    description: "Start from scratch with minimal scaffolding",
    domains: ["custom"],
    tags: ["blank", "custom"],
    difficulty: "beginner",
    template: {
      statement: "[Your hypothesis here]",
      mechanism: "[How would this work? What's the causal pathway?]",
      predictionsIfTrue: ["[What would you expect to observe if this is true?]"],
      predictionsIfFalse: ["[What would you expect if this is false?]"],
      impossibleIfTrue: ["[What observation would definitively rule this out?]"],
      confounds: [],
      assumptions: ["[What are you assuming is true?]"],
      suggestedConfidence: 50,
    },
  },
  {
    id: "generic-causal",
    name: "General Causal Claim",
    description: "Template for testing any causal claim across domains",
    domains: ["custom"],
    tags: ["causal", "general", "cross-domain"],
    difficulty: "beginner",
    featured: true,
    template: {
      statement:
        "[Cause C] produces [Effect E] through [Mechanism M], not through [Alternative explanation].",
      mechanism:
        "C leads to [Intermediate step 1], which leads to [Intermediate step 2], ultimately causing E.",
      predictionsIfTrue: [
        "Manipulating C changes E",
        "Blocking the mechanism prevents C from affecting E",
        "Dose-response: More C leads to more E (within range)",
        "Temporal order: C precedes E",
      ],
      predictionsIfFalse: [
        "E occurs without C",
        "Manipulating C doesn't affect E",
        "Third variable Z explains both C and E",
        "E actually causes C (reverse causation)",
      ],
      impossibleIfTrue: [
        "Preventing C has no effect on E in controlled settings",
        "E precedes C temporally",
        "Increasing C decreases E consistently",
      ],
      confounds: [
        {
          id: "third-var",
          name: "Third Variable",
          description: "Something else causes both the apparent cause and effect",
          likelihood: 0.4,
          domain: "methodology",
        },
        {
          id: "reverse",
          name: "Reverse Causation",
          description: "Effect might actually cause the presumed cause",
          likelihood: 0.25,
          domain: "methodology",
        },
      ],
      assumptions: [
        "Cause and effect are validly measured",
        "No unmeasured confounds systematically bias the relationship",
        "The proposed mechanism is biologically/physically plausible",
      ],
      suggestedConfidence: 40,
    },
  },
];

// ============================================================================
// Template Registry
// ============================================================================

/**
 * All available hypothesis templates.
 */
export const HYPOTHESIS_TEMPLATES: HypothesisTemplate[] = [
  ...psychologyTemplates,
  ...biologyTemplates,
  ...economicsTemplates,
  ...csTemplates,
  ...neuroscienceTemplates,
  ...genericTemplates,
];

/**
 * Template lookup by ID.
 */
export const TEMPLATE_BY_ID: Map<string, HypothesisTemplate> = new Map(
  HYPOTHESIS_TEMPLATES.map((t) => [t.id, t]),
);

/**
 * Template categories for UI organization.
 */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "psychology",
    name: "Psychology & Social Science",
    description: "Behavioral interventions, correlational claims, experimental psychology",
    icon: "Brain",
    colorClass: "text-purple-600",
    templateIds: ["psych-intervention", "psych-correlation"],
  },
  {
    id: "biology",
    name: "Biology & Medicine",
    description: "Molecular mechanisms, drug targets, biomedical research",
    icon: "HeartPulse",
    colorClass: "text-red-600",
    templateIds: ["bio-mechanism", "bio-drug-target"],
  },
  {
    id: "economics",
    name: "Economics & Business",
    description: "Policy effects, market mechanisms, economic interventions",
    icon: "TrendingUp",
    colorClass: "text-green-600",
    templateIds: ["econ-intervention", "econ-market"],
  },
  {
    id: "cs",
    name: "Computer Science & ML",
    description: "ML method claims, system design, algorithmic improvements",
    icon: "Code",
    colorClass: "text-blue-600",
    templateIds: ["ml-method", "cs-system"],
  },
  {
    id: "neuroscience",
    name: "Neuroscience",
    description: "Brain region function, neural mechanisms, cognitive neuroscience",
    icon: "Zap",
    colorClass: "text-amber-600",
    templateIds: ["neuro-region"],
  },
  {
    id: "generic",
    name: "General Templates",
    description: "Cross-domain templates and blank slate",
    icon: "Settings",
    colorClass: "text-gray-600",
    templateIds: ["generic-causal", "generic-blank"],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a template by ID.
 *
 * @param id - Template ID
 * @returns The template or undefined if not found
 */
export function getTemplate(id: string): HypothesisTemplate | undefined {
  return TEMPLATE_BY_ID.get(id);
}

/**
 * Get all templates for a specific domain.
 *
 * @param domain - Domain to filter by
 * @returns Array of templates in that domain
 */
export function getTemplatesByDomain(domain: string): HypothesisTemplate[] {
  return HYPOTHESIS_TEMPLATES.filter(
    (t) => t.domains.includes(domain) || t.domains.includes("custom"),
  );
}

/**
 * Get featured templates for the landing page.
 *
 * @returns Array of featured templates
 */
export function getFeaturedTemplates(): HypothesisTemplate[] {
  return HYPOTHESIS_TEMPLATES.filter((t) => t.featured);
}

/**
 * Get templates by tag.
 *
 * @param tag - Tag to filter by
 * @returns Array of templates with that tag
 */
export function getTemplatesByTag(tag: string): HypothesisTemplate[] {
  return HYPOTHESIS_TEMPLATES.filter((t) => t.tags.includes(tag));
}

/**
 * Get templates by difficulty level.
 *
 * @param difficulty - Difficulty level
 * @returns Array of templates at that difficulty
 */
export function getTemplatesByDifficulty(
  difficulty: "beginner" | "intermediate" | "advanced",
): HypothesisTemplate[] {
  return HYPOTHESIS_TEMPLATES.filter((t) => t.difficulty === difficulty);
}

/**
 * Search templates by text.
 *
 * @param query - Search query
 * @returns Array of matching templates
 */
export function searchTemplates(query: string): HypothesisTemplate[] {
  const lowerQuery = query.toLowerCase();
  return HYPOTHESIS_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      t.template.statement.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Convert a template to a partial HypothesisCard for use in creation.
 *
 * @param template - The template to convert
 * @returns Partial HypothesisCard that can be passed to createHypothesisCard
 */
export function templateToPartialCard(template: HypothesisTemplate): Partial<HypothesisCard> {
  const content = template.template;
  return {
    statement: content.statement,
    mechanism: content.mechanism,
    domain: template.domains,
    predictionsIfTrue: content.predictionsIfTrue,
    predictionsIfFalse: content.predictionsIfFalse,
    impossibleIfTrue: content.impossibleIfTrue,
    confounds: content.confounds.map((c, i) => ({
      id: c.id ?? `confound-${i}`,
      name: c.name ?? "Unnamed Confound",
      description: c.description ?? "",
      likelihood: c.likelihood ?? 0.3,
      domain: c.domain ?? template.domains[0] ?? "general",
    })),
    assumptions: content.assumptions,
    confidence: content.suggestedConfidence,
    tags: template.tags,
  };
}
