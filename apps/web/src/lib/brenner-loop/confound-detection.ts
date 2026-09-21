/**
 * Domain-Aware Confound Detection
 *
 * Automatically detects likely confounds based on the hypothesis domain,
 * helping users anticipate weaknesses in their reasoning.
 *
 * @see brenner_bot-ukd1.3 (bead)
 * @module brenner-loop/confound-detection
 */

import type { HypothesisCard, IdentifiedConfound } from "./hypothesis";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported research domains for confound detection.
 * Each domain has its own library of common confounds.
 */
export type ResearchDomain =
  | "psychology"
  | "epidemiology"
  | "economics"
  | "biology"
  | "sociology"
  | "computer_science"
  | "neuroscience"
  | "general";

/**
 * A confound template from a domain library.
 * Templates define common confounds that may apply to hypotheses in that domain.
 */
export interface ConfoundTemplate {
  /** Unique identifier within the domain */
  id: string;
  /** Human-readable name */
  name: string;
  /** Explanation of the confounding mechanism */
  description: string;
  /** Domain this confound is most relevant to */
  domain: ResearchDomain;
  /** Keywords that suggest this confound might apply */
  keywords: string[];
  /** Structural patterns in hypothesis text that suggest this confound */
  patterns?: RegExp[];
  /** Questions to prompt the user to consider */
  promptQuestions: string[];
  /** Default likelihood when detected (0-1) */
  baseLikelihood: number;
}

/**
 * Result of confound detection analysis.
 */
export interface ConfoundDetectionResult {
  /** Detected confounds with likelihood scores */
  confounds: IdentifiedConfound[];
  /** The classified domain of the hypothesis */
  detectedDomain: ResearchDomain;
  /** Confidence in the domain classification (0-1) */
  domainConfidence: number;
  /** Summary of detection process */
  summary: string;
}

// ============================================================================
// Domain-Specific Confound Libraries
// ============================================================================

/**
 * Psychology domain confounds.
 * Common threats to validity in psychological research.
 */
