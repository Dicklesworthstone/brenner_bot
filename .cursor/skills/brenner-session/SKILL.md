# Brenner Protocol Session

Run a structured Brenner Protocol research session within the Cursor IDE.

## When to Use

Activate when the user asks to:
- Run a Brenner session / research session
- Investigate a research question using the Brenner method
- Generate hypotheses with adversarial critique
- Design discriminative experiments

**Trigger keywords**: "brenner session", "research session", "brenner protocol", "discriminative test", "hypothesis slate"

## Tier 1: Interactive IDE Session (Single Model)

For quick exploration using the current Cursor model.

### Steps

1. **Read the methodology**: Read `specs/role_prompts_v0.1.md` to understand the three roles and the Triangulated Brenner Kernel.

2. **Identify the research question**: Ask the user for their question and any relevant corpus excerpt.

3. **Phase 1 — Hypothesis Generation**: Using the Hypothesis Generator role prompt, generate 2-3 hypotheses plus a third alternative. Output as delta blocks targeting `hypothesis_slate`.

4. **Phase 2 — Test Design**: Switch to the Test Designer role. For each hypothesis, design discriminative tests with potency checks. Output as delta blocks targeting `discriminative_tests`.

5. **Phase 3 — Adversarial Critique**: Switch to the Adversarial Critic role. Attack the framing, check scale constraints, quarantine anomalies. Output as delta blocks targeting `adversarial_critique`, `assumption_ledger`, and `anomaly_register`.

6. **Phase 4 — Compile**: Assemble all deltas into a 7-section artifact following `specs/artifact_schema_v0.1.md`.

### Output

Write the compiled artifact to `artifacts/{thread-id}/artifact.md`.

## Tier 2: Multi-Model Headless Session

For full Brenner Loop fidelity with three different models.

### Steps

1. **Get parameters**: Ask the user for:
   - Research question
   - Thread ID (suggest format: `RS-YYYYMMDD-topic`)
   - Corpus excerpt file path (optional)
   - Model preferences (optional — defaults are GPT for hypothesis, Claude for tests, Gemini for critic)

2. **Run the script**: Execute via Shell tool:

```bash
./scripts/cursor-brenner-session.sh \
  --thread-id <thread-id> \
  --question "<question>" \
  --excerpt-file <path> \
  --hyp-model gpt-5.3-codex \
  --test-model sonnet-4.6 \
  --critic-model gemini-3.1-pro
```

3. **Monitor**: The script runs 3 parallel agents (2-8 minutes total). Check progress by reading the terminal output.

4. **Review**: Read and present the compiled artifact from `artifacts/{thread-id}/artifact.md`.

## Reference

- Spec: `specs/cursor_cockpit_v0.1.md`
- Role prompts: `specs/role_prompts_v0.1.md`
- Delta format: `specs/delta_output_format_v0.1.md`
- Artifact schema: `specs/artifact_schema_v0.1.md`
- Operator library: `specs/operator_library_v0.1.md`
