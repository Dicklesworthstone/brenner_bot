/**
 * Prompt Builder - generates kickoff and role prompts from selected operators
 *
 * This module takes a set of selected operators and generates:
 * 1. A kickoff prompt summarizing the selected operators
 * 2. Role-specific prompts (Codex, Opus, Gemini) with operator guardrails
 */

import type { BrennerOperatorPaletteEntry } from "./operators";

// ============================================================================
// Types
// ============================================================================

export interface PromptBundle {
  kickoff: string;
  roles: {
    codex: string;
    opus: string;
    gemini: string;
  };
  selectedOperators: string[];
  generatedAt: string;
}

// ============================================================================
// Operator to Role Mapping
// ============================================================================

const OPERATOR_ROLE_AFFINITY: Record<string, "codex" | "opus" | "gemini"> = {
  "level-split": "codex",
  "cross-domain": "codex",
  "paradox-hunt": "codex",
  recode: "codex",
  "exclusion-test": "opus",
  materialize: "opus",
  "object-transpose": "opus",
  amplify: "opus",
  diy: "opus",
  "exception-quarantine": "gemini",
  "theory-kill": "gemini",
  "scale-check": "gemini",
  dephase: "gemini",
  "invariant-extract": "codex",
};

const ROLE_NAMES = {
  codex: "Hypothesis Generator (Codex)",
  opus: "Test Designer (Opus)",
  gemini: "Adversarial Critic (Gemini)",
};

// ============================================================================
// Prompt Generation
// ============================================================================

function generateKickoffPrompt(operators: BrennerOperatorPaletteEntry[]): string {
  const operatorList = operators
    .map((op) => `- **${op.symbol} ${op.title}** (\`${op.canonicalTag}\`): ${op.definition}`)
    .join("\n");

  const triggersList = operators
    .flatMap((op) => op.whenToUseTriggers.slice(0, 2))
    .slice(0, 6)
    .map((t) => `- ${t}`)
    .join("\n");

  const failuresList = operators
    .flatMap((op) => op.failureModes.slice(0, 1))
    .slice(0, 4)
    .map((f) => `- ${f}`)
    .join("\n");

  return `# Brenner Protocol Session Kickoff

## Selected Operators

${operatorList}

## When to Apply These Operators

${triggersList}

## Failure Modes to Avoid

${failuresList}

---

**Instructions**: Use these operators as cognitive guardrails throughout the session. Cite transcript anchors (§n) when referencing Brenner's approach. Output structured deltas, not prose.
`;
}

function generateRolePrompt(
  role: "codex" | "opus" | "gemini",
  operators: BrennerOperatorPaletteEntry[],
): string {
  const roleName = ROLE_NAMES[role];
  const primaryOps = operators.filter((op) => OPERATOR_ROLE_AFFINITY[op.canonicalTag] === role);
  const supportingOps = operators.filter((op) => OPERATOR_ROLE_AFFINITY[op.canonicalTag] !== role);

  const roleIntros: Record<"codex" | "opus" | "gemini", string> = {
    codex: `You are a HYPOTHESIS GENERATOR in a Brenner Protocol research session.

## Your Role

You generate candidate hypotheses by hunting for paradoxes, importing cross-domain patterns, and rigorously separating levels of explanation.`,

    opus: `You are a TEST DESIGNER in a Brenner Protocol research session.

## Your Role

You convert hypotheses into discriminative tests—experiments designed to KILL models, not just collect data. Every test must include a potency check.`,

    gemini: `You are the ADVERSARIAL CRITIC in a Brenner Protocol research session.

## Your Role

You attack the current framing. You find what would make everything wrong. You check scale constraints and quarantine anomalies. You are the immune system against self-deception.`,
  };

  const operatorSections = (ops: BrennerOperatorPaletteEntry[], isPrimary: boolean) =>
    ops
      .map((op) => {
        const triggers = op.whenToUseTriggers
          .slice(0, 2)
          .map((t) => `- ${t}`)
          .join("\n");
        const failure = op.failureModes[0] || "None specified";
        return `### ${op.symbol} ${op.title}${isPrimary ? " (Primary)" : ""}

${op.definition}

**When to use:**
${triggers}

**Failure mode to avoid:** ${failure}`;
      })
      .join("\n\n");

  const primarySection =
    primaryOps.length > 0
      ? `## Your Primary Operators

${operatorSections(primaryOps, true)}`
      : "";

  const supportingSection =
    supportingOps.length > 0
      ? `## Supporting Operators

${operatorSections(supportingOps, false)}`
      : "";

  const citationRules = `## Citation Rules

When you claim "Brenner said X" or reference his approach:
- You MUST include a transcript anchor: §n (where n is the section number)
- If you cannot find an anchor, mark the claim as [inference] not a Brenner quote
- Example: "Brenner emphasized 'reduction to one dimension' (§58)"`;

  const outputFormat =
    role === "codex"
      ? `## Output Format

All contributions MUST use the delta format:

\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Your hypothesis name",
    "claim": "One-sentence claim",
    "mechanism": "How it would work",
    "anchors": ["§n", ...] or ["inference"]
  },
  "rationale": "Why this hypothesis is worth considering"
}
\`\`\``
      : role === "opus"
        ? `## Output Format

All tests MUST use the delta format:

\`\`\`delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": {
    "name": "Test name",
    "procedure": "What you would do",
    "discriminates": "H1 vs H2",
    "expected_outcomes": {
      "H1": "What you'd observe if H1 is true",
      "H2": "What you'd observe if H2 is true"
    },
    "potency_check": "How you verify the assay worked",
    "score": { "likelihood_ratio": 0-3, "cost": 0-3, "speed": 0-3, "ambiguity": 0-3 }
  },
  "rationale": "Why this test maximizes evidence per week"
}
\`\`\``
        : `## Output Format

All critiques MUST use the delta format:

\`\`\`delta
{
  "operation": "ADD",
  "section": "adversarial_critique",
  "target_id": null,
  "payload": {
    "name": "Short critique label",
    "attack": "What's wrong",
    "evidence": "Why it's wrong",
    "current_status": "active",
    "real_third_alternative": true
  },
  "rationale": "Why this critique matters"
}
\`\`\``;

  return `# ${roleName}

${roleIntros[role]}

## Operating Constraints

You MUST:
1. Apply the selected operators as cognitive guardrails
2. Cite transcript anchors (§n) when referencing Brenner's approach
3. Output structured deltas, not narrative prose
4. Check for level confusions before proposing any mechanism

${primarySection}

${supportingSection}

${citationRules}

${outputFormat}

## Checklist Before Submitting

Before sending any delta:
[ ] Have I applied the relevant operators?
[ ] Do my anchors cite actual transcript sections?
[ ] Have I checked for level confusions?
[ ] Is this output actionable, not just commentary?
`;
}

// ============================================================================
// Main Export
// ============================================================================

export function generatePromptBundle(
  selectedOperators: BrennerOperatorPaletteEntry[],
): PromptBundle {
  if (selectedOperators.length === 0) {
    return {
      kickoff: "No operators selected. Select operators from the palette to generate prompts.",
      roles: {
        codex: "",
        opus: "",
        gemini: "",
      },
      selectedOperators: [],
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    kickoff: generateKickoffPrompt(selectedOperators),
    roles: {
      codex: generateRolePrompt("codex", selectedOperators),
      opus: generateRolePrompt("opus", selectedOperators),
      gemini: generateRolePrompt("gemini", selectedOperators),
    },
    selectedOperators: selectedOperators.map((op) => op.canonicalTag),
    generatedAt: new Date().toISOString(),
  };
}
