/**
 * Pre-Built Domain Templates
 *
 * This module contains the built-in domain templates for common research fields.
 * Each template provides domain-specific guidance for the Brenner Loop system.
 *
 * @see brenner_bot-ukd1.4 - FEATURE: Domain Templates
 */

import type { DomainConfound, DomainId, DomainOption, DomainTemplate } from "./types";

// ============================================================================
// Psychology Domain Template
// ============================================================================

export const psychologyTemplate: DomainTemplate = {
  id: "psychology",
  name: "Psychology",
  description: "Behavioral science, cognitive psychology, clinical psychology, social psychology",
  icon: "Brain",
  colorClass: "text-purple-600",

  confoundLibrary: [
    {
      id: "selection_bias",
      name: "Selection Bias",
      description:
        "Participants who volunteer or are selected differ systematically from the population of interest. WEIRD samples (Western, Educated, Industrialized, Rich, Democratic) are particularly problematic.",
      whenToCheck: "Any study with voluntary participation or convenience samples",
      mitigationStrategies: [
        "Use random sampling from target population",
        "Collect demographic data and compare to population",
        "Replicate across diverse samples",
        "Use propensity score matching",
      ],
      baseLikelihood: 0.4,
      relevantSections: [50, 89],
    },
    {
      id: "demand_characteristics",
      name: "Demand Characteristics",
      description:
        "Participants guess the hypothesis and adjust behavior to confirm or disconfirm it. They may try to be 'good subjects' or sabotage the study.",
      whenToCheck:
        "Any study where participants interact with researchers or know they're being studied",
      mitigationStrategies: [
        "Use deception (with ethical approval)",
        "Use implicit measures",
        "Double-blind protocols",
        "Post-experiment suspicion checks",
      ],
      baseLikelihood: 0.35,
      relevantSections: [50],
    },
    {
      id: "social_desirability",
      name: "Social Desirability Bias",
      description:
        "Participants report what is socially acceptable rather than their true attitudes or behaviors. Especially problematic for sensitive topics.",
      whenToCheck: "Self-report measures, especially for stigmatized behaviors or attitudes",
      mitigationStrategies: [
        "Use implicit measures (IAT, priming)",
        "Ensure anonymity",
        "Use bogus pipeline technique",
        "Include social desirability scales",
      ],
      baseLikelihood: 0.45,
    },
    {
      id: "reverse_causation",
      name: "Reverse Causation",
      description:
        "The presumed effect actually causes the presumed cause. Common in cross-sectional studies where temporal ordering is unclear.",
      whenToCheck: "Cross-sectional designs, correlational studies",
      mitigationStrategies: [
        "Use longitudinal designs",
        "Establish temporal precedence",
        "Use experimental manipulation",
        "Consider bidirectional models",
      ],
      baseLikelihood: 0.25,
      relevantSections: [89],
    },
    {
      id: "maturation",
      name: "Maturation Effects",
      description:
        "Changes in participants over time that are independent of the treatment. Development, learning, fatigue, or boredom.",
      whenToCheck: "Longitudinal studies, developmental research, training studies",
      mitigationStrategies: [
        "Use control groups",
        "Include multiple time points",
        "Match on age and development",
        "Use within-subjects designs with counterbalancing",
      ],
      baseLikelihood: 0.3,
    },
    {
      id: "regression_to_mean",
      name: "Regression to the Mean",
      description:
        "Extreme scores tend to move toward the average on retesting. Selection based on extreme scores guarantees apparent improvement/decline.",
      whenToCheck: "Studies selecting participants based on extreme scores, pre-post designs",
      mitigationStrategies: [
        "Use control groups",
        "Select based on stable characteristics",
        "Use reliable measures",
        "Collect multiple baseline measures",
      ],
      baseLikelihood: 0.35,
      relevantSections: [89],
    },
    {
      id: "experimenter_expectancy",
      name: "Experimenter Expectancy",
      description:
        "Researchers unconsciously influence participants toward expected results through subtle cues, differential attention, or biased interpretation.",
      whenToCheck: "Studies with human interaction between researcher and participant",
      mitigationStrategies: [
        "Use double-blind procedures",
        "Standardize protocols",
        "Train research assistants",
        "Use automated administration",
      ],
      baseLikelihood: 0.3,
    },
  ],

  researchDesigns: [
    {
      id: "rct",
      name: "Randomized Controlled Trial",
      description: "Random assignment to treatment and control conditions",
      discriminativePower: 9,
      feasibility: "medium",
      exampleUse: "Testing whether cognitive behavioral therapy reduces anxiety",
      addressesConfounds: ["selection_bias", "reverse_causation"],
      vulnerableTo: ["attrition", "demand_characteristics"],
    },
    {
      id: "within_subjects",
      name: "Within-Subjects Design",
      description: "Each participant serves as their own control across conditions",
      discriminativePower: 8,
      feasibility: "high",
      exampleUse: "Testing response times across different cognitive load conditions",
      addressesConfounds: ["individual_differences"],
      vulnerableTo: ["order_effects", "practice_effects", "fatigue"],
    },
    {
      id: "quasi_experimental",
      name: "Quasi-Experimental Design",
      description: "Comparison of naturally occurring groups without random assignment",
      discriminativePower: 6,
      feasibility: "high",
      exampleUse: "Comparing bilingual and monolingual cognitive performance",
      addressesConfounds: [],
      vulnerableTo: ["selection_bias", "confounding"],
    },
    {
      id: "experience_sampling",
      name: "Experience Sampling Method",
      description: "Repeated in-the-moment assessments in daily life",
      discriminativePower: 7,
      feasibility: "medium",
      exampleUse: "Tracking mood fluctuations and their triggers",
      addressesConfounds: ["retrospective_bias"],
      vulnerableTo: ["reactivity", "compliance"],
    },
  ],

  effectSizeNorms: {
    metric: "Cohen's d",
    small: 0.2,
    medium: 0.5,
    large: 0.8,
    typicalDescription:
      "Most psychology effects are d = 0.2-0.4. Replication studies often find effects 50% smaller than original.",
    caveats:
      "Social psychology effects tend smaller; clinical interventions can be larger. Publication bias inflates reported effects.",
  },

  literatureSources: [
    {
      name: "PsycINFO",
      url: "https://www.apa.org/pubs/databases/psycinfo",
      searchTips: "Use APA thesaurus terms. Filter by methodology. Check cited references.",
      priority: "primary",
    },
    {
      name: "Google Scholar",
      url: "https://scholar.google.com",
      searchTips: "Use quotes for phrases. Check 'cited by' for newer work. Use author: operator.",
      priority: "primary",
    },
    {
      name: "PubMed",
      url: "https://pubmed.ncbi.nlm.nih.gov",
      searchTips: "Good for neuroscience and health psychology. Use MeSH terms.",
      priority: "secondary",
    },
  ],

  commonLevelSplits: {
    cause: ["Self-report", "Behavioral observation", "Physiological measure", "Neural activity"],
    effect: [
      "Clinical diagnosis",
      "Symptom score",
      "Behavioral outcome",
      "Self-reported experience",
    ],
    moderators: ["Age", "Gender", "Culture", "Personality", "Prior experience"],
    mediators: ["Attention", "Motivation", "Emotion", "Memory", "Executive function"],
  },

  glossary: [
    {
      term: "Effect size",
      definition: "Standardized measure of the magnitude of an effect, independent of sample size",
    },
    {
      term: "Power",
      definition: "Probability of detecting a true effect. Convention is 80% minimum.",
    },
    {
      term: "p-hacking",
      definition: "Trying multiple analyses until finding p < .05. Inflates false positives.",
    },
    {
      term: "Pre-registration",
      definition: "Publicly committing to hypotheses and analyses before data collection",
    },
  ],

  relevantBrennerSections: [50, 89, 91, 93, 95],
  relevantQuoteTags: ["falsification", "confounds", "measurement", "bias-to-experiment"],

  exampleHypotheses: [
    "Cognitive behavioral therapy reduces depression symptoms more than waitlist control",
    "Bilingualism improves executive function in older adults",
    "Social media use increases anxiety in adolescents",
  ],
};

