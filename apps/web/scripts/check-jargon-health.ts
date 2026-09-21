#!/usr/bin/env bun
/**
 * Jargon Dictionary Health Check
 *
 * Comprehensive validation of the jargon dictionary for quality and consistency.
 * Checks for structural issues, style violations, and best practices.
 *
 * Run: bun run scripts/check-jargon-health.ts
 *      bun run scripts/check-jargon-health.ts --verbose  # Show all checks including passing
 *      bun run scripts/check-jargon-health.ts --fix      # Show fix suggestions
 */

import { getMatchableTerms, type JargonCategory, jargonDictionary } from "../src/lib/jargon";

// ============================================================================
// Configuration
// ============================================================================

const VALID_CATEGORIES: JargonCategory[] = [
  "operators",
  "brenner",
  "biology",
  "bayesian",
  "method",
  "project",
];

const SHORT_DESCRIPTION_MIN = 30;
const SHORT_DESCRIPTION_MAX = 120;
const LONG_DESCRIPTION_MIN = 80;
const LONG_DESCRIPTION_MAX = 600;
const RELATED_MIN = 2;
const RELATED_MAX = 4;
const SECTION_REF_MIN = 1;
const SECTION_REF_MAX = 236;

// Patterns that suggest dumbed-down or condescending language
const CONDESCENDING_PATTERNS = [
  /\bbasically\b/i,
  /\bsimply put\b/i,
  /\bin simple terms\b/i,
  /\bjust think of\b/i,
  /\bfor dummies\b/i,
  /\bit's like when\b/i,
  /\bimagine if\b/i,
  /\bpretend that\b/i,
];

// Categories that should have "why" fields explaining Brenner context
const CATEGORIES_REQUIRING_WHY: JargonCategory[] = ["operators", "brenner"];

// ============================================================================
// Issue tracking
// ============================================================================

interface Issue {
  severity: "error" | "warning" | "info";
  category: string;
  key: string;
  message: string;
  fix?: string;
}

const issues: Issue[] = [];
const verbose = process.argv.includes("--verbose");
const showFixes = process.argv.includes("--fix");

function addIssue(
  severity: Issue["severity"],
  category: string,
  key: string,
  message: string,
  fix?: string,
) {
  issues.push({ severity, category, key, message, fix });
}

// ============================================================================
// Checks
// ============================================================================

const allKeys = new Set(Object.keys(jargonDictionary));
const allEntries = Object.entries(jargonDictionary);

// Track which terms are referenced by others
const referencedBy = new Map<string, string[]>();
for (const [key, term] of allEntries) {
  if (term.related) {
    for (const ref of term.related) {
      const existing = referencedBy.get(ref) || [];
      existing.push(key);
      referencedBy.set(ref, existing);
    }
  }
}

// --------------------------------------------------------------------------
// 1. Duplicate display terms
// --------------------------------------------------------------------------

const termToKeys = new Map<string, string[]>();
for (const [key, term] of allEntries) {
  const lower = term.term.toLowerCase();
  const existing = termToKeys.get(lower) || [];
  existing.push(key);
  termToKeys.set(lower, existing);
}

for (const [term, keys] of termToKeys) {
  if (keys.length > 1) {
    addIssue(
      "error",
      "duplicates",
      keys.join(", "),
      `Duplicate display term "${term}"`,
      `Remove one entry or differentiate their term.term values`,
    );
  }
}

// --------------------------------------------------------------------------
// 2. Broken and self-referencing related arrays
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  if (term.related) {
    for (const ref of term.related) {
      if (!allKeys.has(ref)) {
        addIssue(
          "error",
          "references",
          key,
          `Invalid related reference: "${ref}"`,
          `Remove "${ref}" or add it to the dictionary`,
        );
      }
    }
    if (term.related.includes(key)) {
      addIssue("warning", "references", key, "Self-reference in related array");
    }
  }
}

// --------------------------------------------------------------------------
// 3. Em-dashes (should use semicolons or commas)
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  const fields = [term.short, term.long, term.analogy, term.why];
  for (const field of fields) {
    if (field?.includes("—")) {
      addIssue(
        "warning",
        "style",
        key,
        "Contains em-dash (—)",
        "Replace with semicolon, colon, or recast sentence",
      );
      break;
    }
  }
}

