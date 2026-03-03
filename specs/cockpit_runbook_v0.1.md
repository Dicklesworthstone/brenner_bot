# BrennerBot Cockpit Runbook v0.1 (ntm + Agent Mail)

> **Scope**: Running a local multi-agent “Brenner Loop” session with terminal agents in `ntm` and durable coordination in Agent Mail.
>
> **Non‑negotiable constraint**: no vendor AI APIs are called from code. Agents run locally (Codex CLI / Claude Code / Gemini CLI) and coordinate by posting messages.

> **Alternative runtime**: See [`cursor_cockpit_v0.1.md`](./cursor_cockpit_v0.1.md) for running Brenner sessions with the Cursor CLI — single subscription, no ntm or Agent Mail required.

---

## 0) Preconditions

### Agent Mail is running

The BrennerBot CLI and web lab flow expect an Agent Mail server.

Health check:
```bash
./brenner.ts mail health
```

If you need to start it locally (example path; adjust to your install):
```bash
cd /data/projects/mcp_agent_mail
bash scripts/run_server_with_token.sh
```

### Agent Mail connection env vars (optional)

BrennerBot defaults to a local Agent Mail server at `http://127.0.0.1:8765/mcp/`.
Override via:

- `AGENT_MAIL_BASE_URL` (default `http://127.0.0.1:8765`)
- `AGENT_MAIL_PATH` (default `/mcp/`)
- `AGENT_MAIL_BEARER_TOKEN` (optional; required if Agent Mail auth is enabled)

### `ntm` is installed

Confirm `ntm` is on PATH:
```bash
ntm --help
```

Optional dependency check:
```bash
ntm deps
```

### Terminal agent CLIs are installed and logged in

The cockpit assumes you can run each agent locally (subscriptions, not vendor APIs):

- Codex CLI (GPT‑5.2)
- Claude Code (Opus 4.5)
- Gemini CLI (Gemini 3)

If `ntm deps` fails, fix that first (it will tell you which CLI is missing).

### Corpus files are present (local dev)

In this repo, primary corpus sources live at the repo root (example: `complete_brenner_transcript.md`).
The web app build copies them into `apps/web/public/_corpus/` via:

```bash
cd apps/web
bun run scripts/copy-corpus.ts
```

---

## 1) Identity contract (do this first)

The `thread_id` is the global join key across:
- Agent Mail thread
- `ntm` session name
- persisted artifact file path

Conventions live in: `thread_subject_conventions_v0.1.md`

**Rule of thumb**:
- Engineering work: `thread_id = {beads_id}` (example: `brenner_bot-5so.3.4.2`)
- Research sessions: `thread_id = RS-{YYYYMMDD}-{short-slug}` (example: `RS-20251230-cell-fate`)

**Derived mappings**:
- `ntm` session name: `{thread_id}`
- artifact path: `artifacts/{thread_id}.md`

---

## 2) Start the cockpit (`ntm`)

### 2.1 One-command start (recommended)

This wraps the happy-path steps:
1) spawn an `ntm` session (optional)
2) send role-separated kickoff messages via Agent Mail (explicit roster mapping)
3) broadcast “check mail” into all panes (optional)

```bash
export THREAD_ID="RS-20251230-cell-fate"

./brenner.ts cockpit start \
  --project-key "$PWD" \
  --thread-id "$THREAD_ID" \
  --sender FuchsiaDog \
  --to BlueLake,PurpleMountain,RedForest \
  --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic" \
  --excerpt-file excerpt.md \
  --question "How do cells choose between lineage and gradient-based fate determination?"
```

Useful flags:
- `--dry-run`: print the plan without spawning `ntm` or sending messages.
- `--skip-ntm`: don’t run `ntm spawn` (use if the session already exists).
- `--ntm-args "<args>"`: override `ntm spawn` flags (default: `--cc=1 --cod=1 --gmi=1`).
- `--skip-broadcast`: don’t `ntm send --all ...`.
- `--broadcast-message "<text>"`: customize the broadcast message.

Notes:
- `cockpit start` **requires** `--role-map` (no recipient-name heuristics).
- `thread_id` is also used as the `ntm` session name.

