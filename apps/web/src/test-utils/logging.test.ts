/**
 * Tests for Test Logging Utilities
 *
 * Verifies the enhanced logging functionality including:
 * - Step-level logging with counters
 * - Log categories
 * - JSON output format
 * - Network logging wrapper
 * - withStep helper
 *
 * @see brenner_bot-oful (Test Logging: Structured Logging for Unit Tests)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLogBuffer,
  createLoggingFetch,
  createTestLogger,
  formatLogBuffer,
  formatLogBufferAsJson,
  getLogBuffer,
  getLogBufferByCategory,
  getLogSummary,
  LogCategories,
  withStep,
} from "./logging";

describe("Test Logging Utilities", () => {
  beforeEach(() => {
    clearLogBuffer();
    // Suppress console output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createTestLogger", () => {
    it("creates a logger with all log levels", () => {
      const log = createTestLogger("test-context");

      expect(log.debug).toBeDefined();
      expect(log.info).toBeDefined();
      expect(log.step).toBeDefined();
      expect(log.warn).toBeDefined();
      expect(log.error).toBeDefined();
    });

    it("logs messages to the buffer", () => {
      const log = createTestLogger("test-context");

      log.info("Test message");

      const entries = getLogBuffer();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe("Test message");
      expect(entries[0].context).toBe("test-context");
      expect(entries[0].level).toBe("info");
    });

    it("logs messages with category", () => {
      const log = createTestLogger("test-context");

      log.info("Parsing delta", { category: LogCategories.PARSE });

      const entries = getLogBuffer();
      expect(entries[0].category).toBe("parse");
    });

    it("logs messages with data", () => {
      const log = createTestLogger("test-context");

      log.debug("Found items", { data: { count: 5 } });

      const entries = getLogBuffer();
      expect(entries[0].data).toEqual({ count: 5 });
    });

    it("increments step counter for step logs", () => {
      const log = createTestLogger("test-context");

      log.step("First step");
      log.step("Second step");
      log.step("Third step");

      const entries = getLogBuffer();
      expect(entries[0].step).toBe(1);
      expect(entries[1].step).toBe(2);
      expect(entries[2].step).toBe(3);
      expect(log.getStepCount()).toBe(3);
    });

    it("does not increment step counter for non-step logs", () => {
      const log = createTestLogger("test-context");

      log.info("Info message");
      log.debug("Debug message");
      log.step("Step message");
      log.warn("Warn message");

      const entries = getLogBuffer();
      expect(entries[0].step).toBeUndefined();
      expect(entries[1].step).toBeUndefined();
      expect(entries[2].step).toBe(1);
      expect(entries[3].step).toBeUndefined();
    });

    it("getEntries returns only entries for this context", () => {
      const log1 = createTestLogger("context-1");
      const log2 = createTestLogger("context-2");

      log1.info("From context 1");
      log2.info("From context 2");
      log1.info("Also from context 1");

      expect(log1.getEntries()).toHaveLength(2);
      expect(log2.getEntries()).toHaveLength(1);
    });
  });

  describe("getLogBufferByCategory", () => {
    it("filters entries by category", () => {
      const log = createTestLogger("test");

      log.info("Parse start", { category: LogCategories.PARSE });
      log.info("API call", { category: LogCategories.API_CALL });
      log.info("Parse end", { category: LogCategories.PARSE });
      log.info("No category");

      const parseEntries = getLogBufferByCategory(LogCategories.PARSE);
      expect(parseEntries).toHaveLength(2);
      expect(parseEntries[0].message).toBe("Parse start");
      expect(parseEntries[1].message).toBe("Parse end");
    });
  });

  describe("clearLogBuffer", () => {
    it("clears all entries and resets step counter", () => {
      const log = createTestLogger("test");

      log.step("Step 1");
      log.step("Step 2");
      log.info("Info");

      expect(getLogBuffer()).toHaveLength(3);
      expect(log.getStepCount()).toBe(2);

      clearLogBuffer();

      expect(getLogBuffer()).toHaveLength(0);

      // Step counter should reset
      log.step("New step");
      const entries = getLogBuffer();
      expect(entries[0].step).toBe(1);
    });
  });

  describe("formatLogBuffer", () => {
    it("formats entries as readable text", () => {
      const log = createTestLogger("test");

      log.info("Test message");
      log.step("Step one");

      const formatted = formatLogBuffer();

      expect(formatted).toContain("INFO");
      expect(formatted).toContain("Test message");
      expect(formatted).toContain("STEP");
      expect(formatted).toContain("[Step 1]");
      expect(formatted).toContain("[test]");
    });

    it("includes category in formatted output", () => {
      const log = createTestLogger("test");

      log.info("API call", { category: LogCategories.API_CALL });

      const formatted = formatLogBuffer();
      expect(formatted).toContain("[api]");
    });

    it("includes duration in formatted output", () => {
      const log = createTestLogger("test");

      log.info("Slow operation", { duration: 1500 });

      const formatted = formatLogBuffer();
      expect(formatted).toContain("1.50s");
    });
  });

  describe("formatLogBufferAsJson", () => {
    it("returns valid JSON", () => {
      const log = createTestLogger("test");

      log.info("Test message");

      const json = formatLogBufferAsJson();
      const parsed = JSON.parse(json);

      expect(parsed.entryCount).toBe(1);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].message).toBe("Test message");
    });

    it("includes step count in JSON", () => {
      const log = createTestLogger("test");

      log.step("Step 1");
      log.step("Step 2");

      const json = formatLogBufferAsJson();
      const parsed = JSON.parse(json);

      expect(parsed.stepCount).toBe(2);
    });
  });

  describe("getLogSummary", () => {
    it("returns correct counts", () => {
      const log = createTestLogger("test");

      log.info("Info");
      log.warn("Warning");
      log.error("Error 1");
      log.error("Error 2");
      log.step("Step");

      const summary = getLogSummary();

      expect(summary.entryCount).toBe(5);
      expect(summary.stepCount).toBe(1);
      expect(summary.errorCount).toBe(2);
      expect(summary.warnCount).toBe(1);
    });
  });

  describe("createLoggingFetch", () => {
    it("logs request and response", async () => {
      const log = createTestLogger("fetch-test");
      const loggingFetch = createLoggingFetch(log);

      // Mock fetch
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      });
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

      await loggingFetch("/api/test", { method: "POST" });

      const entries = getLogBuffer();
      expect(entries).toHaveLength(2);

      // Request log
      expect(entries[0].message).toContain("Fetch: POST /api/test");
      expect(entries[0].category).toBe("network");

      // Response log
      expect(entries[1].message).toContain("Response: 200");
      expect(entries[1].category).toBe("network");
      expect(entries[1].duration).toBeDefined();
    });

    it("logs fetch errors", async () => {
      const log = createTestLogger("fetch-test");
      const loggingFetch = createLoggingFetch(log);

      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

      await expect(loggingFetch("/api/fail")).rejects.toThrow("Network error");

      const entries = getLogBuffer();
      expect(entries).toHaveLength(2);

      // Error log
      expect(entries[1].level).toBe("error");
      expect(entries[1].message).toContain("Fetch failed");
    });

    it("properly serializes error objects in data", async () => {
      const log = createTestLogger("fetch-test");
      const loggingFetch = createLoggingFetch(log);

      const testError = new Error("Serialization test");
      testError.name = "TestError";
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(testError);

      await expect(loggingFetch("/api/error")).rejects.toThrow("Serialization test");

      const entries = getLogBuffer();
      const errorEntry = entries.find((e) => e.level === "error");
      expect(errorEntry).toBeDefined();

      // Error should be properly serialized with name, message, and stack
      if (!errorEntry) {
        throw new Error("Expected error log entry to be present");
      }
      const errorData = errorEntry.data as {
        error: { name: string; message: string; stack?: string };
      };
      expect(errorData.error.name).toBe("TestError");
      expect(errorData.error.message).toBe("Serialization test");
      expect(errorData.error.stack).toBeDefined();
    });
  });

  describe("withStep", () => {
    it("logs step start and completion", async () => {
      const log = createTestLogger("step-test");

      const result = await withStep(log, "Processing data", async () => {
        return "processed";
      });

      expect(result).toBe("processed");

      const entries = getLogBuffer();
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toContain("Starting: Processing data");
      expect(entries[0].level).toBe("step");
      expect(entries[1].message).toContain("Completed: Processing data");
      expect(entries[1].duration).toBeDefined();
    });

    it("logs error on failure", async () => {
      const log = createTestLogger("step-test");

      await expect(
        withStep(log, "Failing operation", async () => {
          throw new Error("Intentional failure");
        }),
      ).rejects.toThrow("Intentional failure");

      const entries = getLogBuffer();
      expect(entries).toHaveLength(2);
      expect(entries[1].level).toBe("error");
      expect(entries[1].message).toContain("Failed: Failing operation");
    });

    it("properly serializes error in withStep failure data", async () => {
      const log = createTestLogger("step-test");

      const testError = new Error("Step failure");
      testError.name = "StepError";

      await expect(
        withStep(log, "Failing step", async () => {
          throw testError;
        }),
      ).rejects.toThrow("Step failure");

      const entries = getLogBuffer();
      const errorEntry = entries.find((e) => e.level === "error");
      expect(errorEntry).toBeDefined();

      // Error should be properly serialized
      if (!errorEntry) {
        throw new Error("Expected error log entry to be present");
      }
      const errorData = errorEntry.data as {
        error: { name: string; message: string; stack?: string };
      };
      expect(errorData.error.name).toBe("StepError");
      expect(errorData.error.message).toBe("Step failure");
      expect(errorData.error.stack).toBeDefined();
    });
  });

  describe("LogCategories", () => {
    it("has all expected categories", () => {
      expect(LogCategories.API_CALL).toBe("api");
      expect(LogCategories.STORAGE).toBe("storage");
      expect(LogCategories.PARSE).toBe("parse");
      expect(LogCategories.VALIDATE).toBe("validate");
      expect(LogCategories.FIXTURE).toBe("fixture");
      expect(LogCategories.ASSERTION).toBe("assert");
      expect(LogCategories.NETWORK).toBe("network");
      expect(LogCategories.SETUP).toBe("setup");
      expect(LogCategories.CLEANUP).toBe("cleanup");
    });
  });
});
