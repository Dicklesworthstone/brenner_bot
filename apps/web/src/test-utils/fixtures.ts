/**
 * Test Data Fixtures
 *
 * Provides real data fixtures from the corpus for testing.
 * Philosophy: NO mocks - use actual transcript data.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve paths relative to the web app directory
function getProjectRoot(): string {
  // When running from apps/web, go up to project root
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // From apps/web/src/test-utils -> apps/web -> apps -> project root
  return resolve(currentDir, "../../../../");
}

/**
 * Load a file from the project root.
 */
export function loadFixtureFile(relativePath: string): string {
  const fullPath = resolve(getProjectRoot(), relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Fixture file not found: ${fullPath}`);
  }
  return readFileSync(fullPath, "utf-8");
}

/**
 * Load a fixture file and parse as JSON.
 */
export function loadJsonFixture<T>(relativePath: string): T {
  const content = loadFixtureFile(relativePath);
  return JSON.parse(content) as T;
}

/**
 * Sample transcript excerpt for testing.
 * This is a real excerpt from the Brenner transcript.
 */
export const SAMPLE_EXCERPT = `
§58 Brenner: "What we did was to reduce the problem to one dimension.
Instead of having a three-dimensional puzzle of cells, we could now
treat it as a linear sequence. The cell lineage is essentially a program
that runs, and we can read it."

§59 Brenner: "The choice of C. elegans was crucial. It's transparent—
you can see every cell. It has exactly 959 somatic cells, and every
animal develops identically. It's eutelic."
`.trim();

/**
 * Sample delta message body for testing delta parsing.
 */
export const SAMPLE_DELTA_MESSAGE = `
# Contribution: Hypothesis from lineage analysis

Based on the transcript excerpt (§58-59), I propose the following hypothesis
about cell fate determination.

## Deltas

\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Deterministic Lineage",
    "claim": "Cell fate is determined by lineage position, not gradient signaling",
    "mechanism": "Each division point encodes fate decisions as a binary tree",
    "anchors": ["§58", "§59"],
    "third_alternative": false
  },
  "rationale": "Applying ⊘ Level-Split: separate the program (lineage) from the interpreter (molecular machinery)"
}
\`\`\`

\`\`\`delta
{
  "operation": "ADD",
  "section": "discriminative_tests",
  "target_id": null,
  "payload": {
    "name": "Laser ablation test",
    "procedure": "Ablate specific cells and observe descendant fates",
    "discriminates": "H1 (lineage) vs H2 (gradient)",
    "expected_outcomes": {
      "H1": "Remaining cells follow their lineage program unchanged",
      "H2": "Remaining cells adopt different fates due to altered gradients"
    },
    "potency_check": "Control: ablate non-signaling cells to verify ablation technique works",
    "score": {
      "likelihood_ratio": 3,
      "cost": 2,
      "speed": 2,
      "ambiguity": 2
    }
  },
  "rationale": "Classic discriminative test from C. elegans literature"
}
\`\`\`
`.trim();

/**
 * Sample malformed delta for error testing.
 */
export const MALFORMED_DELTA_MESSAGE = `
Some prose here.

\`\`\`delta
{ not valid json at all }
\`\`\`

\`\`\`delta
{
  "operation": "INVALID_OP",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {}
}
\`\`\`
`.trim();

/**
 * Sample artifact for merge testing.
 */
export const SAMPLE_ARTIFACT_FIXTURE = {
  metadata: {
    session_id: "TEST-001",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    version: 1,
    status: "draft" as const,
    contributors: [
      {
        agent: "TestAgent",
        contributed_at: "2025-01-01T00:00:00Z",
      },
    ],
  },
  sections: {
    research_thread: {
      id: "RT",
      statement: "How do cells determine their fate?",
      context: "Based on Brenner transcript §58-59",
      why_it_matters: "Fundamental question in developmental biology",
    },
    hypothesis_slate: [
      {
        id: "H1",
        name: "Lineage Hypothesis",
        claim: "Cell fate is determined by lineage",
        mechanism: "Binary tree encoding",
        anchors: ["§58"],
      },
    ],
    predictions_table: [],
    discriminative_tests: [],
    assumption_ledger: [],
    anomaly_register: [],
    adversarial_critique: [],
  },
};

/**
 * Get the path to the transcript file.
 */
export function getTranscriptPath(): string {
  return resolve(getProjectRoot(), "complete_brenner_transcript.md");
}

/**
 * Load a section of the transcript by section number.
 * Returns null if section not found.
 */
export function loadTranscriptSection(sectionNumber: number): string | null {
  const transcriptPath = getTranscriptPath();
  if (!existsSync(transcriptPath)) {
    return null;
  }

  const content = readFileSync(transcriptPath, "utf-8");
  const sectionRegex = new RegExp(`§${sectionNumber}[^§]*`, "g");
  const match = content.match(sectionRegex);

  return match ? match[0].trim() : null;
}