### 2.2 Manual `ntm` commands (fallback)

Spawn a tmux session with agent panes using the thread id as the session name:
```bash
export THREAD_ID="RS-20251230-cell-fate"
ntm spawn "$THREAD_ID" --cc=1 --cod=1 --gmi=1
```

Attach later:
```bash
ntm attach "$THREAD_ID"
```

Broadcast a reminder to agents (example):
```bash
ntm send "$THREAD_ID" --all "Please check your Agent Mail inbox for thread: $THREAD_ID"
```

Copy pane output (example):
```bash
ntm copy "$THREAD_ID"
```

---

## 3) Send a kickoff (CLI path)

### 3.1 List available Agent Mail recipients

Agent Mail recipients are **agent identity names**, not program names.

```bash
./brenner.ts mail agents --project-key "$PWD"
```

If the list is empty, the target agents have not registered identities in this project yet.

### 3.2 Compose a kickoff prompt

Create an excerpt file (example):
```bash
cat > excerpt.md <<'EOF'
§42 — (paste a short transcript excerpt here)

§57 — (paste another excerpt if needed)
EOF
```

Or build an excerpt from the corpus/quote bank:

```bash
# Search for relevant transcript anchors (§n)
./brenner.ts corpus search "exclusion" --docs transcript --limit 5

# Build excerpt from specific sections
./brenner.ts excerpt build --sections "§103,§105" --ordering chronological > excerpt.md

# Or build excerpt by quote-bank tags (deduplicated by §)
./brenner.ts excerpt build --tags "third-alternative,conversation" --limit 7 > excerpt.md
```

Compose the kickoff prompt:
```bash
./brenner.ts prompt compose \
  --template metaprompt_by_gpt_52.md \
  --excerpt-file excerpt.md \
  --theme "problem choice" \
  > kickoff.md
```

#### (Optional) Inject procedural memory (`cm context`)

If you want the kickoff to benefit from prior work:

- **CLI path (recommended):** `./brenner.ts session start --with-memory ...` injects a small, formatted **MEMORY CONTEXT (cass-memory)** section automatically (fail-soft if `cm` is unavailable).
- **Manual path:** run `cm context` before sending the kickoff and paste a *small* subset into the prompt under a dedicated section.

Recommended defaults:
- Use `--no-history` for faster, cleaner context.
- Keep `--limit` small (e.g. `6–10`) to avoid over-conditioning.

```bash
cm context "Brenner Loop: <your question / task>" --json --no-history --limit 8
```

Copy/paste this block into `kickoff.md` (near the end), and fill it from the JSON output:

~~~markdown
## MEMORY CONTEXT (cm; procedural)
Source: `cm context "<query>" --json --no-history --limit 8`

### Relevant rules (use IDs if provided)
- [cm:<rule-id>] ...

### Anti-patterns / warnings
- ...

### Notes
- Treat these as **workflow heuristics**, not evidence.
- If a memory bullet motivates a claim about Brenner, still ground that claim with transcript anchors (`§n`) or label it `[inference]`.
~~~

### 3.3 Send the kickoff via Agent Mail

#### Simple mode (role heuristics - deprecated)

```bash
./brenner.ts orchestrate start \
  --project-key "$PWD" \
  --thread-id "$THREAD_ID" \
  --sender FuchsiaDog \
  --to BlueLake,PurpleMountain,RedForest \
  --excerpt-file excerpt.md \
  --ack-required
```

#### Roster mode (explicit role assignment - recommended)

```bash
./brenner.ts session start \
  --project-key "$PWD" \
  --thread-id "$THREAD_ID" \
  --sender FuchsiaDog \
  --to BlueLake,PurpleMountain,RedForest \
  --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic" \
  --excerpt-file excerpt.md \
  --ack-required
```

Notes:
- `--sender` must be an adjective+noun name (Agent Mail convention).
- `--to` values must match names returned by `./brenner.ts mail agents`.
- **Roster mode** (explicit `--role-map`) sends role-specific prompts per recipient. This is the recommended approach for production sessions.
- Use `--unified` if you want everyone to receive the same kickoff prompt (no role differentiation).
- Role heuristics (inferring roles from agent name substrings) are deprecated. Real Agent Mail identities like `BlueLake` and `PurpleMountain` do not contain role hints.