// --------------------------------------------------------------------------
// 4. "Think of it like" and condescending patterns
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  if (term.analogy?.toLowerCase().includes("think of it like")) {
    addIssue(
      "warning",
      "style",
      key,
      'Analogy starts with "Think of it like"',
      "Remove prefix; start directly with the analogy",
    );
  }

  const allText = [term.short, term.long, term.analogy, term.why].join(" ");
  for (const pattern of CONDESCENDING_PATTERNS) {
    if (pattern.test(allText)) {
      addIssue(
        "warning",
        "style",
        key,
        `Contains condescending pattern: ${pattern.source}`,
        "Rephrase for a sophisticated audience",
      );
      break;
    }
  }
}

// --------------------------------------------------------------------------
// 5. Description length validation
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  const shortLen = term.short.length;
  if (shortLen < SHORT_DESCRIPTION_MIN) {
    addIssue(
      "info",
      "length",
      key,
      `Short description too brief (${shortLen} chars, min ${SHORT_DESCRIPTION_MIN})`,
    );
  } else if (shortLen > SHORT_DESCRIPTION_MAX) {
    addIssue(
      "info",
      "length",
      key,
      `Short description too long (${shortLen} chars, max ${SHORT_DESCRIPTION_MAX})`,
    );
  }

  const longLen = term.long.length;
  if (longLen < LONG_DESCRIPTION_MIN) {
    addIssue(
      "info",
      "length",
      key,
      `Long description too brief (${longLen} chars, min ${LONG_DESCRIPTION_MIN})`,
    );
  } else if (longLen > LONG_DESCRIPTION_MAX) {
    addIssue(
      "info",
      "length",
      key,
      `Long description very long (${longLen} chars, max ${LONG_DESCRIPTION_MAX})`,
    );
  }
}

// --------------------------------------------------------------------------
// 6. Transcript section references (§n format)
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  const whyText = term.why || "";
  // Use matchAll to avoid lastIndex state issues with global regex
  for (const match of whyText.matchAll(/§(\d+)/g)) {
    const sectionNum = parseInt(match[1], 10);
    if (sectionNum < SECTION_REF_MIN || sectionNum > SECTION_REF_MAX) {
      addIssue(
        "warning",
        "references",
        key,
        `Invalid section reference §${sectionNum} (valid: ${SECTION_REF_MIN}-${SECTION_REF_MAX})`,
      );
    }
  }
}

// --------------------------------------------------------------------------
// 7. Related array size
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  if (term.related) {
    const count = term.related.length;
    if (count < RELATED_MIN) {
      addIssue(
        "info",
        "structure",
        key,
        `Few related terms (${count}, recommend ${RELATED_MIN}-${RELATED_MAX})`,
      );
    } else if (count > RELATED_MAX) {
      addIssue(
        "info",
        "structure",
        key,
        `Many related terms (${count}, recommend ${RELATED_MIN}-${RELATED_MAX})`,
      );
    }
  } else {
    addIssue("info", "structure", key, "No related terms defined");
  }
}

// --------------------------------------------------------------------------
// 8. Orphaned terms (not referenced by any other term)
// --------------------------------------------------------------------------

for (const key of allKeys) {
  if (!referencedBy.has(key)) {
    addIssue(
      "info",
      "connectivity",
      key,
      "Orphaned: not referenced by any other term's related array",
    );
  }
}

// --------------------------------------------------------------------------
// 9. Missing "why" fields for core categories
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  if (CATEGORIES_REQUIRING_WHY.includes(term.category) && !term.why) {
    addIssue(
      "info",
      "completeness",
      key,
      `Missing "why" field (recommended for ${term.category} category)`,
    );
  }
}

// --------------------------------------------------------------------------
// 10. Invalid categories
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  if (!VALID_CATEGORIES.includes(term.category)) {
    addIssue(
      "error",
      "structure",
      key,
      `Invalid category: "${term.category}"`,
      `Use one of: ${VALID_CATEGORIES.join(", ")}`,
    );
  }
}

// --------------------------------------------------------------------------
// 11. Asymmetric related links (A→B but not B→A)
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  if (term.related) {
    for (const ref of term.related) {
      const refTerm = jargonDictionary[ref];
      if (refTerm && (!refTerm.related || !refTerm.related.includes(key))) {
        addIssue(
          "info",
          "connectivity",
          key,
          `Asymmetric link: ${key} → ${ref}, but ${ref} doesn't link back`,
          `Add "${key}" to ${ref}'s related array`,
        );
      }
    }
  }
}

// --------------------------------------------------------------------------
// 12. Empty or whitespace-only fields
// --------------------------------------------------------------------------