// ============================================================================
// Epidemiology Domain Template
// ============================================================================

export const epidemiologyTemplate: DomainTemplate = {
  id: "epidemiology",
  name: "Epidemiology",
  description: "Public health, disease causation, risk factors, population-level studies",
  icon: "HeartPulse",
  colorClass: "text-red-600",

  confoundLibrary: [
    {
      id: "healthy_user_bias",
      name: "Healthy User Bias",
      description:
        "People who take preventive measures are healthier overall. Those who take vitamins also exercise, eat well, and avoid smoking.",
      whenToCheck: "Observational studies of health behaviors or medications",
      mitigationStrategies: [
        "Randomize treatment assignment",
        "Use active comparator",
        "Adjust for health-seeking behaviors",
        "Look for negative controls",
      ],
      baseLikelihood: 0.45,
    },
    {
      id: "confounding_by_indication",
      name: "Confounding by Indication",
      description:
        "Treatment is given because of underlying condition. Drug appears harmful because sicker patients receive it.",
      whenToCheck: "Any observational study of medical treatments",
      mitigationStrategies: [
        "Use instrumental variables",
        "Propensity score matching",
        "New-user designs",
        "Active comparator designs",
      ],
      baseLikelihood: 0.5,
      relevantSections: [89],
    },
    {
      id: "temporal_ambiguity",
      name: "Temporal Ambiguity",
      description:
        "Unclear whether exposure preceded outcome. Critical for establishing causation.",
      whenToCheck: "Cross-sectional studies, case-control studies with imprecise timing",
      mitigationStrategies: [
        "Use prospective cohort designs",
        "Establish clear temporal landmarks",
        "Lag exposure assessment",
        "Use incident (not prevalent) cases",
      ],
      baseLikelihood: 0.35,
    },
    {
      id: "surveillance_bias",
      name: "Surveillance/Detection Bias",
      description:
        "More monitoring leads to more detection. Screening programs increase apparent incidence without changing true incidence.",
      whenToCheck: "Studies of screened conditions, incidental findings",
      mitigationStrategies: [
        "Use mortality rather than incidence",
        "Control for screening frequency",
        "Use lead-time adjustment",
        "Look for stage shift",
      ],
      baseLikelihood: 0.35,
    },
    {
      id: "immortal_time_bias",
      name: "Immortal Time Bias",
      description:
        "Period between cohort entry and treatment initiation during which outcome cannot occur. Misclassifying this time inflates treatment benefit.",
      whenToCheck: "Any study where treatment starts after cohort entry",
      mitigationStrategies: [
        "Time-varying exposure analysis",
        "Landmark analysis",
        "Proper handling of person-time",
        "Clone-censor-weight approach",
      ],
      baseLikelihood: 0.4,
    },
    {
      id: "recall_bias",
      name: "Recall Bias",
      description:
        "Cases remember exposures differently than controls. Mothers of sick children ruminate more on pregnancy exposures.",
      whenToCheck: "Case-control studies with retrospective exposure assessment",
      mitigationStrategies: [
        "Use prospective designs",
        "Use objective records",
        "Blind interviewers to case status",
        "Use validated instruments",
      ],
      baseLikelihood: 0.4,
    },
  ],

  researchDesigns: [
    {
      id: "cohort",
      name: "Prospective Cohort Study",
      description:
        "Follow exposed and unexposed groups forward in time to compare outcome incidence",
      discriminativePower: 8,
      feasibility: "low",
      exampleUse: "Framingham Heart Study: risk factors for cardiovascular disease",
      addressesConfounds: ["temporal_ambiguity", "recall_bias"],
      vulnerableTo: ["healthy_user_bias", "attrition"],
    },
    {
      id: "case_control",
      name: "Case-Control Study",
      description: "Compare exposure history between cases (with outcome) and controls (without)",
      discriminativePower: 6,
      feasibility: "high",
      exampleUse: "Rare diseases, initial outbreak investigations",
      addressesConfounds: [],
      vulnerableTo: ["recall_bias", "selection_bias"],
    },
    {
      id: "natural_experiment",
      name: "Natural Experiment",
      description: "Exploit naturally occurring variation that mimics random assignment",
      discriminativePower: 8,
      feasibility: "low",
      exampleUse: "Policy changes, geographic variation, twin studies",
      addressesConfounds: ["selection_bias"],
      vulnerableTo: ["weak_instrument", "violation_of_assumptions"],
    },
    {
      id: "mendelian_randomization",
      name: "Mendelian Randomization",
      description: "Use genetic variants as instrumental variables for exposures",
      discriminativePower: 9,
      feasibility: "medium",
      exampleUse: "Testing whether alcohol causes heart disease (using ADH variants)",
      addressesConfounds: ["reverse_causation", "confounding"],
      vulnerableTo: ["pleiotropy", "population_stratification"],
    },
  ],

  effectSizeNorms: {
    metric: "Odds Ratio / Relative Risk",
    small: 1.2,
    medium: 1.5,
    large: 2.0,
    typicalDescription:
      "OR > 2 is considered strong in epidemiology. Smoking-lung cancer OR was ~10-30. Most associations are OR 1.1-1.5.",
    caveats:
      "Absolute risk matters more for clinical decisions. A large RR on a rare outcome may be less important than small RR on common outcome.",
  },

  literatureSources: [
    {
      name: "PubMed",
      url: "https://pubmed.ncbi.nlm.nih.gov",
      searchTips: "Use MeSH terms. Filter by study type. Check systematic reviews first.",
      priority: "primary",
    },
    {
      name: "Cochrane Library",
      url: "https://www.cochranelibrary.com",
      searchTips: "Gold standard for systematic reviews. Check if your question has been reviewed.",
      priority: "primary",
    },
    {
      name: "CDC MMWR",
      url: "https://www.cdc.gov/mmwr",
      searchTips: "For outbreak investigations and surveillance data",
      priority: "secondary",
    },
  ],

  commonLevelSplits: {
    cause: [
      "Molecular/genetic",
      "Cellular",
      "Individual behavior",
      "Social/environmental",
      "Policy/structural",
    ],
    effect: ["Biomarker", "Clinical diagnosis", "Hospitalization", "Mortality", "Quality of life"],
    moderators: ["Age", "Sex", "Socioeconomic status", "Comorbidities", "Geographic region"],
    mediators: ["Inflammatory markers", "Behavioral changes", "Access to care"],
  },

  glossary: [
    { term: "Incidence", definition: "New cases over time. Rate = cases / person-time at risk." },
    { term: "Prevalence", definition: "Existing cases at a point in time. Includes old cases." },
    {
      term: "DAG",
      definition: "Directed acyclic graph. Visual tool for identifying confounders and mediators.",
    },
    {
      term: "Number needed to treat",
      definition: "1 / absolute risk reduction. How many to treat to prevent one outcome.",
    },
  ],

  relevantBrennerSections: [50, 89, 91, 93],
  relevantQuoteTags: ["measurement", "confounds", "scale-check", "mechanism"],

  exampleHypotheses: [
    "Air pollution exposure increases cardiovascular mortality",
    "Mediterranean diet reduces cancer incidence",
    "Childhood vaccination prevents adult hospitalizations",
  ],
};

