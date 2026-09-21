/**
 * artifact-to-memory.ts
 *
 * Extracts procedural memory rules from compiled Brenner Protocol artifacts.
 * Rules are formatted for `cm playbook add --file rules.json`.
 *
 * The extraction identifies generalizable, actionable patterns from:
 * - discriminative_tests: test design patterns (→ evidence-per-week)
 * - assumption_ledger: scale checks and verification patterns (→ evidence-per-week, prompt-hygiene)
 * - adversarial_critique: anti-patterns and third alternatives (→ prompt-hygiene)
 * - anomaly_register: exception patterns to watch for (→ evidence-per-week)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PlaybookCategory =
  | "protocol-kernel"
  | "prompt-hygiene"
  | "evidence-per-week"
  | "thread-operations"
  | "artifact-compilation"
  | "safety-and-gating";

export interface MemoryRule {
  /** The rule text, should be actionable ("if/when X, do Y") */
  rule: string;
  /** cm playbook category */
  category: PlaybookCategory;
  /** Where this rule was learned (thread id, artifact path) */
  provenance: string;
  /** Why this rule was learned (1 sentence) */
  rationale: string;
  /** Source item ID from the artifact (e.g., "T1", "A2", "C1") */
  sourceId: string;
  /** Confidence level based on extraction heuristics */
  confidence: "high" | "medium" | "low";
}

export interface MemoryExport {
  /** Artifact metadata */
  sourceArtifact: {
    sessionId: string;
    version: number;
    exportedAt: string;
  };
  /** Extracted rules */
  rules: MemoryRule[];
  /** Summary statistics */
  stats: {
    totalExtracted: number;
    byCategory: Record<PlaybookCategory, number>;
    byConfidence: Record<"high" | "medium" | "low", number>;
  };
}

// Artifact input types (subset of what we need)
export interface ArtifactInput {
  metadata: {
    session_id: string;
    version: number;
  };
  sections: {
    discriminative_tests?: DiscriminativeTest[];
    assumption_ledger?: Assumption[];
    adversarial_critique?: Critique[];
    anomaly_register?: Anomaly[];
    hypothesis_slate?: Hypothesis[];
  };
}

interface DiscriminativeTest {
  id: string;
  name: string;
  procedure?: string;
  discriminates: string;
  expected_outcomes: Record<string, string>;
  potency_check?: string;
  feasibility?: string;
  score?: {
    likelihood_ratio?: number;
    cost?: number;
    speed?: number;
    ambiguity?: number;
  };
}

interface Assumption {
  id: string;
  name: string;
  statement: string;
  load: string;
  test?: string;
  status?: "verified" | "unchecked" | "falsified";
  scale_check?: boolean;
  calculation?: string;
  implication?: string;
}

interface Critique {
  id: string;
  name: string;
  attack: string;
  evidence?: string;
  current_status?: string;
  real_third_alternative?: boolean;
}

interface Anomaly {
  id: string;
  name: string;
  observation: string;
  expected?: string;
  actual?: string;
  implications?: string;
  status?: string;
}

