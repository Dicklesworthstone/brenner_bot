#!/usr/bin/env bash
set -euo pipefail

# Cursor Cockpit: Run a full Brenner Protocol session using parallel Cursor CLI agents.
# Each agent runs a different model with a role-specific prompt.
#
# Usage:
#   ./scripts/cursor-brenner-session.sh \
#     --thread-id RS-20260303-example \
#     --question "How should a researcher choose the right model organism?" \
#     [--excerpt-file path/to/excerpt.md] \
#     [--hyp-model gpt-5.3-codex] \
#     [--test-model sonnet-4.6] \
#     [--critic-model gemini-3.1-pro] \
#     [--workspace /path/to/brenner_bot]
#     [--compile-only path/to/delta-dir]  # Skip agents, compile from pre-recorded deltas

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Helpers ──────────────────────────────────────────────────────────────────
die() { echo "ERROR: $*" >&2; exit 1; }

# ── Defaults ──────────────────────────────────────────────────────────────────
HYP_MODEL="gpt-5.3-codex"
TEST_MODEL="sonnet-4.6"
CRITIC_MODEL="gemini-3.1-pro"
THREAD_ID=""
QUESTION=""
EXCERPT_FILE=""
WORKSPACE="$REPO_ROOT"
COMPILE_ONLY=""

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --thread-id)    THREAD_ID="$2"; shift 2 ;;
        --question)     QUESTION="$2"; shift 2 ;;
        --excerpt-file) EXCERPT_FILE="$2"; shift 2 ;;
        --hyp-model)    HYP_MODEL="$2"; shift 2 ;;
        --test-model)   TEST_MODEL="$2"; shift 2 ;;
        --critic-model) CRITIC_MODEL="$2"; shift 2 ;;
        --workspace)    WORKSPACE="$2"; shift 2 ;;
        --compile-only) COMPILE_ONLY="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 --thread-id <id> --question <question> [options]"
            echo ""
            echo "Required:"
            echo "  --thread-id    Session identifier (e.g., RS-20260303-topic)"
            echo "  --question     The research question to investigate"
            echo ""
            echo "Optional:"
            echo "  --excerpt-file  Path to a corpus excerpt file"
            echo "  --hyp-model     Model for Hypothesis Generator (default: $HYP_MODEL)"
            echo "  --test-model    Model for Test Designer (default: $TEST_MODEL)"
            echo "  --critic-model  Model for Adversarial Critic (default: $CRITIC_MODEL)"
            echo "  --workspace     Workspace directory (default: repo root)"
            echo "  --compile-only  Path to directory with pre-recorded delta .md files (skip agent invocation)"
            exit 0 ;;
        *) die "Unknown option: $1" ;;
    esac
done

if [[ -z "$THREAD_ID" ]] || [[ -z "$QUESTION" ]]; then
    die "--thread-id and --question are required. Run with --help for usage."
fi

# ── Dependency pre-flight ─────────────────────────────────────────────────────
if [[ -z "$COMPILE_ONLY" ]]; then
    command -v agent >/dev/null 2>&1 || die "Cursor CLI 'agent' not found in PATH. Install: https://docs.cursor.com/cli"
fi
command -v jq >/dev/null 2>&1 || die "'jq' not found in PATH. Install: brew install jq (macOS) or apt install jq (Linux)"

# ── Setup directories ─────────────────────────────────────────────────────────
ARTIFACT_DIR="$REPO_ROOT/artifacts/$THREAD_ID"
DELTA_DIR="$ARTIFACT_DIR/deltas"
PROMPT_DIR="$SCRIPT_DIR/prompts"
TMPDIR_SESSION=$(mktemp -d)
trap 'rm -rf "$TMPDIR_SESSION"' EXIT

mkdir -p "$DELTA_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Brenner Protocol — Cursor Cockpit Session         ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║ Thread:     $THREAD_ID"
echo "║ Question:   ${QUESTION:0:55}..."
echo "║ Models:     HYP=$HYP_MODEL  TEST=$TEST_MODEL  CRIT=$CRITIC_MODEL"
echo "║ Output:     $ARTIFACT_DIR/"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Read excerpt ──────────────────────────────────────────────────────────────
EXCERPT="(No corpus excerpt provided for this session.)"
if [[ -n "$EXCERPT_FILE" ]] && [[ -f "$EXCERPT_FILE" ]]; then
    EXCERPT=$(<"$EXCERPT_FILE")
    echo "[info] Loaded excerpt from $EXCERPT_FILE ($(wc -l < "$EXCERPT_FILE") lines)"