// ============================================================================
// Economics Domain Template
// ============================================================================

export const economicsTemplate: DomainTemplate = {
  id: "economics",
  name: "Economics",
  description: "Microeconomics, macroeconomics, behavioral economics, development economics",
  icon: "TrendingUp",
  colorClass: "text-green-600",

  confoundLibrary: [
    {
      id: "omitted_variable",
      name: "Omitted Variable Bias",
      description:
        "Important variable correlated with both X and Y is missing. Classic example: education-earnings confounded by ability.",
      whenToCheck: "Any regression without random assignment",
      mitigationStrategies: [
        "Add controls for omitted variables",
        "Use fixed effects",
        "Instrumental variables",
        "Natural experiments",
      ],
      baseLikelihood: 0.5,
      relevantSections: [89],
    },
    {
      id: "simultaneity",
      name: "Simultaneity Bias",
      description:
        "X affects Y and Y affects X at the same time. Supply and demand simultaneously determine price and quantity.",
      whenToCheck: "Market equilibrium models, feedback systems",
      mitigationStrategies: [
        "Use instrumental variables",
        "Structural equation modeling",
        "Lag dependent variable",
        "Natural experiments",
      ],
      baseLikelihood: 0.4,
    },
    {
      id: "selection_into_treatment",
      name: "Selection into Treatment",
      description:
        "People choose treatments based on expected benefits. Those who take job training differ from those who don't.",
      whenToCheck: "Any policy evaluation without random assignment",
      mitigationStrategies: [
        "Random assignment (RCT)",
        "Regression discontinuity",
        "Difference-in-differences",
        "Propensity score matching",
      ],
      baseLikelihood: 0.45,
    },
    {
      id: "measurement_error",
      name: "Measurement Error",
      description:
        "Variables measured with noise. Attenuation bias in X; classical measurement error biases coefficient toward zero.",
      whenToCheck: "Self-reported data, proxy variables",
      mitigationStrategies: [
        "Use multiple measures",
        "Instrumental variables",
        "Administrative data",
        "Errors-in-variables models",
      ],
      baseLikelihood: 0.35,
    },
    {
      id: "general_equilibrium",
      name: "General Equilibrium Effects",
      description:
        "Partial equilibrium analysis ignores market-wide adjustments. Minimum wage might reduce employment in one sector but increase it elsewhere.",
      whenToCheck: "Large-scale policy interventions, market-wide treatments",
      mitigationStrategies: [
        "Use general equilibrium models",
        "Consider spillovers",
        "Geographic variation",
        "Staggered adoption designs",
      ],
      baseLikelihood: 0.3,
    },
  ],

  researchDesigns: [
    {
      id: "rdd",
      name: "Regression Discontinuity Design",
      description: "Exploit sharp cutoffs in treatment assignment (e.g., test score thresholds)",
      discriminativePower: 9,
      feasibility: "medium",
      exampleUse: "Effect of college admission on earnings (using admission cutoff scores)",
      addressesConfounds: ["selection_into_treatment"],
      vulnerableTo: ["manipulation", "discontinuity_in_potential_outcomes"],
    },
    {
      id: "diff_in_diff",
      name: "Difference-in-Differences",
      description: "Compare changes over time between treatment and control groups",
      discriminativePower: 7,
      feasibility: "high",
      exampleUse: "Effect of minimum wage increase (comparing affected vs. unaffected states)",
      addressesConfounds: ["time_trends", "group_differences"],
      vulnerableTo: ["parallel_trends_violation", "anticipation_effects"],
    },
    {
      id: "iv",
      name: "Instrumental Variables",
      description: "Use an instrument that affects X but only affects Y through X",
      discriminativePower: 8,
      feasibility: "low",
      exampleUse: "Effect of education on earnings (using compulsory schooling laws as instrument)",
      addressesConfounds: ["omitted_variable", "simultaneity"],
      vulnerableTo: ["weak_instrument", "exclusion_restriction_violation"],
    },
    {
      id: "field_experiment",
      name: "Field Experiment",
      description: "Randomized experiment in real-world settings",
      discriminativePower: 9,
      feasibility: "low",
      exampleUse: "Testing microfinance interventions in developing countries",
      addressesConfounds: ["selection_into_treatment"],
      vulnerableTo: ["attrition", "compliance", "external_validity"],
    },
  ],

  effectSizeNorms: {
    metric: "Elasticity / Percentage Change",
    small: 0.05,
    medium: 0.15,
    large: 0.3,
    typicalDescription:
      "A 1% increase in X causing a 0.1% increase in Y is typical. Elasticities > 0.5 are considered large.",
    caveats:
      "Effect sizes vary enormously by context. Labor supply elasticities differ from consumer demand elasticities.",
  },

  literatureSources: [
    {
      name: "NBER Working Papers",
      url: "https://www.nber.org/papers",
      searchTips: "Cutting-edge research. Not peer-reviewed but highly influential.",
      priority: "primary",
    },
    {
      name: "EconLit",
      url: "https://www.aeaweb.org/econlit",
      searchTips: "Comprehensive. Use JEL codes for topical searches.",
      priority: "primary",
    },
    {
      name: "SSRN",
      url: "https://www.ssrn.com",
      searchTips: "Working papers across social sciences. Fast turnaround.",
      priority: "secondary",
    },
  ],

  commonLevelSplits: {
    cause: [
      "Individual incentive",
      "Firm behavior",
      "Market mechanism",
      "Policy/institutional",
      "Macroeconomic",
    ],
    effect: ["Individual outcome", "Firm outcome", "Market equilibrium", "Aggregate/macro"],
    moderators: ["Income level", "Education", "Industry", "Time period", "Geographic region"],
    mediators: ["Prices", "Information", "Credit access", "Labor market conditions"],
  },

  glossary: [
    { term: "Elasticity", definition: "Percent change in Y for 1% change in X. Unitless measure." },
    {
      term: "LATE",
      definition: "Local Average Treatment Effect. Effect for compliers in IV designs.",
    },
    {
      term: "Parallel trends",
      definition:
        "Assumption that treatment and control would have followed same trend absent treatment.",
    },
    {
      term: "External validity",
      definition: "Whether findings generalize to other settings, times, or populations.",
    },
  ],

  relevantBrennerSections: [89, 91, 93, 95],
  relevantQuoteTags: ["mechanism", "confounds", "scale-check", "exclusion-test"],

  exampleHypotheses: [
    "Minimum wage increases reduce employment for low-skilled workers",
    "Microfinance access increases entrepreneurship in developing countries",
    "Class size reduction improves student test scores",
  ],
};

