# Brenner Protocol: Cursor Cockpit v0.1

> **Status**: Draft specification
> **Purpose**: Alternative cockpit runtime using Cursor CLI for multi-model Brenner sessions
> **Depends on**: `role_prompts_v0.1.md`, `delta_output_format_v0.1.md`, `artifact_schema_v0.1.md`
> **Replaces**: Nothing — this is an alternative to the ntm cockpit, not a replacement

---

## Overview

The Cursor Cockpit runs full Brenner Protocol sessions using the Cursor CLI (`agent` command) in headless mode. It provides two tiers of operation:

- **Tier 1 (Interactive)**: Single-model Brenner sessions within the Cursor IDE, using subagent delegation
- **Tier 2 (Multi-Model Headless)**: Three parallel `agent -p` processes, each running a different model with a role-specific prompt — a 1:1 replacement for the ntm cockpit

### Why This Exists

The ntm cockpit requires 6 tools and 3 separate subscriptions (Claude Max, GPT Pro, Gemini Ultra). The Cursor cockpit requires only the Cursor CLI and a Cursor subscription, which provides access to all three model families through a single `--model` flag.

---

## Preconditions

### Cursor CLI installed

```bash
agent --version     # Should print version
agent models        # Should list available models
```

### Required models available

The script defaults to these models (configurable):

| Role | Default Model | Flag |
|------|---------------|------|
| Hypothesis Generator | `gpt-5.3-codex` | `--hyp-model` |
| Test Designer | `sonnet-4.6` | `--test-model` |
| Adversarial Critic | `gemini-3.1-pro` | `--critic-model` |

Verify with `agent models`. Any model from the list works — the defaults are chosen to match the original ntm cockpit's model diversity.

### jq installed

The compilation step requires `jq` for JSON processing:

```bash
jq --version   # Should print version
```

---

## Tier 2: Multi-Model Headless CLI

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 cursor-brenner-session.sh                 │
│                                                          │
│  1. Parse --question, --excerpt-file, --thread-id        │
│  2. Compose prompts from templates (awk substitution)    │
│  3. Launch 3 parallel agent -p processes:                │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ gpt-5.3-codex│ │  sonnet-4.6  │ │gemini-3.1-pro│     │
│  │   Hypothesis │ │ Test Designer│ │  Adversarial  │     │
│  │  Generator   │ │              │ │    Critic     │     │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘     │
│         │                │                │              │
│  4. Wait for all 3                                       │
│  5. Extract delta blocks (awk)                           │
│  6. Validate JSON (jq)                                   │
│  7. Compile 7-section artifact                           │
└──────────────────────────────────────────────────────────┘
```

### Usage

```bash
./scripts/cursor-brenner-session.sh \
  --thread-id RS-20260303-organism-choice \
  --question "How should a researcher choose the right experimental system?" \
  --excerpt-file /path/to/excerpt.md \
  --hyp-model gpt-5.3-codex \
  --test-model sonnet-4.6 \
  --critic-model gemini-3.1-pro
```

### Arguments

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--thread-id` | Yes | — | Session identifier (e.g., `RS-20260303-topic`) |
| `--question` | Yes | — | The research question |
| `--excerpt-file` | No | — | Path to a corpus excerpt file |
| `--hyp-model` | No | `gpt-5.3-codex` | Model for Hypothesis Generator |
| `--test-model` | No | `sonnet-4.6` | Model for Test Designer |
| `--critic-model` | No | `gemini-3.1-pro` | Model for Adversarial Critic |
| `--workspace` | No | Repo root | Workspace directory for agents |
| `--compile-only` | No | — | Path to directory with pre-recorded delta `.md` files (skip agent invocation, compile only) |

### Output Structure

```
artifacts/{thread-id}/
├── deltas/
│   ├── hypothesis_generator.md    # Raw agent output
│   ├── hypothesis_generator.err   # Stderr (errors only)
│   ├── test_designer.md
│   ├── test_designer.err
│   ├── adversarial_critic.md
│   └── adversarial_critic.err
└── artifact.md                    # Compiled 7-section Brenner artifact
```

### How It Works

1. **Prompt composition**: The script reads templates from `scripts/prompts/`, replacing `{{KERNEL}}`, `{{QUESTION}}`, and `{{EXCERPT}}` placeholders using `awk` (safe for multiline content and special characters). The Brenner Kernel is maintained in a single `_kernel.md` file shared by all three role templates.