interface Hypothesis {
  id: string;
  name: string;
  claim: string;
  third_alternative?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract procedural memory rules from a compiled artifact.
 *
 * Rules are extracted when they meet hygiene criteria:
 * - Generalizable (likely true for future sessions)
 * - Actionable ("if/when X, do Y")
 * - Reduces repeat failure or improves evidence-per-week
 */
export function extractMemoryRules(artifact: ArtifactInput): MemoryExport {
  const rules: MemoryRule[] = [];
  const sessionId = artifact.metadata.session_id;
  const provenance = `Thread: ${sessionId}`;

  // Extract from discriminative tests
  const testRules = extractFromTests(artifact.sections.discriminative_tests || [], provenance);
  rules.push(...testRules);

  // Extract from assumption ledger
  const assumptionRules = extractFromAssumptions(
    artifact.sections.assumption_ledger || [],
    provenance,
  );
  rules.push(...assumptionRules);

  // Extract from adversarial critique
  const critiqueRules = extractFromCritiques(
    artifact.sections.adversarial_critique || [],
    provenance,
  );
  rules.push(...critiqueRules);

  // Extract from anomaly register
  const anomalyRules = extractFromAnomalies(artifact.sections.anomaly_register || [], provenance);
  rules.push(...anomalyRules);

  // Extract from hypothesis slate (third alternatives)
  const hypothesisRules = extractFromHypotheses(
    artifact.sections.hypothesis_slate || [],
    provenance,
  );
  rules.push(...hypothesisRules);

  // Compute stats
  const stats = computeStats(rules);

  return {
    sourceArtifact: {
      sessionId,
      version: artifact.metadata.version,
      exportedAt: new Date().toISOString(),
    },
    rules,
    stats,
  };
}

/**
 * Extract rules from discriminative tests.
 * Patterns: high likelihood ratio, potency controls, digital handles.
 */
function extractFromTests(tests: DiscriminativeTest[], provenance: string): MemoryRule[] {
  const rules: MemoryRule[] = [];

  for (const test of tests) {
    // Pattern: Tests with potency controls
    if (test.potency_check) {
      rules.push({
        rule: `When designing discriminative tests, always include potency controls. Example from ${test.name}: "${test.potency_check}"`,
        category: "evidence-per-week",
        provenance,
        rationale: `Test ${test.id} demonstrated value of potency verification.`,
        sourceId: test.id,
        confidence: "high",
      });
    }

    // Pattern: Tests with high likelihood ratio and low ambiguity
    if (
      test.score?.likelihood_ratio !== undefined &&
      test.score.likelihood_ratio >= 3 &&
      test.score?.ambiguity !== undefined &&
      test.score.ambiguity <= 2
    ) {
      rules.push({
        rule: `Prefer tests with high likelihood ratios (≥3) and low ambiguity (≤2). Example: ${test.name} achieves clean separation between ${test.discriminates}.`,
        category: "evidence-per-week",
        provenance,
        rationale: `Test ${test.id} exemplifies "across-the-room differences" principle.`,
        sourceId: test.id,
        confidence: "high",
      });
    }

    // Pattern: Tests that separate specific hypotheses explicitly
    if (test.discriminates && Object.keys(test.expected_outcomes).length >= 2) {
      const outcomes = Object.entries(test.expected_outcomes)
        .map(([h, o]) => `${h}: ${o}`)
        .join("; ");
      rules.push({
        rule: `Document expected outcomes for each hypothesis when designing tests. Pattern: ${outcomes}`,
        category: "evidence-per-week",
        provenance,
        rationale: `Test ${test.id} shows clear outcome documentation pattern.`,
        sourceId: test.id,
        confidence: "medium",
      });
    }
  }

  return rules;
}

/**
 * Extract rules from assumption ledger.
 * Patterns: scale checks, load-bearing assumptions, verification status.
 */
function extractFromAssumptions(assumptions: Assumption[], provenance: string): MemoryRule[] {
  const rules: MemoryRule[] = [];

  for (const assumption of assumptions) {
    // Pattern: Scale checks
    if (assumption.scale_check && assumption.calculation) {
      rules.push({
        rule: `When hypotheses depend on physical processes, perform scale calculations to verify plausibility. Pattern: ${assumption.name} - check if ${assumption.statement}`,
        category: "evidence-per-week",
        provenance,
        rationale: `Assumption ${assumption.id} demonstrates scale check methodology: ${assumption.implication || "validates physical plausibility"}`,
        sourceId: assumption.id,
        confidence: "high",
      });
    }

    // Pattern: Verified assumptions with high load
    if (assumption.status === "verified" && assumption.load) {
      rules.push({
        rule: `Verify load-bearing assumptions early. "${assumption.name}" was load-bearing: if wrong, ${assumption.load}`,
        category: "prompt-hygiene",
        provenance,
        rationale: `Assumption ${assumption.id} shows importance of early verification.`,
        sourceId: assumption.id,
        confidence: "medium",
      });
    }

    // Pattern: Unchecked assumptions with high load
    if (assumption.status === "unchecked" && assumption.load && assumption.test) {
      rules.push({
        rule: `Flag unchecked assumptions with high load. Pattern: "${assumption.statement}" can be tested via: ${assumption.test}`,
        category: "prompt-hygiene",
        provenance,
        rationale: `Assumption ${assumption.id} identified as needing verification.`,
        sourceId: assumption.id,
        confidence: "low",
      });
    }
  }

  return rules;
}

/**
 * Extract rules from adversarial critiques.
 * Patterns: third alternatives, anti-patterns, framing assumptions.
 */
function extractFromCritiques(critiques: Critique[], provenance: string): MemoryRule[] {
  const rules: MemoryRule[] = [];

  for (const critique of critiques) {
    // Pattern: Real third alternatives
    if (critique.real_third_alternative) {
      rules.push({
        rule: `Always consider third alternatives that invalidate the initial framing. Example: "${critique.name}" - ${critique.attack}`,
        category: "prompt-hygiene",
        provenance,
        rationale: `Critique ${critique.id} identified a genuine third alternative beyond the original hypothesis space.`,
        sourceId: critique.id,
        confidence: "high",
      });
    }

    // Pattern: Critiques with high priority status
    if (critique.current_status?.toLowerCase().includes("high priority")) {
      rules.push({
        rule: `Investigate critiques marked high priority before proceeding. Pattern: "${critique.name}" identified as high priority.`,
        category: "evidence-per-week",
        provenance,
        rationale: `Critique ${critique.id} flagged for urgent investigation.`,
        sourceId: critique.id,
        confidence: "medium",
      });
    }

    // Pattern: Critiques with evidence
    if (critique.evidence) {
      rules.push({
        rule: `Ground critiques in specific evidence, not vague skepticism. Pattern: ${critique.attack} supported by: ${critique.evidence}`,
        category: "prompt-hygiene",
        provenance,
        rationale: `Critique ${critique.id} demonstrates evidence-grounded criticism.`,
        sourceId: critique.id,
        confidence: "medium",
      });
    }
  }

  return rules;
}

/**
 * Extract rules from anomaly register.
 * Patterns: exception patterns, "Occam's broom" violations.
 */
function extractFromAnomalies(anomalies: Anomaly[], provenance: string): MemoryRule[] {
  const rules: MemoryRule[] = [];

  for (const anomaly of anomalies) {
    // Pattern: Documented anomalies (don't sweep under Occam's broom)
    if (anomaly.observation && anomaly.implications) {
      rules.push({
        rule: `Document anomalies explicitly; don't sweep exceptions under Occam's broom. Pattern: "${anomaly.observation}" has implications: ${anomaly.implications}`,
        category: "evidence-per-week",
        provenance,
        rationale: `Anomaly ${anomaly.id} exemplifies proper exception tracking.`,
        sourceId: anomaly.id,
        confidence: "medium",
      });
    }

    // Pattern: Expected vs actual discrepancies
    if (anomaly.expected && anomaly.actual) {
      rules.push({
        rule: `Track expected vs actual outcomes explicitly. "${anomaly.name}": expected ${anomaly.expected}, observed ${anomaly.actual}.`,
        category: "evidence-per-week",
        provenance,
        rationale: `Anomaly ${anomaly.id} shows discrepancy documentation pattern.`,
        sourceId: anomaly.id,
        confidence: "medium",
      });
    }
  }

  return rules;
}

/**
 * Extract rules from hypothesis slate.
 * Patterns: third alternative inclusion.
 */
function extractFromHypotheses(hypotheses: Hypothesis[], provenance: string): MemoryRule[] {
  const rules: MemoryRule[] = [];

  // Pattern: Check if third alternative was included
  const hasThirdAlt = hypotheses.some((h) => h.third_alternative);
  if (hasThirdAlt) {
    const thirdAlt = hypotheses.find((h) => h.third_alternative);
    if (thirdAlt) {
      rules.push({
        rule: `Always include a "third alternative" hypothesis that challenges the initial framing. Pattern: "${thirdAlt.claim}"`,
        category: "protocol-kernel",
        provenance,
        rationale: `Hypothesis ${thirdAlt.id} demonstrates third alternative inclusion.`,
        sourceId: thirdAlt.id,
        confidence: "high",
      });
    }
  }

  return rules;
}

/**
 * Compute summary statistics for the export.
 */
function computeStats(rules: MemoryRule[]): MemoryExport["stats"] {
  const byCategory: Record<PlaybookCategory, number> = {
    "protocol-kernel": 0,
    "prompt-hygiene": 0,
    "evidence-per-week": 0,
    "thread-operations": 0,
    "artifact-compilation": 0,
    "safety-and-gating": 0,
  };

  const byConfidence: Record<"high" | "medium" | "low", number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const rule of rules) {
    byCategory[rule.category]++;
    byConfidence[rule.confidence]++;
  }