#### Web UI roster assignment (alternative path)

The web lab at `/sessions/new` also supports roster-based role assignment:

1. Navigate to `/sessions/new` (requires lab mode enabled)
2. Enter recipients as comma-separated names (e.g., `BlueLake, PurpleMountain, RedForest`)
3. The **Role Assignment** section appears automatically
4. Assign roles via dropdowns, or click **"Default 3-Agent"** for automatic assignment
5. Toggle **Unified Mode** if you want the same prompt sent to all

The web UI uses the same `composeKickoffMessages()` logic as the CLI, ensuring consistent role-specific prompts across both paths.

### 3.4 Roles + response contract (what agents must send back)

The default 3‑agent Brenner Loop assigns roles as:

| Recipient | Role | Subject prefix | Spec |
|---|---|---|---|
| Codex / GPT | Hypothesis Generator | `DELTA[gpt]: ...` | `specs/role_prompts_v0.1.md` |
| Claude / Opus | Test Designer | `DELTA[opus]: ...` | `specs/role_prompts_v0.1.md` |
| Gemini | Adversarial Critic | `DELTA[gemini]: ...` | `specs/role_prompts_v0.1.md` |

**All agent contributions must be mergeable**, not essays:
- Message bodies contain one or more fenced JSON blocks in the ` ```delta ` format.
- Deltas follow: `specs/delta_output_format_v0.1.md` and `specs/artifact_delta_spec_v0.1.md`.

Minimal agent reply skeleton (what you want agents to send):

~~~markdown
Subject: DELTA[gpt]: Added H3 third alternative + predictions
Thread:  RS-20251230-cell-fate

## Deltas

```delta
{ "operation": "ADD", "section": "hypothesis_slate", "target_id": null, "payload": { ... }, "rationale": "..." }
```
~~~

### 3.5 Collection (get deltas into the Agent Mail thread)

As the operator, you’re doing two things:
1) keep agents unblocked (make sure they saw the kickoff + have the thread id)
2) collect their `DELTA[...]` messages inside the thread

Useful CLI commands:

```bash
# View your inbox (add --threads to group by thread)
./brenner.ts mail inbox --project-key "$PWD" --agent FuchsiaDog --threads

# Read + ack a specific message
./brenner.ts mail read --project-key "$PWD" --agent FuchsiaDog --message-id 123
./brenner.ts mail ack --project-key "$PWD" --agent FuchsiaDog --message-id 123

# Read a specific thread (include examples / guidance for agents)
./brenner.ts mail thread --project-key "$PWD" --thread-id "$THREAD_ID" --include-examples
```

Common nudge (send to all `ntm` panes):
```bash
ntm send "$THREAD_ID" --all "Check Agent Mail thread: $THREAD_ID and reply with DELTA[...] blocks (see specs/delta_output_format_v0.1.md)"
```

### 3.6 Status → compile/write → publish (CLI workflow)

Watch session status (optional):

```bash
./brenner.ts session status --project-key "$PWD" --thread-id "$THREAD_ID" --watch
```

Compile the thread into a canonical artifact (prints markdown to stdout; prints lint report to stderr):

```bash
./brenner.ts session compile --project-key "$PWD" --thread-id "$THREAD_ID" > artifact_v1.md
```

Write the artifact to disk (default path: `artifacts/{thread_id}.md`):

```bash
./brenner.ts session write --project-key "$PWD" --thread-id "$THREAD_ID"
```

Publish a `COMPILED:` message back into the same thread (re-compiles before sending):

```bash
./brenner.ts session publish --project-key "$PWD" --thread-id "$THREAD_ID" \
  --sender Operator --to BlueLake,PurpleMountain,RedForest --ack-required