2. **Prompt delivery via stdin**: Composed prompts are fed to `agent -p` via input redirection (`agent -p --model X < prompt.md`), avoiding shell escaping issues with command-line arguments.

3. **No `--force` flag**: Agents produce text-only output (deltas) and do not modify workspace files. Only `--trust` is used (required for headless workspace trust).

4. **Parallel execution**: All 3 agents run as background processes (`&`). The script waits for all 3 with `wait`. This matches the ntm cockpit design where all agents respond to the initial kickoff independently.

5. **Delta extraction**: `awk` extracts content between `` ```delta `` and `` ``` `` markers. Each block is validated as JSON with `jq`.

6. **Artifact compilation**: Valid deltas are grouped by section, auto-assigned IDs (H1, H2, T1, T2...), and rendered into the 7-section markdown format per `artifact_schema_v0.1.md`.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Stdin for prompts | Avoids shell escaping and argument length limits |
| No `--force` | Agents should output deltas, not modify files |
| `--trust` only | Required for headless workspace trust |
| Parallel execution | Matches ntm cockpit; agents work independently in round 1 |
| awk + jq compilation | Lightweight, no additional dependencies |

---

## Tier 1: Interactive IDE Mode

For users who want the simplest path. Open the brenner_bot workspace in Cursor IDE and use the Brenner session skill.

### Setup

1. Open `brenner_bot/` in Cursor
2. The `.cursor/rules/brenner-method.mdc` rule auto-activates on research keywords
3. Ask: "Run a Brenner session on [topic]" — the skill orchestrates subagent delegation

### Limitations

- Single model (whatever model is selected in Cursor)
- No true multi-model triangulation
- Suitable for quick exploration, not full Brenner Loop fidelity

---

## Comparison: ntm Cockpit vs Cursor Cockpit

| Dimension | ntm Cockpit | Cursor Tier 1 | Cursor Tier 2 |
|-----------|-------------|---------------|---------------|
| Tools required | ntm + Agent Mail + claude CLI + codex CLI + gemini CLI + brenner CLI | Cursor IDE only | Cursor CLI only |
| Subscriptions | Claude Max + GPT Pro + Gemini Ultra (3) | Cursor (1) | Cursor (1) |
| Multi-model | Yes (3 CLIs) | No (single model) | Yes (`--model` flag) |
| Parallel agents | Yes (ntm panes) | No (sequential subagents) | Yes (background processes) |
| Live terminal view | Yes (tmux) | Yes (IDE chat) | No (file output) |
| Agent Mail integration | Native | Optional (via MCP) | Optional (future) |
| Durable coordination | Agent Mail threads | Workspace files | Workspace files |
| Compilation | `brenner session compile` | Manual/AI-assisted | In-script (awk + jq) |
| Setup time | ~30 min | ~2 min | ~5 min |

### What's Preserved

- True multi-model triangulation (GPT, Claude, Gemini)
- Parallel agent execution
- Structured delta output and compilation
- Role-specific prompts from the same spec
- Configurable role-to-model mapping
- All 7 artifact sections

### What's Different

- File-based coordination instead of Agent Mail (simpler but no durable threads)
- No live tmux visual (outputs captured to files)
- Compilation is in-script rather than via `brenner session compile`
- Single orchestration script replaces multi-tool cockpit

### Quality Tooling Included

- **Artifact linter** (`scripts/lint-artifact.sh`): Shell-based implementation of machine-checkable rules from `artifact_linter_spec_v0.1.md`. Validates metadata, section structure, field presence, minimums, and scale check requirements.
- **Fixture-based compilation test** (`tests/test-compile-fixture.sh`): CI-runnable test using pre-recorded delta outputs in `tests/fixtures/`. Validates the full compilation pipeline — including `research_thread` delta parsing, hypothesis compilation, and linter compliance — without invoking agents.

---

## Prompt Templates

Located in `scripts/prompts/`:

| Template | Role | Primary Operators |
|----------|------|-------------------|
| `hypothesis_generator.md` | Generate hypotheses, hunt paradoxes | ⊘ Level-Split, ⊕ Cross-Domain, ◊ Paradox-Hunt |
| `test_designer.md` | Design discriminative tests | ✂ Exclusion-Test, ⌂ Materialize, ⟂ Object-Transpose |
| `adversarial_critic.md` | Attack framing, check scale | ⊞ Scale-Check, ΔE Exception-Quarantine, † Theory-Kill |