elif [[ -n "$EXCERPT_FILE" ]]; then
    echo "[warn] Excerpt file not found: $EXCERPT_FILE — proceeding without excerpt"
fi

# ── Utility functions ─────────────────────────────────────────────────────────
compose_prompt() {
    local template="$1"
    local output="$2"
    local kernel_file="$PROMPT_DIR/_kernel.md"

    [[ -f "$kernel_file" ]] || die "Shared kernel not found: $kernel_file"
    [[ -f "$template" ]]    || die "Template not found: $template"

    printf '%s\n' "$QUESTION" > "$TMPDIR_SESSION/_question.txt"
    printf '%s\n' "$EXCERPT"  > "$TMPDIR_SESSION/_excerpt.txt"

    awk '
        /\{\{KERNEL\}\}/   { while ((getline line < kfile) > 0) print line; close(kfile); next }
        /\{\{QUESTION\}\}/ { while ((getline line < qfile) > 0) print line; close(qfile); next }
        /\{\{EXCERPT\}\}/  { while ((getline line < efile) > 0) print line; close(efile); next }
        { print }
    ' kfile="$kernel_file" qfile="$TMPDIR_SESSION/_question.txt" efile="$TMPDIR_SESSION/_excerpt.txt" "$template" > "$output"
}

extract_deltas() {
    local input_file="$1"
    awk '
        /^```delta/ { capture=1; next }
        /^```/ && capture { capture=0; print "---DELTA_BOUNDARY---"; next }
        capture { print }
    ' "$input_file"
}

# ── Compile-only mode: skip agent invocation, use pre-recorded deltas ────────
if [[ -n "$COMPILE_ONLY" ]]; then
    [[ -d "$COMPILE_ONLY" ]] || die "Compile-only directory not found: $COMPILE_ONLY"
    echo "[compile-only] Using pre-recorded deltas from $COMPILE_ONLY"
    for f in hypothesis_generator.md test_designer.md adversarial_critic.md; do
        if [[ -f "$COMPILE_ONLY/$f" ]]; then
            cp "$COMPILE_ONLY/$f" "$DELTA_DIR/$f"
        else
            echo "[warn] Missing fixture: $COMPILE_ONLY/$f"
        fi
    done
else
    # ── Compose prompts from templates ────────────────────────────────────────
    echo "[1/5] Composing role-specific prompts..."
    compose_prompt "$PROMPT_DIR/hypothesis_generator.md" "$TMPDIR_SESSION/hyp_prompt.md"
    compose_prompt "$PROMPT_DIR/test_designer.md"        "$TMPDIR_SESSION/test_prompt.md"
    compose_prompt "$PROMPT_DIR/adversarial_critic.md"   "$TMPDIR_SESSION/critic_prompt.md"
    echo "      Done. Prompts written to temp directory."

    # ── Launch parallel agents ────────────────────────────────────────────────
    echo "[2/5] Launching 3 parallel Cursor CLI agents..."
    echo "      ├─ Hypothesis Generator ($HYP_MODEL)"
    echo "      ├─ Test Designer ($TEST_MODEL)"
    echo "      └─ Adversarial Critic ($CRITIC_MODEL)"
    echo ""

    STARTED_AT=$(date +%s)

    # Stagger launches by 2s to avoid CLI config file race conditions
    agent -p --model "$HYP_MODEL" --workspace "$WORKSPACE" --trust \
        < "$TMPDIR_SESSION/hyp_prompt.md" \
        > "$DELTA_DIR/hypothesis_generator.md" 2>"$DELTA_DIR/hypothesis_generator.err" &
    PID_HYP=$!
    sleep 2

    agent -p --model "$TEST_MODEL" --workspace "$WORKSPACE" --trust \
        < "$TMPDIR_SESSION/test_prompt.md" \
        > "$DELTA_DIR/test_designer.md" 2>"$DELTA_DIR/test_designer.err" &
    PID_TEST=$!
    sleep 2

    agent -p --model "$CRITIC_MODEL" --workspace "$WORKSPACE" --trust \
        < "$TMPDIR_SESSION/critic_prompt.md" \
        > "$DELTA_DIR/adversarial_critic.md" 2>"$DELTA_DIR/adversarial_critic.err" &
    PID_CRITIC=$!

    echo "      PIDs: HYP=$PID_HYP  TEST=$PID_TEST  CRIT=$PID_CRITIC"

    # ── Wait for completion ───────────────────────────────────────────────────
    echo "[3/5] Waiting for agents to complete..."

    FAIL=0
    wait $PID_HYP    2>/dev/null || { echo "      [FAIL] Hypothesis Generator exited with error"; FAIL=$((FAIL+1)); }
    echo "      ✓ Hypothesis Generator done ($(wc -c < "$DELTA_DIR/hypothesis_generator.md") bytes)"

    wait $PID_TEST   2>/dev/null || { echo "      [FAIL] Test Designer exited with error"; FAIL=$((FAIL+1)); }
    echo "      ✓ Test Designer done ($(wc -c < "$DELTA_DIR/test_designer.md") bytes)"

    wait $PID_CRITIC 2>/dev/null || { echo "      [FAIL] Adversarial Critic exited with error"; FAIL=$((FAIL+1)); }
    echo "      ✓ Adversarial Critic done ($(wc -c < "$DELTA_DIR/adversarial_critic.md") bytes)"

    ENDED_AT=$(date +%s)
    ELAPSED=$((ENDED_AT - STARTED_AT))
    echo ""
    echo "      All agents completed in ${ELAPSED}s ($FAIL failures)"

    if [[ $FAIL -eq 3 ]]; then
        die "All agents failed. Check .err files in $DELTA_DIR/"
    fi