for (const [key, term] of allEntries) {
  if (!term.term.trim()) {
    addIssue("error", "structure", key, "Empty term display name");
  }
  if (!term.short.trim()) {
    addIssue("error", "structure", key, "Empty short description");
  }
  if (!term.long.trim()) {
    addIssue("error", "structure", key, "Empty long description");
  }
}

// ============================================================================
// Report Generation
// ============================================================================

console.log("🔍 Jargon Dictionary Health Check\n");
console.log("═".repeat(60) + "\n");

// Group issues by category
const byCategory = new Map<string, Issue[]>();
for (const issue of issues) {
  const existing = byCategory.get(issue.category) || [];
  existing.push(issue);
  byCategory.set(issue.category, existing);
}

// Count by severity
const errorCount = issues.filter((i) => i.severity === "error").length;
const warningCount = issues.filter((i) => i.severity === "warning").length;
const infoCount = issues.filter((i) => i.severity === "info").length;

// Print issues grouped by category
const categoryOrder = [
  "duplicates",
  "references",
  "style",
  "structure",
  "length",
  "completeness",
  "connectivity",
];

for (const cat of categoryOrder) {
  const catIssues = byCategory.get(cat);
  if (!catIssues || catIssues.length === 0) {
    if (verbose) {
      console.log(`✅ ${cat}: No issues`);
    }
    continue;
  }

  const errors = catIssues.filter((i) => i.severity === "error");
  const warnings = catIssues.filter((i) => i.severity === "warning");
  const infos = catIssues.filter((i) => i.severity === "info");

  console.log(`📋 ${cat.toUpperCase()}`);

  for (const issue of errors) {
    console.log(`   ❌ [${issue.key}] ${issue.message}`);
    if (showFixes && issue.fix) {
      console.log(`      💡 ${issue.fix}`);
    }
  }
  for (const issue of warnings) {
    console.log(`   ⚠️  [${issue.key}] ${issue.message}`);
    if (showFixes && issue.fix) {
      console.log(`      💡 ${issue.fix}`);
    }
  }
  // Only show info-level issues in verbose mode
  if (verbose) {
    for (const issue of infos) {
      console.log(`   ℹ️  [${issue.key}] ${issue.message}`);
      if (showFixes && issue.fix) {
        console.log(`      💡 ${issue.fix}`);
      }
    }
  }

  console.log("");
}

// ============================================================================
// Statistics
// ============================================================================

console.log("═".repeat(60));
console.log("\n📊 STATISTICS\n");

const matchable = getMatchableTerms();
console.log(`   Dictionary entries: ${allKeys.size}`);
console.log(`   Matchable patterns: ${matchable.length}`);

// Category breakdown
const categories: Record<string, number> = {};
for (const term of Object.values(jargonDictionary)) {
  categories[term.category] = (categories[term.category] || 0) + 1;
}
console.log("\n   By category:");
Object.entries(categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`      ${cat}: ${count}`);
  });

// Coverage stats
const withWhy = allEntries.filter((entry) => entry[1].why).length;
const withAnalogy = allEntries.filter((entry) => entry[1].analogy).length;
const withRelated = allEntries.filter((entry) => entry[1].related).length;

console.log("\n   Field coverage:");
console.log(
  `      with 'why': ${withWhy}/${allKeys.size} (${((withWhy / allKeys.size) * 100).toFixed(0)}%)`,
);
console.log(
  `      with 'analogy': ${withAnalogy}/${allKeys.size} (${((withAnalogy / allKeys.size) * 100).toFixed(0)}%)`,
);
console.log(
  `      with 'related': ${withRelated}/${allKeys.size} (${((withRelated / allKeys.size) * 100).toFixed(0)}%)`,
);

// ============================================================================
// Summary and Exit
// ============================================================================

console.log("\n" + "═".repeat(60));
console.log("\n📝 SUMMARY\n");
console.log(`   ❌ Errors:   ${errorCount}`);
console.log(`   ⚠️  Warnings: ${warningCount}`);
console.log(`   ℹ️  Info:     ${infoCount} (use --verbose to see)`);

console.log("");
if (errorCount > 0) {
  console.log("❌ Health check FAILED - fix errors before committing");
  process.exit(1);
} else if (warningCount > 0) {
  console.log("⚠️  Health check passed with warnings - consider addressing them");
  process.exit(0);
} else {
  console.log("✅ Health check passed!");
  process.exit(0);
}