Each template includes:
1. A `{{KERNEL}}` placeholder that expands to the shared Brenner Kernel from `_kernel.md` (axioms, objective function, operator algebra — maintained in a single file)
2. Role-specific system prompt and operators
3. Delta output format with examples
4. `{{QUESTION}}` and `{{EXCERPT}}` placeholders (substituted at runtime by `compose_prompt()`)
5. Formatting rules and pre-submission checklist

| Shared file | Purpose |
|-------------|---------|
| `_kernel.md` | Brenner Kernel (axioms, objective, operators) — single source of truth for all roles |

---

## Tested Results

> **Note**: Thread IDs below (e.g., `RS-20260303-organism-choice`) are from development testing sessions, not production artifacts. The `RS-YYYYMMDD-slug` convention is recommended but not enforced by the script.

### Test A: Simple question (no excerpt)

- **Question**: "Why do some programming languages succeed while others fail?"
- **Duration**: 141s (3 agents in parallel)
- **Deltas**: 16 valid (0 invalid)
- **Sections**: hypothesis_slate: 3, predictions_table: 4, discriminative_tests: 3, assumption_ledger: 3, anomaly_register: 1, adversarial_critique: 2

### Test B: Brenner question with transcript excerpt

- **Question**: "How should a researcher choose the right experimental system for a new biological question?"
- **Excerpt**: §91, §145, §150, §152, §168 from `complete_brenner_transcript.md`
- **Duration**: 435s (3 agents in parallel)
- **Deltas**: 15 valid (0 invalid)
- **Sections**: hypothesis_slate: 3, predictions_table: 4, discriminative_tests: 2, assumption_ledger: 3, anomaly_register: 1, adversarial_critique: 2
- **Quality**: Transcript anchors correctly cited, scale checks include actual calculations, genuine third alternatives produced

### Test C: Golden example question (head-to-head comparison)

- **Question**: "How does the C. elegans embryo determine cell fate -- through lineage-based computation or gradient-based spatial computation?"
- **Excerpt**: §103, §150, §155, §161, §162 from `complete_brenner_transcript.md`
- **Models**: opus-4.6 (HYP), gpt-5.2 (TEST), gemini-3.1-pro (CRIT) — *non-default models chosen specifically for this comparison; the script defaults are `gpt-5.3-codex`, `sonnet-4.6`, `gemini-3.1-pro`*
- **Duration**: 109s (3 agents, staggered 2s)
- **Deltas**: 16 valid (0 invalid)
- **Sections**: hypothesis_slate: 3, predictions_table: 4, discriminative_tests: 2, assumption_ledger: 3, anomaly_register: 1, adversarial_critique: 2
- **Linter**: VALID under original thresholds (2 critiques); INVALID under v0.1.2+ thresholds (requires 3 critiques — see Artifact Linter Results)
- **Quality highlights**:
  - Research Thread has substantive context and "Why it matters" (not generic placeholder)
  - Anchors: §103, §150, §155, §161, §162 correctly cited throughout
  - H3 (Lineage-Coupled Spatial Computation) is a genuine third alternative that dissolves the dichotomy
  - Scale checks include quantitative diffusion calculations (D ≈ 10 μm²/s, τ ≈ 125s-250s)
  - Tests propose concrete experimental protocols (blastomere swap, determinant equalization)
  - Potency checks reference positive controls and sham conditions
  - Adversarial critiques propose mechanical forces as alternative (genuinely orthogonal)

#### Head-to-Head: Cursor Cockpit vs Golden Example

| Feature | Golden Example | Cursor Cockpit (Test C) |
|---------|---------------|------------------------|
| Hypotheses | 4 (H1-H4) | 3 (H1-H3) |
| Third alternative quality | Excellent (epigenetic microcode, hybrid) | Good (lineage-coupled spatial) |
| Predictions | 5 rows | 4 rows |
| Tests | 4 (with 4-dim scoring) | 2 (with 4-dim scoring) |
| Assumptions | 6 (2 scale checks) | 3 (2 scale checks) |
| Scale check rigor | High (EM section math, diffusion) | High (diffusion calc, D ≈ 10 μm²/s) |
| Anomalies | 3 quarantined | 1 (monitoring) |
| Critiques | 4 (with real third alt) | 2 (with real third alt) |
| Citation accuracy | §150, §155, §161, §162 | §103, §150, §155, §161, §162 |
| Rounds | Multi-round (human-in-loop) | Single automated pass |
| Duration | Multiple hours (manual) | 109 seconds |

