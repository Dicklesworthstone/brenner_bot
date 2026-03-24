#!/usr/bin/env bun
/**
 * Brenner Bot CLI.
 *
 * Goals (v0):
 * - Render/promote prompt templates with transcript excerpt injection.
 * - Coordinate multi-agent work via MCP Agent Mail (HTTP Streamable MCP).
 *
 * Runtime: Bun-only. Local imports are bundled when compiled.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";

// Shared modules from web lib (bundled by Bun)
import { AgentMailClient } from "./apps/web/src/lib/agentMail";
import { buildExcerptFromSections, composeExcerpt, type ComposedExcerpt, type ExcerptSection } from "./apps/web/src/lib/excerpt-builder";
import { CORPUS_DOCS } from "./apps/web/src/lib/corpus";
import { globalSearch, type SearchCategory } from "./apps/web/src/lib/globalSearch";
import type { Json } from "./apps/web/src/lib/json";
import { parseQuoteBank } from "./apps/web/src/lib/quotebank-parser";
import { parseOperatorCards, resolveOperatorCard, type OperatorCard } from "./apps/web/src/lib/operator-library";
import {
  AGENT_ROLES,
  composeKickoffMessages,
  getRolePromptMarkdown,
  getTriangulatedBrennerKernelMarkdown,
  type AgentRole,
  type KickoffConfig,
  type RoleConfig,
} from "./apps/web/src/lib/session-kickoff";
import { extractValidDeltas, parseDeltaMessage, type ValidDelta } from "./apps/web/src/lib/delta-parser";
import {
  createEmptyArtifact,
  formatLintReportHuman,
  formatLintReportJson,
  lintArtifact,
  mergeArtifactWithTimestamps,
  renderArtifactMarkdown,
  type Artifact,
  type LintReport,
  type LintSeverity,
  type LintViolation,
} from "./apps/web/src/lib/artifact-merge";
import {
  computeThreadStatusFromThread,
  extractVersion,
  formatThreadStatusSummary,
  parseSubjectType,
} from "./apps/web/src/lib/threadStatus";
import {
  parseManifest,
  detectPlatform,
  generateInstallPlan,
  formatPlanHuman,
  formatPlanJson,
  type PlatformString,
} from "./apps/web/src/lib/toolchain-manifest";
import { parseTranscript } from "./apps/web/src/lib/transcript-parser";
import { AnomalyStorage } from "./apps/web/src/lib/storage/anomaly-storage";
import {
  createAnomaly,
  resolveAnomaly,
  deferAnomaly,
  reactivateAnomaly,
  linkSpawnedHypothesis,
  generateAnomalyId,
  type Anomaly,
  type QuarantineStatus,
} from "./apps/web/src/lib/schemas/anomaly";
import { AssumptionStorage } from "./apps/web/src/lib/storage/assumption-storage";
import {
  createAssumption,
  generateAssumptionId,
  ScaleCalculationSchema,
  type Assumption,
  type AssumptionStatus,
  type AssumptionType,
  type ScaleCalculation,
} from "./apps/web/src/lib/schemas/assumption";
import { challengeAssumption, verifyAssumption, falsifyAssumption } from "./apps/web/src/lib/schemas/assumption-lifecycle";
import { CritiqueStorage } from "./apps/web/src/lib/storage/critique-storage";
import {
  acceptCritique,
  addressCritique,
  createCritique,
  dismissCritique,
  generateCritiqueId,
  type Critique,
  type CritiqueAction,
  type CritiqueSeverity,
  type CritiqueStatus,
  type CritiqueTargetType,
} from "./apps/web/src/lib/schemas/critique";
import { ProgramStorage } from "./apps/web/src/lib/storage/program-storage";
import { DashboardAggregator } from "./apps/web/src/lib/storage/program-dashboard";
import {
  createResearchProgram,
  generateProgramId,
  addSessionToProgram,
  removeSessionFromProgram,
  pauseProgram,
  resumeProgram,
  completeProgram,
  abandonProgram,
  type ResearchProgram,
  type ProgramStatus,
} from "./apps/web/src/lib/schemas/research-program";
import { HypothesisStorage } from "./apps/web/src/lib/storage/hypothesis-storage";
import {
  createHypothesis,
  generateHypothesisId,
  HypothesisSchema,
  type Hypothesis,
  type HypothesisState,
  type HypothesisCategory,
  type HypothesisOrigin,
  type HypothesisConfidence,
} from "./apps/web/src/lib/schemas/hypothesis";
import {
  transitionHypothesis,
  activateHypothesis,
  refuteHypothesis,
  confirmHypothesis,
  supersedeHypothesis,
  deferHypothesis,
  reactivateHypothesis,
  isTerminalState,
  type StateTransition,
} from "./apps/web/src/lib/schemas/hypothesis-lifecycle";
import { TestStorage } from "./apps/web/src/lib/storage/test-storage";
import { PredictionSchema, type Prediction } from "./apps/web/src/lib/schemas/prediction";
import { TestRecordSchema, type TestRecord, type TestStatus } from "./apps/web/src/lib/schemas/test-record";
import {
  recordTestExecution,
  suggestTransitionsFromExecution,
  type ExecutionInput,
} from "./apps/web/src/lib/schemas/test-binding";
import {
  scoreSession,
  BRENNER_QUOTES,
  type SessionData,
  type SessionDimensionScore,
  type DimensionScore,
} from "./apps/web/src/lib/schemas/scorecard";
import {
  createEmptySessionRecord,
  createTraceMessage,
  computeContentHash,
  validateSessionRecord,
  isReplayable,
} from "./apps/web/src/lib/schemas/session-replay";

function isRecord(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function parseEnsureProjectSlug(result: Json): string | undefined {
  if (!isRecord(result)) return undefined;

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent)) {
    const slug = structuredContent.slug;
    if (typeof slug === "string" && slug.length > 0) return slug;
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (isRecord(first) && typeof first.text === "string") {
      try {
        const parsed = JSON.parse(first.text) as Json;
        if (isRecord(parsed) && typeof parsed.slug === "string" && parsed.slug.length > 0) return parsed.slug;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function parseAgentNameFromToolResult(result: Json): string | undefined {
  if (!isRecord(result)) return undefined;

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent)) {
    const name = structuredContent.name;
    if (typeof name === "string" && name.length > 0) return name;
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (isRecord(first) && typeof first.text === "string") {
      try {
        const parsed = JSON.parse(first.text) as Json;
        if (isRecord(parsed) && typeof parsed.name === "string" && parsed.name.length > 0) return parsed.name;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function isToolError(result: Json): boolean {
  return isRecord(result) && result.isError === true;
}

type ParsedArgs = {
  positional: string[];
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";
    if (token === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const eq = token.indexOf("=");
    if (eq !== -1) {
      const key = token.slice(2, eq).trim();
      const value = token.slice(eq + 1);
      flags[key] = value;
      continue;
    }

    const key = token.slice(2).trim();
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i++;
  }

  return { positional, flags };
}

function asStringFlag(flags: ParsedArgs["flags"], key: string): string | undefined {
  const value = flags[key];
  if (typeof value === "string") return value;
  return undefined;
}

function asBoolFlag(flags: ParsedArgs["flags"], key: string): boolean {
  return flags[key] === true;
}

function asIntFlag(flags: ParsedArgs["flags"], key: string): number | undefined {
  const raw = asStringFlag(flags, key);
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`Invalid --${key}: expected integer, got "${raw}"`);
  return n;
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const VALID_ROSTER_ROLES: AgentRole[] = ["hypothesis_generator", "test_designer", "adversarial_critic"];

function parseRoleMapFlag(value: string): Record<string, AgentRole> {
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error(
      `Invalid --role-map: expected "Name=role,Name=role" (roles: ${VALID_ROSTER_ROLES.join(", ")})`
    );
  }

  const out: Record<string, AgentRole> = {};
  const seen = new Map<string, string>();

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) throw new Error(`Invalid --role-map entry "${part}": expected "Name=role"`);

    const name = part.slice(0, eq).trim();
    const roleRaw = part.slice(eq + 1).trim();

    if (!name) throw new Error(`Invalid --role-map entry "${part}": missing agent name`);
    if (!roleRaw) throw new Error(`Invalid --role-map entry "${part}": missing role`);

    const normalizedName = name.toLowerCase();
    const previous = seen.get(normalizedName);
    if (previous) {
      throw new Error(`Invalid --role-map: duplicate mapping for "${name}" (also provided for "${previous}")`);
    }
    seen.set(normalizedName, name);

    if (!VALID_ROSTER_ROLES.includes(roleRaw as AgentRole)) {
      throw new Error(
        `Invalid --role-map role for "${name}": "${roleRaw}". Expected one of: ${VALID_ROSTER_ROLES.join(", ")}`
      );
    }

    out[name] = roleRaw as AgentRole;
  }

  return out;
}

function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}

function parseArtifactFromJsonFile(path: string): Artifact {
  let parsed: Json;
  try {
    parsed = JSON.parse(readTextFile(path)) as Json;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse artifact JSON at ${path}: ${msg}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`Artifact JSON must be an object: ${path}`);
  }

  return parsed as unknown as Artifact;
}

function stdoutLine(message: string): void {
  process.stdout.write(ensureTrailingNewline(message));
}

function stderrLine(message: string): void {
  process.stderr.write(ensureTrailingNewline(message));
}

async function confirmDestructiveAction(message: string, assumeYes: boolean): Promise<void> {
  if (assumeYes) return;
  const promptOut = process.stderr;
  if (!process.stdin.isTTY || !promptOut.isTTY) {
    throw new Error(`${message} Pass --yes to confirm in non-interactive mode.`);
  }
  const rl = createInterface({ input: process.stdin, output: promptOut });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  try {
    const answer = (await ask(`${message} Type "yes" to confirm: `)).trim().toLowerCase();
    if (answer !== "yes" && answer !== "y") {
      throw new Error("Aborted.");
    }
  } finally {
    rl.close();
  }
}

const sanitizeThreadIdForArtifactFilename = (threadId: string): string => {
  const trimmed = threadId.trim();
  const withoutSeparators = trimmed.replace(/[\\/]+/g, "-");
  const withoutUnsafe = withoutSeparators.replace(/[^A-Za-z0-9._-]+/g, "-");
  const collapsedDashes = withoutUnsafe.replace(/-+/g, "-");
  const strippedEdges = collapsedDashes.replace(/^[-.]+|[-.]+$/g, "");
  return strippedEdges || "thread";
};

type HypothesisTransitionLog = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  transitions: StateTransition[];
};

function extractSessionIdFromHypothesisId(hypothesisId: string): string | null {
  const match = hypothesisId.match(/^H-(.+)-\d{3}$/);
  if (!match) return null;
  return match[1] ?? null;
}

function ensureHypothesisTransitionDir(baseDir: string): string {
  const dir = join(baseDir, ".research", "transitions");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function transitionLogPath(baseDir: string, sessionId: string): string {
  const safeSession = sanitizeThreadIdForArtifactFilename(sessionId);
  const dir = ensureHypothesisTransitionDir(baseDir);
  return join(dir, `${safeSession}-transitions.json`);
}

function loadHypothesisTransitionLog(baseDir: string, sessionId: string): HypothesisTransitionLog {
  const path = transitionLogPath(baseDir, sessionId);
  const now = new Date().toISOString();

  if (!existsSync(path)) {
    return { sessionId, createdAt: now, updatedAt: now, transitions: [] };
  }

  let parsed: HypothesisTransitionLog;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as HypothesisTransitionLog;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse hypothesis transition log at ${path}: ${message}`);
  }

  if (!parsed || !Array.isArray(parsed.transitions)) {
    throw new Error(`Invalid hypothesis transition log at ${path}`);
  }

  return {
    sessionId: parsed.sessionId ?? sessionId,
    createdAt: parsed.createdAt ?? now,
    updatedAt: parsed.updatedAt ?? now,
    transitions: parsed.transitions ?? [],
  };
}

function saveHypothesisTransitionLog(baseDir: string, log: HypothesisTransitionLog): void {
  const path = transitionLogPath(baseDir, log.sessionId);
  writeFileSync(path, JSON.stringify(log, null, 2));
}

function appendHypothesisTransition(baseDir: string, transition: StateTransition): void {
  const sessionId = transition.sessionId ?? extractSessionIdFromHypothesisId(transition.hypothesisId);
  if (!sessionId) return;

  const log = loadHypothesisTransitionLog(baseDir, sessionId);
  const already = log.transitions.some((entry) => entry.id === transition.id);
  if (!already) {
    log.transitions.push({
      ...transition,
      sessionId,
    });
  }
  log.updatedAt = transition.timestamp ?? new Date().toISOString();
  saveHypothesisTransitionLog(baseDir, log);
}

function loadHypothesisTransitionHistory(baseDir: string, hypothesisId: string): StateTransition[] {
  const sessionId = extractSessionIdFromHypothesisId(hypothesisId);
  if (!sessionId) return [];

  const log = loadHypothesisTransitionLog(baseDir, sessionId);
  return log.transitions
    .filter((entry) => entry.hypothesisId === hypothesisId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function formatUtcTimestampForFilename(date: Date): string {
  // YYYYMMDDTHHMMSSZ (UTC)
  const iso = date.toISOString(); // e.g. 2025-12-31T04:03:31.119Z
  const head = iso.slice(0, 19); // 2025-12-31T04:03:31
  return head.replace(/[-:]/g, "") + "Z";
}

type ExperimentResultV01 = {
  schema_version: "experiment_result_v0.1";
  result_id: string;
  capture_mode: "run" | "record";
  thread_id: string;
  test_id: string;

  created_at: string;
  cwd: string;
  argv: string[] | null;

  timeout_seconds: number | null;
  timed_out: boolean;

  exit_code: number;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;

  stdout: string;
  stderr: string;

  git?: {
    sha: string;
    dirty: boolean;
    status_porcelain: string[];
  };

  runtime: {
    platform: string;
    arch: string;
    bun_version: string;
  };
};

// ============================================================================
// Evidence Pack Types (v0.1)
// ============================================================================

type EvidenceType =
  | "paper"
  | "preprint"
  | "dataset"
  | "experiment"
  | "observation"
  | "prior_session"
  | "expert_opinion"
  | "code_artifact";

type EvidenceExcerpt = {
  anchor: string; // E1, E2, etc.
  text: string;
  verbatim: boolean;
  location?: string;
  note?: string;
};

type EvidenceRecord = {
  id: string; // EV-001, EV-002, etc.
  type: EvidenceType;
  title: string;
  authors?: string[];
  date?: string;
  source: string;
  access_method: "url" | "doi" | "file" | "session" | "manual";
  imported_at: string;
  imported_by: string;
  relevance: string;
  key_findings: string[];
  supports?: string[];
  refutes?: string[];
  informs?: string[];
  verified: boolean;
  verification_notes?: string;
  excerpts: EvidenceExcerpt[];
};

type EvidencePack = {
  version: "0.1";
  thread_id: string;
  created_at: string;
  updated_at: string;
  next_id: number;
  records: EvidenceRecord[];
};

function bestEffortGitProvenance(cwd: string):
  | {
      sha: string;
      dirty: boolean;
      status_porcelain: string[];
    }
  | null {
  const gitPath = Bun.which("git");
  if (!gitPath) return null;

  try {
    const rev = Bun.spawnSync([gitPath, "rev-parse", "HEAD"], { cwd, stdout: "pipe", stderr: "pipe" });
    if (rev.exitCode !== 0) return null;
    const sha = rev.stdout.toString().trim();
    if (!sha) return null;

    const status = Bun.spawnSync([gitPath, "status", "--porcelain"], { cwd, stdout: "pipe", stderr: "pipe" });
    if (status.exitCode !== 0) return null;
    const statusLines = status.stdout
      .toString()
      .split("\n")
      .map((s) => s.trimEnd())
      .filter(Boolean);

    return { sha, dirty: statusLines.length > 0, status_porcelain: statusLines };
  } catch {
    return null;
  }
}

async function withWorkingDirectory<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(previous);
  }
}

function resolveWebAppCwd(projectKey: string): string {
  const absoluteProjectKey = resolve(projectKey);

  const webAppMarkerFiles = ["package.json", "next.config.ts"];
  if (webAppMarkerFiles.every((f) => existsSync(join(absoluteProjectKey, f)))) return absoluteProjectKey;

  let cursor = absoluteProjectKey;
  while (true) {
    const repoRootCandidate = resolve(cursor, "apps", "web");
    if (existsSync(join(repoRootCandidate, "package.json"))) return repoRootCandidate;

    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  throw new Error(
    `Could not locate apps/web from project key: ${absoluteProjectKey}\n` +
      `Expected either:\n` +
      `- A repo root (or subdir) containing apps/web/package.json\n` +
      `- The web app root itself (apps/web) containing: ${webAppMarkerFiles.join(", ")}`
  );
}

function normalizePublicBaseUrl(value: string, envName: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function getCliPublicBaseUrl(): string {
  const explicit = process.env.BRENNER_PUBLIC_BASE_URL?.trim();
  if (explicit) return normalizePublicBaseUrl(explicit, "BRENNER_PUBLIC_BASE_URL");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  return "https://brennerbot.org";
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!trimmed.startsWith("/")) return trimmed;

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return `${baseUrl.replace(/\/$/, "")}${trimmed}`;
  }
}

function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function envNonEmpty(key: string): string | undefined {
  return nonEmptyString(process.env[key]);
}

type BrennerConfigFile = {
  agentMail?: {
    baseUrl?: string;
    path?: string;
    bearerToken?: string;
  };
  defaults?: {
    projectKey?: string;
    template?: string;
  };
};

type BrennerLoadedConfig = {
  path: string | null;
  config: BrennerConfigFile;
};

type BrennerRuntimeConfig = {
  configFilePath: string | null;
  agentMail: { baseUrl: string; path: string; bearerToken?: string };
  defaults: { projectKey: string; template: string };
};

function defaultConfigPath(): string {
  if (process.platform === "win32") {
    const base = envNonEmpty("APPDATA") ?? join(homedir(), "AppData", "Roaming");
    return join(base, "brenner", "config.json");
  }

  const base = envNonEmpty("XDG_CONFIG_HOME") ?? join(homedir(), ".config");
  return join(base, "brenner", "config.json");
}

function resolveConfigPath(flags: ParsedArgs["flags"]): { path: string; explicit: boolean } {
  const flagPath = nonEmptyString(asStringFlag(flags, "config"));
  const envPath = envNonEmpty("BRENNER_CONFIG_PATH");
  if (flagPath) return { path: resolve(flagPath), explicit: true };
  if (envPath) return { path: resolve(envPath), explicit: true };
  return { path: defaultConfigPath(), explicit: false };
}

function parseBrennerConfigJson(text: string, configPath: string): BrennerConfigFile {
  let parsed: Json;
  try {
    parsed = JSON.parse(text) as Json;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse config JSON at ${configPath}: ${msg}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`Config file must be a JSON object: ${configPath}`);
  }

  const out: BrennerConfigFile = {};

  const agentMail = parsed.agentMail;
  if (agentMail !== undefined) {
    if (!isRecord(agentMail)) throw new Error(`Config field "agentMail" must be an object: ${configPath}`);
    const baseUrl = nonEmptyString(agentMail.baseUrl);
    const path = nonEmptyString(agentMail.path);
    const bearerToken = nonEmptyString(agentMail.bearerToken);
    if (baseUrl || path || bearerToken) {
      out.agentMail = {
        ...(baseUrl ? { baseUrl } : {}),
        ...(path ? { path } : {}),
        ...(bearerToken ? { bearerToken } : {}),
      };
    }
  }

  const defaults = parsed.defaults;
  if (defaults !== undefined) {
    if (!isRecord(defaults)) throw new Error(`Config field "defaults" must be an object: ${configPath}`);
    const projectKey = nonEmptyString(defaults.projectKey);
    const template = nonEmptyString(defaults.template);
    if (projectKey || template) {
      const merged: { projectKey?: string; template?: string } = {};
      if (projectKey) merged.projectKey = projectKey;
      if (template) merged.template = template;
      out.defaults = merged;
    }
  }

  return out;
}

function loadBrennerConfig(flags: ParsedArgs["flags"]): BrennerLoadedConfig {
  const { path, explicit } = resolveConfigPath(flags);
  if (!existsSync(path)) {
    if (explicit) throw new Error(`Config file not found: ${path}`);
    return { path: null, config: {} };
  }

  try {
    const raw = readTextFile(path);
    return { path, config: parseBrennerConfigJson(raw, path) };
  } catch (e) {
    if (explicit) throw e;

    const msg = e instanceof Error ? e.message : String(e);
    stderrLine(`Warning: ignoring invalid config at ${path}: ${msg}`);
    return { path: null, config: {} };
  }
}

function resolveBrennerRuntimeConfig(loaded: BrennerLoadedConfig): BrennerRuntimeConfig {
  const fileAgentMail = loaded.config.agentMail;
  const baseUrl = (envNonEmpty("AGENT_MAIL_BASE_URL") ?? fileAgentMail?.baseUrl ?? "http://127.0.0.1:8765").replace(
    /\/+$/,
    "",
  );
  const rawPath = envNonEmpty("AGENT_MAIL_PATH") ?? fileAgentMail?.path ?? "/mcp/";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const bearerToken = envNonEmpty("AGENT_MAIL_BEARER_TOKEN") ?? fileAgentMail?.bearerToken;

  const fileDefaults = loaded.config.defaults;
  const defaultProjectKey = resolve(fileDefaults?.projectKey ?? process.cwd());
  const defaultTemplate = fileDefaults?.template ?? "metaprompt_by_gpt_52.md";

  return {
    configFilePath: loaded.path,
    agentMail: { baseUrl, path, bearerToken },
    defaults: { projectKey: defaultProjectKey, template: defaultTemplate },
  };
}

type BrennerBuildInfo = {
  version: string;
  gitSha: string | null;
  buildDate: string | null;
  platformTarget: string;
};

type DoctorCheckStatus = "ok" | "missing" | "error" | "skipped";

type DoctorCheck = {
  status: DoctorCheckStatus;
  path: string | null;
  verifyCommand: string | null;
  exitCode: number | null;
  notes?: string | null;
  stdout?: string;
  stderr?: string;
};

function normalizeSemverTag(tag: string): string | null {
  const trimmed = tag.trim();
  const withoutV = trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
  if (/^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?$/.test(withoutV)) return withoutV;
  return null;
}

function tryGit(args: string[]): string | null {
  try {
    const proc = Bun.spawnSync(["git", ...args], { stdout: "pipe", stderr: "pipe" });
    if (proc.exitCode !== 0) return null;
    const out = proc.stdout.toString().trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

function inferPlatformTarget(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") return arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  if (platform === "linux") return arch === "arm64" ? "linux-arm64" : "linux-x64";
  if (platform === "win32") return arch === "arm64" ? "win-arm64" : "win-x64";

  return `${platform}-${arch}`;
}

function getBrennerBuildInfo(): BrennerBuildInfo {
  const envVersion = process.env.BRENNER_VERSION;
  const envGitSha = process.env.BRENNER_GIT_SHA;
  const envBuildDate = process.env.BRENNER_BUILD_DATE;
  const envTarget = process.env.BRENNER_TARGET;

  const gitTag = tryGit(["describe", "--tags", "--exact-match"]);
  const normalizedGitTag = gitTag ? normalizeSemverTag(gitTag) : null;

  const normalizedEnvVersion = envVersion ? normalizeSemverTag(envVersion) : null;

  const version = normalizedEnvVersion ?? normalizedGitTag ?? envVersion ?? "0.0.0-dev";

  const gitSha = envGitSha ?? tryGit(["rev-parse", "HEAD"]);
  const buildDate = envBuildDate ?? tryGit(["show", "-s", "--format=%cI", "HEAD"]);
  const platformTarget = envTarget ?? inferPlatformTarget();

  return { version, gitSha, buildDate, platformTarget };
}

function formatBrennerVersionText(info: BrennerBuildInfo): string {
  const sha = info.gitSha ? info.gitSha.slice(0, 12) : "unknown";
  const built = info.buildDate ?? "unknown";

  return [
    `brenner ${info.version}`,
    `git: ${sha}`,
    `built: ${built}`,
    `target: ${info.platformTarget}`,
  ].join("\n");
}

function splitCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i] ?? "";

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) tokens.push(current);
  return tokens;
}

function runCommand(command: string): { exitCode: number; stdout: string; stderr: string } {
  const argv = splitCommand(command);
  if (argv.length === 0) return { exitCode: 1, stdout: "", stderr: "Empty command" };

  try {
    const proc = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
    return {
      exitCode: proc.exitCode ?? 1,
      stdout: proc.stdout.toString(),
      stderr: proc.stderr.toString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { exitCode: 1, stdout: "", stderr: msg };
  }
}

function normalizeExcerptQuote(text: string, maxWords: number): string {
  const normalized = text.replace(/\s+/g, " ").trim().replaceAll("\"", "'");
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return normalized;
  return words.slice(0, maxWords).join(" ") + "...";
}

type CassMemoryContextBullet = {
  id: string | null;
  content: string;
  raw: Json;
};

type CassMemoryContextHistorySnippet = {
  snippet: string;
  raw: Json;
};

type CassMemoryContextNormalized = {
  success: boolean;
  task: string;
  relevantBullets: CassMemoryContextBullet[];
  antiPatterns: CassMemoryContextBullet[];
  historySnippets: CassMemoryContextHistorySnippet[];
  suggestedCassQueries: string[];
  degraded: Json | null;
  error: { code?: string; message?: string; hint?: string; retryable?: boolean } | null;
  raw: Json;
};

type CassMemoryContextOptions = {
  workspace?: string;
  top?: number;
  history?: number;
  days?: number;
  logContext?: boolean;
  sessionId?: string;
};

type CassMemoryContextProvenance = {
  mode: "mcp" | "cli" | "none";
  startedAt: string;
  durationMs: number;
  mcp?: { baseUrl: string; path: string; tool: string; args: Record<string, Json> };
  cli?: { argv: string[]; exitCode: number; stderr: string };
  errors: string[];
};

type CassMemoryContextResult = {
  ok: boolean;
  context: CassMemoryContextNormalized | null;
  provenance: CassMemoryContextProvenance;
};

type CassMemoryKickoffAudit = {
  enabled: true;
  ok: boolean;
  injected: boolean;
  memoryContext: string | null;
  provenance: CassMemoryContextProvenance;
} | null;

function normalizeCassMemoryBullet(item: Json): CassMemoryContextBullet {
  if (typeof item === "string") return { id: null, content: item, raw: item };

  if (isRecord(item)) {
    const content = typeof item.content === "string" ? item.content : JSON.stringify(item);
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : null;
    return { id, content, raw: item };
  }

  return { id: null, content: JSON.stringify(item), raw: item };
}

function normalizeCassMemoryHistorySnippet(item: Json): CassMemoryContextHistorySnippet {
  if (typeof item === "string") return { snippet: item, raw: item };

  if (isRecord(item)) {
    const snippet = typeof item.snippet === "string" ? item.snippet : JSON.stringify(item);
    return { snippet, raw: item };
  }

  return { snippet: JSON.stringify(item), raw: item };
}

function normalizeCassMemoryStringArray(value: Json | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function parseCassMemoryContext(raw: Json, fallbackTask: string): CassMemoryContextNormalized {
  if (!isRecord(raw)) {
    return {
      success: false,
      task: fallbackTask,
      relevantBullets: [],
      antiPatterns: [],
      historySnippets: [],
      suggestedCassQueries: [],
      degraded: null,
      error: { message: "Malformed cm context JSON (expected object)" },
      raw,
    };
  }

  const success = raw.success === true;
  const task = typeof raw.task === "string" && raw.task.length > 0 ? raw.task : fallbackTask;

  const relevantBullets = Array.isArray(raw.relevantBullets)
    ? raw.relevantBullets.map((item) => normalizeCassMemoryBullet(item))
    : [];

  const antiPatterns = Array.isArray(raw.antiPatterns) ? raw.antiPatterns.map((item) => normalizeCassMemoryBullet(item)) : [];

  const historySnippets = Array.isArray(raw.historySnippets)
    ? raw.historySnippets.map((item) => normalizeCassMemoryHistorySnippet(item))
    : [];

  const suggestedCassQueries = normalizeCassMemoryStringArray(raw.suggestedCassQueries);

  const degraded = raw.degraded === undefined ? null : raw.degraded;

  let error: { code?: string; message?: string; hint?: string; retryable?: boolean } | null = null;
  if (!success) {
    const err: { code?: string; message?: string; hint?: string; retryable?: boolean } = {};
    if (typeof raw.code === "string") err.code = raw.code;
    if (typeof raw.error === "string") err.message = raw.error;
    if (typeof raw.hint === "string") err.hint = raw.hint;
    if (typeof raw.retryable === "boolean") err.retryable = raw.retryable;
    error = err;
  }

  return {
    success,
    task,
    relevantBullets,
    antiPatterns,
    historySnippets,
    suggestedCassQueries,
    degraded,
    error,
    raw,
  };
}

function extractMcpToolPayload(result: Json): Json | null {
  if (!isRecord(result)) return null;

  const structured = result.structuredContent;
  if (isRecord(structured)) {
    if (typeof structured.success === "boolean") return structured;
    if (isRecord(structured.result) && typeof structured.result.success === "boolean") return structured.result;
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (isRecord(first) && typeof first.text === "string") {
      try {
        return JSON.parse(first.text) as Json;
      } catch {
        return null;
      }
    }
  }

  return null;
}

async function getCassMemoryContext(task: string, options: CassMemoryContextOptions = {}): Promise<CassMemoryContextResult> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const errors: string[] = [];

  let mcpContext: CassMemoryContextNormalized | null = null;
  let mcpProvenance: CassMemoryContextProvenance["mcp"] | undefined = undefined;

  const mcpBaseUrl = process.env.CM_MCP_BASE_URL?.trim();
  const mcpPath = (process.env.CM_MCP_PATH ?? "/mcp/").trim() || "/mcp/";
  const mcpBearerToken = process.env.CM_MCP_BEARER_TOKEN?.trim();

  const toolArgs: Record<string, Json> = { task };
  if (options.workspace) toolArgs.workspace = options.workspace;
  if (options.top !== undefined) toolArgs.top = options.top;
  if (options.history !== undefined) toolArgs.history = options.history;
  if (options.days !== undefined) toolArgs.days = options.days;
  if (options.logContext) toolArgs.log_context = true;
  if (options.sessionId) toolArgs.session = options.sessionId;

  if (mcpBaseUrl) {
    try {
      const mcpClient = new AgentMailClient({ baseUrl: mcpBaseUrl, path: mcpPath, bearerToken: mcpBearerToken });
      mcpProvenance = { baseUrl: mcpBaseUrl, path: mcpPath, tool: "cm_context", args: toolArgs };
      const toolResult = await mcpClient.toolsCall("cm_context", toolArgs);
      if (isToolError(toolResult)) {
        errors.push(`mcp cm_context: ${JSON.stringify(toolResult)}`);
      } else {
        const payload = extractMcpToolPayload(toolResult);
        if (!payload) {
          errors.push("mcp cm_context: could not parse tool payload");
        } else {
          const parsed = parseCassMemoryContext(payload, task);
          const durationMs = Date.now() - startMs;
          if (parsed.success) {
            return {
              ok: true,
              context: parsed,
              provenance: {
                mode: "mcp",
                startedAt,
                durationMs,
                mcp: mcpProvenance,
                errors,
              },
            };
          }

          mcpContext = parsed;
          let detail = "";
          if (parsed.error?.message) detail += ` (${parsed.error.message})`;
          if (parsed.error?.hint) detail += ` — ${parsed.error.hint}`;
          errors.push(`mcp cm_context: success=false${detail}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`mcp cm_context: ${msg}`);
    }
  }

  const cmPath = Bun.which("cm");
  if (!cmPath) {
    const durationMs = Date.now() - startMs;
    const allErrors = [...errors, "cm not found"];
    if (mcpContext) {
      return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, errors: allErrors } };
    }
    return { ok: false, context: null, provenance: { mode: "none", startedAt, durationMs, errors: allErrors } };
  }

  const argv: string[] = [cmPath, "context", task, "--json"];
  if (options.workspace) argv.push("--workspace", options.workspace);
  if (options.top !== undefined) argv.push("--limit", String(options.top));
  if (options.history !== undefined) argv.push("--history", String(options.history));
  if (options.days !== undefined) argv.push("--days", String(options.days));
  if (options.logContext) argv.push("--log-context");
  if (options.sessionId) argv.push("--session", options.sessionId);

  try {
    const proc = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
    const stdout = proc.stdout.toString();
    const stderr = proc.stderr.toString();
    const exitCode = proc.exitCode ?? 1;

    const durationMs = Date.now() - startMs;

    if (exitCode !== 0) {
      errors.push(`cm context exited ${exitCode}: ${stderr.trim() || "(no stderr)"}`);
      const cli = { argv, exitCode, stderr };
      if (mcpContext) {
        return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, cli, errors } };
      }
      return { ok: false, context: null, provenance: { mode: "cli", startedAt, durationMs, cli, errors } };
    }

    let payload: Json;
    try {
      payload = JSON.parse(stdout) as Json;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`cm context returned non-JSON stdout: ${msg}`);
      const cli = { argv, exitCode, stderr };
      if (mcpContext) {
        return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, cli, errors } };
      }
      return { ok: false, context: null, provenance: { mode: "cli", startedAt, durationMs, cli, errors } };
    }

    const parsed = parseCassMemoryContext(payload, task);

    if (!parsed.success) {
      let detail = "";
      if (parsed.error?.message) detail += ` (${parsed.error.message})`;
      if (parsed.error?.hint) detail += ` — ${parsed.error.hint}`;
      errors.push(`cm context: success=false${detail}`);
      return {
        ok: false,
        context: parsed,
        provenance: { mode: "cli", startedAt, durationMs, cli: { argv, exitCode, stderr }, errors },
      };
    }

    return {
      ok: true,
      context: parsed,
      provenance: { mode: "cli", startedAt, durationMs, cli: { argv, exitCode, stderr }, errors },
    };
  } catch (e) {
    const durationMs = Date.now() - startMs;
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`cm context spawn error: ${msg}`);
    if (mcpContext) {
      return { ok: false, context: mcpContext, provenance: { mode: "mcp", startedAt, durationMs, mcp: mcpProvenance, errors } };
    }
    return { ok: false, context: null, provenance: { mode: "cli", startedAt, durationMs, errors } };
  }
}

function formatCassMemoryContextForKickoff(result: CassMemoryContextResult): string | null {
  const ctx = result.context;
  if (!ctx) return null;
  if (!ctx.success) return null;

  const hasAny =
    ctx.relevantBullets.length > 0 ||
    ctx.antiPatterns.length > 0 ||
    ctx.suggestedCassQueries.length > 0 ||
    ctx.historySnippets.length > 0;
  if (!hasAny) return null;

  const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();

  const lines: string[] = [];
  lines.push("## MEMORY CONTEXT (cass-memory)");
  lines.push(
    `> Provenance: Generated by cass-memory (${result.provenance.mode}) at ${result.provenance.startedAt}. These are heuristics, not transcript evidence. If anything conflicts with the excerpt, the excerpt wins.`
  );
  lines.push("");

  lines.push("### Relevant rules");
  if (ctx.relevantBullets.length > 0) {
    for (const bullet of ctx.relevantBullets.slice(0, 5)) {
      lines.push(`- ${bullet.id ? `[${bullet.id}] ` : ""}${normalizeLine(bullet.content)}`);
    }
  } else {
    lines.push("- (none returned)");
  }
  lines.push("");

  lines.push("### Known pitfalls / anti-patterns");
  if (ctx.antiPatterns.length > 0) {
    for (const bullet of ctx.antiPatterns.slice(0, 5)) {
      lines.push(`- ${bullet.id ? `[${bullet.id}] ` : ""}${normalizeLine(bullet.content)}`);
    }
  } else {
    lines.push("- (none returned)");
  }

  if (ctx.suggestedCassQueries.length > 0) {
    lines.push("");
    lines.push("### Suggested cass queries");
    for (const query of ctx.suggestedCassQueries.slice(0, 5)) {
      lines.push(`- \`${query}\``);
    }
  }

  if (ctx.historySnippets.length > 0) {
    lines.push("");
    lines.push("### Prior sessions (optional)");
    for (const snippet of ctx.historySnippets.slice(0, 3)) {
      lines.push(`- ${normalizeLine(snippet.snippet)}`);
    }
  }

  return lines.join("\n").trim();
}

function formatDoctorHuman(summary: {
  brenner: BrennerBuildInfo;
  checks: Record<string, DoctorCheck>;
  warnings: string[];
}): string {
  const lines: string[] = [];
  lines.push("Brenner Doctor");
  lines.push("=============");
  lines.push("");
  lines.push(formatBrennerVersionText(summary.brenner));
  lines.push("");

  const order = ["ntm", "cass", "cm", "agentMail"];
  for (const key of order) {
    const check = summary.checks[key];
    if (!check) continue;
    const label = key === "agentMail" ? "agent_mail" : key;
    lines.push(`${label}: ${check.status}${check.path ? ` (${check.path})` : ""}`);
    if (check.verifyCommand) lines.push(`  verify: ${check.verifyCommand}`);
    if (check.notes) lines.push(`  notes: ${check.notes}`);
    if (check.status === "error" && check.stderr) lines.push(`  error: ${check.stderr.trim()}`);
  }

  if (summary.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of summary.warnings) lines.push(`- ${w}`);
  }

  return lines.join("\n");
}

function usage(): string {
  return `
Usage:
  ./brenner.ts <command> [args] [--flags]
  ./brenner.ts --version

Commands:
  version
  doctor [--json] [--manifest <path>] [--agent-mail] [--skip-ntm] [--skip-cass] [--skip-cm] [--skip-agents]
  upgrade [--version <ver>]
  memory context <task> [--limit <n>] [--history <n>] [--days <n>] [--workspace <path>] [--log-context] [--session <id>]
  excerpt build [--sections <A,B>] [--tags <A,B>] [--limit <n>] [--theme <s>] [--ordering <relevance|chronological>]
               [--max-total-words <n>] [--max-quote-words <n>] [--transcript-file <path>] [--quote-bank-file <path>] [--json]
  corpus search <query> [--limit <n>] [--docs <A,B>] [--category <s>] [--model <s>] [--project-key <abs-path>] [--json]
  experiment run --thread-id <id> --test-id <id> [--timeout <seconds>] [--cwd <path>] [--out-file <path>] [--json] -- <cmd> [args...]
  experiment record --thread-id <id> --test-id <id> --exit-code <n>
                   [--stdout-file <path>] [--stderr-file <path>] [--stdout <text>] [--stderr <text>]
                   [--cwd <path>] [--command <s>] [--out-file <path>] [--json]
  experiment encode --result-file <path> [--out-file <path>] [--project-key <abs-path>] [--json]
  experiment post --result-file <path> --sender <AgentName> --to <A,B> [--project-key <abs-path>] [--json]

  evidence init --thread-id <id> [--project-key <abs-path>]
  evidence add --thread-id <id> --type <type> --title <s> --source <s> [--relevance <s>]
              [--supports <H1,H2>] [--refutes <H3>] [--informs <T1>] [--project-key <abs-path>] [--json]
  evidence add-excerpt --thread-id <id> --evidence-id <EV-NNN> --text <s>
              [--verbatim] [--location <s>] [--note <s>] [--project-key <abs-path>] [--json]
  evidence list --thread-id <id> [--project-key <abs-path>] [--json]
  evidence render --thread-id <id> [--project-key <abs-path>] [--out-file <path>]
  evidence post --thread-id <id> --sender <AgentName> --to <A,B> [--evidence-id <EV-001,EV-002>] [--subject <s>]
                [--dry-run] [--project-key <abs-path>] [--json]
  evidence verify --thread-id <id> --evidence-id <EV-NNN> --notes <s> [--project-key <abs-path>] [--json]

  anomaly list [--session-id <id>] [--status <active|resolved|deferred|paradigm_shifting>] [--project-key <abs-path>] [--json]
  anomaly show <id> [--project-key <abs-path>] [--json]
  anomaly create --observation <s> --conflicts-with <H1,H2> --conflict-description <s>
                 [--session-id <id>] [--source-type <experiment|literature|discussion|calculation>]
                 [--source-ref <s>] [--name <s>] [--project-key <abs-path>] [--json]
  anomaly resolve <id> --by <hypothesis-id> [--notes <s>] [--project-key <abs-path>] [--json]
  anomaly defer <id> --reason <s> [--project-key <abs-path>] [--json]
  anomaly reactivate <id> [--project-key <abs-path>] [--json]
  anomaly spawn-hypothesis <id> [--project-key <abs-path>] [--json]
  anomaly stats [--project-key <abs-path>] [--json]

  critique list [--session-id <id>] [--status <active|addressed|dismissed|accepted>] [--severity <minor|moderate|serious|critical>]
              [--target <H-...|T-...|A-...|framing|methodology>] [--project-key <abs-path>] [--json]
  critique show <id> [--project-key <abs-path>] [--json]
  critique create --target <H-...|T-...|A-...|framing|methodology> --attack <s> --evidence-to-confirm <s>
                [--severity <minor|moderate|serious|critical>] [--session-id <id>] [--by <s>] [--anchors <A,B>]
                [--tags <A,B>] [--notes <s>] [--project-key <abs-path>] [--json]
  critique respond <id> --response <s> [--action <none|modified|killed|new_test>] [--new-test-id <T-...>] [--by <s>]
                 [--project-key <abs-path>] [--json]
  critique dismiss <id> --reason <s> [--by <s>] [--project-key <abs-path>] [--json]
  critique accept <id> --action <none|modified|killed|new_test> --response <s> [--new-test-id <T-...>] [--by <s>]
                [--project-key <abs-path>] [--json]

  assumption list [--session-id <id>] [--status <unchecked|challenged|verified|falsified>]
                [--type <background|methodological|boundary|scale_physics>] [--project-key <abs-path>] [--json]
  assumption show <id> [--project-key <abs-path>] [--json]
  assumption create --statement <s> --type <background|methodological|boundary|scale_physics> --load-description <s>
                   [--session-id <id>] [--affects-hypotheses <H1,H2>] [--affects-tests <T1,T2>]
                   [--test-method <s>] [--anchors <A,B>] [--by <s>] [--notes <s>] [--calculation <json>]
                   [--project-key <abs-path>] [--json]
  assumption challenge <id> --reason <s> [--evidence <s>] [--by <s>] [--project-key <abs-path>] [--json]
  assumption verify <id> --evidence <s> [--reason <s>] [--by <s>] [--project-key <abs-path>] [--json]
  assumption falsify <id> --evidence <s> [--reason <s>] [--by <s>] [--project-key <abs-path>] [--json]
  assumption link <assumption-id> <hypothesis-id|test-id> [--load-description <s>] [--project-key <abs-path>] [--json]
  assumption stats [--project-key <abs-path>] [--json]

  program list [--status <active|paused|completed|abandoned>] [--project-key <abs-path>] [--json]
  program show <id> [--project-key <abs-path>] [--json]
  program create --name <s> --description <s> [--sessions <RS1,RS2>] [--project-key <abs-path>] [--json]
  program add-session <program-id> --session <session-id> [--project-key <abs-path>] [--json]
  program remove-session <program-id> --session <session-id> [--project-key <abs-path>] [--json]
  program pause <id> [--reason <s>] [--project-key <abs-path>] [--json]
  program resume <id> [--project-key <abs-path>] [--json]
  program complete <id> [--summary <s>] [--project-key <abs-path>] [--json]
  program abandon <id> --reason <s> [--project-key <abs-path>] [--json]
  program stats [--project-key <abs-path>] [--json]
  program dashboard <id> [--project-key <abs-path>] [--json]

  hypothesis list [--session-id <id>] [--state <proposed|active|confirmed|refuted|superseded|deferred>]
                 [--category <mechanistic|phenomenological|boundary|auxiliary|third_alternative>] [--project-key <abs-path>] [--json]
  hypothesis show <id> [--project-key <abs-path>] [--json]
  hypothesis create --statement <s> --category <mechanistic|phenomenological|boundary|auxiliary|third_alternative>
                   [--session-id <id>] [--mechanism <s>] [--origin <proposed|third_alternative|refinement|anomaly_spawned>]
                   [--confidence <high|medium|low|speculative>] [--parent <H-...>] [--by <s>]
                   [--anchors <A,B>] [--tags <A,B>] [--notes <s>] [--project-key <abs-path>] [--json]
  hypothesis activate <id> [--project-key <abs-path>] [--json]
  hypothesis kill <id> --test <T-...> [--reason <s>] [--yes] [--project-key <abs-path>] [--json]
  hypothesis refine <id> --child <H-...> [--project-key <abs-path>] [--json]
  hypothesis validate <id> --test <T-...> [--project-key <abs-path>] [--json]
  hypothesis park <id> [--reason <s>] [--project-key <abs-path>] [--json]
  hypothesis reactivate <id> [--project-key <abs-path>] [--json]
  hypothesis search <query> [--project-key <abs-path>] [--json]
  hypothesis link <child-id> <parent-id> [--project-key <abs-path>] [--json]
  hypothesis stats [--project-key <abs-path>] [--json]
  hypothesis history <id> [--project-key <abs-path>] [--json]

  test list [--session-id <id>] [--status <designed|ready|in_progress|completed|blocked|abandoned>] [--project-key <abs-path>] [--json]
  test show <id> [--project-key <abs-path>] [--json]
  test execute <id> [--interactive] [--no-interactive] [--result <s>] [--potency-pass|--potency-fail]
             [--confidence <high|medium|low|speculative>] [--by <s>] [--notes <s>] [--potency-notes <s>]
             [--apply] [--min-confidence <high|medium|low|speculative>] [--kills-only]
             [--project-key <abs-path>] [--json]
  test suggest-kills <id> [--confidence <high|medium|low|speculative>] [--project-key <abs-path>] [--json]
  test bind <test-id> <hypothesis-id> (--matched|--violated) [--reason <s>] [--by <s>] [--project-key <abs-path>] [--json]

  mail health
  mail tools
  mail agents [--project-key <abs-path>]
  mail send [--project-key <abs-path>] [--sender <AgentName>] --to <A,B> --subject <s> --body-file <path> [--thread-id <id>] [--ack-required]
  mail inbox [--project-key <abs-path>] [--agent <AgentName>] [--limit <n>] [--since <iso>] [--urgent-only] [--include-bodies] [--threads] [--summaries]
  mail read [--project-key <abs-path>] [--agent <AgentName>] --message-id <n>
  mail ack [--project-key <abs-path>] [--agent <AgentName>] --message-id <n>
  mail thread [--project-key <abs-path>] --thread-id <id> [--include-examples] [--llm]

  toolchain plan [--manifest <path>] [--platform <p>] [--json]
  lint <artifact.json> [--json]

  prompt compose --excerpt-file <path> [--template <path>] [--theme <s>] [--domain <s>] [--question <s>]

  cockpit start [--project-key <abs-path>] --thread-id <id> --sender <AgentName> --to <A,B>
               --role-map <s> --excerpt-file <path> --question <s> [--context <s>]
               [--hypotheses <s>] [--constraints <s>] [--outputs <s>] [--with-memory]
               [--ntm-args <s>] [--skip-ntm] [--skip-broadcast] [--broadcast-message <s>] [--dry-run] [--json]

  session start [--project-key <abs-path>] [--sender <AgentName>] --to <A,B> --thread-id <id>
               --excerpt-file <path> --question <s> [--context <s>]
               [--hypotheses <s>] [--constraints <s>] [--outputs <s>]
               [--role-map <s>] [--with-memory] [--unified] [--template <path>] [--theme <s>] [--domain <s>]

  session status [--project-key <abs-path>] --thread-id <id> [--watch] [--timeout <seconds>]
  session compile [--project-key <abs-path>] --thread-id <id> [--out-file <path>] [--json]
  session write [--project-key <abs-path>] --thread-id <id> [--out-file <path>] [--json]
  session publish [--project-key <abs-path>] --thread-id <id> [--sender <AgentName>] --to <A,B>
                [--subject <s>] [--ack-required] [--json]
  session nudge [--project-key <abs-path>] --thread-id <id> [--sender <AgentName>] --to <A,B>
               [--operator <s>] [--ack-required] [--dry-run] [--json]
  session diagnose [--project-key <abs-path>] --thread-id <id> [--json]
  session robot-step --session-dir <path> --question <s> --round <n>
               [--context-file <path>] [--excerpt-file <path>]
               [--claude-bin <path>] [--codex-bin <path>] [--gemini-bin <path>]
               [--sequential]

    Run one round of a robot mode session. Outputs JSON to stdout with round
    results (adds, kills, converged, etc). Between rounds, write operator notes
    to operator_notes_round_N.md — they are injected into the next round's
    prompts for all agents. This enables HITL (human-in-the-loop) orchestration.

  session robot --session-dir <path> --question <s>
               [--context-file <path>] [--excerpt-file <path>] [--max-rounds <n>]
               [--claude-bin <path>] [--codex-bin <path>] [--gemini-bin <path>]
               [--sequential] [--step] [--operator-notes <path>] [--json]
  session robot-stress --session-dir <path> [--operator-context <s>] [--json]

    Robot mode: fully automated multi-agent sessions without Agent Mail. Three
    agents run as CLI subprocesses (Claude Code, Codex CLI, Gemini CLI). Each
    round: prompts are built from the current artifact state, agents are invoked,
    deltas are parsed and merged, the artifact is linted. Session converges when
    kill-rate exceeds add-rate or --max-rounds is reached.

    --step: Run ONE round then exit (HITL mode). Resume by running again.
    --operator-notes <path>: Inject operator corrections into round prompts.
    robot-stress: Adversarial stress test on surviving hypotheses.

  session record --session-dir <path> [--out-file <path>] [--json]
  session replay --record-file <path> [--mode trace|verification|comparison] [--json]

    Record: Convert a robot session directory into a SessionRecord JSON
    (inputs, trace with content hashes, outputs). Enables reproducibility
    and cross-session comparison.

    Replay: Step through a recorded session. Trace mode displays round-by-round
    message summaries. Verification and comparison modes are planned.

    By default, sends role-specific prompts to each recipient using name heuristics:
      - Codex/GPT → Hypothesis Generator
      - Opus/Claude → Test Designer
      - Gemini → Adversarial Critic

    Use --unified to send the same prompt to all recipients (legacy mode).
    For real Agent Mail identities (e.g. BlueLake), pass an explicit roster:
      --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic"

Aliases:
  orchestrate start  (alias for: session start)

Config file (JSON):
  --config <path>             optional (or set BRENNER_CONFIG_PATH)
  Precedence                  flags > env > config > defaults
  Default (POSIX)             ~/.config/brenner/config.json (or $XDG_CONFIG_HOME/brenner/config.json)
  Default (Windows)           %APPDATA%\\brenner\\config.json

Agent identity (env):
  AGENT_NAME                 optional (default for --sender / --agent)

Agent Mail connection (env):
  AGENT_MAIL_BASE_URL        default: http://127.0.0.1:8765
  AGENT_MAIL_PATH            default: /mcp/
  AGENT_MAIL_BEARER_TOKEN    optional

Cass Memory MCP connection (env):
  CM_MCP_BASE_URL            optional (enables MCP mode; e.g. http://127.0.0.1:3001)
  CM_MCP_PATH                default: /mcp/
  CM_MCP_BEARER_TOKEN        optional

Corpus fetch (env):
  BRENNER_PUBLIC_BASE_URL    optional (absolute http(s) URL; default: auto)

Build metadata (for --version):
  BRENNER_VERSION            optional (prefer semver, e.g. 0.1.0)
  BRENNER_GIT_SHA            optional
  BRENNER_BUILD_DATE         optional (ISO 8601)
  BRENNER_TARGET             optional (e.g. linux-x64)

Examples:
  ./brenner.ts --version
  ./brenner.ts doctor --agent-mail

  export AGENT_NAME=GreenCastle

  # Build an excerpt (stdout -> file)
  ./brenner.ts excerpt build --sections "§12,§13" --ordering chronological > excerpt.md

  # Upgrade (prints canonical installer commands)
  ./brenner.ts upgrade

  # Search corpus (ranked hits with anchors + snippets)
  ./brenner.ts corpus search "ribosome" --docs transcript --limit 5

  # Capture an experiment run
  ./brenner.ts experiment run --thread-id RS-20251231-example --test-id T1 --timeout 60 -- bash -lc "echo hi; echo err 1>&2; exit 3"

  # Start a session (role-specific prompts) + watch status
  ./brenner.ts session start --project-key "$PWD" --to PurplePond,PurpleCat \\
    --thread-id RS-20251230-example --excerpt-file excerpt.md --question "..." --with-memory
  ./brenner.ts session status --project-key "$PWD" --thread-id RS-20251230-example --watch

  # One-command: spawn ntm + send role-specific kickoff + broadcast "check mail"
  ./brenner.ts cockpit start --project-key "$PWD" --thread-id RS-20251230-example --sender FuchsiaDog \\
    --to BlueLake,PurpleMountain,RedForest \\
    --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic" \\
    --excerpt-file excerpt.md --question "..."

  # Work the inbox (threads -> read -> ack)
  ./brenner.ts mail inbox --project-key "$PWD" --threads
  ./brenner.ts mail read --project-key "$PWD" --message-id 123
  ./brenner.ts mail ack --project-key "$PWD" --message-id 123

  # Send a message (markdown file -> Agent Mail)
  ./brenner.ts mail send --project-key "$PWD" --to PurplePond \\
    --subject "FYI: ..." --body-file message.md --thread-id COORD-20251230-team
`.trim();
}

function composePrompt(options: {
  templatePath: string;
  excerpt: string;
  memoryContext?: string;
  theme?: string;
  domain?: string;
  question?: string;
}): string {
  const template = readTextFile(options.templatePath);

  const chunks: string[] = [];
  chunks.push(template.trimEnd());
  chunks.push("");
  chunks.push("---");
  chunks.push("");
  const kernel = getTriangulatedBrennerKernelMarkdown();
  if (kernel) {
    chunks.push("## TRIANGULATED BRENNER KERNEL (single)");
    chunks.push(kernel);
    chunks.push("");
  }
  chunks.push("## TRANSCRIPT EXCERPT(S)");
  chunks.push(options.excerpt.trim());
  chunks.push("");
  if (options.memoryContext) {
    chunks.push(options.memoryContext.trim());
    chunks.push("");
  }
  if (options.theme) {
    chunks.push("## FOCUS THEME");
    chunks.push(options.theme.trim());
    chunks.push("");
  }
  if (options.domain) {
    chunks.push("## TARGET RESEARCH DOMAIN");
    chunks.push(options.domain.trim());
    chunks.push("");
  }
  if (options.question) {
    chunks.push("## CURRENT RESEARCH QUESTION");
    chunks.push(options.question.trim());
    chunks.push("");
  }
  return chunks.join("\n");
}

type CompileSessionResult =
  | {
      ok: true;
      threadId: string;
      version: number;
      markdown: string;
      lint: ReturnType<typeof lintArtifact>;
      merge: {
        applied: number;
        skipped: number;
        warnings: Json[];
      };
      deltas: {
        total_blocks: number;
        valid: number;
        invalid: number;
      };
      invalid_deltas: Array<{ message_id: number; subject: string; error: string }>;
    }
  | {
      ok: false;
      threadId: string;
      errors: Json[];
      warnings: Json[];
      merge: { applied: number; skipped: number };
      deltas: {
        total_blocks: number;
        valid: number;
        invalid: number;
      };
      invalid_deltas: Array<{ message_id: number; subject: string; error: string }>;
    };

/**
 * Result of diagnosing delta parsing issues in a thread.
 * Does not attempt to compile — only analyzes delta block parsing.
 */