// ============================================================================
// Biology/Medicine Domain Template
// ============================================================================

export const biologyMedicineTemplate: DomainTemplate = {
  id: "biology_medicine",
  name: "Biology & Medicine",
  description: "Molecular biology, cell biology, physiology, clinical medicine",
  icon: "Microscope",
  colorClass: "text-blue-600",

  confoundLibrary: [
    {
      id: "batch_effects",
      name: "Batch Effects",
      description:
        "Technical variation between experimental batches overwhelms biological signal. Common in high-throughput experiments.",
      whenToCheck: "Any multi-batch experiment, especially -omics studies",
      mitigationStrategies: [
        "Randomize samples across batches",
        "Include batch in statistical model",
        "Use batch correction algorithms",
        "Replicate key findings across batches",
      ],
      baseLikelihood: 0.45,
    },
    {
      id: "cell_line_drift",
      name: "Cell Line Drift",
      description:
        "Cultured cells evolve over passages, acquiring mutations and losing original characteristics. HeLa contamination has affected thousands of studies.",
      whenToCheck: "Any cell culture experiment, especially with immortalized lines",
      mitigationStrategies: [
        "Use early-passage cells",
        "Authenticate cell lines",
        "Report passage numbers",
        "Confirm findings in primary cells",
      ],
      baseLikelihood: 0.35,
      relevantSections: [50],
    },
    {
      id: "off_target_effects",
      name: "Off-Target Effects",
      description:
        "CRISPR guides, siRNAs, or drugs affect unintended targets. Phenotype may be due to off-target activity.",
      whenToCheck: "Any genetic perturbation or pharmacological study",
      mitigationStrategies: [
        "Use multiple guides/siRNAs",
        "Rescue with resistant allele",
        "Use orthogonal approaches",
        "Check predicted off-targets",
      ],
      baseLikelihood: 0.4,
    },
    {
      id: "antibody_nonspecificity",
      name: "Antibody Non-Specificity",
      description:
        "Antibody binds multiple proteins or epitopes. Western blot bands may be wrong protein.",
      whenToCheck: "Any immunoassay, Western blot, immunofluorescence",
      mitigationStrategies: [
        "Validate with knockout/knockdown",
        "Use multiple antibodies",
        "Check molecular weight",
        "Use orthogonal detection methods",
      ],
      baseLikelihood: 0.4,
    },
    {
      id: "circadian_variation",
      name: "Circadian/Temporal Variation",
      description:
        "Biological parameters vary with time of day, feeding state, or season. Measuring at different times introduces noise.",
      whenToCheck: "Any in vivo or cell culture study",
      mitigationStrategies: [
        "Standardize collection time",
        "Account for zeitgeber time",
        "Randomize time across groups",
        "Report collection times",
      ],
      baseLikelihood: 0.3,
    },
    {
      id: "cage_effects",
      name: "Cage/Housing Effects",
      description:
        "Animals in same cage are not independent. Microbiome, social hierarchy, and stress differ by cage.",
      whenToCheck: "Any animal study",
      mitigationStrategies: [
        "Randomize across cages",
        "Use cage as statistical unit or random effect",
        "Single-house if appropriate",
        "Report housing conditions",
      ],
      baseLikelihood: 0.35,
    },
  ],

  researchDesigns: [
    {
      id: "rct_clinical",
      name: "Randomized Clinical Trial",
      description:
        "Gold standard for clinical interventions. Random assignment, blinding, placebo control.",
      discriminativePower: 10,
      feasibility: "low",
      exampleUse: "Testing new drug efficacy",
      addressesConfounds: ["selection_bias", "placebo_effect"],
      vulnerableTo: ["attrition", "unblinding", "generalizability"],
    },
    {
      id: "perturbation_screen",
      name: "Genetic Perturbation Screen",
      description: "Systematically knock out/down genes to identify those affecting phenotype",
      discriminativePower: 8,
      feasibility: "medium",
      exampleUse: "CRISPR screen for drug resistance genes",
      addressesConfounds: [],
      vulnerableTo: ["off_target_effects", "essential_gene_dropout"],
    },
    {
      id: "dose_response",
      name: "Dose-Response Study",
      description: "Vary dose to establish concentration-effect relationship",
      discriminativePower: 8,
      feasibility: "high",
      exampleUse: "Establishing drug EC50",
      addressesConfounds: ["threshold_effects"],
      vulnerableTo: ["saturation", "toxicity_at_high_doses"],
    },
    {
      id: "rescue_experiment",
      name: "Rescue Experiment",
      description: "Add back wild-type gene to knockout to confirm specificity",
      discriminativePower: 9,
      feasibility: "medium",
      exampleUse: "Confirming gene function after CRISPR knockout",
      addressesConfounds: ["off_target_effects"],
      vulnerableTo: ["expression_level_issues", "compensation"],
    },
  ],

  effectSizeNorms: {
    metric: "Fold Change / Log2 Ratio",
    small: 1.5,
    medium: 2.0,
    large: 4.0,
    typicalDescription:
      "2-fold change is commonly used threshold. In -omics, 1.5-fold with adjusted p < 0.05 is typical cutoff.",
    caveats:
      "Biological significance differs from statistical significance. Small fold changes in key pathways may be more important than large changes elsewhere.",
  },

  literatureSources: [
    {
      name: "PubMed",
      url: "https://pubmed.ncbi.nlm.nih.gov",
      searchTips: "Use MeSH terms. Check related articles. Sort by relevance.",
      priority: "primary",
    },
    {
      name: "bioRxiv",
      url: "https://www.biorxiv.org",
      searchTips: "Preprints. Latest findings before peer review. Check if published.",
      priority: "primary",
    },
    {
      name: "UniProt/NCBI Gene",
      url: "https://www.uniprot.org",
      searchTips: "For gene/protein information, functions, interactions.",
      priority: "secondary",
    },
  ],

  commonLevelSplits: {
    cause: [
      "Genetic variant",
      "Molecular/biochemical",
      "Cellular",
      "Tissue/organ",
      "Systemic/organism",
    ],
    effect: [
      "Molecular readout",
      "Cellular phenotype",
      "Histological",
      "Physiological",
      "Clinical outcome",
    ],
    moderators: ["Genetic background", "Age", "Sex", "Diet", "Microbiome"],
    mediators: ["Signaling pathways", "Gene expression", "Protein activity", "Metabolites"],
  },

  glossary: [
    {
      term: "Orthogonal",
      definition:
        "Independent method using different principles. Confirms finding isn't method artifact.",
    },
    {
      term: "Rescue",
      definition: "Reversing phenotype by adding back gene/protein. Confirms specificity.",
    },
    {
      term: "FDR",
      definition:
        "False Discovery Rate. Expected proportion of false positives among significant results.",
    },
    {
      term: "Biological replicate",
      definition:
        "Independent samples. Technical replicates (same sample, multiple measurements) don't count.",
    },
  ],

  relevantBrennerSections: [50, 89, 91, 93, 95, 97],
  relevantQuoteTags: ["mechanism", "measurement", "scale-check", "bridging-levels"],

  exampleHypotheses: [
    "CRISPR knockout of gene X reduces tumor growth in mice",
    "Drug Y inhibits kinase Z and reverses disease phenotype",
    "Gut microbiome composition affects drug metabolism",
  ],
};