fi

# ── Extract delta blocks ──────────────────────────────────────────────────────
echo "[4/5] Extracting delta blocks from agent outputs..."

# Collect all deltas with role attribution
ALL_DELTAS="$TMPDIR_SESSION/all_deltas.jsonl"
: > "$ALL_DELTAS"

for role_file in hypothesis_generator test_designer adversarial_critic; do
    delta_source="$DELTA_DIR/${role_file}.md"
    if [[ ! -s "$delta_source" ]]; then
        echo "      [warn] Empty output from $role_file"
        continue
    fi

    raw_deltas=$(extract_deltas "$delta_source")
    if [[ -z "$raw_deltas" ]]; then
        echo "      [warn] No delta blocks found in $role_file output"
        continue
    fi

    # Split on boundary markers and validate each JSON block
    count=0
    current_block=""
    while IFS= read -r line; do
        if [[ "$line" == "---DELTA_BOUNDARY---" ]]; then
            if [[ -n "$current_block" ]]; then
                # Validate JSON and add source attribution
                if echo "$current_block" | jq -e '.' >/dev/null 2>&1; then
                    echo "$current_block" | jq -c --arg src "$role_file" '. + {"_source": $src}' >> "$ALL_DELTAS"
                    count=$((count+1))
                else
                    echo "      [warn] Invalid JSON in $role_file delta block — skipped"
                fi
            fi
            current_block=""
        else
            current_block="${current_block}${line}"$'\n'
        fi
    done <<< "$raw_deltas"

    # Handle last block (if no trailing boundary)
    if [[ -n "$current_block" ]]; then
        if echo "$current_block" | jq -e '.' >/dev/null 2>&1; then
            echo "$current_block" | jq -c --arg src "$role_file" '. + {"_source": $src}' >> "$ALL_DELTAS"
            count=$((count+1))
        fi
    fi

    echo "      $role_file: $count valid delta(s) extracted"
done

TOTAL_DELTAS=$(wc -l < "$ALL_DELTAS" | tr -d ' ')
echo "      Total: $TOTAL_DELTAS delta(s)"

if [[ "$TOTAL_DELTAS" -eq 0 ]]; then
    die "No valid deltas extracted. Raw outputs in $DELTA_DIR/ — check for correct delta fence tags."
fi

# ── Compile artifact ──────────────────────────────────────────────────────────
echo "[5/5] Compiling Brenner artifact..."

ARTIFACT_FILE="$ARTIFACT_DIR/artifact.md"

# Build the artifact markdown
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$ARTIFACT_FILE" << HEADER
---
session_id: "$THREAD_ID"
created_at: "$NOW"
updated_at: "$NOW"
version: 1
contributors:
  - role: "hypothesis_generator"
    model: "$HYP_MODEL"
  - role: "test_designer"
    model: "$TEST_MODEL"
  - role: "adversarial_critic"
    model: "$CRITIC_MODEL"
