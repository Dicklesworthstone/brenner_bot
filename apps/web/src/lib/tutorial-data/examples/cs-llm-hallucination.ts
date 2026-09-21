import type { Artifact } from "@/lib/artifact-merge";
import type { TutorialDomainExample } from "./types";

const NOW = "2026-01-01T00:00:00Z";

export const CS_LLM_HALLUCINATION_ARTIFACT: Artifact = {
  metadata: {
    session_id: "EXAMPLE-CS-LLM-HALLUCINATION",
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
      statement: "Why do large language models hallucinate (confidently produce false statements)?",
      context:
        "LLMs are trained to predict text and then aligned to follow instructions. Users observe ‘hallucinations’ when the model outputs plausible but false claims. We want a mechanistic account that yields discriminative predictions across training regimes and evaluation conditions.",
      why_it_matters:
        "If we can separate causes (objective mismatch vs alignment incentives vs measurement artifacts), we can design interventions that reduce hallucination without sacrificing usefulness.",
      anchors: ["§147", "§161", "§89", "§58", "domain"],
    },
    hypothesis_slate: [
      {
        id: "H1",
        name: "Objective under uncertainty (next-token best-guess)",
        claim:
          "Hallucination is a consequence of predicting plausible continuations when the model lacks grounding; under uncertainty it produces the most likely-sounding completion, not a truth-conditional answer.",
        mechanism:
          "The model represents a distribution over continuations; when evidence is weak it samples/decodes high-probability text that may be false. ‘Confidence’ can be a decoding artifact rather than calibrated epistemic certainty.",
        anchors: ["§161"],
      },
      {
        id: "H2",
        name: "Alignment incentives (RLHF / instruction tuning)",
        claim:
          "Hallucination is driven primarily by post-training incentives that reward ‘helpful’ answers over abstention, pushing the model to respond even when uncertain.",
        mechanism:
          "Reward models and instruction-following fine-tunes penalize refusal and ambiguity; the policy learns to produce fluent completions instead of signaling uncertainty or asking clarifying questions.",
        anchors: ["§89"],
      },
      {
        id: "H3",
        name: "Measurement + definition artifact (third alternative)",
        claim:
          "‘Hallucination’ is not a single mechanism: many instances are evaluation artifacts (underspecified questions, ambiguous truth conditions, grading noise) or conflations of distinct failure modes.",
        mechanism:
          "When prompts are ambiguous and evaluators expect a single canonical answer, any reasonable completion can be labeled ‘hallucination’. Distinct phenomena (retrieval errors, reasoning errors, instruction misread) are pooled into one label.",
        anchors: ["inference", "§147"],
        third_alternative: true,
      },
    ],
    predictions_table: [
      {
        id: "P1",
        condition: "Compare base model vs RLHF model on the same ambiguous prompts",
        predictions: {
          H1: "Similar error rate; RLHF changes tone/format more than factuality.",
          H2: "RLHF increases confident false answers (lower refusal), raising hallucination rate.",
          H3: "Observed rate depends strongly on prompt ambiguity + grading rubric; ‘hallucination’ varies with evaluation protocol.",
        },
      },
      {
        id: "P2",
        condition:
          "Add an explicit ‘ask clarifying question / abstain’ option with reward for calibrated uncertainty",
        predictions: {
          H1: "Moderate improvement; uncertainty signaling helps but grounding still missing for truly unknown facts.",
          H2: "Large improvement; when abstention is rewarded, hallucinations drop sharply.",
          H3: "Improvement depends on how ‘unknown’ is defined; many ‘hallucinations’ disappear when questions are clarified.",
        },
      },
      {
        id: "P3",
        condition: "Retrieval augmentation (RAG) vs no retrieval on fact-heavy queries",
        predictions: {
          H1: "Large improvement when retrieval supplies evidence; hallucination drops when grounding is present.",
          H2: "Some improvement, but RLHF still pushes confident answers when retrieval is absent or contradictory.",
          H3: "Reported hallucination rate depends on whether graders accept citations + uncertainty; protocol dominates.",
        },
      },
    ],
    discriminative_tests: [
      {
        id: "T1",
        name: "A/B alignment incentive test (reward abstention vs reward answering)",
        procedure:
          "Take the same base model and run two post-training regimes: (A) reward calibrated abstention/clarification when uncertain, (B) reward always answering. Evaluate on a fixed benchmark of ambiguous + fact queries.",
        discriminates: "H1 vs H2",
        expected_outcomes: {
          H1: "Hallucination changes only modestly; core issue is lack of grounding, not incentives.",
          H2: "Hallucination changes dramatically; regime (A) sharply reduces confident false answers.",
        },
        potency_check:
          "Hold the base model and evaluation set constant. Confirm that the two reward models differ mainly in abstention/clarification incentives.",
        feasibility: "high",
        score: { likelihood_ratio: 4, cost: 2, speed: 2, ambiguity: 2 },
      },
      {
        id: "T2",
        name: "Evaluation perturbation test (rubric sensitivity)",
        procedure:
          "Re-score the same model outputs under multiple rubrics: strict single-answer grading vs rubric that allows clarification, citations, and uncertainty. Quantify how much ‘hallucination’ rate changes without changing the model.",
        discriminates: "H2 vs H3",
        expected_outcomes: {
          H2: "Rates change somewhat, but the main driver remains incentives; model still outputs false claims when pushed.",
          H3: "Rates swing widely; a large fraction of ‘hallucinations’ are rubric artifacts or ambiguity effects.",
        },
        potency_check:
          "Use blinded graders and consistent prompts; ensure rubric changes are explicit and documented.",
        feasibility: "high",
        score: { likelihood_ratio: 3, cost: 1, speed: 3, ambiguity: 2 },
      },
    ],
    assumption_ledger: [
      {
        id: "A1",
        name: "Operational definition of hallucination is stable",
        statement:
          "We can define hallucination in a way that is consistent across evaluators and tasks (e.g., falsifiable claims without supporting evidence).",
        load: "Load-bearing for all hypotheses",
        test: "Inter-rater agreement study + rubric refinement; measure κ before/after.",
      },
      {
        id: "A2",
        name: "Benchmarks represent real usage",
        statement:
          "The evaluation prompts reflect the distribution of user queries where hallucination matters (not contrived trivia).",
        load: "Load-bearing for intervention relevance",
        test: "Sample real user logs (anonymized) to build a representative benchmark; compare performance deltas.",
      },
      {
        id: "A3",
        name: "Model can express uncertainty without being penalized",
        statement:
          "We can design an interface/training regime where uncertainty and clarifying questions are acceptable outcomes.",
        load: "Load-bearing for H2 interventions",
        test: "User study: measure satisfaction and task success with calibrated abstention vs confident answers.",
      },
      {
        id: "A4",
        name: "Scale check: information deficit implies an error floor",
        statement:
          "For some fact claims, the model has insufficient evidence in-context; without retrieval or external tools, there is a minimum achievable error rate even under ideal incentives.",
        load: "Load-bearing for H1",
        test: "Bucket queries by evidence availability; measure accuracy with/without retrieval; estimate ‘no-evidence’ error floor.",
        scale_check: true,
        calculation:
          "If best-guess accuracy in a ‘no-evidence’ bucket is p≈0.6, then forcing answers yields expected hallucinations ≈ (1−p)·N = 0.4N. To beat the floor, add evidence (RAG/tools) or change the task (ask/abstain).",
      },
    ],
    anomaly_register: [],
    adversarial_critique: [
      {
        id: "C1",
        name: "Hallucination may be multiple phenomena",
        attack:
          "We’re treating hallucination as one mechanism, but it may be a bundle: retrieval failure, reasoning error, instruction misread, and evaluator disagreement. A single ‘cause’ may not exist.",
        evidence:
          "Different subsets respond to different fixes (RAG helps factual queries; better prompts help ambiguity; alignment changes refusal behavior).",
        current_status:
          "Split the research thread into subtypes and run discrimination per subtype rather than aggregating.",
        real_third_alternative: true,
        proposed_alternative:
          "Reframe as: ‘What are the dominant failure modes under this product setting, and what interventions target each?’",
      },
      {
        id: "C2",
        name: "Level confusion: training vs decoding vs UI",
        attack:
          "We might be conflating the model’s latent uncertainty with decoding strategy and with UI choices (e.g., whether citations are required). The ‘mechanism’ may live outside the model weights.",
        evidence:
          "Same model can appear more/less hallucinatory under different decoding settings and user affordances.",
        current_status:
          "Add a level-split: separate weights/training, decoding, and interface policy; require tests that isolate each layer.",
      },
    ],
  },
};