interface DiagnoseResult {
  threadId: string;
  messageCount: number;
  deltaMessageCount: number;
  summary: {
    healthy: number;
    issues: number;
  };
  deltas: {
    total_blocks: number;
    valid: number;
    invalid: number;
  };
  messages: Array<{
    id: number;
    from: string;
    subject: string;
    created_ts: string;
    status: "ok" | "warning" | "error";
    delta_blocks: number;
    valid_blocks: number;
    invalid_blocks: number;
    issues: string[];
  }>;
  remediation_template: string;
}

/**
 * Diagnose delta parsing issues in a thread without attempting to compile.
 * Returns a detailed report of which messages have issues.
 */
async function diagnoseSessionDeltas(args: {
  client: AgentMailClient;
  projectKey: string;
  threadId: string;
}): Promise<DiagnoseResult> {
  if (isAbsolute(args.projectKey)) {
    await args.client.toolsCall("ensure_project", { human_key: args.projectKey });
  }

  const thread = await args.client.readThread({
    projectKey: args.projectKey,
    threadId: args.threadId,
    includeBodies: true,
  });

  const messageAnalysis: DiagnoseResult["messages"] = [];
  let totalBlocks = 0;
  let validCount = 0;
  let invalidCount = 0;
  let deltaMessageCount = 0;
  let healthyCount = 0;
  let issueCount = 0;

  for (const message of thread.messages) {
    const subjectType = parseSubjectType(message.subject).type;
    if (subjectType !== "delta") continue;

    deltaMessageCount++;
    const body = typeof message.body_md === "string" ? message.body_md : "";
    const parsed = parseDeltaMessage(body);
    const issues: string[] = [];

    totalBlocks += parsed.totalBlocks;
    validCount += parsed.validCount;
    invalidCount += parsed.invalidCount;

    // Check for inline JSON (DELTA message with no fenced blocks)
    if (parsed.totalBlocks === 0 && body.trim().length > 0) {
      // Check if body looks like it contains JSON
      if (body.includes('"operation"') || body.includes('"section"')) {
        issues.push("INLINE_JSON: Message appears to contain delta JSON without fenced ```delta block");
      } else {
        issues.push("NO_DELTA_BLOCKS: DELTA message contains no fenced delta blocks");
      }
    }

    // Check for invalid blocks (JSON parse errors, etc.)
    for (const delta of parsed.deltas) {
      if (!delta.valid) {
        issues.push(`INVALID_JSON: ${delta.error}`);
      }
    }

    const status: "ok" | "warning" | "error" =
      issues.length === 0 ? "ok" : issues.some((i) => i.startsWith("INLINE_JSON")) ? "error" : "warning";

    if (status === "ok") {
      healthyCount++;
    } else {
      issueCount++;
    }

    messageAnalysis.push({
      id: message.id,
      from: message.from ?? "unknown",
      subject: message.subject,
      created_ts: message.created_ts,
      status,
      delta_blocks: parsed.totalBlocks,
      valid_blocks: parsed.validCount,
      invalid_blocks: parsed.invalidCount,
      issues,
    });
  }

  const remediationTemplate = `\`\`\`delta
{
  "operation": "ADD",
  "section": "hypothesis_slate",
  "target_id": null,
  "payload": {
    "name": "[Your hypothesis name]",
    "claim": "[One-sentence claim]",
    "mechanism": "[How it works]",
    "anchors": ["§n"]
  },
  "rationale": "[Why this is worth considering]"
}
\`\`\`

Note: "anchors" should reference transcript sections (§1, §2, etc.) or use ["inference"] for derived hypotheses.`;

  return {
    threadId: args.threadId,
    messageCount: thread.messages.length,
    deltaMessageCount,
    summary: {
      healthy: healthyCount,
      issues: issueCount,
    },
    deltas: {
      total_blocks: totalBlocks,
      valid: validCount,
      invalid: invalidCount,
    },
    messages: messageAnalysis,
    remediation_template: remediationTemplate,
  };
}

function computeNextCompiledVersion(messages: Array<{ subject: string }>): number {
  let maxVersion = 0;
  let compiledCount = 0;

  for (const message of messages) {
    const type = parseSubjectType(message.subject).type;
    if (type !== "compiled") continue;
    compiledCount++;

    const parsed = extractVersion(message.subject);
    if (typeof parsed === "number" && parsed > maxVersion) maxVersion = parsed;
  }

  return Math.max(maxVersion, compiledCount) + 1;
}

async function compileSessionArtifact(args: {
  client: AgentMailClient;
  projectKey: string;
  threadId: string;
}): Promise<CompileSessionResult> {
  if (isAbsolute(args.projectKey)) {
    await args.client.toolsCall("ensure_project", { human_key: args.projectKey });
  }

  const thread = await args.client.readThread({ projectKey: args.projectKey, threadId: args.threadId, includeBodies: true });
  const version = computeNextCompiledVersion(thread.messages);

  const base = createEmptyArtifact(args.threadId);
  base.metadata.version = Math.max(0, version - 1);
  base.metadata.status = "active";

  const mergedDeltas: Array<ValidDelta & { timestamp: string; agent: string }> = [];
  const invalidDeltas: Array<{ message_id: number; subject: string; error: string }> = [];
  const deltaFenceErrors: Array<{
    message_id: number;
    from: string;
    subject: string;
    created_ts: string;
    body_preview: string;
  }> = [];

  let totalBlocks = 0;
  let validCount = 0;
  let invalidCount = 0;

  for (const message of thread.messages) {
    if (typeof message.body_md !== "string" || message.body_md.trim().length === 0) continue;
    const subjectType = parseSubjectType(message.subject).type;
    // Skip non-delta messages — kickoff/nudge messages may contain example
    // ```delta fences that must not be parsed as real operations.
    if (subjectType !== "delta") continue;
    const parsed = parseDeltaMessage(message.body_md);
    if (parsed.totalBlocks === 0) {
      const bodyPreview = message.body_md.trim().slice(0, 240);
      deltaFenceErrors.push({
        message_id: message.id,
        from: message.from ?? "unknown",
        subject: message.subject,
        created_ts: message.created_ts,
        body_preview: bodyPreview,
      });
      invalidDeltas.push({
        message_id: message.id,
        subject: message.subject,
        error: "DELTA message contains no fenced delta blocks (```delta or :::delta).",
      });
      continue;
    }
    totalBlocks += parsed.totalBlocks;
    validCount += parsed.validCount;
    invalidCount += parsed.invalidCount;

    for (const delta of parsed.deltas) {
      if (delta.valid) {
        mergedDeltas.push({
          ...delta,
          timestamp: message.created_ts,
          agent: message.from ?? "unknown",
        });
        continue;
      }

      invalidDeltas.push({
        message_id: message.id,
        subject: message.subject,
        error: delta.error,
      });
    }
  }

  if (deltaFenceErrors.length > 0) {
    return {
      ok: false,
      threadId: args.threadId,
      errors: [
        {
          code: "DELTA_NO_BLOCKS",
          message:
            "Found DELTA messages with no parseable delta blocks. " +
            "Resend those messages using fenced ```delta blocks (see specs/delta_output_format_v0.1.md).",
          count: deltaFenceErrors.length,
          messages: deltaFenceErrors,
          remediation_template: [
            "```delta",
            "{",
            '  \"operation\": \"ADD\",',
            '  \"section\": \"hypothesis_slate\",',
            '  \"target_id\": null,',
            '  \"payload\": { \"id\": \"H1\", \"name\": \"…\", \"claim\": \"…\", \"mechanism\": \"…\", \"anchors\": [\"inference\"] },',
            '  \"rationale\": \"…\"',
            "}",
            "```",
          ].join("\n"),
        },
      ] as unknown as Json[],
      warnings: [] as unknown as Json[],
      merge: { applied: 0, skipped: 0 },
      deltas: { total_blocks: totalBlocks, valid: validCount, invalid: invalidCount },
      invalid_deltas: invalidDeltas,
    };
  }

  const mergeResult = mergeArtifactWithTimestamps(base, mergedDeltas);
  if (!mergeResult.ok) {
    return {
      ok: false,
      threadId: args.threadId,
      errors: mergeResult.errors as unknown as Json[],
      warnings: mergeResult.warnings as unknown as Json[],
      merge: { applied: mergeResult.applied_count, skipped: mergeResult.skipped_count },
      deltas: { total_blocks: totalBlocks, valid: validCount, invalid: invalidCount },
      invalid_deltas: invalidDeltas,
    };
  }

  const lint = lintArtifact(mergeResult.artifact);
  const markdown = renderArtifactMarkdown(mergeResult.artifact);

  return {
    ok: true,
    threadId: args.threadId,
    version: mergeResult.artifact.metadata.version,
    markdown,
    lint,
    merge: {
      applied: mergeResult.applied_count,
      skipped: mergeResult.skipped_count,
      warnings: mergeResult.warnings as unknown as Json[],
    },
    deltas: { total_blocks: totalBlocks, valid: validCount, invalid: invalidCount },
    invalid_deltas: invalidDeltas,
  };
}

// ============================================================================
// Lint -> Operator Recommendations (next-action guidance)
// ============================================================================

type OperatorRecommendation = {
  violation_id: string;
  severity: LintSeverity;
  message: string;
  fix: string | null;
  operators: string[];
  suggested_role: AgentRole | null;
  next_action: string;
};

const LINT_OPERATOR_GUIDANCE: Record<
  string,
  {
    operators: string[];
    suggested_role: AgentRole | null;
    next_action: string;
  }
> = {
  // Hypotheses
  "EH-001": {
    operators: ["◊ Paradox-Hunt", "⊕ Cross-Domain", "⊘ Level-Split"],
    suggested_role: "hypothesis_generator",
    next_action: "Add 2-4 hypotheses (including a third alternative) with claim, mechanism, and anchors.",
  },
  "EH-002": {
    operators: ["≡ Invariant-Extract", "✂ Exclusion-Test", "† Theory-Kill"],
    suggested_role: "hypothesis_generator",
    next_action: "Consolidate or kill hypotheses until <= 6; use invariants + exclusion tests to prune model families.",
  },
  "EH-003": {
    operators: ["⊘ Level-Split", "✂ Exclusion-Test", "◊ Paradox-Hunt"],
    suggested_role: "hypothesis_generator",
    next_action:
      "Add an explicit third alternative (both could be wrong / misspecified model class) and mark third_alternative: true.",
  },

  // Predictions
  "EP-001": {
    operators: ["⌂ Materialize", "𝓛 Recode"],
    suggested_role: "hypothesis_generator",
    next_action: "Add 3+ prediction rows in observable terms; ensure each row is testable and anchored.",
  },
  "WP-001": {
    operators: ["𝓛 Recode", "⌂ Materialize", "✂ Exclusion-Test"],
    suggested_role: "test_designer",
    next_action:
      "Rewrite prediction(s) so at least two hypotheses disagree on the observable outcome; derive forbidden patterns where possible.",
  },

  // Tests
  "ET-001": {
    operators: ["✂ Exclusion-Test", "⌂ Materialize", "⚡ Quickie / Pilot"],
    suggested_role: "test_designer",
    next_action: "Add 2+ discriminative tests with clear procedures, expected outcomes per hypothesis, potency checks, and scores.",
  },
  "ET-002": {
    operators: ["⌂ Materialize"],
    suggested_role: "test_designer",
    next_action: "Specify a step-by-step procedure with a concrete measurement/readout.",
  },
  "ET-003": {
    operators: ["⌂ Materialize", "⊘ Level-Split"],
    suggested_role: "test_designer",
    next_action: "Add expected_outcomes mapping (H1/H2/...) and ensure outcomes are level-typed and discriminative.",
  },
  "WT-001": {
    operators: ["🎭 Potency-Check"],
    suggested_role: "test_designer",
    next_action: "Add potency_check positive controls to distinguish assay failure (impotence) from no effect (chastity).",
  },

  // Assumptions / scale
  "EA-001": {
    operators: ["≡ Invariant-Extract", "⊞ Scale-Check"],
    suggested_role: "adversarial_critic",
    next_action: "Add 3+ load-bearing assumptions; include at least one explicit scale/physics assumption.",
  },
  "EA-002": {
    operators: ["⊞ Scale-Check"],
    suggested_role: "adversarial_critic",
    next_action: "Add a scale_check: true assumption with explicit numbers/units and what it would rule out if violated.",
  },
  "WA-003": {
    operators: ["⊞ Scale-Check"],
    suggested_role: "adversarial_critic",
    next_action: "Add a calculation field with explicit numbers and units (order-of-magnitude is OK).",
  },

  // Critique / third alternative
  "EC-001": {
    operators: ["ΔE Exception-Quarantine", "† Theory-Kill", "⊞ Scale-Check"],
    suggested_role: "adversarial_critic",
    next_action: "Add 2+ critiques focusing on framing failure modes, scale impossibilities, and explicit theory-kill conditions.",
  },
  "WC-001": {
    operators: ["◊ Paradox-Hunt", "⊕ Cross-Domain"],
    suggested_role: "adversarial_critic",
    next_action: "Propose a specific alternative framing and mark real_third_alternative: true on at least one critique.",
  },
};

function deriveOperatorRecommendations(lint: LintReport): OperatorRecommendation[] {
  const recommendations: OperatorRecommendation[] = [];

  for (const v of lint.violations) {
    // Keep the list focused on fix-worthy issues
    if (v.severity === "info") continue;

    const guidance = LINT_OPERATOR_GUIDANCE[v.id];
    if (!guidance) continue;

    recommendations.push({
      violation_id: v.id,
      severity: v.severity,
      message: v.message,
      fix: v.fix ?? null,
      operators: guidance.operators,
      suggested_role: guidance.suggested_role,
      next_action: guidance.next_action,
    });
  }

  return recommendations;
}

function pickTopLintGap(lint: LintReport): LintViolation | null {
  if (lint.violations.length === 0) return null;
  // violations are already sorted by severity in lintArtifact()
  return lint.violations[0] ?? null;
}

function formatOperatorRecommendationsHuman(recommendations: OperatorRecommendation[]): string | null {
  if (recommendations.length === 0) return null;

  const lines: string[] = [];
  lines.push("Recommended Next Operators");
  lines.push("==========================");

  for (const rec of recommendations.slice(0, 8)) {
    const role = rec.suggested_role ? ` → suggested role: ${rec.suggested_role}` : "";
    lines.push(`- ${rec.violation_id} (${rec.severity}): ${rec.operators.join(", ")}${role}`);
    lines.push(`  next: ${rec.next_action}`);
  }

  return lines.join("\n");
}

const ROLE_DELTA_SUBJECT_TAG: Record<AgentRole, string> = {
  hypothesis_generator: "gpt",
  test_designer: "opus",
  adversarial_critic: "gemini",
};

function loadOperatorCardsFromProject(projectKey: string): OperatorCard[] {
  const candidates = [
    resolve(projectKey, "specs/operator_library_v0.1.md"),
    resolve(projectKey, "apps/web/public/_corpus/specs/operator_library_v0.1.md"),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const md = readTextFile(path);
    return parseOperatorCards(md);
  }

  throw new Error(
    `Operator library not found. Expected one of:\n` +
      candidates.map((c) => `- ${c}`).join("\n"),
  );
}

// ============================================================================
// Session Data Builder (for scoring)
// ============================================================================

function toNullProtoRecord<V>(entries: Array<[string, V]>): Record<string, V> {
  const out: Record<string, V> = Object.create(null);
  for (const [key, value] of entries) {
    out[key] = value;
  }
  return out;
}

/**
 * Build SessionData from storage for scoring.
 * Maps storage types to Artifact sections expected by scoreSession().
 */
async function buildSessionDataFromStorage(sessionId: string, baseDir: string): Promise<SessionData> {
  const hypothesisStorage = new HypothesisStorage({ baseDir });
  const testStorage = new TestStorage({ baseDir });
  const assumptionStorage = new AssumptionStorage({ baseDir });
  const anomalyStorage = new AnomalyStorage({ baseDir });
  const critiqueStorage = new CritiqueStorage({ baseDir });

  // Load data from storage
  const hypotheses = await hypothesisStorage.loadSessionHypotheses(sessionId);
  const tests = await testStorage.loadSessionTests(sessionId);
  const assumptions = await assumptionStorage.loadSessionAssumptions(sessionId);
  const anomalies = await anomalyStorage.loadSessionAnomalies(sessionId);
  const critiques = await critiqueStorage.loadSessionCritiques(sessionId);

  // Map storage types to Artifact sections
  const hypothesisSlate = hypotheses.map((h) => ({
    id: h.id,
    name: h.statement.slice(0, 50),
    claim: h.statement,
    mechanism: h.mechanism ?? "",
    killed: h.state === "refuted",
    third_alternative: h.category === "third_alternative",
    anchors: h.anchors ?? [],
  }));

	  const discriminativeTests = tests.map((t) => ({
	    id: t.id,
	    name: t.name,
	    procedure: t.procedure,
	    discriminates: t.discriminates.join(", "),
	    expected_outcomes: toNullProtoRecord(t.expectedOutcomes.map((o) => [o.hypothesisId, o.outcome])),
	    potency_check: t.potencyCheck?.positiveControl ?? "",
	    feasibility: t.feasibility ? `${t.feasibility.difficulty}: ${t.feasibility.requirements}` : "",
	    status: t.status === "completed" ? ("passed" as const) : (t.status as "untested" | "passed" | "failed" | "blocked" | "error"),
	    score: {
	      likelihood_ratio: t.evidencePerWeekScore.likelihoodRatio,
      cost: t.evidencePerWeekScore.cost,
      speed: t.evidencePerWeekScore.speed,
      ambiguity: t.evidencePerWeekScore.ambiguity,
    },
  }));

  const assumptionLedger = assumptions.map((a) => ({
    id: a.id,
    name: a.statement.slice(0, 50),
    statement: a.statement,
    load: `Affects: ${a.load.affectedHypotheses.join(", ") || "none"}`,
    test: a.testMethod ?? "",
    status: a.status as "unchecked" | "verified" | "falsified" | undefined,
    scale_check: a.type === "scale_physics",
    calculation: a.calculation ? `${a.calculation.quantities} → ${a.calculation.result}` : undefined,
  }));

  const anomalyRegister = anomalies.map((x) => ({
    id: x.id,
    name: x.observation.slice(0, 50),
    observation: x.observation,
    conflicts_with: [...x.conflictsWith.hypotheses, ...x.conflictsWith.assumptions],
    status: x.quarantineStatus as "active" | "resolved" | "deferred" | undefined,
  }));

  const adversarialCritique = critiques.map((c) => ({
    id: c.id,
    name: c.attack.slice(0, 50),
    attack: c.attack,
    evidence: c.evidenceToConfirm ?? "",
    current_status: c.status,
    real_third_alternative: c.proposedAlternative !== undefined,
  }));

  const artifact: Artifact = {
    metadata: {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      contributors: [],
      status: "active",
    },
    sections: {
      research_thread: null,
      hypothesis_slate: hypothesisSlate,
      predictions_table: [],
      discriminative_tests: discriminativeTests,
      assumption_ledger: assumptionLedger,
      anomaly_register: anomalyRegister,
      adversarial_critique: adversarialCritique,
    },
  };

  return {
    sessionId,
    artifact,
    hypothesisTransitions: [],
  };
}

