/**
 * Test Logging Utilities
 *
 * Provides detailed, structured logging for debugging test failures.
 * Philosophy: NO suppression of logs - make failures easy to diagnose.
 *
 * Features:
 * - Step-level logging with automatic step counting
 * - Log categories for filtering and organization
 * - JSON output for structured test reports
 * - Network call logging wrapper
 * - Automatic log attachment on test failure
 *
 * @see brenner_bot-oful (Test Logging: Structured Logging for Unit Tests)
 */

import { afterEach, beforeEach } from "vitest";

export type LogLevel = "debug" | "info" | "step" | "warn" | "error";

/**
 * Standard log categories for filtering and organization.
 */
export const LogCategories = {
  API_CALL: "api",
  STORAGE: "storage",
  PARSE: "parse",
  VALIDATE: "validate",
  FIXTURE: "fixture",
  ASSERTION: "assert",
  NETWORK: "network",
  SETUP: "setup",
  CLEANUP: "cleanup",
} as const;

export type LogCategory = (typeof LogCategories)[keyof typeof LogCategories];

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  category?: LogCategory;
  step?: number;
  message: string;
  duration?: number;
  data?: unknown;
}

const logBuffer: LogEntry[] = [];
let stepCounter = 0;
let testStartTime = Date.now();

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatLogEntry(entry: LogEntry): string {
  const time = entry.timestamp.slice(11, 23); // HH:mm:ss.SSS
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const categoryStr = entry.category ? ` [${entry.category}]` : "";
  const stepStr = entry.step !== undefined ? ` [Step ${entry.step}]` : "";
  const durationStr = entry.duration ? ` (${formatDuration(entry.duration)})` : "";
  const dataStr =
    entry.data !== undefined ? `\n  Data: ${JSON.stringify(entry.data, null, 2)}` : "";
  return `[${time}] ${levelStr}${categoryStr}${stepStr} [${entry.context}] ${entry.message}${durationStr}${dataStr}`;
}

/**
 * ANSI color codes for terminal output.
 */
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

export interface LogOptions {
  category?: LogCategory;
  data?: unknown;
  duration?: number;
}

/**
 * Create a scoped logger for a test context.
 *
 * Usage:
 * ```ts
 * const log = createTestLogger("delta-parser");
 * log.info("Parsing message", { category: LogCategories.PARSE, data: { body: messageBody } });
 * log.step("Extracting delta blocks");
 * log.debug("Found blocks", { data: { count: blocks.length } });
 * ```
 */
export function createTestLogger(context: string) {
  const log = (level: LogLevel, message: string, options?: LogOptions) => {
    const isStep = level === "step";
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      context,
      category: options?.category,
      step: isStep ? ++stepCounter : undefined,
      message,
      duration: options?.duration,
      data: options?.data,
    };
    logBuffer.push(entry);

    // Also write to console for immediate visibility with colors
    const formatted = formatLogEntry(entry);
    switch (level) {
      case "error":
        console.error(`${colors.red}${formatted}${colors.reset}`);
        break;
      case "warn":
        console.warn(`${colors.yellow}${formatted}${colors.reset}`);
        break;
      case "step":
        console.log(`${colors.cyan}${formatted}${colors.reset}`);
        break;
      case "info":
        console.info(`${colors.green}${formatted}${colors.reset}`);
        break;
      case "debug":
        console.debug(`${colors.gray}${formatted}${colors.reset}`);
        break;
    }
  };

  return {
    debug: (message: string, options?: LogOptions) => log("debug", message, options),
    info: (message: string, options?: LogOptions) => log("info", message, options),
    step: (message: string, options?: Omit<LogOptions, "category">) =>
      log("step", message, options),
    warn: (message: string, options?: LogOptions) => log("warn", message, options),
    error: (message: string, options?: LogOptions) => log("error", message, options),
    /** Get current step count */
    getStepCount: () => stepCounter,
    /** Get all entries for this context */
    getEntries: () => logBuffer.filter((e) => e.context === context),
  };
}

/**
 * Get all log entries from the current test run.
 */
