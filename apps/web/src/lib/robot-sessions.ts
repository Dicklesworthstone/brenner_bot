/**
 * Robot Session Loader
 *
 * Scans a configurable directory for robot mode session artifacts
 * (produced by `brenner session robot`) and exposes them for the web app.
 *
 * Robot session directories contain:
 *   session_state.json  — full Artifact JSON
 *   robot_session.json  — metadata (rounds, agent health, convergence)
 *   artifact.md         — rendered markdown
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { SessionPhase } from "./threadStatus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RobotRoundInfo {
  round: number;
  adds: number;
  kills: number;
  edits: number;
  errors: number;
  converged: boolean;
  reason: string;
  agents: Record<string, { status: string; deltas: number; error?: string }>;
}

export interface RobotSessionMeta {
  sessionId: string;
  question: string;
  rounds: RobotRoundInfo[];
  finalArtifactVersion: number;
}

export interface RobotThreadSummary {
  threadId: string;
  sessionDir: string;
  question: string;
  roundsCompleted: number;
  phase: SessionPhase;
  hasArtifact: boolean;
  activeHypotheses: number;
  killedHypotheses: number;
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RobotSessionDetail {
  summary: RobotThreadSummary;
  meta: RobotSessionMeta;
  artifactJson: Record<string, unknown> | null;
  artifactMarkdown: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROBOT_SESSION_PREFIX = "robot-";

export function isRobotSession(threadId: string): boolean {
  return threadId.startsWith(ROBOT_SESSION_PREFIX);
}

/**
 * Resolve the base directory where robot sessions are stored.
 * Falls back to: BRENNER_ROBOT_SESSIONS_DIR → <repo-root>/artifacts
 */