// ============================================================================
// Computer Science Domain Template
// ============================================================================

export const computerScienceTemplate: DomainTemplate = {
  id: "computer_science",
  name: "Computer Science",
  description: "Machine learning, systems, HCI, algorithms, software engineering",
  icon: "Code",
  colorClass: "text-orange-600",

  confoundLibrary: [
    {
      id: "data_leakage",
      name: "Data Leakage",
      description:
        "Information from test set leaks into training. Includes temporal leakage (using future data), target leakage, and train-test contamination.",
      whenToCheck: "Any ML model evaluation",
      mitigationStrategies: [
        "Strict train/test splits before any preprocessing",
        "Time-based splits for temporal data",
        "Cross-validation with proper boundaries",
        "Check for duplicates across splits",
      ],
      baseLikelihood: 0.4,
    },
    {
      id: "benchmark_overfitting",
      name: "Benchmark Overfitting",
      description:
        "Methods tuned to specific benchmarks don't generalize. ImageNet accuracy doesn't predict real-world performance.",
      whenToCheck: "Any method claiming state-of-the-art on benchmarks",
      mitigationStrategies: [
        "Test on held-out datasets",
        "Use multiple benchmarks",
        "Real-world deployment testing",
        "Report variance across seeds",
      ],
      baseLikelihood: 0.45,
    },
    {
      id: "compute_confound",
      name: "Compute Advantage Confound",
      description:
        "Improvements come from more compute, not better methods. Scaling laws mean more GPUs often beats algorithmic innovation.",
      whenToCheck: "Any comparison of methods with different computational budgets",
      mitigationStrategies: [
        "Control for compute (FLOPs, GPU-hours)",
        "Plot performance vs. compute curves",
        "Compare at same compute budget",
        "Report training cost",
      ],
      baseLikelihood: 0.4,
    },
    {
      id: "implementation_differences",
      name: "Implementation Differences",
      description:
        "Results differ due to code, not method. Hyperparameter tuning, random seeds, libraries affect outcomes.",
      whenToCheck: "Any comparison to prior work",
      mitigationStrategies: [
        "Use same codebase for baselines",
        "Report all hyperparameters",
        "Multiple random seeds",
        "Release code",
      ],
      baseLikelihood: 0.5,
      relevantSections: [50],
    },
    {
      id: "distribution_shift",
      name: "Distribution Shift",
      description:
        "Test distribution differs from training. Common in deployed ML systems where data drifts over time.",
      whenToCheck: "Any real-world deployment, any dataset created at different time/place",
      mitigationStrategies: [
        "Test on multiple distributions",
        "Monitor for drift in deployment",
        "Domain adaptation techniques",
        "Report dataset collection metadata",
      ],
      baseLikelihood: 0.45,
    },
  ],

  researchDesigns: [
    {
      id: "ablation",
      name: "Ablation Study",
      description: "Remove components one at a time to identify their contribution",
      discriminativePower: 8,
      feasibility: "high",
      exampleUse: "Understanding which layers of a neural network matter most",
      addressesConfounds: ["implementation_differences"],
      vulnerableTo: ["interaction_effects"],
    },
    {
      id: "controlled_experiment",
      name: "Controlled A/B Experiment",
      description: "Randomly assign users to variants and measure outcomes",
      discriminativePower: 9,
      feasibility: "medium",
      exampleUse: "Testing UI changes on user engagement",
      addressesConfounds: ["selection_bias"],
      vulnerableTo: ["novelty_effects", "network_effects"],
    },
    {
      id: "benchmark_suite",
      name: "Benchmark Suite Evaluation",
      description: "Evaluate on standardized set of problems",
      discriminativePower: 6,
      feasibility: "high",
      exampleUse: "Comparing NLP models on GLUE benchmark",
      addressesConfounds: ["cherry_picking"],
      vulnerableTo: ["benchmark_overfitting"],
    },
    {
      id: "user_study",
      name: "User Study",
      description: "Have real users interact with system and measure outcomes",
      discriminativePower: 8,
      feasibility: "low",
      exampleUse: "Evaluating HCI interface designs",
      addressesConfounds: ["proxy_metric_mismatch"],
      vulnerableTo: ["demand_characteristics", "sample_bias"],
    },
  ],

  effectSizeNorms: {
    metric: "Accuracy / F1 / Latency",
    small: 0.01,
    medium: 0.03,
    large: 0.1,
    typicalDescription:
      "1-2% accuracy improvement is often publishable. 10%+ is major breakthrough or new paradigm.",
    caveats:
      "Depends heavily on task difficulty. Easy tasks saturate quickly. Report confidence intervals.",
  },

  literatureSources: [
    {
      name: "arXiv",
      url: "https://arxiv.org/list/cs/recent",
      searchTips:
        "Preprints. Most ML research here first. Use semantic scholar for related papers.",
      priority: "primary",
    },
    {
      name: "ACL Anthology",
      url: "https://aclanthology.org",
      searchTips: "For NLP papers. Well-organized by venue.",
      priority: "primary",
    },
    {
      name: "Papers with Code",
      url: "https://paperswithcode.com",
      searchTips: "Find implementations and benchmark results. Great for SOTA comparisons.",
      priority: "primary",
    },
  ],

  commonLevelSplits: {
    cause: [
      "Algorithm/architecture",
      "Training data",
      "Hyperparameters",
      "Hardware/infrastructure",
      "Human factors",
    ],
    effect: [
      "Accuracy metric",
      "Latency/throughput",
      "Resource usage",
      "User experience",
      "Business outcome",
    ],
    moderators: ["Data scale", "Domain/task", "Hardware", "User population"],
    mediators: ["Representations", "Attention patterns", "Gradient flow"],
  },

  glossary: [
    { term: "SOTA", definition: "State of the art. Best published result on a benchmark." },
    { term: "Ablation", definition: "Removing components to measure their contribution." },
    {
      term: "OOD",
      definition: "Out of distribution. Data from different distribution than training.",
    },
    {
      term: "Compute-optimal",
      definition: "Best performance for given compute budget (Chinchilla scaling).",
    },
  ],

  relevantBrennerSections: [50, 89, 91],
  relevantQuoteTags: ["measurement", "falsification", "bias-to-experiment"],

  exampleHypotheses: [
    "Transformer architecture outperforms RNN for long-range dependencies",
    "Pre-training on code improves reasoning in language models",
    "Dark mode reduces eye strain during extended computer use",
  ],
};