The golden example is richer in volume (produced over multiple human-guided rounds). The Cursor Cockpit artifact meets all minimum thresholds and demonstrates comparable quality-per-delta in a single automated 109-second pass.

---

## Artifact Linter Results

Validated using `scripts/lint-artifact.sh` (implements machine-checkable rules from `specs/artifact_linter_spec_v0.1.md`).

### Linter thresholds (v0.1.2)

The linter now enforces >= 3 adversarial critiques (raised from 2) and warns on empty anomaly registers. Tests A, B, and C artifacts below were generated before this threshold was raised; future sessions using the updated adversarial critic prompt (which demands >= 3 critiques and >= 2 anomalies) should meet the higher bar.

### Test A artifact (`RS-20260303-programming-languages`)

```
Status: INVALID (1 error — critique count below new minimum)
Section counts:
  Hypotheses: 3 | Predictions: 4 | Tests: 3
  Assumptions: 3 | Anomalies: 1 | Critiques: 2
```

### Test B artifact (`RS-20260303-organism-choice`)

```
Status: INVALID (1 error — critique count below new minimum)
Section counts:
  Hypotheses: 3 | Predictions: 4 | Tests: 2
  Assumptions: 3 | Anomalies: 1 | Critiques: 2
```

### Test C artifact (`RS-20260303-cell-fate`)

```
Status: INVALID (1 error — critique count below new minimum)
Section counts:
  Hypotheses: 3 | Predictions: 4 | Tests: 2
  Assumptions: 3 | Anomalies: 1 | Critiques: 2
```

### Golden example comparison (`golden-example-cell-fate.md`)

```
Status: VALID (0 errors, 1 warning, 1 info)
Section counts:
  Hypotheses: 4 | Predictions: 5 | Tests: 4
  Assumptions: 6 | Anomalies: 3 | Critiques: 4
```

### Fixture test (pre-recorded deltas, with research_thread, 3 critiques + 2 anomalies)

```
Status: VALID (0 errors, 0 warnings, 0 info)
Section counts:
  Hypotheses: 3 | Predictions: 4 | Tests: 2
  Assumptions: 3 | Anomalies: 2 | Critiques: 3
```

| Metric | Golden Example | Fixture Test | Min Required |
|--------|---------------|-------------|-------------|
| Hypotheses | 4 | 3 | 3 |
| Predictions | 5 | 4 | 3 |
| Tests | 4 | 2 | 2 |
| Assumptions | 6 | 3 | 3 |
| Anomalies | 3 | 2 | 0 (warn if 0) |
| Critiques | 4 | 3 | 3 |
| Scale checks | 2 | 1 | 1 |
| Third alternative | Yes | Yes | Yes |

The golden example meets all thresholds. The fixture test meets all thresholds with the updated adversarial critic deltas. Tests A/B/C (generated before prompt strengthening) fall short on critique count — this demonstrates the prompt improvement was necessary.

---

## Evaluation Scorecard (Test B: Organism Choice)

Scored against `specs/evaluation_rubric_v0.1.md` criteria.

**Calibration note**: Scores below are self-assessed and should be treated as estimates. An independent scorer would likely be stricter, particularly on criteria 3 (Rationale Quality) and 9 (Object Transposition), where operator naming and formal reasoning could be stronger. We score conservatively where possible.

### Hypothesis Generator (gpt-5.3-codex)

| Criterion | Score | Max | Notes |
|-----------|-------|-----|-------|
| 1. Structural Correctness | 3 | 3 | Valid delta format, all fields present |
| 2. Citation Compliance | 2 | 3 | §91, §145, §150, §152, §168 cited; but not all claims grounded to specific sections |
| 3. Rationale Quality | 2 | 3 | Names operators (⊘, ⊕, ◊) but rationale text could be more precise about why each applies |
| 4. Level Separation | 2 | 3 | Clean separation but "causal grammar" framing blurs levels somewhat |
| 5. Third Alternative | 3 | 3 | H3 (Question-Typing Bottleneck) is genuinely orthogonal |
| 6. Paradox Exploitation | 2 | 2 | "Any system" vs. extreme constraints paradox motivates H3 |
| **Weighted Total** | | | **3 + 2 + 1 + 3 + 6 + 1 = 16/19 (84%)** |

