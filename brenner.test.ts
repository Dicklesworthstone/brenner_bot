/**
 * Unit tests for brenner.ts CLI
 *
 * Tests argument parsing, command routing, and error handling.
 * Philosophy: NO mocks - test real CLI behavior via subprocess.
 *
 * Run with: bun test brenner.test.ts
 */

import { afterAll, describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { AgentMailTestServer } from "./apps/web/src/test-utils/agent-mail-test-server";

// ============================================================================
// Test Helpers
// ============================================================================

const CLI_PATH = resolve(__dirname, "brenner.ts");

// Track temp paths for cleanup to avoid inode exhaustion
const tempPathsToCleanup: string[] = [];

afterAll(() => {
  for (const p of tempPathsToCleanup) {
    try {
      rmSync(p, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  tempPathsToCleanup.length = 0;
});

function trackTempPath(path: string): string {
  tempPathsToCleanup.push(path);
  return path;
}

function createTempDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return trackTempPath(dir);
}

function createTempFile(prefix: string, content: string): string {
  const filePath = join(tmpdir(), `${prefix}-${randomUUID()}`);
  writeFileSync(filePath, content, "utf8");
  return trackTempPath(filePath);
}

const CLI_TEST_TRACE = process.env.BRENNER_CLI_TEST_TRACE === "1";
const CLI_TEST_LOG_MAX_CHARS = (() => {
  const raw = process.env.BRENNER_CLI_TEST_LOG_MAX_CHARS;
  if (!raw) return 20_000;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20_000;
})();

function writeTempConfig(config: unknown): string {
  const configPath = join(tmpdir(), `brenner-test-config-${randomUUID()}.json`);
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  return trackTempPath(configPath);
}

function writeTempConfigText(text: string): string {
  const configPath = join(tmpdir(), `brenner-test-config-${randomUUID()}.json`);
  writeFileSync(configPath, text, "utf8");
  return trackTempPath(configPath);
}

interface CliResult {
  argv: string[];
  cwd?: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  timedOut: boolean;
}

function truncateForLog(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[truncated; total_chars=${text.length}]`;
}

function formatCliDebug(result: CliResult): string {
  const header = [
    `argv: ${result.argv.join(" ")}`,
    result.cwd ? `cwd: ${result.cwd}` : undefined,
    `exitCode: ${result.exitCode ?? "null"}`,
    `signal: ${result.signal ?? "null"}`,
    `timedOut: ${result.timedOut}`,
    `durationMs: ${result.durationMs}`,
  ]
    .filter(Boolean)
    .join("\n");

  const stdout = truncateForLog(result.stdout, CLI_TEST_LOG_MAX_CHARS);
  const stderr = truncateForLog(result.stderr, CLI_TEST_LOG_MAX_CHARS);

  return `${header}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`;
}

/**
 * Run the brenner CLI with given arguments and return output.
 */
async function runCli(
  args: string[],
  options?: { timeout?: number; env?: Record<string, string>; cwd?: string; stdin?: string }
): Promise<CliResult> {
  const timeoutMs = options?.timeout ?? 5000;
  const env = {
    ...process.env,
    // Disable Agent Mail for most tests
    AGENT_MAIL_BASE_URL: "http://127.0.0.1:59999", // Non-existent port
    ...(options?.env ?? {}),
  };

  return new Promise((resolve, reject) => {
    const argv = [process.execPath, "run", CLI_PATH, ...args];
    const startedAt = Date.now();

    const proc = spawn(argv[0], argv.slice(1), {
      env,
      cwd: options?.cwd,
      stdio: [options?.stdin !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
    });

    // Write stdin if provided (write lines with delays to work with readline)
    if (options?.stdin !== undefined && proc.stdin) {
      const lines = options.stdin.split("\n");
      let lineIndex = 0;
      const writeNextLine = () => {
        if (proc.stdin && !proc.stdin.destroyed && lineIndex < lines.length) {
          const line = lines[lineIndex++];
          proc.stdin.write(line + "\n");
          if (lineIndex < lines.length) {
            setTimeout(writeNextLine, 50);
          } else {
            proc.stdin.end();
          }
        }
      };
      setTimeout(writeNextLine, 300);
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let killHandle: NodeJS.Timeout | null = null;

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeoutHandle =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            try {
              proc.kill("SIGTERM");
            } catch {}
            killHandle = setTimeout(() => {
              try {
                proc.kill("SIGKILL");
              } catch {}
            }, 250);
            killHandle.unref?.();
          }, timeoutMs)
        : null;

    timeoutHandle?.unref?.();

    proc.on("close", (code, signal) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (killHandle) clearTimeout(killHandle);
      if (settled) return;
      settled = true;

      const result: CliResult = {
        argv,
        cwd: options?.cwd,
        stdout,
        stderr,
        exitCode: code,
        signal,
        durationMs: Date.now() - startedAt,
        timedOut,
      };

      if (CLI_TEST_TRACE) {
        const label = timedOut ? "TIMEOUT" : code === 0 ? "OK" : "ERR";
        console.log(`[brenner.cli.test] ${label} (${result.durationMs}ms)`);
        console.log(formatCliDebug(result));
      }

      if (timedOut) {
        reject(new Error(`CLI test timed out after ${timeoutMs}ms\n\n${formatCliDebug(result)}`));
        return;
      }

      resolve(result);
    });

    proc.on("error", (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (killHandle) clearTimeout(killHandle);
      if (settled) return;
      settled = true;

      const result: CliResult = {
        argv,
        cwd: options?.cwd,
        stdout,
        stderr,
        exitCode: null,
        signal: null,
        durationMs: Date.now() - startedAt,
        timedOut,
      };

      const msg = err instanceof Error ? err.message : String(err);
      reject(new Error(`CLI test spawn error: ${msg}\n\n${formatCliDebug(result)}`));
    });
  });
}

// ============================================================================
// Tests: Help and Usage
// ============================================================================

describe("help and usage", () => {
  it("shows usage with --help flag", async () => {
    const result = await runCli(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("Commands:");
    expect(result.stdout).toContain("corpus");
    expect(result.stdout).toContain("excerpt");
    expect(result.stdout).toContain("memory");
    expect(result.stdout).toContain("mail");
    expect(result.stdout).toContain("prompt");
    expect(result.stdout).toContain("cockpit");
    expect(result.stdout).toContain("session");
  });

  it("shows usage with help command", async () => {
    const result = await runCli(["help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("shows usage with -h flag", async () => {
    const result = await runCli(["-h"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("shows usage with no arguments", async () => {
    const result = await runCli([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("usage includes all main commands", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("version");
    expect(result.stdout).toContain("corpus search");
    expect(result.stdout).toContain("experiment run");
    expect(result.stdout).toContain("experiment record");
    expect(result.stdout).toContain("excerpt build");
    expect(result.stdout).toContain("mail health");
    expect(result.stdout).toContain("mail tools");
    expect(result.stdout).toContain("mail send");
    expect(result.stdout).toContain("mail inbox");
    expect(result.stdout).toContain("mail read");
    expect(result.stdout).toContain("mail ack");
    expect(result.stdout).toContain("mail thread");
    expect(result.stdout).toContain("upgrade");
    expect(result.stdout).toContain("lint <artifact.json>");
    expect(result.stdout).toContain("prompt compose");
    expect(result.stdout).toContain("memory context");
    expect(result.stdout).toContain("cockpit start");
    expect(result.stdout).toContain("session start");
    expect(result.stdout).toContain("session status");
    expect(result.stdout).toContain("session compile");
    expect(result.stdout).toContain("session write");
    expect(result.stdout).toContain("session publish");
    expect(result.stdout).toContain("session nudge");
  });

  it("usage includes environment variable documentation", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("BRENNER_CONFIG_PATH");
    expect(result.stdout).toContain("AGENT_MAIL_BASE_URL");
    expect(result.stdout).toContain("AGENT_MAIL_PATH");
    expect(result.stdout).toContain("AGENT_MAIL_BEARER_TOKEN");
    expect(result.stdout).toContain("CM_MCP_BASE_URL");
    expect(result.stdout).toContain("CM_MCP_PATH");
    expect(result.stdout).toContain("CM_MCP_BEARER_TOKEN");
  });

  it("usage includes aliases", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("Aliases:");
    expect(result.stdout).toContain("orchestrate start");
  });
});

// ============================================================================
// Tests: Cockpit Start
// ============================================================================

describe("cockpit start", () => {
  it("fails without --role-map", async () => {
    const excerptPath = join(tmpdir(), `brenner-test-excerpt-${randomUUID()}.md`);
    writeFileSync(excerptPath, "§1 — test excerpt", "utf8");

    const result = await runCli([
      "cockpit",
      "start",
      "--thread-id",
      "RS-20251231-test",
      "--sender",
      "TestSender",
      "--to",
      "BlueLake,PurpleMountain,RedForest",
      "--excerpt-file",
      excerptPath,
      "--question",
      "What is the question?",
      "--dry-run",
      "--json",
      "--skip-ntm",
      "--skip-broadcast",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing --role-map");
  });

  it("prints a dry-run plan with explicit roster", async () => {
    const excerptPath = join(tmpdir(), `brenner-test-excerpt-${randomUUID()}.md`);
    writeFileSync(excerptPath, "§1 — test excerpt", "utf8");

    const result = await runCli([
      "cockpit",
      "start",
      "--thread-id",
      "RS-20251231-test",
      "--sender",
      "TestSender",
      "--to",
      "BlueLake,PurpleMountain,RedForest",
      "--role-map",
      "BlueLake=hypothesis_generator,PurpleMountain=test_designer,RedForest=adversarial_critic",
      "--excerpt-file",
      excerptPath,
      "--question",
      "What is the question?",
      "--dry-run",
      "--json",
      "--skip-ntm",
      "--skip-broadcast",
    ]);

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      ok: boolean;
      dryRun: boolean;
      threadId: string;
      roster: Record<string, string>;
      kickoff: Array<{ to: string; role: string; subject: string }>;
      ntm: { spawn: unknown; broadcast: unknown };
    };

    expect(parsed.ok).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.threadId).toBe("RS-20251231-test");
    expect(parsed.roster.BlueLake).toBe("hypothesis_generator");
    expect(parsed.roster.PurpleMountain).toBe("test_designer");
    expect(parsed.roster.RedForest).toBe("adversarial_critic");
    expect(parsed.ntm.spawn).toBeNull();
    expect(parsed.ntm.broadcast).toBeNull();
    expect(parsed.kickoff.map((k) => k.to)).toEqual(["BlueLake", "PurpleMountain", "RedForest"]);
  });
});

// ============================================================================
// Tests: Session Nudge
// ============================================================================

describe("session nudge", () => {
  it("fails without --thread-id", async () => {
    const result = await runCli(["session", "nudge"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing --thread-id");
  });
});

// ============================================================================
// Tests: Experiment Capture
// ============================================================================

describe("experiment capture", () => {
  it("records an experiment result from stdout/stderr files", async () => {
    const cwd = join(tmpdir(), `brenner-test-experiment-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const stdoutPath = join(cwd, "stdout.txt");
    const stderrPath = join(cwd, "stderr.txt");
    writeFileSync(stdoutPath, "hello from stdout\n", "utf8");
    writeFileSync(stderrPath, "hello from stderr\n", "utf8");

    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T1";

    const result = await runCli(
      ["experiment", "record", "--thread-id", threadId, "--test-id", testId, "--exit-code", "0", "--stdout-file", stdoutPath, "--stderr-file", stderrPath],
      { cwd }
    );

    expect(result.exitCode).toBe(0);
    const outFile = result.stdout.trim();
    expect(outFile).toContain("artifacts");

    const raw = readFileSync(outFile, "utf8");
    let parsed: {
      schema_version: string;
      capture_mode: string;
      thread_id: string;
      test_id: string;
      exit_code: number;
      stdout: string;
      stderr: string;
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Expected valid ExperimentResult JSON at ${outFile}. Parse failed: ${msg}\n\nContents:\n${raw}\n\nCLI:\n${formatCliDebug(result)}`
      );
    }

    expect(parsed.schema_version).toBe("experiment_result_v0.1");
    expect(parsed.capture_mode).toBe("record");
    expect(parsed.thread_id).toBe(threadId);
    expect(parsed.test_id).toBe(testId);
    expect(parsed.exit_code).toBe(0);
    expect(parsed.stdout).toContain("hello from stdout");
    expect(parsed.stderr).toContain("hello from stderr");
  });

  it("runs a command and captures stdout/stderr and exit code", async () => {
    const cwd = join(tmpdir(), `brenner-test-experiment-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T2";

    const result = await runCli(
      [
        "experiment",
        "run",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--timeout",
        "10",
        "--",
        process.execPath,
        "-e",
        "console.log('hi'); console.error('err'); process.exit(3);",
      ],
      { cwd, timeout: 30000 }
    );

    expect(result.exitCode).toBe(0);
    const outFile = result.stdout.trim();
    const raw = readFileSync(outFile, "utf8");
    let parsed: {
      schema_version: string;
      capture_mode: string;
      thread_id: string;
      test_id: string;
      exit_code: number;
      stdout: string;
      stderr: string;
      argv: string[];
      timeout_seconds: number;
      timed_out: boolean;
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Expected valid ExperimentResult JSON at ${outFile}. Parse failed: ${msg}\n\nContents:\n${raw}\n\nCLI:\n${formatCliDebug(result)}`
      );
    }

    expect(parsed.schema_version).toBe("experiment_result_v0.1");
    expect(parsed.capture_mode).toBe("run");
    expect(parsed.thread_id).toBe(threadId);
    expect(parsed.test_id).toBe(testId);
    expect(parsed.exit_code).toBe(3);
    expect(parsed.stdout).toContain("hi");
    expect(parsed.stderr).toContain("err");
    expect(parsed.argv[0]).toBe(process.execPath);
    expect(parsed.timeout_seconds).toBe(10);
    expect(parsed.timed_out).toBe(false);
  });

  it("times out and records timed_out flag when command exceeds timeout", async () => {
    const cwd = join(tmpdir(), `brenner-test-experiment-timeout-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T-timeout";

    // Use a sleep command that exceeds the 1s timeout
    const result = await runCli(
      [
        "experiment",
        "run",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--timeout",
        "1",
        "--",
        process.execPath,
        "-e",
        "setTimeout(() => {}, 10000);", // Sleep 10s, should be killed at 1s
      ],
      { cwd, timeout: 15000 }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Timed out after 1s");

    const outFile = result.stdout.trim().split("\n")[0]; // First line is path
    const raw = readFileSync(outFile, "utf8");
    let parsed: {
      timed_out: boolean;
      timeout_seconds: number;
      exit_code: number;
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Expected valid ExperimentResult JSON at ${outFile}. Parse failed: ${msg}\n\nContents:\n${raw}\n\nCLI:\n${formatCliDebug(result)}`
      );
    }

    expect(parsed.timed_out).toBe(true);
    expect(parsed.timeout_seconds).toBe(1);
    // Exit code may be 0, SIGTERM, or SIGKILL depending on OS
    expect(typeof parsed.exit_code).toBe("number");
  });

  it("captures provenance fields (cwd, timestamps, duration_ms)", async () => {
    const cwd = join(tmpdir(), `brenner-test-experiment-provenance-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T-provenance";

    const result = await runCli(
      [
        "experiment",
        "run",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--timeout",
        "5",
        "--",
        process.execPath,
        "-e",
        "console.log('provenance test');",
      ],
      { cwd, timeout: 10000 }
    );

    expect(result.exitCode).toBe(0);
    const outFile = result.stdout.trim();
    const raw = readFileSync(outFile, "utf8");
    let parsed: {
      cwd: string;
      started_at: string;
      finished_at: string;
      duration_ms: number;
      created_at: string;
      runtime: { platform: string; arch: string; bun_version: string };
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Expected valid ExperimentResult JSON at ${outFile}. Parse failed: ${msg}\n\nContents:\n${raw}\n\nCLI:\n${formatCliDebug(result)}`
      );
    }

    // Verify cwd is recorded
    expect(parsed.cwd).toBe(cwd);

    // Verify timestamps are valid ISO strings
    expect(new Date(parsed.created_at).toISOString()).toBe(parsed.created_at);
    expect(new Date(parsed.started_at).toISOString()).toBe(parsed.started_at);
    expect(new Date(parsed.finished_at).toISOString()).toBe(parsed.finished_at);

    // Verify duration is reasonable (> 0, < 5000ms for a simple echo)
    expect(parsed.duration_ms).toBeGreaterThan(0);
    expect(parsed.duration_ms).toBeLessThan(5000);

    // Verify runtime info is captured
    expect(parsed.runtime.platform).toBe(process.platform);
    expect(parsed.runtime.arch).toBe(process.arch);
    expect(typeof parsed.runtime.bun_version).toBe("string");
  });

  it("records experiment with non-zero exit code", async () => {
    const cwd = join(tmpdir(), `brenner-test-experiment-exitcode-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T-exitcode";

    const result = await runCli(
      [
        "experiment",
        "record",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--exit-code",
        "42",
        "--stdout",
        "output text",
        "--stderr",
        "error text",
      ],
      { cwd }
    );

    expect(result.exitCode).toBe(0);
    const outFile = result.stdout.trim();
    const raw = readFileSync(outFile, "utf8");
    let parsed: {
      capture_mode: string;
      exit_code: number;
      stdout: string;
      stderr: string;
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Expected valid ExperimentResult JSON at ${outFile}. Parse failed: ${msg}\n\nContents:\n${raw}\n\nCLI:\n${formatCliDebug(result)}`
      );
    }

    expect(parsed.capture_mode).toBe("record");
    expect(parsed.exit_code).toBe(42);
    expect(parsed.stdout).toBe("output text");
    expect(parsed.stderr).toBe("error text");
  });

  it("encodes experiment result to DELTA block (passing)", async () => {
    const cwd = join(tmpdir(), `brenner-test-encode-pass-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    // Create a mock experiment result file
    const resultId = randomUUID();
    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T1";
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: resultId,
      capture_mode: "run",
      thread_id: threadId,
      test_id: testId,
      created_at: "2025-12-31T04:00:00.000Z",
      started_at: "2025-12-31T04:00:00.000Z",
      finished_at: "2025-12-31T04:00:05.123Z",
      duration_ms: 5123,
      exit_code: 0,
      timed_out: false,
      stdout: "All tests passed",
      stderr: "",
      cwd,
      argv: ["bun", "test"],
      timeout_seconds: 60,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--json"],
      { cwd }
    );

    expect(result.exitCode).toBe(0);

    let parsed: {
      ok: boolean;
      delta: {
        operation: string;
        section: string;
        target_id: string;
        payload: {
          test_id: string;
          status: string;
          last_run: {
            result_id: string;
            exit_code: number;
            timed_out: boolean;
            duration_ms: number;
            summary: string;
          };
        };
        rationale: string;
      };
      markdown: string;
    };
    try {
      parsed = JSON.parse(result.stdout) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Expected valid JSON output from experiment encode. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`
      );
    }

    expect(parsed.ok).toBe(true);
    expect(parsed.delta.operation).toBe("EDIT");
    expect(parsed.delta.section).toBe("discriminative_tests");
    expect(parsed.delta.target_id).toBe(testId);
    expect(parsed.delta.payload.test_id).toBe(testId);
    expect(parsed.delta.payload.status).toBe("passed");
    expect(parsed.delta.payload.last_run.result_id).toBe(resultId);
    expect(parsed.delta.payload.last_run.exit_code).toBe(0);
    expect(parsed.delta.payload.last_run.timed_out).toBe(false);
    expect(parsed.delta.payload.last_run.duration_ms).toBe(5123);
    expect(parsed.delta.payload.last_run.summary).toContain("exit 0");
    expect(parsed.delta.payload.last_run.summary).toContain("5.1s");
    expect(parsed.markdown).toContain("```delta");
    expect(parsed.markdown).toContain("## Deltas");
  });

  it("encodes experiment result to DELTA block (failed)", async () => {
    const cwd = join(tmpdir(), `brenner-test-encode-fail-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const resultId = randomUUID();
    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T2";
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: resultId,
      capture_mode: "run",
      thread_id: threadId,
      test_id: testId,
      created_at: "2025-12-31T04:00:00.000Z",
      started_at: "2025-12-31T04:00:00.000Z",
      finished_at: "2025-12-31T04:00:03.500Z",
      duration_ms: 3500,
      exit_code: 1,
      timed_out: false,
      stdout: "",
      stderr: "AssertionError",
      cwd,
      argv: ["bun", "test"],
      timeout_seconds: 60,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--json"],
      { cwd }
    );

    expect(result.exitCode).toBe(0);

    let parsed: {
      ok: boolean;
      delta: {
        payload: {
          status: string;
          last_run: {
            exit_code: number;
            summary: string;
          };
        };
      };
    };
    try {
      parsed = JSON.parse(result.stdout) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected valid JSON output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }

    expect(parsed.ok).toBe(true);
    expect(parsed.delta.payload.status).toBe("failed");
    expect(parsed.delta.payload.last_run.exit_code).toBe(1);
    expect(parsed.delta.payload.last_run.summary).toContain("exit 1");
  });

  it("encodes experiment result to DELTA block (timed out)", async () => {
    const cwd = join(tmpdir(), `brenner-test-encode-timeout-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const resultId = randomUUID();
    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T3";
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: resultId,
      capture_mode: "run",
      thread_id: threadId,
      test_id: testId,
      created_at: "2025-12-31T04:00:00.000Z",
      started_at: "2025-12-31T04:00:00.000Z",
      finished_at: "2025-12-31T04:01:00.000Z",
      duration_ms: 60000,
      exit_code: 143,
      timed_out: true,
      timeout_seconds: 60,
      stdout: "",
      stderr: "",
      cwd,
      argv: ["long-running-test"],
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--json"],
      { cwd }
    );

    expect(result.exitCode).toBe(0);

    let parsed: {
      ok: boolean;
      delta: {
        payload: {
          status: string;
          last_run: {
            timed_out: boolean;
            summary: string;
          };
        };
      };
    };
    try {
      parsed = JSON.parse(result.stdout) as typeof parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected valid JSON output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }

    expect(parsed.ok).toBe(true);
    expect(parsed.delta.payload.status).toBe("blocked");
    expect(parsed.delta.payload.last_run.timed_out).toBe(true);
    expect(parsed.delta.payload.last_run.summary).toContain("timed out");
    expect(parsed.delta.payload.last_run.summary).toContain("60s");
  });

  it("fails with clear error when result file is missing required fields", async () => {
    const cwd = join(tmpdir(), `brenner-test-encode-missing-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const resultFile = join(cwd, "result.json");

    // Missing result_id and test_id
    const mockResult = {
      schema_version: "experiment_result_v0.1",
      thread_id: "RS-TEST",
      exit_code: 0,
      timed_out: false,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd],
      { cwd }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing required field");
  });

  it("fails with clear error when result file does not exist", async () => {
    const cwd = join(tmpdir(), `brenner-test-encode-nofile-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const result = await runCli(
      ["experiment", "encode", "--result-file", "nonexistent.json", "--project-key", cwd],
      { cwd }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot read result file");
  });

  it("outputs markdown by default (non-json mode)", async () => {
    const cwd = join(tmpdir(), `brenner-test-encode-md-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const resultId = randomUUID();
    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T1";
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: resultId,
      capture_mode: "run",
      thread_id: threadId,
      test_id: testId,
      created_at: "2025-12-31T04:00:00.000Z",
      started_at: "2025-12-31T04:00:00.000Z",
      finished_at: "2025-12-31T04:00:05.000Z",
      duration_ms: 5000,
      exit_code: 0,
      timed_out: false,
      stdout: "pass",
      stderr: "",
      cwd,
      argv: ["test"],
      timeout_seconds: 60,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd],
      { cwd }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## Deltas");
    expect(result.stdout).toContain("```delta");
    expect(result.stdout).toContain('"operation": "EDIT"');
    expect(result.stdout).toContain('"section": "discriminative_tests"');
  });

  it("writes output to file when --out-file is specified", async () => {
    const cwd = join(tmpdir(), `brenner-test-encode-outfile-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const resultId = randomUUID();
    const threadId = `RS-TEST-${randomUUID()}`;
    const testId = "T1";
    const resultFile = join(cwd, "result.json");
    const outFile = join(cwd, "delta.md");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: resultId,
      capture_mode: "run",
      thread_id: threadId,
      test_id: testId,
      created_at: "2025-12-31T04:00:00.000Z",
      started_at: "2025-12-31T04:00:00.000Z",
      finished_at: "2025-12-31T04:00:05.000Z",
      duration_ms: 5000,
      exit_code: 0,
      timed_out: false,
      stdout: "pass",
      stderr: "",
      cwd,
      argv: ["test"],
      timeout_seconds: 60,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--out-file", outFile],
      { cwd }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(outFile);

    const written = readFileSync(outFile, "utf8");
    expect(written).toContain("## Deltas");
    expect(written).toContain("```delta");
  });
});

// ============================================================================
// Tests: Experiment Encode with Golden Fixtures + Delta Parser Validation
// ============================================================================

/**
 * These tests use golden fixture files and validate that:
 * 1. The encoder produces valid output
 * 2. The output parses correctly via delta-parser
 * 3. The parsed delta matches expected structure
 */
describe("experiment encode golden fixtures", () => {
  const fixturesDir = join(import.meta.dir, "fixtures", "experiment-results");

  it("encodes passed fixture and validates via delta-parser", async () => {
    const cwd = join(tmpdir(), `brenner-test-fixture-passed-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    // Copy fixture to temp dir
    const fixtureContent = readFileSync(join(fixturesDir, "passed.json"), "utf8");
    const resultFile = join(cwd, "passed.json");
    writeFileSync(resultFile, fixtureContent, "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--json"],
      { cwd }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as { ok: boolean; delta: object; markdown: string };
    expect(parsed.ok).toBe(true);

    // Import delta-parser dynamically and validate
    const { parseDeltaMessage } = await import("./apps/web/src/lib/delta-parser.ts");
    const parseResult = parseDeltaMessage(parsed.markdown);

    expect(parseResult.totalBlocks).toBe(1);
    expect(parseResult.validCount).toBe(1);
    expect(parseResult.invalidCount).toBe(0);

    const delta = parseResult.deltas[0];
    expect(delta?.valid).toBe(true);
    if (delta?.valid) {
      expect(delta.operation).toBe("EDIT");
      expect(delta.section).toBe("discriminative_tests");
      expect(delta.target_id).toBe("T1");
    }
  });

  it("encodes failed fixture and validates via delta-parser", async () => {
    const cwd = join(tmpdir(), `brenner-test-fixture-failed-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const fixtureContent = readFileSync(join(fixturesDir, "failed.json"), "utf8");
    const resultFile = join(cwd, "failed.json");
    writeFileSync(resultFile, fixtureContent, "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--json"],
      { cwd }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as { ok: boolean; delta: { payload: { status: string } }; markdown: string };
    expect(parsed.ok).toBe(true);
    expect(parsed.delta.payload.status).toBe("failed");

    const { parseDeltaMessage } = await import("./apps/web/src/lib/delta-parser.ts");
    const parseResult = parseDeltaMessage(parsed.markdown);

    expect(parseResult.totalBlocks).toBe(1);
    expect(parseResult.validCount).toBe(1);
    expect(parseResult.invalidCount).toBe(0);

    const delta = parseResult.deltas[0];
    expect(delta?.valid).toBe(true);
    if (delta?.valid) {
      expect(delta.operation).toBe("EDIT");
      expect(delta.section).toBe("discriminative_tests");
      expect(delta.target_id).toBe("T2");
    }
  });

  it("encodes blocked-timeout fixture and validates via delta-parser", async () => {
    const cwd = join(tmpdir(), `brenner-test-fixture-timeout-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const fixtureContent = readFileSync(join(fixturesDir, "blocked-timeout.json"), "utf8");
    const resultFile = join(cwd, "blocked-timeout.json");
    writeFileSync(resultFile, fixtureContent, "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--json"],
      { cwd }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as { ok: boolean; delta: { payload: { status: string } }; markdown: string };
    expect(parsed.ok).toBe(true);
    expect(parsed.delta.payload.status).toBe("blocked");

    const { parseDeltaMessage } = await import("./apps/web/src/lib/delta-parser.ts");
    const parseResult = parseDeltaMessage(parsed.markdown);

    expect(parseResult.totalBlocks).toBe(1);
    expect(parseResult.validCount).toBe(1);
    expect(parseResult.invalidCount).toBe(0);

    const delta = parseResult.deltas[0];
    expect(delta?.valid).toBe(true);
    if (delta?.valid) {
      expect(delta.operation).toBe("EDIT");
      expect(delta.section).toBe("discriminative_tests");
      expect(delta.target_id).toBe("T3");
    }
  });

  it("encodes record-manual fixture and validates via delta-parser", async () => {
    const cwd = join(tmpdir(), `brenner-test-fixture-manual-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const fixtureContent = readFileSync(join(fixturesDir, "record-manual.json"), "utf8");
    const resultFile = join(cwd, "record-manual.json");
    writeFileSync(resultFile, fixtureContent, "utf8");

    const result = await runCli(
      ["experiment", "encode", "--result-file", resultFile, "--project-key", cwd, "--json"],
      { cwd }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as { ok: boolean; delta: { payload: { status: string } }; markdown: string };
    expect(parsed.ok).toBe(true);
    expect(parsed.delta.payload.status).toBe("passed");

    const { parseDeltaMessage } = await import("./apps/web/src/lib/delta-parser.ts");
    const parseResult = parseDeltaMessage(parsed.markdown);

    expect(parseResult.totalBlocks).toBe(1);
    expect(parseResult.validCount).toBe(1);
    expect(parseResult.invalidCount).toBe(0);

    const delta = parseResult.deltas[0];
    expect(delta?.valid).toBe(true);
    if (delta?.valid) {
      expect(delta.operation).toBe("EDIT");
      expect(delta.section).toBe("discriminative_tests");
      expect(delta.target_id).toBe("T4");
    }
  });

  it("validates all fixtures are present", async () => {
    const expectedFixtures = ["passed.json", "failed.json", "blocked-timeout.json", "record-manual.json"];
    for (const fixture of expectedFixtures) {
      const fixturePath = join(fixturesDir, fixture);
      expect(() => readFileSync(fixturePath, "utf8")).not.toThrow();
    }
  });
});

// ============================================================================
// Tests: Experiment Post Validation
// ============================================================================

describe("experiment post validation", () => {
  it("requires --result-file flag", async () => {
    const result = await runCli(["experiment", "post", "--sender", "TestAgent", "--to", "Agent"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--result-file");
  });

  it("requires --sender flag", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-sender-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");
    writeFileSync(resultFile, "{}", "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--sender");
  });

  it("requires --to flag", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-to-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");
    writeFileSync(resultFile, "{}", "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--sender", "TestAgent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--to");
  });

  it("fails with clear error when result file is missing", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-nofile-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const result = await runCli(
      ["experiment", "post", "--result-file", "nonexistent.json", "--sender", "TestAgent", "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot read result file");
  });

  it("fails with clear error when result file is missing required fields", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-missing-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");

    // Missing all required fields
    const mockResult = { schema_version: "experiment_result_v0.1" };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--sender", "TestAgent", "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing required field");
  });

  it("validates result file has result_id", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-resultid-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      test_id: "T1",
      thread_id: "RS-TEST",
      exit_code: 0,
      timed_out: false,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--sender", "TestAgent", "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("result_id");
  });

  it("validates result file has test_id", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-testid-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: randomUUID(),
      thread_id: "RS-TEST",
      exit_code: 0,
      timed_out: false,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--sender", "TestAgent", "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("test_id");
  });

  it("validates result file has thread_id", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-threadid-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: randomUUID(),
      test_id: "T1",
      exit_code: 0,
      timed_out: false,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--sender", "TestAgent", "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("thread_id");
  });

  it("validates result file has exit_code", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-exitcode-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: randomUUID(),
      test_id: "T1",
      thread_id: "RS-TEST",
      timed_out: false,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--sender", "TestAgent", "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("exit_code");
  });

  it("validates result file has timed_out", async () => {
    const cwd = join(tmpdir(), `brenner-test-post-timedout-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });
    const resultFile = join(cwd, "result.json");

    const mockResult = {
      schema_version: "experiment_result_v0.1",
      result_id: randomUUID(),
      test_id: "T1",
      thread_id: "RS-TEST",
      exit_code: 0,
    };
    writeFileSync(resultFile, JSON.stringify(mockResult, null, 2), "utf8");

    const result = await runCli(
      ["experiment", "post", "--result-file", resultFile, "--sender", "TestAgent", "--to", "Agent", "--project-key", cwd],
      { cwd }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("timed_out");
  });
});

// ============================================================================
// Tests: Experiment E2E Pipeline
// ============================================================================

describe("experiment E2E pipeline", () => {
  it("run → encode pipeline produces valid DELTA blocks", async () => {
    const cwd = join(tmpdir(), `brenner-e2e-run-encode-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-E2E-${randomUUID()}`;
    const testId = "T1";

    // Step 1: Run an experiment
    const runResult = await runCli(
      [
        "experiment",
        "run",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--timeout",
        "10",
        "--",
        process.execPath,
        "-e",
        "console.log('E2E test output'); process.exit(0);",
      ],
      { cwd, timeout: 15000 }
    );

    expect(runResult.exitCode).toBe(0);
    const resultFilePath = runResult.stdout.trim();
    expect(existsSync(resultFilePath)).toBe(true);

    // Step 2: Encode the result
    const encodeResult = await runCli(
      [
        "experiment",
        "encode",
        "--result-file",
        resultFilePath,
        "--project-key",
        cwd,
        "--json",
      ],
      { cwd }
    );

    expect(encodeResult.exitCode).toBe(0);

    let encodeOutput: {
      ok: boolean;
      delta: {
        operation: string;
        section: string;
        target_id: string;
        payload: {
          test_id: string;
          status: string;
          last_run: {
            result_id: string;
            exit_code: number;
            timed_out: boolean;
            summary: string;
          };
        };
        rationale: string;
      };
      markdown: string;
    };
    try {
      encodeOutput = JSON.parse(encodeResult.stdout) as typeof encodeOutput;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected valid JSON from encode. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(encodeResult)}`);
    }

    // Verify the delta structure
    expect(encodeOutput.ok).toBe(true);
    expect(encodeOutput.delta.operation).toBe("EDIT");
    expect(encodeOutput.delta.section).toBe("discriminative_tests");
    expect(encodeOutput.delta.target_id).toBe(testId);
    expect(encodeOutput.delta.payload.status).toBe("passed");
    expect(encodeOutput.delta.payload.last_run.exit_code).toBe(0);
    expect(encodeOutput.delta.payload.last_run.timed_out).toBe(false);

    // Step 3: Verify markdown contains parseable delta block
    const deltaBlockMatch = encodeOutput.markdown.match(/```delta\s*\n([\s\S]*?)```/);
    expect(deltaBlockMatch).not.toBeNull();

    if (deltaBlockMatch) {
      const deltaJson = deltaBlockMatch[1].trim();
      let parsedDelta: unknown;
      try {
        parsedDelta = JSON.parse(deltaJson);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Delta block JSON is invalid: ${msg}\n\nBlock:\n${deltaJson}`);
      }
      expect(parsedDelta).toEqual(encodeOutput.delta);
    }
  });

  it("run → encode pipeline handles failing commands correctly", async () => {
    const cwd = join(tmpdir(), `brenner-e2e-run-fail-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-E2E-${randomUUID()}`;
    const testId = "T-fail";

    // Run an experiment that fails
    const runResult = await runCli(
      [
        "experiment",
        "run",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--timeout",
        "10",
        "--",
        process.execPath,
        "-e",
        "console.error('Test failure'); process.exit(1);",
      ],
      { cwd, timeout: 15000 }
    );

    expect(runResult.exitCode).toBe(0);
    const resultFilePath = runResult.stdout.trim();

    // Encode the result
    const encodeResult = await runCli(
      [
        "experiment",
        "encode",
        "--result-file",
        resultFilePath,
        "--project-key",
        cwd,
        "--json",
      ],
      { cwd }
    );

    expect(encodeResult.exitCode).toBe(0);

    const encodeOutput = JSON.parse(encodeResult.stdout) as {
      ok: boolean;
      delta: {
        payload: {
          status: string;
          last_run: {
            exit_code: number;
            summary: string;
          };
        };
      };
    };

    expect(encodeOutput.ok).toBe(true);
    expect(encodeOutput.delta.payload.status).toBe("failed");
    expect(encodeOutput.delta.payload.last_run.exit_code).toBe(1);
  });

  it("run → encode pipeline handles timeouts correctly", async () => {
    const cwd = join(tmpdir(), `brenner-e2e-run-timeout-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-E2E-${randomUUID()}`;
    const testId = "T-timeout";

    // Run an experiment that times out
    const runResult = await runCli(
      [
        "experiment",
        "run",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--timeout",
        "1",
        "--",
        process.execPath,
        "-e",
        "setTimeout(() => {}, 10000);", // Sleep 10s, times out at 1s
      ],
      { cwd, timeout: 15000 }
    );

    expect(runResult.exitCode).toBe(0);
    const resultFilePath = runResult.stdout.trim().split("\n")[0];

    // Encode the result
    const encodeResult = await runCli(
      [
        "experiment",
        "encode",
        "--result-file",
        resultFilePath,
        "--project-key",
        cwd,
        "--json",
      ],
      { cwd }
    );

    expect(encodeResult.exitCode).toBe(0);

    const encodeOutput = JSON.parse(encodeResult.stdout) as {
      ok: boolean;
      delta: {
        payload: {
          status: string;
          last_run: {
            timed_out: boolean;
            summary: string;
          };
        };
      };
    };

    expect(encodeOutput.ok).toBe(true);
    expect(encodeOutput.delta.payload.status).toBe("blocked");
    expect(encodeOutput.delta.payload.last_run.timed_out).toBe(true);
    expect(encodeOutput.delta.payload.last_run.summary).toContain("timed out");
  });

  it("full pipeline: run captures output, encode generates valid delta for artifact merge", async () => {
    const cwd = join(tmpdir(), `brenner-e2e-full-${randomUUID()}`);
    mkdirSync(cwd, { recursive: true });

    const threadId = `RS-E2E-${randomUUID()}`;
    const testId = "T-full-e2e";

    // Step 1: Run with specific output
    const expectedOutput = "E2E integration test passed successfully";
    const runResult = await runCli(
      [
        "experiment",
        "run",
        "--thread-id",
        threadId,
        "--test-id",
        testId,
        "--timeout",
        "10",
        "--json",
        "--",
        process.execPath,
        "-e",
        `console.log('${expectedOutput}'); process.exit(0);`,
      ],
      { cwd, timeout: 15000 }
    );

    expect(runResult.exitCode).toBe(0);

    const runOutput = JSON.parse(runResult.stdout) as {
      ok: boolean;
      out_file: string;
      result: {
        result_id: string;
        test_id: string;
        thread_id: string;
        exit_code: number;
        timed_out: boolean;
        stdout: string;
        started_at: string;
        finished_at: string;
        duration_ms: number;
        cwd: string;
      };
    };

    expect(runOutput.ok).toBe(true);
    expect(runOutput.result.test_id).toBe(testId);
    expect(runOutput.result.thread_id).toBe(threadId);
    expect(runOutput.result.exit_code).toBe(0);
    expect(runOutput.result.timed_out).toBe(false);
    expect(runOutput.result.stdout).toContain(expectedOutput);
    expect(runOutput.result.duration_ms).toBeGreaterThan(0);

    // Step 2: Encode
    const encodeResult = await runCli(
      [
        "experiment",
        "encode",
        "--result-file",
        runOutput.out_file,
        "--project-key",
        cwd,
        "--json",
      ],
      { cwd }
    );

    expect(encodeResult.exitCode).toBe(0);

    const encodeOutput = JSON.parse(encodeResult.stdout) as {
      ok: boolean;
      delta: {
        operation: string;
        section: string;
        target_id: string;
        payload: {
          test_id: string;
          status: string;
          last_run: {
            result_id: string;
            result_path: string;
            run_at: string;
            exit_code: number;
            timed_out: boolean;
            duration_ms: number;
            summary: string;
          };
        };
        rationale: string;
      };
      markdown: string;
    };

    // Verify complete data preservation
    expect(encodeOutput.delta.payload.test_id).toBe(testId);
    expect(encodeOutput.delta.payload.last_run.result_id).toBe(runOutput.result.result_id);
    expect(encodeOutput.delta.payload.last_run.exit_code).toBe(0);
    expect(encodeOutput.delta.payload.last_run.timed_out).toBe(false);
    expect(encodeOutput.delta.payload.last_run.duration_ms).toBe(runOutput.result.duration_ms);
    expect(encodeOutput.delta.payload.last_run.run_at).toBe(runOutput.result.started_at);
    expect(encodeOutput.delta.payload.status).toBe("passed");

    // Verify result_path points to the artifact file
    expect(encodeOutput.delta.payload.last_run.result_path).toContain("artifacts");
    expect(encodeOutput.delta.payload.last_run.result_path).toContain(testId);

    // Verify rationale includes result_id prefix
    expect(encodeOutput.delta.rationale).toContain(runOutput.result.result_id.slice(0, 8));
  });
});

// ============================================================================
// Tests: Version Output
// ============================================================================

describe("version output", () => {
  it("supports --version flag", async () => {
    const result = await runCli(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("brenner");
    expect(result.stdout).toContain("git:");
    expect(result.stdout).toContain("built:");
    expect(result.stdout).toContain("target:");
  });

  it("supports version command", async () => {
    const result = await runCli(["version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("brenner");
  });
});

// ============================================================================
// Tests: Corpus Search Command
// ============================================================================

describe("corpus search command", () => {
  it("returns ranked hits with anchors (json mode)", async () => {
    const result = await runCli(
      ["corpus", "search", "Brenner", "--docs", "transcript", "--limit", "3", "--json"],
      { timeout: 30000 }
    );

    expect(result.exitCode).toBe(0);

    let parsed: { hits: Array<{ docId: string; anchor?: string }>; filters?: { docIds?: string[] } };
    try {
      parsed = JSON.parse(result.stdout) as { hits: Array<{ docId: string; anchor?: string }>; filters?: { docIds?: string[] } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected corpus search --json output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }

    expect(parsed.hits.length).toBeGreaterThan(0);
    expect(parsed.hits.length).toBeLessThanOrEqual(3);
    for (const hit of parsed.hits) {
      expect(hit.docId).toBe("transcript");
      expect(hit.anchor ?? "").toMatch(/^§\d+/);
    }
  });

  it("requires a query", async () => {
    const result = await runCli(["corpus", "search"], { timeout: 10000 });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing query");
  });

  it("works when executed from a repo subdirectory (auto-detects apps/web)", async () => {
    const repoSubdir = resolve(__dirname, "apps", "web", "src");
    const result = await runCli(
      ["corpus", "search", "Brenner", "--docs", "transcript", "--limit", "1", "--json"],
      { timeout: 30000, cwd: repoSubdir }
    );

    expect(result.exitCode).toBe(0);

    let parsed: { hits: Array<{ docId: string }> };
    try {
      parsed = JSON.parse(result.stdout) as { hits: Array<{ docId: string }> };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected corpus search --json output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }
    expect(parsed.hits.length).toBeGreaterThan(0);
    expect(parsed.hits[0]?.docId).toBe("transcript");
  });
});

// ============================================================================
// Tests: Lint Command
// ============================================================================

describe("lint command", () => {
  const fixturesDir = resolve(__dirname, "apps", "web", "src", "lib", "__fixtures__", "linter");
  const validPath = join(fixturesDir, "valid-artifact.json");
  const warningPath = join(fixturesDir, "warning-artifact.json");
  const invalidPath = join(fixturesDir, "invalid-artifact.json");

  it("reports VALID for a valid artifact (human output)", async () => {
    const result = await runCli(["lint", validPath]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Artifact Linter Report");
    expect(result.stdout).toContain("Status: VALID");
  });

  it("reports VALID for a warning-only artifact (human output)", async () => {
    const result = await runCli(["lint", warningPath]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Status: VALID");
    expect(result.stdout).toContain("Warnings");
  });

  it("reports INVALID and exits 1 for an invalid artifact (human output)", async () => {
    const result = await runCli(["lint", invalidPath]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Status: INVALID");
    expect(result.stdout).toContain("Errors (must fix):");
  });

  it("supports --json output", async () => {
    const result = await runCli(["lint", validPath, "--json"]);
    expect(result.exitCode).toBe(0);

    let parsed: { artifact: string; valid: boolean; summary: { errors: number; warnings: number; info: number } };
    try {
      parsed = JSON.parse(result.stdout) as {
        artifact: string;
        valid: boolean;
        summary: { errors: number; warnings: number; info: number };
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected lint --json output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }

    expect(parsed.artifact).toBe("GOLDEN-VALID-001");
    expect(parsed.valid).toBe(true);
    expect(parsed.summary.errors).toBe(0);
  });
});

// ============================================================================
// Tests: Upgrade Command
// ============================================================================

describe("upgrade command", () => {
  it("prints canonical installer commands", async () => {
    const result = await runCli(["upgrade"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Brenner Upgrade");
    expect(result.stdout).toContain("install.sh");
    expect(result.stdout).toContain("curl -fsSL");
  });

  it("uses the provided --version in the example snippet", async () => {
    const result = await runCli(["upgrade", "--version", "0.1.0"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('export VERSION="0.1.0"');
    expect(result.stdout).toContain('--version "${VERSION}"');
  });
});

// ============================================================================
// Tests: Doctor Command
// ============================================================================

describe("doctor command", () => {
  it("doctor --json works without requiring external tools when skipped", async () => {
    const result = await runCli([
      "doctor",
      "--json",
      "--skip-ntm",
      "--skip-cass",
      "--skip-cm",
    ]);

    expect(result.exitCode).toBe(0);

    let parsed: {
      status: string;
      checks: Record<string, { status: string }>;
    };

    try {
      parsed = JSON.parse(result.stdout) as {
        status: string;
        checks: Record<string, { status: string }>;
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected brenner doctor --json output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }

    expect(parsed.status).toBe("ok");
    expect(parsed.checks.ntm.status).toBe("skipped");
    expect(parsed.checks.cass.status).toBe("skipped");
    expect(parsed.checks.cm.status).toBe("skipped");
    expect(parsed.checks.agentMail.status).toBe("skipped");
  });

  it("doctor --json includes agent CLI checks", async () => {
    const result = await runCli([
      "doctor",
      "--json",
      "--skip-ntm",
      "--skip-cass",
      "--skip-cm",
    ]);

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      status: string;
      checks: Record<string, { status: string; path?: string | null; binaries?: string[] }>;
    };

    // Agent CLI checks should be present (ok, missing, or error - depending on what's installed)
    expect(parsed.checks.claude).toBeDefined();
    expect(parsed.checks.codex).toBeDefined();
    expect(parsed.checks.agy).toBeDefined();

    // Each should have a status
    expect(["ok", "missing", "error"]).toContain(parsed.checks.claude.status);
    expect(["ok", "missing", "error"]).toContain(parsed.checks.codex.status);
    expect(["ok", "missing", "error"]).toContain(parsed.checks.agy.status);
  });

  it("doctor --json --skip-agents skips agent CLI checks", async () => {
    const result = await runCli([
      "doctor",
      "--json",
      "--skip-ntm",
      "--skip-cass",
      "--skip-cm",
      "--skip-agents",
    ]);

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      status: string;
      checks: Record<string, { status: string }>;
    };

    // Agent CLI checks should be skipped
    expect(parsed.checks.claude.status).toBe("skipped");
    expect(parsed.checks.codex.status).toBe("skipped");
    expect(parsed.checks.agy.status).toBe("skipped");
  });

  it("doctor without --skip-agents reports agent CLI presence", async () => {
    const result = await runCli([
      "doctor",
      "--json",
      "--skip-ntm",
      "--skip-cass",
      "--skip-cm",
    ]);

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      status: string;
      checks: Record<string, { status: string; path?: string | null }>;
    };

    // If an agent CLI is found, it should have a path
    if (parsed.checks.claude.status === "ok") {
      expect(parsed.checks.claude.path).toBeTruthy();
    }
    if (parsed.checks.codex.status === "ok") {
      expect(parsed.checks.codex.path).toBeTruthy();
    }
    if (parsed.checks.agy.status === "ok") {
      expect(parsed.checks.agy.path).toBeTruthy();
    }
  });

  it("doctor --robot runs a zero-cost robot-step smoke test and reports it as a check", async () => {
    const result = await runCli(
      [
        "doctor", "--json",
        "--skip-ntm", "--skip-cass", "--skip-cm", "--skip-agents",
        "--robot",
      ],
      { timeout: 30000 },
    );
    expect(result.exitCode, formatCliDebug(result)).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      checks: Record<string, { status: string; notes?: string | null }>;
    };
    expect(parsed.checks.robotPipeline).toBeDefined();
    expect(parsed.checks.robotPipeline.status).toBe("ok");
  });

  it("doctor without --robot does not run the robot-step smoke test", async () => {
    const result = await runCli([
      "doctor", "--json",
      "--skip-ntm", "--skip-cass", "--skip-cm", "--skip-agents",
    ]);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout) as { checks: Record<string, unknown> };
    expect(parsed.checks.robotPipeline).toBeUndefined();
  });
});

// ============================================================================
// Tests: Unknown Commands
// ============================================================================

describe("unknown commands", () => {
  it("rejects unknown top-level command", async () => {
    const result = await runCli(["foobar"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  it("rejects unknown mail subcommand", async () => {
    const result = await runCli(["mail", "foobar"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown mail command");
  });

  it("rejects prompt without subcommand", async () => {
    const result = await runCli(["prompt"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  it("rejects session without subcommand", async () => {
    const result = await runCli(["session"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });
});

// ============================================================================
// Tests: Session Dispatch Integrity
// ============================================================================
//
// A rebase or merge can silently land two independent implementations of the
// same command (same dispatch condition, different bodies) without a git
// conflict, if unrelated hunks shift line offsets enough that the 3-way merge
// never sees them as overlapping. Only the first block in the file ever
// executes; the second is silent dead code. This happened for real once
// already in this branch's own history (a duplicate "robot-stress" handler
// survived a clean-looking rebase) — this test guards against a repeat.

describe("session dispatch integrity", () => {
  it("has no duplicate 'session <sub>' dispatch blocks in brenner.ts", () => {
    const source = readFileSync(CLI_PATH, "utf8");
    const pattern = /normalizedTop === "session" && sub === "([a-z-]+)"/g;
    const seen = new Map<string, number>();
    const duplicates: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const sub = match[1];
      const count = (seen.get(sub) ?? 0) + 1;
      seen.set(sub, count);
      if (count === 2) duplicates.push(sub);
    }
    expect(duplicates).toEqual([]);
  });
});

// ============================================================================
// Tests: session robot-step (HITL orchestration — no live LLM calls)
// ============================================================================
//
// These use /bin/echo in place of the real claude/codex/agy binaries so the
// full round pipeline (arg validation, prompt build, spawn, output capture,
// delta parse, merge, lint, persist) runs for real, at zero API cost. /bin/echo
// echoes its args back, which happens to include the literal example delta
// fences from the prompt instructions, so parsing sees real (if nonsensical)
// delta blocks — that's fine, these tests assert plumbing, not agent quality.

const FAKE_AGENT_BIN_FLAGS = [
  "--claude-bin", "/bin/echo",
  "--codex-bin", "/bin/echo",
  "--agy-bin", "/bin/echo",
];

// /bin/echo satisfies BlueLake/GreenMountain (they read stdout directly) but
// RedForest reads from a file path passed via --output-last-message, which
// plain echo never writes — it always reports "error". For tests that need a
// genuinely all-success round, use a fake codex binary that writes to it.
function createFakeCodexBin(): string {
  const scriptPath = join(tmpdir(), `brenner-test-fake-codex-${randomUUID()}.sh`);
  writeFileSync(scriptPath, `#!/bin/sh\necho "fake codex output for: $5" > "$4"\n`, { mode: 0o755 });
  return trackTempPath(scriptPath);
}

function makeRobotStepSessionDir(prefix: string): string {
  const dir = createTempDir(prefix);
  writeFileSync(
    join(dir, "context.md"),
    "## Research Question\nTest only.\n\n## Background\nN/A\n\n## Evaluation Criteria\nN/A\n",
  );
  writeFileSync(join(dir, "excerpt.md"), "");
  return dir;
}

describe("session robot-step", () => {
  it("requires --session-dir", async () => {
    const result = await runCli(["session", "robot-step"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--session-dir");
  });

  it("requires --question", async () => {
    const dir = makeRobotStepSessionDir("brenner-test-robot-step");
    const result = await runCli(["session", "robot-step", "--session-dir", dir]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--question");
  });

  it("requires a valid --round (missing)", async () => {
    const dir = makeRobotStepSessionDir("brenner-test-robot-step");
    const result = await runCli([
      "session", "robot-step",
      "--session-dir", dir,
      "--question", "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--round");
  });

  it("requires a valid --round (zero is invalid)", async () => {
    const dir = makeRobotStepSessionDir("brenner-test-robot-step");
    const result = await runCli([
      "session", "robot-step",
      "--session-dir", dir,
      "--question", "Test?",
      "--round", "0",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--round");
  });

  it("fails clearly when context.md is missing", async () => {
    const dir = createTempDir("brenner-test-robot-step-nocontext");
    writeFileSync(join(dir, "excerpt.md"), "");
    const result = await runCli([
      "session", "robot-step",
      "--session-dir", dir,
      "--question", "Test?",
      "--round", "1",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("context");
  });

  it("fails clearly when excerpt.md is missing", async () => {
    const dir = createTempDir("brenner-test-robot-step-noexcerpt");
    writeFileSync(join(dir, "context.md"), "## Research Question\nTest.\n");
    const result = await runCli([
      "session", "robot-step",
      "--session-dir", dir,
      "--question", "Test?",
      "--round", "1",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("excerpt");
  });

  it("runs a full round with fake agent binaries and reports structured per-agent health", async () => {
    const dir = makeRobotStepSessionDir("brenner-test-robot-step-round");
    const result = await runCli(
      [
        "session", "robot-step",
        "--session-dir", dir,
        "--question", "Does the round-1 pipeline run end to end?",
        "--round", "1",
        ...FAKE_AGENT_BIN_FLAGS,
        "--json",
      ],
      { timeout: 20000 },
    );
    expect(result.exitCode, formatCliDebug(result)).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      ok: boolean;
      round: number;
      artifactFile: string;
      stateFile: string;
      agents: Record<string, { status: string; deltas: number; error?: string }>;
    };
    // /bin/echo doesn't understand RedForest's file-writing convention
    // (--output-last-message <path>) so RedForest always reports "error"
    // against this fake binary — ok reflects that real per-agent state.
    expect(parsed.ok).toBe(false);
    expect(parsed.round).toBe(1);
    expect(existsSync(parsed.artifactFile)).toBe(true);
    expect(existsSync(parsed.stateFile)).toBe(true);

    // The structured per-agent health field: this is the signal a HITL
    // orchestrator's "check for agent errors first" step should read
    // instead of manually scanning raw output files.
    expect(parsed.agents).toBeDefined();
    for (const name of ["BlueLake", "RedForest", "GreenMountain"]) {
      expect(parsed.agents[name]).toBeDefined();
      expect(["ok", "error"]).toContain(parsed.agents[name].status);
    }
  });

  it("writes an (empty) output file even when an agent binary fails to spawn", async () => {
    // Regression check: session robot's invokeAgent writes outFile on a spawn
    // error (nonexistent binary); robot-step's separate invokeAgentStep did
    // not, which meant a failure-diagnosis flow reading
    // round_N/{agent}_out.md would find a missing file instead of an error
    // trail for this specific failure mode.
    const dir = makeRobotStepSessionDir("brenner-test-robot-step-spawnfail");
    const result = await runCli(
      [
        "session", "robot-step",
        "--session-dir", dir,
        "--question", "Does a spawn failure still produce an out file?",
        "--round", "1",
        "--claude-bin", "/bin/echo",
        "--codex-bin", "/bin/echo",
        "--agy-bin", "/definitely/does/not/exist/agy",
        "--json",
      ],
      { timeout: 20000 },
    );
    expect(result.exitCode, formatCliDebug(result)).toBe(0);

    const outFile = join(dir, "round_1", "greenmountain_out.md");
    expect(existsSync(outFile), formatCliDebug(result)).toBe(true);

    const parsed = JSON.parse(result.stdout) as {
      agents: Record<string, { status: string; error?: string }>;
    };
    expect(parsed.agents.GreenMountain.status).toBe("error");
  });

  it("marks ok:false in the JSON output when an agent errored", async () => {
    const dir = makeRobotStepSessionDir("brenner-test-robot-step-oknotok");
    const result = await runCli(
      [
        "session", "robot-step",
        "--session-dir", dir,
        "--question", "Does ok reflect real agent health?",
        "--round", "1",
        "--claude-bin", "/bin/echo",
        "--codex-bin", "/bin/echo",
        "--agy-bin", "/definitely/does/not/exist/agy",
        "--json",
      ],
      { timeout: 20000 },
    );
    const parsed = JSON.parse(result.stdout) as { ok: boolean };
    expect(parsed.ok).toBe(false);
  });

  describe("agent-error acknowledgment gate", () => {
    async function runRoundWithBrokenAgy(dir: string, round: number) {
      return runCli(
        [
          "session", "robot-step",
          "--session-dir", dir,
          "--question", "Does the acknowledgment gate work?",
          "--round", String(round),
          "--claude-bin", "/bin/echo",
          "--codex-bin", "/bin/echo",
          "--agy-bin", "/definitely/does/not/exist/agy",
          "--json",
        ],
        { timeout: 20000 },
      );
    }

    it("refuses to run the next round after an unacknowledged agent error", async () => {
      const dir = makeRobotStepSessionDir("brenner-test-robot-step-gate");
      const round1 = await runRoundWithBrokenAgy(dir, 1);
      expect(round1.exitCode, formatCliDebug(round1)).toBe(0);

      const round2 = await runRoundWithBrokenAgy(dir, 2);
      expect(round2.exitCode, formatCliDebug(round2)).toBe(1);
      expect(round2.stderr).toContain("GreenMountain");
      expect(round2.stderr).toContain("--acknowledge-agent-errors");
    });

    it("proceeds when the operator explicitly acknowledges the prior round's errors", async () => {
      const dir = makeRobotStepSessionDir("brenner-test-robot-step-gate-ack");
      const round1 = await runRoundWithBrokenAgy(dir, 1);
      expect(round1.exitCode, formatCliDebug(round1)).toBe(0);

      const round2 = await runCli(
        [
          "session", "robot-step",
          "--session-dir", dir,
          "--question", "Does the acknowledgment gate work?",
          "--round", "2",
          "--claude-bin", "/bin/echo",
          "--codex-bin", "/bin/echo",
          "--agy-bin", "/bin/echo",
          "--acknowledge-agent-errors",
          "--json",
        ],
        { timeout: 20000 },
      );
      expect(round2.exitCode, formatCliDebug(round2)).toBe(0);
    });

    it("does not gate when the prior round had no agent errors", async () => {
      const dir = makeRobotStepSessionDir("brenner-test-robot-step-gate-clean");
      const cleanBinFlags = [
        "--claude-bin", "/bin/echo",
        "--codex-bin", createFakeCodexBin(),
        "--agy-bin", "/bin/echo",
      ];

      const round1 = await runCli(
        [
          "session", "robot-step",
          "--session-dir", dir,
          "--question", "Does a clean round avoid the gate?",
          "--round", "1",
          ...cleanBinFlags,
          "--json",
        ],
        { timeout: 20000 },
      );
      expect(round1.exitCode, formatCliDebug(round1)).toBe(0);
      const round1Parsed = JSON.parse(round1.stdout) as { ok: boolean };
      expect(round1Parsed.ok, formatCliDebug(round1)).toBe(true);

      const round2 = await runCli(
        [
          "session", "robot-step",
          "--session-dir", dir,
          "--question", "Does a clean round avoid the gate?",
          "--round", "2",
          ...cleanBinFlags,
          "--json",
        ],
        { timeout: 20000 },
      );
      expect(round2.exitCode, formatCliDebug(round2)).toBe(0);
    });
  });
});

// ============================================================================
// Tests: session robot-stress
// ============================================================================

describe("session robot-stress", () => {
  it("requires --session-dir", async () => {
    const result = await runCli(["session", "robot-stress"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--session-dir");
  });

  it("fails clearly when session_state.json is missing", async () => {
    const dir = createTempDir("brenner-test-robot-stress-nostate");
    const result = await runCli(["session", "robot-stress", "--session-dir", dir]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("session_state.json");
  });

  it("exits cleanly with no survivors when all hypotheses are killed", async () => {
    const dir = createTempDir("brenner-test-robot-stress-nosurvivors");
    const artifact = {
      metadata: {
        session_id: "TEST-001", created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z", version: 1, contributors: [], status: "draft",
      },
      sections: {
        research_thread: null,
        hypothesis_slate: [{ id: "H1", name: "Dead idea", killed: true }],
        predictions_table: [], discriminative_tests: [], assumption_ledger: [],
        anomaly_register: [], adversarial_critique: [],
      },
    };
    writeFileSync(join(dir, "session_state.json"), JSON.stringify(artifact, null, 2));

    const result = await runCli(
      ["session", "robot-stress", "--session-dir", dir, ...FAKE_AGENT_BIN_FLAGS, "--json"],
      { timeout: 20000 },
    );
    expect(result.exitCode, formatCliDebug(result)).toBe(0);
    const parsed = JSON.parse(result.stdout) as { ok: boolean; survivors: unknown[] };
    expect(parsed.ok).toBe(true);
    expect(parsed.survivors).toEqual([]);
  });
});

// ============================================================================
// Tests: session robot (fully automated, non-HITL)
// ============================================================================

describe("session robot", () => {
  it("requires --session-dir", async () => {
    const result = await runCli(["session", "robot"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--session-dir");
  });

  it("requires --question", async () => {
    const dir = makeRobotStepSessionDir("brenner-test-robot");
    const result = await runCli(["session", "robot", "--session-dir", dir]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--question");
  });

  it("fails clearly when context.md is missing", async () => {
    const dir = createTempDir("brenner-test-robot-nocontext");
    const result = await runCli([
      "session", "robot",
      "--session-dir", dir,
      "--question", "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("context");
  });

  it("runs one full round end to end with fake agent binaries", async () => {
    const dir = makeRobotStepSessionDir("brenner-test-robot-round");
    const result = await runCli(
      [
        "session", "robot",
        "--session-dir", dir,
        "--question", "Does the plain robot pipeline still run after removing upstream's --step flag?",
        "--max-rounds", "1",
        ...FAKE_AGENT_BIN_FLAGS,
        "--json",
      ],
      { timeout: 20000 },
    );
    expect(result.exitCode, formatCliDebug(result)).toBe(0);

    const parsed = JSON.parse(result.stdout) as {
      ok: boolean;
      roundsCompleted: number;
      rounds: Array<{ agents: Record<string, { status: string }> }>;
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.roundsCompleted).toBe(1);
    expect(parsed.rounds[0].agents).toBeDefined();
    for (const name of ["BlueLake", "RedForest", "GreenMountain"]) {
      expect(parsed.rounds[0].agents[name]).toBeDefined();
    }
  });
});

// ============================================================================
// Tests: Excerpt Build Command
// ============================================================================

describe("excerpt build command", () => {
  it("builds an excerpt from transcript section IDs", async () => {
    const result = await runCli(["excerpt", "build", "--sections", "1,2"], { timeout: 15000 });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("### Excerpt");
    expect(result.stdout).toContain("**Sections included**:");
    expect(result.stdout).toContain("§1");
    expect(result.stdout).toContain("§2");
  });

  it("builds an excerpt from quote bank tags (json mode)", async () => {
    const result = await runCli(["excerpt", "build", "--tags", "cheap-loop", "--limit", "2", "--json"], { timeout: 15000 });

    expect(result.exitCode).toBe(0);

    let parsed: { markdown: string; anchors: string[] };
    try {
      parsed = JSON.parse(result.stdout) as { markdown: string; anchors: string[] };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected excerpt build --json output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }

    expect(parsed.markdown).toContain("### Excerpt");
    expect(parsed.anchors).toHaveLength(2);
  });
});

// ============================================================================
// Tests: Memory Context Command
// ============================================================================

describe("memory context command", () => {
  it("fails softly when cm is missing", async () => {
    const result = await runCli(["memory", "context", "test task"], {
      env: {
        PATH: process.platform === "win32" ? "C:\\__brenner_test_empty_path__" : "/__brenner_test_empty_path__",
      },
    });

    expect(result.exitCode).toBe(1);

    let parsed: {
      ok: boolean;
      context: unknown;
      provenance: { mode: string; errors: string[] };
    };

    try {
      parsed = JSON.parse(result.stdout) as {
        ok: boolean;
        context: unknown;
        provenance: { mode: string; errors: string[] };
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Expected brenner memory context JSON output. Parse failed: ${msg}\n\nCLI:\n${formatCliDebug(result)}`);
    }

    expect(parsed.ok).toBe(false);
    expect(parsed.context).toBeNull();
    expect(parsed.provenance.mode).toBe("none");
    expect(parsed.provenance.errors.join(" ")).toContain("cm not found");
  });
});

// ============================================================================
// Tests: mail send Command Validation
// ============================================================================

describe("mail send validation", () => {
  it("requires --sender flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--to",
      "Agent",
      "--subject",
      "Test",
      "--body-file",
      "test.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--sender");
  });

  it("requires --to flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "TestAgent",
      "--subject",
      "Test",
      "--body-file",
      "test.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--to");
  });

  it("requires --subject flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "TestAgent",
      "--to",
      "Agent",
      "--body-file",
      "test.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--subject");
  });

  it("requires --body-file flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "TestAgent",
      "--to",
      "Agent",
      "--subject",
      "Test",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--body-file");
  });
});

// ============================================================================
// Tests: mail inbox Command Validation
// ============================================================================

describe("mail inbox validation", () => {
  it("requires --agent flag", async () => {
    const result = await runCli(["mail", "inbox"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--agent");
  });

  it("--summaries requires --threads", async () => {
    const result = await runCli(["mail", "inbox", "--summaries"], {
      env: { AGENT_NAME: "TestAgent" },
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--summaries");
    expect(result.stderr).toContain("--threads");
  });

  it("--summaries conflicts with --include-bodies", async () => {
    const result = await runCli(["mail", "inbox", "--threads", "--summaries", "--include-bodies"], {
      env: { AGENT_NAME: "TestAgent" },
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--include-bodies");
    expect(result.stderr).toContain("--summaries");
  });
});

// ============================================================================
// Tests: mail read Command Validation
// ============================================================================

describe("mail read validation", () => {
  it("requires --agent flag", async () => {
    const result = await runCli(["mail", "read", "--message-id", "123"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--agent");
  });

  it("requires --message-id flag", async () => {
    const result = await runCli(["mail", "read", "--agent", "TestAgent"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--message-id");
  });
});

// ============================================================================
// Tests: mail ack Command Validation
// ============================================================================

describe("mail ack validation", () => {
  it("requires --agent flag", async () => {
    const result = await runCli(["mail", "ack", "--message-id", "123"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--agent");
  });

  it("requires --message-id flag", async () => {
    const result = await runCli(["mail", "ack", "--agent", "TestAgent"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--message-id");
  });
});

// ============================================================================
// Tests: mail thread Command Validation
// ============================================================================

describe("mail thread validation", () => {
  it("requires --thread-id flag", async () => {
    const result = await runCli(["mail", "thread"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });
});

// ============================================================================
// Tests: prompt compose Command Validation
// ============================================================================

describe("prompt compose validation", () => {
  it("requires --excerpt-file flag", async () => {
    const result = await runCli(["prompt", "compose"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--excerpt-file");
  });

  it("fails on non-existent excerpt file", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "/nonexistent/file.md",
    ]);
    expect(result.exitCode).toBe(1);
    // Error message will vary by platform
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("fails on non-existent template file", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--template",
      "/nonexistent/template.md",
      "--excerpt-file",
      "README.md",
    ]);
    expect(result.exitCode).toBe(1);
  });
});

// ============================================================================
// Tests: session start Command Validation
// ============================================================================

describe("session start validation", () => {
  it("requires --sender flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--to",
      "Agent",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--sender");
  });

  it("requires --to flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--to");
  });

  it("requires --thread-id flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "Agent",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });

  it("requires --excerpt-file flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "Agent",
      "--thread-id",
      "TEST-1",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--excerpt-file");
  });

  it("requires --question flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "Agent",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--question");
  });

  it("rejects malformed --role-map entries", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "BlueLake,PurpleMountain",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
      "--role-map",
      "BlueLake",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--role-map entry");
  });

  it("rejects unknown roles in --role-map", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "BlueLake,PurpleMountain",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
      "--role-map",
      "BlueLake=not_a_role,PurpleMountain=test_designer",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid --role-map role");
  });

  it("rejects --role-map that doesn't cover all recipients", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "BlueLake,PurpleMountain",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
      "--role-map",
      "BlueLake=hypothesis_generator",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--role-map is missing entries for");
  });

  it("rejects --role-map in unified mode", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "BlueLake",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
      "--unified",
      "--role-map",
      "BlueLake=hypothesis_generator",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--role-map");
    expect(result.stderr).toContain("--unified");
  });
});

// ============================================================================
// Tests: session status Command Validation
// ============================================================================

describe("session status validation", () => {
  it("requires --thread-id flag", async () => {
    const result = await runCli(["session", "status"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });

  it("rejects non-integer --timeout value", async () => {
    const result = await runCli([
      "session",
      "status",
      "--thread-id",
      "TEST-1",
      "--timeout",
      "abc",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("expected integer");
  });

  it("accepts valid --timeout value and fails on Agent Mail connect", async () => {
    const result = await runCli([
      "session",
      "status",
      "--thread-id",
      "TEST-1",
      "--timeout",
      "60",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: session compile/write/publish Command Validation
// ============================================================================

describe("session compile validation", () => {
  it("requires --thread-id flag", async () => {
    const result = await runCli(["session", "compile"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });

  it("fails loudly when a DELTA message contains no delta fences", async () => {
    const server = new AgentMailTestServer();
    await server.start(0);

    try {
      const threadId = `TEST-DELTA-NO-FENCE-${randomUUID()}`;
      const projectKey = "/test/project";

      server.seedThread({
        projectKey,
        threadId,
        messages: [
          {
            from: "Codex",
            subject: "DELTA[gpt]: Inline JSON (invalid)",
            body_md: JSON.stringify({
              operation: "ADD",
              section: "hypothesis_slate",
              target_id: null,
              payload: { id: "H1", name: "Bad", claim: "Missing fence", mechanism: "N/A", anchors: ["inference"] },
              rationale: "This should be fenced but is not",
            }),
            created_ts: "2025-01-01T00:00:00Z",
          },
        ],
      });

      const result = await runCli(
        ["session", "compile", "--project-key", projectKey, "--thread-id", threadId, "--json"],
        { env: { AGENT_MAIL_BASE_URL: server.getBaseUrl() }, timeout: 15000 }
      );

      expect(result.exitCode).toBe(1);

      const parsed = JSON.parse(result.stdout) as unknown;
      expect(parsed).toMatchObject({
        ok: false,
        threadId,
      });

      const payload = parsed as { errors?: Array<{ code?: string; message?: string }> };
      expect(payload.errors?.[0]?.code).toBe("DELTA_NO_BLOCKS");
      expect(payload.errors?.[0]?.message).toContain("no parseable delta blocks");
    } finally {
      await server.stop();
    }
  });
});

describe("session write validation", () => {
  it("requires --thread-id flag", async () => {
    const result = await runCli(["session", "write"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });

  it("sanitizes thread-id when using the default output path", async () => {
    const result = await runCli(["session", "write", "--thread-id", "../evil"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('sanitized thread id for artifact filename: "../evil" -> "evil"');
  });
});

describe("session publish validation", () => {
  it("requires --thread-id flag", async () => {
    const result = await runCli(["session", "publish"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });

  it("requires --sender flag", async () => {
    const result = await runCli(["session", "publish", "--thread-id", "TEST-1", "--to", "Agent"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--sender");
  });

  it("requires --to flag", async () => {
    const result = await runCli(["session", "publish", "--thread-id", "TEST-1", "--sender", "Test"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--to");
  });
});

// ============================================================================
// Tests: orchestrate Alias
// ============================================================================

describe("orchestrate alias", () => {
  it("orchestrate start works like session start", async () => {
    // Both should fail with same missing arg error
    const orchestrateResult = await runCli(["orchestrate", "start"]);
    const sessionResult = await runCli(["session", "start"]);

    expect(orchestrateResult.exitCode).toBe(sessionResult.exitCode);
    // Both require --sender
    expect(orchestrateResult.stderr).toContain("--sender");
  });
});

// ============================================================================
// Tests: Flag Parsing Edge Cases
// ============================================================================

describe("flag parsing edge cases", () => {
  it("handles flag with equals sign format", async () => {
    // --help=true should still show help
    const result = await runCli(["--help=true"]);
    // This will be interpreted as a string value, but help check uses asBoolFlag
    // The CLI actually checks `asBoolFlag(flags, "help")` which returns true only for boolean true
    // So --help=true will NOT trigger help. Let's verify the behavior.
    // Actually, looking at the code: if (!top || asBoolFlag(flags, "help")...)
    // Since top is undefined here (no positional), it still shows help
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("handles multiple flags", async () => {
    const result = await runCli([
      "mail",
      "inbox",
      "--agent",
      "TestAgent",
      "--limit",
      "5",
      "--urgent-only",
      "--include-bodies",
    ]);
    // Will fail because Agent Mail is not available, but should not fail on parsing
    expect(result.exitCode).toBe(1);
    // Should not complain about missing flags
    expect(result.stderr).not.toContain("Missing --agent");
    expect(result.stderr).not.toContain("Missing --limit");
  });

  it("handles comma-separated values in --to flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "Test",
      "--to",
      "Agent1,Agent2,Agent3",
      "--subject",
      "Test",
      "--body-file",
      "README.md",
    ]);
    // Will fail on Agent Mail connect, not on parsing
    expect(result.exitCode).toBe(1);
    expect(result.stderr).not.toContain("Missing --to");
  });
});

// ============================================================================
// Tests: prompt compose (with real files)
// ============================================================================

describe("prompt compose with real files", () => {
  it("composes prompt with default template and README as excerpt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
    ]);
    // Uses default template: metaprompt_by_gpt_52.md
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## TRANSCRIPT EXCERPT(S)");
  });

  it("includes optional theme in composed prompt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--theme",
      "scientific method",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## FOCUS THEME");
    expect(result.stdout).toContain("scientific method");
  });

  it("includes optional domain in composed prompt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--domain",
      "molecular biology",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## TARGET RESEARCH DOMAIN");
    expect(result.stdout).toContain("molecular biology");
  });

  it("includes optional question in composed prompt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--question",
      "How does X work?",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## CURRENT RESEARCH QUESTION");
    expect(result.stdout).toContain("How does X work?");
  });

  it("composes prompt with all optional parameters", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--theme",
      "hypothesis testing",
      "--domain",
      "immunology",
      "--question",
      "What causes autoimmune diseases?",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## FOCUS THEME");
    expect(result.stdout).toContain("hypothesis testing");
    expect(result.stdout).toContain("## TARGET RESEARCH DOMAIN");
    expect(result.stdout).toContain("immunology");
    expect(result.stdout).toContain("## CURRENT RESEARCH QUESTION");
    expect(result.stdout).toContain("What causes autoimmune diseases?");
  });
});

// ============================================================================
// Tests: Error Message Formatting
// ============================================================================

describe("error message formatting", () => {
  it("error messages go to stderr", async () => {
    const result = await runCli(["foobar"]);
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stdout).toBe("");
  });

  it("error messages are concise", async () => {
    const result = await runCli(["mail", "send"]);
    // Error should be a single line, not a full stack trace
    const lines = result.stderr.trim().split("\n");
    expect(lines.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// Tests: Mail Command Output Formatting
// ============================================================================

describe("mail command output formatting", () => {
  it("mail health produces JSON output on connection failure", async () => {
    const result = await runCli(["mail", "health"]);
    // Will fail to connect but should still produce output
    expect(result.exitCode).toBe(1);
    // Output should indicate connection issue
    expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
  });

  it("mail tools fails gracefully when server unavailable", async () => {
    const result = await runCli(["mail", "tools"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("connect");
  });

  it("mail agents fails gracefully when server unavailable", async () => {
    const result = await runCli([
      "mail",
      "agents",
      "--project-key",
      "/tmp/test",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: Mail Command with AGENT_NAME Environment Variable
// ============================================================================

/**
 * Run CLI with custom environment variables.
 */
async function runCliWithEnv(
  args: string[],
  env: Record<string, string>,
  timeout = 5000
): Promise<CliResult> {
  return runCli(args, { env, timeout });
}

describe("AGENT_NAME environment variable", () => {
  it("mail inbox uses AGENT_NAME if --agent not provided", async () => {
    const result = await runCliWithEnv(["mail", "inbox"], {
      AGENT_NAME: "EnvAgent",
    });
    // Should not complain about missing --agent
    expect(result.stderr).not.toContain("Missing --agent");
    // Will fail on connection, not on missing arg
    expect(result.stderr).toContain("connect");
  });

  it("mail read uses AGENT_NAME if --agent not provided", async () => {
    const result = await runCliWithEnv(
      ["mail", "read", "--message-id", "123"],
      { AGENT_NAME: "EnvAgent" }
    );
    expect(result.stderr).not.toContain("Missing --agent");
    expect(result.stderr).toContain("connect");
  });

  it("mail ack uses AGENT_NAME if --agent not provided", async () => {
    const result = await runCliWithEnv(["mail", "ack", "--message-id", "123"], {
      AGENT_NAME: "EnvAgent",
    });
    expect(result.stderr).not.toContain("Missing --agent");
    expect(result.stderr).toContain("connect");
  });

  it("mail send uses AGENT_NAME if --sender not provided", async () => {
    const result = await runCliWithEnv(
      [
        "mail",
        "send",
        "--to",
        "Agent",
        "--subject",
        "Test",
        "--body-file",
        "README.md",
      ],
      { AGENT_NAME: "EnvAgent" }
    );
    expect(result.stderr).not.toContain("Missing --sender");
    // Will fail on connection
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: Default Values
// ============================================================================

describe("default values", () => {
  it("mail inbox uses default limit of 20", async () => {
    const result = await runCliWithEnv(["mail", "inbox"], {
      AGENT_NAME: "TestAgent",
    });
    // Can't directly verify limit, but should not error on missing limit
    expect(result.stderr).not.toContain("limit");
  });

  it("session start uses cwd as default project-key", async () => {
    const result = await runCliWithEnv(
      [
        "session",
        "start",
        "--to",
        "Agent",
        "--thread-id",
        "TEST-1",
        "--excerpt-file",
        "README.md",
        "--question",
        "Test?",
      ],
      { AGENT_NAME: "TestAgent" }
    );
    // Should not complain about missing --project-key
    expect(result.stderr).not.toContain("project-key");
    // Will fail on connection
    expect(result.stderr).toContain("connect");
  });

  it("prompt compose uses default template path", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
    ]);
    // Should succeed using default template
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Tests: Config File Defaults
// ============================================================================

describe("config file defaults", () => {
  it("prompt compose uses config defaults.template", async () => {
    const configPath = writeTempConfig({
      defaults: { template: "initial_metaprompt.md" },
    });

    const result = await runCli(["--config", configPath, "prompt", "compose", "--excerpt-file", "README.md"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Meta prompt:");
    expect(result.stdout).not.toContain("## METAPROMPT (v0.2)");
  });

  it("--template flag overrides config defaults.template", async () => {
    const configPath = writeTempConfig({
      defaults: { template: "initial_metaprompt.md" },
    });

    const result = await runCli([
      "--config",
      configPath,
      "prompt",
      "compose",
      "--template",
      "metaprompt_by_gpt_52.md",
      "--excerpt-file",
      "README.md",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## METAPROMPT (v0.2)");
  });

  it("fails when explicit --config path is missing", async () => {
    const missingConfig =
      process.platform === "win32" ? "C:\\\\__brenner_test_missing_config__.json" : "/__brenner_test_missing_config__.json";

    const result = await runCli(["--config", missingConfig, "prompt", "compose", "--excerpt-file", "README.md"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Config file not found");
  });

  it("ignores invalid implicit config file", async () => {
    const base = join(tmpdir(), `brenner-test-xdg-${randomUUID()}`);
    const configDir = join(base, "brenner");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, "config.json"), "{ not-json", "utf8");

    const env = process.platform === "win32" ? { APPDATA: base } : { XDG_CONFIG_HOME: base };

    const result = await runCli(["prompt", "compose", "--excerpt-file", "README.md"], {
      env: { ...env, BRENNER_CONFIG_PATH: "" },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it("fails on invalid explicit config file", async () => {
    const configPath = writeTempConfigText("{ not-json");
    const result = await runCli(["--config", configPath, "prompt", "compose", "--excerpt-file", "README.md"], {
      env: { BRENNER_CONFIG_PATH: "" },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Failed to parse config JSON");
  });
});

// ============================================================================
// Tests: Integer Flag Validation
// ============================================================================

describe("integer flag validation", () => {
  it("rejects non-integer --limit value", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--limit", "abc"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("expected integer");
  });

  it("rejects non-integer --message-id value", async () => {
    const result = await runCliWithEnv(
      ["mail", "read", "--message-id", "abc"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("expected integer");
  });

  it("accepts valid integer --limit value", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--limit", "50"],
      { AGENT_NAME: "TestAgent" }
    );
    // Should not complain about limit format
    expect(result.stderr).not.toContain("expected integer");
    // Will fail on connection
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: Boolean Flags
// ============================================================================

describe("boolean flags", () => {
  it("--urgent-only is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--urgent-only"],
      { AGENT_NAME: "TestAgent" }
    );
    // Should not error on flag parsing
    expect(result.stderr).not.toContain("urgent-only");
    expect(result.stderr).toContain("connect");
  });

  it("--include-bodies is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--include-bodies"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("include-bodies");
    expect(result.stderr).toContain("connect");
  });

  it("--ack-required is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      [
        "mail",
        "send",
        "--to",
        "Agent",
        "--subject",
        "Test",
        "--body-file",
        "README.md",
        "--ack-required",
      ],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("ack-required");
    expect(result.stderr).toContain("connect");
  });

  it("--threads is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--threads"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("threads");
    expect(result.stderr).toContain("connect");
  });

  it("--summaries is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--threads", "--summaries"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("summaries");
    expect(result.stderr).toContain("connect");
  });

  it("--unified is recognized as boolean for session start", async () => {
    const result = await runCliWithEnv(
      [
        "session",
        "start",
        "--to",
        "Agent",
        "--thread-id",
        "TEST-1",
        "--excerpt-file",
        "README.md",
        "--question",
        "Test?",
        "--unified",
      ],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("unified");
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: Hypothesis CLI
// ============================================================================

describe("hypothesis CLI", () => {
  it("supports list/create/show/search/link with --json", async () => {
    const projectDir = join(tmpdir(), `brenner-test-hypothesis-${randomUUID()}`);
    mkdirSync(projectDir, { recursive: true });

    const listEmpty = await runCli([
      "hypothesis",
      "list",
      "--project-key",
      projectDir,
      "--json",
    ]);
    expect(listEmpty.exitCode).toBe(0);
    const listEmptyParsed = JSON.parse(listEmpty.stdout) as {
      ok: boolean;
      count: number;
      hypotheses: unknown[];
    };
    expect(listEmptyParsed.ok).toBe(true);
    expect(listEmptyParsed.count).toBe(0);

    const create1 = await runCli([
      "hypothesis",
      "create",
      "--project-key",
      projectDir,
      "--json",
      "--session-id",
      "RS-TEST",
      "--statement",
      "Cell fate is epigenetically determined by early development cues.",
      "--category",
      "mechanistic",
      "--mechanism",
      "A stable epigenetic mark is established early and maintained through cell divisions.",
      "--anchors",
      "§1,§2",
      "--tags",
      "epigenetics,cell-fate",
      "--notes",
      "Initial hypothesis.",
    ]);
    expect(create1.exitCode).toBe(0);
    const create1Parsed = JSON.parse(create1.stdout) as {
      ok: boolean;
      hypothesis: { id: string; sessionId: string; anchors?: string[]; tags?: string[]; notes?: string };
    };
    expect(create1Parsed.ok).toBe(true);
    expect(create1Parsed.hypothesis.id).toBe("H-RS-TEST-001");
    expect(create1Parsed.hypothesis.sessionId).toBe("RS-TEST");
    expect(create1Parsed.hypothesis.anchors).toEqual(["§1", "§2"]);
    expect(create1Parsed.hypothesis.tags).toEqual(["epigenetics", "cell-fate"]);
    expect(create1Parsed.hypothesis.notes).toBe("Initial hypothesis.");

    const create2 = await runCli([
      "hypothesis",
      "create",
      "--project-key",
      projectDir,
      "--json",
      "--session-id",
      "RS-TEST",
      "--statement",
      "Third alternative: cell fate is primarily driven by stochastic chromatin accessibility changes.",
      "--category",
      "third_alternative",
    ]);
    expect(create2.exitCode).toBe(0);
    const create2Parsed = JSON.parse(create2.stdout) as { ok: boolean; hypothesis: { id: string } };
    expect(create2Parsed.ok).toBe(true);
    expect(create2Parsed.hypothesis.id).toBe("H-RS-TEST-002");

    const listFiltered = await runCli([
      "hypothesis",
      "list",
      "--project-key",
      projectDir,
      "--json",
      "--session-id",
      "RS-TEST",
      "--state",
      "proposed",
    ]);
    expect(listFiltered.exitCode).toBe(0);
    const listFilteredParsed = JSON.parse(listFiltered.stdout) as { ok: boolean; count: number };
    expect(listFilteredParsed.ok).toBe(true);
    expect(listFilteredParsed.count).toBe(2);

    const link = await runCli([
      "hypothesis",
      "link",
      create2Parsed.hypothesis.id,
      create1Parsed.hypothesis.id,
      "--project-key",
      projectDir,
      "--json",
    ]);
    expect(link.exitCode).toBe(0);
    const linkParsed = JSON.parse(link.stdout) as { ok: boolean; hypothesis: { parentId?: string } };
    expect(linkParsed.ok).toBe(true);
    expect(linkParsed.hypothesis.parentId).toBe(create1Parsed.hypothesis.id);

    const show = await runCli([
      "hypothesis",
      "show",
      create2Parsed.hypothesis.id,
      "--project-key",
      projectDir,
      "--json",
    ]);
    expect(show.exitCode).toBe(0);
    const showParsed = JSON.parse(show.stdout) as {
      ok: boolean;
      hypothesis: { parentId?: string };
      children: string[];
    };
    expect(showParsed.ok).toBe(true);
    expect(showParsed.hypothesis.parentId).toBe(create1Parsed.hypothesis.id);
    expect(showParsed.children).toEqual([]);

    const search = await runCli([
      "hypothesis",
      "search",
      "epigenetically",
      "--project-key",
      projectDir,
      "--json",
    ]);
    expect(search.exitCode).toBe(0);
    const searchParsed = JSON.parse(search.stdout) as {
      ok: boolean;
      count: number;
      hypotheses: Array<{ id: string }>;
    };
    expect(searchParsed.ok).toBe(true);
    expect(searchParsed.count).toBeGreaterThanOrEqual(1);
    expect(searchParsed.hypotheses.map((h) => h.id)).toContain(create1Parsed.hypothesis.id);
  });
});

// ============================================================================
// Tests: Test CLI
// ============================================================================

describe("test CLI", () => {
  function setupTestProjectFixture(args?: { sessionId?: string; testId?: string }): {
    projectDir: string;
    sessionId: string;
    testId: string;
    hypothesisAId: string;
    hypothesisBId: string;
  } {
    const projectDir = join(tmpdir(), `brenner-test-tests-${randomUUID()}`);
    mkdirSync(projectDir, { recursive: true });

    const sessionId = args?.sessionId ?? "RS-TEST";
    const testId = args?.testId ?? `T-${sessionId}-001`;

    const hypothesisAId = `H-${sessionId}-001`;
    const hypothesisBId = `H-${sessionId}-002`;

    mkdirSync(join(projectDir, ".research", "tests"), { recursive: true });
    mkdirSync(join(projectDir, ".research", "hypotheses"), { recursive: true });

    const now = new Date().toISOString();

    const hypothesesFile = {
      sessionId,
      createdAt: now,
      updatedAt: now,
      hypotheses: [
        {
          id: hypothesisAId,
          statement: "Hypothesis A: the assay signal should be detected (positive) under condition X.",
          origin: "proposed",
          category: "mechanistic",
          confidence: "medium",
          sessionId,
          state: "active",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: hypothesisBId,
          statement: "Hypothesis B: the assay signal should not be detected (negative) under condition X.",
          origin: "proposed",
          category: "third_alternative",
          confidence: "medium",
          sessionId,
          state: "active",
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    writeFileSync(
      join(projectDir, ".research", "hypotheses", `${sessionId}-hypotheses.json`),
      JSON.stringify(hypothesesFile, null, 2),
      "utf8"
    );

    const sessionTestsFile = {
      sessionId,
      createdAt: now,
      updatedAt: now,
      tests: [
        {
          id: testId,
          name: "Binary signal assay for Hypothesis A vs B",
          procedure: "Run the assay under condition X and observe whether the signal is detected or absent.",
          discriminates: [hypothesisAId, hypothesisBId],
          expectedOutcomes: [
            {
              hypothesisId: hypothesisAId,
              outcome: "Signal is detected (positive).",
              resultType: "positive",
              confidence: "medium",
            },
            {
              hypothesisId: hypothesisBId,
              outcome: "Signal is not detected (negative).",
              resultType: "negative",
              confidence: "medium",
            },
          ],
          potencyCheck: {
            positiveControl: "Include a known positive sample to verify the assay can detect the signal.",
            sensitivityVerification: "Verify detection threshold is adequate using a dilution series.",
            timingValidation: "Run a short time course to confirm we measure within the assay window.",
          },
          evidencePerWeekScore: {
            likelihoodRatio: 3,
            cost: 3,
            speed: 3,
            ambiguity: 3,
          },
          feasibility: {
            requirements: "Standard assay reagents and a readout instrument.",
            difficulty: "easy",
          },
          designedInSession: sessionId,
          designedBy: "Tester",
          status: "ready",
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    writeFileSync(
      join(projectDir, ".research", "tests", `${sessionId}-tests.json`),
      JSON.stringify(sessionTestsFile, null, 2),
      "utf8"
    );

    return { projectDir, sessionId, testId, hypothesisAId, hypothesisBId };
  }

  it("supports list/show/execute/suggest-kills (json mode)", async () => {
    const { projectDir, sessionId, testId, hypothesisAId, hypothesisBId } = setupTestProjectFixture();

    const list = await runCli(["test", "list", "--project-key", projectDir, "--json"]);
    expect(list.exitCode).toBe(0);
    const listParsed = JSON.parse(list.stdout) as { ok: boolean; count: number; tests: Array<{ id: string }> };
    expect(listParsed.ok).toBe(true);
    expect(listParsed.count).toBe(1);
    expect(listParsed.tests.map((t) => t.id)).toContain(testId);

    const show = await runCli(["test", "show", testId, "--project-key", projectDir, "--json"]);
    expect(show.exitCode).toBe(0);
    const showParsed = JSON.parse(show.stdout) as { ok: boolean; test: { id: string } };
    expect(showParsed.ok).toBe(true);
    expect(showParsed.test.id).toBe(testId);

    const execute = await runCli([
      "test",
      "execute",
      testId,
      "--project-key",
      projectDir,
      "--json",
      "--result",
      "positive",
      "--potency-pass",
    ]);
    expect(execute.exitCode).toBe(0);
    const executeParsed = JSON.parse(execute.stdout) as {
      ok: boolean;
      test: { id: string; status: string; execution?: { observedOutcome: string } };
      suggestions: Array<{ hypothesisId: string; suggestedAction: string }>;
      applied: unknown;
    };
    expect(executeParsed.ok).toBe(true);
    expect(executeParsed.test.id).toBe(testId);
    expect(executeParsed.test.status).toBe("completed");
    expect(executeParsed.test.execution?.observedOutcome).toBe("positive");
    expect(executeParsed.applied).toBeNull();
    expect(executeParsed.suggestions.some((s) => s.hypothesisId === hypothesisAId && s.suggestedAction === "validate")).toBe(true);
    expect(executeParsed.suggestions.some((s) => s.hypothesisId === hypothesisBId && s.suggestedAction === "kill")).toBe(true);

    const suggestKills = await runCli(["test", "suggest-kills", testId, "--project-key", projectDir, "--json"]);
    expect(suggestKills.exitCode).toBe(0);
    const suggestParsed = JSON.parse(suggestKills.stdout) as { ok: boolean; kills: Array<{ hypothesisId: string }> };
    expect(suggestParsed.ok).toBe(true);
    expect(suggestParsed.kills.map((k) => k.hypothesisId)).toContain(hypothesisBId);

    const hypothesesPath = join(projectDir, ".research", "hypotheses", `${sessionId}-hypotheses.json`);
    expect(existsSync(hypothesesPath)).toBe(true);
    const hypothesesJson = JSON.parse(readFileSync(hypothesesPath, "utf8")) as {
      hypotheses: Array<{ id: string; state: string }>;
    };
    const stateById = new Map(hypothesesJson.hypotheses.map((h) => [h.id, h.state]));
    expect(stateById.get(hypothesisAId)).toBe("active");
    expect(stateById.get(hypothesisBId)).toBe("active");
  });

  it("execute --apply transitions hypotheses and persists", async () => {
    const { projectDir, sessionId, testId, hypothesisAId, hypothesisBId } = setupTestProjectFixture();

    const execute = await runCli([
      "test",
      "execute",
      testId,
      "--project-key",
      projectDir,
      "--json",
      "--result",
      "positive",
      "--potency-pass",
      "--apply",
    ]);
    expect(execute.exitCode).toBe(0);
    const executeParsed = JSON.parse(execute.stdout) as {
      ok: boolean;
      applied: { saved: number; applied: Array<{ hypothesisId: string; ok: boolean }> } | null;
    };
    expect(executeParsed.ok).toBe(true);
    expect(executeParsed.applied).not.toBeNull();
    expect(executeParsed.applied?.saved).toBe(2);
    expect(executeParsed.applied?.applied.every((r) => r.ok)).toBe(true);

    const hypothesesPath = join(projectDir, ".research", "hypotheses", `${sessionId}-hypotheses.json`);
    const hypothesesJson = JSON.parse(readFileSync(hypothesesPath, "utf8")) as {
      hypotheses: Array<{ id: string; state: string }>;
    };
    const stateById = new Map(hypothesesJson.hypotheses.map((h) => [h.id, h.state]));
    expect(stateById.get(hypothesisAId)).toBe("confirmed");
    expect(stateById.get(hypothesisBId)).toBe("refuted");
  });

  it("bind transitions hypotheses (matched/violated)", async () => {
    const { projectDir, sessionId, testId, hypothesisAId, hypothesisBId } = setupTestProjectFixture({ sessionId: "RS-BIND" });

    const bindMatched = await runCli([
      "test",
      "bind",
      testId,
      hypothesisAId,
      "--project-key",
      projectDir,
      "--json",
      "--matched",
      "--by",
      "Tester",
    ]);
    expect(bindMatched.exitCode).toBe(0);
    const bindMatchedParsed = JSON.parse(bindMatched.stdout) as { ok: boolean; hypothesis: { id: string; state: string } };
    expect(bindMatchedParsed.ok).toBe(true);
    expect(bindMatchedParsed.hypothesis.id).toBe(hypothesisAId);
    expect(bindMatchedParsed.hypothesis.state).toBe("confirmed");

    const bindViolated = await runCli([
      "test",
      "bind",
      testId,
      hypothesisBId,
      "--project-key",
      projectDir,
      "--json",
      "--violated",
      "--by",
      "Tester",
    ]);
    expect(bindViolated.exitCode).toBe(0);
    const bindViolatedParsed = JSON.parse(bindViolated.stdout) as { ok: boolean; hypothesis: { id: string; state: string } };
    expect(bindViolatedParsed.ok).toBe(true);
    expect(bindViolatedParsed.hypothesis.id).toBe(hypothesisBId);
    expect(bindViolatedParsed.hypothesis.state).toBe("refuted");

    const hypothesesPath = join(projectDir, ".research", "hypotheses", `${sessionId}-hypotheses.json`);
    const hypothesesJson = JSON.parse(readFileSync(hypothesesPath, "utf8")) as {
      hypotheses: Array<{ id: string; state: string }>;
    };
    const stateById = new Map(hypothesesJson.hypotheses.map((h) => [h.id, h.state]));
    expect(stateById.get(hypothesisAId)).toBe("confirmed");
    expect(stateById.get(hypothesisBId)).toBe("refuted");
  });

  it("execute --interactive accepts stdin input for prompts", async () => {
    const { projectDir, testId, hypothesisAId, hypothesisBId } = setupTestProjectFixture({ sessionId: "RS-INTERACT" });

    // Provide stdin input for the interactive prompts:
    // 1. Observed result (text) - "positive"
    // 2. Potency check (pass/fail) - "pass"
    // 3. Confidence (high/medium/low/speculative) - "high"
    // 4. Executed by (optional) - empty
    // 5. Notes (optional) - empty
    // 6. Potency notes (optional) - empty
    // 7. Apply suggestions (y/N) - "n"
    const stdinInput = "positive\npass\nhigh\n\n\n\nn\n";

    const execute = await runCli(
      ["test", "execute", testId, "--project-key", projectDir, "--json", "--interactive"],
      { stdin: stdinInput, timeout: 15000 }
    );

    expect(execute.exitCode).toBe(0);
    const parsed = JSON.parse(execute.stdout) as {
      ok: boolean;
      test: { id: string; status: string; execution?: { observedOutcome: string; potencyCheckPassed?: boolean } };
      suggestions: Array<{ hypothesisId: string; suggestedAction: string }>;
      applied: unknown;
    };

    expect(parsed.ok).toBe(true);
    expect(parsed.test.id).toBe(testId);
    expect(parsed.test.status).toBe("completed");
    expect(parsed.test.execution?.observedOutcome).toBe("positive");
    expect(parsed.test.execution?.potencyCheckPassed).toBe(true);
    // Applied is null because we said 'n' to apply
    expect(parsed.applied).toBeNull();
    // Should still have suggestions
    expect(parsed.suggestions.some((s) => s.hypothesisId === hypothesisAId && s.suggestedAction === "validate")).toBe(true);
    expect(parsed.suggestions.some((s) => s.hypothesisId === hypothesisBId && s.suggestedAction === "kill")).toBe(true);
  });

  it("execute --interactive with apply transitions hypotheses", async () => {
    const { projectDir, sessionId, testId, hypothesisAId, hypothesisBId } = setupTestProjectFixture({
      sessionId: "RS-INTERACT-APPLY",
    });

    // Provide stdin input including 'y' to apply suggestions:
    // 1. Observed result (text) - "positive"
    // 2. Potency check (pass/fail) - "pass"
    // 3. Confidence (high/medium/low/speculative) - "medium"
    // 4. Executed by (optional) - empty
    // 5. Notes (optional) - "Test observation notes"
    // 6. Potency notes (optional) - empty
    // 7. Apply suggestions (y/N) - "y"
    const stdinInput = "positive\npass\nmedium\n\nTest observation notes\n\ny\n";

    const execute = await runCli(
      ["test", "execute", testId, "--project-key", projectDir, "--json", "--interactive"],
      { stdin: stdinInput, timeout: 15000 }
    );

    expect(execute.exitCode).toBe(0);
    const parsed = JSON.parse(execute.stdout) as {
      ok: boolean;
      test: { id: string; execution?: { notes?: string; potencyCheckPassed?: boolean } };
      applied: { saved: number; applied: Array<{ hypothesisId: string; ok: boolean }> } | null;
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.test.execution?.notes).toBe("Test observation notes");
    expect(parsed.test.execution?.potencyCheckPassed).toBe(true);
    expect(parsed.applied).not.toBeNull();
    expect(parsed.applied?.saved).toBe(2);

    // Verify hypothesis states were updated
    const hypothesesPath = join(projectDir, ".research", "hypotheses", `${sessionId}-hypotheses.json`);
    const hypothesesJson = JSON.parse(readFileSync(hypothesesPath, "utf8")) as {
      hypotheses: Array<{ id: string; state: string }>;
    };
    const stateById = new Map(hypothesesJson.hypotheses.map((h) => [h.id, h.state]));
    expect(stateById.get(hypothesisAId)).toBe("confirmed");
    expect(stateById.get(hypothesisBId)).toBe("refuted");
  });
});

// ============================================================================
// Tests: Evidence CLI
// ============================================================================

describe("evidence post", () => {
  it("supports --dry-run --json and optional --evidence-id filtering", async () => {
    const projectDir = join(tmpdir(), `brenner-test-evidence-${randomUUID()}`);
    mkdirSync(projectDir, { recursive: true });

    const threadId = "RS-EVIDENCE";

    const init = await runCli(["evidence", "init", "--thread-id", threadId, "--project-key", projectDir]);
    expect(init.exitCode).toBe(0);

    const add1 = await runCli([
      "evidence",
      "add",
      "--thread-id",
      threadId,
      "--project-key",
      projectDir,
      "--type",
      "paper",
      "--title",
      "Test Paper 1",
      "--source",
      "doi:10.000/test-1",
      "--relevance",
      "Foundational.",
    ]);
    expect(add1.exitCode).toBe(0);

    const add2 = await runCli([
      "evidence",
      "add",
      "--thread-id",
      threadId,
      "--project-key",
      projectDir,
      "--type",
      "dataset",
      "--title",
      "Test Dataset 2",
      "--source",
      "https://example.com/dataset",
      "--relevance",
      "Supplemental.",
    ]);
    expect(add2.exitCode).toBe(0);

    const dryRunAll = await runCli([
      "evidence",
      "post",
      "--thread-id",
      threadId,
      "--project-key",
      projectDir,
      "--sender",
      "Operator",
      "--to",
      "Agent",
      "--dry-run",
      "--json",
    ]);
    expect(dryRunAll.exitCode).toBe(0);
    const dryRunAllParsed = JSON.parse(dryRunAll.stdout) as {
      ok: boolean;
      dry_run: boolean;
      subject: string;
      body_md: string;
    };
    expect(dryRunAllParsed.ok).toBe(true);
    expect(dryRunAllParsed.dry_run).toBe(true);
    expect(dryRunAllParsed.subject).toMatch(/^EVIDENCE:/);
    expect(dryRunAllParsed.body_md).toContain("EV-001");
    expect(dryRunAllParsed.body_md).toContain("EV-002");

    const dryRunFiltered = await runCli([
      "evidence",
      "post",
      "--thread-id",
      threadId,
      "--project-key",
      projectDir,
      "--sender",
      "Operator",
      "--to",
      "Agent",
      "--evidence-id",
      "EV-001",
      "--dry-run",
      "--json",
    ]);
    expect(dryRunFiltered.exitCode).toBe(0);
    const dryRunFilteredParsed = JSON.parse(dryRunFiltered.stdout) as { ok: boolean; body_md: string };
    expect(dryRunFilteredParsed.ok).toBe(true);
    expect(dryRunFilteredParsed.body_md).toContain("EV-001");
    expect(dryRunFilteredParsed.body_md).not.toContain("EV-002");
  });

  it("fails clearly when evidence pack is missing", async () => {
    const projectDir = join(tmpdir(), `brenner-test-evidence-missing-${randomUUID()}`);
    mkdirSync(projectDir, { recursive: true });

    const threadId = "RS-EVIDENCE-MISSING";

    const result = await runCli([
      "evidence",
      "post",
      "--thread-id",
      threadId,
      "--project-key",
      projectDir,
      "--sender",
      "Operator",
      "--to",
      "Agent",
      "--dry-run",
      "--json",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Run 'evidence init' first");
  });
});