// ============================================================================
// Neuroscience Domain Template
// ============================================================================

export const neuroscienceTemplate: DomainTemplate = {
  id: "neuroscience",
  name: "Neuroscience",
  description:
    "Cognitive neuroscience, neuroimaging, computational neuroscience, systems neuroscience",
  icon: "Zap",
  colorClass: "text-pink-600",

  confoundLibrary: [
    {
      id: "motion_artifacts",
      name: "Motion Artifacts",
      description:
        "Head movement during fMRI creates false activations. Patient populations move more, creating systematic group differences.",
      whenToCheck: "Any fMRI study, especially comparing groups",
      mitigationStrategies: [
        "Motion scrubbing/censoring",
        "Regression of motion parameters",
        "Match groups on motion",
        "Use motion-resistant sequences",
      ],
      baseLikelihood: 0.5,
    },
    {
      id: "reverse_inference",
      name: "Reverse Inference",
      description:
        "Inferring cognitive process from brain activation. Amygdala activates to many things, not just fear.",
      whenToCheck: "Any claim about what activation 'means' for cognition",
      mitigationStrategies: [
        "Use behavioral measures alongside imaging",
        "Neurosynth reverse inference maps",
        "Manipulate the cognitive process",
        "Multivariate pattern analysis",
      ],
      baseLikelihood: 0.45,
      relevantSections: [89],
    },
    {
      id: "low_power",
      name: "Low Statistical Power",
      description:
        "Typical fMRI studies have ~20 subjects and are underpowered. Effect sizes are inflated, false positives high.",
      whenToCheck: "Any neuroimaging study with N < 50",
      mitigationStrategies: [
        "Power analysis before data collection",
        "Large samples or consortia",
        "Pre-registration",
        "Focus on effect sizes, not just p-values",
      ],
      baseLikelihood: 0.6,
    },
    {
      id: "double_dipping",
      name: "Double Dipping / Circular Analysis",
      description:
        "Same data used to select regions and test hypotheses. Guarantees significant results.",
      whenToCheck: "Any ROI analysis where ROIs were defined from the same data",
      mitigationStrategies: [
        "Independent localizers",
        "Leave-one-subject-out",
        "Pre-registered ROIs",
        "Whole-brain analysis",
      ],
      baseLikelihood: 0.4,
    },
    {
      id: "task_impurity",
      name: "Task Impurity",
      description:
        "Cognitive tasks engage multiple processes. 'Memory task' also involves attention, perception, motor response.",
      whenToCheck: "Any task-based study",
      mitigationStrategies: [
        "Careful subtraction logic",
        "Parametric modulation",
        "Process dissociation",
        "Multivariate analysis",
      ],
      baseLikelihood: 0.4,
    },
  ],

  researchDesigns: [
    {
      id: "fmri_block",
      name: "Block Design fMRI",
      description: "Extended periods of condition vs. rest for high power",
      discriminativePower: 7,
      feasibility: "high",
      exampleUse: "Identifying brain regions for faces vs. houses",
      addressesConfounds: [],
      vulnerableTo: ["habituation", "anticipation"],
    },
    {
      id: "tms_causal",
      name: "TMS Causal Intervention",
      description: "Temporarily disrupt brain region to test causal role",
      discriminativePower: 9,
      feasibility: "medium",
      exampleUse: "Does disrupting motor cortex impair speech production?",
      addressesConfounds: ["correlation_vs_causation"],
      vulnerableTo: ["spread_of_stimulation", "compensatory_mechanisms"],
    },
    {
      id: "lesion_patient",
      name: "Lesion-Symptom Mapping",
      description: "Link brain damage location to cognitive deficits",
      discriminativePower: 8,
      feasibility: "low",
      exampleUse: "Frontal damage and executive function deficits",
      addressesConfounds: ["reverse_inference"],
      vulnerableTo: ["diaschisis", "lesion_overlap"],
    },
    {
      id: "multivariate_decoding",
      name: "MVPA/Decoding Analysis",
      description: "Decode stimulus/state from patterns of activity",
      discriminativePower: 8,
      feasibility: "high",
      exampleUse: "Can we decode which object someone is viewing from V1?",
      addressesConfounds: ["reverse_inference"],
      vulnerableTo: ["overfitting", "confound_decoding"],
    },
  ],

  effectSizeNorms: {
    metric: "Cohen's d / Percent Signal Change",
    small: 0.2,
    medium: 0.5,
    large: 0.8,
    typicalDescription:
      "fMRI effects typically d = 0.5-1.0 in well-powered studies. Meta-analyses suggest many published effects are inflated.",
    caveats:
      "BOLD signal is indirect. 1% signal change is considered robust. Effect sizes depend heavily on region and task.",
  },

  literatureSources: [
    {
      name: "PubMed",
      url: "https://pubmed.ncbi.nlm.nih.gov",
      searchTips: "Use MeSH terms for anatomy. Filter by imaging modality.",
      priority: "primary",
    },
    {
      name: "Neurosynth",
      url: "https://neurosynth.org",
      searchTips: "Meta-analytic maps. Good for reverse inference checks.",
      priority: "secondary",
    },
    {
      name: "NeuroVault",
      url: "https://neurovault.org",
      searchTips: "Repository of brain maps. Compare your results to others.",
      priority: "secondary",
    },
  ],

  commonLevelSplits: {
    cause: [
      "Molecular/neurotransmitter",
      "Cellular/circuit",
      "Systems/network",
      "Cognitive/computational",
      "Behavioral",
    ],
    effect: ["Spike rate", "LFP/oscillation", "BOLD signal", "EEG/MEG", "Behavior"],
    moderators: ["Attention", "Arousal", "Task demands", "Individual differences"],
    mediators: ["Neural computations", "Connectivity patterns", "Neuromodulation"],
  },

  glossary: [
    {
      term: "BOLD",
      definition: "Blood-oxygen-level-dependent. fMRI signal reflecting blood oxygenation changes.",
    },
    { term: "Localizer", definition: "Separate scan to define ROIs independently of main task." },
    {
      term: "Decoding",
      definition: "Using pattern classification to infer what subject experienced.",
    },
    {
      term: "Connectivity",
      definition: "Correlations or directed relationships between brain regions.",
    },
  ],

  relevantBrennerSections: [50, 89, 91, 93, 95, 97],
  relevantQuoteTags: ["mechanism", "bridging-levels", "measurement", "confounds"],

  exampleHypotheses: [
    "Hippocampal activity during encoding predicts later memory retrieval",
    "Prefrontal cortex is necessary for working memory maintenance",
    "Default mode network activity during rest predicts mind-wandering",
  ],
};

