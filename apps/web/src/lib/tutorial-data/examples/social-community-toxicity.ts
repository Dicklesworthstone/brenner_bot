import type { Artifact } from "@/lib/artifact-merge";
import type { TutorialDomainExample } from "./types";

const NOW = "2026-01-01T00:00:00Z";

export const SOCIAL_COMMUNITY_TOXICITY_ARTIFACT: Artifact = {
  metadata: {
    session_id: "EXAMPLE-SOCIAL-COMMUNITY-TOXICITY",
    created_at: NOW,
    updated_at: NOW,
    version: 1,
    status: "active",
    contributors: [
      { agent: "tutorial", program: "brennerbot.org", model: "static", contributed_at: NOW },
    ],
  },
  sections: {
    research_thread: {
      id: "RT",
      statement: "Why do some online communities become toxic over time?",
      context:
        "Some communities devolve into harassment, norm violations, and chronic conflict, while others remain constructive. We want to discriminate between moderation/incentive explanations, selection/composition explanations, and platform-amplification explanations under realistic constraints (observational data, quasi-experiments).",
      why_it_matters:
        "If we can identify the dominant causal lever (moderation, selection, or amplification), we can design interventions that actually change trajectories instead of moralizing after the fact.",
      anchors: ["§89", "§161", "§147", "domain"],
    },
    hypothesis_slate: [
      {
        id: "H1",
        name: "Moderation capacity / enforcement failure",
        claim:
          "Communities become toxic when moderation capacity and enforcement lag behind growth and conflict; norms drift because violations go unpunished.",
        mechanism:
          "Low enforcement increases payoff for antisocial behavior; norm entrepreneurs set a new equilibrium; constructive members churn out, accelerating drift.",
        anchors: ["§89"],
      },
      {
        id: "H2",
        name: "Selection effects / composition shift",
        claim:
          "Communities become toxic primarily because they attract and retain toxic participants; the main driver is who joins and stays, not within-community change.",
        mechanism:
          "A small early toxicity signal changes who enters; homophily and churn shift composition; toxicity appears ‘caused’ by the community but is selection-driven.",
        anchors: ["§161"],
      },
      {
        id: "H3",
        name: "Algorithmic amplification / incentive gradient (third alternative)",
        claim:
          "Platform ranking and engagement incentives amplify outrage and conflict; toxicity is an emergent effect of attention allocation rather than moderation or selection alone.",
        mechanism:
          "Ranking models optimize engagement; inflammatory content gets surfaced; feedback loops raise conflict and normalize toxic styles even among initially neutral users.",
        anchors: ["inference", "§147"],
        third_alternative: true,
      },
    ],
    predictions_table: [
      {
        id: "P1",
        condition: "Abrupt moderation policy change (natural experiment)",
        predictions: {
          H1: "Toxicity drops after enforcement increases; effect persists even if membership stays similar.",
          H2: "Little immediate change; composition dominates; toxicity persists unless membership changes.",
          H3: "Effect depends on ranking/visibility; moderation helps but amplification still drives conflict if incentives unchanged.",
        },
      },
      {
        id: "P2",
        condition: "Cross-platform comparison for the same topic community",
        predictions: {
          H1: "Toxicity correlates with moderation tools and staffing, not platform per se.",
          H2: "Toxicity correlates with who the platform attracts for the topic (demographics/selection), regardless of tools.",
          H3: "Toxicity correlates with platform ranking dynamics (what is surfaced) even with similar moderation rules.",
        },
      },
      {
        id: "P3",
        condition: "New-member influx shock (e.g., external event drives growth)",
        predictions: {
          H1: "Toxicity rises when moderation is overwhelmed; recovers if capacity scales up quickly.",
          H2: "Toxicity shifts immediately if newcomers differ; little dependence on moderation response speed.",
          H3: "Toxicity depends on what gets amplified during the event; can spike even without big composition changes.",
        },
      },
    ],
    discriminative_tests: [
      {
        id: "T1",
        name: "Natural experiment: enforcement shock",
        procedure:
          "Identify a policy or staffing change that sharply increases enforcement (or a tooling rollout). Compare toxicity metrics pre/post within the community, with matched control communities that did not change enforcement at the same time.",
        discriminates: "H1 vs H2",
        expected_outcomes: {
          H1: "Post-change toxicity declines relative to controls, even with similar membership composition.",
          H2: "No meaningful change unless membership composition shifts; controls look similar after adjusting for entrants.",
        },
        potency_check:
          "Validate that enforcement actually changed (ban/removal rates, response times). Check for concurrent external shocks.",
        feasibility: "medium",
        score: { likelihood_ratio: 4, cost: 2, speed: 2, ambiguity: 3 },
      },
      {
        id: "T2",
        name: "Amplification test: ranking perturbation (A/B or policy proxy)",
        procedure:
          "Use a known ranking change, feed ranking, or visibility intervention (A/B if possible; otherwise proxy via platform rollouts). Measure whether toxic content visibility predicts downstream toxicity even controlling for composition and enforcement.",
        discriminates: "H2 vs H3",
        expected_outcomes: {
          H2: "Once composition is controlled, ranking perturbations have limited effect on toxicity trajectories.",
          H3: "Visibility/engagement shifts causally change toxicity (conflict escalates when outrage is surfaced).",
        },
        potency_check:
          "Ensure the ranking perturbation is plausibly exogenous (rollout timing, geography) and that measurement captures exposure, not just production.",
        feasibility: "low",
        score: { likelihood_ratio: 3, cost: 3, speed: 1, ambiguity: 3 },
      },
    ],
    assumption_ledger: [
      {
        id: "A1",
        name: "Toxicity metric tracks the construct",
        statement:
          "Our toxicity metric (e.g., classifier, rule-violation rate, harassment reports) reflects meaningful harm rather than mere disagreement or topical intensity.",
        load: "Load-bearing for all hypotheses",
        test: "Audit samples with humans; measure false positives (heated but constructive) and false negatives (subtle harassment).",
      },
      {
        id: "A2",
        name: "Controls address confounding shocks",
        statement:
          "We can find comparison communities or within-community controls that share external shocks (news cycles, political events) so we don’t mistake global events for causal mechanisms.",
        load: "Load-bearing for causal claims",
        test: "Matched controls + interrupted time series; sensitivity analysis to unmeasured confounding.",
      },
      {
        id: "A3",
        name: "Scale check: individual vs group vs platform level",
        statement:
          "We are not mixing causal levels (individual traits vs group norms vs platform incentives). Each hypothesis must specify its operative level and how effects propagate across levels.",
        load: "Load-bearing for coherent mechanism",
        test: "Explicit level-split in the model; include measures at each level (user churn, norms, ranking exposure).",
        scale_check: true,
      },
    ],
    anomaly_register: [],
    adversarial_critique: [
      {
        id: "C1",
        name: "Are we mistaking visibility for prevalence?",
        attack:
          "Perceived toxicity may rise because toxic content becomes more visible, not because more toxic behavior is produced. Measurement and exposure are intertwined.",
        evidence:
          "Ranking systems can increase exposure of a minority of toxic posts; users experience a ‘toxic feed’ even if production is unchanged.",
        current_status:
          "Separate production metrics from exposure metrics. Add instrumentation for what users actually see.",
        real_third_alternative: true,
        proposed_alternative:
          "Reframe as: ‘What drives exposure to toxic content?’ which may have different levers than ‘what drives production?’",
      },
      {
        id: "C2",
        name: "Norms may be multi-dimensional",
        attack:
          "‘Toxic’ collapses many dimensions (rudeness, hate, off-topic, conflict). Different mechanisms may govern different dimensions; an aggregate metric can hide discrimination.",
        evidence:
          "Some communities tolerate profanity but not harassment; others tolerate ideological conflict but not personal attacks.",
        current_status:
          "Split toxicity into subtypes and rerun discrimination; ensure interventions target the right subtype.",
      },
    ],
  },
};

