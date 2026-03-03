Setting the research context before generating hypotheses.

```delta
{
  "operation": "ADD",
  "section": "research_thread",
  "target_id": null,
  "payload": {
    "context": "Brenner argues that a general biological question can in principle be solved in any system (§91), yet immediately constrains the choice to organisms with extreme properties — self-fertilizing hermaphrodite, isogenic, rapid life cycle, axenizable (§150). This tension between universality of questions and specificity of tractable systems is the core puzzle.",
    "why_it_matters": "Getting system choice right compresses multi-decade programs into tractable timelines (§152). Getting it wrong means years of non-discriminating experiments — the most expensive mistake in experimental biology.",
    "anchors": ["§91", "§150", "§152"]
  },
  "rationale": "Setting the research context before hypothesis generation"
}
```

Paradox target: systems differ, yet Brenner says a general question is solvable in any system; the missing rule may be about representation fit (⊘, ◊, ⊕).

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "H1: Primitive-Match Dominance",
    "claim": "The best experimental system is the one whose native manipulable primitives most directly implement the causal grammar of the question.",
    "mechanism": "Map question terms to machine-level operations (allele perturbation, cell lineage identity, circuit state readout, developmental time indexing); choose the organism where this mapping has the fewest latent translation steps and lowest unobserved state.",
    "anchors": ["§91", "§145", "§152", "§150"],
    "third_alternative": false
  },
  "rationale": "Uses ⊘ Level-Split to separate question specification from organism execution, ◊ Paradox-Hunt on 'any system' vs 'one best object', and ⊕ Cross-Domain analogy to instruction-set/ISA fit."
}
```

Cross-domain import: in manufacturing and computing, throughput and variance reduction often dominate theoretical elegance (⊕, ⊘).

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "H2: Throughput-Variance Dominance",
    "claim": "The best system is whichever maximizes perturbation-readout cycles per week while minimizing biological variance, because evidence rate outruns representational imperfections.",
    "mechanism": "Short generation time, low husbandry overhead, high replicate count, isogenic lines, and stable growth substrate increase statistical power and iteration speed, yielding faster discrimination among models.",
    "anchors": ["§150", "§91", "§168"],
    "third_alternative": false
  },
  "rationale": "Applies ⊕ from queueing/operations theory, ⊘ to separate epistemic quality from sociological justification burden, and ◊ to test whether speed can beat imperfect mechanism fit."
}
```

Third alternative: both could fail if the question is typed at the wrong level (⊘, ◊).

```delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "H3: Question-Typing Bottleneck",
    "claim": "Neither primitive-match nor throughput selects the right system when the biological question is not yet expressed in the machine language of the phenomenon.",
    "mechanism": "If hypotheses mix levels (gene labels, behavior adjectives, and mechanism claims in one sentence), experiments produce non-diagnostic data regardless of organism; retyping into executable primitives is the true rate-limiter.",
    "anchors": ["§145", "[inference]"],
    "third_alternative": true
  },
  "rationale": "Explicit ⊘ Level-Split and ◊ Paradox-Hunt: persistent field disputes can reflect type errors, not missing data; ⊕ imports type-checking failure from programming-language design."
}
```

Discriminator: hold cycle time roughly fixed and vary primitive alignment.

```delta
{
  "operation": "ADD",
  "section": "predictions_table",
  "target_id": null,
  "payload": {
    "condition": "Two systems with matched iteration speed but different primitive alignment to the target mechanism are compared on the same question.",
    "predictions": {
      "H1": "System with better primitive alignment yields clearer causal reconstruction and fewer auxiliary assumptions.",
      "H2": "Outcomes are similar because matched speed dominates; alignment differences are secondary.",
      "H3": "Both perform poorly if the question remains level-confused; diagnostics stay ambiguous."
    }
  },
  "rationale": "Holds speed constant to isolate representational fit, sharply separating H1 from H2 and checking H3 failure mode."
}
```

Discriminator: hold primitive scope fixed and vary cycle throughput.

```delta
{
  "operation": "ADD",
  "section": "predictions_table",
  "target_id": null,
  "payload": {
    "condition": "Within one organism, increase cycle throughput (automation, denser replication, faster husbandry) without changing measured primitives.",
    "predictions": {
      "H1": "Moderate gain, then plateau once key primitives are already observable.",
      "H2": "Large monotonic gain in evidence per week and earlier model discrimination.",
      "H3": "Minimal gain in discrimination if the hypothesis language is still mis-typed."
    }
  },
  "rationale": "Manipulates speed directly; expected response curves differ strongly across hypotheses."
}
```

Discriminator: up-front typing audit before any wet-lab work.

```delta
{
  "operation": "ADD",
  "section": "predictions_table",
  "target_id": null,
  "payload": {
    "condition": "Pre-register a machine-language completeness score for each project question before system selection, then track downstream decisiveness of results.",
    "predictions": {
      "H1": "Completeness helps mainly when paired with high primitive-match systems.",
      "H2": "Completeness weakly predicts outcomes; throughput metrics predict better.",
      "H3": "Completeness is the strongest predictor across systems and labs."
    }
  },
  "rationale": "Directly tests whether question typing is the hidden bottleneck versus system traits."
}
```

Critical assumption to make explicit before killing any model.

```delta
{
  "operation": "ADD",
  "section": "assumption_ledger",
  "target_id": null,
  "payload": {
    "name": "Cross-System Generality Assumption",
    "statement": "The biological question is general enough that causal structure transfers across candidate organisms.",
    "load": "If false, choosing by H1/H2 is invalid because organism-specific mechanisms dominate and external validity collapses.",
    "test": "Run a minimal cross-system perturbation panel on homologous modules and compare invariant causal signatures before full commitment.",
    "status": "unchecked"
  },
  "rationale": "This is the gating premise from Brenner's system-choice logic; if wrong, the whole search strategy misfires."
}
```