cockpit: "cursor-cli"
status: "draft"
---

# Brenner Protocol Artifact: $THREAD_ID

HEADER

# Section 1: Research Thread
RT_DELTA=$(jq -c 'select(.section == "research_thread" and .operation == "ADD")' "$ALL_DELTAS" | head -1)

if [[ -n "$RT_DELTA" ]]; then
    RT_CONTEXT=$(echo "$RT_DELTA" | jq -r '.payload.context // "See research question for context."')
    RT_WHY=$(echo "$RT_DELTA" | jq -r '.payload.why_it_matters // "See research question above."')
    RT_ANCHORS=$(echo "$RT_DELTA" | jq -r 'if .payload.anchors then (.payload.anchors | join(", ")) else "[inference]" end')
else
    RT_CONTEXT="Generated via Cursor Cockpit parallel multi-model session."
    RT_WHY="See research question above."
    RT_ANCHORS="[inference]"
fi

cat >> "$ARTIFACT_FILE" << RT_SECTION
## 1. Research Thread

**RT**: $QUESTION

**Context**: $RT_CONTEXT

**Why it matters**: $RT_WHY

**Anchors**: $RT_ANCHORS

RT_SECTION

# Section 2: Hypothesis Slate (non-third-alternatives first, third alternative last)
{ echo ""; echo "## 2. Hypothesis Slate"; echo ""; } >> "$ARTIFACT_FILE"

H_COUNT=0
while IFS= read -r delta; do
    H_COUNT=$((H_COUNT+1))
    ID="H${H_COUNT}"
    RAW_NAME=$(echo "$delta" | jq -r '.payload.name // "Unnamed"')
    NAME=$(echo "$RAW_NAME" | sed -E 's/^H[0-9]+:?\s*//')
    CLAIM=$(echo "$delta" | jq -r '.payload.claim // "No claim"')
    MECHANISM=$(echo "$delta" | jq -r '.payload.mechanism // .payload.how_this_could_be_true // "No mechanism specified"')
    ANCHORS=$(echo "$delta" | jq -r 'if .payload.anchors then (.payload.anchors | join(", ")) else "inference" end')
    IS_THIRD=$(echo "$delta" | jq -r '.payload.third_alternative // false')

    if [[ "$IS_THIRD" == "true" ]]; then
        {
            echo "### $ID: Third Alternative — $NAME"
            echo "**Claim**: $CLAIM"
            echo "**How this could be true**: $MECHANISM"
            echo ""
        } >> "$ARTIFACT_FILE"
    else
        {
            echo "### $ID: $NAME"
            echo "**Claim**: $CLAIM"
            echo "**Mechanism**: $MECHANISM"
            echo "**Anchors**: $ANCHORS"
            echo ""
        } >> "$ARTIFACT_FILE"
    fi
done < <({
    jq -c 'select(.section == "hypothesis_slate" and .operation == "ADD" and (.payload.third_alternative != true))' "$ALL_DELTAS"
    jq -c 'select(.section == "hypothesis_slate" and .operation == "ADD" and (.payload.third_alternative == true))' "$ALL_DELTAS"
})

# Section 3: Predictions Table
{ echo ""; echo "## 3. Predictions Table"; echo ""; } >> "$ARTIFACT_FILE"

FIRST_PRED=$(jq -c 'select(.section == "predictions_table" and .operation == "ADD") | .payload.predictions' "$ALL_DELTAS" | head -1)
if [[ -n "$FIRST_PRED" ]] && [[ "$FIRST_PRED" != "null" ]]; then
    PRED_KEYS=$(echo "$FIRST_PRED" | jq -r 'keys[]' | tr '\n' '|' | sed 's/|$//; s/|/ | /g')
    echo "| ID | Condition | $PRED_KEYS |" >> "$ARTIFACT_FILE"
    SEPARATOR="|----|-----------|"
    while IFS= read -r _key; do SEPARATOR="${SEPARATOR}-------------|"; done < <(echo "$FIRST_PRED" | jq -r 'keys[]')
    echo "$SEPARATOR" >> "$ARTIFACT_FILE"

    P_COUNT=0
    while IFS= read -r delta; do
        P_COUNT=$((P_COUNT+1))
        ID="P${P_COUNT}"
        CONDITION=$(echo "$delta" | jq -r '.payload.condition // "?"')
        ROW="| $ID | $CONDITION |"
        while IFS= read -r key; do
            VAL=$(echo "$delta" | jq -r --arg k "$key" '.payload.predictions[$k] // "—"')
            ROW="$ROW $VAL |"
        done < <(echo "$FIRST_PRED" | jq -r 'keys[]')
        echo "$ROW" >> "$ARTIFACT_FILE"
    done < <(jq -c 'select(.section == "predictions_table" and .operation == "ADD")' "$ALL_DELTAS")
