#!/usr/bin/env bash
set -euo pipefail

# Fixture-based test for the Cursor Cockpit compilation pipeline.
# Uses pre-recorded delta outputs (no agent calls needed).
# Validates: delta extraction, artifact compilation, and linter compliance.
#
# Usage: bash tests/test-compile-fixture.sh
# Exit 0 = all tests pass, 1 = failure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE_DIR="$SCRIPT_DIR/fixtures"
THREAD_ID="TEST-FIXTURE-$(date +%s)"

trap 'rm -rf "${REPO_ROOT:?}/artifacts/$THREAD_ID"' EXIT

PASS=0
FAIL=0

pass() { echo "  PASS  $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

assert_cmd() {
    local name="$1"
    shift
    if "$@" >/dev/null 2>&1; then
        pass "$name"
    else
        fail "$name"
    fi
}

assert_ge() {
    local name="$1"
    local actual="$2"
    local min="$3"
    if [[ "$actual" -ge "$min" ]]; then
        pass "$name"
    else
        fail "$name"
    fi
}

echo "═══════════════════════════════════════════════════"
echo " Cursor Cockpit: Fixture-Based Compilation Test"
echo "═══════════════════════════════════════════════════"
echo ""

for f in hypothesis_generator.md test_designer.md adversarial_critic.md; do
    if [[ ! -f "$FIXTURE_DIR/$f" ]]; then
        echo "FATAL: Missing fixture $FIXTURE_DIR/$f"
        exit 2
    fi
done

echo "[1/3] Running compilation pipeline on fixtures..."
COMPILE_EXIT=0
bash "$REPO_ROOT/scripts/cursor-brenner-session.sh" \
    --thread-id "$THREAD_ID" \
    --question "How should a researcher choose the right experimental system for a new biological question?" \
    --compile-only "$FIXTURE_DIR" >/dev/null 2>&1 || COMPILE_EXIT=$?

ARTIFACT="$REPO_ROOT/artifacts/$THREAD_ID/artifact.md"

echo "[2/3] Validating compilation output..."
echo ""

if [[ "$COMPILE_EXIT" -ne 0 ]]; then
    fail "Compilation exited with code $COMPILE_EXIT"
else
    pass "Compilation completed successfully"
fi

assert_cmd "Artifact file created" test -f "$ARTIFACT"

assert_cmd "YAML front matter present" grep -q '^---' "$ARTIFACT"

for section in \
    "## 1. Research Thread" \
    "## 2. Hypothesis Slate" \
    "## 3. Predictions Table" \
    "## 4. Discriminative Tests" \
    "## 5. Assumption Ledger" \
    "## 6. Anomaly Register" \
    "## 7. Adversarial Critique"; do
    assert_cmd "Section: $section" grep -q "^$section" "$ARTIFACT"
done

H_COUNT=$(grep -cE '^### H[0-9]+:' "$ARTIFACT" || true)
assert_ge "At least 3 hypotheses (found $H_COUNT)" "$H_COUNT" 3

assert_cmd "Third alternative labeled" grep -qi 'third alternative' "$ARTIFACT"

T_COUNT=$(grep -cE '^### T[0-9]+:' "$ARTIFACT" || true)
assert_ge "At least 2 tests (found $T_COUNT)" "$T_COUNT" 2

A_COUNT=$(grep -cE '^### A[0-9]+:' "$ARTIFACT" || true)
assert_ge "At least 3 assumptions (found $A_COUNT)" "$A_COUNT" 3

P_ROWS=$(awk '/^## 3\. Predictions Table/{p=1; next} p && /^## [0-9]+\./{p=0} p{print}' "$ARTIFACT" | grep -cE '^\|[^-]' || true)
P_DATA=$((P_ROWS > 1 ? P_ROWS - 1 : 0))
assert_ge "At least 3 prediction rows (found $P_DATA)" "$P_DATA" 3

assert_cmd "Scale/physics check in assumptions" grep -qiE '^### A[0-9]+:.*[Ss]cale|^### A[0-9]+:.*[Pp]hysics' "$ARTIFACT"

assert_cmd "Research Thread has delta-sourced context" grep -q '§91' "$ARTIFACT"

echo ""

echo "[3/3] Running artifact linter..."
if bash "$REPO_ROOT/scripts/lint-artifact.sh" "$ARTIFACT" > /dev/null 2>&1; then
    pass "Artifact linter: VALID"
else
    fail "Artifact linter: VALID"
    bash "$REPO_ROOT/scripts/lint-artifact.sh" "$ARTIFACT" 2>&1 || true
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo " Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
exit 0
