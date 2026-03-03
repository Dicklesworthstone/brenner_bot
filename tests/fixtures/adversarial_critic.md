The framing assumes that because a problem is "general," it can be solved in any system, and that structural mapping (cell lineage/connectome) is sufficient to explain the "machine" of behavior. We must attack these assumptions, check the physical limits of the proposed mapping, and quarantine the contradictions in the universality claim.

```delta
{
  "operation": "ADD",
  "section": "adversarial_critique",
  "target_id": null,
  "payload": {
    "name": "The Organism Defines the Problem",
    "attack": "Brenner claims a general problem can be solved in 'any biological system' (§91). This assumes biology uses universal machines. However, evolutionary drift and physical scale differences mean the 'solution' found in a 1mm nematode (e.g., deterministic cell lineage) may be entirely absent in a 1m mammal (which relies on stochastic development and pruning).",
    "evidence": "Demonstrate that a fundamental mechanism discovered in C. elegans fails to map onto vertebrate orthologs due to systemic architectural differences.",
    "current_status": "Active threat to generalization",
    "real_third_alternative": true
  },
  "rationale": "⊕ Cross-Domain: Proposes that model organisms don't just solve general problems, they constrain what problems exist. † Theory-Kill for the 'universal biology' assumption."
}
```

```delta
{
  "operation": "ADD",
  "section": "adversarial_critique",
  "target_id": null,
  "payload": {
    "name": "Structure is not Function",
    "attack": "The project assumes finding 'the position of every cell and its origin' (§152) will show 'what is the machine... that generates intelligence' (§145). But a static wiring diagram (connectome) lacks the dynamic state (synaptic weights, neuromodulator gradients) required to actually compute behavior.",
    "evidence": "A complete connectome is achieved, but the organism's behavior cannot be simulated or predicted without adding unmeasured dynamic parameters [inference].",
    "current_status": "Active critique of structural determinism",
    "real_third_alternative": false
  },
  "rationale": "† Theory-Kill: Attacks the sufficiency of structural mapping to explain functional intelligence."
}
```

```delta
{
  "operation": "ADD",
  "section": "adversarial_critique",
  "target_id": null,
  "payload": {
    "name": "Survivorship Bias in Model Selection",
    "attack": "The entire framework evaluates which organism to choose, but only considers organisms that were already successful research models. Failed model organisms — systems that were tried and abandoned — are invisible. This selection bias means the framework's 'criteria' are post-hoc rationalizations of what worked, not predictive principles.",
    "evidence": "Identify organisms that met all stated criteria (small, short generation, genetically tractable) yet failed to yield transformative insights. If such cases exist, the criteria are necessary but not sufficient.",
    "current_status": "Undermines the prescriptive value of any selection framework",
    "real_third_alternative": false
  },
  "rationale": "† Theory-Kill: The recommendation framework itself may be unfalsifiable if built only from successful examples."
}
```

```delta
{
  "operation": "ADD",
  "section": "assumption_ledger",
  "target_id": null,
  "payload": {
    "name": "Scale check: EM Reconstruction Feasibility",
    "statement": "The chosen organism must be physically small enough to permit complete cellular and synaptic mapping via serial section electron microscopy.",
    "calculation": "C. elegans length ≈ 1mm (1000 μm). EM section thickness ≈ 50 nm (0.05 μm). Total sections required = 1000 / 0.05 = 20,000 sections. At ~1 section/day of manual tracing, this is O(10^4) days of human labor. This is at the absolute limit of tractability for a small team over a decade.",
    "load": "Rules out any organism larger than ~1mm for complete connectomic/lineage mapping with 1970s technology.",
    "test": "Calculate sectioning and tracing time for proposed model organisms before selection.",
    "status": "verified",
    "scale_check": true
  },
  "rationale": "Physical plausibility verification via ⊞ Scale-Check. The choice of C. elegans was strictly imprisoned by the physical limits of EM sectioning."
}
```

```delta
{
  "operation": "ADD",
  "section": "anomaly_register",
  "target_id": null,
  "payload": {
    "name": "The Universality Paradox",
    "observation": "Brenner asserts that a general question can be solved in 'any biological system' (§91), yet immediately details extreme, rare constraints required to actually do the work (self-fertilizing hermaphrodite, completely isogenic, rapid life, axenizable - §150).",
    "conflicts_with": ["The assumption that biological problems are system-independent (Universality)"],
    "status": "active",
    "resolution_plan": "Quarantine the 'universality' claim as rhetorical. Acknowledge that while the *question* may be general, the *tractability* of the answer is hyper-specific to the organism's unique physical and genetic properties."
  },
  "rationale": "ΔE Exception-Quarantine: Isolates the contradiction between the philosophical claim of universality and the pragmatic reality of extreme model-organism specificity."
}
```

```delta
{
  "operation": "ADD",
  "section": "anomaly_register",
  "target_id": null,
  "payload": {
    "name": "The Zebrafish Counter-Example",
    "observation": "Zebrafish (Danio rerio) violates the strict 'small body, complete mapping' criterion yet became one of the most successful model organisms for developmental biology. Its success was driven by optical transparency and forward genetics, not by connectomic tractability.",
    "conflicts_with": ["H1", "H2"],
    "status": "active",
    "resolution_plan": "Evaluate whether H2 (digital vs analog handles) better explains zebrafish's success than H1 (tractability), suggesting the weighting of criteria may be question-dependent."
  },
  "rationale": "ΔE Exception-Quarantine: A well-known model organism that succeeded without fitting the 'small-organism-for-complete-mapping' mold."
}
```
