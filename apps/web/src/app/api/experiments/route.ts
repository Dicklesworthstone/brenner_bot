/**
 * Experiment Run API
 *
 * Server-side API endpoint that triggers an experiment run using the same
 * underlying runner as the CLI. Requires lab mode + orchestration auth.
 *
 * POST /api/experiments
 * Body: { projectKey, threadId, testId, command, timeout?, cwd? }
 * Returns: ExperimentResult JSON (stdout/stderr/exit code/duration + provenance)
 */

import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path";
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { checkOrchestrationAuth } from "@/lib/auth";

export const runtime = "nodejs";

// ============================================================================
// Types
// ============================================================================

interface ExperimentRunRequest {
  /** Absolute path to project workspace (defaults to BRENNER_PROJECT_KEY or repo root) */
  projectKey?: string;
  /** Thread ID for the session */
  threadId: string;
  /** Test ID (e.g., T1, T2) */
  testId: string;
  /** Command to execute (array of strings) */
  command: string[];
  /** Timeout in seconds (default: 900, max: 3600) */
  timeout?: number;
  /** Working directory relative to projectKey (default: projectKey) */
  cwd?: string;
}

interface ExperimentResultV01 {
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
    branch: string | null;
    dirty: boolean;
  };
  runtime: {
    platform: string;
    arch: string;
    bun_version: string;
  };
}

interface ExperimentRunResponse {
  success: true;
  result: ExperimentResultV01;
  resultFile: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: "VALIDATION_ERROR" | "AUTH_ERROR" | "EXECUTION_ERROR" | "SERVER_ERROR";
}

// ============================================================================
// Command Whitelist
// ============================================================================

/**
 * Allowed command binaries for experiment execution.
 *
 * Security: Only these commands can be executed via the API.
 * Add new commands here as needed, but be cautious about commands that:
 * - Can execute arbitrary code (e.g., eval, sh -c)
 * - Can exfiltrate data (e.g., curl, wget without restrictions)
 * - Can modify system state destructively
 */
const ALLOWED_COMMANDS = new Set([
  // Package managers / runners
  "bun",
  "bunx",
  "npm",
  "npx",
  "yarn",
  "pnpm",
  "node",
  "deno",

  // Python
  "python",
  "python3",
  "pip",
  "pip3",
  "poetry",
  "uv",

  // Testing frameworks
  "pytest",
  "vitest",
  "jest",
  "mocha",

  // Build tools
  "make",
  "cargo",
  "go",
  "rustc",

  // Version control (read-only operations)
  "git",

  // Shell (allows arbitrary code via -c, but lab mode auth is required)
  "bash",
  "sh",

  // Common utilities (safe subset)
  "echo",
  "cat",
  "ls",
  "pwd",
  "which",
  "env",
  "printenv",
  "date",
  "wc",
  "head",
  "tail",
  "grep",
  "find",
  "diff",
  "sort",
  "uniq",
]);

/**
 * Check if a command binary is allowed to be executed.
 *
 * SECURITY: Only bare command names are allowed (no paths).
 * This prevents bypass via "./echo" or "/path/to/malicious" where
 * the attacker creates a script with a whitelisted name.
 * Commands must rely on PATH resolution.
 */
function isCommandAllowed(commandBinary: string): boolean {
  // Reject any command containing path separators
  // This prevents "./malicious" or "/usr/local/bin/malicious" from bypassing
  if (commandBinary.includes("/") || commandBinary.includes("\\")) {
    return false;
  }
  return ALLOWED_COMMANDS.has(commandBinary);
}

// ============================================================================
// Helpers
// ============================================================================

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function sanitizeForFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function isReservedPathSegment(segment: string): boolean {
  return segment === "" || segment === "." || segment === "..";
}

function formatUtcTimestampForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function bestEffortGitProvenance(
  cwd: string,
): { sha: string; branch: string | null; dirty: boolean } | null {
  try {
    const shaProc = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" });
    if (shaProc.status !== 0 || shaProc.error) return null;
    const sha = (shaProc.stdout ?? "").trim();
    if (!sha) return null;

    const branchProc = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
    });
    const branch =
      branchProc.status === 0 && !branchProc.error
        ? (branchProc.stdout ?? "").trim() || null
        : null;

    const statusProc = spawnSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
    const dirty =
      statusProc.status === 0 && !statusProc.error && (statusProc.stdout ?? "").trim().length > 0;

    return { sha, branch, dirty };
  } catch {
    return null;
  }
}

