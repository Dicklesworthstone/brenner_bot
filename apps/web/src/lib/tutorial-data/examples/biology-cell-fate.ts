import type { Artifact } from "@/lib/artifact-merge";
import type { TutorialDomainExample } from "./types";

const NOW = "2026-01-01T00:00:00Z";

export const BIOLOGY_CELL_FATE_ARTIFACT: Artifact = {
  metadata: {
    session_id: "EXAMPLE-BIOLOGY-CELL-FATE",
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
      statement: "How do embryonic cells determine their fate during development?",
      context:
        "In many embryos, initially similar cells differentiate into distinct fates (e.g., neural vs mesoderm). We want a mechanism-level account: what information is available to a cell, what circuitry reads it, and what interventions shift fate boundaries predictably.",
      why_it_matters:
        "If we can state a discriminative mechanism, we can design clean experiments (or choose a better system) that separates competing explanations instead of accumulating descriptive correlations.",
      anchors: ["§58", "§78", "§89", "§112", "§147", "§161"],
    },
    hypothesis_slate: [
      {
        id: "H1",
        name: "Morphogen-gradient thresholds (positional information)",
        claim:
          "Cell fate is determined by concentration thresholds of one or more morphogens; position in a gradient is converted into discrete transcriptional programs.",
        mechanism:
          "A diffusible signal forms a spatial gradient; cells integrate concentration over time; threshold-crossing triggers a fate-specific gene regulatory network.",
        anchors: ["§161", "§58"],
      },
      {
        id: "H2",
        name: "Timing / competence window (temporal code)",
        claim:
          "Cell fate is determined primarily by when signals arrive relative to a competence window; timing dominates over absolute morphogen concentration.",
        mechanism:
          "Cells progress through internal states; the same signal has different effects depending on developmental time; fate is a function of signal timing and duration.",
        anchors: ["§58", "§78"],
      },
      {
        id: "H3",
        name: "Local interaction attractors (third alternative)",
        claim:
          "Fate is an emergent property of local cell–cell interactions (e.g., lateral inhibition / community effects) rather than a global gradient or a global clock.",
        mechanism:
          "Neighbor coupling creates bistable/multistable attractors; small initial asymmetries are amplified; fate boundaries arise from interaction topology and noise.",
        anchors: ["inference", "§147"],
        third_alternative: true,
      },
    ],
    predictions_table: [
      {
        id: "P1",
        condition: "Vary morphogen concentration (same exposure duration)",
        predictions: {
          H1: "Fate boundaries shift smoothly with dose; clear threshold behavior across cells at similar times.",
          H2: "Limited effect unless dose changes also change effective timing/duration; timing manipulations dominate.",
          H3: "Dose alone produces weak/patchy effects unless it changes local interaction structure; neighbor effects dominate.",
        },
      },
      {
        id: "P2",
        condition: "Pulse vs duration: short high pulse vs long low signal (same integrated dose)",
        predictions: {
          H1: "Short high pulse can trigger fate if threshold is crossed; integrated dose less important than peak/threshold.",
          H2: "Longer duration matters; competence window + duration predict fate better than peak concentration.",
          H3: "Outcome depends on whether coupling dynamics cross an interaction bifurcation; timing may matter via network settling.",
        },
      },
      {
        id: "P3",
        condition: "Disrupt cell–cell contact signaling (e.g., Notch/Delta) during patterning",
        predictions: {
          H1: "Primary fate boundaries persist (may get noisier), because global gradient still provides positional info.",
          H2: "Primary fate boundaries persist if timing remains; local noise increases but timing logic remains.",
          H3: "Major breakdown of boundary sharpening; increased salt-and-pepper fate patterns or loss of stable domains.",
        },
      },
    ],
    discriminative_tests: [
      {
        id: "T1",
        name: "Peak vs duration test (pulse shaping)",
        procedure:
          "Use optogenetic or microfluidic control to deliver either (A) a short, high-amplitude pulse or (B) a long, low-amplitude exposure with matched integrated signal. Measure fate markers and boundary positions.",
        discriminates: "H1 vs H2",
        expected_outcomes: {
          H1: "Peak/threshold dominates: short high pulse triggers fate even when duration is minimal.",
          H2: "Duration/competence dominates: long exposure produces fate changes; short pulse has little effect.",
        },
        potency_check:
          "Verify the signal transduction pathway is activated in both conditions (reporter), and that delivery truly matches the intended pulse shapes.",
        feasibility: "medium",
        score: { likelihood_ratio: 4, cost: 2, speed: 2, ambiguity: 2 },
      },
      {
        id: "T2",
        name: "Object transpose: choose a cleaner system",
        procedure:
          "Transpose to a model system where spatial gradients and contact signaling can be manipulated cheaply (e.g., zebrafish embryo for imaging + perturbation, or C. elegans lineage for timing precision). Re-run T1 and a contact-disruption assay.",
        discriminates: "H1/H2 vs H3",
        expected_outcomes: {
          H1: "In the transposed system, controlled gradients still set fate boundaries predictably.",
          H2: "In the transposed system, timing manipulations dominate fate decisions even with constant gradients.",
          H3: "In the transposed system, altering interaction topology (neighbors/contact) dominates over gradient/timing.",
        },
        potency_check:
          "Confirm the transposed system retains the relevant fate decision and that the readouts are homologous (marker equivalence).",
        feasibility: "high",
        score: { likelihood_ratio: 3, cost: 2, speed: 3, ambiguity: 2 },
      },
    ],
    assumption_ledger: [
      {
        id: "A1",
        name: "Diffusion timescale is compatible with patterning (scale check)",
        statement:
          "If H1 is correct, morphogen diffusion and degradation can establish a gradient over the embryo length-scale within the patterning time window.",
        load: "Load-bearing for H1",
        test: "Back-of-envelope diffusion estimate vs observed timing; compare gradient formation time to fate decision time.",
        scale_check: true,
        calculation:
          "t ≈ L^2 / D. If L~100µm and D~10µm^2/s then t~1000s (~17 min). If patterning decision occurs much faster, H1 needs active transport or local production.",
        implication:
          "If gradient formation is too slow, a pure diffusion-threshold model is implausible without additional machinery.",
      },
      {
        id: "A2",
        name: "Markers accurately report fate specification",
        statement:
          "The measured markers represent fate specification rather than transient gene expression or stress responses.",
        load: "Load-bearing for all hypotheses",
        test: "Use multiple independent markers + lineage tracing; verify marker predicts final differentiated outcome.",
      },
      {
        id: "A3",
        name: "Perturbations are specific",
        statement:
          "Signal pathway perturbations primarily affect the intended variable (dose/timing/contact) without globally damaging the embryo or altering unrelated developmental processes.",
        load: "Load-bearing for discriminative tests",
        test: "Include viability/health controls; verify pathway specificity with reporters and rescue experiments.",
      },
    ],
    anomaly_register: [],
    adversarial_critique: [
      {
        id: "C1",
        name: "Are we conflating levels (program vs interpreter)?",
        attack:
          "We talk about gradients and clocks, but the real mechanism may be the gene regulatory network dynamics (the interpreter) which can implement both spatial and temporal codes. The stated hypotheses may be different descriptions of the same underlying circuit.",
        evidence:
          "Many GRNs can convert either spatial or temporal inputs into the same fate outcomes; different assays emphasize different input channels.",
        current_status:
          "Add a level-split: separate ‘input code’ (spatial/temporal/local) from ‘decision circuit’ (GRN attractors). Update predictions accordingly.",
        real_third_alternative: true,
        proposed_alternative:
          "Reframe the third alternative as: the GRN has intrinsic multistability and reads multiple weak inputs; ‘gradient’ vs ‘clock’ is a measurement artifact.",
      },
      {
        id: "C2",
        name: "Are we asking the right question?",
        attack:
          "‘Fate determination’ may not be a single decision event; specification can be reversible and context-dependent. Treating it as a discrete switch may mislead the whole analysis.",
        evidence:
          "In many embryos, lineage commitment stabilizes gradually; early marker expression can be plastic.",
        current_status:
          "Clarify the decision point: define the operational criterion for ‘fate determined’ (irreversibility under perturbation).",
      },
    ],
  },
};