export function getLogBuffer(): readonly LogEntry[] {
  return logBuffer;
}

/**
 * Get log entries filtered by category.
 */
export function getLogBufferByCategory(category: LogCategory): readonly LogEntry[] {
  return logBuffer.filter((e) => e.category === category);
}

/**
 * Clear the log buffer and reset step counter (called between tests).
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
  stepCounter = 0;
  testStartTime = Date.now();
}

/**
 * Format all log entries as a string for display on failure.
 */
export function formatLogBuffer(): string {
  return logBuffer.map(formatLogEntry).join("\n");
}

/**
 * Format log buffer as JSON for structured output.
 */
export function formatLogBufferAsJson(): string {
  return JSON.stringify(
    {
      totalDuration: formatDuration(Date.now() - testStartTime),
      stepCount: stepCounter,
      entryCount: logBuffer.length,
      entries: logBuffer,
    },
    null,
    2,
  );
}

/**
 * Get test summary statistics.
 */
export function getLogSummary(): {
  totalDuration: string;
  stepCount: number;
  entryCount: number;
  errorCount: number;
  warnCount: number;
} {
  return {
    totalDuration: formatDuration(Date.now() - testStartTime),
    stepCount: stepCounter,
    entryCount: logBuffer.length,
    errorCount: logBuffer.filter((e) => e.level === "error").length,
    warnCount: logBuffer.filter((e) => e.level === "warn").length,
  };
}

/**
 * Setup logging hooks for a test suite.
 * Clears buffer before each test and prints on failure.
 *
 * Usage:
 * ```ts
 * describe("MyTests", () => {
 *   setupTestLogging();
 *   // tests...
 * });
 * ```
 */
export function setupTestLogging(): void {
  beforeEach(() => {
    clearLogBuffer();
  });

  afterEach((context) => {
    if (context.task.result?.state === "fail") {
      const summary = getLogSummary();
      console.log("\n=== Test Log Buffer ===");
      console.log(
        `Duration: ${summary.totalDuration} | Steps: ${summary.stepCount} | Errors: ${summary.errorCount}`,
      );
      console.log("-".repeat(60));
      console.log(formatLogBuffer());
      console.log("======================\n");
    }
  });
}

/**
 * Create a fetch wrapper that logs all network calls.
 *
 * Usage:
 * ```ts
 * const log = createTestLogger("api-test");
 * const loggingFetch = createLoggingFetch(log);
 * const response = await loggingFetch("/api/sessions");
 * ```
 */
export function createLoggingFetch(logger: ReturnType<typeof createTestLogger>): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || "GET";

    logger.info(`Fetch: ${method} ${url}`, {
      category: LogCategories.NETWORK,
      data: {
        headers: init?.headers,
        bodyLength: typeof init?.body === "string" ? init.body.length : undefined,
      },
    });

    const start = performance.now();
    try {
      const response = await fetch(input, init);
      const duration = Math.round(performance.now() - start);

      logger.info(`Response: ${response.status} ${response.statusText}`, {
        category: LogCategories.NETWORK,
        duration,
        data: {
          contentType: response.headers.get("content-type"),
          contentLength: response.headers.get("content-length"),
        },
      });

      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      logger.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`, {
        category: LogCategories.NETWORK,
        duration,
        data: {
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : error,
        },
      });
      throw error;
    }
  };
}

/**
 * Helper to wrap an async operation with step logging.
 *
 * Usage:
 * ```ts
 * const log = createTestLogger("parser-test");
 * const result = await withStep(log, "Parsing delta blocks", async () => {
 *   return extractValidDeltas(input);
 * });
 * ```
 */
export async function withStep<T>(
  logger: ReturnType<typeof createTestLogger>,
  description: string,
  action: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  logger.step(`Starting: ${description}`);

  try {
    const result = await action();
    logger.step(`Completed: ${description}`, {
      duration: Date.now() - startTime,
    });
    return result;
  } catch (error) {
    logger.error(`Failed: ${description}`, {
      duration: Date.now() - startTime,
      data: {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      },
    });
    throw error;
  }
}
