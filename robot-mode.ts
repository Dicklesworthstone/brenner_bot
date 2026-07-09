/**
 * Robot-mode command handlers: session robot, session robot-step, session robot-stress.
 *
 * Extracted from brenner.ts (previously ~1,800 lines threaded through a single
 * 9,700-line file with no boundary marking this as the whole surface). This
 * file plus its exports IS the whole surface — nothing robot-mode-related
 * hides elsewhere in brenner.ts, which is exactly the property that would
 * have caught a duplicated-function bug missed during an earlier refactor of
 * this same code done before this split existed.
 *
 * Also contains the operator belief ledger subsystem (typed operator
 * corrections — fact/judgment/kill_signal — compiled into a cumulative
 * ledger across rounds), since it exists only to serve robot-step/robot-stress
 * and nothing else in brenner.ts references it.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

import type { Json } from "./apps/web/src/lib/json";
import {
  createEmptyArtifact,
  lintArtifact,
  mergeArtifactWithTimestamps,
  renderArtifactMarkdown,
  type Artifact,
} from "./apps/web/src/lib/artifact-merge";
import { extractValidDeltas, type ValidDelta } from "./apps/web/src/lib/delta-parser";
import { AGENT_ROLES, getRolePromptMarkdown, getTriangulatedBrennerKernelMarkdown } from "./apps/web/src/lib/session-kickoff";

import {
  asBoolFlag,
  asIntFlag,
  asStringFlag,
  ensureTrailingNewline,
  isRecord,
  readTextFile,
  splitCsv,
  stderrLine,
  stdoutLine,
  type ParsedArgs,
} from "./cli-kernel";

// ============================================================================
// Operator belief ledger
// ============================================================================

type OperatorBeliefKind = "fact" | "judgment" | "kill_signal";
type OperatorBeliefOrigin = "structured_json" | "structured_markdown" | "legacy_markdown";

type OperatorBelief = {
  id: string;
  round: number | null;
  phase: "round" | "stress";
  kind: OperatorBeliefKind;
  content: string;
  targets: string[];
  confidence?: string;
  source?: string;
  supersedes: string[];
  status: "active" | "superseded";
  origin: OperatorBeliefOrigin;
  originFile: string;
  order: number;
};

function normalizeBeliefKind(raw: string | undefined): OperatorBeliefKind | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "fact" || normalized === "factual") return "fact";
  if (normalized === "judgment" || normalized === "analytic" || normalized === "analysis") return "judgment";
  if (normalized === "kill" || normalized === "kill_signal" || normalized === "kill_directive" || normalized === "directive") {
    return "kill_signal";
  }
  return undefined;
}

function normalizeBeliefText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function unquoteToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function extractBeliefTargets(text: string): string[] {
  const matches = text.match(/\b(?:RT\d+|[A-Z]{1,3}\d+)\b/g) ?? [];
  return Array.from(new Set(matches));
}

function extractJsonFence(text: string): string | null {
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? null;
}

function makeBeliefId(round: number | null, phase: "round" | "stress", index: number): string {
  if (phase === "stress") return `OB-S${index}`;
  if (round === null) return `OB-X${index}`;
  return `OB-R${round}-${index}`;
}

function coerceStringArray(value: Json | undefined): string[] {
  if (typeof value === "string") return splitCsv(value);
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStructuredBeliefLine(
  lineRemainder: string,
): { meta: Record<string, string>; inlineContent: string } {
  const [metaSegment, ...contentSegments] = lineRemainder.split(/\s+--\s+/);
  const tokens = (metaSegment.match(/(?:[^\s"]+="[^"]*"|\S+)/g) ?? []);
  const meta: Record<string, string> = {};
  const contentTokens: string[] = [];

  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq === -1) {
      contentTokens.push(token);
      continue;
    }

    const key = token.slice(0, eq).trim().toLowerCase();
    const value = unquoteToken(token.slice(eq + 1));
    if (["id", "targets", "target", "supersedes", "confidence", "source"].includes(key)) {
      meta[key] = value;
    } else {
      contentTokens.push(token);
    }
  }

  const inlineContent = [contentTokens.join(" "), contentSegments.join(" -- ").trim()]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return { meta, inlineContent };
}

function parseOperatorBeliefsFromJsonText(
  rawText: string,
  round: number | null,
  phase: "round" | "stress",
  originFile: string,
  strict: boolean,
): OperatorBelief[] | null {
  const candidate = extractJsonFence(rawText) ?? rawText.trim();
  if (!candidate) return [];

  let parsed: Json;
  try {
    parsed = JSON.parse(candidate) as Json;
  } catch (error) {
    if (strict) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse operator beliefs JSON at ${originFile}: ${message}`);
    }
    return null;
  }

  let entries: Json[] = [];
  if (Array.isArray(parsed)) {
    entries = parsed;
  } else if (isRecord(parsed)) {
    const beliefs = parsed.beliefs;
    const items = parsed.items;
    const entriesValue = Array.isArray(beliefs) ? beliefs : Array.isArray(items) ? items : [];
    entries = entriesValue;
  } else {
    if (strict) throw new Error(`Operator beliefs JSON at ${originFile} must be an object or array.`);
    return null;
  }

  return entries.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    const kind = normalizeBeliefKind(
      typeof entry.kind === "string"
        ? entry.kind
        : typeof entry.type === "string"
          ? entry.type
          : undefined
    );
    const content =
      typeof entry.content === "string"
        ? entry.content
        : typeof entry.text === "string"
          ? entry.text
          : typeof entry.note === "string"
            ? entry.note
            : "";
    const normalizedContent = normalizeBeliefText(content);
    if (!kind || !normalizedContent) return [];

    const explicitId = typeof entry.id === "string" ? entry.id.trim() : "";
    const targets = Array.from(
      new Set([
        ...coerceStringArray(entry.targets),
        ...coerceStringArray(entry.target),
        ...extractBeliefTargets(normalizedContent),
      ])
    );
    const supersedes = Array.from(
      new Set([
        ...coerceStringArray(entry.supersedes),
      ])
    );

    return [{
      id: explicitId || makeBeliefId(round, phase, index + 1),
      round,
      phase,
      kind,
      content: normalizedContent,
      targets,
      confidence: typeof entry.confidence === "string" ? entry.confidence.trim() : undefined,
      source: typeof entry.source === "string" ? entry.source.trim() : undefined,
      supersedes,
      status: "active",
      origin: "structured_json" as const,
      originFile,
      order: index + 1,
    }];
  });
}

function parseOperatorBeliefsFromStructuredMarkdown(
  rawText: string,
  round: number | null,
  phase: "round" | "stress",
  originFile: string,
): OperatorBelief[] {
  const lines = rawText.split(/\r?\n/);
  const beliefs: OperatorBelief[] = [];
  let current:
    | {
        kind: OperatorBeliefKind;
        meta: Record<string, string>;
        body: string[];
      }
    | null = null;

  const flush = () => {
    if (!current) return;
    const normalizedContent = normalizeBeliefText(current.body.join("\n"));
    if (normalizedContent) {
      const targets = Array.from(
        new Set([
          ...splitCsv(current.meta.targets ?? current.meta.target),
          ...extractBeliefTargets(normalizedContent),
        ])
      );
      beliefs.push({
        id: (current.meta.id || makeBeliefId(round, phase, beliefs.length + 1)).trim(),
        round,
        phase,
        kind: current.kind,
        content: normalizedContent,
        targets,
        confidence: current.meta.confidence?.trim(),
        source: current.meta.source?.trim(),
        supersedes: splitCsv(current.meta.supersedes),
        status: "active",
        origin: "structured_markdown",
        originFile,
        order: beliefs.length + 1,
      });
    }
    current = null;
  };

  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s*\[(fact|judgment|kill(?:[_ -]?signal)?|kill_directive|directive)\]\s*(.*)$/i);
    if (match) {
      flush();
      const kind = normalizeBeliefKind(match[1]);
      if (!kind) continue;
      const { meta, inlineContent } = parseStructuredBeliefLine(match[2] ?? "");
      current = {
        kind,
        meta,
        body: inlineContent ? [inlineContent] : [],
      };
      continue;
    }

    if (current) {
      current.body.push(line);
    }
  }

  flush();
  return beliefs;
}

function parseOperatorBeliefsFromLegacyMarkdown(
  rawText: string,
  round: number | null,
  phase: "round" | "stress",
  originFile: string,
): OperatorBelief[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const lines = rawText.split(/\r?\n/);
  const beliefs: OperatorBelief[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];
  let sawHeading = false;

  const flush = () => {
    const body = normalizeBeliefText(currentBody.join("\n"));
    if (!body && !currentTitle) return;
    const content = normalizeBeliefText(currentTitle ? `${currentTitle}\n\n${body}` : body);
    if (!content) return;
    if (/^#\s+Operator Notes\b/i.test(content)) return;
    beliefs.push({
      id: makeBeliefId(round, phase, beliefs.length + 1),
      round,
      phase,
      kind: "judgment",
      content,
      targets: extractBeliefTargets(content),
      status: "active",
      supersedes: [],
      origin: "legacy_markdown",
      originFile,
      order: beliefs.length + 1,
    });
  };

  for (const line of lines) {
    const heading = line.match(/^##+\s+(.+?)\s*$/);
    if (heading) {
      sawHeading = true;
      if (currentTitle || currentBody.length > 0) flush();
      currentTitle = heading[1] ?? "";
      currentBody = [];
      continue;
    }
    currentBody.push(line);
  }

  if (sawHeading) {
    flush();
    return beliefs;
  }

  return [{
    id: makeBeliefId(round, phase, 1),
    round,
    phase,
    kind: "judgment",
    content: trimmed,
    targets: extractBeliefTargets(trimmed),
    status: "active",
    supersedes: [],
    origin: "legacy_markdown",
    originFile,
    order: 1,
  }];
}

function parseOperatorBeliefFile(
  originFile: string,
  round: number | null,
  phase: "round" | "stress",
): OperatorBelief[] {
  const rawText = readTextFile(originFile);
  if (!rawText.trim()) return [];

  const strictJson = originFile.endsWith(".json");
  const jsonBeliefs = parseOperatorBeliefsFromJsonText(rawText, round, phase, originFile, strictJson);
  if (jsonBeliefs !== null) return jsonBeliefs;

  const structuredMarkdownBeliefs = parseOperatorBeliefsFromStructuredMarkdown(rawText, round, phase, originFile);
  if (structuredMarkdownBeliefs.length > 0) return structuredMarkdownBeliefs;

  return parseOperatorBeliefsFromLegacyMarkdown(rawText, round, phase, originFile);
}

function finalizeOperatorBeliefs(beliefs: OperatorBelief[]): OperatorBelief[] {
  const seen = new Map<string, number>();
  const deduped = beliefs.map((belief) => {
    const priorCount = seen.get(belief.id) ?? 0;
    const nextCount = priorCount + 1;
    seen.set(belief.id, nextCount);
    if (nextCount === 1) return belief;
    return {
      ...belief,
      id: `${belief.id}~${nextCount}`,
    };
  });

  const byId = new Map(deduped.map((belief) => [belief.id, belief]));
  const superseded = new Set<string>();
  for (const belief of deduped) {
    for (const targetId of belief.supersedes) {
      if (byId.has(targetId)) superseded.add(targetId);
    }
  }

  return deduped.map((belief) => ({
    ...belief,
    status: superseded.has(belief.id) ? "superseded" : "active",
  }));
}

function loadOperatorBeliefsForRounds(sessionDir: string, lastRound: number): OperatorBelief[] {
  const beliefs: OperatorBelief[] = [];

  for (let round = 1; round <= lastRound; round++) {
    const jsonFile = join(sessionDir, `operator_beliefs_round_${round}.json`);
    const markdownFile = join(sessionDir, `operator_notes_round_${round}.md`);
    if (existsSync(jsonFile)) {
      beliefs.push(...parseOperatorBeliefFile(jsonFile, round, "round"));
      continue;
    }
    if (existsSync(markdownFile)) {
      beliefs.push(...parseOperatorBeliefFile(markdownFile, round, "round"));
    }
  }

  return finalizeOperatorBeliefs(beliefs);
}

function loadOperatorBeliefsForStress(sessionDir: string, operatorContextFile?: string): OperatorBelief[] {
  const roundBeliefs: OperatorBelief[] = [];
  for (let round = 1; round <= 50; round++) {
    const jsonFile = join(sessionDir, `operator_beliefs_round_${round}.json`);
    const markdownFile = join(sessionDir, `operator_notes_round_${round}.md`);
    if (existsSync(jsonFile)) {
      roundBeliefs.push(...parseOperatorBeliefFile(jsonFile, round, "round"));
      continue;
    }
    if (existsSync(markdownFile)) {
      roundBeliefs.push(...parseOperatorBeliefFile(markdownFile, round, "round"));
    }
  }

  const stressBeliefs = operatorContextFile
    ? parseOperatorBeliefFile(operatorContextFile, null, "stress")
    : [];

  return finalizeOperatorBeliefs([...roundBeliefs, ...stressBeliefs]);
}

function formatOperatorBeliefLabel(belief: OperatorBelief): string {
  const parts = [
    belief.id,
    belief.kind.toUpperCase().replace("_", "-"),
    belief.phase === "stress" ? "stress context" : `round ${belief.round ?? "?"}`,
  ];
  if (belief.targets.length > 0) parts.push(`targets: ${belief.targets.join(", ")}`);
  if (belief.confidence) parts.push(`confidence: ${belief.confidence}`);
  if (belief.source) parts.push(`source: ${belief.source}`);
  if (belief.origin === "legacy_markdown") parts.push("legacy markdown import");
  return parts.join(" | ");
}

function renderOperatorBeliefLedgerMarkdown(
  beliefs: OperatorBelief[],
  mode: "round" | "stress",
): string {
  if (beliefs.length === 0) return "";

  const active = beliefs.filter((belief) => belief.status === "active");
  const historical = beliefs.filter((belief) => belief.status === "superseded");
  const intro = mode === "stress"
    ? "This ledger compiles cumulative operator interventions from the main session plus any post-convergence stress-test context."
    : "This ledger compiles cumulative operator interventions from earlier rounds. Historical beliefs remain visible so you can detect contradictions instead of silently inheriting the latest frame.";

  const renderEntries = (entries: OperatorBelief[]): string => entries
    .map((belief) => {
      const lines = [
        `- **${formatOperatorBeliefLabel(belief)}**`,
        ...belief.content.split("\n").map((line) => `  ${line}`),
      ];
      if (belief.supersedes.length > 0) {
        lines.push(`  Supersedes: ${belief.supersedes.join(", ")}`);
      }
      return lines.join("\n");
    })
    .join("\n");

  const parts: string[] = [];
  parts.push(`## Operator Belief Ledger\n`);
  parts.push(`${intro}\n`);
  parts.push(`Belief authority rules:`);
  parts.push(`- **FACT**: accept as established fact unless the ledger itself records a later correction.`);
  parts.push(`- **JUDGMENT**: engage seriously, but do not treat it as sufficient cause by itself. Connect it to artifact evidence or explain why you disagree.`);
  parts.push(`- **KILL-SIGNAL**: treat as a strong rescue-vs-kill prompt, not a command. A kill still needs mechanism-level evidence.`);
  parts.push(`- **Legacy markdown imports** are historical notes carried forward for context. Treat them as judgments unless they contain an explicitly verified fact.\n`);
  parts.push(`Do not cite an operator judgment or kill-signal as the sole reason for a delta. If you see unresolved tension between active beliefs, call it out explicitly in the payload rather than silently choosing one.\n`);

  if (active.length > 0) {
    parts.push(`### Active Beliefs\n`);
    parts.push(renderEntries(active));
    parts.push("");
  }

  if (historical.length > 0) {
    parts.push(`### Superseded / Historical Beliefs\n`);
    parts.push(renderEntries(historical));
    parts.push("");
  }

  return parts.join("\n").trim();
}

// ============================================================================
// Shared round-loop helpers (session robot + session robot-step)
// ============================================================================

// Shared robot-mode types and helpers (session robot + session robot-step)
//
// Previously duplicated near-verbatim across three command blocks (robot,
// robot-step, robot-stress). robot-stress's own agent-invocation function
// has a genuinely different, better-typed error contract ({output, error?}
// vs a lossy plain string) and is left as-is rather than flattened into this
// — the two below are unified because robot and robot-step's versions were
// truly equivalent (robot-step's was even missing an error-handling behavior
// robot already had: writing an empty output file on a spawn failure).
// ============================================================================

interface RobotAgent {
  name: string;
  slug: string;
  role: { role: string; displayName: string; description: string };
  bin: string;
  buildArgs: (prompt: string, outFile: string) => string[];
  buildEnv: () => Record<string, string | undefined>;
  readOutput: (stdout: string, outFile: string) => string;
}

const ROBOT_AGENT_TIMEOUT_MS = 300_000; // 5 minutes per agent

function parseRobotAgentDeltas(
  agentName: string,
  output: string,
  timestamp: string,
): Array<ValidDelta & { timestamp: string; agent: string }> {
  const deltas = extractValidDeltas(output);
  return deltas.map((d) => ({ ...d, timestamp, agent: agentName }));
}

function buildDeltaFormatInstructions(): string {
  return `## Output Format

Respond ONLY with delta blocks. Each delta is a JSON object in a \`\`\`delta fence.
One JSON object per fence. No arrays. No prose outside delta blocks.

Valid operations: ADD (target_id: null), EDIT (target_id required), KILL (target_id required).
Valid sections: hypothesis_slate, discriminative_tests, assumption_ledger, anomaly_register,
  adversarial_critique, research_thread, predictions_table.

The compiler assigns IDs (H1, H2, T1, A1, C1, etc.). Do not invent your own IDs.
For KILL, use the "reason" field (not "kill_reason").

**Your full argument MUST go in the payload content fields** — rationale is metadata only
and will NOT be visible to other agents. Write reasoning in mechanism (hypotheses),
attack/evidence (critiques), procedure/discriminates (tests), reason (kills).

**Predictions table mandate:** For every hypothesis you ADD, you MUST also ADD a
predictions_table row specifying what observable outcome it predicts differently
from alternatives.

Example ADD (hypothesis):
\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "Short descriptive name",
    "claim": "One falsifiable sentence.",
    "mechanism": "Full causal argument with evidence and failure modes.",
    "anchors": ["[inference]"],
    "third_alternative": false
  },
  "rationale": "[inference]"
}
\`\`\`

Example KILL:
\`\`\`delta
{
  "operation": "KILL",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": { "reason": "Full kill argument: which evidence rules this out and why no rescue is possible." },
  "rationale": "[inference]"
}
\`\`\`
`;
}

function buildRobotRound1Prompt(agent: RobotAgent, question: string, contextText: string, excerptText: string): string {
  const kernel = getTriangulatedBrennerKernelMarkdown();
  const roleSection = getRolePromptMarkdown(agent.role.role);

  const parts: string[] = [];
  parts.push(`You are ${agent.name} (${agent.role.displayName}) in a Brenner Protocol session.\n`);

  if (kernel) {
    parts.push(`## Triangulated Brenner Kernel\n\n${kernel}\n`);
  }
  if (roleSection) {
    parts.push(`## Role Prompt (System)\n\n${roleSection}\n`);
  } else {
    parts.push(`## Your Role\n${agent.role.description}\n`);
  }

  parts.push(`## Research Question\n\n${question}\n`);
  if (contextText.trim()) {
    parts.push(`## Context\n\n${contextText}\n`);
  }
  if (excerptText.trim()) {
    parts.push(`## Brenner Excerpt\n\n${excerptText}\n`);
  }

  parts.push(buildDeltaFormatInstructions());
  return parts.join("\n");
}

function buildRobotRoundNPrompt(
  agent: RobotAgent,
  artifact: Artifact,
  round: number,
  operatorBeliefLedger?: string,
): string {
  const kernel = getTriangulatedBrennerKernelMarkdown();
  const roleSection = getRolePromptMarkdown(agent.role.role);
  const artifactMd = renderArtifactMarkdown(artifact);

  const parts: string[] = [];
  parts.push(`You are ${agent.name} (${agent.role.displayName}) in a Brenner Protocol session.\n`);

  // Re-inject kernel + role every round since each subprocess is a fresh context window
  if (kernel) {
    parts.push(`## Triangulated Brenner Kernel\n\n${kernel}\n`);
  }
  if (roleSection) {
    parts.push(`## Role Prompt (System)\n\n${roleSection}\n`);
  } else {
    parts.push(`## Your Role\n${agent.role.description}\n`);
  }

  // Round-specific instructions
  if (round === 2) {
    parts.push(`## Round ${round} Instructions\n`);
    parts.push(`Review other agents' findings from the previous round (in the artifact below).`);
    parts.push(`Make your first kill attempts — identify weak hypotheses and KILL them with explicit reasons.`);
    parts.push(`You may ADD refinements, but kills are the priority.\n`);
  } else {
    parts.push(`## Round ${round} Instructions (Convergence)\n`);
    parts.push(`KILLS MUST EXCEED ADDS. Provide final verdicts on all surviving hypotheses.`);
    parts.push(`Kill any hypothesis that cannot withstand scrutiny. Fewer strong beats more weak.\n`);
  }

  if (operatorBeliefLedger && operatorBeliefLedger.trim()) {
    parts.push(`${operatorBeliefLedger}\n`);
  }

  parts.push(`## Current Artifact (v${artifact.metadata.version})\n\n${artifactMd}\n`);
  parts.push(buildDeltaFormatInstructions());
  return parts.join("\n");
}

function invokeRobotAgent(agent: RobotAgent, prompt: string, roundDir: string, sessionDir: string): Promise<string> {
  const promptFile = join(roundDir, `${agent.slug}_prompt.md`);
  const outFile = join(roundDir, `${agent.slug}_out.md`);
  writeFileSync(promptFile, prompt);

  stderrLine(`  -> Invoking ${agent.name} (${agent.role.displayName})...`);

  return new Promise<string>((resolve) => {
    const args = agent.buildArgs(prompt, outFile);
    const env = agent.buildEnv();

    const child = spawn(agent.bin, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: sessionDir,
    });

    const stdoutChunks: Buffer[] = [];
    child.stdout?.on("data", (d: Buffer) => stdoutChunks.push(d));
    child.stderr?.on("data", () => {});

    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      stderrLine(`  [!] ${agent.name} timed out after ${ROBOT_AGENT_TIMEOUT_MS / 1000}s, sending SIGTERM`);
      killTimer = setTimeout(() => {
        child.kill("SIGKILL");
        stderrLine(`  [!] ${agent.name} did not exit after SIGTERM, sending SIGKILL`);
      }, 10_000);
    }, ROBOT_AGENT_TIMEOUT_MS);

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      stderrLine(`  [!] ${agent.name} failed to launch: ${err.message}`);
      stderrLine(`      Binary: ${agent.bin}`);
      stderrLine(`      Ensure the CLI is installed and in PATH.`);
      // Resolve with empty string instead of rejecting — a single agent
      // failure should not abort the entire session
      writeFileSync(outFile, "");
      resolve("");
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);

      const stdout = Buffer.concat(stdoutChunks).toString();
      const output = agent.readOutput(stdout, outFile);

      if (code !== 0 && code !== null) {
        stderrLine(`  [!] ${agent.name} exited with code ${code}`);
      }

      writeFileSync(outFile, output);

      const deltaCount = (output.match(/```delta/g) ?? []).length;
      const preview = output
        .replace(/```delta[\s\S]*?```/g, "[delta]")
        .trim()
        .slice(0, 400);
      stderrLine(`  [ok] ${agent.name} done (${deltaCount} delta blocks)`);
      if (preview) {
        for (const line of preview.split("\n").slice(0, 5)) {
          stderrLine(`       ${line}`);
        }
      }
      stderrLine("");

      resolve(output);
    });
  });
}

function checkRobotConvergence(
  roundDeltas: Array<ValidDelta & { timestamp: string; agent: string }>,
  round: number,
  artifact: Artifact,
  maxRounds?: number,
): { converged: boolean; reason: string } {
  if (maxRounds !== undefined && round >= maxRounds) {
    return { converged: true, reason: `Reached maximum rounds (${maxRounds})` };
  }

  const adds = roundDeltas.filter((d) => d.operation === "ADD").length;
  const kills = roundDeltas.filter((d) => d.operation === "KILL").length;

  // Round 1 never converges (agents are still generating initial hypotheses)
  if (round === 1) {
    return { converged: false, reason: `Round 1: ${adds} adds, ${kills} kills` };
  }

  const activeHypotheses = (artifact.sections.hypothesis_slate as any[])
    .filter((h: any) => !h.killed).length;

  // Convergence: kills >= adds (adversarial pressure exceeds generation)
  // Require at least one kill to avoid premature convergence on pure-EDIT rounds
  if (kills > 0 && kills >= adds) {
    return {
      converged: true,
      reason: `Kill-rate (${kills}) >= add-rate (${adds}), ${activeHypotheses} active hypotheses remain`,
    };
  }

  // Also converge if no deltas at all (agents have nothing to say)
  if (roundDeltas.length === 0) {
    return { converged: true, reason: "No deltas produced — agents have converged" };
  }

  return {
    converged: false,
    reason: `Adds (${adds}) > Kills (${kills}), ${activeHypotheses} active hypotheses`,
  };
}

// ============================================================================
// session robot-step — run one round then exit (HITL orchestration)
// ============================================================================

export async function runRobotStep(flags: ParsedArgs["flags"]): Promise<void> {
    const sessionDirRaw = asStringFlag(flags, "session-dir");
    if (!sessionDirRaw) throw new Error("Missing --session-dir.");
    const sessionDir = resolve(sessionDirRaw);

    const question = asStringFlag(flags, "question");
    if (!question) throw new Error("Missing --question.");

    const round = asIntFlag(flags, "round");
    if (!round || round < 1) throw new Error("Missing or invalid --round (must be >= 1).");

    const contextFile = asStringFlag(flags, "context-file") ?? join(sessionDir, "context.md");
    const excerptFile = asStringFlag(flags, "excerpt-file") ?? join(sessionDir, "excerpt.md");
    const sequential = asBoolFlag(flags, "sequential");
    const acknowledgeAgentErrors = asBoolFlag(flags, "acknowledge-agent-errors");

    // Extract session ID from directory name
    const sessionId = sessionDir.split("/").pop() ?? `RS-robot-${Date.now()}`;

    // Create session directory if it doesn't exist
    if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });

    // Validate required files
    if (!existsSync(contextFile)) {
      throw new Error(
        `Missing context file: ${contextFile}\n` +
        `Create it with your research question, background, and evaluation criteria.`,
      );
    }
    if (!existsSync(excerptFile)) {
      throw new Error(
        `Missing excerpt file: ${excerptFile}\n` +
        `Build one with: brenner excerpt build --sections <A,B> > ${excerptFile}\n` +
        `Or: touch ${excerptFile}  (to skip)`,
      );
    }

    const contextText = readFileSync(contextFile, "utf-8");
    const excerptText = readFileSync(excerptFile, "utf-8");

    // Resolve agent binaries (reuse same logic as session robot)
    const claudeBin = asStringFlag(flags, "claude-bin") ?? process.env.BRENNER_CLAUDE_BIN ?? "claude";
    const codexBin = asStringFlag(flags, "codex-bin") ?? process.env.BRENNER_CODEX_BIN ?? "codex";
    const agyBin = asStringFlag(flags, "agy-bin") ?? process.env.BRENNER_AGY_BIN ?? "agy";

    const augmentedPath = `${homedir()}/.local/bin:/usr/local/bin:${process.env.PATH ?? ""}`;

    // Agent configuration (same as session robot; RobotAgent type is module-level)
    const ROLE_CONFIGS: Record<string, { role: string; displayName: string; description: string }> = {
      claude: { role: "test_designer", displayName: "Test Designer", description: "Design discriminative tests that kill hypotheses. Score experiments by evidence-per-week." },
      codex: { role: "hypothesis_generator", displayName: "Hypothesis Generator", description: "Generate hypotheses, hunt paradoxes, import cross-domain patterns. Always include a third alternative." },
      agy: { role: "adversarial_critic", displayName: "Adversarial Critic", description: "Attack the framing, run scale checks, quarantine anomalies, kill theories that go ugly." },
    };

    const agents: RobotAgent[] = [
      {
        name: "BlueLake",
        slug: "bluelake",
        bin: claudeBin,
        role: ROLE_CONFIGS.claude,
        buildArgs: (prompt: string, _outFile: string) => [
          "--dangerously-skip-permissions", "--output-format", "text", "-p", prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: augmentedPath,
          AGENT_NAME: "BlueLake",
          CLAUDECODE: "",
          CLAUDE_CODE_ENTRYPOINT: "",
        }),
        readOutput: (stdout: string, _outFile: string) => stdout,
      },
      {
        name: "RedForest",
        slug: "redforest",
        bin: codexBin,
        role: ROLE_CONFIGS.codex,
        buildArgs: (prompt: string, outFile: string) => [
          "exec", "--full-auto", "--output-last-message", outFile, prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: augmentedPath,
          AGENT_NAME: "RedForest",
        }),
        readOutput: (_stdout: string, outFile: string) =>
          existsSync(outFile) ? readFileSync(outFile, "utf-8") : "",
      },
      {
        name: "GreenMountain",
        slug: "greenmountain",
        bin: agyBin,
        role: ROLE_CONFIGS.agy,
        buildArgs: (prompt: string, _outFile: string) => [
          "--dangerously-skip-permissions", "--model", "Gemini 3.1 Pro (High)", "-p", prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: augmentedPath,
          AGENT_NAME: "GreenMountain",
        }),
        readOutput: (stdout: string, _outFile: string) => stdout,
      },
    ];


    // -------------------------------------------------------------------
    // Execute one round
    // -------------------------------------------------------------------
    stderrLine(`\n========================================`);
    stderrLine(`  Brenner Robot Step — Round ${round}`);
    stderrLine(`========================================`);
    stderrLine(`Session:  ${sessionId}`);
    stderrLine(`Question: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}`);
    stderrLine(`Agents:   BlueLake (${claudeBin}), RedForest (${codexBin}), GreenMountain (${agyBin})`);
    stderrLine(`Mode:     ${sequential ? "sequential" : "parallel"}`);
    stderrLine(`========================================\n`);

    // Load or create artifact
    let artifact: Artifact;
    const stateFile = join(sessionDir, "session_state.json");
    if (round === 1) {
      artifact = createEmptyArtifact(sessionId);
    } else {
      if (!existsSync(stateFile)) {
        throw new Error(`Cannot run round ${round}: session_state.json not found. Run round 1 first.`);
      }
      artifact = JSON.parse(readFileSync(stateFile, "utf-8"));

      // Refuse to silently continue past an agent error the operator hasn't
      // seen yet. Fails open if the prior round predates this check (no
      // round_result.json) so older/resumed sessions aren't blocked.
      const priorRoundResultFile = join(sessionDir, `round_${round - 1}`, "round_result.json");
      if (existsSync(priorRoundResultFile) && !acknowledgeAgentErrors) {
        const priorResult = JSON.parse(readFileSync(priorRoundResultFile, "utf-8")) as {
          ok: boolean;
          agents: Record<string, { status: string; error?: string }>;
        };
        if (!priorResult.ok) {
          const failed = Object.entries(priorResult.agents)
            .filter(([, a]) => a.status === "error")
            .map(([name, a]) => `${name}${a.error ? ` (${a.error})` : ""}`);
          throw new Error(
            `Round ${round - 1} had agent errors that haven't been acknowledged: ${failed.join(", ")}.\n` +
            `Fix the underlying issue and rerun round ${round - 1} to retry, or pass ` +
            `--acknowledge-agent-errors to proceed to round ${round} without them.`,
          );
        }
      }
    }

    const roundDir = join(sessionDir, `round_${round}`);
    if (!existsSync(roundDir)) mkdirSync(roundDir, { recursive: true });

    let operatorBeliefs: OperatorBelief[] = [];
    let operatorBeliefLedgerFile: string | undefined;
    if (round > 1) {
      operatorBeliefs = loadOperatorBeliefsForRounds(sessionDir, round - 1);
      if (operatorBeliefs.length > 0) {
        const ledgerMarkdown = renderOperatorBeliefLedgerMarkdown(operatorBeliefs, "round");
        operatorBeliefLedgerFile = join(roundDir, "operator_belief_ledger.md");
        writeFileSync(operatorBeliefLedgerFile, ensureTrailingNewline(ledgerMarkdown));
        writeFileSync(
          join(roundDir, "operator_belief_ledger.json"),
          JSON.stringify({ beliefs: operatorBeliefs }, null, 2)
        );
        const loadedRounds = Array.from(
          new Set(
            operatorBeliefs
              .filter((belief) => belief.round !== null)
              .map((belief) => belief.round as number)
          )
        ).sort((a, b) => a - b);
        stderrLine(`  Loaded operator belief ledger from round${loadedRounds.length === 1 ? "" : "s"} ${loadedRounds.join(", ")}\n`);
      }
    }

    const operatorBeliefLedger = operatorBeliefs.length > 0
      ? renderOperatorBeliefLedgerMarkdown(operatorBeliefs, "round")
      : "";

    // Build prompts
    const prompts = new Map<RobotAgent, string>();
    for (const agent of agents) {
      const prompt = round === 1
        ? buildRobotRound1Prompt(agent, question, contextText, excerptText)
        : buildRobotRoundNPrompt(agent, artifact, round, operatorBeliefLedger);
      prompts.set(agent, prompt);
    }

    // Invoke agents
    const outputs = new Map<RobotAgent, string>();
    if (sequential) {
      for (const agent of agents) {
        const prompt = prompts.get(agent)!;
        const output = await invokeRobotAgent(agent, prompt, roundDir, sessionDir);
        outputs.set(agent, output);
      }
    } else {
      const results = await Promise.allSettled(
        agents.map(async (agent) => {
          const prompt = prompts.get(agent)!;
          const output = await invokeRobotAgent(agent, prompt, roundDir, sessionDir);
          return { agent, output };
        })
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          outputs.set(result.value.agent, result.value.output);
        } else {
          stderrLine(`  [!] Agent invocation failed: ${result.reason}`);
        }
      }
    }

    // Parse deltas from all agent outputs
    const ts = new Date().toISOString();
    const allRoundDeltas: Array<ValidDelta & { timestamp: string; agent: string }> = [];
    const agentHealth: Record<string, { status: string; error?: string; deltas: number }> = {};
    for (const agent of agents) {
      const output = outputs.get(agent) ?? "";
      if (!output.trim()) {
        stderrLine(`  [!] ${agent.name}: no output`);
        agentHealth[agent.name] = { status: "error", error: "no output", deltas: 0 };
        continue;
      }
      const agentDeltas = parseRobotAgentDeltas(agent.name, output, ts);
      stderrLine(`  ${agent.name}: ${agentDeltas.length} valid deltas`);
      agentHealth[agent.name] = { status: "ok", deltas: agentDeltas.length };
      allRoundDeltas.push(...agentDeltas);
    }
    // Mark agents that failed to invoke at all
    for (const agent of agents) {
      if (!agentHealth[agent.name]) {
        agentHealth[agent.name] = { status: "error", error: "invocation failed", deltas: 0 };
      }
    }

    // Save raw deltas
    writeFileSync(join(roundDir, "deltas.json"), JSON.stringify(allRoundDeltas, null, 2));

    // Merge deltas into artifact
    const mergeResult = mergeArtifactWithTimestamps(artifact, allRoundDeltas);
    let mergeErrors = 0;
    artifact = mergeResult.artifact;
    if (!mergeResult.ok) {
      mergeErrors = mergeResult.errors.length;
      stderrLine(`  Merge: ${mergeErrors} errors (${mergeResult.applied_count} deltas applied successfully)`);
      for (const err of mergeResult.errors.slice(0, 5)) {
        stderrLine(`    - ${err.message}`);
      }
    }

    // Lint
    const lintReport = lintArtifact(artifact);
    if (lintReport.violations.length > 0) {
      const errorCount = lintReport.violations.filter((v) => v.severity === "error").length;
      const warnCount = lintReport.violations.filter((v) => v.severity === "warning").length;
      stderrLine(`  Lint: ${errorCount} errors, ${warnCount} warnings`);
    } else {
      stderrLine(`  Lint: clean`);
    }

    // Persist artifact and state
    writeFileSync(join(sessionDir, "artifact.md"), renderArtifactMarkdown(artifact));
    writeFileSync(join(sessionDir, "session_state.json"), JSON.stringify(artifact, null, 2));

    // Count operations and check convergence
    const adds = allRoundDeltas.filter((d) => d.operation === "ADD").length;
    const kills = allRoundDeltas.filter((d) => d.operation === "KILL").length;
    const edits = allRoundDeltas.filter((d) => d.operation === "EDIT").length;
    const convergence = checkRobotConvergence(allRoundDeltas, round, artifact);
    const roundOk = Object.values(agentHealth).every((a) => a.status === "ok");

    // Persist this round's outcome so the next invocation can refuse to
    // silently continue past an unacknowledged agent error (see the gate
    // check near the top of this block).
    writeFileSync(
      join(roundDir, "round_result.json"),
      JSON.stringify({ round, ok: roundOk, agents: agentHealth }, null, 2),
    );

    const activeHypotheses = (artifact.sections.hypothesis_slate as any[])
      .filter((h: any) => !h.killed);
    const killedHypotheses = (artifact.sections.hypothesis_slate as any[])
      .filter((h: any) => h.killed);

    stderrLine(`\n  Round ${round} summary: +${adds} adds, -${kills} kills, ~${edits} edits`);
    stderrLine(`  ${convergence.reason}`);
    stderrLine(`  Active hypotheses: ${activeHypotheses.length}`);
    stderrLine(`  Killed hypotheses: ${killedHypotheses.length}`);

    if (convergence.converged) {
      stderrLine(`\n  >>> Session converged after round ${round} <<<\n`);
    }

    // Output JSON result to stdout
    stdoutLine(JSON.stringify({
      ok: roundOk,
      sessionId,
      sessionDir,
      round,
      adds,
      kills,
      edits,
      mergeErrors,
      converged: convergence.converged,
      convergenceReason: convergence.reason,
      activeHypotheses: activeHypotheses.length,
      killedHypotheses: killedHypotheses.length,
      artifactVersion: artifact.metadata.version,
      artifactFile: join(sessionDir, "artifact.md"),
      stateFile: join(sessionDir, "session_state.json"),
      operatorNotesFile: join(sessionDir, `operator_notes_round_${round}.md`),
      ...(operatorBeliefLedgerFile ? { operatorBeliefLedgerFile } : {}),
      agents: agentHealth,
    }, null, 2));

    process.exit(0);
  }

// ============================================================================
// session robot-stress — adversarial stress test on survivors
// ============================================================================

export async function runRobotStress(flags: ParsedArgs["flags"]): Promise<void> {
    const sessionDirRaw = asStringFlag(flags, "session-dir");
    if (!sessionDirRaw) throw new Error("Missing --session-dir.");
    const sessionDir = resolve(sessionDirRaw);

    const operatorContextFile = asStringFlag(flags, "operator-context");
    const sequential = asBoolFlag(flags, "sequential");

    // Load session state
    const stateFile = join(sessionDir, "session_state.json");
    if (!existsSync(stateFile)) {
      throw new Error(`Missing session_state.json in ${sessionDir}. Run a full session first.`);
    }
    const artifact: Artifact = JSON.parse(readFileSync(stateFile, "utf-8"));

    // Identify survivors
    const survivors = (artifact.sections.hypothesis_slate as any[])
      .filter((h: any) => !h.killed);
    if (survivors.length === 0) {
      stdoutLine(JSON.stringify({
        ok: true,
        sessionDir,
        survivors: [],
        agents: {},
        note: "No surviving hypotheses to stress test.",
      }, null, 2));
      process.exit(0);
    }

    const survivorNames = survivors.map((h: any) => h.name ?? h.id ?? "unnamed");

    // Render the full artifact
    const artifactMd = renderArtifactMarkdown(artifact);

    // Build the stress test prompt
    const survivorList = survivors
      .map((h: any, i: number) => `${i + 1}. **${h.name ?? h.id ?? "unnamed"}**: ${h.claim ?? h.statement ?? "(no claim)"}`)
      .join("\n");

    function buildBlindStressPrompt(agentName: string, roleName: string): string {
      const parts: string[] = [];
      parts.push(`You are ${agentName} (${roleName}). You are performing the BLIND adversarial stress pass on hypotheses that survived a full multi-round Brenner Protocol session.\n`);
      parts.push(`## Pass Rules\n\nThis blind pass intentionally withholds operator corrections, operator beliefs, and post-session rescue framing. Attack only from the artifact and survivor text below. If you notice an ambiguity that might depend on operator context, state the conditional weakness explicitly instead of assuming an operator rescue.\n`);
      parts.push(`## Surviving Hypotheses\n\n${survivorList}\n`);
      parts.push(`## Full Artifact\n\n${artifactMd}\n`);
      parts.push(`## Your Task\n\nThese hypotheses survived a full multi-round Brenner Protocol session. Your job in this blind pass is to kill them using only artifact evidence. Attack specifically — no framing critique, no new hypotheses, no adds. For each survivor: what concrete evidence, scenario, or counter-example would falsify it? If you can't construct a kill, explain precisely why the artifact still leaves it standing.\n`);
      return parts.join("\n");
    }

    function buildInformedStressPrompt(
      agentName: string,
      roleName: string,
      operatorBeliefLedger: string,
      blindPassBundle: string,
    ): string {
      const parts: string[] = [];
      parts.push(`You are ${agentName} (${roleName}). You are performing the INFORMED adversarial stress pass on hypotheses that survived a full multi-round Brenner Protocol session.\n`);
      parts.push(`## Pass Rules\n\nThis informed pass happens AFTER a blind pass. Start from the full blind debate, then review the operator belief ledger. Factual corrections can rescue or narrow a blind attack if they directly contradict one of its premises. Analytical judgments remain contestable. Kill-signals are not commands. Do not replace a blind attack with operator preference alone; if you change your conclusion, identify the exact premise that changed and why. You are allowed to disagree with your own blind-pass output or another agent's blind-pass output, but only by making the disagreement explicit.\n`);
      parts.push(`## Surviving Hypotheses\n\n${survivorList}\n`);
      parts.push(`## Full Artifact\n\n${artifactMd}\n`);
      if (blindPassBundle.trim()) {
        parts.push(`## Blind Pass Debate\n\n${blindPassBundle}\n`);
      }
      if (operatorBeliefLedger.trim()) {
        parts.push(`${operatorBeliefLedger}\n`);
      }
      parts.push(`## Your Task\n\nRevisit the survivors after seeing the full blind debate and the operator belief ledger. Preserve blind-pass kills unless a factual correction genuinely rescues them. Strengthen surviving attacks where the ledger reveals a narrower, more mechanistic failure mode. If another agent's blind-pass attack is better than yours, build on it explicitly. Attack specifically — no framing critique, no new hypotheses, no adds. For each survivor: what concrete evidence, scenario, or counter-example would falsify it now? If you still can't construct a kill, explain precisely why it remains robust even after seeing the ledger.\n`);
      return parts.join("\n");
    }

    // Resolve agent binaries
    const claudeBin = asStringFlag(flags, "claude-bin") ?? process.env.BRENNER_CLAUDE_BIN ?? "claude";
    const codexBin = asStringFlag(flags, "codex-bin") ?? process.env.BRENNER_CODEX_BIN ?? "codex";
    const agyBin = asStringFlag(flags, "agy-bin") ?? process.env.BRENNER_AGY_BIN ?? "agy";

    const augmentedPath = `${homedir()}/.local/bin:/usr/local/bin:${process.env.PATH ?? ""}`;

    // Agent configuration (same as robot-step)
    type StressAgent = {
      name: string;
      slug: string;
      roleName: string;
      bin: string;
      buildArgs: (prompt: string, outFile: string) => string[];
      buildEnv: () => Record<string, string | undefined>;
      readOutput: (stdout: string, outFile: string) => string;
    };

    const stressAgents: StressAgent[] = [
      {
        name: "BlueLake",
        slug: "bluelake",
        roleName: "Test Designer",
        bin: claudeBin,
        buildArgs: (prompt: string, _outFile: string) => [
          "--dangerously-skip-permissions", "--output-format", "text", "-p", prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: augmentedPath,
          AGENT_NAME: "BlueLake",
          CLAUDECODE: "",
          CLAUDE_CODE_ENTRYPOINT: "",
        }),
        readOutput: (stdout: string, _outFile: string) => stdout,
      },
      {
        name: "RedForest",
        slug: "redforest",
        roleName: "Hypothesis Generator",
        bin: codexBin,
        buildArgs: (prompt: string, outFile: string) => [
          "exec", "--full-auto", "--output-last-message", outFile, prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: augmentedPath,
          AGENT_NAME: "RedForest",
        }),
        readOutput: (_stdout: string, outFile: string) =>
          existsSync(outFile) ? readFileSync(outFile, "utf-8") : "",
      },
      {
        name: "GreenMountain",
        slug: "greenmountain",
        roleName: "Adversarial Critic",
        bin: agyBin,
        buildArgs: (prompt: string, _outFile: string) => [
          "--dangerously-skip-permissions", "--model", "Gemini 3.1 Pro (High)", "-p", prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: augmentedPath,
          AGENT_NAME: "GreenMountain",
        }),
        readOutput: (stdout: string, _outFile: string) => stdout,
      },
    ];

    type StressPassName = "blind" | "informed";
    type StressAgentRunResult = { output: string; error?: string };
    type StressPassAgentResult = { status: string; error?: string; outputFile: string; outputLength: number };
    type StressPassResult = {
      passName: StressPassName;
      dir: string;
      agents: Record<string, StressPassAgentResult>;
      outputs: Record<string, string>;
    };

    // Create stress_test directory
    const stressDir = join(sessionDir, "stress_test");
    if (!existsSync(stressDir)) mkdirSync(stressDir, { recursive: true });
    const blindDir = join(stressDir, "blind");
    if (!existsSync(blindDir)) mkdirSync(blindDir, { recursive: true });

    let operatorBeliefLedgerFile: string | undefined;
    let operatorBeliefLedger = "";
    if (operatorContextFile && !existsSync(operatorContextFile)) {
      throw new Error(`Operator context file not found: ${operatorContextFile}`);
    }
    const operatorBeliefs = loadOperatorBeliefsForStress(sessionDir, operatorContextFile);
    if (operatorBeliefs.length > 0) {
      operatorBeliefLedger = renderOperatorBeliefLedgerMarkdown(operatorBeliefs, "stress");
      operatorBeliefLedgerFile = join(stressDir, "operator_belief_ledger.md");
      writeFileSync(operatorBeliefLedgerFile, ensureTrailingNewline(operatorBeliefLedger));
      writeFileSync(
        join(stressDir, "operator_belief_ledger.json"),
        JSON.stringify({ beliefs: operatorBeliefs }, null, 2)
      );
      stderrLine(`  Loaded operator belief ledger (${operatorBeliefs.length} beliefs)\n`);
    }

    // Agent invocation (same timeout/SIGTERM→SIGKILL as robot-step)
    async function invokeStressAgent(
      agent: StressAgent,
      prompt: string,
      passDir: string,
      passName: StressPassName,
    ): Promise<StressAgentRunResult> {
      const outFile = join(passDir, `${agent.slug}_out.md`);

      // Write prompt to file
      writeFileSync(join(passDir, `${agent.slug}_prompt.md`), prompt);

      stderrLine(`  -> [${passName}] Invoking ${agent.name} (${agent.roleName})...`);

      return new Promise<StressAgentRunResult>((resolvePromise) => {
        const args = agent.buildArgs(prompt, outFile);
        const env = agent.buildEnv();

        let stdout = "";
        let stderr = "";

        const child = spawn(agent.bin, args, {
          env,
          stdio: ["ignore", "pipe", "pipe"],
          cwd: sessionDir,
        });

        child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
        child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

        // Timeout: 5 minutes
        const timeout = setTimeout(() => {
          stderrLine(`  [!] [${passName}] ${agent.name} timed out after 5 minutes`);
          child.kill("SIGTERM");
          // Escalate to SIGKILL after 10s
          const killTimeout = setTimeout(() => { child.kill("SIGKILL"); }, 10_000);
          child.on("exit", () => clearTimeout(killTimeout));
        }, 300_000);

        child.on("error", (err) => {
          clearTimeout(timeout);
          stderrLine(`  [!] [${passName}] ${agent.name} failed to launch: ${err.message}`);
          writeFileSync(outFile, "");
          resolvePromise({ output: "", error: `failed to launch: ${err.message}` });
        });

        child.on("exit", (code) => {
          clearTimeout(timeout);
          const output = agent.readOutput(stdout, outFile);
          writeFileSync(outFile, output);

          if (output.trim()) {
            stderrLine(`  [ok] [${passName}] ${agent.name} done (${output.length} chars)`);
            resolvePromise({ output });
          } else {
            const errMsg = `exit code ${code}, no output`;
            stderrLine(`  [!] [${passName}] ${agent.name}: ${errMsg}`);
            resolvePromise({ output: "", error: errMsg });
          }
        });
      });
    }

    function mirrorStressArtifacts(sourceDir: string, targetDir: string): void {
      for (const agent of stressAgents) {
        const promptSource = join(sourceDir, `${agent.slug}_prompt.md`);
        const outputSource = join(sourceDir, `${agent.slug}_out.md`);
        if (existsSync(promptSource)) {
          writeFileSync(join(targetDir, `${agent.slug}_prompt.md`), readFileSync(promptSource, "utf-8"));
        }
        if (existsSync(outputSource)) {
          writeFileSync(join(targetDir, `${agent.slug}_out.md`), readFileSync(outputSource, "utf-8"));
        }
      }
    }

    function renderBlindPassBundleMarkdown(outputs: Record<string, string>): string {
      const sections = stressAgents
        .map((agent) => {
          const output = (outputs[agent.name] ?? "").trim();
          if (!output) {
            return `### ${agent.name} (${agent.roleName})\n\n_No blind-pass output captured._`;
          }
          return `### ${agent.name} (${agent.roleName})\n\n${output}`;
        });
      return sections.join("\n\n");
    }

    async function runStressPass(
      passName: StressPassName,
      passDir: string,
      buildPromptForAgent: (agent: StressAgent) => string,
    ): Promise<StressPassResult> {
      if (!existsSync(passDir)) mkdirSync(passDir, { recursive: true });
      const agentResults: Record<string, StressPassAgentResult> = {};
      const outputs: Record<string, string> = {};

      stderrLine(`\n  ---- ${passName === "blind" ? "Blind" : "Informed"} pass ----`);

      if (sequential) {
        for (const agent of stressAgents) {
          const prompt = buildPromptForAgent(agent);
          const result = await invokeStressAgent(agent, prompt, passDir, passName);
          const outFile = join(passDir, `${agent.slug}_out.md`);
          outputs[agent.name] = result.output;
          agentResults[agent.name] = {
            status: result.error ? "error" : "ok",
            ...(result.error ? { error: result.error } : {}),
            outputFile: outFile,
            outputLength: result.output.length,
          };
        }
      } else {
        const results = await Promise.allSettled(
          stressAgents.map(async (agent) => {
            const prompt = buildPromptForAgent(agent);
            const result = await invokeStressAgent(agent, prompt, passDir, passName);
            return { agent, result };
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") {
            const { agent, result } = r.value;
            const outFile = join(passDir, `${agent.slug}_out.md`);
            outputs[agent.name] = result.output;
            agentResults[agent.name] = {
              status: result.error ? "error" : "ok",
              ...(result.error ? { error: result.error } : {}),
              outputFile: outFile,
              outputLength: result.output.length,
            };
          } else {
            stderrLine(`  [!] [${passName}] Agent invocation promise rejected: ${r.reason}`);
          }
        }
      }

      for (const agent of stressAgents) {
        if (!agentResults[agent.name]) {
          const outFile = join(passDir, `${agent.slug}_out.md`);
          agentResults[agent.name] = {
            status: "error",
            error: "invocation failed",
            outputFile: outFile,
            outputLength: 0,
          };
          outputs[agent.name] = existsSync(outFile) ? readFileSync(outFile, "utf-8") : "";
        }
      }

      return {
        passName,
        dir: passDir,
        agents: agentResults,
        outputs,
      };
    }

    stderrLine(`\n========================================`);
    stderrLine(`  Brenner Robot Stress Test`);
    stderrLine(`========================================`);
    stderrLine(`Session:    ${sessionDir.split("/").pop()}`);
    stderrLine(`Survivors:  ${survivors.length} (${survivorNames.join(", ")})`);
    stderrLine(`Agents:     BlueLake (${claudeBin}), RedForest (${codexBin}), GreenMountain (${agyBin})`);
    stderrLine(`Mode:       ${sequential ? "sequential" : "parallel"}`);
    stderrLine(`Passes:     blind${operatorBeliefs.length > 0 ? " -> informed" : ""}`);
    stderrLine(`========================================\n`);

    const blindPass = await runStressPass(
      "blind",
      blindDir,
      (agent) => buildBlindStressPrompt(agent.name, agent.roleName),
    );

    let informedPass: StressPassResult | null = null;
    let canonicalPass = blindPass;

    if (operatorBeliefs.length > 0) {
      const blindPassBundle = renderBlindPassBundleMarkdown(blindPass.outputs);
      informedPass = await runStressPass(
        "informed",
        stressDir,
        (agent) => buildInformedStressPrompt(
          agent.name,
          agent.roleName,
          operatorBeliefLedger,
          blindPassBundle,
        ),
      );
      canonicalPass = informedPass;
    } else {
      mirrorStressArtifacts(blindDir, stressDir);
    }

    stderrLine(`\n  Stress test complete.`);

    // Output JSON result to stdout
    stdoutLine(JSON.stringify({
      ok: true,
      sessionDir,
      survivors: survivorNames,
      passMode: informedPass ? "dual" : "blind_only",
      canonicalPass: canonicalPass.passName,
      ...(operatorBeliefLedgerFile ? { operatorBeliefLedgerFile } : {}),
      passes: {
        blind: {
          dir: blindPass.dir,
          agents: blindPass.agents,
        },
        ...(informedPass ? {
          informed: {
            dir: informedPass.dir,
            ...(operatorBeliefLedgerFile ? { operatorBeliefLedgerFile } : {}),
            agents: informedPass.agents,
          },
        } : {}),
      },
      agents: canonicalPass.agents,
    }, null, 2));

    process.exit(0);
  }

// ============================================================================
// session robot — fully automated multi-agent session, no HITL
// ============================================================================

export async function runRobot(flags: ParsedArgs["flags"]): Promise<void> {
    const sessionDirRaw = asStringFlag(flags, "session-dir");
    if (!sessionDirRaw) throw new Error("Missing --session-dir.");
    const sessionDir = resolve(sessionDirRaw);

    const question = asStringFlag(flags, "question");
    if (!question) throw new Error("Missing --question.");

    const contextFile = asStringFlag(flags, "context-file") ?? join(sessionDir, "context.md");
    const excerptFile = asStringFlag(flags, "excerpt-file") ?? join(sessionDir, "excerpt.md");
    const maxRounds = asIntFlag(flags, "max-rounds") ?? 5;
    const sequential = asBoolFlag(flags, "sequential");
    const jsonMode = asBoolFlag(flags, "json");

    // Extract session ID from directory name
    const sessionId = sessionDir.split("/").pop() ?? `RS-robot-${Date.now()}`;

    // Create session directory if it doesn't exist
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
      stderrLine(`Created session directory: ${sessionDir}`);
    }

    // Validate required files
    if (!existsSync(contextFile)) {
      throw new Error(
        `Missing context file: ${contextFile}\n\n` +
        `context.md grounds agents in your specific research question.\n\n` +
        `Create it:\n` +
        `  cat > ${contextFile} << 'EOF'\n` +
        `  ## Research Question\n` +
        `  <what are you trying to decide or understand?>\n\n` +
        `  ## Background\n` +
        `  <essential context the agents need>\n\n` +
        `  ## Evaluation Criteria\n` +
        `  <what does a good answer look like?>\n` +
        `  EOF`
      );
    }

    if (!existsSync(excerptFile)) {
      throw new Error(
        `Missing excerpt file: ${excerptFile}\n\n` +
        `excerpt.md grounds agents in Brenner's reasoning style.\n\n` +
        `Build one:\n` +
        `  brenner corpus search "your topic" --limit 5\n` +
        `  brenner excerpt build --sections 58,78 > ${excerptFile}\n\n` +
        `Or create an empty file to skip:\n` +
        `  touch ${excerptFile}`
      );
    }

    const contextText = readFileSync(contextFile, "utf8");
    const excerptText = readFileSync(excerptFile, "utf8");

    // Resolve agent binary paths: flags > env > PATH defaults
    function resolveAgentBin(flagKey: string, envKey: string, fallback: string): string {
      return asStringFlag(flags, flagKey) ?? process.env[envKey] ?? fallback;
    }
    const claudeBin = resolveAgentBin("claude-bin", "BRENNER_CLAUDE_BIN", "claude");
    const codexBin  = resolveAgentBin("codex-bin",  "BRENNER_CODEX_BIN",  "codex");
    const agyBin = resolveAgentBin("agy-bin", "BRENNER_AGY_BIN", "agy");

    // Augment PATH for agent binaries in common locations
    const localBin = join(homedir(), ".local", "bin");
    const robotPath = [localBin, "/usr/local/bin", process.env.PATH ?? ""].filter(Boolean).join(":");

    // Agent roster: three agents with incompatible mandates (RobotAgent type is module-level)
    const agents: RobotAgent[] = [
      {
        name: "BlueLake",
        slug: "bluelake",
        role: AGENT_ROLES["Claude"] ?? AGENT_ROLES["Opus"],
        bin: claudeBin,
        buildArgs: (prompt: string) => [
          "--dangerously-skip-permissions", "--output-format", "text", "-p", prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: robotPath,
          // Suppress nested Claude Code session detection
          CLAUDECODE: "",
          CLAUDE_CODE_ENTRYPOINT: "",
          AGENT_NAME: "BlueLake",
        }),
        readOutput: (stdout: string) => stdout,
      },
      {
        name: "RedForest",
        slug: "redforest",
        role: AGENT_ROLES["Codex"] ?? AGENT_ROLES["codex-cli"],
        bin: codexBin,
        buildArgs: (prompt: string, outFile: string) => [
          "exec", "--full-auto", "--output-last-message", outFile, prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: robotPath,
          AGENT_NAME: "RedForest",
        }),
        readOutput: (_stdout: string, outFile: string) =>
          existsSync(outFile) ? readFileSync(outFile, "utf8") : "",
      },
      {
        name: "GreenMountain",
        slug: "greenmountain",
        role: AGENT_ROLES["Gemini"] ?? AGENT_ROLES["gemini-cli"],
        bin: agyBin,
        buildArgs: (prompt: string) => [
          "--dangerously-skip-permissions", "--model", "Gemini 3.1 Pro (High)", "-p", prompt,
        ],
        buildEnv: () => ({
          ...process.env,
          PATH: robotPath,
          AGENT_NAME: "GreenMountain",
        }),
        readOutput: (stdout: string) => stdout,
      },
    ];


    // -------------------------------------------------------------------
    // Main session loop
    // -------------------------------------------------------------------
    stderrLine(`\n========================================`);
    stderrLine(`  Brenner Robot Mode`);
    stderrLine(`========================================`);
    stderrLine(`Session:    ${sessionId}`);
    stderrLine(`Question:   ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}`);
    stderrLine(`Max rounds: ${maxRounds}`);
    stderrLine(`Agents:     BlueLake (${claudeBin}), RedForest (${codexBin}), GreenMountain (${agyBin})`);
    stderrLine(`Mode:       ${sequential ? "sequential" : "parallel"}`);
    stderrLine(`========================================\n`);

    let artifact = createEmptyArtifact(sessionId);

    const sessionState: {
      sessionId: string;
      question: string;
      rounds: Array<{
        round: number;
        adds: number;
        kills: number;
        edits: number;
        errors: number;
        converged: boolean;
        reason: string;
        agents: Record<string, { status: string; deltas: number; error?: string }>;
      }>;
      finalArtifactVersion: number;
    } = {
      sessionId,
      question,
      rounds: [],
      finalArtifactVersion: 0,
    };

    for (let round = 1; round <= maxRounds; round++) {
      stderrLine(`--- Round ${round} of ${maxRounds} ---\n`);

      const roundDir = join(sessionDir, `round_${round}`);
      if (!existsSync(roundDir)) mkdirSync(roundDir, { recursive: true });

      // Build prompts
      const prompts = new Map<RobotAgent, string>();
      for (const agent of agents) {
        const prompt = round === 1
          ? buildRobotRound1Prompt(agent, question, contextText, excerptText)
          : buildRobotRoundNPrompt(agent, artifact, round);
        prompts.set(agent, prompt);
      }

      // Invoke agents (parallel or sequential)
      const outputs = new Map<RobotAgent, string>();
      if (sequential) {
        for (const agent of agents) {
          const prompt = prompts.get(agent)!;
          const output = await invokeRobotAgent(agent, prompt, roundDir, sessionDir);
          outputs.set(agent, output);
        }
      } else {
        const results = await Promise.allSettled(
          agents.map(async (agent) => {
            const prompt = prompts.get(agent)!;
            const output = await invokeRobotAgent(agent, prompt, roundDir, sessionDir);
            return { agent, output };
          })
        );
        for (const result of results) {
          if (result.status === "fulfilled") {
            outputs.set(result.value.agent, result.value.output);
          } else {
            stderrLine(`  [!] Agent invocation failed: ${result.reason}`);
          }
        }
      }

      // Parse deltas from all agent outputs with per-agent health tracking
      const ts = new Date().toISOString();
      const allRoundDeltas: Array<ValidDelta & { timestamp: string; agent: string }> = [];
      const agentHealth: Record<string, { status: string; deltas: number; error?: string }> = {};
      for (const agent of agents) {
        const output = outputs.get(agent) ?? "";
        if (!output.trim()) {
          stderrLine(`  [!] ${agent.name}: no output`);
          agentHealth[agent.name] = { status: "error", deltas: 0, error: "no output" };
          continue;
        }
        const agentDeltas = parseRobotAgentDeltas(agent.name, output, ts);
        stderrLine(`  ${agent.name}: ${agentDeltas.length} valid deltas`);
        agentHealth[agent.name] = { status: "ok", deltas: agentDeltas.length };
        allRoundDeltas.push(...agentDeltas);
      }

      // Save raw deltas for this round
      writeFileSync(
        join(roundDir, "deltas.json"),
        JSON.stringify(allRoundDeltas, null, 2),
      );

      // Merge deltas into artifact
      const mergeResult = mergeArtifactWithTimestamps(artifact, allRoundDeltas);
      let mergeErrors = 0;
      // Always use the (possibly partially-updated) artifact from merge
      artifact = mergeResult.artifact;
      if (!mergeResult.ok) {
        mergeErrors = mergeResult.errors.length;
        stderrLine(`  Merge: ${mergeErrors} errors (${mergeResult.applied_count} deltas applied successfully)`);
        for (const err of mergeResult.errors.slice(0, 5)) {
          stderrLine(`    - ${err.message}`);
        }
      }

      // Lint the artifact
      const lintReport = lintArtifact(artifact);
      if (lintReport.violations.length > 0) {
        const errorCount = lintReport.violations.filter((v) => v.severity === "error").length;
        const warnCount = lintReport.violations.filter((v) => v.severity === "warning").length;
        stderrLine(`  Lint: ${errorCount} errors, ${warnCount} warnings`);
      } else {
        stderrLine(`  Lint: clean`);
      }

      // Persist artifact markdown and state after each round
      writeFileSync(
        join(sessionDir, "artifact.md"),
        renderArtifactMarkdown(artifact),
      );
      writeFileSync(
        join(sessionDir, "session_state.json"),
        JSON.stringify(artifact, null, 2),
      );

      // Count operations
      const adds = allRoundDeltas.filter((d) => d.operation === "ADD").length;
      const kills = allRoundDeltas.filter((d) => d.operation === "KILL").length;
      const edits = allRoundDeltas.filter((d) => d.operation === "EDIT").length;

      // Check convergence
      const convergence = checkRobotConvergence(allRoundDeltas, round, artifact, maxRounds);

      sessionState.rounds.push({
        round,
        adds,
        kills,
        edits,
        errors: mergeErrors,
        converged: convergence.converged,
        reason: convergence.reason,
        agents: agentHealth,
      });
      sessionState.finalArtifactVersion = artifact.metadata.version;

      stderrLine(`\n  Round ${round} summary: +${adds} adds, -${kills} kills, ~${edits} edits`);
      stderrLine(`  ${convergence.reason}`);

      if (convergence.converged) {
        stderrLine(`\n  >>> Session converged after round ${round} <<<\n`);
        break;
      }

      stderrLine("");
    }

    // Final summary
    const activeHypotheses = (artifact.sections.hypothesis_slate as any[])
      .filter((h: any) => !h.killed);
    const killedHypotheses = (artifact.sections.hypothesis_slate as any[])
      .filter((h: any) => h.killed);

    // Save final session report
    writeFileSync(
      join(sessionDir, "robot_session.json"),
      JSON.stringify(sessionState, null, 2),
    );

    stderrLine(`========================================`);
    stderrLine(`  Session Complete`);
    stderrLine(`========================================`);
    stderrLine(`Rounds:            ${sessionState.rounds.length}`);
    stderrLine(`Artifact version:  ${artifact.metadata.version}`);
    stderrLine(`Active hypotheses: ${activeHypotheses.length}`);
    stderrLine(`Killed hypotheses: ${killedHypotheses.length}`);
    stderrLine(`Output:            ${join(sessionDir, "artifact.md")}`);
    stderrLine(`========================================\n`);

    if (jsonMode) {
      stdoutLine(JSON.stringify({
        ok: true,
        sessionId,
        sessionDir,
        roundsCompleted: sessionState.rounds.length,
        artifactVersion: artifact.metadata.version,
        activeHypotheses: activeHypotheses.length,
        killedHypotheses: killedHypotheses.length,
        rounds: sessionState.rounds,
        artifactFile: join(sessionDir, "artifact.md"),
        stateFile: join(sessionDir, "session_state.json"),
      }, null, 2));
    } else {
      // Print the final artifact to stdout for easy piping
      stdoutLine(renderArtifactMarkdown(artifact));
    }

    process.exit(0);
  }
