#!/usr/bin/env bash
set -euo pipefail

# Artifact linter implementing machine-checkable rules from specs/artifact_linter_spec_v0.1.md.
# Uses only POSIX-compatible grep -E (no -P) for macOS/Linux portability.
# Exit codes: 0 = valid, 1 = errors found, 2 = parse error.

ARTIFACT="${1:-}"
if [[ -z "$ARTIFACT" ]] || [[ ! -f "$ARTIFACT" ]]; then
    echo "Usage: $0 <artifact.md>"
    exit 2
fi

ERRORS=0
WARNINGS=0
INFOS=0
REPORT=""

err()  { ERRORS=$((ERRORS+1));   REPORT+="  ERROR   $1: $2"$'\n'; }
warn() { WARNINGS=$((WARNINGS+1)); REPORT+="  WARNING $1: $2"$'\n'; }
info() { INFOS=$((INFOS+1));     REPORT+="  INFO    $1: $2"$'\n'; }

CONTENT=$(<"$ARTIFACT")

# ── Metadata (M) ─────────────────────────────────────────────────────────────

if echo "$CONTENT" | grep -q '^---'; then
    FRONT_MATTER=$(echo "$CONTENT" | awk '/^---/{n++; if(n==2) exit} n>=1{print}')

    if echo "$FRONT_MATTER" | grep -qE 'session_id:[[:space:]]+[^[:space:]]'; then :; else
        err "EM-002" "session_id field required"
    fi
    if echo "$FRONT_MATTER" | grep -qE 'created_at:[[:space:]]+[^[:space:]]'; then :; else
        err "EM-003" "created_at field required"
    fi
    if echo "$FRONT_MATTER" | grep -qE 'status:[[:space:]]+"?(draft|active|closed)'; then :; else
        err "EM-004" "status field required (draft|active|closed)"
    fi
    if echo "$FRONT_MATTER" | grep -q 'contributors'; then :; else
        warn "WM-001" "contributors list recommended"
    fi

    SESSION_ID=$(echo "$FRONT_MATTER" | grep 'session_id:' | sed 's/.*session_id:[[:space:]]*"*//; s/"*[[:space:]]*$//' || true)
    if echo "$SESSION_ID" | grep -qE '^RS-[0-9]{8}-[a-z0-9-]+$'; then :; else
        info "IM-001" "session_id doesn't follow RS-YYYYMMDD-slug convention (got: $SESSION_ID)"
    fi
    if echo "$FRONT_MATTER" | grep -qE 'version:[[:space:]]+[0-9]'; then :; else
        info "IM-002" "Version number not present"
    fi
else
    err "EM-001" "Metadata header (YAML front matter) must be present"
fi

# ── Structure (S) ────────────────────────────────────────────────────────────

REQUIRED_SECTIONS=(
    "## 1. Research Thread"
    "## 2. Hypothesis Slate"
    "## 3. Predictions Table"
    "## 4. Discriminative Tests"
    "## 5. Assumption Ledger"
    "## 6. Anomaly Register"
    "## 7. Adversarial Critique"
)

PREV_POS=0
for section in "${REQUIRED_SECTIONS[@]}"; do
    POS=$(echo "$CONTENT" | grep -n "^${section}" | head -1 | cut -d: -f1 || true)
    if [[ -z "$POS" ]]; then
        err "ES-001" "Required section missing: $section"
    else
        if [[ "$POS" -le "$PREV_POS" ]]; then
            err "ES-002" "Section out of order: $section (line $POS <= previous at $PREV_POS)"
        fi
        PREV_POS=$POS
    fi
done

# ── Research Thread (R) ──────────────────────────────────────────────────────

if echo "$CONTENT" | grep -q '\*\*RT\*\*:'; then :; else
    err "ER-001" "Research thread statement (**RT**:) not found"
fi
if echo "$CONTENT" | grep -q '\*\*Context\*\*:'; then :; else
    err "ER-002" "Context section (**Context**:) not found"
fi
if echo "$CONTENT" | grep -q '\*\*Anchors\*\*:'; then :; else
    warn "WR-001" "Anchors section (**Anchors**:) not found"