export const BIOLOGY_CELL_FATE_EXAMPLE = {
  slug: "biology-cell-fate",
  title: "Biology: Cell Fate During Development",
  domain: "biology",
  topic: "How do embryonic cells determine their fate?",
  researchQuestion:
    "How do initially similar embryonic cells arrive at stable, distinct fates (e.g., neural vs mesoderm)? We want a mechanism that yields discriminative predictions under interventions (dose, timing, contact), not just a story that fits existing gradients or marker patterns.",
  excerpt: [
    { anchor: "§58", note: "Do the sums / scale checks before you commit to an experiment." },
    { anchor: "§78", note: "Choose the right problem framing; define the decision point." },
    { anchor: "§89", note: "Exclusion: prioritize tests that can rule out hypotheses." },
    {
      anchor: "§112",
      note: "Object transpose: pick a cleaner system where the question is cheaper.",
    },
    { anchor: "§147", note: "Level split: avoid confusing levels of explanation." },
    { anchor: "§161", note: "Mechanism over correlation; specify the causal machinery." },
  ],
  artifact: BIOLOGY_CELL_FATE_ARTIFACT,
  operatorAnnotations: [
    {
      operator: "Level Split (Σ)",
      appliedIn: ["Adversarial Critique", "Hypothesis Slate"],
      note: "Separates input code (gradient/timing/local) from the decision circuit (GRN attractors).",
    },
    {
      operator: "Exclusion Test (⊘)",
      appliedIn: ["Discriminative Tests", "Predictions Table"],
      note: "Pulse-shaping test is designed to decisively separate peak-threshold vs duration/competence.",
    },
    {
      operator: "Scale Check (⊙)",
      appliedIn: ["Assumption Ledger"],
      note: "Diffusion timescale back-of-envelope guards against an implausible gradient story.",
    },
    {
      operator: "Object Transpose (⟳)",
      appliedIn: ["Discriminative Tests"],
      note: "Switch to a model system where interventions are cleaner and cheaper.",
    },
  ],
  commentary: [
    "The hypotheses are genuinely different: global spatial code, global temporal code, and emergent local coupling.",
    "Predictions are phrased as contrasts: each condition is chosen to make at least one hypothesis stick its neck out.",
    "The first test is a discriminative ‘peak vs duration’ intervention, not a confirmatory measurement.",
    "Scale assumptions are explicit: if gradient formation can’t happen on time, the story must change.",
  ],
} satisfies TutorialDomainExample;