// ============================================================================
// Custom Domain Template (for user-defined domains)
// ============================================================================

export const customDomainTemplate: DomainTemplate = {
  id: "custom",
  name: "Custom Domain",
  description: "User-defined research domain with custom settings",
  icon: "Settings",
  colorClass: "text-gray-600",

  confoundLibrary: [],
  researchDesigns: [],
  effectSizeNorms: {
    metric: "Effect size",
    small: 0.2,
    medium: 0.5,
    large: 0.8,
    typicalDescription: "Define your domain-specific effect size norms",
  },
  literatureSources: [],
  commonLevelSplits: {
    cause: [],
    effect: [],
  },
  glossary: [],
  relevantBrennerSections: [50, 89, 91, 93, 95],
  relevantQuoteTags: ["falsification", "mechanism", "confounds", "measurement"],
};

// ============================================================================
// Physics Domain Template (Placeholder)
// ============================================================================

export const physicsTemplate: DomainTemplate = {
  ...customDomainTemplate,
  id: "physics",
  name: "Physics",
  description: "Physics and natural sciences (placeholder - contributions welcome)",
  icon: "Atom",
  colorClass: "text-cyan-600",
};

// ============================================================================
// Template Registry
// ============================================================================

/**
 * All available domain templates indexed by ID.
 */