### Test Designer (sonnet-4.6)

| Criterion | Score | Max | Notes |
|-----------|-------|-----|-------|
| 1. Structural Correctness | 3 | 3 | Valid delta format |
| 2. Citation Compliance | 2 | 3 | Citations present but synthesis not always explicit |
| 3. Rationale Quality | 1 | 3 | Clear reasoning but rarely names operators in rationale text |
| 7. Discriminative Power | 3 | 3 | T1 gives digitally different predictions per hypothesis |
| 8. Potency Check | 2 | 3 | Both tests have controls but could be more explicit about sham conditions |
| 9. Object Transposition | 1 | 2 | Cross-system mentioned but not formally reasoned via ⟂ |
| 10. Score Calibration | 2 | 2 | Honest scores (T1: 10/12, T2: 8/12) |
| **Weighted Total** | | | **3 + 2 + 0.5 + 6 + 4 + 0.5 + 1 = 17/21.5 (79%)** |

### Adversarial Critic (gemini-3.1-pro)

| Criterion | Score | Max | Notes |
|-----------|-------|-----|-------|
| 1. Structural Correctness | 3 | 3 | Valid delta format |
| 2. Citation Compliance | 2 | 3 | Uses §91, §150, §152 but could be more precise |
| 3. Rationale Quality | 1 | 3 | Good attacks but rarely names operators in rationale text |
| 11. Scale Check Rigor | 2 | 3 | Scale checks present with real calculations but only 1 check |
| 12. Anomaly Quarantine | 2 | 3 | X1 properly quarantined but only 1 anomaly — shallow coverage |
| 13. Theory Kill | N/A | — | No KILL operations in single-round session |
| 14. Real Third Alternative | 3 | 3 | C1 proposes organism-defines-problem as constructive alternative |
| **Weighted Total** | | | **3 + 2 + 0.5 + 3 + 3 + 4.5 = 16/21 (76%)** |

### Session Aggregate

| Dimension | Score | Notes |
|-----------|-------|-------|
| Volume | 15 deltas | 3H + 4P + 2T + 3A + 1X + 2C |
| Quality (mean) | **79.7%** | (84 + 79 + 76) / 3 |
| Progression | N/A | Single-round session (no multi-round iteration) |
| Convergence | N/A | Single-round; no KILL operations |
| Coverage | 4/5 operators used | ⊘ Level-Split, ⊕ Cross-Domain, ◊ Paradox-Hunt, ⊞ Scale-Check; ✂ Exclusion-Test implicit in test design |

**Pass/Fail Gates**: All pass — valid JSON, potency checks present, no fake anchors, third alternative included.

**Overall Grade: B+ (79.7%)**

This is an honest assessment for a single automated round. Multi-round human-in-the-loop sessions (like the golden example) would score higher through iteration.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-03 | Initial draft: Cursor cockpit with Tier 1 and Tier 2 |
| 0.1.1 | 2026-03-03 | Added linter results, evaluation scorecard, shellcheck compliance |
| 0.1.2 | 2026-03-03 | Fixed model defaults, added dep checks, recalibrated scores, strengthened critic prompt (>= 3 critiques, >= 2 anomalies), added fixture test + linter to "Quality Tooling Included" |
| 0.1.3 | 2026-03-03 | Kernel dedup (`_kernel.md` + `{{KERNEL}}`), process substitution for subshell scoping, removed dead code, narrowed `.cursor/rules` glob, added `--compile-only` to spec, added Test A linter results, fixture test cleanup trap |
| 0.1.4 | 2026-03-03 | CI jobs (`cursor-cockpit-lint` + `cursor-cockpit-test`), kernel file validation in `compose_prompt()`, `die()` aligned to `install.sh` convention, Test C linter note clarified, fixture cleanup |
| 0.1.5 | 2026-03-03 | Added `research_thread` delta to fixture (full Section 1 coverage), stripped remaining editorial from fixtures, broadened `.gitignore` to `artifacts/*/`, fixed jq sort precedence and integer arithmetic robustness |