else
    echo "(No predictions generated)" >> "$ARTIFACT_FILE"
fi

# Section 4: Discriminative Tests
{ echo ""; echo "## 4. Discriminative Tests"; echo ""; } >> "$ARTIFACT_FILE"

T_COUNT=0
while IFS= read -r delta; do
    T_COUNT=$((T_COUNT+1))
    ID="T${T_COUNT}"
    RAW_TNAME=$(echo "$delta" | jq -r '.payload.name // "Unnamed test"')
    NAME=$(echo "$RAW_TNAME" | sed -E 's/^T[0-9]+:?\s*//')
    LR=$(echo "$delta" | jq -r '(.payload.score.likelihood_ratio // 0) | floor')
    COST=$(echo "$delta" | jq -r '(.payload.score.cost // 0) | floor')
    SPEED=$(echo "$delta" | jq -r '(.payload.score.speed // 0) | floor')
    AMB=$(echo "$delta" | jq -r '(.payload.score.ambiguity // 0) | floor')
    TOTAL=$((LR + COST + SPEED + AMB))
    PROC=$(echo "$delta" | jq -r '.payload.procedure // "No procedure"')
    DISC=$(echo "$delta" | jq -r '.payload.discriminates // "?"')
    POTENCY=$(echo "$delta" | jq -r '.payload.potency_check // "Not specified"')
    FEAS=$(echo "$delta" | jq -r '.payload.feasibility // "Not specified"')

    {
        echo "### $ID: $NAME (Score: $TOTAL/12)"
        echo "**Procedure**: $PROC"
        echo "**Discriminates**: $DISC"
        echo "**Expected outcomes**:"
        echo "$delta" | jq -r '.payload.expected_outcomes // {} | to_entries[] | "- If \(.key): \(.value)"'
        echo "**Potency check**: $POTENCY"
        echo "**Feasibility**: $FEAS"
        echo "**Evidence-per-week score**: LR=$LR, Cost=$COST, Speed=$SPEED, Ambiguity=$AMB"
        echo ""
    } >> "$ARTIFACT_FILE"
done < <(jq -c 'select(.section == "discriminative_tests" and .operation == "ADD")' "$ALL_DELTAS" | \
    jq -c -s 'sort_by(-((.payload.score.likelihood_ratio // 0) + (.payload.score.cost // 0) + (.payload.score.speed // 0) + (.payload.score.ambiguity // 0))) | .[]')

# Section 5: Assumption Ledger
{ echo ""; echo "## 5. Assumption Ledger"; echo ""; } >> "$ARTIFACT_FILE"

A_COUNT=0
while IFS= read -r delta; do
    A_COUNT=$((A_COUNT+1))
    ID="A${A_COUNT}"
    RAW_ANAME=$(echo "$delta" | jq -r '.payload.name // "Unnamed"')
    NAME=$(echo "$RAW_ANAME" | sed -E 's/^A[0-9]+:?\s*//')
    STMT=$(echo "$delta" | jq -r '.payload.statement // "?"')
    LOAD=$(echo "$delta" | jq -r '.payload.load // "?"')
    TEST_F=$(echo "$delta" | jq -r '.payload.test // "?"')
    STATUS=$(echo "$delta" | jq -r '.payload.status // "unchecked"')
    IS_SCALE=$(echo "$delta" | jq -r '.payload.scale_check // false')
    CALC=$(echo "$delta" | jq -r '.payload.calculation // empty')

    if [[ "$IS_SCALE" == "true" ]]; then
        {
            echo "### $ID: Scale/Physics Check — $NAME"
            echo "**Statement**: $STMT"
            if [[ -n "$CALC" ]]; then echo "**Calculation**: $CALC"; fi
            echo "**Implication**: $LOAD"
            echo "**Status**: $STATUS"
            echo ""
        } >> "$ARTIFACT_FILE"
    else
        {
            echo "### $ID: $NAME"
            echo "**Statement**: $STMT"
            echo "**Load**: $LOAD"
            echo "**Test**: $TEST_F"
            echo "**Status**: $STATUS"
            echo ""
        } >> "$ARTIFACT_FILE"
    fi
