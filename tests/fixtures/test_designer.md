## Brenner Protocol — Test Designer Output

**Research Question:** How should a researcher choose the right experimental system for a new biological question?

**Competing hypotheses:**

- **H1 (System-Fitness):** Experimental system choice is the primary determinant of scientific productivity — the right organism makes the decisive test cheap and unambiguous (§91, §150)
- **H2 (Question-Primacy):** The question drives productivity; any adequately equipped system will yield equivalent results if the question is sharp enough
- **H3 (Third Alternative):** Both framings are wrong — the bottleneck is the operator's ability to generate discriminative tests, not the system or the question in isolation [inference]

---

**Test 1 — Highest EPW**

⊞ Scale-Check first: Brenner's C. elegans choice compressed a 25-year program (§152) into tractable biology. The isogenic + self-fertilizing hermaphrodite trait reduces genetic noise by ~10⁴ compared to outbreeding populations (§150). That's a real order-of-magnitude constraint, not a cartoon.

```delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": {
    "name": "Cross-System Replication Race",
    "procedure": "1. Identify one well-posed, general biological question (e.g., 'how does cell lineage determine fate?'). 2. Assign matched teams of equal skill to attack it in: (a) C. elegans, (b) Drosophila, (c) mouse embryo. 3. Hold question, resources, and time constant (~2 years). 4. Measure: time-to-first-decisive-result, number of ambiguous dead-ends, total cost per unit of resolved uncertainty (bits).",
    "discriminates": "H1 (system fitness determines productivity) vs H2 (question sharpness is sufficient in any system)",
    "expected_outcomes": {
      "H1": "C. elegans team reaches digital, unambiguous answer significantly faster and cheaper; mouse team produces more confounded, partial results per dollar",
      "H2": "All three teams converge on equivalent results within the same order-of-magnitude timeframe; system choice shifts cost but not epistemic yield"
    },
    "potency_check": "Include a fourth team given a POORLY posed question in C. elegans. If H1 is correct, system advantage disappears when question is bad — this confirms the assay can detect system effects. Positive control: replicate Brenner's own lineage-tracing result (§152) as a known-outcome benchmark.",
    "feasibility": "Requires coordinated multi-lab setup; ~$500K total. Historical data partially available (compare published timelines for cross-organism programs). Retrospective bibliometric proxy feasible in <1 month at near-zero cost.",
    "score": {
      "likelihood_ratio": 3,
      "cost": 1,
      "speed": 2,
      "ambiguity": 2
    }
  },
  "rationale": "Operators: ✂ Exclusion-Test (teams in different systems produce forbidden patterns for one hypothesis), ⟂ Object-Transpose (system is the variable, not a constraint), ⌂ Materialize (converts 'system choice matters' into a measurable bits-per-dollar readout), 🎭 Chastity-vs-Impotence (fourth team with bad question distinguishes system effect from question effect). §91 explicitly frames system as a design variable; this test operationalizes that claim. Retrospective proxy gets score to 8/12 in <1 month."
}
```

---

**Test 2 — Fast, Cheap, Digital**

⟂ Object-Transpose applied: instead of running new experiments, transpose to the historical record. Published biology papers ARE the experimental objects here.

```delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": {
    "name": "Retrospective System-Switch Natural Experiment",
    "procedure": "1. Identify 20+ biological questions that were first attacked in one organism then later re-attacked in C. elegans (or vice versa). 2. Measure: (a) time from question formulation to first mechanistic answer, (b) number of papers to resolution, (c) whether resolution was 'digital' (yes/no/counted cells) or 'analog' (quantitative gradients, statistical). 3. Code system-fitness score for each organism using Brenner's own criteria: isogenicity, generation time, cell count, transparency, axenic culture (§150). 4. Regress resolution speed and ambiguity against system-fitness score.",
    "discriminates": "H1 vs H2 vs H3",
    "expected_outcomes": {
      "H1": "High system-fitness score predicts faster, more digital resolution; regression slope significantly positive; questions moved TO C. elegans resolve faster than questions staying in mouse",
      "H2": "System-fitness score is uncorrelated with resolution speed after controlling for question clarity; question-sharpness proxy (operationalized as citation network convergence) dominates",
      "H3": "Neither system-fitness nor question-sharpness alone predicts outcome; interaction term (system × question match) is the dominant predictor — supporting H3's framing mismatch claim"
    },
    "potency_check": "Include known-outcome cases: C. elegans cell lineage (§152, resolved digitally in ~25 years as predicted), vs. mouse behavior genetics (§145, Brenner explicitly says this field is stuck). These serve as positive/negative controls for the coding scheme.",
    "feasibility": "Bibliometric data freely available (PubMed, Semantic Scholar). Two researchers, ~3 weeks coding, ~$5K. No animal work. Digital readout: regression coefficient and p-value.",
    "score": {
      "likelihood_ratio": 2,
      "cost": 3,
      "speed": 3,
      "ambiguity": 2
    }
  },
  "rationale": "Operators: ⟂ Object-Transpose (historical literature IS the experimental object — §91's insight is itself testable in the record it generated), ✂ Exclusion-Test (H1 and H2 produce forbidden regression patterns), ⌂ Materialize (Brenner's system-choice criteria from §150 become a scorable rubric), 🎭 Chastity-vs-Impotence (known-outcome anchors confirm the coding scheme can detect the effect). Highest EPW: near-zero cost, <1 month, partially digital readout. Score: 10/12."
}
```

---

**Assumption — Scale/Physics Check**

```delta
{
  "operation": "ADD",
  "section": "assumption_ledger",
  "target_id": null,
  "payload": {
    "name": "Isogenicity compression assumption",
    "statement": "We assume that reducing genetic background variance (via self-fertilizing hermaphroditism, §150) produces a multiplicative, not additive, reduction in required sample size — i.e., system choice changes the ORDER OF MAGNITUDE of experimental cost, not just a scalar factor.",
    "load": "If the reduction is merely additive (e.g., 2-3x), then H2 is more defensible — question sharpness could compensate, and system choice is a secondary optimization. If multiplicative (10²–10⁴x), H1 is dominant and system choice is the primary lever.",
    "test": "Calculate: (1) variance components in outbreeding vs. isogenic populations for a canonical quantitative trait (e.g., lifespan). (2) Derive required N for 80% power to detect a 10% effect size in each. (3) Compare to Brenner's actual experiment sizes in C. elegans papers vs. equivalent mouse studies.",
    "status": "unchecked",
    "scale_check": true,
    "calculation": "Rough estimate: outbreeding mouse population — heritability ~0.3, environmental variance dominates, typical N~100-500 per condition. C. elegans isogenic: genetic variance ~0 by design, N~20-50 per condition. Ratio: ~10x on N directly. But cost scales super-linearly with mouse (housing, time-to-breed ~3 months vs. 3 days): total cost ratio ~10 × 30 (time) × 3 (housing) ≈ 900x. This is a genuine order-of-magnitude effect (§⊞), supporting H1's multiplicative claim. [inference: exact multipliers need empirical confirmation]"
  },
  "rationale": "⊞ Scale-Check applied to §150's isogenicity claim. Brenner's choice criteria are not aesthetic — they compress experimental cost by ~10²–10³x. If this calculation fails (ratio <10x total), the theoretical basis for H1 weakens substantially and H2 becomes more competitive. Must be checked before investing in the full Cross-System Race (Test 1)."
}
```

---

**Prediction — discriminates H1 vs H3**

```delta
{
  "operation": "ADD",
  "section": "predictions_table",
  "target_id": null,
  "payload": {
    "condition": "A well-posed question is introduced into a high-fitness system (C. elegans) by a researcher with NO prior training in Brenner-style discriminative test design",
    "predictions": {
      "H1": "Productivity advantage persists — system properties (isogenicity, transparency, cell count) carry the researcher even without operator skill. Resolution time ~same as trained researcher in same system.",
      "H3": "Productivity advantage collapses — system fitness is necessary but not sufficient. The trained operator in a lower-fitness system (mouse) outperforms the untrained operator in C. elegans, because the bottleneck is test-design skill, not system properties. §145's complaint about behavioral genetics is explicable: good system (invertebrates exist), bad operators."
    }
  },
  "rationale": "⊕ Cross-Domain: maps onto software engineering's 'right tool vs. right programmer' debate. H1 and H3 produce opposite orderings in this 2×2 (system fitness × operator skill). Digital readout: time-to-resolution in each cell. Directly tests §145's implicit claim that the field was stuck due to bad framing, not bad organisms."
}
```