export const PSYCHOLOGY_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "selection_bias",
    name: "Selection Bias",
    description:
      "Systematic differences between who participates and who doesn't. Volunteers may differ from the general population in motivation, health, or personality.",
    domain: "psychology",
    keywords: ["participants", "subjects", "sample", "recruited", "volunteer", "study"],
    patterns: [/\b(participant|subject|sample)s?\b/i],
    promptQuestions: [
      "Who chooses to participate in studies like this?",
      "How might participants differ from non-participants?",
      "Could the results change with a different sample?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "demand_characteristics",
    name: "Demand Characteristics",
    description:
      "Participants guess the hypothesis and change their behavior to confirm or disconfirm it. The very act of being studied changes behavior.",
    domain: "psychology",
    keywords: ["experiment", "study", "aware", "hypothesis", "behavior", "measure"],
    patterns: [/\b(aware|guess|expect|know).*\b(study|experiment|hypothesis)\b/i],
    promptQuestions: [
      "Could participants guess what the study is testing?",
      "How might knowing the hypothesis change behavior?",
      "Are there deception or blinding protocols?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "social_desirability",
    name: "Social Desirability Bias",
    description:
      "Self-reports are biased toward socially acceptable answers. People underreport stigmatized behaviors and overreport virtuous ones.",
    domain: "psychology",
    keywords: ["self-report", "survey", "questionnaire", "admit", "report", "interview"],
    patterns: [/\bself[- ]?report/i, /\b(survey|questionnaire)\b/i],
    promptQuestions: [
      "Would people be embarrassed to report the true answer?",
      "Is there a 'correct' or socially desirable response?",
      "Are there objective measures to validate self-reports?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "reverse_causation",
    name: "Reverse Causation",
    description:
      "The direction of causation may be opposite to what's hypothesized. Y might cause X, not X cause Y.",
    domain: "psychology",
    keywords: ["cause", "effect", "lead", "result", "influence", "impact"],
    patterns: [/\b(cause|lead|result|effect)s?\b/i],
    promptQuestions: [
      "Could the outcome actually cause the predictor?",
      "Is the temporal sequence clearly established?",
      "What evidence rules out reverse causation?",
    ],
    baseLikelihood: 0.6,
  },
  {
    id: "maturation",
    name: "Maturation Effects",
    description:
      "Changes occur naturally with the passage of time, regardless of any intervention. Growth, aging, and learning happen without the experimental treatment.",
    domain: "psychology",
    keywords: ["time", "change", "develop", "grow", "improve", "longitudinal"],
    patterns: [/\b(over time|longitudinal|develop|mature)\b/i],
    promptQuestions: [
      "Would these changes happen anyway with time?",
      "Is there a control group experiencing the same time passage?",
      "How long is the study period?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "regression_to_mean",
    name: "Regression to the Mean",
    description:
      "Extreme scores tend to be followed by less extreme scores, even without intervention. People selected for extreme values will appear to improve (or worsen) naturally.",
    domain: "psychology",
    keywords: ["extreme", "selected", "high", "low", "improve", "decline", "score"],
    patterns: [/\b(extreme|high|low|worst|best)\s+(score|performer|case)s?\b/i],
    promptQuestions: [
      "Were participants selected based on extreme scores?",
      "Would regression explain the observed changes?",
      "Is there a comparison group not selected on extremes?",
    ],
    baseLikelihood: 0.5,
  },
];

/**
 * Epidemiology domain confounds.
 * Common biases in observational health research.
 */
export const EPIDEMIOLOGY_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "healthy_user_bias",
    name: "Healthy User Bias",
    description:
      "People who engage in one healthy behavior tend to engage in others. The apparent benefit of X may reflect overall healthy lifestyle, not X itself.",
    domain: "epidemiology",
    keywords: ["health", "behavior", "lifestyle", "diet", "exercise", "supplement"],
    patterns: [/\b(health|lifestyle|behavior|habit)\b/i],
    promptQuestions: [
      "Do people who do X also do other healthy things?",
      "Are you measuring X or overall health consciousness?",
      "What other health behaviors correlate with X?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "confounding_by_indication",
    name: "Confounding by Indication",
    description:
      "Treatment is given to people who are already different. Sicker patients get more treatment, making treatment look harmful.",
    domain: "epidemiology",
    keywords: ["treatment", "therapy", "medication", "intervention", "prescribe", "receive"],
    patterns: [/\b(treat|medic|prescri|therap)/i],
    promptQuestions: [
      "Why do some people receive treatment and others don't?",
      "Are treated patients sicker to begin with?",
      "Is treatment assignment random or based on severity?",
    ],
    baseLikelihood: 0.6,
  },
  {
    id: "temporal_ambiguity",
    name: "Temporal Ambiguity",
    description:
      "Unclear whether the exposure preceded the outcome. Without clear temporal ordering, causation cannot be established.",
    domain: "epidemiology",
    keywords: ["before", "after", "precede", "follow", "onset", "develop"],
    patterns: [/\b(before|after|precede|follow|onset)\b/i],
    promptQuestions: [
      "Which came first - the exposure or the outcome?",
      "Is the temporal sequence clearly established?",
      "Could subclinical disease cause the exposure?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "surveillance_bias",
    name: "Surveillance Bias",
    description:
      "Cases are more likely to be detected in the exposed group due to increased medical attention or testing. Apparent risk increase may reflect detection, not causation.",
    domain: "epidemiology",
    keywords: ["detect", "diagnose", "screen", "test", "monitor", "follow-up"],
    patterns: [/\b(detect|diagnos|screen|test|monitor)\b/i],
    promptQuestions: [
      "Are exposed individuals tested more often?",
      "Could increased surveillance explain the association?",
      "Do exposed and unexposed groups have equal detection?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "immortal_time_bias",
    name: "Immortal Time Bias",
    description:
      "Subjects must survive (be 'immortal') to enter the exposed group. This guarantees better outcomes for the exposed group by design.",
    domain: "epidemiology",
    keywords: ["survival", "follow-up", "exposure", "time", "start", "entry"],
    patterns: [/\b(surviv|follow|exposure|entry|start)\b/i],
    promptQuestions: [
      "Must subjects survive to become exposed?",
      "When does follow-up begin relative to exposure?",
      "Could survival to exposure explain better outcomes?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "recall_bias",
    name: "Recall Bias",
    description:
      "People with disease recall exposures differently than healthy controls. Cases search their memory harder for potential causes.",
    domain: "epidemiology",
    keywords: ["recall", "remember", "report", "history", "exposure", "case-control"],
    patterns: [/\b(recall|remember|report|history)\b/i],
    promptQuestions: [
      "Do cases and controls recall exposures equally?",
      "Does having the disease affect memory of exposures?",
      "Are there objective exposure records available?",
    ],
    baseLikelihood: 0.5,
  },
];

/**
 * Economics domain confounds.
 * Common identification problems in economic research.
 */
export const ECONOMICS_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "endogeneity",
    name: "Endogeneity",
    description:
      "The explanatory variable is correlated with the error term. X is determined by factors that also affect Y, biasing estimates.",
    domain: "economics",
    keywords: ["regression", "estimate", "coefficient", "variable", "model", "effect"],
    patterns: [/\b(regress|estimat|coefficien|model|effect)\b/i],
    promptQuestions: [
      "Is X truly exogenous to Y?",
      "What unmeasured factors affect both X and Y?",
      "Is there a valid instrument or natural experiment?",
    ],
    baseLikelihood: 0.6,
  },
  {
    id: "omitted_variable",
    name: "Omitted Variable Bias",
    description:
      "A relevant variable that affects both X and Y is left out of the model. The estimated effect of X absorbs the effect of the missing variable.",
    domain: "economics",
    keywords: ["control", "variable", "factor", "account", "model", "regression"],
    patterns: [/\b(control|account|variable|factor)\b/i],
    promptQuestions: [
      "What unmeasured Z affects both X and Y?",
      "Are all relevant controls included?",
      "What would happen if Z were controlled?",
    ],
    baseLikelihood: 0.6,
  },
  {
    id: "selection_on_outcome",
    name: "Selection on Outcome (Survivorship Bias)",
    description:
      "Only successful cases are observed. Failed firms, dropped students, or deceased patients are not in the sample.",
    domain: "economics",
    keywords: ["success", "surviv", "remain", "sample", "observe", "data"],
    patterns: [/\b(success|surviv|remain|observ)\b/i],
    promptQuestions: [
      "Are we only seeing survivors?",
      "What happened to the failures/dropouts?",
      "Could selection on Y bias the X-Y relationship?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "simultaneity",
    name: "Simultaneity",
    description:
      "X and Y are jointly determined. Each affects the other, making it impossible to identify the effect of X on Y in isolation.",
    domain: "economics",
    keywords: ["equilibrium", "market", "price", "quantity", "supply", "demand"],
    patterns: [/\b(equilibrium|market|price|quantity|supply|demand)\b/i],
    promptQuestions: [
      "Do X and Y affect each other simultaneously?",
      "Is the system in equilibrium?",
      "Can the effect of X be isolated from feedback?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "measurement_error",
    name: "Measurement Error",
    description:
      "Variables are measured with noise. Random measurement error attenuates estimates; systematic error biases them.",
    domain: "economics",
    keywords: ["measure", "proxy", "error", "noise", "imprecise", "data"],
    patterns: [/\b(measur|proxy|error|noise|imprecis)\b/i],
    promptQuestions: [
      "How accurately is X measured?",
      "Is a proxy being used for the true variable?",
      "Could measurement error explain the findings?",
    ],
    baseLikelihood: 0.4,
  },
];

/**
 * Biology domain confounds.
 * Common issues in biological and life sciences research.
 */
export const BIOLOGY_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "batch_effects",
    name: "Batch Effects",
    description:
      "Systematic differences between experimental batches. Technical variation can be larger than biological variation.",
    domain: "biology",
    keywords: ["batch", "experiment", "sample", "technical", "variation", "replicate"],
    patterns: [/\b(batch|replicate|technical|variation)\b/i],
    promptQuestions: [
      "Were all conditions processed in the same batch?",
      "Could technical variation explain the results?",
      "Are there batch controls or normalization?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "genetic_background",
    name: "Genetic Background Confounding",
    description:
      "Effects attributed to a gene may be due to linked genetic variants. Genetic associations may reflect linkage disequilibrium, not causation.",
    domain: "biology",
    keywords: ["gene", "genetic", "mutation", "variant", "knockout", "transgenic"],
    patterns: [/\b(gene|genetic|mutation|variant|knockout)\b/i],
    promptQuestions: [
      "Are control and experimental groups genetically matched?",
      "Could linked variants explain the phenotype?",
      "Have multiple independent alleles been tested?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "environmental_variation",
    name: "Environmental Variation",
    description:
      "Uncontrolled environmental factors affect the outcome. Temperature, humidity, light cycles, and housing density can confound results.",
    domain: "biology",
    keywords: ["environment", "condition", "housing", "temperature", "control"],
    patterns: [/\b(environment|condition|housing|temperatur|control)\b/i],
    promptQuestions: [
      "Were environmental conditions identical across groups?",
      "Could environmental factors explain the differences?",
      "Are there environmental controls?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "off_target_effects",
    name: "Off-Target Effects",
    description:
      "Interventions have unintended effects beyond the target. CRISPR edits, drugs, and knockdowns can affect non-target genes or pathways.",
    domain: "biology",
    keywords: ["crispr", "knockout", "knockdown", "drug", "intervention", "target"],
    patterns: [/\b(crispr|knockout|knockdown|drug|intervention|target)\b/i],
    promptQuestions: [
      "Could the intervention affect non-target pathways?",
      "Have off-target effects been ruled out?",
      "Are there orthogonal approaches to confirm specificity?",
    ],
    baseLikelihood: 0.5,
  },
];

/**
 * Sociology domain confounds.
 * Common issues in sociological research.
 */
export const SOCIOLOGY_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "ecological_fallacy",
    name: "Ecological Fallacy",
    description:
      "Inferences about individuals from group-level data. Aggregate correlations don't necessarily apply to individuals.",
    domain: "sociology",
    keywords: ["country", "region", "group", "aggregate", "national", "population"],
    patterns: [/\b(countr|region|aggregate|national|population)\b/i],
    promptQuestions: [
      "Are you inferring individual behavior from group data?",
      "Could the relationship differ at the individual level?",
      "Do you have individual-level data to confirm?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "period_effects",
    name: "Period Effects",
    description:
      "Historical events affect all age groups simultaneously. Differences between cohorts may reflect the time period, not age or cohort.",
    domain: "sociology",
    keywords: ["cohort", "generation", "period", "age", "time", "trend"],
    patterns: [/\b(cohort|generation|period|trend)\b/i],
    promptQuestions: [
      "Could historical events explain the pattern?",
      "Are period effects separated from age and cohort effects?",
      "What was happening in society during this period?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "social_network_confounding",
    name: "Social Network Confounding",
    description:
      "Apparent peer effects may reflect homophily. Similar people befriend each other; their similarity isn't caused by friendship.",
    domain: "sociology",
    keywords: ["peer", "friend", "network", "social", "influence", "spread"],
    patterns: [/\b(peer|friend|network|social|influence|spread)\b/i],
    promptQuestions: [
      "Do similar people choose to associate?",
      "Is the similarity cause or effect of association?",
      "Can homophily be distinguished from influence?",
    ],
    baseLikelihood: 0.5,
  },
];

/**
 * Computer Science domain confounds.
 * Common issues in ML/AI and systems research.
 */
export const COMPUTER_SCIENCE_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "data_leakage",
    name: "Data Leakage",
    description:
      "Information from the test set contaminates training. Models may learn patterns that won't generalize to truly unseen data.",
    domain: "computer_science",
    keywords: ["train", "test", "validation", "model", "predict", "accuracy"],
    patterns: [/\b(train|test|valid|model|predict|accuracy)\b/i],
    promptQuestions: [
      "Is there any information leakage from test to train?",
      "Are features computed without seeing future data?",
      "Is the train/test split truly random and temporal?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "benchmark_overfitting",
    name: "Benchmark Overfitting",
    description:
      "Methods are tuned to perform well on specific benchmarks. Improvements may not generalize to real-world tasks.",
    domain: "computer_science",
    keywords: ["benchmark", "dataset", "state-of-the-art", "accuracy", "performance"],
    patterns: [/\b(benchmark|dataset|state.of.the.art|performance)\b/i],
    promptQuestions: [
      "How well does this generalize beyond the benchmark?",
      "Were hyperparameters tuned on the test set?",
      "Is the benchmark representative of real-world use?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "selection_bias_data",
    name: "Training Data Selection Bias",
    description:
      "Training data is not representative of deployment population. Models trained on biased data perpetuate and amplify biases.",
    domain: "computer_science",
    keywords: ["data", "training", "dataset", "bias", "representative", "sample"],
    patterns: [/\b(data|training|dataset|bias|representative)\b/i],
    promptQuestions: [
      "Is the training data representative of deployment?",
      "What populations are over/under-represented?",
      "Could data bias explain the model's behavior?",
    ],
    baseLikelihood: 0.5,
  },
];

/**
 * Neuroscience domain confounds.
 * Common issues in brain and cognitive research.
 */
export const NEUROSCIENCE_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "reverse_inference",
    name: "Reverse Inference",
    description:
      "Inferring cognitive processes from brain activation. Just because area X activates doesn't mean process Y is occurring.",
    domain: "neuroscience",
    keywords: ["activation", "brain", "region", "fmri", "cognitive", "process"],
    patterns: [/\b(activation|brain|region|fmri|cognitive)\b/i],
    promptQuestions: [
      "Could other processes activate the same region?",
      "Is the region-function mapping reliable?",
      "What is the forward inference evidence?",
    ],
    baseLikelihood: 0.5,
  },
  {
    id: "motion_artifact",
    name: "Motion Artifacts",
    description:
      "Head motion during scanning creates spurious correlations. Groups that move differently appear to have different connectivity.",
    domain: "neuroscience",
    keywords: ["scan", "motion", "movement", "fmri", "imaging", "connectivity"],
    patterns: [/\b(scan|motion|movement|fmri|imaging|connectivity)\b/i],
    promptQuestions: [
      "Do groups differ in head motion during scanning?",
      "Have motion artifacts been corrected?",
      "Could motion explain the connectivity differences?",
    ],
    baseLikelihood: 0.5,
  },
];

/**
 * General confounds applicable across domains.
 */
export const GENERAL_CONFOUNDS: ConfoundTemplate[] = [
  {
    id: "publication_bias",
    name: "Publication Bias",
    description:
      "Positive results are more likely to be published. The literature overrepresents significant findings, biasing meta-analyses.",
    domain: "general",
    keywords: ["published", "literature", "meta-analysis", "evidence", "finding"],
    patterns: [/\b(publish|literature|meta.analysis|evidence|finding)\b/i],
    promptQuestions: [
      "Are null results equally likely to be published?",
      "Could the file drawer problem affect this area?",
      "Is there a funnel plot asymmetry?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "multiple_comparisons",
    name: "Multiple Comparisons Problem",
    description:
      "Testing many hypotheses inflates false positive rate. Without correction, 5% of tests will be significant by chance.",
    domain: "general",
    keywords: ["test", "significant", "p-value", "multiple", "comparison", "analysis"],
    patterns: [/\b(significan|p.value|multiple|comparison|test)\b/i],
    promptQuestions: [
      "How many tests were conducted?",
      "Was there correction for multiple comparisons?",
      "Is this finding pre-registered or exploratory?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "hawthorne_effect",
    name: "Hawthorne Effect",
    description:
      "Being observed changes behavior. Participants perform differently when they know they're being studied.",
    domain: "general",
    keywords: ["observe", "study", "monitor", "watch", "participant", "experiment"],
    patterns: [/\b(observ|study|monitor|watch|participant|experiment)\b/i],
    promptQuestions: [
      "Does being observed change the behavior of interest?",
      "Is there a way to measure behavior unobtrusively?",
      "How might awareness of being studied affect results?",
    ],
    baseLikelihood: 0.4,
  },
  {
    id: "third_variable",
    name: "Third Variable Problem",
    description:
      "An unmeasured variable causes both X and Y. The correlation between X and Y is spurious, driven by a common cause.",
    domain: "general",
    keywords: ["correlation", "cause", "relationship", "association", "link"],
    patterns: [/\b(correlat|associat|relationship|link)\b/i],
    promptQuestions: [
      "What third variable could cause both X and Y?",
      "Is this correlation or causation?",
      "What would rule out common causes?",
    ],
    baseLikelihood: 0.5,
  },
];

// ============================================================================
// Domain Classification
// ============================================================================

/**
 * Keywords strongly associated with each domain.
 * Used for initial domain classification.
 */
const DOMAIN_KEYWORDS: Record<ResearchDomain, string[]> = {
  psychology: [
    "behavior",
    "cognitive",
    "emotion",
    "mental",
    "memory",
    "attention",
    "perception",
    "personality",
    "development",
    "clinical",
    "therapy",
    "anxiety",
    "depression",
    "social",
    "motivation",
    "learning",
  ],
  epidemiology: [
    "disease",
    "health",
    "mortality",
    "morbidity",
    "risk",
    "exposure",
    "incidence",
    "prevalence",
    "cohort",
    "case-control",
    "outbreak",
    "infection",
    "vaccine",
    "treatment",
    "patient",
    "hospital",
  ],
  economics: [
    "market",
    "price",
    "income",
    "gdp",
    "employment",
    "trade",
    "inflation",
    "growth",
    "policy",
    "fiscal",
    "monetary",
    "firm",
    "consumer",
    "investment",
    "regression",
    "causal",
    "elasticity",
  ],
  biology: [
    "gene",
    "protein",
    "cell",
    "organism",
    "evolution",
    "mutation",
    "species",
    "genome",
    "pathway",
    "expression",
    "molecular",
    "enzyme",
    "dna",
    "rna",
    "phenotype",
    "genotype",
    "metabolism",
  ],
  sociology: [
    "society",
    "culture",
    "institution",
    "inequality",
    "class",
    "race",
    "gender",
    "community",
    "norm",
    "network",
    "stratification",
    "mobility",
    "collective",
    "organization",
    "movement",
    "identity",
  ],
  computer_science: [
    "algorithm",
    "model",
    "machine learning",
    "neural",
    "data",
    "accuracy",
    "training",
    "prediction",
    "classification",
    "deep learning",
    "ai",
    "performance",
    "benchmark",
    "optimization",
    "network",
    "compute",
  ],
  neuroscience: [
    "brain",
    "neuron",
    "cortex",
    "fmri",
    "eeg",
    "activation",
    "neural",
    "cognitive",
    "hippocampus",
    "prefrontal",
    "amygdala",
    "synapse",
    "dopamine",
    "connectivity",
    "imaging",
    "lesion",
  ],
  general: [],
};

/**
 * Classify the research domain of a hypothesis.
 *
 * @param hypothesis - The hypothesis to classify
 * @returns The most likely domain and confidence score
 */
export function classifyDomain(hypothesis: HypothesisCard): {
  domain: ResearchDomain;
  confidence: number;
  scores: Record<ResearchDomain, number>;
} {
  // Combine all text from the hypothesis
  const text = [
    hypothesis.statement,
    hypothesis.mechanism,
    ...(hypothesis.domain || []),
    ...(hypothesis.predictionsIfTrue || []),
    ...(hypothesis.predictionsIfFalse || []),
    ...(hypothesis.impossibleIfTrue || []),
    ...(hypothesis.assumptions || []),
    hypothesis.notes || "",
  ]
    .join(" ")
    .toLowerCase();

  // Score each domain by keyword matches
  const scores: Record<ResearchDomain, number> = {
    psychology: 0,
    epidemiology: 0,
    economics: 0,
    biology: 0,
    sociology: 0,
    computer_science: 0,
    neuroscience: 0,
    general: 0,
  };

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const keyword of keywords) {
      // Count keyword occurrences (simple word boundary match)
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        scores[domain as ResearchDomain] += matches.length;
      }
    }
  }

  // Also check hypothesis.domain field if present
  for (const userDomain of hypothesis.domain || []) {
    const normalized = userDomain.toLowerCase().replace(/[^a-z]/g, "_");
    if (normalized in scores) {
      scores[normalized as ResearchDomain] += 10; // Strong signal from explicit domain
    }
  }

  // Find the highest-scoring domain
  let bestDomain: ResearchDomain = "general";
  let bestScore = 0;
  let totalScore = 0;

  for (const [domain, score] of Object.entries(scores)) {
    totalScore += score;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain as ResearchDomain;
    }
  }

  // If no keywords matched, default to general
  if (bestScore === 0) {
    return { domain: "general", confidence: 0.5, scores };
  }

  // Confidence is proportion of total score captured by best domain
  const confidence = totalScore > 0 ? bestScore / totalScore : 0.5;

  return { domain: bestDomain, confidence, scores };
}

// ============================================================================
// Confound Detection
// ============================================================================

/**
 * Get the confound library for a domain.
 * Returns domain-specific confounds plus general confounds.
 */
function getConfoundLibrary(domain: ResearchDomain): ConfoundTemplate[] {
  const domainLibraries: Record<ResearchDomain, ConfoundTemplate[]> = {
    psychology: PSYCHOLOGY_CONFOUNDS,
    epidemiology: EPIDEMIOLOGY_CONFOUNDS,
    economics: ECONOMICS_CONFOUNDS,
    biology: BIOLOGY_CONFOUNDS,
    sociology: SOCIOLOGY_CONFOUNDS,
    computer_science: COMPUTER_SCIENCE_CONFOUNDS,
    neuroscience: NEUROSCIENCE_CONFOUNDS,
    general: [],
  };

  // Combine domain-specific and general confounds
  return [...(domainLibraries[domain] || []), ...GENERAL_CONFOUNDS];
}

/**
 * Analyze a hypothesis for a specific confound.
 *
 * @param hypothesis - The hypothesis to analyze
 * @param template - The confound template to check
 * @returns Likelihood score and analysis details
 */
function analyzeForConfound(
  hypothesis: HypothesisCard,
  template: ConfoundTemplate,
): { likelihood: number; matchedKeywords: string[]; matchedPatterns: boolean } {
  const text = [
    hypothesis.statement,
    hypothesis.mechanism,
    ...(hypothesis.predictionsIfTrue || []),
    ...(hypothesis.predictionsIfFalse || []),
    ...(hypothesis.impossibleIfTrue || []),
  ]
    .join(" ")
    .toLowerCase();

  // Check keyword matches
  const matchedKeywords: string[] = [];
  for (const keyword of template.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

  // Check pattern matches
  let matchedPatterns = false;
  if (template.patterns) {
    for (const pattern of template.patterns) {
      if (pattern.test(text)) {
        matchedPatterns = true;
        break;
      }
    }
  }

  // Calculate likelihood based on matches
  let likelihood = 0;
  if (matchedKeywords.length > 0 || matchedPatterns) {
    // Start with base likelihood
    likelihood = template.baseLikelihood;

    // Boost for multiple keyword matches
    const keywordBoost = Math.min(matchedKeywords.length * 0.1, 0.3);
    likelihood += keywordBoost;

    // Boost for pattern match
    if (matchedPatterns) {
      likelihood += 0.1;
    }

    // Clamp to [0, 1]
    likelihood = Math.min(1, Math.max(0, likelihood));
  }

  return { likelihood, matchedKeywords, matchedPatterns };
}

/**
 * Detect potential confounds in a hypothesis.
 *
 * @param hypothesis - The hypothesis to analyze
 * @param options - Detection options
 * @returns Detection results with identified confounds
 */
export function detectConfounds(
  hypothesis: HypothesisCard,
  options: {
    /** Minimum likelihood threshold for including a confound (default: 0.3) */
    threshold?: number;
    /** Maximum number of confounds to return (default: 10) */
    maxConfounds?: number;
    /** Override automatic domain detection */
    forceDomain?: ResearchDomain;
  } = {},
): ConfoundDetectionResult {
  const { threshold = 0.3, maxConfounds = 10, forceDomain } = options;

  // Classify domain
  const { domain: detectedDomain, confidence: domainConfidence } = classifyDomain(hypothesis);
  const domain = forceDomain || detectedDomain;

  // Get relevant confound library
  const library = getConfoundLibrary(domain);

  // Analyze each confound
  const analyzed = library.map((template) => ({
    template,
    analysis: analyzeForConfound(hypothesis, template),
  }));

  // Filter by threshold and sort by likelihood
  const filtered = analyzed
    .filter((item) => item.analysis.likelihood >= threshold)
    .sort((a, b) => b.analysis.likelihood - a.analysis.likelihood)
    .slice(0, maxConfounds);

  // Convert to IdentifiedConfound format
  const confounds: IdentifiedConfound[] = filtered.map((item, index) => ({
    id: `auto-${item.template.id}-${index}`,
    name: item.template.name,
    description: item.template.description,
    likelihood: item.analysis.likelihood,
    domain: item.template.domain,
    addressed: false,
  }));

  // Generate summary
  const summary =
    confounds.length === 0
      ? `No significant confounds detected for this ${domain} hypothesis.`
      : `Detected ${confounds.length} potential confound(s) for this ${domain} hypothesis. ` +
        `Top concern: ${confounds[0].name} (${Math.round(confounds[0].likelihood * 100)}% likelihood).`;

  return {
    confounds,
    detectedDomain: domain,
    domainConfidence,
    summary,
  };
}

/**
 * Get prompt questions for a confound to help users think through it.
 *
 * @param confoundId - The confound template ID (without "auto-" prefix)
 * @param domain - The research domain
 * @returns Array of prompt questions, or empty if not found
 */
export function getConfoundQuestions(
  confoundId: string,
  domain: ResearchDomain = "general",
): string[] {
  const library = getConfoundLibrary(domain);
  const template = library.find((t) => t.id === confoundId);
  return template?.promptQuestions || [];
}

/**
 * Get all confound templates for a domain (for UI display).
 */
export function getConfoundTemplates(domain: ResearchDomain): ConfoundTemplate[] {
  return getConfoundLibrary(domain);
}

/**
 * Get all supported research domains.
 */
export function getSupportedDomains(): ResearchDomain[] {
  return [
    "psychology",
    "epidemiology",
    "economics",
    "biology",
    "sociology",
    "computer_science",
    "neuroscience",
    "general",
  ];
}