async function main(): Promise<void> {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [top, sub, action] = positional;

  if (asBoolFlag(flags, "version")) {
    stdoutLine(formatBrennerVersionText(getBrennerBuildInfo()));
    process.exit(0);
  }

  if (!top || asBoolFlag(flags, "help") || top === "help" || top === "-h") {
    stdoutLine(usage());
    process.exit(0);
  }

  if (top === "version") {
    stdoutLine(formatBrennerVersionText(getBrennerBuildInfo()));
    process.exit(0);
  }

  const runtimeConfig = resolveBrennerRuntimeConfig(loadBrennerConfig(flags));

  if (top === "doctor") {
    const jsonMode = asBoolFlag(flags, "json");
    const checkAgentMail = asBoolFlag(flags, "agent-mail");
    const manifestPath = asStringFlag(flags, "manifest");

    const skipNtm = asBoolFlag(flags, "skip-ntm");
    const skipCass = asBoolFlag(flags, "skip-cass");
    const skipCm = asBoolFlag(flags, "skip-cm");
    const skipAgents = asBoolFlag(flags, "skip-agents");

    const buildInfo = getBrennerBuildInfo();
    const warnings: string[] = [];

    // Resolve tool checks (default commands if manifest unavailable)
    const defaultVerify: Record<string, string> = {
      ntm: "ntm version",
      cass: "cass health",
      cm: "cm --version",
    };

    let manifestTools: Record<string, { verifyCommand?: string; notes?: string }> | null = null;

    // If a manifest path is provided (or the default exists), prefer it for platform-aware notes/commands.
    const resolvedManifestPath = resolve(manifestPath ?? "specs/toolchain.manifest.json");
    try {
      const rawManifest = readTextFile(resolvedManifestPath);
      const parsed = parseManifest(rawManifest);
      if (!parsed.ok) {
        stderrLine(parsed.error);
        process.exit(1);
      }
      const platform = detectPlatform() ?? undefined;
      if (!platform) {
        warnings.push(
          `Unsupported platform for toolchain manifest: ${process.platform}/${process.arch}. ` +
            `Falling back to presence-only checks.`
        );
      } else {
        const plan = generateInstallPlan(parsed.manifest, platform);
        manifestTools = {};
        for (const t of plan.targets) {
          manifestTools[t.tool] = { verifyCommand: t.verifyCommand ?? undefined, notes: t.notes ?? undefined };
        }
        for (const skipped of plan.skipped) {
          manifestTools[skipped.tool] = { notes: skipped.reason };
        }
      }
    } catch (e) {
      if (manifestPath) {
        const msg = e instanceof Error ? e.message : String(e);
        stderrLine(`Failed to read manifest: ${msg}`);
        process.exit(1);
      }
    }

    const checks: Record<string, DoctorCheck> = {};

    const checkTool = (tool: "ntm" | "cass" | "cm", opts: { skip: boolean; required: boolean }): void => {
      const meta = manifestTools?.[tool];
      const verifyCommand = meta?.verifyCommand ?? defaultVerify[tool] ?? null;

      if (opts.skip) {
        checks[tool] = { status: "skipped", path: null, verifyCommand, exitCode: null };
        return;
      }

      const binPath = Bun.which(tool);
      if (!binPath) {
        checks[tool] = {
          status: "missing",
          path: null,
          verifyCommand,
          exitCode: null,
          notes: opts.required ? null : "Optional tool",
        };
        return;
      }

      const result = runCommand(verifyCommand);
      checks[tool] = {
        status: result.exitCode === 0 ? "ok" : "error",
        path: binPath,
        verifyCommand,
        exitCode: result.exitCode,
        ...(result.exitCode === 0 ? {} : { stderr: result.stderr }),
      };
    };

    // Required by default except ntm on Windows.
    const isWindows = process.platform === "win32";
    checkTool("ntm", { skip: skipNtm || isWindows, required: !isWindows });
    checkTool("cass", { skip: skipCass, required: true });
    checkTool("cm", { skip: skipCm, required: true });

    // Agent CLI checks (optional - presence only)
    // Each agent may have multiple binary names depending on installation method
    const agentCliBinaries: Record<string, string[]> = {
      claude: ["claude", "claude-code"],
      codex: ["codex", "codex-cli"],
      gemini: ["gemini", "gemini-cli"],
    };

    const checkAgentCli = (name: string, binaries: string[]): void => {
      if (skipAgents) {
        checks[name] = { status: "skipped", path: null, verifyCommand: null, exitCode: null };
        return;
      }

      // Try each binary name until one is found
      for (const bin of binaries) {
        const binPath = Bun.which(bin);
        if (binPath) {
          checks[name] = {
            status: "ok",
            path: binPath,
            verifyCommand: `${bin} --version`,
            exitCode: 0,
            notes: `Found as '${bin}'`,
          };
          return;
        }
      }

      // None found
      checks[name] = {
        status: "missing",
        path: null,
        verifyCommand: null,
        exitCode: null,
        notes: `Optional. Tried: ${binaries.join(", ")}`,
      };
    };

    for (const [name, binaries] of Object.entries(agentCliBinaries)) {
      checkAgentCli(name, binaries);
    }

    if (checkAgentMail) {
      const baseUrl = runtimeConfig.agentMail.baseUrl;
      const headers: Record<string, string> = {};
      if (runtimeConfig.agentMail.bearerToken) headers.Authorization = `Bearer ${runtimeConfig.agentMail.bearerToken}`;
      try {
        const res = await fetch(`${baseUrl}/health/readiness`, { headers });
        if (res.ok) {
          checks.agentMail = { status: "ok", path: baseUrl, verifyCommand: "GET /health/readiness", exitCode: 0 };
        } else {
          checks.agentMail = {
            status: "error",
            path: baseUrl,
            verifyCommand: "GET /health/readiness",
            exitCode: res.status,
            notes: `HTTP ${res.status}`,
          };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        checks.agentMail = {
          status: "error",
          path: baseUrl,
          verifyCommand: "GET /health/readiness",
          exitCode: 1,
          notes: msg,
        };
      }
    } else {
      checks.agentMail = { status: "skipped", path: null, verifyCommand: null, exitCode: null };
    }

    // Only ntm, cass, cm are potentially required; agent CLIs are optional
    const requiredToolKeys = ["ntm", "cass", "cm"];
    const missingRequired = Object.entries(checks).some(([key, check]) => {
      if (!requiredToolKeys.includes(key)) return false; // agent CLIs and agentMail are optional
      const required = key !== "ntm" || process.platform !== "win32"; // ntm optional on Windows
      if (!required) return false;
      if (check.status === "skipped") return false;
      return check.status !== "ok";
    });

    const exitCode = missingRequired ? 1 : 0;

    if (jsonMode) {
      const payload = {
        status: exitCode === 0 ? "ok" : "error",
        version: buildInfo.version,
        gitSha: buildInfo.gitSha,
        buildDate: buildInfo.buildDate,
        platformTarget: buildInfo.platformTarget,
        checks,
        warnings,
      };
      stdoutLine(JSON.stringify(payload, null, 2));
    } else {
      stdoutLine(formatDoctorHuman({ brenner: buildInfo, checks, warnings }));
    }

    process.exit(exitCode);
  }

  if (top === "upgrade") {
    const rawRequestedVersion = asStringFlag(flags, "version")?.trim() ?? null;
    const requestedSemver = rawRequestedVersion ? normalizeSemverTag(rawRequestedVersion) : null;
    let requestedVersion = requestedSemver ?? rawRequestedVersion?.replace(/^v/, "") ?? null;
    if (requestedVersion) {
      const lowered = requestedVersion.toLowerCase();
      if (lowered === "latest" || lowered === "main" || lowered === "master") requestedVersion = null;
    }

    const buildInfo = getBrennerBuildInfo();
    const currentSemver = normalizeSemverTag(buildInfo.version);

    const owner = "Dicklesworthstone";
    const repo = "brenner_bot";

    const suggestableCurrentVersion = currentSemver && !currentSemver.includes("dev") ? currentSemver : null;
    const versionExample = requestedVersion ?? suggestableCurrentVersion;
    const versionExampleSuffix = versionExample ? "" : " # example";
    const resolvedVersionForDisplay = versionExample ?? "0.1.0";

    const lines: string[] = [];
    lines.push("Brenner Upgrade");
    lines.push("==============");
    lines.push("");
    lines.push("This command does not modify your system.");
    lines.push("It prints the canonical installer commands so you can review and run them.");
    if (buildInfo.version) lines.push(`Installed brenner version: ${buildInfo.version}`);
    lines.push("");
    lines.push("Pinned release (recommended):");
    lines.push(`  export VERSION="${resolvedVersionForDisplay}"${versionExampleSuffix}`);
    lines.push(
      `  curl -fsSL "https://raw.githubusercontent.com/${owner}/${repo}/v\${VERSION}/install.sh" | bash -s -- --version "\${VERSION}" --easy-mode --verify`
    );
    lines.push("");
    lines.push("Latest from main (not pinned):");
    lines.push(
      `  curl -fsSL "https://raw.githubusercontent.com/${owner}/${repo}/main/install.sh" | bash -s -- --easy-mode --verify`
    );
    lines.push("");
    lines.push("Windows (PowerShell):");
    lines.push(`  $Version = "${resolvedVersionForDisplay}"${versionExampleSuffix}`);
    lines.push(
      `  iwr "https://raw.githubusercontent.com/${owner}/${repo}/v$Version/install.ps1" -OutFile install.ps1`
    );
    lines.push(`  pwsh -ExecutionPolicy Bypass -File .\\install.ps1 -Version $Version -EasyMode -Verify`);
    lines.push("");
    lines.push("Notes:");
    lines.push("- Default install destination is `~/.local/bin` (or override with `--dest <path>` in the installer).");
    lines.push("- Remove `--easy-mode` if you do not want PATH changes.");
    lines.push("- Remove `--verify` if you only want installation (not recommended).");

    stdoutLine(lines.join("\n"));
    process.exit(0);
  }

  if (top === "experiment") {
    const jsonMode = asBoolFlag(flags, "json");

    // Handle encode subcommand separately (thread-id and test-id come from result file)
    if (sub === "encode") {
      const resultFilePath = asStringFlag(flags, "result-file");
      if (!resultFilePath) throw new Error("Missing --result-file.");

      const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
      const resolvedResultFile = resolve(projectKey, resultFilePath);

      // Read and parse the result file
      let resultJson: string;
      try {
        resultJson = readTextFile(resolvedResultFile);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Cannot read result file "${resolvedResultFile}": ${msg}`);
      }

      let result: ExperimentResultV01;
      try {
        result = JSON.parse(resultJson) as ExperimentResultV01;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Invalid JSON in result file: ${msg}`);
      }

      // Validate required fields
      if (!result.result_id) throw new Error("Result file missing required field: result_id");
      if (!result.test_id) throw new Error("Result file missing required field: test_id");
      if (!result.thread_id) throw new Error("Result file missing required field: thread_id");
      if (typeof result.exit_code !== "number") throw new Error("Result file missing required field: exit_code");
      if (typeof result.timed_out !== "boolean") throw new Error("Result file missing required field: timed_out");

      // Compute relative path for result_path (relative to project key)
      const resultPath = resultFilePath.startsWith("/")
        ? resultFilePath.replace(projectKey + "/", "")
        : resultFilePath;

      // Determine status based on exit code and timeout
      let status: "passed" | "failed" | "blocked";
      if (result.timed_out) {
        status = "blocked";
      } else if (result.exit_code === 0) {
        status = "passed";
      } else {
        status = "failed";
      }

      // Generate summary
      let summary: string;
      if (result.timed_out) {
        const timeoutSec = result.timeout_seconds ?? "unknown";
        summary = `Test blocked: timed out after ${timeoutSec}s`;
      } else if (typeof result.duration_ms === "number") {
        const durationSec = (result.duration_ms / 1000).toFixed(1);
        summary = `Test completed: exit ${result.exit_code} in ${durationSec}s`;
      } else {
        summary = `Test completed: exit ${result.exit_code}`;
      }

      // Build the DELTA object
      const delta = {
        operation: "EDIT",
        section: "discriminative_tests",
        target_id: result.test_id,
        payload: {
          test_id: result.test_id,
          last_run: {
            result_id: result.result_id,
            result_path: resultPath,
            run_at: result.started_at ?? result.created_at,
            exit_code: result.exit_code,
            timed_out: result.timed_out,
            ...(typeof result.duration_ms === "number" ? { duration_ms: result.duration_ms } : {}),
            summary,
          },
          status,
        },
        rationale: `Recording result of experiment run ${result.result_id.slice(0, 8)} for ${result.test_id}`,
      };

      // Build markdown output
      const markdown = `## Deltas

Recording experiment result for test **${result.test_id}** in thread \`${result.thread_id}\`.

- **Status**: ${status}
- **Exit code**: ${result.exit_code}
- **Result file**: \`${resultPath}\`

\`\`\`delta
${JSON.stringify(delta, null, 2)}
\`\`\`
`;

      // Output
      const outFileRaw = asStringFlag(flags, "out-file");
      if (outFileRaw) {
        const outFile = resolve(projectKey, outFileRaw);
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, markdown, "utf8");
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, out_file: outFile, delta }, null, 2));
        } else {
          stdoutLine(outFile);
        }
      } else {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, delta, markdown }, null, 2));
        } else {
          stdoutLine(markdown);
        }
      }

      process.exit(0);
    }

    // Handle post subcommand (encode + send in one step)
    if (sub === "post") {
      // Validate required flags first (fail fast, before file I/O)
      const resultFilePath = asStringFlag(flags, "result-file");
      if (!resultFilePath) throw new Error("Missing --result-file.");

      let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
      if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
      const to = splitCsv(asStringFlag(flags, "to"));
      if (to.length === 0) throw new Error("Missing --to <A,B>.");

      const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
      const resolvedResultFile = resolve(projectKey, resultFilePath);

      // Read and parse the result file
      let resultJson: string;
      try {
        resultJson = readTextFile(resolvedResultFile);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Cannot read result file "${resolvedResultFile}": ${msg}`);
      }

      let result: ExperimentResultV01;
      try {
        result = JSON.parse(resultJson) as ExperimentResultV01;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Invalid JSON in result file: ${msg}`);
      }

      // Validate required fields
      if (!result.result_id) throw new Error("Result file missing required field: result_id");
      if (!result.test_id) throw new Error("Result file missing required field: test_id");
      if (!result.thread_id) throw new Error("Result file missing required field: thread_id");
      if (typeof result.exit_code !== "number") throw new Error("Result file missing required field: exit_code");
      if (typeof result.timed_out !== "boolean") throw new Error("Result file missing required field: timed_out");

      // Compute relative path for result_path (relative to project key)
      const resultPath = resultFilePath.startsWith("/")
        ? resultFilePath.replace(projectKey + "/", "")
        : resultFilePath;

      // Determine status based on exit code and timeout
      let status: "passed" | "failed" | "blocked";
      if (result.timed_out) {
        status = "blocked";
      } else if (result.exit_code === 0) {
        status = "passed";
      } else {
        status = "failed";
      }

      // Generate summary
      let summary: string;
      if (result.timed_out) {
        const timeoutSec = result.timeout_seconds ?? "unknown";
        summary = `Test blocked: timed out after ${timeoutSec}s`;
      } else if (typeof result.duration_ms === "number") {
        const durationSec = (result.duration_ms / 1000).toFixed(1);
        summary = `Test completed: exit ${result.exit_code} in ${durationSec}s`;
      } else {
        summary = `Test completed: exit ${result.exit_code}`;
      }

      // Build the DELTA object
      const delta = {
        operation: "EDIT",
        section: "discriminative_tests",
        target_id: result.test_id,
        payload: {
          test_id: result.test_id,
          last_run: {
            result_id: result.result_id,
            result_path: resultPath,
            run_at: result.started_at ?? result.created_at,
            exit_code: result.exit_code,
            timed_out: result.timed_out,
            ...(typeof result.duration_ms === "number" ? { duration_ms: result.duration_ms } : {}),
            summary,
          },
          status,
        },
        rationale: `Recording result of experiment run ${result.result_id.slice(0, 8)} for ${result.test_id}`,
      };

      // Build markdown body
      const bodyMd = `## Deltas

Recording experiment result for test **${result.test_id}** in thread \`${result.thread_id}\`.

- **Status**: ${status}
- **Exit code**: ${result.exit_code}
- **Result file**: \`${resultPath}\`

\`\`\`delta
${JSON.stringify(delta, null, 2)}
\`\`\`
`;

      // Send via Agent Mail
      const client = new AgentMailClient(runtimeConfig.agentMail);

      if (isAbsolute(projectKey)) {
        await client.toolsCall("ensure_project", { human_key: projectKey });
      }

      // Check if sender exists, register if needed
      const whoisResult = await client.toolsCall("whois", {
        project_key: projectKey,
        agent_name: sender,
        include_recent_commits: false,
      });

      if (isToolError(whoisResult)) {
        const registerResult = await client.toolsCall("register_agent", {
          project_key: projectKey,
          name: sender,
          program: "brenner-cli",
          model: "orchestrator",
          task_description: `Brenner CLI experiment post: ${result.thread_id}`,
        });
        const actualName = parseAgentNameFromToolResult(registerResult);
        if (actualName && actualName !== sender) {
          stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
          sender = actualName;
        }
      }

      // Build subject
      const subject = `DELTA[results]: ${result.test_id} ${status}`;

      // Send the message
      const sendResult = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: bodyMd,
        thread_id: result.thread_id,
        ack_required: false,
      });

      if (isToolError(sendResult)) {
        stderrLine(`Error sending message: ${JSON.stringify(sendResult, null, 2)}`);
        process.exit(1);
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, delta, message: sendResult }, null, 2));
      } else {
        stdoutLine(`Sent DELTA message to thread ${result.thread_id}`);
        stdoutLine(`Subject: ${subject}`);
        stdoutLine(`To: ${to.join(", ")}`);
      }

      process.exit(0);
    }

    // For run and record, thread-id and test-id are required
    const threadId = asStringFlag(flags, "thread-id");
    const testId = asStringFlag(flags, "test-id");
    if (!threadId) throw new Error("Missing --thread-id.");
    if (!testId) throw new Error("Missing --test-id.");

    const cwd = resolve(asStringFlag(flags, "cwd") ?? runtimeConfig.defaults.projectKey);
    const outFileRaw = asStringFlag(flags, "out-file") ?? asStringFlag(flags, "out");

    const safeThreadId = sanitizeThreadIdForArtifactFilename(threadId);
    const safeTestId = sanitizeThreadIdForArtifactFilename(testId);
    if (!outFileRaw && safeThreadId !== threadId) {
      stderrLine(`Warning: sanitized thread id for experiment path: "${threadId}" -> "${safeThreadId}"`);
    }
    if (!outFileRaw && safeTestId !== testId) {
      stderrLine(`Warning: sanitized test id for experiment path: "${testId}" -> "${safeTestId}"`);
    }

    const resultId = randomUUID();
    const createdAt = new Date();
    const timestamp = formatUtcTimestampForFilename(createdAt);
    const defaultOutFile = join(
      cwd,
      "artifacts",
      safeThreadId,
      "experiments",
      safeTestId,
      `${timestamp}_${resultId}.json`
    );
    const outFile = outFileRaw ? resolve(cwd, outFileRaw) : defaultOutFile;

    if (sub === "run") {
      const timeoutSeconds = asIntFlag(flags, "timeout") ?? 900;
      if (timeoutSeconds <= 0) throw new Error("Invalid --timeout: must be > 0.");

      const rawArgv = process.argv.slice(2);
      const sepIndex = rawArgv.indexOf("--");
      if (sepIndex === -1) throw new Error('Missing "--" separator before command.');
      const commandArgv = rawArgv.slice(sepIndex + 1);
      if (commandArgv.length === 0) throw new Error('Missing command after "--".');

      const startedAt = createdAt;
      let timedOut = false;
      let stdout = "";
      let stderr = "";

      const proc = Bun.spawn(commandArgv, { cwd, stdout: "pipe", stderr: "pipe" });
      const timeoutMs = timeoutSeconds * 1000;
      const killTimer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill();
        } catch {
          // ignore
        }
        setTimeout(() => {
          try {
            proc.kill("SIGKILL");
          } catch {
            // ignore
          }
        }, 1000);
      }, timeoutMs);

      try {
        const stdoutPromise = proc.stdout ? new Response(proc.stdout).text() : Promise.resolve("");
        const stderrPromise = proc.stderr ? new Response(proc.stderr).text() : Promise.resolve("");
        const exitCodePromise = proc.exited;
        const [out, err, exitCode] = await Promise.all([stdoutPromise, stderrPromise, exitCodePromise]);
        stdout = out;
        stderr = err;
        const resolvedExitCode = typeof exitCode === "number" ? exitCode : timedOut ? 124 : 1;

        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const git = bestEffortGitProvenance(cwd);

        const result: ExperimentResultV01 = {
          schema_version: "experiment_result_v0.1",
          result_id: resultId,
          capture_mode: "run",
          thread_id: threadId,
          test_id: testId,

          created_at: startedAt.toISOString(),
          cwd,
          argv: commandArgv,

          timeout_seconds: timeoutSeconds,
          timed_out: timedOut,

          exit_code: resolvedExitCode,
          started_at: startedAt.toISOString(),
          finished_at: finishedAt.toISOString(),
          duration_ms: durationMs,

          stdout,
          stderr,

          ...(git ? { git } : {}),
          runtime: { platform: process.platform, arch: process.arch, bun_version: Bun.version },
        };

        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");

        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, out_file: outFile, result }, null, 2));
        } else {
          stdoutLine(outFile);
          if (timedOut) stderrLine(`Timed out after ${timeoutSeconds}s.`);
        }

        process.exit(0);
      } finally {
        clearTimeout(killTimer);
      }
    }

    if (sub === "record") {
      const exitCode = asIntFlag(flags, "exit-code");
      if (typeof exitCode !== "number") throw new Error("Missing --exit-code.");

      const stdoutFile = asStringFlag(flags, "stdout-file");
      const stderrFile = asStringFlag(flags, "stderr-file");
      const stdoutInline = asStringFlag(flags, "stdout");
      const stderrInline = asStringFlag(flags, "stderr");
      const commandRaw = asStringFlag(flags, "command");

      if (stdoutFile && stdoutInline) throw new Error("Use either --stdout-file or --stdout (not both).");
      if (stderrFile && stderrInline) throw new Error("Use either --stderr-file or --stderr (not both).");

      const stdoutText = stdoutFile ? readTextFile(resolve(cwd, stdoutFile)) : stdoutInline ?? "";
      const stderrText = stderrFile ? readTextFile(resolve(cwd, stderrFile)) : stderrInline ?? "";

      let argv: string[] | null = null;
      if (commandRaw) {
        if (commandRaw.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(commandRaw) as Json;
            if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) argv = parsed as string[];
          } catch {
            // ignore
          }
        }
        if (!argv) {
          if (commandRaw.includes(",")) {
            const csv = commandRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (csv.length > 0) argv = csv;
          } else {
            const tokens = splitCommand(commandRaw);
            if (tokens.length > 0) argv = tokens;
          }
        }
      }

      const git = bestEffortGitProvenance(cwd);

      const result: ExperimentResultV01 = {
        schema_version: "experiment_result_v0.1",
        result_id: resultId,
        capture_mode: "record",
        thread_id: threadId,
        test_id: testId,

        created_at: createdAt.toISOString(),
        cwd,
        argv,

        timeout_seconds: null,
        timed_out: false,

        exit_code: exitCode,
        started_at: null,
        finished_at: null,
        duration_ms: null,

        stdout: stdoutText,
        stderr: stderrText,

        ...(git ? { git } : {}),
        runtime: { platform: process.platform, arch: process.arch, bun_version: Bun.version },
      };

      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, out_file: outFile, result }, null, 2));
      } else {
        stdoutLine(outFile);
      }

      process.exit(0);
    }

    throw new Error(`Unknown experiment subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Evidence Pack Commands
  // ============================================================================

  if (top === "evidence") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const threadId = asStringFlag(flags, "thread-id");

    if (!threadId) throw new Error("Missing --thread-id.");

    // Evidence pack path: artifacts/<thread_id>/evidence.json
    const safeThreadId = threadId.replace(/[^a-zA-Z0-9_.-]/g, "_");

    // Prevent directory traversal via special directory names
    if (safeThreadId === "." || safeThreadId === ".." || safeThreadId === "") {
      throw new Error(`Invalid --thread-id: "${threadId}" (resolves to reserved or empty directory name)`);
    }

    const evidenceDir = resolve(projectKey, "artifacts", safeThreadId);
    const evidenceJsonPath = join(evidenceDir, "evidence.json");
    const evidenceMdPath = join(evidenceDir, "evidence.md");

    // Helper: read existing evidence pack or return null
    // Throws if file exists but is malformed JSON (to prevent accidental data loss)
    function readEvidencePack(): EvidencePack | null {
      if (!existsSync(evidenceJsonPath)) return null;
      const content = readTextFile(evidenceJsonPath);
      try {
        return JSON.parse(content) as EvidencePack;
      } catch (e) {
        throw new Error(`Malformed JSON in ${evidenceJsonPath}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Helper: write evidence pack
    function writeEvidencePack(pack: EvidencePack): void {
      pack.updated_at = new Date().toISOString();
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(evidenceJsonPath, JSON.stringify(pack, null, 2), "utf8");
    }

    // Helper: format evidence ID
    function formatEvidenceId(n: number): string {
      return `EV-${String(n).padStart(3, "0")}`;
    }

    // Helper: infer access method from source
    function inferAccessMethod(source: string): EvidenceRecord["access_method"] {
      if (source.startsWith("doi:") || source.startsWith("https://doi.org/")) return "doi";
      if (source.startsWith("http://") || source.startsWith("https://")) return "url";
      if (source.startsWith("file://") || source.startsWith("/") || source.startsWith("./")) return "file";
      if (source.startsWith("session://")) return "session";
      return "manual";
    }

    // Helper: escape pipe and newline characters for markdown tables
    function escapeTableValue(s: string): string {
      return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    }

    // Helper: render evidence pack to markdown
    function renderEvidenceMd(pack: EvidencePack): string {
      const lines: string[] = [];
      lines.push(`# Evidence Pack: ${pack.thread_id}`);
      lines.push("");
      lines.push(`> Created: ${pack.created_at}`);
      lines.push(`> Updated: ${pack.updated_at}`);
      lines.push(`> Records: ${pack.records.length}`);
      lines.push("");
      lines.push("---");

      for (const rec of pack.records) {
        lines.push("");
        lines.push(`## ${rec.id}: ${escapeTableValue(rec.title)}`);
        lines.push("");
        lines.push("| Field | Value |");
        lines.push("|-------|-------|");
        lines.push(`| Type | ${rec.type} |`);
        if (rec.authors?.length) lines.push(`| Authors | ${escapeTableValue(rec.authors.join("; "))} |`);
        if (rec.date) lines.push(`| Date | ${escapeTableValue(rec.date)} |`);
        lines.push(`| Source | ${escapeTableValue(rec.source)} |`);
        lines.push(`| Verified | ${rec.verified ? `Yes${rec.verification_notes ? ` (${escapeTableValue(rec.verification_notes)})` : ""}` : "No"} |`);
        if (rec.supports?.length) lines.push(`| Supports | ${escapeTableValue(rec.supports.join(", "))} |`);
        if (rec.refutes?.length) lines.push(`| Refutes | ${escapeTableValue(rec.refutes.join(", "))} |`);
        if (rec.informs?.length) lines.push(`| Informs | ${escapeTableValue(rec.informs.join(", "))} |`);
        lines.push("");
        lines.push(`**Relevance**: ${rec.relevance}`);
        lines.push("");
        if (rec.key_findings.length > 0) {
          lines.push("**Key Findings**:");
          for (const finding of rec.key_findings) {
            lines.push(`- ${finding}`);
          }
          lines.push("");
        }
        if (rec.excerpts.length > 0) {
          lines.push("### Excerpts");
          lines.push("");
          for (const ex of rec.excerpts) {
            const loc = ex.location ? `, ${ex.location}` : "";
            const type = ex.verbatim ? "verbatim" : "paraphrased";
            lines.push(`**${rec.id}#${ex.anchor}** (${type}${loc}):`);
            // Handle multi-line text by prefixing each line with >
            const textLines = ex.text.split("\n");
            for (const textLine of textLines) {
              lines.push(`> ${textLine}`);
            }
            if (ex.note) {
              lines.push(`>`);
              // Handle multi-line notes too
              const noteLines = ex.note.split("\n");
              for (const noteLine of noteLines) {
                lines.push(`> *${noteLine}*`);
              }
            }
            lines.push("");
          }
        }
        lines.push("---");
      }

      return lines.join("\n");
    }

    // Subcommand: init
    if (sub === "init") {
      const existing = readEvidencePack();
      if (existing) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, existing: true, path: evidenceJsonPath, records: existing.records.length }, null, 2));
        } else {
          stdoutLine(`Evidence pack already exists: ${evidenceJsonPath} (${existing.records.length} records)`);
        }
        process.exit(0);
      }

      const now = new Date().toISOString();
      const pack: EvidencePack = {
        version: "0.1",
        thread_id: threadId,
        created_at: now,
        updated_at: now,
        next_id: 1,
        records: [],
      };
      writeEvidencePack(pack);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, created: true, path: evidenceJsonPath }, null, 2));
      } else {
        stdoutLine(`Created: ${evidenceJsonPath}`);
      }
      process.exit(0);
    }

    // Subcommand: add
    if (sub === "add") {
      const evTypeRaw = asStringFlag(flags, "type");
      const title = asStringFlag(flags, "title");
      const source = asStringFlag(flags, "source");
      const relevance = asStringFlag(flags, "relevance") ?? "";
      const supports = splitCsv(asStringFlag(flags, "supports"));
      const refutes = splitCsv(asStringFlag(flags, "refutes"));
      const informs = splitCsv(asStringFlag(flags, "informs"));

      const validTypes: EvidenceType[] = ["paper", "preprint", "dataset", "experiment", "observation", "prior_session", "expert_opinion", "code_artifact"];
      if (!evTypeRaw) throw new Error("Missing --type (paper|preprint|dataset|experiment|observation|prior_session|expert_opinion|code_artifact).");
      if (!validTypes.includes(evTypeRaw as EvidenceType)) {
        throw new Error(`Invalid --type "${evTypeRaw}". Valid types: ${validTypes.join(", ")}`);
      }
      const evType = evTypeRaw as EvidenceType;
      if (!title) throw new Error("Missing --title.");
      if (!source) throw new Error("Missing --source.");

      let pack = readEvidencePack();
      if (!pack) {
        // Auto-init
        const now = new Date().toISOString();
        pack = {
          version: "0.1",
          thread_id: threadId,
          created_at: now,
          updated_at: now,
          next_id: 1,
          records: [],
        };
      }

      const evId = formatEvidenceId(pack.next_id);
      const agentName = process.env.AGENT_NAME ?? "operator";

      const record: EvidenceRecord = {
        id: evId,
        type: evType,
        title,
        source,
        access_method: inferAccessMethod(source),
        imported_at: new Date().toISOString(),
        imported_by: agentName,
        relevance,
        key_findings: [],
        verified: false,
        excerpts: [],
      };
      if (supports.length > 0) record.supports = supports;
      if (refutes.length > 0) record.refutes = refutes;
      if (informs.length > 0) record.informs = informs;

      pack.records.push(record);
      pack.next_id++;
      writeEvidencePack(pack);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, evidence_id: evId, path: evidenceJsonPath }, null, 2));
      } else {
        stdoutLine(`Added ${evId}: ${title}`);
      }
      process.exit(0);
    }

    // Subcommand: add-excerpt
    if (sub === "add-excerpt") {
      const evidenceId = asStringFlag(flags, "evidence-id");
      const text = asStringFlag(flags, "text");
      const verbatim = asBoolFlag(flags, "verbatim");
      const location = asStringFlag(flags, "location");
      const note = asStringFlag(flags, "note");

      if (!evidenceId) throw new Error("Missing --evidence-id (e.g., EV-001).");
      if (!text) throw new Error("Missing --text.");

      const pack = readEvidencePack();
      if (!pack) throw new Error(`No evidence pack found at ${evidenceJsonPath}. Run 'evidence init' first.`);

      const record = pack.records.find((r) => r.id === evidenceId);
      if (!record) throw new Error(`Evidence record ${evidenceId} not found.`);

      const nextAnchor = `E${record.excerpts.length + 1}`;
      const excerpt: EvidenceExcerpt = {
        anchor: nextAnchor,
        text,
        verbatim,
      };
      if (location) excerpt.location = location;
      if (note) excerpt.note = note;

      record.excerpts.push(excerpt);
      writeEvidencePack(pack);

      const fullAnchor = `${evidenceId}#${nextAnchor}`;
      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anchor: fullAnchor, path: evidenceJsonPath }, null, 2));
      } else {
        stdoutLine(`Added excerpt ${fullAnchor}`);
      }
      process.exit(0);
    }

    // Subcommand: list
    if (sub === "list") {
      const pack = readEvidencePack();
      if (!pack) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, records: [], path: evidenceJsonPath, exists: false }, null, 2));
        } else {
          stdoutLine(`No evidence pack found at ${evidenceJsonPath}`);
        }
        process.exit(0);
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, records: pack.records, path: evidenceJsonPath, exists: true }, null, 2));
      } else {
        if (pack.records.length === 0) {
          stdoutLine("No evidence records.");
        } else {
          for (const rec of pack.records) {
            const verified = rec.verified ? "✓" : " ";
            const excerpts = rec.excerpts.length > 0 ? ` (${rec.excerpts.length} excerpts)` : "";
            stdoutLine(`[${verified}] ${rec.id}: ${rec.title} [${rec.type}]${excerpts}`);
          }
        }
      }
      process.exit(0);
    }

    // Subcommand: render
    if (sub === "render") {
      const outFile = asStringFlag(flags, "out-file");

      const pack = readEvidencePack();
      if (!pack) throw new Error(`No evidence pack found at ${evidenceJsonPath}. Run 'evidence init' first.`);

      const md = renderEvidenceMd(pack);

      if (outFile) {
        const resolvedOut = resolve(projectKey, outFile);
        mkdirSync(dirname(resolvedOut), { recursive: true });
        writeFileSync(resolvedOut, md, "utf8");
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, path: resolvedOut, bytes: md.length }, null, 2));
        } else {
          stdoutLine(resolvedOut);
        }
      } else {
        // Also write to default location
        writeFileSync(evidenceMdPath, md, "utf8");
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, path: evidenceMdPath, bytes: md.length }, null, 2));
        } else {
          stdoutLine(md);
        }
      }
      process.exit(0);
    }

    // Subcommand: post (render + send to Agent Mail as EVIDENCE: message)
    if (sub === "post") {
      // Validate required flags first (fail fast, before file I/O / network)
      let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
      if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
      const to = splitCsv(asStringFlag(flags, "to"));
      if (to.length === 0) throw new Error("Missing --to <A,B>.");

      const evidenceIdsRaw = splitCsv(asStringFlag(flags, "evidence-id"));
      const dryRun = asBoolFlag(flags, "dry-run");
      const rawSubject = nonEmptyString(asStringFlag(flags, "subject"));

      const pack = readEvidencePack();
      if (!pack) throw new Error(`No evidence pack found at ${evidenceJsonPath}. Run 'evidence init' first.`);

      // Optional filtering to selected evidence IDs (preserve original order)
      const selectedIds = evidenceIdsRaw.length > 0 ? Array.from(new Set(evidenceIdsRaw)) : [];
      const selectedPack: EvidencePack =
        selectedIds.length > 0
          ? (() => {
            const idSet = new Set(selectedIds);
            const records = pack.records.filter((r) => idSet.has(r.id));
            const found = new Set(records.map((r) => r.id));
            const missing = selectedIds.filter((id) => !found.has(id));
            if (missing.length > 0) {
              throw new Error(`Evidence record(s) not found: ${missing.join(", ")}`);
            }
            return { ...pack, records };
          })()
          : pack;

      const md = renderEvidenceMd(selectedPack).trimEnd();

      const defaultSubjectSuffix =
        selectedPack.records.length > 0
          ? selectedPack.records.map((r) => r.id).join(", ")
          : "evidence pack";
      const subject = rawSubject
        ? /^EVIDENCE:/i.test(rawSubject)
          ? rawSubject
          : `EVIDENCE: ${rawSubject}`
        : `EVIDENCE: [${threadId}] ${defaultSubjectSuffix}`;

      if (dryRun) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, dry_run: true, subject, body_md: md }, null, 2));
        } else {
          stdoutLine(md);
        }
        process.exit(0);
      }

      // Send via Agent Mail
      const client = new AgentMailClient(runtimeConfig.agentMail);

      if (isAbsolute(projectKey)) {
        await client.toolsCall("ensure_project", { human_key: projectKey });
      }

      // Register sender if needed
      const whoisResult = await client.toolsCall("whois", {
        project_key: projectKey,
        agent_name: sender,
        include_recent_commits: false,
      });

      if (isToolError(whoisResult)) {
        const registerResult = await client.toolsCall("register_agent", {
          project_key: projectKey,
          name: sender,
          program: "brenner-cli",
          model: "orchestrator",
          task_description: `Brenner CLI evidence post: ${threadId}`,
        });
        const actualName = parseAgentNameFromToolResult(registerResult);
        if (actualName && actualName !== sender) {
          stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
          sender = actualName;
        }
      }

      const sendResult = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: md,
        thread_id: threadId,
        ack_required: false,
      });

      if (isToolError(sendResult)) {
        stderrLine(`Error sending message: ${JSON.stringify(sendResult, null, 2)}`);
        process.exit(1);
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, subject, bytes: md.length, message: sendResult }, null, 2));
      } else {
        stdoutLine(`Sent EVIDENCE message to thread ${threadId}`);
        stdoutLine(`Subject: ${subject}`);
        stdoutLine(`To: ${to.join(", ")}`);
      }

      process.exit(0);
    }

    // Subcommand: verify
    if (sub === "verify") {
      const evidenceId = asStringFlag(flags, "evidence-id");
      const notes = asStringFlag(flags, "notes");

      if (!evidenceId) throw new Error("Missing --evidence-id (e.g., EV-001).");
      if (!notes) throw new Error("Missing --notes.");

      const pack = readEvidencePack();
      if (!pack) throw new Error(`No evidence pack found at ${evidenceJsonPath}. Run 'evidence init' first.`);

      const record = pack.records.find((r) => r.id === evidenceId);
      if (!record) throw new Error(`Evidence record ${evidenceId} not found.`);

      record.verified = true;
      record.verification_notes = notes;
      writeEvidencePack(pack);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, evidence_id: evidenceId, verified: true }, null, 2));
      } else {
        stdoutLine(`Verified ${evidenceId}: ${notes}`);
      }
      process.exit(0);
    }

    throw new Error(`Unknown evidence subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Anomaly Command
  // ============================================================================
  if (top === "anomaly") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const storage = new AnomalyStorage({ baseDir: projectKey });

    const VALID_QUARANTINE_STATUSES: QuarantineStatus[] = ["active", "resolved", "deferred", "paradigm_shifting"];

    // Subcommand: list
    if (sub === "list") {
      const sessionId = asStringFlag(flags, "session-id");
      const statusFilter = asStringFlag(flags, "status") as QuarantineStatus | undefined;

      if (statusFilter && !VALID_QUARANTINE_STATUSES.includes(statusFilter)) {
        throw new Error(`Invalid --status "${statusFilter}" (expected one of: ${VALID_QUARANTINE_STATUSES.join(", ")})`);
      }

      let anomalies: Anomaly[];
      if (sessionId) {
        anomalies = await storage.loadSessionAnomalies(sessionId);
        // Apply status filter if both filters provided
        if (statusFilter) {
          anomalies = anomalies.filter((a) => a.quarantineStatus === statusFilter);
        }
      } else if (statusFilter) {
        anomalies = await storage.getAnomaliesByStatus(statusFilter);
      } else {
        anomalies = await storage.getAllAnomalies();
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: anomalies.length, anomalies }, null, 2));
      } else {
        if (anomalies.length === 0) {
          stdoutLine("No anomalies found.");
        } else {
          for (const a of anomalies) {
            const status = a.quarantineStatus.padEnd(16);
            const conflicts = a.conflictsWith.hypotheses.join(",") || "(none)";
            const obsPreview = a.observation.length > 60 ? `${a.observation.slice(0, 60)}...` : a.observation;
            stdoutLine(`[${status}] ${a.id}: ${obsPreview} (conflicts: ${conflicts})`);
          }
        }
      }
      process.exit(0);
    }

    // Subcommand: show
    if (sub === "show") {
      const anomalyId = action;
      if (!anomalyId) throw new Error("Missing anomaly ID. Usage: anomaly show <id>");

      const anomaly = await storage.getAnomalyById(anomalyId);
      if (!anomaly) throw new Error(`Anomaly not found: ${anomalyId}`);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anomaly }, null, 2));
      } else {
        stdoutLine(`ID:              ${anomaly.id}`);
        if (anomaly.name) stdoutLine(`Name:            ${anomaly.name}`);
        stdoutLine(`Status:          ${anomaly.quarantineStatus}`);
        stdoutLine(`Session:         ${anomaly.sessionId}`);
        stdoutLine(`Observation:     ${anomaly.observation}`);
        stdoutLine(`Source:          ${anomaly.source.type}${anomaly.source.reference ? ` (${anomaly.source.reference})` : ""}`);
        stdoutLine(`Conflicts with:`);
        stdoutLine(`  Hypotheses:    ${anomaly.conflictsWith.hypotheses.join(", ") || "(none)"}`);
        stdoutLine(`  Assumptions:   ${anomaly.conflictsWith.assumptions.join(", ") || "(none)"}`);
        stdoutLine(`  Description:   ${anomaly.conflictsWith.description}`);
        if (anomaly.resolutionPlan) stdoutLine(`Resolution plan: ${anomaly.resolutionPlan}`);
        if (anomaly.resolvedBy) stdoutLine(`Resolved by:     ${anomaly.resolvedBy}`);
        if (anomaly.spawnedHypotheses?.length) stdoutLine(`Spawned:         ${anomaly.spawnedHypotheses.join(", ")}`);
        stdoutLine(`Created:         ${anomaly.createdAt}`);
        stdoutLine(`Updated:         ${anomaly.updatedAt}`);
      }
      process.exit(0);
    }

    // Subcommand: create
    const VALID_SOURCE_TYPES = ["experiment", "literature", "discussion", "calculation"] as const;
    if (sub === "create") {
      const observation = asStringFlag(flags, "observation");
      const conflictsWithRaw = asStringFlag(flags, "conflicts-with");
      const conflictDescription = asStringFlag(flags, "conflict-description");
      const sessionId = asStringFlag(flags, "session-id") ?? `RS${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const sourceTypeRaw = asStringFlag(flags, "source-type") ?? "discussion";
      const sourceRef = asStringFlag(flags, "source-ref");
      const name = asStringFlag(flags, "name");

      if (!observation) throw new Error("Missing --observation.");
      if (!conflictsWithRaw) throw new Error("Missing --conflicts-with (e.g., H-RS20251230-001,H-RS20251230-002).");
      if (!conflictDescription) throw new Error("Missing --conflict-description.");
      if (!VALID_SOURCE_TYPES.includes(sourceTypeRaw as typeof VALID_SOURCE_TYPES[number])) {
        throw new Error(`Invalid --source-type "${sourceTypeRaw}" (expected one of: ${VALID_SOURCE_TYPES.join(", ")})`);
      }
      const sourceType = sourceTypeRaw as typeof VALID_SOURCE_TYPES[number];

      const conflictsWithHypotheses = splitCsv(conflictsWithRaw);
      const existingAnomalies = await storage.loadSessionAnomalies(sessionId);
      const existingIds = existingAnomalies.map((a) => a.id);
      const newId = generateAnomalyId(sessionId, existingIds);

      const anomaly = createAnomaly({
        id: newId,
        observation,
        source: {
          type: sourceType,
          reference: sourceRef,
        },
        conflictsWith: {
          hypotheses: conflictsWithHypotheses,
          assumptions: [],
          description: conflictDescription,
        },
        sessionId,
        name,
      });

      await storage.saveAnomaly(anomaly);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anomaly }, null, 2));
      } else {
        stdoutLine(`Created anomaly: ${anomaly.id}`);
      }
      process.exit(0);
    }

    // Subcommand: resolve
    if (sub === "resolve") {
      const anomalyId = action;
      const resolvedByHypothesisId = asStringFlag(flags, "by");
      const notes = asStringFlag(flags, "notes");

      if (!anomalyId) throw new Error("Missing anomaly ID. Usage: anomaly resolve <id> --by <hypothesis-id>");
      if (!resolvedByHypothesisId) throw new Error("Missing --by <hypothesis-id>.");

      const anomaly = await storage.getAnomalyById(anomalyId);
      if (!anomaly) throw new Error(`Anomaly not found: ${anomalyId}`);

      const resolved = resolveAnomaly(anomaly, resolvedByHypothesisId, { notes });
      await storage.saveAnomaly(resolved);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anomaly: resolved }, null, 2));
      } else {
        stdoutLine(`Resolved ${anomalyId} by ${resolvedByHypothesisId}`);
      }
      process.exit(0);
    }

    // Subcommand: defer
    if (sub === "defer") {
      const anomalyId = action;
      const reason = asStringFlag(flags, "reason");

      if (!anomalyId) throw new Error("Missing anomaly ID. Usage: anomaly defer <id> --reason <s>");
      if (!reason) throw new Error("Missing --reason.");

      const anomaly = await storage.getAnomalyById(anomalyId);
      if (!anomaly) throw new Error(`Anomaly not found: ${anomalyId}`);

      const deferred = deferAnomaly(anomaly, reason);
      await storage.saveAnomaly(deferred);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anomaly: deferred }, null, 2));
      } else {
        stdoutLine(`Deferred ${anomalyId}: ${reason}`);
      }
      process.exit(0);
    }

    // Subcommand: reactivate
    if (sub === "reactivate") {
      const anomalyId = action;

      if (!anomalyId) throw new Error("Missing anomaly ID. Usage: anomaly reactivate <id>");

      const anomaly = await storage.getAnomalyById(anomalyId);
      if (!anomaly) throw new Error(`Anomaly not found: ${anomalyId}`);

      const reactivated = reactivateAnomaly(anomaly);
      await storage.saveAnomaly(reactivated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anomaly: reactivated }, null, 2));
      } else {
        stdoutLine(`Reactivated ${anomalyId}`);
      }
      process.exit(0);
    }

    // Subcommand: spawn-hypothesis
    if (sub === "spawn-hypothesis") {
      const anomalyId = action;

      if (!anomalyId) throw new Error("Missing anomaly ID. Usage: anomaly spawn-hypothesis <id>");

      const anomaly = await storage.getAnomalyById(anomalyId);
      if (!anomaly) throw new Error(`Anomaly not found: ${anomalyId}`);

      // Generate a new hypothesis ID by finding max across ALL anomalies in session
      const sessionAnomalies = await storage.loadSessionAnomalies(anomaly.sessionId);
      const allSpawnedIds = sessionAnomalies.flatMap((a) => a.spawnedHypotheses ?? []);
      const prefix = `H-${anomaly.sessionId}-`;
      const sequences = allSpawnedIds
        .filter((id) => id.startsWith(prefix))
        .map((id) => {
          const match = id.match(/-(\d{3})$/);
          return match ? parseInt(match[1], 10) : 0;
        });
      const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
      const hypothesisId = `${prefix}${String(nextSeq).padStart(3, "0")}`;
      const updated = linkSpawnedHypothesis(anomaly, hypothesisId);
      await storage.saveAnomaly(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, anomaly: updated, spawnedHypothesisId: hypothesisId }, null, 2));
      } else {
        stdoutLine(`Spawned hypothesis ${hypothesisId} from ${anomalyId}`);
        stdoutLine(`Note: Create the full hypothesis record separately with the hypothesis CLI.`);
      }
      process.exit(0);
    }

    // Subcommand: stats
    if (sub === "stats") {
      const stats = await storage.getStatistics();

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, ...stats }, null, 2));
      } else {
        stdoutLine(`Anomaly Statistics:`);
        stdoutLine(`  Total:                    ${stats.total}`);
        stdoutLine(`  By status:`);
        stdoutLine(`    Active:                 ${stats.byStatus.active}`);
        stdoutLine(`    Resolved:               ${stats.byStatus.resolved}`);
        stdoutLine(`    Deferred:               ${stats.byStatus.deferred}`);
        stdoutLine(`    Paradigm-shifting:      ${stats.byStatus.paradigm_shifting}`);
        stdoutLine(`  With spawned hypotheses:  ${stats.withSpawnedHypotheses}`);
        stdoutLine(`  Sessions with anomalies:  ${stats.sessionsWithAnomalies}`);
      }
      process.exit(0);
    }

    throw new Error(`Unknown anomaly subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Critique Command
  // ============================================================================
  if (top === "critique") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const storage = new CritiqueStorage({ baseDir: projectKey });

    const VALID_TARGET_TYPES: CritiqueTargetType[] = ["hypothesis", "test", "assumption", "framing", "methodology"];
    const VALID_STATUSES: CritiqueStatus[] = ["active", "addressed", "dismissed", "accepted"];
    const VALID_SEVERITIES: CritiqueSeverity[] = ["minor", "moderate", "serious", "critical"];
    const VALID_ACTIONS: CritiqueAction[] = ["none", "modified", "killed", "new_test"];

    function parseTargetFilter(targetRaw: string): { targetType: CritiqueTargetType; targetId?: string } {
      const target = targetRaw.trim();
      if (!target) {
        throw new Error("Invalid --target (empty).");
      }

      if (target === "framing" || target === "methodology") {
        return { targetType: target };
      }

      if (target.startsWith("H-")) {
        return { targetType: "hypothesis", targetId: target };
      }

      if (target.startsWith("T-") || /^T\\d+$/.test(target)) {
        return { targetType: "test", targetId: target };
      }

      if (target.startsWith("A-") || /^A\\d+$/.test(target)) {
        return { targetType: "assumption", targetId: target };
      }

      throw new Error(
        `Invalid --target "${targetRaw}" (expected H-..., T-..., A-..., framing, or methodology).`
      );
    }

    // Subcommand: list
    if (sub === "list") {
      const sessionId = asStringFlag(flags, "session-id");
      const statusFilterRaw = asStringFlag(flags, "status");
      const severityFilterRaw = asStringFlag(flags, "severity");
      const targetRaw = asStringFlag(flags, "target");

      const statusFilter = statusFilterRaw as CritiqueStatus | undefined;
      const severityFilter = severityFilterRaw as CritiqueSeverity | undefined;
      const targetFilter = targetRaw ? parseTargetFilter(targetRaw) : undefined;

      if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
        throw new Error(`Invalid --status "${statusFilter}" (expected one of: ${VALID_STATUSES.join(", ")})`);
      }
      if (severityFilter && !VALID_SEVERITIES.includes(severityFilter)) {
        throw new Error(`Invalid --severity "${severityFilter}" (expected one of: ${VALID_SEVERITIES.join(", ")})`);
      }
      if (targetFilter && !VALID_TARGET_TYPES.includes(targetFilter.targetType)) {
        throw new Error(
          `Invalid --target "${targetRaw}" (expected one of: ${VALID_TARGET_TYPES.join(", ")}, H-..., T-..., A-...).`
        );
      }

      let critiques: Critique[];
      if (sessionId) {
        critiques = await storage.loadSessionCritiques(sessionId);
      } else if (statusFilter && !severityFilter && !targetFilter) {
        critiques = await storage.getCritiquesByStatus(statusFilter);
      } else if (severityFilter && !statusFilter && !targetFilter) {
        critiques = await storage.getCritiquesBySeverity(severityFilter);
      } else if (targetFilter && !statusFilter && !severityFilter) {
        critiques = await storage.getCritiquesForTarget(targetFilter.targetType, targetFilter.targetId);
      } else {
        critiques = await storage.getAllCritiques();
      }

      if (statusFilter) critiques = critiques.filter((c) => c.status === statusFilter);
      if (severityFilter) critiques = critiques.filter((c) => c.severity === severityFilter);
      if (targetFilter) {
        critiques = critiques.filter(
          (c) => c.targetType === targetFilter.targetType && (targetFilter.targetId === undefined || c.targetId === targetFilter.targetId)
        );
      }

      critiques.sort((a, b) => a.id.localeCompare(b.id));

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: critiques.length, critiques }, null, 2));
      } else {
        if (critiques.length === 0) {
          stdoutLine("No critiques found.");
        } else {
          for (const c of critiques) {
            const target = c.targetId ? `${c.targetType}:${c.targetId}` : c.targetType;
            const status = c.status.padEnd(9);
            const sev = c.severity.padEnd(8);
            const attackPreview = c.attack.length > 60 ? `${c.attack.slice(0, 60)}...` : c.attack;
            stdoutLine(`[${status} ${sev}] ${c.id} → ${target} :: ${attackPreview}`);
          }
        }
      }
      process.exit(0);
    }

    // Subcommand: show
    if (sub === "show") {
      const critiqueId = action;
      if (!critiqueId) throw new Error("Missing critique ID. Usage: critique show <id>");

      const critique = await storage.getCritiqueById(critiqueId);
      if (!critique) throw new Error(`Critique not found: ${critiqueId}`);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, critique }, null, 2));
      } else {
        stdoutLine(`ID:         ${critique.id}`);
        stdoutLine(`Session:    ${critique.sessionId}`);
        stdoutLine(`Status:     ${critique.status}`);
        stdoutLine(`Severity:   ${critique.severity}`);
        stdoutLine(`Target:     ${critique.targetType}${critique.targetId ? ` (${critique.targetId})` : ""}`);
        if (critique.raisedBy) stdoutLine(`Raised by:  ${critique.raisedBy}`);
        if (critique.anchors?.length) stdoutLine(`Anchors:    ${critique.anchors.join(", ")}`);
        stdoutLine(`Attack:     ${critique.attack}`);
        stdoutLine(`Evidence:   ${critique.evidenceToConfirm}`);
        if (critique.proposedAlternative) {
          stdoutLine(`Alternative:`);
          stdoutLine(`  ${critique.proposedAlternative.description}`);
          if (critique.proposedAlternative.mechanism) {
            stdoutLine(`  Mechanism: ${critique.proposedAlternative.mechanism}`);
          }
          stdoutLine(`  Testable:  ${String(critique.proposedAlternative.testable)}`);
          if (critique.proposedAlternative.predictions?.length) {
            stdoutLine(`  Predictions: ${critique.proposedAlternative.predictions.join("; ")}`);
          }
        }
        if (critique.dismissalReason) stdoutLine(`Dismissal:  ${critique.dismissalReason}`);
        if (critique.response) {
          stdoutLine(`Response:`);
          stdoutLine(`  ${critique.response.text}`);
          if (critique.response.respondedBy) stdoutLine(`  By: ${critique.response.respondedBy}`);
          stdoutLine(`  At: ${critique.response.respondedAt}`);
          if (critique.response.actionTaken) stdoutLine(`  Action: ${critique.response.actionTaken}`);
          if (critique.response.newTestId) stdoutLine(`  New test: ${critique.response.newTestId}`);
        }
        if (critique.tags?.length) stdoutLine(`Tags:       ${critique.tags.join(", ")}`);
        if (critique.notes) stdoutLine(`Notes:      ${critique.notes}`);
        stdoutLine(`Created:    ${critique.createdAt}`);
        stdoutLine(`Updated:    ${critique.updatedAt}`);
      }
      process.exit(0);
    }

    // Subcommand: create
    if (sub === "create") {
      const targetRaw = asStringFlag(flags, "target");
      const attack = asStringFlag(flags, "attack");
      const evidenceToConfirm = asStringFlag(flags, "evidence-to-confirm");
      const severityRaw = asStringFlag(flags, "severity") ?? "moderate";
      const sessionId = asStringFlag(flags, "session-id") ?? `RS${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const raisedBy = asStringFlag(flags, "by");
      const anchorsRaw = asStringFlag(flags, "anchors");
      const tagsRaw = asStringFlag(flags, "tags");
      const notes = asStringFlag(flags, "notes");

      if (!targetRaw) throw new Error("Missing --target.");
      if (!attack) throw new Error("Missing --attack.");
      if (!evidenceToConfirm) throw new Error("Missing --evidence-to-confirm.");

      const severity = severityRaw as CritiqueSeverity;
      if (!VALID_SEVERITIES.includes(severity)) {
        throw new Error(`Invalid --severity "${severityRaw}" (expected one of: ${VALID_SEVERITIES.join(", ")})`);
      }

      const target = parseTargetFilter(targetRaw);

      const existing = await storage.loadSessionCritiques(sessionId);
      const newId = generateCritiqueId(sessionId, existing.map((c) => c.id));

      const critique = createCritique({
        id: newId,
        targetType: target.targetType,
        targetId: target.targetId,
        attack,
        evidenceToConfirm,
        severity,
        sessionId,
        raisedBy: raisedBy || undefined,
        anchors: anchorsRaw ? splitCsv(anchorsRaw) : undefined,
        tags: tagsRaw ? splitCsv(tagsRaw) : undefined,
        notes: notes || undefined,
      });

      await storage.saveCritique(critique);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, critique }, null, 2));
      } else {
        stdoutLine(`Created critique: ${critique.id}`);
      }
      process.exit(0);
    }

    // Subcommand: respond
    if (sub === "respond") {
      const critiqueId = action;
      const response = asStringFlag(flags, "response");
      const respondedBy = asStringFlag(flags, "by");
      const actionRaw = asStringFlag(flags, "action") ?? "none";
      const newTestId = asStringFlag(flags, "new-test-id");

      if (!critiqueId) throw new Error("Missing critique ID. Usage: critique respond <id> --response <s>");
      if (!response) throw new Error("Missing --response.");

      const actionTaken = actionRaw as CritiqueAction;
      if (!VALID_ACTIONS.includes(actionTaken)) {
        throw new Error(`Invalid --action "${actionRaw}" (expected one of: ${VALID_ACTIONS.join(", ")})`);
      }
      if (actionTaken === "new_test" && !newTestId) {
        throw new Error('Missing --new-test-id (required when --action is "new_test").');
      }
      if (actionTaken !== "new_test" && newTestId) {
        throw new Error('Do not pass --new-test-id unless --action is "new_test".');
      }

      const critique = await storage.getCritiqueById(critiqueId);
      if (!critique) throw new Error(`Critique not found: ${critiqueId}`);

      const addressed = addressCritique(critique, {
        text: response,
        respondedBy: respondedBy || undefined,
        actionTaken,
        newTestId: actionTaken === "new_test" ? newTestId : undefined,
      });

      await storage.saveCritique(addressed);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, critique: addressed }, null, 2));
      } else {
        stdoutLine(`Responded to ${critiqueId} (status: ${addressed.status})`);
      }
      process.exit(0);
    }

    // Subcommand: dismiss
    if (sub === "dismiss") {
      const critiqueId = action;
      const reason = asStringFlag(flags, "reason");
      const respondedBy = asStringFlag(flags, "by");

      if (!critiqueId) throw new Error("Missing critique ID. Usage: critique dismiss <id> --reason <s>");
      if (!reason) throw new Error("Missing --reason.");

      const critique = await storage.getCritiqueById(critiqueId);
      if (!critique) throw new Error(`Critique not found: ${critiqueId}`);

      const dismissed = dismissCritique(critique, reason, respondedBy || undefined);
      await storage.saveCritique(dismissed);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, critique: dismissed }, null, 2));
      } else {
        stdoutLine(`Dismissed ${critiqueId}: ${reason}`);
      }
      process.exit(0);
    }

    // Subcommand: accept
    if (sub === "accept") {
      const critiqueId = action;
      const response = asStringFlag(flags, "response");
      const respondedBy = asStringFlag(flags, "by");
      const actionRaw = asStringFlag(flags, "action");
      const newTestId = asStringFlag(flags, "new-test-id");

      if (!critiqueId) throw new Error("Missing critique ID. Usage: critique accept <id> --action <...> --response <s>");
      if (!actionRaw) throw new Error("Missing --action.");
      if (!response) throw new Error("Missing --response.");

      const actionTaken = actionRaw as CritiqueAction;
      if (!VALID_ACTIONS.includes(actionTaken)) {
        throw new Error(`Invalid --action "${actionRaw}" (expected one of: ${VALID_ACTIONS.join(", ")})`);
      }
      if (actionTaken === "new_test" && !newTestId) {
        throw new Error('Missing --new-test-id (required when --action is "new_test").');
      }
      if (actionTaken !== "new_test" && newTestId) {
        throw new Error('Do not pass --new-test-id unless --action is "new_test".');
      }

      const critique = await storage.getCritiqueById(critiqueId);
      if (!critique) throw new Error(`Critique not found: ${critiqueId}`);

      const accepted = acceptCritique(
        critique,
        actionTaken,
        response,
        respondedBy || undefined,
        actionTaken === "new_test" ? newTestId : undefined
      );

      await storage.saveCritique(accepted);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, critique: accepted }, null, 2));
      } else {
        stdoutLine(`Accepted ${critiqueId} (action: ${actionTaken})`);
      }
      process.exit(0);
    }

    throw new Error(`Unknown critique subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Assumption Command
  // ============================================================================
  if (top === "assumption") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const storage = new AssumptionStorage({ baseDir: projectKey });

    const VALID_TYPES: AssumptionType[] = ["background", "methodological", "boundary", "scale_physics"];
    const VALID_STATUSES: AssumptionStatus[] = ["unchecked", "challenged", "verified", "falsified"];

    // Subcommand: list
    if (sub === "list") {
      const sessionId = asStringFlag(flags, "session-id");
      const statusFilter = asStringFlag(flags, "status") as AssumptionStatus | undefined;
      const typeFilter = asStringFlag(flags, "type") as AssumptionType | undefined;

      if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
        throw new Error(`Invalid --status "${statusFilter}" (expected one of: ${VALID_STATUSES.join(", ")})`);
      }
      if (typeFilter && !VALID_TYPES.includes(typeFilter)) {
        throw new Error(`Invalid --type "${typeFilter}" (expected one of: ${VALID_TYPES.join(", ")})`);
      }

      let assumptions: Assumption[];
      if (sessionId) {
        assumptions = await storage.loadSessionAssumptions(sessionId);
      } else if (statusFilter && !typeFilter) {
        assumptions = await storage.getAssumptionsByStatus(statusFilter);
      } else if (typeFilter && !statusFilter) {
        assumptions = await storage.getAssumptionsByType(typeFilter);
      } else {
        assumptions = await storage.getAllAssumptions();
      }

      if (statusFilter) assumptions = assumptions.filter((a) => a.status === statusFilter);
      if (typeFilter) assumptions = assumptions.filter((a) => a.type === typeFilter);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: assumptions.length, assumptions }, null, 2));
      } else {
        if (assumptions.length === 0) {
          stdoutLine("No assumptions found.");
        } else {
          for (const a of assumptions) {
            const status = a.status.padEnd(10);
            const type = a.type.padEnd(14);
            stdoutLine(`[${status}] [${type}] ${a.id}: ${a.statement.slice(0, 80)}${a.statement.length > 80 ? "…" : ""}`);
          }
        }
      }
      process.exit(0);
    }

    // Subcommand: show
    if (sub === "show") {
      const assumptionId = action;
      if (!assumptionId) throw new Error("Missing assumption ID. Usage: assumption show <id>");

      const assumption = await storage.getAssumptionById(assumptionId);
      if (!assumption) throw new Error(`Assumption not found: ${assumptionId}`);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, assumption }, null, 2));
      } else {
        stdoutLine(`ID:        ${assumption.id}`);
        stdoutLine(`Type:      ${assumption.type}`);
        stdoutLine(`Status:    ${assumption.status}`);
        stdoutLine(`Session:   ${assumption.sessionId}`);
        stdoutLine(`Statement: ${assumption.statement}`);
        stdoutLine(`Load:`);
        stdoutLine(`  Hypotheses: ${assumption.load.affectedHypotheses.join(", ") || "(none)"}`);
        stdoutLine(`  Tests:      ${assumption.load.affectedTests.join(", ") || "(none)"}`);
        stdoutLine(`  Desc:       ${assumption.load.description}`);
        if (assumption.testMethod) stdoutLine(`Test method: ${assumption.testMethod}`);
        if (assumption.calculation) {
          stdoutLine(`Calculation:`);
          stdoutLine(`  Quantities:  ${assumption.calculation.quantities}`);
          stdoutLine(`  Result:      ${assumption.calculation.result}`);
          stdoutLine(`  Units:       ${assumption.calculation.units}`);
          stdoutLine(`  Implication: ${assumption.calculation.implication}`);
          if (assumption.calculation.whatItRulesOut) stdoutLine(`  Rules out:   ${assumption.calculation.whatItRulesOut}`);
        }
        if (assumption.anchors?.length) stdoutLine(`Anchors:   ${assumption.anchors.join(", ")}`);
        if (assumption.recordedBy) stdoutLine(`Recorded:  ${assumption.recordedBy}`);
        stdoutLine(`Created:   ${assumption.createdAt}`);
        stdoutLine(`Updated:   ${assumption.updatedAt}`);
        if (assumption.notes) stdoutLine(`Notes:     ${assumption.notes}`);
      }
      process.exit(0);
    }

    // Subcommand: create
    if (sub === "create") {
      const statement = asStringFlag(flags, "statement");
      const type = asStringFlag(flags, "type") as AssumptionType | undefined;
      const sessionId = asStringFlag(flags, "session-id") ?? `RS${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const loadDescription = asStringFlag(flags, "load-description");
      const affectedHypotheses = splitCsv(asStringFlag(flags, "affects-hypotheses"));
      const affectedTests = splitCsv(asStringFlag(flags, "affects-tests"));
      const testMethod = asStringFlag(flags, "test-method");
      const anchors = splitCsv(asStringFlag(flags, "anchors"));
      const recordedBy = asStringFlag(flags, "by");
      const notes = asStringFlag(flags, "notes");
      const calculationRaw = asStringFlag(flags, "calculation");

      if (!statement) throw new Error("Missing --statement.");
      if (!type) throw new Error(`Missing --type (expected one of: ${VALID_TYPES.join(", ")})`);
      if (!VALID_TYPES.includes(type)) throw new Error(`Invalid --type "${type}" (expected one of: ${VALID_TYPES.join(", ")})`);
      if (!loadDescription) throw new Error("Missing --load-description.");

      let calculation: ScaleCalculation | undefined;
      if (calculationRaw) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(calculationRaw) as unknown;
        } catch {
          throw new Error("Invalid --calculation: expected JSON (keys: quantities,result,units,implication,whatItRulesOut?)");
        }
        const validated = ScaleCalculationSchema.safeParse(parsed);
        if (!validated.success) {
          throw new Error(`Invalid --calculation: ${validated.error.issues[0]?.message ?? "validation failed"}`);
        }
        calculation = validated.data;
      }

      if (type === "scale_physics" && !calculation) {
        throw new Error("Missing --calculation (required when --type=scale_physics).");
      }

      const existing = await storage.loadSessionAssumptions(sessionId);
      const newId = generateAssumptionId(sessionId, existing.map((a) => a.id));

      const assumption = createAssumption({
        id: newId,
        statement,
        type,
        sessionId,
        load: {
          affectedHypotheses,
          affectedTests,
          description: loadDescription,
        },
        testMethod,
        calculation,
        anchors: anchors.length > 0 ? anchors : undefined,
        recordedBy,
        notes,
      });

      await storage.saveAssumption(assumption);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, assumption }, null, 2));
      } else {
        stdoutLine(`Created assumption: ${assumption.id}`);
      }
      process.exit(0);
    }

    // Subcommand: challenge
    if (sub === "challenge") {
      const assumptionId = action;
      const reason = asStringFlag(flags, "reason");
      const evidence = asStringFlag(flags, "evidence");
      const by = asStringFlag(flags, "by");

      if (!assumptionId) throw new Error("Missing assumption ID. Usage: assumption challenge <id> --reason <s>");
      if (!reason) throw new Error("Missing --reason.");

      const assumption = await storage.getAssumptionById(assumptionId);
      if (!assumption) throw new Error(`Assumption not found: ${assumptionId}`);

      const result = challengeAssumption(assumption, {
        triggeredBy: by,
        evidenceRef: evidence,
        reason,
        sessionId: assumption.sessionId,
      });

      if (!result.success) throw new Error(result.error.message);

      await storage.saveAssumption(result.assumption);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, ...result }, null, 2));
      } else {
        stdoutLine(`Challenged ${assumptionId}: ${reason}`);
      }
      process.exit(0);
    }

    // Subcommand: verify
    if (sub === "verify") {
      const assumptionId = action;
      const evidence = asStringFlag(flags, "evidence");
      const reason = asStringFlag(flags, "reason");
      const by = asStringFlag(flags, "by");

      if (!assumptionId) throw new Error("Missing assumption ID. Usage: assumption verify <id> --evidence <s>");
      if (!evidence) throw new Error("Missing --evidence.");

      const assumption = await storage.getAssumptionById(assumptionId);
      if (!assumption) throw new Error(`Assumption not found: ${assumptionId}`);

      const result = verifyAssumption(assumption, {
        triggeredBy: by,
        evidenceRef: evidence,
        reason,
        sessionId: assumption.sessionId,
      });

      if (!result.success) throw new Error(result.error.message);

      await storage.saveAssumption(result.assumption);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, ...result }, null, 2));
      } else {
        stdoutLine(`Verified ${assumptionId}: ${evidence}`);
      }
      process.exit(0);
    }

    // Subcommand: falsify
    if (sub === "falsify") {
      const assumptionId = action;
      const evidence = asStringFlag(flags, "evidence");
      const reason = asStringFlag(flags, "reason");
      const by = asStringFlag(flags, "by");

      if (!assumptionId) throw new Error("Missing assumption ID. Usage: assumption falsify <id> --evidence <s>");
      if (!evidence) throw new Error("Missing --evidence.");

      const assumption = await storage.getAssumptionById(assumptionId);
      if (!assumption) throw new Error(`Assumption not found: ${assumptionId}`);

      const result = falsifyAssumption(assumption, {
        triggeredBy: by,
        evidenceRef: evidence,
        reason,
        sessionId: assumption.sessionId,
      });

      if (!result.success) throw new Error(result.error.message);

      await storage.saveAssumption(result.assumption);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, ...result }, null, 2));
      } else {
        stdoutLine(`Falsified ${assumptionId}: ${evidence}`);
        if (result.propagation) stdoutLine(result.propagation.summary);
      }
      process.exit(0);
    }

    // Subcommand: link
    if (sub === "link") {
      const assumptionId = action;
      const targetRaw = positional[3];
      const loadDescription = asStringFlag(flags, "load-description");

      if (!assumptionId || !targetRaw) {
        throw new Error("Usage: assumption link <assumption-id> <hypothesis-id|test-id> [--load-description <s>]");
      }

      const assumption = await storage.getAssumptionById(assumptionId);
      if (!assumption) throw new Error(`Assumption not found: ${assumptionId}`);

      const targets = splitCsv(targetRaw);
      if (targets.length === 0) throw new Error("Missing target id(s).");

      const nextHypotheses = new Set(assumption.load.affectedHypotheses);
      const nextTests = new Set(assumption.load.affectedTests);

      for (const id of targets) {
        if (id.startsWith("H-")) {
          nextHypotheses.add(id);
          continue;
        }
        if (id.startsWith("T-") || /^T\d+$/.test(id)) {
          nextTests.add(id);
          continue;
        }
        throw new Error(`Invalid target ID "${id}" (expected hypothesis H-... or test T-... / T{n})`);
      }

      const updated: Assumption = {
        ...assumption,
        load: {
          ...assumption.load,
          affectedHypotheses: Array.from(nextHypotheses),
          affectedTests: Array.from(nextTests),
          description: loadDescription ?? assumption.load.description,
        },
        updatedAt: new Date().toISOString(),
      };

      await storage.saveAssumption(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, assumption: updated }, null, 2));
      } else {
        stdoutLine(`Linked ${assumptionId} to ${targets.join(", ")}`);
      }
      process.exit(0);
    }

    // Subcommand: stats
    if (sub === "stats") {
      const stats = await storage.getStatistics();

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, ...stats }, null, 2));
      } else {
        stdoutLine("Assumption Statistics:");
        stdoutLine(`  Total:                 ${stats.total}`);
        stdoutLine("  By status:");
        stdoutLine(`    Unchecked:           ${stats.byStatus.unchecked}`);
        stdoutLine(`    Challenged:          ${stats.byStatus.challenged}`);
        stdoutLine(`    Verified:            ${stats.byStatus.verified}`);
        stdoutLine(`    Falsified:           ${stats.byStatus.falsified}`);
        stdoutLine("  By type:");
        stdoutLine(`    Background:          ${stats.byType.background}`);
        stdoutLine(`    Methodological:      ${stats.byType.methodological}`);
        stdoutLine(`    Boundary:            ${stats.byType.boundary}`);
        stdoutLine(`    Scale/physics:       ${stats.byType.scale_physics}`);
        stdoutLine(`  With calculations:     ${stats.withCalculations}`);
        stdoutLine(`  Sessions with data:    ${stats.sessionsWithAssumptions}`);
      }
      process.exit(0);
    }

    throw new Error(`Unknown assumption subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Hypothesis Command
  // ============================================================================
	  if (top === "hypothesis") {
	    const jsonMode = asBoolFlag(flags, "json");
	    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
	    const storage = new HypothesisStorage({ baseDir: projectKey });

	    const VALID_STATES: HypothesisState[] = ["proposed", "active", "confirmed", "refuted", "superseded", "deferred"];
	    const VALID_CATEGORIES: HypothesisCategory[] = ["mechanistic", "phenomenological", "boundary", "auxiliary", "third_alternative"];
	    const VALID_ORIGINS: HypothesisOrigin[] = ["proposed", "third_alternative", "refinement", "anomaly_spawned"];
	    const VALID_CONFIDENCES: HypothesisConfidence[] = ["high", "medium", "low", "speculative"];

	    // Subcommand: list
	    if (sub === "list") {
	      const sessionFilter = asStringFlag(flags, "session-id") ?? asStringFlag(flags, "session");
	      const stateFilterRaw = asStringFlag(flags, "state");
      const stateFilter =
        stateFilterRaw === "killed"
          ? ("refuted" as HypothesisState)
          : (stateFilterRaw as HypothesisState | undefined);
	      const categoryFilter = asStringFlag(flags, "category") as HypothesisCategory | undefined;

	      if (stateFilter && !VALID_STATES.includes(stateFilter)) {
	        throw new Error(`Invalid --state "${stateFilter}" (expected one of: ${VALID_STATES.join(", ")})`);
	      }
      if (categoryFilter && !VALID_CATEGORIES.includes(categoryFilter)) {
        throw new Error(`Invalid --category "${categoryFilter}" (expected one of: ${VALID_CATEGORIES.join(", ")})`);
      }

      let hypotheses: Hypothesis[];

	      if (sessionFilter) hypotheses = await storage.loadSessionHypotheses(sessionFilter);
	      else if (stateFilter) hypotheses = await storage.getHypothesesByState(stateFilter);
	      else hypotheses = await storage.getAllHypotheses();

	      if (stateFilter) hypotheses = hypotheses.filter((h) => h.state === stateFilter);

	      // Apply category filter if provided
	      if (categoryFilter) {
	        hypotheses = hypotheses.filter((h) => h.category === categoryFilter);
	      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: hypotheses.length, hypotheses }, null, 2));
      } else {
        if (hypotheses.length === 0) {
          stdoutLine("No hypotheses found.");
        } else {
          for (const h of hypotheses) {
            const state = h.state.padEnd(12);
            const category = h.category.padEnd(16);
            const stmt = h.statement.length > 60 ? h.statement.substring(0, 57) + "..." : h.statement;
            stdoutLine(`[${state}] ${h.id} (${category}): ${stmt}`);
          }
        }
      }
      process.exit(0);
	    }

	    // Subcommand: show
	    if (sub === "show") {
	      const hypothesisId = action;
	      if (!hypothesisId) throw new Error("Missing hypothesis ID. Usage: hypothesis show <id>");

	      const hypothesis = await storage.getHypothesisById(hypothesisId);
	      if (!hypothesis) {
	        throw new Error(`Hypothesis not found: ${hypothesisId}`);
	      }

	      const children = (await storage.getAllHypotheses())
	        .filter((h) => h.parentId === hypothesis.id)
	        .map((h) => h.id)
	        .sort();

	      if (jsonMode) {
	        stdoutLine(JSON.stringify({ ok: true, hypothesis, children }, null, 2));
	      } else {
	        stdoutLine(`ID:             ${hypothesis.id}`);
	        stdoutLine(`Session:        ${hypothesis.sessionId}`);
	        stdoutLine(`State:          ${hypothesis.state}`);
	        stdoutLine(`Category:       ${hypothesis.category}`);
	        stdoutLine(`Confidence:     ${hypothesis.confidence}`);
	        stdoutLine(`Origin:         ${hypothesis.origin}`);
	        stdoutLine(`Statement:      ${hypothesis.statement}`);
	        if (hypothesis.mechanism) {
	          stdoutLine(`Mechanism:      ${hypothesis.mechanism}`);
	        }
	        if (hypothesis.parentId) {
	          stdoutLine(`Parent:         ${hypothesis.parentId}`);
	        }
	        if (hypothesis.spawnedFromAnomaly) {
	          stdoutLine(`From anomaly:   ${hypothesis.spawnedFromAnomaly}`);
	        }
	        if (hypothesis.anchors?.length) {
	          stdoutLine(`Anchors:        ${hypothesis.anchors.join(", ")}`);
	        }
	        if (hypothesis.tags && hypothesis.tags.length > 0) {
	          stdoutLine(`Tags:           ${hypothesis.tags.join(", ")}`);
	        }
	        stdoutLine(`Critiques:      ${hypothesis.unresolvedCritiqueCount} unresolved`);
	        if (hypothesis.proposedBy) {
	          stdoutLine(`Proposed by:    ${hypothesis.proposedBy}`);
	        }
	        if (children.length > 0) {
	          stdoutLine(`Children:       ${children.join(", ")}`);
	        }
	        if (hypothesis.notes) {
	          stdoutLine(`Notes:          ${hypothesis.notes}`);
	        }
	        stdoutLine(`Created:        ${hypothesis.createdAt}`);
        stdoutLine(`Updated:        ${hypothesis.updatedAt}`);
      }
      process.exit(0);
	    }

	    // Subcommand: create
	    if (sub === "create") {
	      const statement = asStringFlag(flags, "statement");
	      const categoryStr = asStringFlag(flags, "category") as HypothesisCategory | undefined;

      if (!statement) {
        throw new Error("--statement is required");
      }
      if (!categoryStr) {
        throw new Error("--category is required");
      }
      if (!VALID_CATEGORIES.includes(categoryStr)) {
        throw new Error(`Invalid --category "${categoryStr}" (expected one of: ${VALID_CATEGORIES.join(", ")})`);
      }

      const sessionIdFromFlag = asStringFlag(flags, "session-id");
      let sessionId = sessionIdFromFlag ?? `RS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const mechanism = asStringFlag(flags, "mechanism");
      const originStr = asStringFlag(flags, "origin") as HypothesisOrigin | undefined;
      const confidenceStr = asStringFlag(flags, "confidence") as HypothesisConfidence | undefined;
      const parentId = asStringFlag(flags, "parent");
      const proposedBy = asStringFlag(flags, "by");
      const anchorsStr = asStringFlag(flags, "anchors");
      const tagsStr = asStringFlag(flags, "tags");
      const notes = asStringFlag(flags, "notes");

      if (originStr && !VALID_ORIGINS.includes(originStr)) {
        throw new Error(`Invalid --origin "${originStr}" (expected one of: ${VALID_ORIGINS.join(", ")})`);
      }
	      if (confidenceStr && !VALID_CONFIDENCES.includes(confidenceStr)) {
	        throw new Error(`Invalid --confidence "${confidenceStr}" (expected one of: ${VALID_CONFIDENCES.join(", ")})`);
	      }

	      if (originStr === "refinement" && !parentId) {
	        throw new Error('Missing --parent (required when --origin is "refinement").');
	      }

	      if (parentId) {
	        const parent = await storage.getHypothesisById(parentId);
	        if (!parent) throw new Error(`Parent hypothesis not found: ${parentId}`);
	      }

	      const anchors = splitCsv(anchorsStr);
	      const tags = splitCsv(tagsStr);

      const idOverride = asStringFlag(flags, "id");
      let id = idOverride;
      if (id) {
        const match = id.match(/^H-(.+)-\d{3}$/);
        if (!match) throw new Error(`Invalid --id "${id}" (expected H-{session}-{seq})`);
        const idSessionId = match[1];
        if (sessionIdFromFlag && sessionIdFromFlag !== idSessionId) {
          throw new Error(`--session-id "${sessionIdFromFlag}" does not match --id session "${idSessionId}"`);
        }
        sessionId = idSessionId;
        const existing = await storage.getHypothesisById(id);
        if (existing) throw new Error(`Hypothesis already exists: ${id}`);
      } else {
        const existingHypotheses = await storage.loadSessionHypotheses(sessionId);
        id = generateHypothesisId(sessionId, existingHypotheses.map((h) => h.id));
	      }

	      const hypothesisBase = createHypothesis({
	        id,
	        sessionId,
	        statement,
	        category: categoryStr,
	        mechanism,
	        origin: originStr ?? "proposed",
	        confidence: confidenceStr ?? "medium",
	        proposedBy,
	        anchors: anchors.length > 0 ? anchors : undefined,
	      });

	      const hypothesis = HypothesisSchema.parse({
	        ...hypothesisBase,
	        parentId: parentId || undefined,
	        tags: tags.length > 0 ? tags : undefined,
	        notes: notes || undefined,
	      });

	      await storage.saveHypothesis(hypothesis);

	      if (jsonMode) {
	        stdoutLine(JSON.stringify({ ok: true, hypothesis }, null, 2));
	      } else {
        stdoutLine(`Created hypothesis: ${hypothesis.id}`);
        stdoutLine(`  Category:   ${hypothesis.category}`);
        stdoutLine(`  Statement:  ${hypothesis.statement}`);
      }
      process.exit(0);
	    }

	    // Subcommand: search
	    if (sub === "search") {
	      const query = positional.slice(2).join(" ").trim();
	      if (!query) {
	        throw new Error("Usage: hypothesis search <query>");
	      }

      const results = await storage.searchHypotheses(query);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: results.length, hypotheses: results }, null, 2));
      } else {
        if (results.length === 0) {
          stdoutLine(`No hypotheses matching "${query}"`);
        } else {
          stdoutLine(`Found ${results.length} hypothesis(es):`);
          for (const h of results) {
            const state = h.state.padEnd(12);
            const stmt = h.statement.length > 50 ? h.statement.substring(0, 47) + "..." : h.statement;
            stdoutLine(`  [${state}] ${h.id}: ${stmt}`);
          }
        }
      }
      process.exit(0);
	    }

	    // Subcommand: link
	    if (sub === "link") {
	      const childId = action;
	      const parentId = positional[3];
	      if (!childId || !parentId) {
	        throw new Error("Usage: hypothesis link <child-id> <parent-id>");
	      }
	      if (childId === parentId) {
	        throw new Error("Cannot link a hypothesis to itself.");
	      }

      const child = await storage.getHypothesisById(childId);
      if (!child) {
        throw new Error(`Hypothesis "${childId}" not found`);
      }

      const parent = await storage.getHypothesisById(parentId);
      if (!parent) {
        throw new Error(`Parent hypothesis "${parentId}" not found`);
      }

      const updated: Hypothesis = {
        ...child,
        parentId,
        updatedAt: new Date().toISOString(),
      };

      await storage.saveHypothesis(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: updated }, null, 2));
      } else {
        stdoutLine(`Linked ${childId} → ${parentId}`);
      }
      process.exit(0);
	    }

	    // Subcommand: stats
	    if (sub === "stats") {
	      const hypotheses = await storage.getAllHypotheses();

      const byState: Record<HypothesisState, number> = {
        proposed: 0,
        active: 0,
        confirmed: 0,
        refuted: 0,
        superseded: 0,
        deferred: 0,
      };

      const byCategory: Record<HypothesisCategory, number> = {
        mechanistic: 0,
        phenomenological: 0,
        boundary: 0,
        auxiliary: 0,
        third_alternative: 0,
      };

      const byConfidence: Record<HypothesisConfidence, number> = {
        high: 0,
        medium: 0,
        low: 0,
        speculative: 0,
      };

      let withMechanism = 0;
      let withParent = 0;
      let totalUnresolvedCritiques = 0;

      for (const h of hypotheses) {
        byState[h.state]++;
        byCategory[h.category]++;
        byConfidence[h.confidence]++;
        if (h.mechanism) withMechanism++;
        if (h.parentId) withParent++;
        totalUnresolvedCritiques += h.unresolvedCritiqueCount;
      }

      const sessions = new Set(hypotheses.map((h) => h.sessionId)).size;

      if (jsonMode) {
        stdoutLine(JSON.stringify({
          ok: true,
          total: hypotheses.length,
          byState,
          byCategory,
          byConfidence,
          withMechanism,
          withParent,
          totalUnresolvedCritiques,
          sessions,
        }, null, 2));
      } else {
        stdoutLine("Hypothesis Statistics:");
        stdoutLine(`  Total:                 ${hypotheses.length}`);
        stdoutLine("  By state:");
        stdoutLine(`    Proposed:            ${byState.proposed}`);
        stdoutLine(`    Active:              ${byState.active}`);
        stdoutLine(`    Confirmed:           ${byState.confirmed}`);
        stdoutLine(`    Refuted:             ${byState.refuted}`);
        stdoutLine(`    Superseded:          ${byState.superseded}`);
        stdoutLine(`    Deferred:            ${byState.deferred}`);
        stdoutLine("  By category:");
        stdoutLine(`    Mechanistic:         ${byCategory.mechanistic}`);
        stdoutLine(`    Phenomenological:    ${byCategory.phenomenological}`);
        stdoutLine(`    Boundary:            ${byCategory.boundary}`);
        stdoutLine(`    Auxiliary:           ${byCategory.auxiliary}`);
        stdoutLine(`    Third alternative:   ${byCategory.third_alternative}`);
        stdoutLine("  By confidence:");
        stdoutLine(`    High:                ${byConfidence.high}`);
        stdoutLine(`    Medium:              ${byConfidence.medium}`);
        stdoutLine(`    Low:                 ${byConfidence.low}`);
        stdoutLine(`    Speculative:         ${byConfidence.speculative}`);
        stdoutLine(`  With mechanism:        ${withMechanism}`);
        stdoutLine(`  With parent:           ${withParent}`);
        stdoutLine(`  Unresolved critiques:  ${totalUnresolvedCritiques}`);
        stdoutLine(`  Sessions with data:    ${sessions}`);
      }
      process.exit(0);
    }

    // Subcommand: activate
    if (sub === "activate") {
      const hypothesisId = action;
      if (!hypothesisId) throw new Error("Missing hypothesis ID. Usage: hypothesis activate <id>");

      const hypothesis = await storage.getHypothesisById(hypothesisId);
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`);
      }

      const result = activateHypothesis(hypothesis, { sessionId: hypothesis.sessionId });
      if (!result.success) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: false, error: result.error }, null, 2));
        } else {
          stderrLine(`✗ Error: ${result.error?.message ?? "Unknown error"}`);
        }
        process.exit(1);
      }

      const hypothesisToSave = result.hypothesis;
      const transition = result.transition;
      if (!hypothesisToSave || !transition) {
        throw new Error("Invariant violation: activateHypothesis succeeded without returning hypothesis/transition");
      }

      await storage.saveHypothesis(hypothesisToSave);

      // Log transition history
      appendHypothesisTransition(projectKey, transition);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: result.hypothesis, transition: result.transition }, null, 2));
      } else {
        stdoutLine(`✓ Activated hypothesis ${hypothesisId}`);
        stdoutLine(`  State: ${transition.fromState} → ${transition.toState}`);
      }
      process.exit(0);
    }

    // Subcommand: kill (alias for refute)
    if (sub === "kill" || sub === "refute") {
      const hypothesisId = action;
      if (!hypothesisId) throw new Error(`Missing hypothesis ID. Usage: hypothesis ${sub} <id> --test=<test-id> [--reason="..."]`);

      const testId = asStringFlag(flags, "test");
      const reason = asStringFlag(flags, "reason");
      const assumeYes = asBoolFlag(flags, "yes");

      if (!testId) {
        throw new Error(`--test=<test-id> is required.\nHypotheses should be killed by specific test results, not arbitrary decisions.`);
      }

      const hypothesis = await storage.getHypothesisById(hypothesisId);
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`);
      }

      await confirmDestructiveAction(`Confirm kill of hypothesis ${hypothesisId}.`, assumeYes);

      const result = refuteHypothesis(hypothesis, testId, {
        reason,
        sessionId: hypothesis.sessionId,
      });

      if (!result.success) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: false, error: result.error }, null, 2));
        } else {
          stderrLine(`✗ Error: ${result.error?.message ?? "Unknown error"}`);
        }
        process.exit(1);
      }

      const hypothesisToSave = result.hypothesis;
      const transition = result.transition;
      if (!hypothesisToSave || !transition) {
        throw new Error("Invariant violation: refuteHypothesis succeeded without returning hypothesis/transition");
      }

      await storage.saveHypothesis(hypothesisToSave);

      appendHypothesisTransition(projectKey, transition);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: result.hypothesis, transition: result.transition }, null, 2));
      } else {
        stdoutLine(`✓ Killed hypothesis ${hypothesisId}`);
        stdoutLine(`  State: ${transition.fromState} → ${transition.toState}`);
        if (testId) stdoutLine(`  Killed by: ${testId}`);
        if (reason) stdoutLine(`  Reason: ${reason}`);
      }
      process.exit(0);
    }

    // Subcommand: refine (alias for supersede)
    if (sub === "refine" || sub === "supersede") {
      const hypothesisId = action;
      if (!hypothesisId) throw new Error(`Missing hypothesis ID. Usage: hypothesis ${sub} <id> --child=<new-id>`);

      const childId = asStringFlag(flags, "child");
      if (!childId) {
        throw new Error("--child=<new-id> is required. Must link to the refined/superseding hypothesis.");
      }

      const hypothesis = await storage.getHypothesisById(hypothesisId);
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`);
      }

      const child = await storage.getHypothesisById(childId);
      if (!child) {
        throw new Error(`Child hypothesis not found: ${childId}`);
      }

      const result = supersedeHypothesis(hypothesis, childId, { sessionId: hypothesis.sessionId });

      if (!result.success) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: false, error: result.error }, null, 2));
        } else {
          stderrLine(`✗ Error: ${result.error?.message ?? "Unknown error"}`);
        }
        process.exit(1);
      }

      const hypothesisToSave = result.hypothesis;
      const transition = result.transition;
      if (!hypothesisToSave || !transition) {
        throw new Error("Invariant violation: supersedeHypothesis succeeded without returning hypothesis/transition");
      }

      await storage.saveHypothesis(hypothesisToSave);

      appendHypothesisTransition(projectKey, transition);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: result.hypothesis, transition: result.transition }, null, 2));
      } else {
        stdoutLine(`✓ Refined hypothesis ${hypothesisId}`);
        stdoutLine(`  State: ${transition.fromState} → ${transition.toState}`);
        stdoutLine(`  Replaced by: ${childId}`);
      }
      process.exit(0);
    }

    // Subcommand: validate (alias for confirm)
    if (sub === "validate" || sub === "confirm") {
      const hypothesisId = action;
      if (!hypothesisId) throw new Error(`Missing hypothesis ID. Usage: hypothesis ${sub} <id> --test=<test-id>`);

      const testId = asStringFlag(flags, "test");
      if (!testId) {
        throw new Error("--test=<test-id> is required. Validation must be linked to a test result.");
      }

      const hypothesis = await storage.getHypothesisById(hypothesisId);
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`);
      }

      const result = confirmHypothesis(hypothesis, testId, { sessionId: hypothesis.sessionId });

      if (!result.success) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: false, error: result.error }, null, 2));
        } else {
          stderrLine(`✗ Error: ${result.error?.message ?? "Unknown error"}`);
        }
        process.exit(1);
      }

      const hypothesisToSave = result.hypothesis;
      const transition = result.transition;
      if (!hypothesisToSave || !transition) {
        throw new Error("Invariant violation: confirmHypothesis succeeded without returning hypothesis/transition");
      }

      await storage.saveHypothesis(hypothesisToSave);

      appendHypothesisTransition(projectKey, transition);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: result.hypothesis, transition: result.transition }, null, 2));
      } else {
        stdoutLine(`✓ Validated hypothesis ${hypothesisId}`);
        stdoutLine(`  State: ${transition.fromState} → ${transition.toState}`);
        stdoutLine(`  Validated by: ${testId}`);
        stdoutLine(`  ⚠️  Note: Validation is provisional. New tests may still refute this hypothesis.`);
      }
      process.exit(0);
    }

    // Subcommand: park (alias for defer)
    if (sub === "park" || sub === "defer") {
      const hypothesisId = action;
      if (!hypothesisId) throw new Error(`Missing hypothesis ID. Usage: hypothesis ${sub} <id> [--reason="..."]`);

      const reason = asStringFlag(flags, "reason");

      const hypothesis = await storage.getHypothesisById(hypothesisId);
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`);
      }

      const result = deferHypothesis(hypothesis, { reason, sessionId: hypothesis.sessionId });

      if (!result.success) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: false, error: result.error }, null, 2));
        } else {
          stderrLine(`✗ Error: ${result.error?.message ?? "Unknown error"}`);
        }
        process.exit(1);
      }

      const hypothesisToSave = result.hypothesis;
      const transition = result.transition;
      if (!hypothesisToSave || !transition) {
        throw new Error("Invariant violation: deferHypothesis succeeded without returning hypothesis/transition");
      }

      await storage.saveHypothesis(hypothesisToSave);

      appendHypothesisTransition(projectKey, transition);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: result.hypothesis, transition: result.transition }, null, 2));
      } else {
        stdoutLine(`✓ Parked hypothesis ${hypothesisId}`);
        stdoutLine(`  State: ${transition.fromState} → ${transition.toState}`);
        if (reason) stdoutLine(`  Reason: ${reason}`);
      }
      process.exit(0);
    }

    // Subcommand: reactivate
    if (sub === "reactivate") {
      const hypothesisId = action;
      if (!hypothesisId) throw new Error("Missing hypothesis ID. Usage: hypothesis reactivate <id>");

      const hypothesis = await storage.getHypothesisById(hypothesisId);
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`);
      }

      const result = reactivateHypothesis(hypothesis, { sessionId: hypothesis.sessionId });

      if (!result.success) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: false, error: result.error }, null, 2));
        } else {
          stderrLine(`✗ Error: ${result.error?.message ?? "Unknown error"}`);
        }
        process.exit(1);
      }

      const hypothesisToSave = result.hypothesis;
      const transition = result.transition;
      if (!hypothesisToSave || !transition) {
        throw new Error("Invariant violation: reactivateHypothesis succeeded without returning hypothesis/transition");
      }

      await storage.saveHypothesis(hypothesisToSave);

      appendHypothesisTransition(projectKey, transition);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: result.hypothesis, transition: result.transition }, null, 2));
      } else {
        stdoutLine(`✓ Reactivated hypothesis ${hypothesisId}`);
        stdoutLine(`  State: ${transition.fromState} → ${transition.toState}`);
      }
      process.exit(0);
    }

    // Subcommand: history
    if (sub === "history") {
      const hypothesisId = action;
      if (!hypothesisId) throw new Error("Missing hypothesis ID. Usage: hypothesis history <id>");

      const hypothesis = await storage.getHypothesisById(hypothesisId);
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`);
      }

      const history = loadHypothesisTransitionHistory(projectKey, hypothesisId);

      if (jsonMode) {
        stdoutLine(JSON.stringify({
          ok: true,
          hypothesisId,
          currentState: hypothesis.state,
          isTerminal: isTerminalState(hypothesis.state),
          transitionCount: history.length,
          transitions: history,
        }, null, 2));
      } else {
        stdoutLine(`Timeline for ${hypothesisId}:`);
        stdoutLine(`  ${hypothesis.createdAt}  created (${history.length > 0 ? history[0]?.fromState ?? "proposed" : hypothesis.state})`);

        for (const t of history) {
          stdoutLine(`  ${t.timestamp}  ${t.trigger}`);
          stdoutLine(`                        ${t.fromState} → ${t.toState}`);
          if (t.triggeredBy) stdoutLine(`                        Triggered by: ${t.triggeredBy}`);
          if (t.reason) stdoutLine(`                        Reason: ${t.reason}`);
        }

        stdoutLine("");
        if (isTerminalState(hypothesis.state)) {
          stdoutLine(`Current state: ${hypothesis.state} (terminal)`);
        } else {
          stdoutLine(`Current state: ${hypothesis.state}`);
        }
      }
      process.exit(0);
    }

    throw new Error(`Unknown hypothesis subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Test Command
  // ============================================================================
  if (top === "test") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const testStorage = new TestStorage({ baseDir: projectKey });
    const hypothesisStorage = new HypothesisStorage({ baseDir: projectKey });

    const VALID_STATUSES: TestStatus[] = ["designed", "ready", "in_progress", "completed", "blocked", "abandoned"];
    const VALID_CONFIDENCES: HypothesisConfidence[] = ["high", "medium", "low", "speculative"];

    function buildSyntheticPrediction(test: TestRecord): Prediction {
      const now = new Date().toISOString();
      const id = test.addressesPredictions?.[0] ?? test.id.replace(/^T-/, "P-");

      return PredictionSchema.parse({
        id,
        condition: `Test ${test.id}: ${test.name}`,
        hypothesisPredictions: test.expectedOutcomes.map((o) => ({
          hypothesisId: o.hypothesisId,
          prediction: o.resultType ?? o.outcome,
        })),
        sessionId: test.designedInSession,
        linkedTests: [test.id],
        createdAt: now,
        updatedAt: now,
      });
    }

    async function loadHypothesesForTest(test: TestRecord): Promise<Hypothesis[]> {
      const ids = [
        ...new Set(test.expectedOutcomes.map((o) => o.hypothesisId)),
      ];
      const out: Hypothesis[] = [];
      for (const id of ids) {
        const h = await hypothesisStorage.getHypothesisById(id);
        if (h) out.push(h);
      }
      return out;
    }

    function compareConfidence(a: HypothesisConfidence, b: HypothesisConfidence): number {
      const order: HypothesisConfidence[] = ["high", "medium", "low", "speculative"];
      return order.indexOf(a) - order.indexOf(b);
    }

    // Subcommand: list
    if (sub === "list") {
      const sessionId = asStringFlag(flags, "session-id") ?? asStringFlag(flags, "session");
      const statusFilterRaw = asStringFlag(flags, "status") as TestStatus | undefined;

      if (statusFilterRaw && !VALID_STATUSES.includes(statusFilterRaw)) {
        throw new Error(`Invalid --status "${statusFilterRaw}" (expected one of: ${VALID_STATUSES.join(", ")})`);
      }

      let tests: TestRecord[];
      if (sessionId) {
        tests = await testStorage.loadSessionTests(sessionId);
      } else if (statusFilterRaw) {
        tests = await testStorage.getTestsByStatus(statusFilterRaw);
      } else {
        tests = await testStorage.getAllTests();
      }

      if (statusFilterRaw) tests = tests.filter((t) => t.status === statusFilterRaw);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: tests.length, tests }, null, 2));
      } else {
        if (tests.length === 0) {
          stdoutLine("No tests found.");
        } else {
          for (const t of tests) {
            const status = t.status.padEnd(12);
            const targets = t.discriminates.join(", ") || "(none)";
            const name = t.name.length > 60 ? `${t.name.slice(0, 57)}...` : t.name;
            stdoutLine(`[${status}] ${t.id}: ${name} (targets: ${targets})`);
          }
        }
      }
      process.exit(0);
    }

    // Subcommand: show
    if (sub === "show") {
      const testId = action;
      if (!testId) throw new Error("Missing test ID. Usage: test show <id>");

      const test = await testStorage.getTestById(testId);
      if (!test) throw new Error(`Test not found: ${testId}`);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, test }, null, 2));
      } else {
        stdoutLine(`ID:          ${test.id}`);
        stdoutLine(`Name:        ${test.name}`);
        stdoutLine(`Status:      ${test.status}`);
        stdoutLine(`Session:     ${test.designedInSession}`);
        if (test.designedBy) stdoutLine(`Designed by: ${test.designedBy}`);
        stdoutLine(`Procedure:   ${test.procedure}`);
        stdoutLine(`Discriminates: ${test.discriminates.join(", ")}`);
        stdoutLine(`Expected outcomes:`);
        for (const o of test.expectedOutcomes) {
          const rt = o.resultType ? ` (${o.resultType})` : "";
          stdoutLine(`  - ${o.hypothesisId}:${rt} ${o.outcome}`);
        }
        if (test.addressesPredictions?.length) stdoutLine(`Addresses predictions: ${test.addressesPredictions.join(", ")}`);
        stdoutLine(`Potency check:`);
        stdoutLine(`  Positive control: ${test.potencyCheck.positiveControl}`);
        if (test.potencyCheck.sensitivityVerification) stdoutLine(`  Sensitivity:      ${test.potencyCheck.sensitivityVerification}`);
        if (test.potencyCheck.timingValidation) stdoutLine(`  Timing:           ${test.potencyCheck.timingValidation}`);
        stdoutLine(`Evidence/week score: LR=${test.evidencePerWeekScore.likelihoodRatio} cost=${test.evidencePerWeekScore.cost} speed=${test.evidencePerWeekScore.speed} ambiguity=${test.evidencePerWeekScore.ambiguity}`);
        stdoutLine(`Feasibility:`);
        stdoutLine(`  Requirements: ${test.feasibility.requirements}`);
        stdoutLine(`  Difficulty:   ${test.feasibility.difficulty}`);
        if (test.feasibility.blockers?.length) stdoutLine(`  Blockers:     ${test.feasibility.blockers.join(", ")}`);
        if (test.requiredAssumptions?.length) stdoutLine(`Required assumptions: ${test.requiredAssumptions.join(", ")}`);
        if (test.anchors?.length) stdoutLine(`Anchors:     ${test.anchors.join(", ")}`);
        if (test.tags?.length) stdoutLine(`Tags:        ${test.tags.join(", ")}`);
        if (test.notes) stdoutLine(`Notes:       ${test.notes}`);
        stdoutLine(`Created:     ${test.createdAt}`);
        stdoutLine(`Updated:     ${test.updatedAt}`);

        if (test.execution) {
          stdoutLine(`Execution:`);
          stdoutLine(`  Started:      ${test.execution.startedAt}`);
          if (test.execution.completedAt) stdoutLine(`  Completed:    ${test.execution.completedAt}`);
          if (test.execution.executedBy) stdoutLine(`  Executed by:  ${test.execution.executedBy}`);
          stdoutLine(`  Outcome:      ${test.execution.observedOutcome}`);
          stdoutLine(`  Potency pass: ${test.execution.potencyCheckPassed ? "yes" : "no"}`);
          if (test.execution.potencyCheckNotes) stdoutLine(`  Potency note: ${test.execution.potencyCheckNotes}`);
          if (test.execution.notes) stdoutLine(`  Notes:        ${test.execution.notes}`);
        }
      }
      process.exit(0);
    }

    // Subcommand: execute
    if (sub === "execute") {
      const testId = action;
      if (!testId) throw new Error("Missing test ID. Usage: test execute <id> [--interactive] --result <s> (--potency-pass|--potency-fail)");

      const forceInteractive = asBoolFlag(flags, "interactive");
      const noInteractive = asBoolFlag(flags, "no-interactive");
      if (forceInteractive && noInteractive) {
        throw new Error("Use only one of: --interactive or --no-interactive");
      }

      const allowPrompts = forceInteractive || (process.stdin.isTTY === true && process.stdout.isTTY === true && !noInteractive);

      const test = await testStorage.getTestById(testId);
      if (!test) throw new Error(`Test not found: ${testId}`);
      if (test.execution) throw new Error(`Test already has execution: ${testId}`);

      let resultText = asStringFlag(flags, "result") ?? null;

      const potencyPassFlag = asBoolFlag(flags, "potency-pass");
      const potencyFailFlag = asBoolFlag(flags, "potency-fail");
      let potencyCheckPassed: boolean | null = potencyPassFlag !== potencyFailFlag ? potencyPassFlag : null;

      const shouldPrompt =
        allowPrompts &&
        (forceInteractive || resultText === null || potencyCheckPassed === null);

      if (!shouldPrompt) {
        if (!resultText) throw new Error("Missing --result. (Tip: pass --interactive to prompt.)");
        if (potencyCheckPassed === null) {
          throw new Error("Pass exactly one of: --potency-pass or --potency-fail. (Tip: pass --interactive to prompt.)");
        }
      }

      let confidenceRaw = (asStringFlag(flags, "confidence") ?? "medium") as HypothesisConfidence;

      let executedBy = asStringFlag(flags, "by") ?? null;
      let notes = asStringFlag(flags, "notes") ?? null;
      let potencyNotes = asStringFlag(flags, "potency-notes") ?? null;

      if (shouldPrompt) {
        const promptOut = process.stderr;
        const rl = createInterface({ input: process.stdin, output: promptOut });
        const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

        try {
          const promptRequired = async (label: string, current: string | null): Promise<string> => {
            while (true) {
              const suffix = current ? ` [${current}]` : "";
              const answer = (await ask(`${label}${suffix}: `)).trim();
              const value = answer.length > 0 ? answer : current ?? "";
              if (value.trim().length > 0) return value;
              promptOut.write("Value is required.\n");
            }
          };

          const promptOptional = async (label: string, current: string | null): Promise<string | null> => {
            const suffix = current ? ` [${current}]` : " (optional)";
            const answer = (await ask(`${label}${suffix}: `)).trim();
            if (answer.length > 0) return answer;
            return current;
          };

          const promptChoice = async (
            label: string,
            opts: { choices: string[]; defaultValue?: string; required?: boolean },
          ): Promise<string> => {
            const { choices, defaultValue, required } = opts;
            const choiceHint = `(${choices.join("/")})`;
            const suffix = defaultValue ? ` [${defaultValue}]` : "";
            while (true) {
              const raw = (await ask(`${label} ${choiceHint}${suffix}: `)).trim().toLowerCase();
              const resolved = raw.length === 0 && defaultValue ? defaultValue : raw;
              if (!resolved && required) {
                promptOut.write("Value is required.\n");
                continue;
              }
              if (resolved && choices.includes(resolved)) return resolved;
              promptOut.write(`Invalid choice. Expected one of: ${choices.join(", ")}\n`);
            }
          };

          resultText = await promptRequired("Observed result / observation", resultText);

          if (potencyCheckPassed === null || forceInteractive) {
            const potency = await promptChoice("Potency check", { choices: ["pass", "fail"], required: true });
            potencyCheckPassed = potency === "pass";
          }

          if (!VALID_CONFIDENCES.includes(confidenceRaw)) {
            promptOut.write(`Invalid --confidence "${confidenceRaw}" (defaulting to "medium").\n`);
            confidenceRaw = "medium";
          }

          const confidence = await promptChoice("Confidence", {
            choices: [...VALID_CONFIDENCES],
            defaultValue: confidenceRaw,
            required: true,
          });
          confidenceRaw = confidence as HypothesisConfidence;

          executedBy = await promptOptional("Executed by", executedBy);
          notes = await promptOptional("Notes", notes);
          potencyNotes = await promptOptional("Potency notes", potencyNotes);
        } finally {
          rl.close();
        }
      }

      if (!VALID_CONFIDENCES.includes(confidenceRaw)) {
        throw new Error(`Invalid --confidence "${confidenceRaw}" (expected one of: ${VALID_CONFIDENCES.join(", ")})`);
      }

      const apply = asBoolFlag(flags, "apply");
      const killsOnly = asBoolFlag(flags, "kills-only");

      const minConfidenceRaw = asStringFlag(flags, "min-confidence") as HypothesisConfidence | undefined;
      if (minConfidenceRaw && !VALID_CONFIDENCES.includes(minConfidenceRaw)) {
        throw new Error(`Invalid --min-confidence "${minConfidenceRaw}" (expected one of: ${VALID_CONFIDENCES.join(", ")})`);
      }

      const prediction = buildSyntheticPrediction(test);
      const input: ExecutionInput = {
        testId: test.id,
        result: resultText ?? "",
        matchedPredictions: [prediction.id],
        violatedPredictions: [],
        confidence: confidenceRaw,
        executedBy: executedBy || undefined,
        notes: notes || undefined,
        potencyCheckPassed: potencyCheckPassed === true,
        potencyCheckNotes: potencyNotes || undefined,
      };

      const record = recordTestExecution(input, test, [prediction]);
      if (!record.success || !record.execution) {
        throw new Error(record.errors.length > 0 ? record.errors.join("; ") : "Failed to record execution.");
      }

      const updatedTest = TestRecordSchema.parse({
        ...test,
        status: "completed",
        execution: record.execution,
        updatedAt: new Date().toISOString(),
      });
      await testStorage.saveTest(updatedTest);

      const hypotheses = await loadHypothesesForTest(updatedTest);
      const suggest = suggestTransitionsFromExecution(input, [prediction], hypotheses);

      const warnings = [...record.warnings, ...suggest.warnings];

      let applied: { applied: Array<{ hypothesisId: string; ok: boolean; transition?: unknown; error?: string }>; saved: number } | null = null;
      let applyNow = apply;

      const actionableSuggestions = suggest.suggestions.filter((s) => s.suggestedAction !== "none");
      if (!applyNow && shouldPrompt && actionableSuggestions.length > 0) {
        const promptOut = process.stderr;
        const rl = createInterface({ input: process.stdin, output: promptOut });
        const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));
        try {
          const raw = (await ask("Apply suggested transitions? (y/N): ")).trim().toLowerCase();
          applyNow = raw === "y" || raw === "yes";
        } finally {
          rl.close();
        }
      }

      if (applyNow) {
        const hypothesisMap = new Map(hypotheses.map((h) => [h.id, h]));
        const appliedResults: Array<{ hypothesisId: string; ok: boolean; transition?: unknown; error?: string }> = [];

        for (const s of suggest.suggestions) {
          if (s.suggestedAction === "none") continue;
          if (killsOnly && s.suggestedAction === "validate") continue;
          if (minConfidenceRaw && compareConfidence(s.confidence, minConfidenceRaw) > 0) continue;

          const hypothesis = hypothesisMap.get(s.hypothesisId);
          if (!hypothesis) {
            appliedResults.push({ hypothesisId: s.hypothesisId, ok: false, error: "Hypothesis not loaded." });
            continue;
          }

          const trigger = s.suggestedAction === "kill" ? "refute" : "confirm";
          const testResultId = `${updatedTest.id}:${s.supportingPredictions.join(",")}`;

          const result = transitionHypothesis(hypothesis, trigger, {
            triggeredBy: executedBy || "test-cli",
            testResultId,
            reason: s.reason,
            sessionId: updatedTest.designedInSession,
          });

          if (result.success) {
            hypothesisMap.set(s.hypothesisId, result.hypothesis);
            appliedResults.push({ hypothesisId: s.hypothesisId, ok: true, transition: result.transition });
          } else {
            appliedResults.push({ hypothesisId: s.hypothesisId, ok: false, error: result.error.message });
          }
        }

        let saved = 0;
        for (const h of hypothesisMap.values()) {
          await hypothesisStorage.saveHypothesis(h);
          saved++;
        }

        applied = { applied: appliedResults, saved };
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({
          ok: true,
          test: updatedTest,
          warnings,
          suggestions: suggest.suggestions,
          applied,
        }, null, 2));
      } else {
        stdoutLine(`Recorded execution for ${updatedTest.id}`);
        if (warnings.length > 0) {
          stdoutLine("Warnings:");
          for (const w of warnings) stdoutLine(`  - ${w}`);
        }
        const actionable = suggest.suggestions.filter((s) => s.suggestedAction !== "none");
        if (actionable.length === 0) {
          stdoutLine("No transition suggestions.");
        } else {
          stdoutLine("Suggested transitions:");
          for (const s of actionable) {
            stdoutLine(`  ${s.hypothesisId}: ${s.currentState} → ${s.suggestedAction} (${s.confidence})`);
          }
        }
        if (applied) {
          const okCount = applied.applied.filter((r) => r.ok).length;
          stdoutLine(`Applied: ${okCount}/${applied.applied.length}`);
        }
      }
      process.exit(0);
    }

    // Subcommand: suggest-kills
    if (sub === "suggest-kills") {
      const testId = action;
      if (!testId) throw new Error("Missing test ID. Usage: test suggest-kills <id>");

      const confidenceRaw = (asStringFlag(flags, "confidence") ?? "medium") as HypothesisConfidence;
      if (!VALID_CONFIDENCES.includes(confidenceRaw)) {
        throw new Error(`Invalid --confidence "${confidenceRaw}" (expected one of: ${VALID_CONFIDENCES.join(", ")})`);
      }

      const test = await testStorage.getTestById(testId);
      if (!test) throw new Error(`Test not found: ${testId}`);
      if (!test.execution) throw new Error(`Test has no execution record: ${testId}`);

      const prediction = buildSyntheticPrediction(test);
      const input: ExecutionInput = {
        testId: test.id,
        result: test.execution.observedOutcome,
        matchedPredictions: [prediction.id],
        violatedPredictions: [],
        confidence: confidenceRaw,
        executedBy: test.execution.executedBy,
        notes: test.execution.notes,
        potencyCheckPassed: test.execution.potencyCheckPassed,
        potencyCheckNotes: test.execution.potencyCheckNotes,
      };

      const hypotheses = await loadHypothesesForTest(test);
      const suggest = suggestTransitionsFromExecution(input, [prediction], hypotheses);
      const kills = suggest.suggestions.filter((s) => s.suggestedAction === "kill");

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: kills.length, kills, warnings: suggest.warnings }, null, 2));
      } else {
        if (kills.length === 0) {
          stdoutLine(`No kill suggestions for ${testId}.`);
        } else {
          stdoutLine(`Suggested kills for ${testId}:`);
          for (const k of kills) {
            stdoutLine(`  ${k.hypothesisId}: ${k.reason} (${k.confidence})`);
          }
        }
        if (suggest.warnings.length > 0) {
          stdoutLine("Warnings:");
          for (const w of suggest.warnings) stdoutLine(`  - ${w}`);
        }
      }
      process.exit(0);
    }

    // Subcommand: bind
    if (sub === "bind") {
      const testId = action;
      const hypothesisId = positional[3];
      if (!testId || !hypothesisId) throw new Error("Usage: test bind <test-id> <hypothesis-id> (--matched|--violated)");

      const matched = asBoolFlag(flags, "matched");
      const violated = asBoolFlag(flags, "violated");
      if (matched === violated) throw new Error("Pass exactly one of: --matched or --violated");

      const by = asStringFlag(flags, "by");
      const reasonFlag = asStringFlag(flags, "reason");

      const test = await testStorage.getTestById(testId);
      if (!test) throw new Error(`Test not found: ${testId}`);

      const hypothesis = await hypothesisStorage.getHypothesisById(hypothesisId);
      if (!hypothesis) throw new Error(`Hypothesis not found: ${hypothesisId}`);

      const trigger = matched ? "confirm" : "refute";
      const testResultId = `${testId}:manual:${matched ? "matched" : "violated"}`;
      const reason =
        reasonFlag ??
        `Manual binding for ${testId}: marked hypothesis ${hypothesisId} as ${matched ? "matched" : "violated"}.`;

      const result = transitionHypothesis(hypothesis, trigger, {
        triggeredBy: by || "test-cli",
        testResultId,
        reason,
        sessionId: test.designedInSession,
      });

      if (!result.success) throw new Error(result.error.message);

      await hypothesisStorage.saveHypothesis(result.hypothesis);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, hypothesis: result.hypothesis, transition: result.transition }, null, 2));
      } else {
        stdoutLine(`Applied ${trigger} to ${hypothesisId} (from ${hypothesis.state} → ${result.hypothesis.state})`);
      }
      process.exit(0);
    }

    throw new Error(`Unknown test subcommand: ${sub ?? "(missing)"}`);
  }

  // ============================================================================
  // Program Command
  // ============================================================================
  if (top === "program") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const storage = new ProgramStorage({ baseDir: projectKey });

    const VALID_PROGRAM_STATUSES: ProgramStatus[] = ["active", "paused", "completed", "abandoned"];

    // Subcommand: list
    if (sub === "list") {
      const statusFilter = asStringFlag(flags, "status") as ProgramStatus | undefined;

      if (statusFilter && !VALID_PROGRAM_STATUSES.includes(statusFilter)) {
        throw new Error(`Invalid --status "${statusFilter}" (expected one of: ${VALID_PROGRAM_STATUSES.join(", ")})`);
      }

      let programs: ResearchProgram[];
      if (statusFilter) {
        programs = await storage.getProgramsByStatus(statusFilter);
      } else {
        programs = await storage.loadPrograms();
      }

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, count: programs.length, programs }, null, 2));
      } else {
        if (programs.length === 0) {
          stdoutLine("No research programs found.");
        } else {
          for (const p of programs) {
            const status = p.status.padEnd(10);
            const sessions = p.sessions.length;
            stdoutLine(`[${status}] ${p.id}: ${p.name} (${sessions} session${sessions !== 1 ? "s" : ""})`);
          }
        }
      }
      process.exit(0);
    }

    // Subcommand: show
    if (sub === "show") {
      const programId = action;
      if (!programId) throw new Error("Missing program ID. Usage: program show <id>");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program }, null, 2));
      } else {
        stdoutLine(`ID:          ${program.id}`);
        stdoutLine(`Name:        ${program.name}`);
        stdoutLine(`Status:      ${program.status}`);
        stdoutLine(`Description: ${program.description}`);
        stdoutLine(`Sessions:    ${program.sessions.length > 0 ? program.sessions.join(", ") : "(none)"}`);
        if (program.notes) stdoutLine(`Notes:       ${program.notes}`);
        if (program.abandonedReason) stdoutLine(`Abandoned:   ${program.abandonedReason}`);
        stdoutLine(`Created:     ${program.createdAt}`);
        stdoutLine(`Updated:     ${program.updatedAt}`);
        if (program.closedAt) stdoutLine(`Closed:      ${program.closedAt}`);
      }
      process.exit(0);
    }

    // Subcommand: create
    if (sub === "create") {
      const name = asStringFlag(flags, "name");
      const description = asStringFlag(flags, "description");
      const sessionsRaw = asStringFlag(flags, "sessions");

      if (!name) throw new Error("Missing --name.");
      if (!description) throw new Error("Missing --description.");

      // Generate slug from name
      const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existingPrograms = await storage.loadPrograms();
      const existingIds = existingPrograms.map((p) => p.id);
      const newId = generateProgramId(slug, existingIds);

      const sessions = sessionsRaw ? splitCsv(sessionsRaw) : [];

      const program = createResearchProgram({
        id: newId,
        name,
        description,
        sessions,
      });

      await storage.saveProgram(program);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program }, null, 2));
      } else {
        stdoutLine(`Created program: ${program.id}`);
        stdoutLine(`Name: ${program.name}`);
        if (sessions.length > 0) {
          stdoutLine(`Sessions: ${sessions.join(", ")}`);
        }
      }
      process.exit(0);
    }

    // Subcommand: add-session
    if (sub === "add-session") {
      const programId = action;
      const sessionId = asStringFlag(flags, "session") ?? positional[3];

      if (!programId) throw new Error("Missing program ID. Usage: program add-session <program-id> --session <session-id>");
      if (!sessionId) throw new Error("Missing --session <session-id>.");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      const updated = addSessionToProgram(program, sessionId);
      await storage.saveProgram(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program: updated }, null, 2));
      } else {
        stdoutLine(`Added session ${sessionId} to program ${programId}`);
        stdoutLine(`Total sessions: ${updated.sessions.length}`);
      }
      process.exit(0);
    }

    // Subcommand: remove-session
    if (sub === "remove-session") {
      const programId = action;
      const sessionId = asStringFlag(flags, "session") ?? positional[3];

      if (!programId) throw new Error("Missing program ID. Usage: program remove-session <program-id> --session <session-id>");
      if (!sessionId) throw new Error("Missing --session <session-id>.");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      const updated = removeSessionFromProgram(program, sessionId);
      await storage.saveProgram(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program: updated }, null, 2));
      } else {
        stdoutLine(`Removed session ${sessionId} from program ${programId}`);
        stdoutLine(`Remaining sessions: ${updated.sessions.length}`);
      }
      process.exit(0);
    }

    // Subcommand: pause
    if (sub === "pause") {
      const programId = action;
      const reason = asStringFlag(flags, "reason");

      if (!programId) throw new Error("Missing program ID. Usage: program pause <id> [--reason <s>]");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      const updated = pauseProgram(program, reason);
      await storage.saveProgram(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program: updated }, null, 2));
      } else {
        stdoutLine(`Paused program ${programId}`);
        if (reason) stdoutLine(`Reason: ${reason}`);
      }
      process.exit(0);
    }

    // Subcommand: resume
    if (sub === "resume") {
      const programId = action;

      if (!programId) throw new Error("Missing program ID. Usage: program resume <id>");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      const updated = resumeProgram(program);
      await storage.saveProgram(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program: updated }, null, 2));
      } else {
        stdoutLine(`Resumed program ${programId}`);
      }
      process.exit(0);
    }

    // Subcommand: complete
    if (sub === "complete") {
      const programId = action;
      const summary = asStringFlag(flags, "summary");

      if (!programId) throw new Error("Missing program ID. Usage: program complete <id> [--summary <s>]");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      const updated = completeProgram(program, summary);
      await storage.saveProgram(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program: updated }, null, 2));
      } else {
        stdoutLine(`Completed program ${programId}`);
        if (summary) stdoutLine(`Summary: ${summary}`);
      }
      process.exit(0);
    }

    // Subcommand: abandon
    if (sub === "abandon") {
      const programId = action;
      const reason = asStringFlag(flags, "reason");

      if (!programId) throw new Error("Missing program ID. Usage: program abandon <id> --reason <s>");
      if (!reason) throw new Error("Missing --reason (required for abandonment).");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      const updated = abandonProgram(program, reason);
      await storage.saveProgram(updated);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program: updated }, null, 2));
      } else {
        stdoutLine(`Abandoned program ${programId}`);
        stdoutLine(`Reason: ${reason}`);
      }
      process.exit(0);
    }

    // Subcommand: stats
    if (sub === "stats") {
      const stats = await storage.getStatistics();

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, ...stats }, null, 2));
      } else {
        stdoutLine(`Program Statistics:`);
        stdoutLine(`  Total:                    ${stats.total}`);
        stdoutLine(`  By status:`);
        stdoutLine(`    Active:                 ${stats.byStatus.active}`);
        stdoutLine(`    Paused:                 ${stats.byStatus.paused}`);
        stdoutLine(`    Completed:              ${stats.byStatus.completed}`);
        stdoutLine(`    Abandoned:              ${stats.byStatus.abandoned}`);
        stdoutLine(`  Total sessions:           ${stats.totalSessions}`);
        stdoutLine(`  Avg sessions/program:     ${stats.avgSessionsPerProgram.toFixed(1)}`);
      }
      process.exit(0);
    }

    // Subcommand: dashboard
    if (sub === "dashboard") {
      const programId = action;

      if (!programId) throw new Error("Missing program ID. Usage: program dashboard <id>");

      const program = await storage.getProgramById(programId);
      if (!program) throw new Error(`Program not found: ${programId}`);

      const aggregator = new DashboardAggregator({ baseDir: projectKey });
      const dashboard = await aggregator.generateDashboard(program);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, program: { id: program.id, name: program.name }, dashboard }, null, 2));
      } else {
        stdoutLine(`Dashboard for ${program.name} (${program.id})`);
        stdoutLine(`Generated at: ${dashboard.generatedAt}`);
        stdoutLine(``);

        // Hypothesis funnel
        stdoutLine(`Hypothesis Funnel:`);
        stdoutLine(`  Proposed:              ${dashboard.hypothesisFunnel.proposed}`);
        stdoutLine(`  Active:                ${dashboard.hypothesisFunnel.active}`);
        stdoutLine(`  Under Attack:          ${dashboard.hypothesisFunnel.underAttack}`);
        stdoutLine(`  Assumption Undermined: ${dashboard.hypothesisFunnel.assumptionUndermined}`);
        stdoutLine(`  Killed:                ${dashboard.hypothesisFunnel.killed}`);
        stdoutLine(`  Validated:             ${dashboard.hypothesisFunnel.validated}`);
        stdoutLine(`  Dormant:               ${dashboard.hypothesisFunnel.dormant}`);
        stdoutLine(`  Refined:               ${dashboard.hypothesisFunnel.refined}`);
        stdoutLine(`  By Origin:`);
        stdoutLine(`    Original:            ${dashboard.hypothesisFunnel.byOrigin.original}`);
        stdoutLine(`    Third Alternative:   ${dashboard.hypothesisFunnel.byOrigin.thirdAlternative}`);
        stdoutLine(`    Anomaly Spawned:     ${dashboard.hypothesisFunnel.byOrigin.anomalySpawned}`);
        stdoutLine(``);

        // Registry health
        stdoutLine(`Registry Health:`);
        stdoutLine(`  Hypotheses:  ${dashboard.registryHealth.hypotheses.total} total`);
        stdoutLine(`  Assumptions: ${dashboard.registryHealth.assumptions.total} total`);
        stdoutLine(`  Anomalies:   ${dashboard.registryHealth.anomalies.total} total`);
        stdoutLine(`  Critiques:   ${dashboard.registryHealth.critiques.total} total`);
        stdoutLine(``);

        // Test execution
        stdoutLine(`Test Execution:`);
        stdoutLine(`  Designed:              ${dashboard.testExecution.designed}`);
        stdoutLine(`  In Progress:           ${dashboard.testExecution.inProgress}`);
        stdoutLine(`  Completed:             ${dashboard.testExecution.completed}`);
        stdoutLine(`  Blocked:               ${dashboard.testExecution.blocked}`);
        stdoutLine(`  Potency Coverage:      ${(dashboard.testExecution.potencyCoverage * 100).toFixed(0)}%`);
        if (dashboard.testExecution.avgEvidenceScore !== undefined) {
          stdoutLine(`  Avg Evidence Score:    ${dashboard.testExecution.avgEvidenceScore}/12`);
        }
        stdoutLine(``);

        // Warnings
        if (dashboard.warnings.length > 0) {
          stdoutLine(`Health Warnings (${dashboard.warnings.length}):`);
          for (const w of dashboard.warnings) {
            const icon = w.severity === "critical" ? "!!" : w.severity === "warning" ? "!" : "*";
            stdoutLine(`  [${icon}] ${w.code}: ${w.message}`);
            if (w.suggestion) stdoutLine(`      -> ${w.suggestion}`);
          }
        } else {
          stdoutLine(`Health: OK (no warnings)`);
        }
        stdoutLine(``);

        // Recent events
        if (dashboard.recentEvents.length > 0) {
          const eventsToShow = dashboard.recentEvents.slice(0, 10);
          stdoutLine(`Recent Events (${eventsToShow.length} of ${dashboard.recentEvents.length}):`);
          for (const e of eventsToShow) {
            const date = e.timestamp.substring(0, 10);
            stdoutLine(`  ${date} ${e.eventType}: ${e.description.substring(0, 60)}`);
          }
        }
      }
      process.exit(0);
    }

    throw new Error(`Unknown program subcommand: ${sub ?? "(missing)"}`);
  }

  if (top === "mail") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;

    if (sub === "health") {
      // Prefer the FastAPI health endpoint when reachable; fall back to MCP tool.
      const baseUrl = runtimeConfig.agentMail.baseUrl;
      const headers: Record<string, string> = {};
      if (runtimeConfig.agentMail.bearerToken) headers.Authorization = `Bearer ${runtimeConfig.agentMail.bearerToken}`;
      try {
        const res = await fetch(`${baseUrl}/health/readiness`, { headers });
        const json = await res.json().catch(() => ({}));
        stdoutLine(JSON.stringify({ ok: res.ok, status: res.status, readiness: json }, null, 2));
        process.exit(res.ok ? 0 : 1);
      } catch {
        const result = await client.toolsCall("health_check", {});
        stdoutLine(JSON.stringify(result, null, 2));
        process.exit(0);
      }
    }

    if (sub === "tools") {
      const result = await client.toolsList();
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "agents") {
      const projectSlug = isAbsolute(projectKey)
        ? parseEnsureProjectSlug(await client.toolsCall("ensure_project", { human_key: projectKey }))
        : projectKey;
      if (!projectSlug) throw new Error("Agent Mail ensure_project did not return a project slug.");
      const result = await client.resourcesRead(`resource://agents/${projectSlug}`);
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "send") {
      let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
      if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
      const to = splitCsv(asStringFlag(flags, "to"));
      if (to.length === 0) throw new Error("Missing --to <A,B>.");
      const subject = asStringFlag(flags, "subject") ?? "";
      if (!subject) throw new Error("Missing --subject.");
      const bodyFile = asStringFlag(flags, "body-file");
      if (!bodyFile) throw new Error("Missing --body-file.");
      const bodyMd = readTextFile(resolve(bodyFile));
      const threadId = asStringFlag(flags, "thread-id");
      const ackRequired = asBoolFlag(flags, "ack-required");

      if (isAbsolute(projectKey)) {
        await client.toolsCall("ensure_project", { human_key: projectKey });
      }

      const whoisResult = await client.toolsCall("whois", {
        project_key: projectKey,
        agent_name: sender,
        include_recent_commits: false,
      });

      if (isToolError(whoisResult)) {
        const registerResult = await client.toolsCall("register_agent", {
          project_key: projectKey,
          name: sender,
          program: "brenner-cli",
          model: "orchestrator",
          task_description: threadId ? `Brenner CLI mail send: ${threadId}` : "Brenner CLI mail send",
        });
        const actualName = parseAgentNameFromToolResult(registerResult);
        if (actualName && actualName !== sender) {
          stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
          sender = actualName;
        }
      }

      const result = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: bodyMd,
        thread_id: threadId ?? null,
        ack_required: ackRequired,
      });
      if (isToolError(result)) {
        stderrLine(JSON.stringify(result, null, 2));
        process.exit(1);
      }
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "inbox") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");

      const limit = asIntFlag(flags, "limit") ?? 20;
      const urgentOnly = asBoolFlag(flags, "urgent-only");
      const includeBodies = asBoolFlag(flags, "include-bodies");
      const includeSummaries = asBoolFlag(flags, "summaries");
      const threadsMode = asBoolFlag(flags, "threads");
      const sinceTs = asStringFlag(flags, "since");

      if (includeSummaries && !threadsMode) {
        throw new Error("Use --summaries together with --threads.");
      }
      if (includeSummaries && includeBodies) {
        throw new Error("Use either --include-bodies or --summaries (not both).");
      }

      const result = await client.toolsCall("fetch_inbox", {
        project_key: projectKey,
        agent_name: agentName,
        limit,
        urgent_only: urgentOnly,
        include_bodies: includeBodies,
        since_ts: sinceTs ?? null,
      });

      if (threadsMode) {
        // Best-effort grouping by thread_id from structuredContent, falling back to raw content parsing.
        const messages: Array<Record<string, Json>> = [];

        if (isRecord(result) && isRecord(result.structuredContent)) {
          const structured = result.structuredContent.result;
          if (Array.isArray(structured)) {
            for (const item of structured) {
              if (isRecord(item)) messages.push(item);
            }
          }
        } else if (isRecord(result) && Array.isArray(result.content) && result.content.length > 0) {
          const first = result.content[0];
          if (isRecord(first) && typeof first.text === "string") {
            try {
              const parsed = JSON.parse(first.text) as Json;
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (isRecord(item)) messages.push(item);
                }
              }
            } catch {
              // ignore
            }
          }
        }

        const threads: Record<
          string,
          {
            thread_id: string;
            message_ids: number[];
            latest_ts: string | null;
            ack_required_message_count: number;
          }
        > = {};

        for (const m of messages) {
          const threadId = typeof m.thread_id === "string" && m.thread_id.length > 0 ? m.thread_id : "(no-thread)";
          const messageId = typeof m.id === "number" ? m.id : null;
          const createdTs = typeof m.created_ts === "string" ? m.created_ts : null;
          const ackRequired = m.ack_required === true;

          const existing = (threads[threadId] ??= {
            thread_id: threadId,
            message_ids: [],
            latest_ts: null,
            ack_required_message_count: 0,
          });

          if (messageId !== null) existing.message_ids.push(messageId);
          if (createdTs && (!existing.latest_ts || createdTs > existing.latest_ts)) existing.latest_ts = createdTs;
          if (ackRequired) existing.ack_required_message_count++;
        }

        const baseThreads = Object.values(threads).sort((a, b) => (b.latest_ts ?? "").localeCompare(a.latest_ts ?? ""));

        if (!includeSummaries) {
          const out = { agent: agentName, threads: baseThreads };
          stdoutLine(JSON.stringify(out, null, 2));
          process.exit(0);
        }

        const enriched: Array<
          (typeof baseThreads)[number] & {
            status?: {
              phase: string;
              respondedRoleCount: number;
              totalRoleCount: number;
              pendingAcks: number;
              awaitingAckFrom: string[];
              hasArtifact: boolean;
              latestArtifact: null | {
                message_id: number;
                version: number | null;
                compiledAt: string;
                contributors: string[];
              };
              roleContributors: Record<string, string[]>;
              summary: string;
            } | null;
            status_error?: string;
          }
        > = [];

        for (const threadMeta of baseThreads) {
          if (threadMeta.thread_id === "(no-thread)") {
            enriched.push({ ...threadMeta, status: null });
            continue;
          }

          try {
            const thread = await client.readThread({ projectKey, threadId: threadMeta.thread_id, includeBodies: false });
            const status = computeThreadStatusFromThread(thread);
            const totalRoleCount = Object.keys(status.roles).length;
            const respondedRoleCount = Object.values(status.roles).filter((r) => r.completed).length;
            let artifactLabel: string | null = null;
            if (status.latestArtifact) {
              if (status.latestArtifact.version) {
                artifactLabel = `v${status.latestArtifact.version}`;
              } else {
                artifactLabel = "latest";
              }
            }

            const summaryParts = [
              `${respondedRoleCount}/${totalRoleCount} roles`,
              `Phase: ${status.phase.replace(/_/g, " ")}`,
              status.acks.pendingCount > 0 ? `${status.acks.pendingCount} pending acks` : null,
              artifactLabel ? `Artifact: ${artifactLabel}` : null,
            ].filter(Boolean) as string[];

            enriched.push({
              ...threadMeta,
              status: {
                phase: status.phase,
                respondedRoleCount,
                totalRoleCount,
                pendingAcks: status.acks.pendingCount,
                awaitingAckFrom: status.acks.awaitingFrom,
                hasArtifact: status.latestArtifact !== null,
                latestArtifact: status.latestArtifact
                  ? {
                      message_id: status.latestArtifact.message.id,
                      version: status.latestArtifact.version,
                      compiledAt: status.latestArtifact.compiledAt,
                      contributors: status.latestArtifact.contributors,
                    }
                  : null,
                roleContributors: Object.fromEntries(
                  Object.entries(status.roles).map(([role, roleStatus]) => [role, roleStatus.contributors])
                ),
                summary: summaryParts.join(" | "),
              },
            });
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            enriched.push({ ...threadMeta, status_error: message });
          }
        }

        stdoutLine(JSON.stringify({ agent: agentName, threads: enriched }, null, 2));
      } else {
        stdoutLine(JSON.stringify(result, null, 2));
      }

      process.exit(0);
    }

    if (sub === "read") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");
      const messageId = asIntFlag(flags, "message-id");
      if (!messageId) throw new Error("Missing --message-id.");

      // Fetch the message (with bodies) so `mail read` actually shows content.
      // Agent Mail doesn't currently expose a direct "get message by id" tool,
      // so we scan the agent's inbox for the requested message_id.
      const inbox = await client.toolsCall("fetch_inbox", {
        project_key: projectKey,
        agent_name: agentName,
        limit: 200,
        urgent_only: false,
        include_bodies: true,
        since_ts: null,
      });

      if (isToolError(inbox)) {
        stderrLine(JSON.stringify(inbox, null, 2));
        process.exit(1);
      }

      const messages: Array<Record<string, Json>> = [];
      if (isRecord(inbox) && isRecord(inbox.structuredContent)) {
        const structured = inbox.structuredContent.result;
        if (Array.isArray(structured)) {
          for (const item of structured) {
            if (isRecord(item)) messages.push(item);
          }
        }
      } else if (isRecord(inbox) && Array.isArray(inbox.content) && inbox.content.length > 0) {
        const first = inbox.content[0];
        if (isRecord(first) && typeof first.text === "string") {
          try {
            const parsed = JSON.parse(first.text) as Json;
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (isRecord(item)) messages.push(item);
              }
            }
          } catch {
            // ignore
          }
        }
      }

      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found in ${agentName} inbox (limit=200).`);
      }

      const markRead = await client.toolsCall("mark_message_read", {
        project_key: projectKey,
        agent_name: agentName,
        message_id: messageId,
      });

      stdoutLine(JSON.stringify({ message, mark_read: markRead }, null, 2));
      process.exit(0);
    }

    if (sub === "ack") {
      const agentName = asStringFlag(flags, "agent") ?? process.env.AGENT_NAME;
      if (!agentName) throw new Error("Missing --agent (or set AGENT_NAME).");
      const messageId = asIntFlag(flags, "message-id");
      if (!messageId) throw new Error("Missing --message-id.");

      const result = await client.toolsCall("acknowledge_message", {
        project_key: projectKey,
        agent_name: agentName,
        message_id: messageId,
      });
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (sub === "thread") {
      const threadId = asStringFlag(flags, "thread-id");
      if (!threadId) throw new Error("Missing --thread-id.");
      const includeExamples = asBoolFlag(flags, "include-examples");
      const llmMode = asBoolFlag(flags, "llm");

      const result = await client.toolsCall("summarize_thread", {
        project_key: projectKey,
        thread_id: threadId,
        include_examples: includeExamples,
        llm_mode: llmMode,
      });
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    throw new Error(`Unknown mail command: ${sub ?? "(missing)"}`);
  }

  if (top === "toolchain" && sub === "plan") {
    const manifestPath = resolve(asStringFlag(flags, "manifest") ?? "specs/toolchain.manifest.json");
    const jsonMode = asBoolFlag(flags, "json");
    const platformOverride = asStringFlag(flags, "platform") as PlatformString | undefined;

    // Read and parse manifest
    let manifestJson: string;
    try {
      manifestJson = readTextFile(manifestPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      stderrLine(`Failed to read manifest: ${msg}`);
      process.exit(1);
    }

    const parseResult = parseManifest(manifestJson);
    if (!parseResult.ok) {
      stderrLine(parseResult.error);
      process.exit(1);
    }

    // Detect or use override platform
    const platform = platformOverride ?? detectPlatform();
    if (!platform) {
      stderrLine(
        `Unsupported platform: ${process.platform}/${process.arch}\n` +
          `Supported: linux-x64, linux-arm64, darwin-arm64, darwin-x64, win-x64`
      );
      process.exit(1);
    }

    // Validate platform override if provided
    const validPlatforms = ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64", "win-x64"];
    if (platformOverride && !validPlatforms.includes(platformOverride)) {
      stderrLine(`Invalid --platform: ${platformOverride}\nSupported: ${validPlatforms.join(", ")}`);
      process.exit(1);
    }

    const plan = generateInstallPlan(parseResult.manifest, platform);

    if (jsonMode) {
      stdoutLine(formatPlanJson(plan));
    } else {
      stdoutLine(formatPlanHuman(plan));
    }

    process.exit(0);
  }

  if (top === "lint") {
    const jsonMode = asBoolFlag(flags, "json");
    const artifactPathRaw = sub;
    if (!artifactPathRaw) throw new Error("Missing <artifact.json> path.");

    const artifactPath = resolve(artifactPathRaw);
    const artifact = parseArtifactFromJsonFile(artifactPath);
    const report = lintArtifact(artifact);

    const artifactName = artifact.metadata?.session_id ? artifact.metadata.session_id : artifactPath;
    if (jsonMode) {
      stdoutLine(formatLintReportJson(report, artifactName));
    } else {
      stdoutLine(formatLintReportHuman(report, artifactName));
    }

    process.exit(report.valid ? 0 : 1);
  }

  if (top === "excerpt" && sub === "build") {
    const jsonMode = asBoolFlag(flags, "json");

    const transcriptSelectionRaw = asStringFlag(flags, "sections") ?? asStringFlag(flags, "anchors");
    const tagsSelectionRaw = asStringFlag(flags, "tags") ?? asStringFlag(flags, "tag");
    if (!transcriptSelectionRaw && !tagsSelectionRaw) {
      throw new Error("Missing selection. Provide --sections/--anchors or --tags/--tag.");
    }
    if (transcriptSelectionRaw && tagsSelectionRaw) {
      throw new Error("Ambiguous selection. Provide either --sections/--anchors or --tags/--tag (not both).");
    }

    const orderingRaw = asStringFlag(flags, "ordering");
    const ordering = orderingRaw ? (orderingRaw as "relevance" | "chronological") : undefined;
    if (orderingRaw && ordering !== "relevance" && ordering !== "chronological") {
      throw new Error(`Invalid --ordering: expected "relevance" or "chronological", got "${orderingRaw}"`);
    }

    const theme = asStringFlag(flags, "theme");
    const maxTotalWords = asIntFlag(flags, "max-total-words");
    const maxQuoteWords = asIntFlag(flags, "max-quote-words");

    let composed: ComposedExcerpt;

    if (transcriptSelectionRaw) {
      const transcriptPath = resolve(asStringFlag(flags, "transcript-file") ?? "complete_brenner_transcript.md");
      const transcript = parseTranscript(readTextFile(transcriptPath));
      const sections = splitCsv(transcriptSelectionRaw);
      if (sections.length === 0) throw new Error("Missing --sections/--anchors values.");

      composed = buildExcerptFromSections(transcript, sections, {
        theme: theme ?? undefined,
        ordering: ordering ?? undefined,
        maxTotalWords: maxTotalWords ?? undefined,
        maxQuoteWords: maxQuoteWords ?? undefined,
      });
    } else {
      const quoteBankPath = resolve(asStringFlag(flags, "quote-bank-file") ?? "quote_bank_restored_primitives.md");
      const tags = splitCsv(tagsSelectionRaw);
      if (tags.length === 0) throw new Error("Missing --tags/--tag values.");

      const quoteBank = parseQuoteBank(readTextFile(quoteBankPath));
      const maxSections = asIntFlag(flags, "limit") ?? 7;
      if (maxSections <= 0) throw new Error(`Invalid --limit: expected > 0, got ${maxSections}`);

      const selected: ExcerptSection[] = [];
      const seen = new Set<string>();
      let matched = 0;

      for (const quote of quoteBank.quotes) {
        if (!tags.some((tag) => quote.tags.includes(tag))) continue;
        matched++;

        if (selected.length >= maxSections) continue;
        if (seen.has(quote.sectionId)) continue;

        seen.add(quote.sectionId);
        selected.push({
          anchor: quote.sectionId,
          quote: normalizeExcerptQuote(quote.quote, maxQuoteWords ?? 150),
          title: quote.title,
        });
      }

      if (selected.length === 0) {
        throw new Error(`No quotes matched tag(s): ${tags.join(", ")}`);
      }

      composed = composeExcerpt({
        theme: theme ?? (tags.length === 1 ? `Tag: ${tags[0]}` : `Tags: ${tags.join(", ")}`),
        sections: selected,
        ordering: ordering ?? "relevance",
        maxTotalWords: maxTotalWords ?? 800,
      });

      if (matched > selected.length) {
        composed.warnings.push(`Limited to ${selected.length} of ${matched} matching quotes`);
      }
    }

    if (jsonMode) {
      stdoutLine(JSON.stringify(composed, null, 2));
    } else {
      stdoutLine(composed.markdown);
    }

    process.exit(0);
  }

  if (top === "corpus" && sub === "search") {
    const jsonMode = asBoolFlag(flags, "json");
    const publicBaseUrl = getCliPublicBaseUrl();

    const positionalQuery = positional.slice(2).join(" ").trim();
    const query = positionalQuery || asStringFlag(flags, "query");
    if (!query) throw new Error("Missing query. Usage: ./brenner.ts corpus search \"...\" (or --query \"...\").");

    const limit = asIntFlag(flags, "limit") ?? 20;
    if (limit <= 0) throw new Error(`Invalid --limit: expected > 0, got ${limit}`);

    const docIds = splitCsv(asStringFlag(flags, "docs") ?? asStringFlag(flags, "doc"));
    if (docIds.length > 0) {
      const known = new Set(CORPUS_DOCS.map((d) => d.id));
      const unknown = docIds.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw new Error(
          `Unknown doc id(s): ${unknown.join(", ")}\n` +
            `Known docs:\n` +
            CORPUS_DOCS.map((d) => `- ${d.id}${d.title ? `: ${d.title}` : ""}`).join("\n")
        );
      }
    }

    const categoryRaw = asStringFlag(flags, "category");
    const allowedCategories: SearchCategory[] = [
      "all",
      "transcript",
      "quote-bank",
      "distillation",
      "metaprompt",
      "raw-response",
    ];
    const category = (categoryRaw ?? "all") as SearchCategory;
    if (categoryRaw && !allowedCategories.includes(category)) {
      throw new Error(`Invalid --category: expected one of ${allowedCategories.join(", ")}, got "${categoryRaw}"`);
    }

    const modelRaw = asStringFlag(flags, "model");
    const model = modelRaw ? (modelRaw as "gpt" | "opus" | "gemini") : undefined;
    if (modelRaw && model !== "gpt" && model !== "opus" && model !== "gemini") {
      throw new Error(`Invalid --model: expected "gpt", "opus", or "gemini", got "${modelRaw}"`);
    }

    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);

    const runSearch = () =>
      globalSearch(query, {
        limit,
        category,
        model,
        ...(docIds.length > 0 ? { docIds } : {}),
      });

    let result: Awaited<ReturnType<typeof runSearch>>;
    let webCwd: string | null = null;
    try {
      webCwd = resolveWebAppCwd(projectKey);
    } catch {
      // ignore
    }

    if (webCwd) {
      result = await withWorkingDirectory(webCwd, runSearch);
    } else {
      // Fall back to HTTP-only mode (works outside the repo).
      result = await runSearch();
    }

    if (jsonMode) {
      stdoutLine(
        JSON.stringify(
          {
            ...result,
            filters: { limit, category, model: model ?? null, docIds },
            publicBaseUrl,
          },
          null,
          2
        )
      );
      process.exit(0);
    }

    const lines: string[] = [];
    lines.push(`Query: ${query}`);
    if (docIds.length > 0) lines.push(`Docs: ${docIds.join(", ")}`);
    if (category !== "all") lines.push(`Category: ${category}`);
    if (model) lines.push(`Model: ${model}`);
    lines.push(`Matches: ${result.totalMatches} (showing ${result.hits.length}) in ${result.searchTimeMs}ms`);

    for (const [i, hit] of result.hits.entries()) {
      lines.push("");
      const where = [hit.docId, hit.anchor].filter(Boolean).join(" ");
      lines.push(`${i + 1}. ${where} — ${hit.title}`);
      lines.push(`   ${singleLine(hit.snippet)}`);
      lines.push(`   ${toAbsoluteUrl(hit.url, publicBaseUrl)}`);
    }

    stdoutLine(lines.join("\n").trim());
    process.exit(0);
  }

  if (top === "corpus") {
    throw new Error(`Unknown corpus command: ${[sub, action].filter(Boolean).join(" ") || "(missing subcommand)"}`);
  }

  if (top === "prompt" && sub === "compose") {
    const templatePath = resolve(asStringFlag(flags, "template") ?? runtimeConfig.defaults.template);
    const excerptFile = asStringFlag(flags, "excerpt-file");
    if (!excerptFile) throw new Error("Missing --excerpt-file.");
    const excerpt = readTextFile(resolve(excerptFile));

    const out = composePrompt({
      templatePath,
      excerpt,
      theme: asStringFlag(flags, "theme"),
      domain: asStringFlag(flags, "domain"),
      question: asStringFlag(flags, "question"),
    });
    process.stdout.write(out);
    process.exit(0);
  }

  if (top === "memory" && sub === "context") {
    const positionalTask = positional.slice(2).join(" ").trim();
    const task = positionalTask || asStringFlag(flags, "task");
    if (!task) throw new Error("Missing task. Usage: ./brenner.ts memory context \"...\" (or --task \"...\").");

    const result = await getCassMemoryContext(task, {
      workspace: asStringFlag(flags, "workspace"),
      top: asIntFlag(flags, "top"),
      history: asIntFlag(flags, "history"),
      days: asIntFlag(flags, "days"),
      logContext: asBoolFlag(flags, "log-context"),
      sessionId: asStringFlag(flags, "session"),
    });

    stdoutLine(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (top === "cockpit" && sub === "start") {
    const jsonMode = asBoolFlag(flags, "json");
    const dryRun = asBoolFlag(flags, "dry-run");
    const skipNtm = asBoolFlag(flags, "skip-ntm");
    const skipBroadcast = asBoolFlag(flags, "skip-broadcast");
    const ntmArgsRaw = asStringFlag(flags, "ntm-args") ?? "--cc=1 --cod=1 --agy=1";

    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
    if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");

    const to = splitCsv(asStringFlag(flags, "to"));
    if (to.length === 0) throw new Error("Missing --to <A,B>.");

    const excerptFile = asStringFlag(flags, "excerpt-file");
    if (!excerptFile) throw new Error("Missing --excerpt-file.");
    const excerpt = readTextFile(resolve(excerptFile));

    const question = asStringFlag(flags, "question");
    if (!question) throw new Error("Missing --question (research question).");

    const context = asStringFlag(flags, "context") ?? "See excerpt for background.";
    const withMemory = asBoolFlag(flags, "with-memory");
    let memoryAudit: CassMemoryKickoffAudit = null;

    const roleMapRaw = asStringFlag(flags, "role-map")?.trim();
    if (!roleMapRaw) {
      throw new Error(
        "Missing --role-map. Cockpit sessions require an explicit roster mapping. " +
          'Example: --role-map "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic"'
      );
    }

    const recipientRoles = parseRoleMapFlag(roleMapRaw);
    const normalizedMap = new Set(Object.keys(recipientRoles).map((k) => k.trim().toLowerCase()));
    const missing = to.filter((r) => !normalizedMap.has(r.trim().toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`--role-map is missing entries for: ${missing.join(", ")}`);
    }

    const kickoffConfig: KickoffConfig = {
      threadId,
      researchQuestion: question,
      context,
      excerpt,
      recipients: to,
      recipientRoles,
      initialHypotheses: asStringFlag(flags, "hypotheses"),
      constraints: asStringFlag(flags, "constraints"),
      requestedOutputs: asStringFlag(flags, "outputs"),
      operatorSelection: {
        hypothesis_generator: AGENT_ROLES["Codex"].operators,
        test_designer: AGENT_ROLES["Opus"].operators,
        adversarial_critic: AGENT_ROLES["Gemini"].operators,
      },
    };

    if (withMemory) {
      const memoryResult = await getCassMemoryContext(question, { workspace: projectKey, top: 5, history: 0 });
      const memoryContext = formatCassMemoryContextForKickoff(memoryResult);
      memoryAudit = {
        enabled: true,
        ok: memoryResult.ok,
        injected: Boolean(memoryContext),
        memoryContext: memoryContext ?? null,
        provenance: memoryResult.provenance,
      };
      if (memoryContext) {
        kickoffConfig.memoryContext = memoryContext;
      }
    }

    const broadcastMessage =
      asStringFlag(flags, "broadcast-message") ?? `Please check your Agent Mail inbox for thread: ${threadId}`;

    const ntmSpawnArgv = ["ntm", "spawn", threadId, ...splitCommand(ntmArgsRaw)];
    const ntmSendArgv = ["ntm", "send", threadId, "--all", broadcastMessage];

    const kickoffPreview = composeKickoffMessages(kickoffConfig).map((m) => ({
      to: m.to,
      role: m.role.role,
      subject: m.subject,
    }));

    if (dryRun) {
      if (jsonMode) {
        stdoutLine(
          JSON.stringify(
            {
              ok: true,
              dryRun: true,
              threadId,
              projectKey,
              sender,
              to,
              roster: recipientRoles,
              memory: memoryAudit,
              ntm: {
                spawn: skipNtm ? null : { argv: ntmSpawnArgv },
                broadcast: skipBroadcast ? null : { argv: ntmSendArgv },
              },
              kickoff: kickoffPreview,
            },
            null,
            2
          )
        );
      } else {
        const lines: string[] = [];
        lines.push("cockpit start (dry-run)");
        lines.push(`thread: ${threadId}`);
        lines.push(`project: ${projectKey}`);
        lines.push("");
        if (!skipNtm) {
          lines.push("ntm spawn:");
          lines.push(`  ${ntmSpawnArgv.join(" ")}`);
          lines.push("");
        }
        lines.push("kickoff messages:");
        for (const msg of kickoffPreview) {
          lines.push(`  - ${msg.to}: ${msg.role} (${msg.subject})`);
        }
        lines.push("");
        if (!skipBroadcast) {
          lines.push("ntm broadcast:");
          lines.push(`  ${ntmSendArgv.join(" ")}`);
          lines.push("");
        }
        stdoutLine(lines.join("\n").trim());
      }
      process.exit(0);
    }

    const ntmResults: Json[] = [];

    if (!skipNtm) {
      const proc = Bun.spawnSync(ntmSpawnArgv, { stdout: "pipe", stderr: "pipe" });
      ntmResults.push({
        action: "spawn",
        argv: ntmSpawnArgv,
        exitCode: proc.exitCode ?? 1,
        stdout: proc.stdout.toString(),
        stderr: proc.stderr.toString(),
      });
      if ((proc.exitCode ?? 1) !== 0) {
        throw new Error(`ntm spawn failed: ${proc.stderr.toString().trim()}`);
      }
    }

    // Send kickoff via Agent Mail (role-specific, explicit roster)
    const client = new AgentMailClient(runtimeConfig.agentMail);
    await client.toolsCall("ensure_project", { human_key: projectKey });
    const registerResult = await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol session (cockpit): ${threadId}`,
    });
    const actualName = parseAgentNameFromToolResult(registerResult);
    if (actualName && actualName !== sender) {
      stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
    }

    const messages = composeKickoffMessages(kickoffConfig);
    const sendResults: Json[] = [];
    for (const msg of messages) {
      const result = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to: [msg.to],
        subject: msg.subject,
        body_md: msg.body,
        thread_id: threadId,
        ack_required: true,
      });
      sendResults.push(result);
    }

    if (!skipBroadcast) {
      const proc = Bun.spawnSync(ntmSendArgv, { stdout: "pipe", stderr: "pipe" });
      ntmResults.push({
        action: "broadcast",
        argv: ntmSendArgv,
        exitCode: proc.exitCode ?? 1,
        stdout: proc.stdout.toString(),
        stderr: proc.stderr.toString(),
      });
      if ((proc.exitCode ?? 1) !== 0) {
        throw new Error(`ntm send failed: ${proc.stderr.toString().trim()}`);
      }
    }

    stdoutLine(
      JSON.stringify(
        {
          ok: true,
          threadId,
          projectKey,
          sender,
          to,
          roster: recipientRoles,
          memory: memoryAudit,
          ntm: ntmResults,
          sent: messages.length,
          messages: sendResults,
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const normalizedTop = top === "orchestrate" ? "session" : top;

  if (normalizedTop === "session" && sub === "start") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
    if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
    const to = splitCsv(asStringFlag(flags, "to"));
    if (to.length === 0) throw new Error("Missing --to <A,B>.");
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const excerptFile = asStringFlag(flags, "excerpt-file");
    if (!excerptFile) throw new Error("Missing --excerpt-file.");
    const excerpt = readTextFile(resolve(excerptFile));

    const question = asStringFlag(flags, "question");
    if (!question) throw new Error("Missing --question (research question).");

    const context = asStringFlag(flags, "context") ?? "See excerpt for background.";
    const unified = asBoolFlag(flags, "unified");
    const withMemory = asBoolFlag(flags, "with-memory");
    let memoryAudit: CassMemoryKickoffAudit = null;

    const roleMapRaw = asStringFlag(flags, "role-map")?.trim();
    if (roleMapRaw && unified) {
      throw new Error("Use --role-map only in role-specific mode (omit --unified).");
    }

    const recipientRoles = roleMapRaw ? parseRoleMapFlag(roleMapRaw) : undefined;
    if (recipientRoles) {
      const normalizedMap = new Set(Object.keys(recipientRoles).map((k) => k.trim().toLowerCase()));
      const missing = to.filter((r) => !normalizedMap.has(r.trim().toLowerCase()));
      if (missing.length > 0) {
        throw new Error(`--role-map is missing entries for: ${missing.join(", ")}`);
      }
    }

    // Compose kickoff configuration
    const kickoffConfig: KickoffConfig = {
      threadId,
      researchQuestion: question,
      context,
      excerpt,
      recipients: to,
      recipientRoles,
      initialHypotheses: asStringFlag(flags, "hypotheses"),
      constraints: asStringFlag(flags, "constraints"),
      requestedOutputs: asStringFlag(flags, "outputs"),
      operatorSelection: {
        hypothesis_generator: AGENT_ROLES["Codex"].operators,
        test_designer: AGENT_ROLES["Opus"].operators,
        adversarial_critic: AGENT_ROLES["Gemini"].operators,
      },
    };

    if (withMemory) {
      const memoryResult = await getCassMemoryContext(question, { workspace: projectKey, top: 5, history: 0 });
      const memoryContext = formatCassMemoryContextForKickoff(memoryResult);
      memoryAudit = {
        enabled: true,
        ok: memoryResult.ok,
        injected: Boolean(memoryContext),
        memoryContext: memoryContext ?? null,
        provenance: memoryResult.provenance,
      };
      if (memoryContext) {
        kickoffConfig.memoryContext = memoryContext;
        stderrLine(`Injected MEMORY CONTEXT (cass-memory) via ${memoryResult.provenance.mode}.`);
      } else {
        const details = memoryResult.provenance.errors.join("; ");
        stderrLine(
          `No MEMORY CONTEXT injected (cass-memory ${memoryResult.provenance.mode}${details ? `: ${details}` : ""}).`
        );
      }
    }

    // Ensure project + sender identity exist
    await client.toolsCall("ensure_project", { human_key: projectKey });
    const registerResult = await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol session: ${threadId}`,
    });
    const actualName = parseAgentNameFromToolResult(registerResult);
    if (actualName && actualName !== sender) {
      stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
    }

    if (unified) {
      // Legacy mode: send same message to all recipients
      const templatePath = resolve(asStringFlag(flags, "template") ?? runtimeConfig.defaults.template);
      const body = composePrompt({
        templatePath,
        excerpt,
        memoryContext: kickoffConfig.memoryContext,
        theme: asStringFlag(flags, "theme"),
        domain: asStringFlag(flags, "domain"),
        question,
      });
      const subject = asStringFlag(flags, "subject") ?? `KICKOFF: [${threadId}] ${question.slice(0, 50)}...`;

      const result = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to,
        subject,
        body_md: body,
        thread_id: threadId,
        ack_required: true,
      });
      const payload = isRecord(result) ? { ...result, memory: memoryAudit } : { memory: memoryAudit, send: result };
      stdoutLine(JSON.stringify(payload, null, 2));
    } else {
      // Role-specific mode: each agent gets their role prompt
      const messages = composeKickoffMessages(kickoffConfig);
      const results: Json[] = [];

      for (const msg of messages) {
        stderrLine(`Sending kickoff to ${msg.to} as ${msg.role.displayName}...`);
        const result = await client.toolsCall("send_message", {
          project_key: projectKey,
          sender_name: sender,
          to: [msg.to],
          subject: msg.subject,
          body_md: msg.body,
          thread_id: threadId,
          ack_required: msg.ackRequired,
        });
        results.push(result);
      }

      stdoutLine(
        JSON.stringify(
          { memory: memoryAudit, roster: kickoffConfig.recipientRoles ?? null, sent: results.length, messages: results },
          null,
          2
        )
      );
    }

    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "compile") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const jsonMode = asBoolFlag(flags, "json");
    const outFileRaw = asStringFlag(flags, "out-file") ?? asStringFlag(flags, "out");
    const outFile = outFileRaw ? resolve(outFileRaw) : null;

    const result = await compileSessionArtifact({ client, projectKey, threadId });
    if (!result.ok) {
      if (jsonMode) {
        stdoutLine(JSON.stringify(result, null, 2));
      } else {
        stderrLine(`Failed to compile artifact for thread ${threadId}.`);
        if (result.deltas.total_blocks > 0) {
          stderrLine(
            `Delta blocks: ${result.deltas.valid} valid, ${result.deltas.invalid} invalid (total ${result.deltas.total_blocks}).`
          );
        }
        stderrLine(JSON.stringify({ errors: result.errors, warnings: result.warnings }, null, 2));
      }
      process.exit(1);
    }

    const operatorRecommendations = deriveOperatorRecommendations(result.lint);

    if (outFile) {
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, result.markdown, "utf8");
    }

    if (jsonMode) {
      const payload = outFile
        ? { ...result, out_file: outFile, operator_recommendations: operatorRecommendations }
        : { ...result, operator_recommendations: operatorRecommendations };
      stdoutLine(JSON.stringify(payload, null, 2));
      process.exit(0);
    }

    process.stdout.write(result.markdown);

    if (outFile) {
      stderrLine(`Wrote artifact to ${outFile}.`);
    }

    if (result.deltas.total_blocks > 0) {
      stderrLine(
        `Delta blocks: ${result.deltas.valid} valid, ${result.deltas.invalid} invalid (total ${result.deltas.total_blocks}).`
      );
    }
    if (result.invalid_deltas.length > 0) {
      stderrLine(`Invalid delta blocks (sample):`);
      for (const item of result.invalid_deltas.slice(0, 5)) {
        stderrLine(`- message ${item.message_id}: ${item.subject} → ${item.error}`);
      }
    }

    stderrLine(formatLintReportHuman(result.lint, `artifact v${result.version}`));
    const recText = formatOperatorRecommendationsHuman(operatorRecommendations);
    if (recText) stderrLine(recText);
    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "write") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const jsonMode = asBoolFlag(flags, "json");
    const outFileRaw = asStringFlag(flags, "out-file") ?? asStringFlag(flags, "out");
    const safeThreadId = sanitizeThreadIdForArtifactFilename(threadId);
    const outFile = resolve(outFileRaw ?? join(projectKey, "artifacts", `${safeThreadId}.md`));

    if (!outFileRaw && safeThreadId !== threadId) {
      stderrLine(`Warning: sanitized thread id for artifact filename: "${threadId}" -> "${safeThreadId}"`);
    }

    const result = await compileSessionArtifact({ client, projectKey, threadId });
    if (!result.ok) {
      stdoutLine(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, result.markdown, "utf8");

    if (jsonMode) {
      stdoutLine(
        JSON.stringify({ ...result, out_file: outFile, operator_recommendations: deriveOperatorRecommendations(result.lint) }, null, 2)
      );
    } else {
      stderrLine(`Wrote artifact to ${outFile}.`);
      stderrLine(formatLintReportHuman(result.lint, `artifact v${result.version}`));
      const recText = formatOperatorRecommendationsHuman(deriveOperatorRecommendations(result.lint));
      if (recText) stderrLine(recText);
    }

    process.exit(0);
  }

  if (normalizedTop === "session" && sub === "publish") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
    if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");
    const to = splitCsv(asStringFlag(flags, "to"));
    if (to.length === 0) throw new Error("Missing --to <A,B>.");
    const ackRequired = asBoolFlag(flags, "ack-required");
    const jsonMode = asBoolFlag(flags, "json");

    await client.toolsCall("ensure_project", { human_key: projectKey });
    const registerResult = await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol publish: ${threadId}`,
    });
    const actualName = parseAgentNameFromToolResult(registerResult);
    if (actualName && actualName !== sender) {
      stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
    }

    const compiled = await compileSessionArtifact({ client, projectKey, threadId });
    if (!compiled.ok) {
      stdoutLine(JSON.stringify(compiled, null, 2));
      process.exit(1);
    }

    const subject = asStringFlag(flags, "subject") ?? `COMPILED: v${compiled.version} artifact`;

    const sendResult = await client.toolsCall("send_message", {
      project_key: projectKey,
      sender_name: sender,
      to,
      subject,
      body_md: compiled.markdown,
      thread_id: threadId,
      ack_required: ackRequired,
    });

    const payload = { compiled, send: sendResult, operator_recommendations: deriveOperatorRecommendations(compiled.lint) };
    if (jsonMode) {
      stdoutLine(JSON.stringify(payload, null, 2));
    } else {
      stdoutLine(JSON.stringify(sendResult, null, 2));
      stderrLine(formatLintReportHuman(compiled.lint, `artifact v${compiled.version}`));
      const recText = formatOperatorRecommendationsHuman(deriveOperatorRecommendations(compiled.lint));
      if (recText) stderrLine(recText);
    }

    process.exit(isToolError(sendResult) ? 1 : 0);
  }

  if (normalizedTop === "session" && sub === "nudge") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    let sender = asStringFlag(flags, "sender") ?? process.env.AGENT_NAME;
    if (!sender) throw new Error("Missing --sender (or set AGENT_NAME).");

    const to = splitCsv(asStringFlag(flags, "to"));
    if (to.length === 0) throw new Error("Missing --to <A,B>.");

    const operatorQueryRaw = asStringFlag(flags, "operator")?.trim();
    const ackRequired = asBoolFlag(flags, "ack-required");
    const dryRun = asBoolFlag(flags, "dry-run");
    const jsonMode = asBoolFlag(flags, "json");

    // Ensure project + sender identity exist (before reading thread)
    await client.toolsCall("ensure_project", { human_key: projectKey });
    const registerResult = await client.toolsCall("register_agent", {
      project_key: projectKey,
      name: sender,
      program: "brenner-cli",
      model: "orchestrator",
      task_description: `Brenner Protocol nudge: ${threadId}`,
    });
    const actualName = parseAgentNameFromToolResult(registerResult);
    if (actualName && actualName !== sender) {
      stderrLine(`Agent Mail assigned sender name "${actualName}" (requested "${sender}").`);
      sender = actualName;
    }

    const compiled = await compileSessionArtifact({ client, projectKey, threadId });
    if (!compiled.ok) {
      stdoutLine(JSON.stringify(compiled, null, 2));
      process.exit(1);
    }

    const operatorRecommendations = deriveOperatorRecommendations(compiled.lint);
    const topGap = pickTopLintGap(compiled.lint);

    const operatorQuery =
      operatorQueryRaw ?? (operatorRecommendations[0]?.operators[0] ? operatorRecommendations[0].operators[0] : null);

    if (!operatorQuery) {
      throw new Error(
        "No operator specified and no operator recommendation available for this artifact. Pass --operator <symbol|tag|name>.",
      );
    }

    const operatorCards = loadOperatorCardsFromProject(projectKey);
    const operatorCard = resolveOperatorCard(operatorCards, operatorQuery);
    if (!operatorCard) {
      throw new Error(
        `Unknown operator "${operatorQuery}". Use a symbol (e.g. ⊞), canonical tag (e.g. scale-check), or operator title.`,
      );
    }

    const matchingRecommendation = operatorRecommendations.find((rec) =>
      rec.operators.some((op) => op === operatorQuery || op.startsWith(`${operatorCard.symbol} `) || op === operatorCard.symbol),
    );

    const suggestedRole = matchingRecommendation?.suggested_role ?? null;
    const suggestedDeltaTag = suggestedRole ? ROLE_DELTA_SUBJECT_TAG[suggestedRole] : null;

    const bodyLines: string[] = [];
    bodyLines.push(`# Nudge: Apply ${operatorCard.symbol} ${operatorCard.title}`);
    bodyLines.push("");
    bodyLines.push(`Thread: ${threadId}`);
    bodyLines.push(`Compiled artifact: v${compiled.version} (${compiled.lint.valid ? "lint VALID" : "lint INVALID"})`);
    bodyLines.push("");

    if (topGap) {
      bodyLines.push("## Top lint gap");
      bodyLines.push(`- ID: ${topGap.id}`);
      bodyLines.push(`- Severity: ${topGap.severity}`);
      bodyLines.push(`- Message: ${topGap.message}`);
      if (topGap.fix) bodyLines.push(`- Fix: ${topGap.fix}`);
      bodyLines.push("");
    }

    bodyLines.push("## Operator module (copy/paste)");
    if (operatorCard.promptModule) {
      bodyLines.push("```text");
      bodyLines.push(operatorCard.promptModule.trim());
      bodyLines.push("```");
    } else {
      bodyLines.push("_No prompt module found in the operator library for this operator._");
    }
    bodyLines.push("");

    bodyLines.push("## Instructions");
    if (suggestedRole && suggestedDeltaTag) {
      bodyLines.push(`- Suggested role: ${suggestedRole} (reply with subject \`DELTA[${suggestedDeltaTag}]: <description>\`).`);
    } else {
      bodyLines.push("- Reply in-thread with subject `DELTA[role]: <description>` and include your delta blocks.");
    }
    bodyLines.push("- Close the lint gap directly; say which operator you applied and what changed.");
    bodyLines.push("");

    const subject = `NUDGE: [${threadId}] ${operatorCard.symbol} ${operatorCard.title}`;
    const bodyMd = bodyLines.join("\n");

    if (dryRun) {
      const payload = {
        ok: true,
        dry_run: true,
        threadId,
        compiled_version: compiled.version,
        operator: {
          query: operatorQuery,
          resolved: {
            kind: operatorCard.kind,
            symbol: operatorCard.symbol,
            title: operatorCard.title,
            canonicalTag: operatorCard.canonicalTag,
          },
        },
        top_lint_gap: topGap ?? null,
        operator_recommendations: operatorRecommendations,
        message: { to, subject, body_md: bodyMd },
      };

      if (jsonMode) {
        stdoutLine(JSON.stringify(payload, null, 2));
      } else {
        stderrLine(`Dry run: would send nudge to ${to.join(", ")}.`);
        stdoutLine(bodyMd);
      }

      process.exit(0);
    }

    const sendResult = await client.toolsCall("send_message", {
      project_key: projectKey,
      sender_name: sender,
      to,
      subject,
      body_md: bodyMd,
      thread_id: threadId,
      ack_required: ackRequired,
    });

    const payload = {
      ok: true,
      threadId,
      compiled_version: compiled.version,
      operator: {
        query: operatorQuery,
        resolved: {
          kind: operatorCard.kind,
          symbol: operatorCard.symbol,
          title: operatorCard.title,
          canonicalTag: operatorCard.canonicalTag,
        },
      },
      top_lint_gap: topGap ?? null,
      operator_recommendations: operatorRecommendations,
      send: sendResult,
    };

    if (jsonMode) {
      stdoutLine(JSON.stringify(payload, null, 2));
    } else {
      stdoutLine(JSON.stringify(sendResult, null, 2));
      stderrLine(`Sent nudge: ${operatorCard.symbol} ${operatorCard.title} → ${to.join(", ")}`);
      if (topGap) stderrLine(`Top lint gap: ${topGap.id} (${topGap.severity})`);
    }

    process.exit(isToolError(sendResult) ? 1 : 0);
  }

  if (normalizedTop === "session" && sub === "status") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    if (!threadId) throw new Error("Missing --thread-id.");

    const watch = asBoolFlag(flags, "watch");
    const timeoutSeconds = asIntFlag(flags, "timeout") ?? 900;
    if (timeoutSeconds <= 0) throw new Error(`Invalid --timeout: expected > 0 seconds, got ${timeoutSeconds}`);

    const timeoutMs = timeoutSeconds * 1000;
    const startMs = Date.now();

    const fetchStatus = async () => {
      const thread = await client.readThread({ projectKey, threadId, includeBodies: false });
      return computeThreadStatusFromThread(thread);
    };

    let status = await fetchStatus();
    process.stdout.write(formatThreadStatusSummary(status) + "\n");

    if (!watch) {
      process.exit(status.isComplete ? 0 : 1);
    }

    let delayMs = 2000;
    let lastPrintedKey = JSON.stringify({
      phase: status.phase,
      roles: Object.fromEntries(Object.entries(status.roles).map(([role, s]) => [role, s.completed])),
      pendingAcks: status.acks.pendingCount,
      artifactVersion: status.latestArtifact?.version ?? null,
    });

    while (!status.isComplete) {
      if (Date.now() - startMs > timeoutMs) {
        stderrLine(`Timed out after ${timeoutSeconds}s waiting for roles to complete in thread ${threadId}.`);
        process.exit(2);
      }

      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(Math.round(delayMs * 1.5), 60_000);

      status = await fetchStatus();
      const key = JSON.stringify({
        phase: status.phase,
        roles: Object.fromEntries(Object.entries(status.roles).map(([role, s]) => [role, s.completed])),
        pendingAcks: status.acks.pendingCount,
        artifactVersion: status.latestArtifact?.version ?? null,
      });

      if (key !== lastPrintedKey) {
        process.stdout.write("\n" + formatThreadStatusSummary(status) + "\n");
        lastPrintedKey = key;
      }
    }

    process.exit(0);
  }

  // ----------------------------------------------------------------------------
  // session diagnose
  // ----------------------------------------------------------------------------
  if (normalizedTop === "session" && sub === "diagnose") {
    const client = new AgentMailClient(runtimeConfig.agentMail);
    const projectKey = resolve(asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey);
    const threadId = asStringFlag(flags, "thread-id");
    const jsonMode = asBoolFlag(flags, "json");

    if (!threadId) {
      throw new Error("Missing required --thread-id flag. Usage: brenner session diagnose --thread-id <id>");
    }

    const result = await diagnoseSessionDeltas({ client, projectKey, threadId });

    if (jsonMode) {
      stdoutLine(JSON.stringify({ ok: true, ...result }, null, 2));
    } else {
      stdoutLine(`\n═══════════════════════════════════════════════════════════`);
      stdoutLine(`  SESSION DIAGNOSE: ${result.threadId}`);
      stdoutLine(`═══════════════════════════════════════════════════════════\n`);

      stdoutLine(`Messages: ${result.messageCount} total, ${result.deltaMessageCount} DELTA`);
      stdoutLine(`Summary:  ${result.summary.healthy} healthy, ${result.summary.issues} with issues`);
      stdoutLine(`Deltas:   ${result.deltas.valid}/${result.deltas.total_blocks} valid blocks\n`);

      if (result.messages.length > 0) {
        stdoutLine(`DELTA Message Analysis:`);
        stdoutLine(`───────────────────────────────────────────────────────────`);
        for (const msg of result.messages) {
          const statusIcon = msg.status === "ok" ? "✓" : msg.status === "error" ? "✗" : "⚠";
          const statusColor = msg.status === "ok" ? "32" : msg.status === "error" ? "31" : "33";
          stdoutLine(`\x1b[${statusColor}m${statusIcon}\x1b[0m [${msg.id}] ${msg.from}: ${msg.subject}`);
          stdoutLine(`  Blocks: ${msg.valid_blocks}/${msg.delta_blocks} valid`);
          if (msg.issues.length > 0) {
            for (const issue of msg.issues) {
              stdoutLine(`  \x1b[31m→ ${issue}\x1b[0m`);
            }
          }
        }
        stdoutLine(`───────────────────────────────────────────────────────────`);
      }

      if (result.summary.issues > 0) {
        stdoutLine(`\nRemediation Template (copy this format):`);
        stdoutLine(result.remediation_template);
      } else {
        stdoutLine(`\n\x1b[32mAll DELTA messages are healthy!\x1b[0m`);
      }
    }

    process.exit(result.summary.issues > 0 ? 1 : 0);
  }

  // ============================================================================
  // Score Command
  // ============================================================================
  if (top === "score") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const allSessions = asBoolFlag(flags, "all");
    const sessionId = sub; // First positional after "score" is session ID

    // Helper to format dimension score for human output
    function formatDimensionScore(d: DimensionScore): string {
      const bar = "█".repeat(Math.round(d.percentage / 10)) + "░".repeat(10 - Math.round(d.percentage / 10));
      return `${d.dimension.padEnd(28)} ${bar} ${d.points}/${d.maxPoints} (${d.percentage}%)`;
    }

    // Score a single session
    if (sessionId && !allSessions) {
      const sessionData = await buildSessionDataFromStorage(sessionId, projectKey);
      const result = scoreSession(sessionData);

      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, score: result }, null, 2));
      } else {
        stdoutLine(`\n═══════════════════════════════════════════════════════════`);
        stdoutLine(`  SESSION SCORECARD: ${result.sessionId}`);
        stdoutLine(`═══════════════════════════════════════════════════════════\n`);

        stdoutLine(`Grade: ${result.grade}  (${result.totalScore}/${result.maxScore} points)\n`);

        stdoutLine(`Dimension Breakdown:`);
        stdoutLine(`───────────────────────────────────────────────────────────`);
        stdoutLine(formatDimensionScore(result.dimensions.paradoxGrounding));
        stdoutLine(formatDimensionScore(result.dimensions.hypothesisKillRate));
        stdoutLine(formatDimensionScore(result.dimensions.testDiscriminability));
        stdoutLine(formatDimensionScore(result.dimensions.assumptionTracking));
        stdoutLine(formatDimensionScore(result.dimensions.thirdAlternativeDiscovery));
        stdoutLine(formatDimensionScore(result.dimensions.experimentalFeasibility));
        stdoutLine(formatDimensionScore(result.dimensions.adversarialPressure));
        stdoutLine(`───────────────────────────────────────────────────────────\n`);

        stdoutLine(`Scored at: ${result.scoredAt}`);
      }
      process.exit(0);
    }

    // Score all sessions
    if (allSessions) {
      const hypothesisStorage = new HypothesisStorage({ baseDir: projectKey });
      const testStorage = new TestStorage({ baseDir: projectKey });

      // Get all session IDs from both storages
      const hypothesisSessions = await hypothesisStorage.listSessions();
      const testSessions = await testStorage.listSessions();
      const allSessionIds = [...new Set([...hypothesisSessions, ...testSessions])];

      if (allSessionIds.length === 0) {
        if (jsonMode) {
          stdoutLine(JSON.stringify({ ok: true, sessions: [], message: "No sessions found" }, null, 2));
        } else {
          stdoutLine("No sessions found in storage.");
        }
        process.exit(0);
      }

      const results: Array<{ sessionId: string; score: SessionDimensionScore }> = [];

      for (const sid of allSessionIds) {
        const sessionData = await buildSessionDataFromStorage(sid, projectKey);
        const result = scoreSession(sessionData);
        results.push({ sessionId: sid, score: result });
      }

      // Sort by total score descending
      results.sort((a, b) => b.score.totalScore - a.score.totalScore);

      if (jsonMode) {
        stdoutLine(JSON.stringify({
          ok: true,
          count: results.length,
          sessions: results,
        }, null, 2));
      } else {
        stdoutLine(`\n═══════════════════════════════════════════════════════════`);
        stdoutLine(`  ALL SESSIONS SCORECARD`);
        stdoutLine(`═══════════════════════════════════════════════════════════\n`);

        stdoutLine(`${"Rank".padEnd(6)} ${"Session".padEnd(30)} ${"Grade".padEnd(6)} ${"Score".padEnd(10)}`);
        stdoutLine(`───────────────────────────────────────────────────────────`);

        results.forEach((r, idx) => {
          const rank = `#${idx + 1}`.padEnd(6);
          const session = r.sessionId.padEnd(30);
          const grade = r.score.grade.padEnd(6);
          const score = `${r.score.totalScore}/${r.score.maxScore}`;
          stdoutLine(`${rank} ${session} ${grade} ${score}`);
        });

        stdoutLine(`───────────────────────────────────────────────────────────`);
        const avgScore = results.reduce((sum, r) => sum + r.score.totalScore, 0) / results.length;
        stdoutLine(`\nAverage score: ${avgScore.toFixed(1)} points across ${results.length} sessions`);
      }
      process.exit(0);
    }

    throw new Error("Usage: brenner score <session-id> [--json] or brenner score --all [--json]");
  }

  // ============================================================================
  // Feedback Command
  // ============================================================================
  if (top === "feedback") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const sessionId = sub;

    if (!sessionId) {
      throw new Error("Usage: brenner feedback <session-id> [--json]");
    }

    const sessionData = await buildSessionDataFromStorage(sessionId, projectKey);
    const result = scoreSession(sessionData);

    // Generate feedback based on low-scoring dimensions
    interface FeedbackItem {
      dimension: string;
      score: number;
      maxScore: number;
      suggestion: string;
      brennerQuote?: string;
    }

    const feedback: FeedbackItem[] = [];

    // Check each dimension and generate feedback for low scores
    const dimensions = [
      { key: "paradoxGrounding", name: "Paradox Grounding", threshold: 10 },
      { key: "hypothesisKillRate", name: "Hypothesis Kill Rate", threshold: 10, quoteKey: "theoryKillJustification" },
      { key: "testDiscriminability", name: "Test Discriminability", threshold: 10, quoteKey: "discriminativePower" },
      { key: "assumptionTracking", name: "Assumption Tracking", threshold: 8, quoteKey: "scaleCheckRigor" },
      { key: "thirdAlternativeDiscovery", name: "Third Alternative Discovery", threshold: 8, quoteKey: "thirdAlternativePresence" },
      { key: "experimentalFeasibility", name: "Experimental Feasibility", threshold: 5 },
      { key: "adversarialPressure", name: "Adversarial Pressure", threshold: 10, quoteKey: "anomalyQuarantineDiscipline" },
    ] as const;

    for (const dim of dimensions) {
      const d = result.dimensions[dim.key];
      if (d.points < dim.threshold) {
        const suggestions: Record<string, string> = {
          paradoxGrounding: "Start with a genuine puzzle or paradox. Identify surprising observations that challenge existing paradigm.",
          hypothesisKillRate: "Actively try to refute hypotheses. Link kills to specific test results with documented reasoning.",
          testDiscriminability: "Design tests that produce different outcomes for different hypotheses. Include potency checks for all tests.",
          assumptionTracking: "Record assumptions explicitly. Link them to hypotheses and include scale/physics checks with calculations.",
          thirdAlternativeDiscovery: "Add a genuine third alternative that proposes a different causal structure, not a blend.",
          experimentalFeasibility: "Add feasibility assessments to tests. Execute tests to move from design to results.",
          adversarialPressure: "Log critiques with evidence. Propose real third alternatives from critique.",
        };

        feedback.push({
          dimension: dim.name,
          score: d.points,
          maxScore: d.maxPoints,
          suggestion: suggestions[dim.key] ?? "Improve this dimension.",
          brennerQuote: dim.quoteKey ? BRENNER_QUOTES[dim.quoteKey] : undefined,
        });
      }
    }

    if (jsonMode) {
      stdoutLine(JSON.stringify({
        ok: true,
        sessionId,
        grade: result.grade,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        feedback,
      }, null, 2));
    } else {
      stdoutLine(`\n═══════════════════════════════════════════════════════════`);
      stdoutLine(`  IMPROVEMENT FEEDBACK: ${sessionId}`);
      stdoutLine(`═══════════════════════════════════════════════════════════\n`);

      stdoutLine(`Current Grade: ${result.grade} (${result.totalScore}/${result.maxScore})\n`);

      if (feedback.length === 0) {
        stdoutLine(`Excellent work! All dimensions are above threshold.\n`);
      } else {
        stdoutLine(`Areas for Improvement (${feedback.length}):`);
        stdoutLine(`───────────────────────────────────────────────────────────`);

        for (const f of feedback) {
          stdoutLine(`\n▶ ${f.dimension} (${f.score}/${f.maxScore})`);
          stdoutLine(`  ${f.suggestion}`);
          if (f.brennerQuote) {
            stdoutLine(`  💬 "${f.brennerQuote}"`);
          }
        }
        stdoutLine(``);
      }
    }
    process.exit(0);
  }

  // ============================================================================
  // Leaderboard Command
  // ============================================================================
  if (top === "leaderboard") {
    const jsonMode = asBoolFlag(flags, "json");
    const projectKey = asStringFlag(flags, "project-key") ?? runtimeConfig.defaults.projectKey;
    const limit = asIntFlag(flags, "limit") ?? 10;

    // Get all session IDs from storage
    const hypothesisStorage = new HypothesisStorage({ baseDir: projectKey });
    const testStorage = new TestStorage({ baseDir: projectKey });
    const hypothesisSessions = await hypothesisStorage.listSessions();
    const testSessions = await testStorage.listSessions();
    const allSessionIds = [...new Set([...hypothesisSessions, ...testSessions])];

    if (allSessionIds.length === 0) {
      if (jsonMode) {
        stdoutLine(JSON.stringify({ ok: true, leaderboard: [], message: "No sessions found" }, null, 2));
      } else {
        stdoutLine("No sessions found in storage.");
      }
      process.exit(0);
    }

    const results: Array<{
      rank: number;
      sessionId: string;
      grade: string;
      totalScore: number;
      maxScore: number;
      percentage: number;
    }> = [];

    for (const sid of allSessionIds) {
      const sessionData = await buildSessionDataFromStorage(sid, projectKey);
      const score = scoreSession(sessionData);

      results.push({
        rank: 0, // Will be set after sorting
        sessionId: sid,
        grade: score.grade,
        totalScore: score.totalScore,
        maxScore: score.maxScore,
        percentage: score.maxScore === 0 ? 0 : Math.round((score.totalScore / score.maxScore) * 100),
      });
    }

    // Sort by score descending and assign ranks
    results.sort((a, b) => b.totalScore - a.totalScore);
    results.forEach((r, idx) => { r.rank = idx + 1; });

    const topResults = results.slice(0, limit);

    if (jsonMode) {
      stdoutLine(JSON.stringify({
        ok: true,
        totalSessions: results.length,
        showing: topResults.length,
        leaderboard: topResults,
      }, null, 2));
    } else {
      stdoutLine(`\n═══════════════════════════════════════════════════════════`);
      stdoutLine(`  🏆 SESSION LEADERBOARD`);
      stdoutLine(`═══════════════════════════════════════════════════════════\n`);

      stdoutLine(`${"Rank".padEnd(6)} ${"Session".padEnd(30)} ${"Grade".padEnd(6)} ${"Score".padEnd(12)} ${"Pct"}`);
      stdoutLine(`───────────────────────────────────────────────────────────`);

      for (const r of topResults) {
        const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "  ";
        const rank = `${medal}${r.rank}`.padEnd(6);
        const session = r.sessionId.slice(0, 28).padEnd(30);
        const grade = r.grade.padEnd(6);
        const score = `${r.totalScore}/${r.maxScore}`.padEnd(12);
        stdoutLine(`${rank} ${session} ${grade} ${score} ${r.percentage}%`);
      }

      stdoutLine(`───────────────────────────────────────────────────────────`);
      stdoutLine(`\nShowing top ${topResults.length} of ${results.length} sessions`);
    }
    process.exit(0);
  }

  // ============================================================================
  // Session Robot-Step Command — single round execution for HITL orchestration
  // ============================================================================
  if (normalizedTop === "session" && sub === "robot-step") {
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
    const geminiBin = asStringFlag(flags, "gemini-bin") ?? process.env.BRENNER_GEMINI_BIN ?? "gemini";

    const augmentedPath = `${homedir()}/.local/bin:/usr/local/bin:${process.env.PATH ?? ""}`;

    // Agent configuration (same as session robot)
    type RobotAgent = {
      name: string;
      slug: string;
      role: { role: string; displayName: string; description: string };
      bin: string;
      buildArgs: (prompt: string, outFile: string) => string[];
      buildEnv: () => Record<string, string | undefined>;
      readOutput: (stdout: string, outFile: string) => string;
    };

    const ROLE_CONFIGS: Record<string, { role: string; displayName: string; description: string }> = {
      claude: { role: "test_designer", displayName: "Test Designer", description: "Design discriminative tests that kill hypotheses. Score experiments by evidence-per-week." },
      codex: { role: "hypothesis_generator", displayName: "Hypothesis Generator", description: "Generate hypotheses, hunt paradoxes, import cross-domain patterns. Always include a third alternative." },
      gemini: { role: "adversarial_critic", displayName: "Adversarial Critic", description: "Attack the framing, run scale checks, quarantine anomalies, kill theories that go ugly." },
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
        bin: geminiBin,
        role: ROLE_CONFIGS.gemini,
        buildArgs: (prompt: string, _outFile: string) => [
          "--sandbox", "--output-format", "text", "-p", prompt,
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
    // Prompt builders (same as session robot but with operator notes)
    // -------------------------------------------------------------------
    function buildRound1PromptStep(agent: RobotAgent): string {
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

      parts.push(buildDeltaFormatInstructionsStep());
      return parts.join("\n");
    }

    function buildRoundNPromptStep(agent: RobotAgent, art: Artifact, r: number, operatorNotes: string): string {
      const kernel = getTriangulatedBrennerKernelMarkdown();
      const roleSection = getRolePromptMarkdown(agent.role.role);
      const artifactMd = renderArtifactMarkdown(art);

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

      // Round-specific instructions
      if (r === 2) {
        parts.push(`## Round ${r} Instructions\n`);
        parts.push(`Review other agents' findings from the previous round (in the artifact below).`);
        parts.push(`Make your first kill attempts — identify weak hypotheses and KILL them with explicit reasons.`);
        parts.push(`You may ADD refinements, but kills are the priority.\n`);
      } else {
        parts.push(`## Round ${r} Instructions (Convergence)\n`);
        parts.push(`KILLS MUST EXCEED ADDS. Provide final verdicts on all surviving hypotheses.`);
        parts.push(`Kill any hypothesis that cannot withstand scrutiny. Fewer strong beats more weak.\n`);
      }

      // Operator notes from previous round
      if (operatorNotes.trim()) {
        parts.push(`## Operator Notes (from previous round)\n\nThe human operator reviewed the previous round and provided the following corrections and guidance. Treat these as ground truth — they override any agent assumptions.\n\n${operatorNotes}\n`);
      }

      parts.push(`## Current Artifact (v${art.metadata.version})\n\n${artifactMd}\n`);
      parts.push(buildDeltaFormatInstructionsStep());
      return parts.join("\n");
    }

    // -------------------------------------------------------------------
    // Agent invocation (same as session robot)
    // -------------------------------------------------------------------
    async function invokeAgentStep(agent: RobotAgent, prompt: string, roundDir: string): Promise<string> {
      const outFile = join(roundDir, `${agent.slug}_out.md`);

      // Write prompt to file
      writeFileSync(join(roundDir, `${agent.slug}_prompt.md`), prompt);

      stderrLine(`  -> Invoking ${agent.name} (${agent.role.displayName})...`);

      return new Promise<string>((resolve) => {
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
          stderrLine(`  [!] ${agent.name} timed out after 5 minutes`);
          child.kill("SIGTERM");
          // Escalate to SIGKILL after 10s
          const killTimeout = setTimeout(() => { child.kill("SIGKILL"); }, 10_000);
          child.on("exit", () => clearTimeout(killTimeout));
        }, 300_000);

        child.on("error", (err) => {
          clearTimeout(timeout);
          stderrLine(`  [!] ${agent.name} failed to launch: ${err.message}`);
          resolve("");
        });

        child.on("exit", (code) => {
          clearTimeout(timeout);
          const output = agent.readOutput(stdout, outFile);
          const deltaCount = (output.match(/```(?:delta|json\s+brenner-delta)/g) ?? []).length;
          if (output.trim()) {
            stderrLine(`  [ok] ${agent.name} done (${deltaCount} delta blocks)`);
            // Show first few deltas as preview
            const lines = output.split("\n");
            for (const line of lines.slice(0, 20)) {
              if (line.includes("[delta]") || line.startsWith("```delta") || line.startsWith("```json")) {
                stderrLine(`       ${line.slice(0, 80)}`);
              }
            }
          } else {
            stderrLine(`  [!] ${agent.name}: no output (exit code ${code})`);
          }

          // Write output to file
          writeFileSync(outFile, output);
          resolve(output);
        });
      });
    }

    // -------------------------------------------------------------------
    // Shared utilities (duplicated from session robot scope)
    // -------------------------------------------------------------------
    function buildDeltaFormatInstructionsStep(): string {
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

    function parseAgentDeltasStep(
      agentName: string,
      output: string,
      timestamp: string,
    ): Array<ValidDelta & { timestamp: string; agent: string }> {
      const deltas = extractValidDeltas(output);
      return deltas.map((d) => ({ ...d, timestamp, agent: agentName }));
    }

    function checkConvergenceStep(
      roundDeltas: Array<ValidDelta & { timestamp: string; agent: string }>,
      r: number,
      art: Artifact,
    ): { converged: boolean; reason: string } {
      const a = roundDeltas.filter((d) => d.operation === "ADD").length;
      const k = roundDeltas.filter((d) => d.operation === "KILL").length;

      if (r === 1) {
        return { converged: false, reason: `Round 1: ${a} adds, ${k} kills` };
      }

      const active = (art.sections.hypothesis_slate as any[])
        .filter((h: any) => !h.killed).length;

      if (k > 0 && k >= a) {
        return {
          converged: true,
          reason: `Kill-rate (${k}) >= add-rate (${a}), ${active} active hypotheses remain`,
        };
      }

      if (roundDeltas.length === 0) {
        return { converged: true, reason: "No deltas produced — agents have converged" };
      }

      return {
        converged: false,
        reason: `Adds (${a}) > Kills (${k}), ${active} active hypotheses`,
      };
    }

    // -------------------------------------------------------------------
    // Execute one round
    // -------------------------------------------------------------------
    stderrLine(`\n========================================`);
    stderrLine(`  Brenner Robot Step — Round ${round}`);
    stderrLine(`========================================`);
    stderrLine(`Session:  ${sessionId}`);
    stderrLine(`Question: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}`);
    stderrLine(`Agents:   BlueLake (${claudeBin}), RedForest (${codexBin}), GreenMountain (${geminiBin})`);
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
    }

    // Read operator notes from previous round (if any)
    let operatorNotes = "";
    if (round > 1) {
      const notesFile = join(sessionDir, `operator_notes_round_${round - 1}.md`);
      if (existsSync(notesFile)) {
        operatorNotes = readFileSync(notesFile, "utf-8");
        stderrLine(`  Loaded operator notes from round ${round - 1}\n`);
      }
    }

    const roundDir = join(sessionDir, `round_${round}`);
    if (!existsSync(roundDir)) mkdirSync(roundDir, { recursive: true });

    // Build prompts
    const prompts = new Map<RobotAgent, string>();
    for (const agent of agents) {
      const prompt = round === 1
        ? buildRound1PromptStep(agent)
        : buildRoundNPromptStep(agent, artifact, round, operatorNotes);
      prompts.set(agent, prompt);
    }

    // Invoke agents
    const outputs = new Map<RobotAgent, string>();
    if (sequential) {
      for (const agent of agents) {
        const prompt = prompts.get(agent)!;
        const output = await invokeAgentStep(agent, prompt, roundDir);
        outputs.set(agent, output);
      }
    } else {
      const results = await Promise.allSettled(
        agents.map(async (agent) => {
          const prompt = prompts.get(agent)!;
          const output = await invokeAgentStep(agent, prompt, roundDir);
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
    for (const agent of agents) {
      const output = outputs.get(agent) ?? "";
      if (!output.trim()) {
        stderrLine(`  [!] ${agent.name}: no output`);
        continue;
      }
      const agentDeltas = parseAgentDeltasStep(agent.name, output, ts);
      stderrLine(`  ${agent.name}: ${agentDeltas.length} valid deltas`);
      allRoundDeltas.push(...agentDeltas);
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
    const convergence = checkConvergenceStep(allRoundDeltas, round, artifact);

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
      ok: true,
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
    }, null, 2));

    process.exit(0);
  }

  // Session Robot Command — fully automated multi-agent, no Agent Mail
  // ============================================================================
  if (normalizedTop === "session" && sub === "robot") {
    const sessionDirRaw = asStringFlag(flags, "session-dir");
    if (!sessionDirRaw) throw new Error("Missing --session-dir.");
    const sessionDir = resolve(sessionDirRaw);

    const question = asStringFlag(flags, "question");
    if (!question) throw new Error("Missing --question.");

    const contextFile = asStringFlag(flags, "context-file") ?? join(sessionDir, "context.md");
    const excerptFile = asStringFlag(flags, "excerpt-file") ?? join(sessionDir, "excerpt.md");
    const maxRounds = asIntFlag(flags, "max-rounds") ?? 5;
    const sequential = asBoolFlag(flags, "sequential");
    const stepMode = asBoolFlag(flags, "step");
    const operatorNotesFile = asStringFlag(flags, "operator-notes");
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
    const geminiBin = resolveAgentBin("gemini-bin", "BRENNER_GEMINI_BIN", "gemini");

    // Augment PATH for agent binaries in common locations
    const localBin = join(homedir(), ".local", "bin");
    const robotPath = [localBin, "/usr/local/bin", process.env.PATH ?? ""].filter(Boolean).join(":");

    // Agent roster: three agents with incompatible mandates
    interface RobotAgent {
      name: string;
      slug: string;
      role: RoleConfig;
      bin: string;
      buildArgs: (prompt: string, outFile: string) => string[];
      buildEnv: () => Record<string, string | undefined>;
      readOutput: (stdout: string, outFile: string) => string;
    }

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
        bin: geminiBin,
        buildArgs: (prompt: string) => [
          "--yolo", "--output-format", "text", "-p", prompt,
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
    // Build initial Round 1 prompt for an agent
    // -------------------------------------------------------------------
    function buildRound1Prompt(agent: RobotAgent): string {
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

    // -------------------------------------------------------------------
    // Build Round 2+ prompt for an agent given current artifact
    // -------------------------------------------------------------------
    function buildRoundNPrompt(agent: RobotAgent, artifact: Artifact, round: number, opNotes?: string): string {
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

      if (opNotes) {
        parts.push(`## Operator Corrections (CRITICAL — Read Carefully)\n\n${opNotes}\n`);
        parts.push(`Integrate the operator's corrections above into your analysis. They override prior assumptions.\n`);
      }

      parts.push(`## Current Artifact (v${artifact.metadata.version})\n\n${artifactMd}\n`);

      parts.push(buildDeltaFormatInstructions());

      return parts.join("\n");
    }

    // -------------------------------------------------------------------
    // Delta format instructions (shared across rounds)
    // -------------------------------------------------------------------
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

    // -------------------------------------------------------------------
    // Invoke a single agent as a subprocess, returns its text output
    // -------------------------------------------------------------------
    const AGENT_TIMEOUT_MS = 300_000; // 5 minutes per agent

    function invokeAgent(agent: RobotAgent, prompt: string, roundDir: string): Promise<string> {
      const promptFile = join(roundDir, `${agent.slug}_prompt.md`);
      const outFile = join(roundDir, `${agent.slug}_out.md`);
      writeFileSync(promptFile, prompt);

      stderrLine(`  -> Invoking ${agent.name} (${agent.role.displayName})...`);

      return new Promise<string>((resolve, reject) => {
        const args = agent.buildArgs(prompt, outFile);
        const env = agent.buildEnv();

        const child = spawn(agent.bin, args, {
          env,
          stdio: ["ignore", "pipe", "pipe"],
          cwd: sessionDir,
        });

        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        child.stdout?.on("data", (d: Buffer) => stdoutChunks.push(d));
        child.stderr?.on("data", (d: Buffer) => stderrChunks.push(d));

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

        let killTimer: ReturnType<typeof setTimeout> | undefined;
        const timer = setTimeout(() => {
          child.kill("SIGTERM");
          stderrLine(`  [!] ${agent.name} timed out after ${AGENT_TIMEOUT_MS / 1000}s, sending SIGTERM`);
          // Escalate to SIGKILL if process doesn't exit within 10 seconds
          killTimer = setTimeout(() => {
            child.kill("SIGKILL");
            stderrLine(`  [!] ${agent.name} did not exit after SIGTERM, sending SIGKILL`);
          }, 10_000);
        }, AGENT_TIMEOUT_MS);

        child.on("close", (code: number | null) => {
          clearTimeout(timer);
          if (killTimer) clearTimeout(killTimer);

          const stdout = Buffer.concat(stdoutChunks).toString();
          const output = agent.readOutput(stdout, outFile);

          if (code !== 0 && code !== null) {
            stderrLine(`  [!] ${agent.name} exited with code ${code}`);
          }

          writeFileSync(outFile, output);

          // Show a brief preview so the operator can follow along
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

    // -------------------------------------------------------------------
    // Parse deltas from agent output and attach metadata
    // -------------------------------------------------------------------
    function parseAgentDeltas(
      agentName: string,
      output: string,
      timestamp: string,
    ): Array<ValidDelta & { timestamp: string; agent: string }> {
      const deltas = extractValidDeltas(output);
      return deltas.map((d) => ({ ...d, timestamp, agent: agentName }));
    }

    // -------------------------------------------------------------------
    // Check convergence: kills >= adds in this round, or hit max rounds
    // -------------------------------------------------------------------
    function checkConvergence(
      roundDeltas: Array<ValidDelta & { timestamp: string; agent: string }>,
      round: number,
      artifact: Artifact,
    ): { converged: boolean; reason: string } {
      if (round >= maxRounds) {
        return { converged: true, reason: `Reached maximum rounds (${maxRounds})` };
      }

      const adds = roundDeltas.filter((d) => d.operation === "ADD").length;
      const kills = roundDeltas.filter((d) => d.operation === "KILL").length;

      // Round 1 never converges (agents are still generating initial hypotheses)
      if (round === 1) {
        return { converged: false, reason: `Round 1: ${adds} adds, ${kills} kills` };
      }

      // Count active hypotheses
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

    // -------------------------------------------------------------------
    // Main session loop
    // -------------------------------------------------------------------
    // Read operator notes if provided
    if (operatorNotesFile && !existsSync(operatorNotesFile)) {
      stderrLine(`  [!] Operator notes file not found: ${operatorNotesFile}`);
    }
    const operatorNotes = operatorNotesFile && existsSync(operatorNotesFile)
      ? readFileSync(operatorNotesFile, "utf8").trim()
      : undefined;

    stderrLine(`\n========================================`);
    stderrLine(`  Brenner Robot Mode${stepMode ? " (STEP)" : ""}`);
    stderrLine(`========================================`);
    stderrLine(`Session:    ${sessionId}`);
    stderrLine(`Question:   ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}`);
    stderrLine(`Max rounds: ${stepMode ? "1 (step mode)" : String(maxRounds)}`);
    stderrLine(`Agents:     BlueLake (${claudeBin}), RedForest (${codexBin}), GreenMountain (${geminiBin})`);
    stderrLine(`Mode:       ${sequential ? "sequential" : "parallel"}${stepMode ? " | HITL step" : ""}`);
    if (operatorNotes) stderrLine(`Operator:   ${operatorNotes.length} chars of corrections injected`);
    stderrLine(`========================================\n`);

    // In step mode, resume from prior state if it exists
    let artifact = createEmptyArtifact(sessionId);
    let startRound = 1;
    const stateFile = join(sessionDir, "session_state.json");
    const robotFile = join(sessionDir, "robot_session.json");

    if (stepMode && existsSync(stateFile) && existsSync(robotFile)) {
      try {
        artifact = JSON.parse(readFileSync(stateFile, "utf8"));
        const priorState = JSON.parse(readFileSync(robotFile, "utf8"));
        startRound = (priorState.rounds?.length ?? 0) + 1;
        stderrLine(`  Resuming from round ${startRound} (artifact v${artifact.metadata.version})\n`);
      } catch {
        stderrLine(`  [!] Could not parse prior state, starting fresh\n`);
      }
    }

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

    // Reload prior rounds into sessionState if resuming
    if (startRound > 1 && existsSync(robotFile)) {
      try {
        const priorState = JSON.parse(readFileSync(robotFile, "utf8"));
        sessionState.rounds = priorState.rounds ?? [];
      } catch { /* start fresh */ }
    }

    const effectiveMaxRounds = stepMode ? startRound : maxRounds;
    for (let round = startRound; round <= effectiveMaxRounds; round++) {
      stderrLine(`--- Round ${round} of ${maxRounds} ---\n`);

      const roundDir = join(sessionDir, `round_${round}`);
      if (!existsSync(roundDir)) mkdirSync(roundDir, { recursive: true });

      // Build prompts
      const prompts = new Map<RobotAgent, string>();
      for (const agent of agents) {
        const prompt = round === 1
          ? buildRound1Prompt(agent)
          : buildRoundNPrompt(agent, artifact, round, operatorNotes);
        prompts.set(agent, prompt);
      }

      // Invoke agents (parallel or sequential)
      const outputs = new Map<RobotAgent, string>();
      if (sequential) {
        for (const agent of agents) {
          const prompt = prompts.get(agent)!;
          const output = await invokeAgent(agent, prompt, roundDir);
          outputs.set(agent, output);
        }
      } else {
        const results = await Promise.allSettled(
          agents.map(async (agent) => {
            const prompt = prompts.get(agent)!;
            const output = await invokeAgent(agent, prompt, roundDir);
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
        const agentDeltas = parseAgentDeltas(agent.name, output, ts);
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
      const convergence = checkConvergence(allRoundDeltas, round, artifact);

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

  // ============================================================================
  // Session Robot-Stress — adversarial stress test on survivors
  // ============================================================================
  if (normalizedTop === "session" && sub === "robot-stress") {
    const sessionDirRaw = asStringFlag(flags, "session-dir");
    if (!sessionDirRaw) throw new Error("Missing --session-dir.");
    const sessionDir = resolve(sessionDirRaw);
    const operatorContext = asStringFlag(flags, "operator-context") ?? "";
    const jsonMode = asBoolFlag(flags, "json");

    const stateFile = join(sessionDir, "session_state.json");
    if (!existsSync(stateFile)) {
      throw new Error(`No session_state.json found in ${sessionDir}. Run 'session robot' first.`);
    }

    const artifact: Artifact = JSON.parse(readFileSync(stateFile, "utf8"));
    const survivors = (artifact.sections.hypothesis_slate as any[]).filter((h: any) => !h.killed);
    if (survivors.length === 0) {
      stderrLine("No surviving hypotheses to stress test.");
      if (jsonMode) stdoutLine(JSON.stringify({ ok: true, survivors: 0, kills: 0 }));
      process.exit(0);
    }

    const survivorList = survivors.map((h: any) => `- ${h.id}: ${h.name ?? h.claim}`).join("\n");
    const artifactMd = renderArtifactMarkdown(artifact);

    stderrLine(`\n========================================`);
    stderrLine(`  Adversarial Stress Test`);
    stderrLine(`========================================`);
    stderrLine(`Session:   ${sessionDir}`);
    stderrLine(`Survivors: ${survivors.length}`);
    stderrLine(`========================================\n`);

    // Resolve agent binary paths
    function resolveAgentBin(flagKey: string, envKey: string, fallback: string): string {
      return asStringFlag(flags, flagKey) ?? process.env[envKey] ?? fallback;
    }
    const claudeBin = resolveAgentBin("claude-bin", "BRENNER_CLAUDE_BIN", "claude");
    const codexBin  = resolveAgentBin("codex-bin",  "BRENNER_CODEX_BIN",  "codex");
    const geminiBin = resolveAgentBin("gemini-bin", "BRENNER_GEMINI_BIN", "gemini");

    const localBin = join(homedir(), ".local", "bin");
    const robotPath = [localBin, "/usr/local/bin", process.env.PATH ?? ""].filter(Boolean).join(":");

    const AGENT_TIMEOUT_MS = 300_000;

    // Build stress test prompt — all agents attack the survivors
    const stressPrompt = `You are an adversarial critic in a Brenner Protocol stress test.

## Your Mandate

Kill the surviving hypotheses. For each survivor, find the fatal flaw. If it cannot
withstand scrutiny, KILL it with a detailed reason. If it can survive, explain why —
but be ruthless. A hypothesis that barely survives is still suspect.

## Surviving Hypotheses

${survivorList}

${operatorContext ? `## Operator Context (CRITICAL)\n\n${operatorContext}\n\nUse the operator's context to guide your attacks. They know the domain.\n` : ""}

## Current Artifact

${artifactMd}

## Output Format

Respond ONLY with delta blocks. Use KILL operations to eliminate hypotheses.
Use ADD on adversarial_critique for framing attacks. One JSON object per \`\`\`delta fence.

For KILL:
\`\`\`delta
{
  "operation": "KILL",
  "section": "hypothesis_slate",
  "target_id": "H1",
  "payload": { "reason": "Why this hypothesis cannot survive." },
  "rationale": "[inference]"
}
\`\`\`
`;

    const stressDir = join(sessionDir, "stress_test");
    if (!existsSync(stressDir)) mkdirSync(stressDir, { recursive: true });

    // Run all 3 agents with the stress prompt in parallel
    type StressAgent = { name: string; slug: string; bin: string; args: (p: string) => string[]; env: () => Record<string, string | undefined>; read: (s: string, f: string) => string };
    const stressAgents: StressAgent[] = [
      { name: "BlueLake", slug: "bluelake", bin: claudeBin,
        args: (p: string) => ["--dangerously-skip-permissions", "--output-format", "text", "-p", p],
        env: () => ({ ...process.env, PATH: robotPath, CLAUDECODE: "", CLAUDE_CODE_ENTRYPOINT: "", AGENT_NAME: "BlueLake" }),
        read: (s: string) => s },
      { name: "RedForest", slug: "redforest", bin: codexBin,
        args: (p: string) => { const f = join(stressDir, "redforest_out.md"); return ["exec", "--full-auto", "--output-last-message", f, p]; },
        env: () => ({ ...process.env, PATH: robotPath, AGENT_NAME: "RedForest" }),
        read: (_s: string, f: string) => existsSync(f) ? readFileSync(f, "utf8") : "" },
      { name: "GreenMountain", slug: "greenmountain", bin: geminiBin,
        args: (p: string) => ["--yolo", "--output-format", "text", "-p", p],
        env: () => ({ ...process.env, PATH: robotPath, AGENT_NAME: "GreenMountain" }),
        read: (s: string) => s },
    ];

    const agentHealth: Record<string, { status: string; deltas: number; error?: string }> = {};
    const allDeltas: Array<ValidDelta & { timestamp: string; agent: string }> = [];
    const ts = new Date().toISOString();

    const results = await Promise.allSettled(
      stressAgents.map((sa) => {
        const promptFile = join(stressDir, `${sa.slug}_prompt.md`);
        const outFile = join(stressDir, `${sa.slug}_out.md`);
        writeFileSync(promptFile, stressPrompt);
        stderrLine(`  -> Invoking ${sa.name} (stress)...`);

        return new Promise<{ name: string; output: string }>((res, rej) => {
          const child = spawn(sa.bin, sa.args(stressPrompt), {
            env: sa.env(),
            stdio: ["ignore", "pipe", "pipe"],
            cwd: sessionDir,
          });
          const chunks: Buffer[] = [];
          child.stdout?.on("data", (d: Buffer) => chunks.push(d));
          let killTimer: ReturnType<typeof setTimeout> | undefined;
          const timer = setTimeout(() => {
            child.kill("SIGTERM");
            killTimer = setTimeout(() => child.kill("SIGKILL"), 10_000);
          }, AGENT_TIMEOUT_MS);
          child.on("error", (err: Error) => {
            clearTimeout(timer);
            if (killTimer) clearTimeout(killTimer);
            writeFileSync(outFile, "");
            res({ name: sa.name, output: "" });
          });
          child.on("close", (code: number | null) => {
            clearTimeout(timer);
            if (killTimer) clearTimeout(killTimer);
            const stdout = Buffer.concat(chunks).toString();
            const output = sa.read(stdout, outFile);
            writeFileSync(outFile, output);
            stderrLine(`  [ok] ${sa.name} stress done`);
            res({ name: sa.name, output });
          });
        });
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const { name, output } = r.value;
        if (!output.trim()) {
          agentHealth[name] = { status: "error", deltas: 0, error: "no output" };
          continue;
        }
        const deltas = extractValidDeltas(output).map((d) => ({ ...d, timestamp: ts, agent: name }));
        agentHealth[name] = { status: "ok", deltas: deltas.length };
        allDeltas.push(...deltas);
      } else {
        stderrLine(`  [!] Stress agent failed: ${r.reason}`);
      }
    }

    // Merge stress deltas into artifact
    const mergeResult = mergeArtifactWithTimestamps(artifact, allDeltas);
    const updatedArtifact = mergeResult.artifact;

    // Persist
    writeFileSync(join(sessionDir, "artifact.md"), renderArtifactMarkdown(updatedArtifact));
    writeFileSync(stateFile, JSON.stringify(updatedArtifact, null, 2));

    const kills = allDeltas.filter((d) => d.operation === "KILL").length;
    const postSurvivors = (updatedArtifact.sections.hypothesis_slate as any[]).filter((h: any) => !h.killed).length;

    stderrLine(`\n  Stress test: ${kills} kills, ${postSurvivors} survivors remain`);
    stderrLine(`  Per-agent: ${Object.entries(agentHealth).map(([n, h]) => `${n}=${h.status}(${h.deltas})`).join(", ")}`);

    if (jsonMode) {
      stdoutLine(JSON.stringify({
        ok: true,
        preSurvivors: survivors.length,
        kills,
        postSurvivors,
        agents: agentHealth,
        mergeErrors: mergeResult.ok ? 0 : mergeResult.errors.length,
      }, null, 2));
    } else {
      stdoutLine(renderArtifactMarkdown(updatedArtifact));
    }

    process.exit(0);
  }

  // ============================================================================
  // Session Record — convert a robot session dir into a SessionRecord JSON
  // ============================================================================
  if (normalizedTop === "session" && sub === "record") {
    const sessionDirRaw = asStringFlag(flags, "session-dir");
    if (!sessionDirRaw) throw new Error("Missing --session-dir.");
    const sessionDir = resolve(sessionDirRaw);
    const jsonMode = asBoolFlag(flags, "json");
    const outFile = asStringFlag(flags, "out-file");

    // Read robot_session.json
    const metaPath = join(sessionDir, "robot_session.json");
    const statePath = join(sessionDir, "session_state.json");

    let metaRaw: string;
    try {
      metaRaw = await Bun.file(metaPath).text();
    } catch {
      throw new Error(`robot_session.json not found in ${sessionDir}`);
    }

    const meta = JSON.parse(metaRaw) as {
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
    };

    let stateRaw: string | null = null;
    try {
      stateRaw = await Bun.file(statePath).text();
    } catch {
      // state file optional
    }

    const artifact = stateRaw ? JSON.parse(stateRaw) : null;

    // Build session record
    const record = createEmptySessionRecord(meta.sessionId);
    record.inputs.kickoff.thread_id = meta.sessionId;
    record.inputs.kickoff.question = meta.question;

    // Populate agent roster from first round agents
    const firstRound = meta.rounds[0];
    if (firstRound) {
      const agentRoles: Record<string, string> = {
        bluelake: "test_designer",
        redforest: "hypothesis_generator",
        greenmountain: "adversarial_critic",
      };
      for (const agentName of Object.keys(firstRound.agents)) {
        const role = agentRoles[agentName.toLowerCase()] ?? "hypothesis_generator";
        record.inputs.agent_roster.push({
          agent_name: agentName,
          role: role as "hypothesis_generator" | "test_designer" | "adversarial_critic",
          program: agentName.toLowerCase() === "bluelake" ? "claude-code" : agentName.toLowerCase() === "redforest" ? "codex-cli" : "gemini-cli",
          model: agentName.toLowerCase() === "bluelake" ? "opus-4.5" : agentName.toLowerCase() === "redforest" ? "gpt-5.2" : "gemini-3",
        });
      }
    }

    // Populate trace rounds from agent output files
    const startedAt = new Date().toISOString();
    record.trace.started_at = startedAt;

    for (const round of meta.rounds) {
      const roundDir = join(sessionDir, `round_${round.round}`);
      const roundStarted = new Date().toISOString();
      const traceMessages = [];

      for (const agentName of Object.keys(round.agents)) {
        const outputPath = join(roundDir, `${agentName.toLowerCase()}_out.md`);
        let body = "";
        try {
          body = await Bun.file(outputPath).text();
        } catch {
          continue;
        }

        const traceMsg = await createTraceMessage(
          agentName,
          "DELTA",
          body,
          { subject: `DELTA[${agentName}]: Round ${round.round}` },
        );
        traceMessages.push(traceMsg);
      }

      record.trace.rounds.push({
        round_number: round.round,
        started_at: roundStarted,
        ended_at: new Date().toISOString(),
        messages: traceMessages,
        compiled_artifact_hash: undefined,
        duration_ms: 0,
      });
    }

    record.trace.ended_at = new Date().toISOString();
    record.trace.total_duration_ms = 0;

    // Populate outputs
    if (artifact) {
      const sections = artifact.sections ?? {};
      const hypotheses = (sections.hypothesis_slate ?? []) as unknown[];
      const tests = (sections.discriminative_tests ?? []) as unknown[];
      const assumptions = (sections.assumption_ledger ?? []) as unknown[];
      const anomalies = (sections.anomaly_register ?? []) as unknown[];
      const critiques = (sections.adversarial_critique ?? []) as unknown[];

      record.outputs.hypothesis_count = hypotheses.length;
      record.outputs.test_count = tests.length;
      record.outputs.assumption_count = assumptions.length;
      record.outputs.anomaly_count = anomalies.length;
      record.outputs.critique_count = critiques.length;
      record.outputs.final_artifact_hash = await computeContentHash(stateRaw!);
    }

    // Validate
    const validation = validateSessionRecord(record);

    if (outFile) {
      await Bun.write(outFile, JSON.stringify(record, null, 2));
      stderrLine(`Session record written to ${outFile}`);
    }

    if (jsonMode || !outFile) {
      stdoutLine(JSON.stringify({
        ok: true,
        recordId: record.id,
        sessionId: record.session_id,
        rounds: record.trace.rounds.length,
        messages: record.trace.rounds.reduce((s, r) => s + r.messages.length, 0),
        replayable: isReplayable(record),
        valid: validation.valid,
        ...(outFile ? { file: outFile } : {}),
      }, null, 2));
    }

    process.exit(0);
  }

  // ============================================================================
  // Session Replay — trace through a recorded session step by step
  // ============================================================================
  if (normalizedTop === "session" && sub === "replay") {
    const recordFile = asStringFlag(flags, "record-file");
    if (!recordFile) throw new Error("Missing --record-file.");
    const jsonMode = asBoolFlag(flags, "json");
    const mode = (asStringFlag(flags, "mode") ?? "trace") as "verification" | "comparison" | "trace";

    let recordRaw: string;
    try {
      recordRaw = await Bun.file(resolve(recordFile)).text();
    } catch {
      throw new Error(`Cannot read record file: ${recordFile}`);
    }

    const parsed = JSON.parse(recordRaw);
    const validation = validateSessionRecord(parsed);
    if (!validation.valid) {
      throw new Error(`Invalid session record: ${validation.errors.join("; ")}`);
    }

    const record = validation.data;

    if (!isReplayable(record)) {
      throw new Error("Session record is not replayable (missing rounds, roster, or outputs).");
    }

    if (mode === "trace") {
      // Trace mode: step through recorded messages and display
      if (jsonMode) {
        const traceOutput = {
          ok: true,
          mode: "trace",
          sessionId: record.session_id,
          rounds: record.trace.rounds.map((r) => ({
            round: r.round_number,
            messages: r.messages.map((m) => ({
              from: m.from,
              type: m.type,
              subject: m.subject ?? "",
              contentLength: m.content_length,
              contentHash: m.content_hash,
              timestamp: m.timestamp,
            })),
            compiledArtifactHash: r.compiled_artifact_hash ?? null,
          })),
          outputs: {
            hypothesisCount: record.outputs.hypothesis_count,
            testCount: record.outputs.test_count,
            assumptionCount: record.outputs.assumption_count ?? 0,
            anomalyCount: record.outputs.anomaly_count ?? 0,
            critiqueCount: record.outputs.critique_count ?? 0,
            grade: record.outputs.scorecard_grade ?? null,
            points: record.outputs.scorecard_points ?? null,
            finalArtifactHash: record.outputs.final_artifact_hash,
          },
          interventionCount: record.trace.interventions.length,
        };
        stdoutLine(JSON.stringify(traceOutput, null, 2));
      } else {
        stdoutLine(`\n═══════════════════════════════════════════════════════════`);
        stdoutLine(`  SESSION REPLAY (trace mode): ${record.session_id}`);
        stdoutLine(`═══════════════════════════════════════════════════════════\n`);

        stdoutLine(`Record ID: ${record.id}`);
        stdoutLine(`Created: ${record.created_at}`);
        stdoutLine(`Roster: ${record.inputs.agent_roster.map((a) => `${a.agent_name} (${a.role})`).join(", ")}`);
        if (record.inputs.kickoff.question) {
          stdoutLine(`Question: ${record.inputs.kickoff.question}`);
        }
        stdoutLine(``);

        for (const round of record.trace.rounds) {
          stdoutLine(`───────────────────────────────────────────────────────────`);
          stdoutLine(`Round ${round.round_number} (${round.messages.length} messages)`);
          stdoutLine(`───────────────────────────────────────────────────────────`);

          for (const msg of round.messages) {
            const hashShort = msg.content_hash.slice(0, 8);
            stdoutLine(`  [${msg.type}] ${msg.from}: ${msg.subject ?? "(no subject)"} (${msg.content_length} bytes, hash:${hashShort})`);
          }

          if (round.compiled_artifact_hash) {
            stdoutLine(`  → Compiled artifact: ${round.compiled_artifact_hash.slice(0, 16)}...`);
          }
          stdoutLine(``);
        }

        stdoutLine(`═══════════════════════════════════════════════════════════`);
        stdoutLine(`  OUTPUTS`);
        stdoutLine(`═══════════════════════════════════════════════════════════`);
        stdoutLine(`Hypotheses: ${record.outputs.hypothesis_count}`);
        stdoutLine(`Tests: ${record.outputs.test_count}`);
        stdoutLine(`Assumptions: ${record.outputs.assumption_count ?? 0}`);
        stdoutLine(`Anomalies: ${record.outputs.anomaly_count ?? 0}`);
        stdoutLine(`Critiques: ${record.outputs.critique_count ?? 0}`);
        if (record.outputs.scorecard_grade) {
          stdoutLine(`Grade: ${record.outputs.scorecard_grade} (${record.outputs.scorecard_points} pts)`);
        }
        stdoutLine(`Artifact hash: ${record.outputs.final_artifact_hash.slice(0, 16)}...`);
        if (record.trace.interventions.length > 0) {
          stdoutLine(`Interventions: ${record.trace.interventions.length}`);
        }
        stdoutLine(``);
      }

      process.exit(0);
    }

    // Verification and comparison modes require re-running agents — not yet implemented
    throw new Error(`Replay mode "${mode}" is not yet implemented. Use --mode trace for step-through replay.`);
  }

  throw new Error(`Unknown command: ${[top, sub, action].filter(Boolean).join(" ")}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  stderrLine(message);
  process.exit(1);
});