export const CS_LLM_HALLUCINATION_EXAMPLE = {
  slug: "cs-llm-hallucination",
  title: "Computer Science: LLM Hallucination",
  domain: "computer_science",
  topic: "Why do LLMs produce confident falsehoods?",
  researchQuestion:
    "Why do LLMs sometimes output fluent but false claims, and which interventions reduce this without killing usefulness? We want hypotheses that separate objective/grounding limits from alignment incentives and from evaluation artifacts.",
  excerpt: [
    { anchor: "§161", note: "Mechanism-first: what causal machinery produces the behavior?" },
    { anchor: "§147", note: "Avoid level confusion: training vs decoding vs interface policy." },
    { anchor: "§89", note: "Prefer discriminative tests that can rule out causes." },
    {
      anchor: "§58",
      note: "Do the sums: quantify how much the metric changes under controlled interventions.",
    },
    {
      anchor: "domain",
      note: "Use empirical A/Bs: base vs RLHF, with and without RAG, under fixed prompts.",
    },
  ],
  artifact: CS_LLM_HALLUCINATION_ARTIFACT,
  operatorAnnotations: [
    {
      operator: "Level Split (Σ)",
      appliedIn: ["Adversarial Critique", "Predictions Table"],
      note: "Separates training/weights, decoding, and UI policy; tests are designed to isolate layers.",
    },
    {
      operator: "Exclusion Test (⊘)",
      appliedIn: ["Discriminative Tests"],
      note: "A/B reward shaping can decisively implicate (or exonerate) alignment incentives as a primary driver.",
    },
    {
      operator: "Object Transpose (⟳)",
      appliedIn: ["Discriminative Tests"],
      note: "Transpose from ‘open-ended chat’ to controlled benchmarks where prompts and rubrics can be perturbed cleanly.",
    },
    {
      operator: "Scale Check (⊙)",
      appliedIn: ["Assumption Ledger"],
      note: "Forces explicit operational definitions and measurement validity before ‘fixing’ anything.",
    },
  ],
  commentary: [
    "Hypotheses separate three levers: grounding/objective limits, incentive shaping, and evaluation artifacts.",
    "Tests are designed as A/B interventions where one factor changes and others are held constant.",
    "The critique insists on decomposition into failure modes, preventing a single vague ‘hallucination cause’ story.",
  ],
} satisfies TutorialDomainExample;
