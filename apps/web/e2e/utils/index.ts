/**
 * E2E Test Utilities
 *
 * Re-exports all utilities for easy importing.
 */

// Accessibility (axe-core)
export {
  checkAccessibility,
  filterViolationsByImpact,
  formatViolations,
} from "./a11y-testing";
// Agent Mail test seeding
export {
  cleanupTestSession,
  createKickoffSession,
  createSessionWithArtifact,
  createSessionWithDeltas,
  getTestServer,
  getTestServerUrl,
  resetTestServer,
  type SeededAgent,
  type SeededMessage,
  type SessionConfig,
  seedTestSession,
  stopTestServer,
} from "./agent-mail-seeder";

// Logging utilities
export {
  createE2ELogger,
  type E2ELogEntry,
  type E2ELogLevel,
  formatLogsAsJson,
  formatLogsAsText,
  getTestLogs,
  log,
  withStep,
} from "./e2e-logging";

// Network logging and performance utilities
export {
  attachNetworkLogsToTest,
  clearNetworkContext,
  collectPerformanceTiming,
  formatNetworkLogsAsText,
  getNetworkLogs,
  getPerformanceTiming,
  type NetworkRequestLog,
  type PerformanceTimingData,
  setupNetworkLogging,
} from "./network-logging";
// Enhanced test fixtures with logging
// Navigation and interaction helpers
export {
  assertElementCount,
  assertPageHasContent,
  assertTextContent,
  assertUrl,
  clickElement,
  expect,
  fillInput,
  navigateTo,
  type TestSessionFixture,
  takeScreenshot,
  test,
  waitForContent,
  waitForNetworkIdle,
} from "./test-fixtures";