function getRobotSessionsBaseDir(): string {
  if (process.env.BRENNER_ROBOT_SESSIONS_DIR) {
    return resolve(process.env.BRENNER_ROBOT_SESSIONS_DIR);
  }
  // Default: repo root / artifacts
  const webCwd = process.cwd();
  return resolve(webCwd, "../../artifacts");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonSafe<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readTextSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Scan for all robot session directories.
 * A valid robot session directory contains at least `robot_session.json`.
 */
export async function listRobotSessions(): Promise<RobotThreadSummary[]> {
  const baseDir = getRobotSessionsBaseDir();

  if (!(await fileExists(baseDir))) {
    return [];
  }

  let entries: string[];
  try {
    const dirEntries = await readdir(baseDir, { withFileTypes: true });
    entries = dirEntries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const summaries: RobotThreadSummary[] = [];

  for (const dirName of entries) {
    const sessionDir = join(baseDir, dirName);
    const metaPath = join(sessionDir, "robot_session.json");

    if (!(await fileExists(metaPath))) continue;

    const meta = await readJsonSafe<RobotSessionMeta>(metaPath);
    if (!meta) continue;

    const statePath = join(sessionDir, "session_state.json");
    const artifactJson = await readJsonSafe<Record<string, unknown>>(statePath);

    // Extract artifact stats
    let activeHypotheses = 0;
    let killedHypotheses = 0;
    let createdAt = "";
    let updatedAt = "";

    if (artifactJson) {
      const metadata = artifactJson.metadata as Record<string, unknown> | undefined;
      createdAt = (metadata?.created_at as string) ?? "";
      updatedAt = (metadata?.updated_at as string) ?? "";

      const sections = artifactJson.sections as Record<string, unknown> | undefined;
      const hypotheses = (sections?.hypothesis_slate ?? []) as Array<{ killed_at?: string }>;
      activeHypotheses = hypotheses.filter((h) => !h.killed_at).length;
      killedHypotheses = hypotheses.filter((h) => !!h.killed_at).length;
    }

    // Determine phase from round convergence
    const lastRound = meta.rounds[meta.rounds.length - 1];
    const converged = lastRound?.converged ?? false;
    const phase: SessionPhase = converged ? "compiled" : "awaiting_responses";

    // Extract participants from agent names across rounds
    const participants = new Set<string>();
    for (const round of meta.rounds) {
      for (const agentName of Object.keys(round.agents)) {
        participants.add(agentName);
      }
    }

    const threadId = `${ROBOT_SESSION_PREFIX}${dirName}`;

    summaries.push({
      threadId,
      sessionDir,
      question: meta.question,
      roundsCompleted: meta.rounds.length,
      phase,
      hasArtifact: artifactJson !== null,
      activeHypotheses,
      killedHypotheses,
      participants: [...participants],
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    });
  }

  // Sort by updated time descending
  summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return summaries;
}

/**
 * Load a specific robot session by thread ID.
 * The threadId should start with "robot-" prefix; the remainder is the directory name.
 */
export async function getRobotSession(threadId: string): Promise<RobotSessionDetail | null> {
  if (!isRobotSession(threadId)) return null;

  const dirName = threadId.slice(ROBOT_SESSION_PREFIX.length);
  const baseDir = getRobotSessionsBaseDir();
  const sessionDir = join(baseDir, dirName);

  const metaPath = join(sessionDir, "robot_session.json");
  const meta = await readJsonSafe<RobotSessionMeta>(metaPath);
  if (!meta) return null;

  const statePath = join(sessionDir, "session_state.json");
  const artifactJson = await readJsonSafe<Record<string, unknown>>(statePath);

  const artifactMdPath = join(sessionDir, "artifact.md");
  const artifactMarkdown = await readTextSafe(artifactMdPath);

  // Build summary
  let activeHypotheses = 0;
  let killedHypotheses = 0;
  let createdAt = "";
  let updatedAt = "";

  if (artifactJson) {
    const metadata = artifactJson.metadata as Record<string, unknown> | undefined;
    createdAt = (metadata?.created_at as string) ?? "";
    updatedAt = (metadata?.updated_at as string) ?? "";

    const sections = artifactJson.sections as Record<string, unknown> | undefined;
    const hypotheses = (sections?.hypothesis_slate ?? []) as Array<{ killed_at?: string }>;
    activeHypotheses = hypotheses.filter((h) => !h.killed_at).length;
    killedHypotheses = hypotheses.filter((h) => !!h.killed_at).length;
  }

  const lastRound = meta.rounds[meta.rounds.length - 1];
  const converged = lastRound?.converged ?? false;
  const phase: SessionPhase = converged ? "compiled" : "awaiting_responses";

  const participants = new Set<string>();
  for (const round of meta.rounds) {
    for (const agentName of Object.keys(round.agents)) {
      participants.add(agentName);
    }
  }

  const summary: RobotThreadSummary = {
    threadId,
    sessionDir,
    question: meta.question,
    roundsCompleted: meta.rounds.length,
    phase,
    hasArtifact: artifactJson !== null,
    activeHypotheses,
    killedHypotheses,
    participants: [...participants],
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
  };

  return { summary, meta, artifactJson, artifactMarkdown };
}

/**
 * Load round-level agent output files for a robot session.
 * Returns prompts and outputs for each agent in each round.
 */
export async function getRobotSessionRoundDetails(
  threadId: string,
  roundNumber: number,
): Promise<Record<string, { prompt: string | null; output: string | null }> | null> {
  if (!isRobotSession(threadId)) return null;

  const dirName = threadId.slice(ROBOT_SESSION_PREFIX.length);
  const baseDir = getRobotSessionsBaseDir();
  const roundDir = join(baseDir, dirName, `round_${roundNumber}`);

  if (!(await fileExists(roundDir))) return null;

  const agents = ["bluelake", "redforest", "greenmountain"];
  const result: Record<string, { prompt: string | null; output: string | null }> = {};

  for (const agent of agents) {
    result[agent] = {
      prompt: await readTextSafe(join(roundDir, `${agent}_prompt.md`)),
      output: await readTextSafe(join(roundDir, `${agent}_out.md`)),
    };
  }

  return result;
}