```

Notes:
- Use `--json` on `session compile`/`write`/`publish` for machine-readable output.
- If compilation fails, `session compile` reports invalid delta blocks (by message id + subject). Ask the agent to resend a corrected `DELTA[...]` with a valid fenced `delta` block (see `specs/delta_output_format_v0.1.md`).

### 3.7 Conversation protocol (copy/paste)

Paste this at the top of a new thread to force “conversation as hypothesis search”:

~~~markdown
## Conversation Protocol (Brenner-style)

We are using conversation as cheap hypothesis search + cheap pruning.

Rules:
1) Say the “stupid thing” quickly (cheap generation).
2) Apply a “severe audience” immediately (cheap pruning): what would kill this?
3) Always include a **third alternative** (misspecification): “both could be wrong.”
4) Prefer **forbidden patterns** and discriminative tests over supportive arguments.
5) Keep levels split (program vs interpreter; message vs machine).
6) If we can’t cite it, label it `[inference]` and move on.
~~~

### 3.8 Troubleshooting (common failures)

- Agent Mail connectivity:
  - `./brenner.ts mail health` fails → check `AGENT_MAIL_BASE_URL`, `AGENT_MAIL_PATH`, and (if enabled) `AGENT_MAIL_BEARER_TOKEN`.
  - Ensure the Agent Mail server is running locally (see Preconditions).
- “Agent not found” / identity confusion:
  - Use `./brenner.ts mail agents --project-key "$PWD"` to confirm exact names.
  - Set `AGENT_NAME=YourName` (or pass `--sender/--agent`) so read/ack operations use the right inbox.
- Project key pitfalls:
  - Prefer `--project-key "$PWD"` (absolute path). Avoid relative paths when coordinating across machines.
  - If you’re hitting URL-encoding oddities, double-check you’re using the CLI path (not a browser URL) for `--project-key`.

---

## 4) Running experiments (discriminative tests)

> **Key distinction**: The experiment workflow separates **capture** (record what happened) from **interpretation** (decide what it means). The CLI handles capture; agents handle interpretation.

### 4.1 Workspace best practice

Always run experiments from the project root (the folder you're studying):

```bash
cd /path/to/your/project
export PROJECT_KEY="$PWD"
export THREAD_ID="RS-20251230-cell-fate"
```

Using `--project-key "$PWD"` ensures:
- Result files are written relative to your workspace
- File paths in DELTAs are consistent across agents
- Artifacts compile correctly

### 4.2 Define a discriminative test command (T#)

Discriminative tests are defined in the session artifact's `discriminative_tests` section. Each test has:
- `test_id`: Identifier like `T1`, `T2`, etc.
- `procedure`: The command to run
- `expected_outcomes`: What each hypothesis predicts

Example from an artifact:

```markdown
### T1: RRP Knockout Test
- **Procedure**: `python test_rrp.py --variant knockout`
- **Discriminates**: H1 vs H2
- **Expected outcomes**:
  - H1 (structural): Protein still folds
  - H2 (functional): Complete loss of activity
```

### 4.3 Run the experiment (capture phase)

Use `experiment run` to execute the test command and capture output:

```bash
./brenner.ts experiment run \
  --thread-id "$THREAD_ID" \
  --test-id T1 \
  --timeout 300 \
  -- python test_rrp.py --variant knockout
