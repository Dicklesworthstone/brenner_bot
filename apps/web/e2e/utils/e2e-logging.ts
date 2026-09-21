/**
 * E2E Test Logging Utilities for Playwright
 *
 * Provides detailed, structured logging for E2E test debugging.
 * Philosophy: Make failures easy to diagnose with step-by-step output.
 */

import type { ConsoleMessage, Page, TestInfo } from "@playwright/test";

export type E2ELogLevel = "debug" | "info" | "step" | "warn" | "error";
export type ConsoleLogLevel =
  | "log"
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "trace"
  | "dir"
  | "dirxml"
  | "table"
  | "count"
  | "countReset"
  | "timeEnd"
  | "assert"
  | "profile"
  | "profileEnd"
  | "clear"
  | "startGroup"
  | "startGroupCollapsed"
  | "endGroup";

export interface E2ELogEntry {
  timestamp: string;
  level: E2ELogLevel;
  testTitle: string;
  step: number;
  message: string;
  url?: string;
  duration?: number;
  data?: unknown;
}

export interface ConsoleLogEntry {
  timestamp: string;
  level: ConsoleLogLevel;
  text: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface PageErrorEntry {
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
}

export interface E2ETestContext {
  testTitle: string;
  stepCounter: number;
  startTime: number;
  logs: E2ELogEntry[];
  consoleLogs: ConsoleLogEntry[];
  pageErrors: PageErrorEntry[];
}

const testContexts = new Map<string, E2ETestContext>();

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Create a logging context for a test.
 */
export function createTestContext(testTitle: string): E2ETestContext {
  const context: E2ETestContext = {
    testTitle,
    stepCounter: 0,
    startTime: Date.now(),
    logs: [],
    consoleLogs: [],
    pageErrors: [],
  };
  testContexts.set(testTitle, context);
  return context;
}

/**
 * Get or create a test context.
 */
export function getTestContext(testTitle: string): E2ETestContext {
  let context = testContexts.get(testTitle);
  if (!context) {
    context = createTestContext(testTitle);
  }
  return context;
}

/**
 * Clear a test context.
 */
export function clearTestContext(testTitle: string): void {
  testContexts.delete(testTitle);
}

/**
 * Log a message to the test context.
 */
export function log(
  testTitle: string,
  level: E2ELogLevel,
  message: string,
  options?: { url?: string; duration?: number; data?: unknown },
): void {
  const context = getTestContext(testTitle);
  const entry: E2ELogEntry = {
    timestamp: getTimestamp(),
    level,
    testTitle,
    step: level === "step" ? ++context.stepCounter : context.stepCounter,
    message,
    ...options,
  };
  context.logs.push(entry);

  // Console output with colors and formatting
  const prefix = `[${entry.timestamp.slice(11, 19)}]`;
  const levelStr = level.toUpperCase().padEnd(5);
  const stepStr = level === "step" ? ` [Step ${entry.step}]` : "";
  const urlStr = entry.url ? ` (${entry.url})` : "";
  const durationStr = entry.duration ? ` [${formatDuration(entry.duration)}]` : "";

  const formatted = `${prefix} ${levelStr}${stepStr} ${message}${urlStr}${durationStr}`;

  switch (level) {
    case "error":
      console.error(`\x1b[31m${formatted}\x1b[0m`);
      break;
    case "warn":
      console.warn(`\x1b[33m${formatted}\x1b[0m`);
      break;
    case "step":
      console.log(`\x1b[36m${formatted}\x1b[0m`);
      break;
    case "info":
      console.log(`\x1b[32m${formatted}\x1b[0m`);
      break;
    case "debug":
      console.log(`\x1b[90m${formatted}\x1b[0m`);
      break;
  }

  if (options?.data) {
    console.log(`\x1b[90m  Data: ${JSON.stringify(options.data, null, 2)}\x1b[0m`);
  }
}

// ============================================================================
// Browser Console Log Capture
// ============================================================================

/**
 * Log a browser console message to the test context.
 */
export function logConsoleMessage(testTitle: string, message: ConsoleMessage): void {
  const context = getTestContext(testTitle);
  const location = message.location();

  const entry: ConsoleLogEntry = {
    timestamp: getTimestamp(),
    level: message.type() as ConsoleLogLevel,
    text: message.text(),
    url: location.url || undefined,
    lineNumber: location.lineNumber || undefined,
    columnNumber: location.columnNumber || undefined,
  };
  context.consoleLogs.push(entry);

  // Log errors and warnings prominently
  const levelColorMap: Record<string, string> = {
    error: "\x1b[31m",
    warning: "\x1b[33m",
    log: "\x1b[90m",
    info: "\x1b[90m",
    debug: "\x1b[90m",
  };
  const levelColor = levelColorMap[entry.level] || "\x1b[90m";

  const locationStr = entry.url ? ` (${entry.url}:${entry.lineNumber || 0})` : "";

  if (entry.level === "error" || entry.level === "warning") {
    console.log(`${levelColor}  [Console ${entry.level}] ${entry.text}${locationStr}\x1b[0m`);
  }
}

/**
 * Log a browser page error to the test context.
 */
export function logPageError(testTitle: string, error: Error, url?: string): void {
  const context = getTestContext(testTitle);

  const entry: PageErrorEntry = {
    timestamp: getTimestamp(),
    message: error.message,
    stack: error.stack,
    url,
  };
  context.pageErrors.push(entry);

  // Always log page errors prominently - they indicate serious issues
  console.error(`\x1b[31m  [Page Error] ${error.message}\x1b[0m`);
  if (error.stack) {
    const stackLines = error.stack.split("\n").slice(0, 3).join("\n    ");
    console.error(`\x1b[31m    ${stackLines}\x1b[0m`);
  }
}

/**
 * Set up browser console and page error logging for a page.
 */
export function setupConsoleLogging(page: Page, testTitle: string): void {
  // Create context if not exists
  getTestContext(testTitle);

  page.on("console", (message) => {
    logConsoleMessage(testTitle, message);
  });

  page.on("pageerror", (error) => {
    logPageError(testTitle, error, page.url());
  });
}

/**
 * Get console logs for a test.
 */
export function getConsoleLogs(testTitle: string): ConsoleLogEntry[] {
  return getTestContext(testTitle).consoleLogs;
}

/**
 * Get page errors for a test.
 */
export function getPageErrors(testTitle: string): PageErrorEntry[] {
  return getTestContext(testTitle).pageErrors;
}

/**
 * Get all logs for a test.
 */
export function getTestLogs(testTitle: string): E2ELogEntry[] {
  return getTestContext(testTitle).logs;
}

/**
 * Format logs as JSON for structured output.
 */
export function formatLogsAsJson(testTitle: string): string {
  const context = getTestContext(testTitle);
  return JSON.stringify(
    {
      test: testTitle,
      totalDuration: Date.now() - context.startTime,
      stepCount: context.stepCounter,
      logs: context.logs,
      consoleLogs: context.consoleLogs,
      pageErrors: context.pageErrors,
    },
    null,
    2,
  );
}

/**
 * Format logs as human-readable text.
 */
export function formatLogsAsText(testTitle: string): string {
  const context = getTestContext(testTitle);
  const duration = formatDuration(Date.now() - context.startTime);

  const header = `\n${"=".repeat(60)}\nTest: ${testTitle}\nDuration: ${duration}\nSteps: ${context.stepCounter}\n${"=".repeat(60)}\n`;

  const logLines = context.logs.map((entry) => {
    const stepStr = entry.level === "step" ? `[Step ${entry.step}] ` : "";
    const urlStr = entry.url ? ` (${entry.url})` : "";
    const durationStr = entry.duration ? ` [${formatDuration(entry.duration)}]` : "";
    return `${entry.timestamp.slice(11, 23)} ${entry.level.toUpperCase().padEnd(5)} ${stepStr}${entry.message}${urlStr}${durationStr}`;
  });

  const consoleIssues = context.consoleLogs.filter(
    (l) => l.level === "error" || l.level === "warning",
  );
  const pageErrors = context.pageErrors;

  const consoleSection =
    consoleIssues.length === 0
      ? ""
      : `\n\n${"-".repeat(60)}\nConsole (errors/warnings): ${consoleIssues.length}\n${"-".repeat(60)}\n` +
        consoleIssues
          .slice(0, 50)
          .map((l) => {
            const location = l.url ? ` (${l.url}:${l.lineNumber ?? 0})` : "";
            return `${l.timestamp.slice(11, 23)} ${l.level.toUpperCase().padEnd(7)} ${l.text}${location}`;
          })
          .join("\n") +
        (consoleIssues.length > 50 ? `\n... (${consoleIssues.length - 50} more)` : "");

  const pageErrorSection =
    pageErrors.length === 0
      ? ""
      : `\n\n${"-".repeat(60)}\nPage errors: ${pageErrors.length}\n${"-".repeat(60)}\n` +
        pageErrors
          .slice(0, 20)
          .map((e) => {
            const url = e.url ? ` (${e.url})` : "";
            return `${e.timestamp.slice(11, 23)} ${e.message}${url}`;
          })
          .join("\n") +
        (pageErrors.length > 20 ? `\n... (${pageErrors.length - 20} more)` : "");

  return header + logLines.join("\n") + consoleSection + pageErrorSection;
}

/**
 * Create a logger bound to a test.
 */
export function createE2ELogger(testTitle: string) {
  return {
    debug: (message: string, data?: unknown) => log(testTitle, "debug", message, { data }),
    info: (message: string, data?: unknown) => log(testTitle, "info", message, { data }),
    step: (message: string, options?: { url?: string; duration?: number; data?: unknown }) =>
      log(testTitle, "step", message, options),
    warn: (message: string, data?: unknown) => log(testTitle, "warn", message, { data }),
    error: (message: string, data?: unknown) => log(testTitle, "error", message, { data }),
    getContext: () => getTestContext(testTitle),
    formatAsJson: () => formatLogsAsJson(testTitle),
    formatAsText: () => formatLogsAsText(testTitle),
  };
}

/**
 * Helper to wrap a page action with step logging.
 */
export async function withStep<T>(
  logger: ReturnType<typeof createE2ELogger>,
  page: Page,
  description: string,
  action: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  logger.step(`Starting: ${description}`, { url: page.url() });

  try {
    const result = await action();
    logger.step(`Completed: ${description}`, {
      url: page.url(),
      duration: Date.now() - startTime,
    });
    return result;
  } catch (error) {
    logger.error(`Failed: ${description}`, {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    throw error;
  }
}

/**
 * Format console logs as human-readable text.
 */
export function formatConsoleLogsAsText(testTitle: string): string {
  const context = getTestContext(testTitle);
  if (context.consoleLogs.length === 0 && context.pageErrors.length === 0) {
    return "";
  }

  const lines: string[] = [
    `\n${"=".repeat(60)}`,
    `Browser Console Logs: ${testTitle}`,
    `Console entries: ${context.consoleLogs.length}, Page errors: ${context.pageErrors.length}`,
    `${"=".repeat(60)}`,
    "",
  ];

  // Page errors first (more important)
  if (context.pageErrors.length > 0) {
    lines.push("--- Page Errors ---");
    for (const entry of context.pageErrors) {
      lines.push(`${entry.timestamp.slice(11, 23)} ERROR ${entry.message}`);
      if (entry.stack) {
        lines.push(`    ${entry.stack.split("\n").slice(0, 3).join("\n    ")}`);
      }
    }
    lines.push("");
  }

  // Console logs grouped by level
  const errors = context.consoleLogs.filter((l) => l.level === "error");
  const warnings = context.consoleLogs.filter((l) => l.level === "warning");
  const others = context.consoleLogs.filter((l) => l.level !== "error" && l.level !== "warning");

  if (errors.length > 0) {
    lines.push("--- Console Errors ---");
    for (const entry of errors) {
      const loc = entry.url ? ` (${entry.url}:${entry.lineNumber || 0})` : "";
      lines.push(`${entry.timestamp.slice(11, 23)} ${entry.text}${loc}`);
    }
    lines.push("");
  }

  if (warnings.length > 0) {
    lines.push("--- Console Warnings ---");
    for (const entry of warnings) {
      const loc = entry.url ? ` (${entry.url}:${entry.lineNumber || 0})` : "";
      lines.push(`${entry.timestamp.slice(11, 23)} ${entry.text}${loc}`);
    }
    lines.push("");
  }

  if (others.length > 0) {
    lines.push("--- Console Messages ---");
    for (const entry of others) {
      lines.push(`${entry.timestamp.slice(11, 23)} [${entry.level}] ${entry.text}`);
    }
  }

  return lines.join("\n");
}

/**
 * Attach logs to Playwright test info for reporting.
 */
export async function attachLogsToTest(testInfo: TestInfo, testTitle: string): Promise<void> {
  const context = getTestContext(testTitle);
  const jsonLogs = formatLogsAsJson(testTitle);
  const textLogs = formatLogsAsText(testTitle);

  await testInfo.attach("test-logs.json", {
    body: jsonLogs,
    contentType: "application/json",
  });

  await testInfo.attach("test-logs.txt", {
    body: textLogs,
    contentType: "text/plain",
  });

  // Attach console logs separately if there are any errors or warnings
  if (context.consoleLogs.length > 0 || context.pageErrors.length > 0) {
    await testInfo.attach("console-logs.json", {
      body: JSON.stringify(
        {
          consoleLogs: context.consoleLogs,
          pageErrors: context.pageErrors,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });

    const consoleText = formatConsoleLogsAsText(testTitle);
    if (consoleText) {
      await testInfo.attach("console-logs.txt", {
        body: consoleText,
        contentType: "text/plain",
      });
    }
  }
}