export const DOMAIN_TEMPLATES: Record<DomainId, DomainTemplate> = {
  psychology: psychologyTemplate,
  epidemiology: epidemiologyTemplate,
  economics: economicsTemplate,
  biology_medicine: biologyMedicineTemplate,
  computer_science: computerScienceTemplate,
  neuroscience: neuroscienceTemplate,
  physics: physicsTemplate,
  custom: customDomainTemplate,
};

/**
 * Get a domain template by ID.
 */
export function getDomainTemplate(id: DomainId): DomainTemplate {
  return DOMAIN_TEMPLATES[id] ?? customDomainTemplate;
}

/**
 * List all available domain options for UI selection.
 */
export function listDomainOptions(): DomainOption[] {
  return Object.values(DOMAIN_TEMPLATES)
    .filter((t) => t.id !== "custom" && t.id !== "physics") // Hide incomplete templates
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      colorClass: t.colorClass,
    }));
}

/**
 * Get confounds for a domain, optionally filtered by likelihood threshold.
 */
export function getDomainConfounds(
  domainId: DomainId,
  minLikelihood: number = 0,
): DomainConfound[] {
  const template = getDomainTemplate(domainId);
  return template.confoundLibrary.filter((c) => c.baseLikelihood >= minLikelihood);
}

/**
 * Get relevant Brenner quote tags for a domain.
 */
export function getDomainQuoteTags(domainId: DomainId): string[] {
  const template = getDomainTemplate(domainId);
  return template.relevantQuoteTags;
}