function isWithinDir(baseDir: string, candidatePath: string): boolean {
  const rel = relative(baseDir, candidatePath);
  if (rel === "") return true;
  if (isAbsolute(rel) || win32.isAbsolute(rel)) return false;
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith("..\\");
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ExperimentRunResponse | ErrorResponse>> {
  // Auth check (lab mode + orchestration auth)
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const authResult = checkOrchestrationAuth(reqHeaders, reqCookies);

  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: "Not found", code: "AUTH_ERROR" },
      { status: 404 },
    );
  }

  // Parse body
  let body: ExperimentRunRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Validate required fields
  const { threadId, testId, command } = body;

  if (!threadId?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing threadId", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (!testId?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing testId", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (!Array.isArray(command) || command.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing or invalid command (must be non-empty array)",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  // Validate command elements are strings
  if (!command.every((arg) => typeof arg === "string")) {
    return NextResponse.json(
      {
        success: false,
        error: "Command array must contain only strings",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  if (typeof command[0] !== "string" || command[0].trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid command: first element must be a non-empty string",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  // Validate command is in whitelist
  if (!isCommandAllowed(command[0])) {
    return NextResponse.json(
      {
        success: false,
        error: `Command not allowed: ${command[0]}. Only whitelisted commands can be executed.`,
        code: "VALIDATION_ERROR",
      },
      { status: 403 },
    );
  }

  // Validate timeout
  const timeout = body.timeout ?? 900;
  if (typeof timeout !== "number" || timeout <= 0 || timeout > 3600) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid timeout: must be 1-3600 seconds",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  try {
    // Resolve paths
    const rawProjectKey =
      body.projectKey || process.env.BRENNER_PROJECT_KEY || repoRootFromWebCwd();
    const isAbsoluteProjectKey = isAbsolute(rawProjectKey) || win32.isAbsolute(rawProjectKey);
    if (!isAbsoluteProjectKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid projectKey: must be an absolute path",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const projectKey = resolve(rawProjectKey);

    if (body.cwd && (isAbsolute(body.cwd) || win32.isAbsolute(body.cwd))) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid cwd: must be a relative path within projectKey",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const cwd = body.cwd ? resolve(projectKey, body.cwd) : projectKey;
    if (!isWithinDir(projectKey, cwd)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid cwd: resolves outside projectKey",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    // Generate result file path
    const resultId = randomUUID();
    const createdAt = new Date();
    const timestamp = formatUtcTimestampForFilename(createdAt);
    const safeThreadId = sanitizeForFilename(threadId.trim());
    const safeTestId = sanitizeForFilename(testId.trim());
    if (isReservedPathSegment(safeThreadId) || isReservedPathSegment(safeTestId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid threadId/testId (reserved path segment)",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }
    const resultFile = join(
      projectKey,
      "artifacts",
      safeThreadId,
      "experiments",
      safeTestId,
      `${timestamp}_${resultId}.json`,
    );

    // Execute command with timeout
    const startedAt = createdAt;
    let timedOut = false;
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const MAX_OUTPUT_CHARS = 200_000;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let stdoutChars = 0;
    let stderrChars = 0;

    const proc = spawn(command[0], command.slice(1), { cwd, stdio: ["ignore", "pipe", "pipe"] });
    proc.stdout?.setEncoding("utf8");
    proc.stderr?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk: string) => {
      if (stdoutTruncated) return;
      const remaining = MAX_OUTPUT_CHARS - stdoutChars;
      if (remaining <= 0) {
        stdoutTruncated = true;
        return;
      }
      if (chunk.length > remaining) {
        stdoutChunks.push(chunk.slice(0, remaining));
        stdoutChars += remaining;
        stdoutTruncated = true;
        return;
      }
      stdoutChunks.push(chunk);
      stdoutChars += chunk.length;
    });
    proc.stderr?.on("data", (chunk: string) => {
      if (stderrTruncated) return;
      const remaining = MAX_OUTPUT_CHARS - stderrChars;
      if (remaining <= 0) {
        stderrTruncated = true;
        return;
      }
      if (chunk.length > remaining) {
        stderrChunks.push(chunk.slice(0, remaining));
        stderrChars += remaining;
        stderrTruncated = true;
        return;
      }
      stderrChunks.push(chunk);
      stderrChars += chunk.length;
    });

    const timeoutMs = timeout * 1000;
    let sigkillTimer: ReturnType<typeof setTimeout> | null = null;
    const killTimer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill("SIGTERM");
      } catch {
        // ignore
      }
      sigkillTimer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, 1000);
    }, timeoutMs);

    try {
      const exitCode = await new Promise<number | null>((resolveExitCode, rejectExitCode) => {
        proc.on("error", rejectExitCode);
        proc.on("close", (code) => resolveExitCode(code));
      });

      let stdout = stdoutChunks.join("");
      let stderr = stderrChunks.join("");
      if (stdoutTruncated) stdout += "\n…(truncated)…\n";
      if (stderrTruncated) stderr += "\n…(truncated)…\n";
      const resolvedExitCode = typeof exitCode === "number" ? exitCode : timedOut ? 124 : 1;

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const git = bestEffortGitProvenance(cwd);
      const bun_version =
        (process.versions as unknown as Record<string, string | undefined>).bun ?? "unknown";

      const result: ExperimentResultV01 = {
        schema_version: "experiment_result_v0.1",
        result_id: resultId,
        capture_mode: "run",
        thread_id: threadId.trim(),
        test_id: testId.trim(),

        created_at: startedAt.toISOString(),
        cwd,
        argv: command,

        timeout_seconds: timeout,
        timed_out: timedOut,

        exit_code: resolvedExitCode,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,

        stdout,
        stderr,

        ...(git ? { git } : {}),
        runtime: { platform: process.platform, arch: process.arch, bun_version },
      };

      // Write result file
      mkdirSync(dirname(resultFile), { recursive: true });
      writeFileSync(resultFile, JSON.stringify(result, null, 2), "utf8");

      return NextResponse.json({
        success: true,
        result,
        resultFile,
      });
    } finally {
      clearTimeout(killTimer);
      if (sigkillTimer) clearTimeout(sigkillTimer);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Execution failed: ${message}`, code: "EXECUTION_ERROR" },
      { status: 500 },
    );
  }
}