fi
if echo "$CONTENT" | grep -q '\*\*Why it matters\*\*:'; then :; else
    info "IR-001" "Why it matters section not found"
fi

# ── Hypothesis Slate (H) ────────────────────────────────────────────────────

H_COUNT=$(echo "$CONTENT" | grep -cE '^### H[0-9]+:' || true)
if [[ "$H_COUNT" -lt 3 ]]; then
    err "EH-001" "Minimum 3 hypotheses required (found $H_COUNT)"
fi
if [[ "$H_COUNT" -gt 6 ]]; then
    err "EH-002" "Maximum 6 hypotheses (found $H_COUNT)"
fi
if echo "$CONTENT" | grep -qiE '[Tt]hird[[:space:]]+[Aa]lternative'; then :; else
    err "EH-003" "Third alternative not explicitly labeled"
fi

H_BLOCKS=$(echo "$CONTENT" | awk '/^### H[0-9]+:/{p=1} p && /^## [0-9]+\./{p=0} p{print}')
CLAIM_COUNT=$(echo "$H_BLOCKS" | grep -cE '^\*\*Claim\*\*:' || true)
if [[ "$CLAIM_COUNT" -lt "$H_COUNT" ]]; then
    err "EH-004" "Not all hypotheses have **Claim** field ($CLAIM_COUNT of $H_COUNT)"
fi
ANCHOR_IN_H=$(echo "$H_BLOCKS" | grep -cE '^\*\*Anchors\*\*:' || true)
if [[ "$ANCHOR_IN_H" -lt "$H_COUNT" ]]; then
    NON_THIRD=$((H_COUNT - 1))
    if [[ "$ANCHOR_IN_H" -lt "$NON_THIRD" ]]; then
        warn "WH-001" "Not all non-third hypotheses have anchors ($ANCHOR_IN_H anchors for $NON_THIRD non-third hypotheses)"
    fi
fi
MECHANISM_COUNT=$(echo "$H_BLOCKS" | grep -cE '^\*\*(Mechanism|How this could be true)\*\*:' || true)
if [[ "$MECHANISM_COUNT" -lt "$H_COUNT" ]]; then
    info "IH-001" "Not all hypotheses have Mechanism field ($MECHANISM_COUNT of $H_COUNT)"
fi

# ── Predictions Table (P) ───────────────────────────────────────────────────

PRED_SECTION=$(echo "$CONTENT" | awk '/^## 3\. Predictions Table/{p=1; next} p && /^## [0-9]+\./{p=0} p{print}')
PRED_ROWS=$(echo "$PRED_SECTION" | grep -cE '^\|[^-]' || true)
PRED_DATA_ROWS=$((PRED_ROWS > 1 ? PRED_ROWS - 1 : 0))
if [[ "$PRED_DATA_ROWS" -lt 3 ]]; then
    err "EP-001" "Minimum 3 predictions required (found $PRED_DATA_ROWS data rows)"
fi
if echo "$PRED_SECTION" | grep -qE '^\|[[:space:]]*ID[[:space:]]*\|'; then :; else
    err "EP-002" "Predictions table missing ID column"
fi
if echo "$PRED_SECTION" | grep -q 'H1'; then :; else
    err "EP-003" "Predictions table missing hypothesis columns (no H1 found)"
fi

# ── Discriminative Tests (T) ────────────────────────────────────────────────

T_COUNT=$(echo "$CONTENT" | grep -cE '^### T[0-9]+:' || true)
if [[ "$T_COUNT" -lt 2 ]]; then
    err "ET-001" "Minimum 2 discriminative tests required (found $T_COUNT)"
fi

T_BLOCKS=$(echo "$CONTENT" | awk '/^### T[0-9]+:/{p=1} p && /^## [0-9]+\./{p=0} p{print}')
PROC_COUNT=$(echo "$T_BLOCKS" | grep -cE '^\*\*Procedure\*\*:' || true)
if [[ "$PROC_COUNT" -lt "$T_COUNT" ]]; then
    err "ET-002" "Not all tests have **Procedure** field ($PROC_COUNT of $T_COUNT)"