```

**Flags**:
- `--thread-id`: Required. Links result to the session thread.
- `--test-id`: Required. The T# being executed.
- `--timeout`: Optional (default 120s). Max execution time.
- `--json`: Optional. Emit structured output instead of the file path.

**What gets captured**:
- Exit code (0 = success, non-zero = failure)
- Stdout and stderr (full content)
- Timing (start, finish, duration)
- Timeout status (blocked if timed out)

**Where results are written**:
```
artifacts/{thread_id}/experiments/{test_id}/{timestamp}_{uuid}.json
```

Example output:
```
artifacts/RS-20251230-cell-fate/experiments/T1/20251230T183045Z_a1b2c3d4.json
```

### 4.4 Inspect the result file

The result file is a structured JSON document (schema: `experiment_result_v0.1`):

```bash
cat artifacts/$THREAD_ID/experiments/T1/*.json | jq '.'
```

Key fields:
- `result_id`: Unique identifier for this run
- `test_id`, `thread_id`: Back-references
- `exit_code`: 0 = passed, non-zero = failed
- `timed_out`: true if killed by timeout (status = blocked)
- `stdout`, `stderr`: Captured output
- `duration_ms`: Execution time

### 4.5 Encode the result → DELTA blocks (still capture, not interpretation)

Generate a non-interpretive DELTA that attaches run metadata to the test:

```bash
# Pick a specific run (avoid shell globs expanding to multiple files)
RESULT_FILE=$(ls -t artifacts/$THREAD_ID/experiments/T1/*.json | head -1)

./brenner.ts experiment encode \
  --result-file "$RESULT_FILE" \
  --project-key "$PROJECT_KEY" \
  > delta.md
```

With `--json`:
```bash
# Pick a specific run (avoid shell globs expanding to multiple files)
RESULT_FILE=$(ls -t artifacts/$THREAD_ID/experiments/T1/*.json | head -1)

./brenner.ts experiment encode \
  --result-file "$RESULT_FILE" \
  --project-key "$PROJECT_KEY" \
  --json
```

**What `encode` does NOT do**:
- It does NOT interpret whether the result supports H1 or H2
- It does NOT update hypothesis confidence scores
- It does NOT decide if the test was valid

These are agent responsibilities during the interpretation phase.

### 4.6 Post the DELTA message (encode + send in one step)

The `experiment post` command combines encode + send:

```bash
# Pick a specific run (avoid shell globs expanding to multiple files)
RESULT_FILE=$(ls -t artifacts/$THREAD_ID/experiments/T1/*.json | head -1)

./brenner.ts experiment post \
  --result-file "$RESULT_FILE" \
  --project-key "$PROJECT_KEY" \
  --sender Operator \
  --to BlueLake,PurpleMountain,RedForest
```

This:
1. Reads and validates the result file
2. Generates the DELTA block
3. Sends it to Agent Mail with subject `DELTA[results]: T1 passed|failed|blocked`

**Alternative**: Send manually with `mail send`:

```bash
# Pick a specific run (avoid shell globs expanding to multiple files)
RESULT_FILE=$(ls -t artifacts/$THREAD_ID/experiments/T1/*.json | head -1)

./brenner.ts experiment encode \
  --result-file "$RESULT_FILE" \
  --project-key "$PROJECT_KEY" \
  > delta.md

./brenner.ts mail send \
  --project-key "$PROJECT_KEY" \
  --thread-id "$THREAD_ID" \
  --sender Operator \
  --to BlueLake,PurpleMountain,RedForest \
  --subject "DELTA[results]: T1 run" \
  --body-file delta.md
```

### 4.7 Compile the updated artifact

After posting experiment results, compile to merge the DELTA:

```bash
./brenner.ts session compile \
  --project-key "$PROJECT_KEY" \
  --thread-id "$THREAD_ID" \
  > artifact_v2.md
```

Or write directly to disk:
```bash
./brenner.ts session write \
  --project-key "$PROJECT_KEY" \
  --thread-id "$THREAD_ID"
```

### 4.8 Full experiment loop (copy/paste example)

```bash
# 0) Set workspace context
export PROJECT_KEY="$PWD"
export THREAD_ID="RS-20251230-cell-fate"

# 1) Run the experiment (capture)
./brenner.ts experiment run \
  --thread-id "$THREAD_ID" \
  --test-id T1 \
  --timeout 300 \
  -- python test_rrp.py --variant knockout

# 2) Find the result file
RESULT_FILE=$(ls -t artifacts/$THREAD_ID/experiments/T1/*.json | head -1)
echo "Result: $RESULT_FILE"

# 3) Post to thread (encode + send)
./brenner.ts experiment post \
  --result-file "$RESULT_FILE" \
  --project-key "$PROJECT_KEY" \
  --sender Operator \
  --to BlueLake,PurpleMountain,RedForest

# 4) Compile updated artifact
./brenner.ts session compile \
  --project-key "$PROJECT_KEY" \
  --thread-id "$THREAD_ID" \
  > artifact_v2.md

# 5) Publish to thread
./brenner.ts session publish \
  --project-key "$PROJECT_KEY" \
  --thread-id "$THREAD_ID" \
  --sender Operator \
  --to BlueLake,PurpleMountain,RedForest
```

### 4.9 Capture vs Interpretation: who does what

| Phase | Who | What happens | Output |
|-------|-----|--------------|--------|
| **Capture** | Operator + CLI | Run command, record stdout/stderr/exit | `ExperimentResult` JSON |
| **Encode** | CLI | Generate DELTA with run metadata | `DELTA[results]: T# status` message |
| **Interpretation** | Agents | Analyze output, update hypotheses | `DELTA[gpt/opus/gemini]: ...` messages |

The operator **never** interprets results. The CLI **never** guesses what results mean.

Agents receive the raw data and must:
1. Read the result (stdout, exit code, duration)
2. Compare to expected outcomes in the test spec
3. Send follow-up DELTAs updating hypothesis status, adding anomalies, or proposing new tests

---

## 5) One end-to-end example session (kickoff → agent responses)

```bash
# 1) Choose the join key
export THREAD_ID="RS-20251230-cell-fate"

# 2) Start cockpit panes
ntm spawn "$THREAD_ID" --cc=1 --cod=1 --gmi=1

# 3) Confirm Agent Mail is reachable
./brenner.ts mail health

# 4) Check available agents
./brenner.ts mail agents --project-key "$PWD"
# → BlueLake, PurpleMountain, RedForest

# 5) Compose kickoff
./brenner.ts prompt compose --template metaprompt_by_gpt_52.md --excerpt-file excerpt.md > kickoff.md

# 6) Send kickoff with explicit roster (recommended)
./brenner.ts session start --project-key "$PWD" --thread-id "$THREAD_ID" \
  --sender FuchsiaDog \
  --to BlueLake,PurpleMountain,RedForest \
  --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic" \
  --excerpt-file excerpt.md \
  --ack-required

# 7) Tell the agents to check mail in their panes
ntm send "$THREAD_ID" --all "Check Agent Mail thread: $THREAD_ID and reply with DELTA[...]"
```

Next steps: compile deltas → render canonical artifact → publish `COMPILED` back to the thread → optionally persist to `artifacts/{thread_id}.md`.

---

## 6) Optional `.ntm/` project templates (proposal)

> **Goal**: minimize copy/paste friction in the cockpit without adding lots of repo-specific scaffolding.

### How `ntm` discovers templates and palette commands

**Templates**
- Project templates live at: `.ntm/templates/*.md` (highest precedence).
- Templates can also live in: `~/.config/ntm/templates/*.md` (user-level).
- View available templates: `ntm template list`

**Command palette**
- `ntm palette` shows commands defined in the `ntm` config file (default: `~/.config/ntm/config.toml`).
- `ntm config project init` can initialize a project config at `.ntm/config.toml` (optional).

### Proposed minimal template surface (names + purpose + location)

All of these would live as markdown templates under `.ntm/templates/`:

1. `brenner_check_mail.md`
   - **Purpose**: tell the agent to check Agent Mail for the current thread, and read the latest kickoff / instructions.
   - **Notes**: use `{{session}}` as the thread id (join-key contract: `thread_id == ntm session name`).

2. `brenner_reply_delta.md`
   - **Purpose**: request a structured `DELTA[...]` response to the current thread, following:
     - `specs/delta_output_format_v0.1.md`
     - `specs/artifact_delta_spec_v0.1.md`
   - **Notes**: the template can include a reminder to ground claims in transcript `§n` anchors.

3. `brenner_discriminative_tests.md`
   - **Purpose**: request a ranked list/table of discriminative tests + potency controls (chastity vs impotence).
   - **Notes**: “digital handles”, “across-the-room differences”, and explicit separation claims (which hypotheses each test separates).

4. `brenner_adversarial_critique.md`
   - **Purpose**: request the “third alternative” + critique: what framing assumptions could be wrong, what would falsify the whole setup.
   - **Notes**: include exception quarantine guidance (don’t sweep anomalies under Occam’s broom).

### Proposed minimal palette surface (optional)

If we decide to commit a project config, add a tiny `.ntm/config.toml` with a “Brenner Loop” category mapping to the templates above, so operators can:
- run `ntm palette` → pick “Brenner: reply with DELTA” → choose target panes → send
- avoid remembering template names/flags

---

## 7) Post-session wrap-up checklist (artifacts + memory outcomes)

Use this to “land the plane” after a session:

- [ ] Publish a final `COMPILED: vN ...` message into the thread (attach/paste artifact content).
- [ ] Mark outstanding items (missing acks, missing roles) explicitly in the thread as `INFO:` or `BLOCKED:`.
- [ ] (Optional) Persist the artifact into git at `artifacts/{thread_id}.md` (explicit operator action).
- [ ] (Optional) Record procedural memory outcomes with `cm` (examples below).

If you use `cm` (cass-memory) for procedural memory:

```bash
# Optional: stash a new rule learned from the session
cm playbook add "Rule: ..." --category "prompt-hygiene"

# Optional: mark a session as processed (if you used cm onboard workflows)
cm onboard mark-done /path/to/session.jsonl
```

### Hygiene rules: what gets written back to memory

Treat `cm playbook` entries as **durable procedural rules**, not a scratchpad.

Write back a rule only when:
- It is **generalizable** (it will likely be true for future sessions).
- It is **actionable** (“if/when X, do Y”).
- It reduces **repeat failure** (prevents a known pitfall) or improves **evidence-per-week**.

Do **not** write back:
- “Facts” about Brenner or the corpus. Put transcript-grounded claims in repo artifacts with `§n` citations.
- Unverified hypotheses or session-specific conclusions.
- Secrets, tokens, internal URLs, or any sensitive operational detail.
- Anything that would be embarrassing/damaging if it appeared in a public git repo.

Minimum provenance to include in the rule text:
- Why it was learned (1 sentence).
- Where it was learned (thread id and/or artifact path).

Human review requirement:
- The operator must **read and approve** every rule before `cm playbook add`.
- For high-impact categories (e.g. `safety-and-gating`, `protocol-kernel`), prefer a second pass after a short cooldown.

### Recommended `cm` playbook categories (Brenner Loop)

Use a small, stable set of categories so rules stay findable.

| Category | What belongs here | Example rule you might store |
|---|---|---|
| `protocol-kernel` | Schema + invariants: artifact sections, anchor formats, delta rules, required fields | “If a claim isn’t grounded in `§n`, label it `[inference]`.” |
| `prompt-hygiene` | How we write prompts + interpret outputs: provenance labeling, citation style, anti-confabulation patterns | “Never paraphrase as a quote; keep quotes short and cite `§n` inline.” |
| `evidence-per-week` | Choosing next experiments: likelihood ratios, potency controls, time/cost tradeoffs | “Prefer tests that separate ≥2 hypotheses with ‘across-the-room’ readouts.” |
| `thread-operations` | Agent Mail + workflow mechanics: thread IDs, subject tags, ack discipline, file reservations | “Thread ID is join-key; never change it mid-session.” |
| `artifact-compilation` | Merging + linting: delta merge policy, conflict resolution, publish conventions | “Resolve conflicts by explicit `EDIT` blocks, not silent overwrite.” |
| `safety-and-gating` | Guardrails: lab mode, auth, secrets hygiene, no vendor API policy | “Orchestration actions must be gated; fail closed if lab auth missing.” |

**Example commands**:

```bash
cm playbook add "Rule: Thread ID is the global join key; keep it stable across kickoff/DELTA/COMPILED." --category "thread-operations"
cm playbook add "Rule: Any non-§-grounded claim in artifacts must be labeled [inference]." --category "protocol-kernel"
cm playbook add "Rule: Prefer discriminative tests with potency controls (chastity vs impotence) and extreme likelihood ratios." --category "evidence-per-week"
```

### Recording outcomes (feedback) with `cm mark`

At the end of a session (or after a pull request), mark whether a memory rule was helpful or harmful so `cm context` improves over time.

Guidance:
- Mark **helpful** when it saved time, prevented a bug, or improved decision quality.
- Mark **harmful** when it contradicted requirements, pushed the wrong pattern, or caused wasted time.
- Always include a short reason and (when available) the associated session path.

Concrete example:

```bash
# Mark a rule as helpful (use the real bullet ID from `cm context --json`)
cm mark b-8f3a2c --helpful --reason other --session /path/to/session.jsonl --json

# If you mis-marked something, inspect / undo:
cm why b-8f3a2c
cm undo b-8f3a2c
```