export const SOCIAL_COMMUNITY_TOXICITY_EXAMPLE = {
  slug: "social-community-toxicity",
  title: "Social Science: Community Toxicity",
  domain: "social_science",
  topic: "Why do some online communities become toxic?",
  researchQuestion:
    "Why do some online communities spiral into harassment and chronic conflict while others remain constructive? We want quasi-experimental tests that discriminate enforcement failure, selection/composition, and platform amplification mechanisms.",
  excerpt: [
    {
      anchor: "§89",
      note: "Exclusion: prefer natural experiments and discriminative comparisons.",
    },
    {
      anchor: "§161",
      note: "Mechanism over correlation: specify causal pathways (payoffs, churn, exposure).",
    },
    {
      anchor: "§147",
      note: "Level split: individual traits vs group norms vs platform incentives.",
    },
    {
      anchor: "domain",
      note: "Use interrupted time series, matched controls, and cross-platform comparisons.",
    },
    {
      anchor: "domain",
      note: "Separate production of toxic posts from exposure/visibility in the feed.",
    },
  ],
  artifact: SOCIAL_COMMUNITY_TOXICITY_ARTIFACT,
  operatorAnnotations: [
    {
      operator: "Exclusion Test (⊘)",
      appliedIn: ["Discriminative Tests"],
      note: "Natural experiments and cross-context comparisons aim to rule out selection-only stories.",
    },
    {
      operator: "Level Split (Σ)",
      appliedIn: ["Assumption Ledger", "Adversarial Critique"],
      note: "Forces explicit level accounting so ‘platform incentive’ and ‘community norm’ aren’t conflated.",
    },
    {
      operator: "Scale Check (⊙)",
      appliedIn: ["Assumption Ledger"],
      note: "Requires separating individual vs group vs platform-level measures before inferring causality.",
    },
    {
      operator: "Object Transpose (⟳)",
      appliedIn: ["Predictions Table"],
      note: "Cross-platform transposition: same topic, different incentive structures and tooling.",
    },
  ],
  commentary: [
    "Hypotheses are discriminative at different levers: enforcement capacity, membership composition, and exposure amplification.",
    "Tests use realistic constraints: natural experiments and cross-platform comparisons rather than impossible RCTs.",
    "The critique insists on separating exposure from production — a common confound in online systems.",
  ],
} satisfies TutorialDomainExample;