fi
OUTCOME_COUNT=$(echo "$T_BLOCKS" | grep -cE '^\*\*Expected outcomes\*\*:' || true)
if [[ "$OUTCOME_COUNT" -lt "$T_COUNT" ]]; then
    err "ET-003" "Not all tests have **Expected outcomes** ($OUTCOME_COUNT of $T_COUNT)"
fi
POTENCY_COUNT=$(echo "$T_BLOCKS" | grep -cE '^\*\*Potency check\*\*:' || true)
if [[ "$POTENCY_COUNT" -lt "$T_COUNT" ]]; then
    warn "WT-001" "Not all tests have potency check ($POTENCY_COUNT of $T_COUNT)"
fi
SCORE_COUNT=$(echo "$T_BLOCKS" | grep -c 'LR=' || true)
if [[ "$SCORE_COUNT" -lt "$T_COUNT" ]]; then
    warn "WT-003" "Not all tests have score breakdown ($SCORE_COUNT of $T_COUNT)"
fi

# ── Assumption Ledger (A) ───────────────────────────────────────────────────

A_COUNT=$(echo "$CONTENT" | grep -cE '^### A[0-9]+:' || true)
if [[ "$A_COUNT" -lt 3 ]]; then
    err "EA-001" "Minimum 3 assumptions required (found $A_COUNT)"
fi
if echo "$CONTENT" | grep -qiE '^### A[0-9]+:.*[Ss]cale|^### A[0-9]+:.*[Pp]hysics'; then :; else
    err "EA-002" "No scale/physics check found in assumption headers"
fi
A_BLOCKS=$(echo "$CONTENT" | awk '/^### A[0-9]+:/{p=1} p && /^## [0-9]+\./{p=0} p{print}')
STMT_COUNT=$(echo "$A_BLOCKS" | grep -cE '^\*\*Statement\*\*:' || true)
if [[ "$STMT_COUNT" -lt "$A_COUNT" ]]; then
    err "EA-003" "Not all assumptions have **Statement** field ($STMT_COUNT of $A_COUNT)"
fi

# ── Anomaly Register (X) ────────────────────────────────────────────────────

X_COUNT=$(echo "$CONTENT" | grep -cE '^### X[0-9]+:' || true)
if [[ "$X_COUNT" -eq 0 ]]; then
    if echo "$CONTENT" | grep -qi 'None registered'; then
        warn "WX-001" "Anomaly register has 'None registered' — genuine anomalies expected from a thorough session"
    else
        err "EX-002" "Empty anomaly register must state 'None registered' or contain anomalies"
    fi
fi

# ── Adversarial Critique (C) ────────────────────────────────────────────────

C_COUNT=$(echo "$CONTENT" | grep -cE '^### C[0-9]+:' || true)
if [[ "$C_COUNT" -lt 3 ]]; then
    err "EC-001" "Minimum 3 adversarial critiques required (found $C_COUNT)"
fi
C_BLOCKS=$(echo "$CONTENT" | awk '/^### C[0-9]+:/{p=1} p && /^## [0-9]+\./{p=0} p{print}')
ATTACK_COUNT=$(echo "$C_BLOCKS" | grep -cE '^\*\*Attack\*\*:' || true)
if [[ "$ATTACK_COUNT" -lt "$C_COUNT" ]]; then
    err "EC-002" "Not all critiques have **Attack** field ($ATTACK_COUNT of $C_COUNT)"
fi

# ── Report ───────────────────────────────────────────────────────────────────

echo "Artifact Linter Report"
echo "======================"
echo "Artifact: $ARTIFACT"

VALID="VALID"
EXIT_CODE=0
if [[ "$ERRORS" -gt 0 ]]; then
    VALID="INVALID"
    EXIT_CODE=1
fi

echo "Status: $VALID ($ERRORS errors, $WARNINGS warnings, $INFOS info)"
echo ""

echo "Section counts:"
echo "  Hypotheses: $H_COUNT | Predictions: $PRED_DATA_ROWS | Tests: $T_COUNT"
echo "  Assumptions: $A_COUNT | Anomalies: $X_COUNT | Critiques: $C_COUNT"
echo ""

if [[ -n "$REPORT" ]]; then
    echo "Details:"
    echo "$REPORT"
fi

exit $EXIT_CODE