  return {
    totalExtracted: rules.length,
    byCategory,
    byConfidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Output Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format rules for cm playbook add --file.
 * Filters to high-confidence rules by default.
 */
export function formatForPlaybook(
  exportData: MemoryExport,
  options: { minConfidence?: "high" | "medium" | "low" } = {},
): string {
  const minConfidence = options.minConfidence ?? "medium";
  const confidenceLevels = { high: 3, medium: 2, low: 1 };

  const filteredRules = exportData.rules.filter(
    (r) => confidenceLevels[r.confidence] >= confidenceLevels[minConfidence],
  );

  const output = {
    meta: exportData.sourceArtifact,
    rules: filteredRules.map((r) => ({
      rule: `Rule: ${r.rule} [Provenance: ${r.provenance}]`,
      category: r.category,
    })),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Format rules as human-readable markdown for review.
 */
export function formatForReview(exportData: MemoryExport): string {
  const lines: string[] = [
    `# Memory Export Review`,
    ``,
    `**Source**: ${exportData.sourceArtifact.sessionId} (v${exportData.sourceArtifact.version})`,
    `**Exported**: ${exportData.sourceArtifact.exportedAt}`,
    `**Total rules**: ${exportData.stats.totalExtracted}`,
    ``,
    `## Statistics`,
    ``,
    `| Category | Count |`,
    `|----------|-------|`,
  ];

  for (const [cat, count] of Object.entries(exportData.stats.byCategory)) {
    if (count > 0) {
      lines.push(`| ${cat} | ${count} |`);
    }
  }

  lines.push(``);
  lines.push(`| Confidence | Count |`);
  lines.push(`|------------|-------|`);
  for (const [conf, count] of Object.entries(exportData.stats.byConfidence)) {
    if (count > 0) {
      lines.push(`| ${conf} | ${count} |`);
    }
  }

  lines.push(``);
  lines.push(`## Extracted Rules`);
  lines.push(``);

  // Group by category
  const byCategory = new Map<PlaybookCategory, MemoryRule[]>();
  for (const rule of exportData.rules) {
    const existing = byCategory.get(rule.category) || [];
    existing.push(rule);
    byCategory.set(rule.category, existing);
  }

  for (const [category, rules] of byCategory) {
    lines.push(`### ${category}`);
    lines.push(``);
    for (const rule of rules) {
      lines.push(`- **[${rule.confidence}]** ${rule.rule}`);
      lines.push(`  - *Source*: ${rule.sourceId}`);
      lines.push(`  - *Rationale*: ${rule.rationale}`);
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(`*Human review required before adding to cm playbook.*`);

  return lines.join("\n");
}