done < <(jq -c 'select(.section == "assumption_ledger" and .operation == "ADD")' "$ALL_DELTAS")

# Section 6: Anomaly Register
{ echo ""; echo "## 6. Anomaly Register"; echo ""; } >> "$ARTIFACT_FILE"

ANOMALY_COUNT=$(jq -c 'select(.section == "anomaly_register" and .operation == "ADD")' "$ALL_DELTAS" | wc -l | tr -d ' ')

if [[ "$ANOMALY_COUNT" -eq 0 ]]; then
    { echo "**None registered**: No observations currently conflict with the framing."; echo ""; } >> "$ARTIFACT_FILE"
else
    X_COUNT=0
    while IFS= read -r delta; do
        X_COUNT=$((X_COUNT+1))
        ID="X${X_COUNT}"
        RAW_XNAME=$(echo "$delta" | jq -r '.payload.name // "Unnamed"')
        NAME=$(echo "$RAW_XNAME" | sed -E 's/^X[0-9]+:?\s*//')
        OBS=$(echo "$delta" | jq -r '.payload.observation // "?"')
        CONF=$(echo "$delta" | jq -r 'if .payload.conflicts_with then (.payload.conflicts_with | join(", ")) else "?" end')
        STATUS=$(echo "$delta" | jq -r '.payload.status // "active"')
        PLAN=$(echo "$delta" | jq -r '.payload.resolution_plan // "?"')

        {
            echo "### $ID: $NAME"
            echo "**Observation**: $OBS"
            echo "**Conflicts with**: $CONF"
            echo "**Quarantine status**: $STATUS"
            echo "**Resolution plan**: $PLAN"
            echo ""
        } >> "$ARTIFACT_FILE"
    done < <(jq -c 'select(.section == "anomaly_register" and .operation == "ADD")' "$ALL_DELTAS")
fi

# Section 7: Adversarial Critique
{ echo ""; echo "## 7. Adversarial Critique"; echo ""; } >> "$ARTIFACT_FILE"

C_COUNT=0
while IFS= read -r delta; do
    C_COUNT=$((C_COUNT+1))
    ID="C${C_COUNT}"
    RAW_CNAME=$(echo "$delta" | jq -r '.payload.name // "Unnamed"')
    NAME=$(echo "$RAW_CNAME" | sed -E 's/^C[0-9]+:?\s*//')
    ATTACK=$(echo "$delta" | jq -r '.payload.attack // "?"')
    EVIDENCE=$(echo "$delta" | jq -r '.payload.evidence // "?"')
    C_STATUS=$(echo "$delta" | jq -r '.payload.current_status // "?"')
    IS_THIRD=$(echo "$delta" | jq -r '.payload.real_third_alternative // false')

    {
        if [[ "$IS_THIRD" == "true" ]]; then
            echo "### $ID: Real Third Alternative — $NAME"
        else
            echo "### $ID: $NAME"
        fi
        echo "**Attack**: $ATTACK"
        echo "**Evidence that would confirm**: $EVIDENCE"
        echo "**Current status**: $C_STATUS"
        echo ""
    } >> "$ARTIFACT_FILE"
done < <(jq -c 'select(.section == "adversarial_critique" and .operation == "ADD")' "$ALL_DELTAS")

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Session Complete                         ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║ Artifact:   $ARTIFACT_FILE"
echo "║ Deltas:     $TOTAL_DELTAS extracted from 3 agents"
if [[ -z "$COMPILE_ONLY" ]]; then
    echo "║ Duration:   ${ELAPSED}s"
fi
echo "║ Raw output: $DELTA_DIR/"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Section counts:"
for section in hypothesis_slate predictions_table discriminative_tests assumption_ledger anomaly_register adversarial_critique; do
    count=$(jq -c --arg s "$section" 'select(.section == $s)' "$ALL_DELTAS" | wc -l | tr -d ' ')
    echo "  $section: $count"
done
echo ""
echo "Review: $ARTIFACT_FILE"
