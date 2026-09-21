/**
 * Test Utilities
 *
 * Shared utilities for unit and E2E testing.
 * Philosophy: NO mocks - test real behavior with real fixtures.
 */

// Agent Mail test server
export {
  AgentMailTestServer,
  type TestAgent,
  type TestDelivery,
  type TestMessage,
  type TestProject,
} from "./agent-mail-test-server";
// Assertions
export {
  assertContains,
  assertDeepEqual,
  assertDefined,
  assertDeltaOperation,
  assertDeltaPayload,
  assertDeltaSection,
  assertInvalidDelta,
  assertLength,
  assertValidAnchor,
  assertValidAnchors,
  assertValidDelta,
  assertValidHypothesis,
  assertValidScore,
  assertValidTest,
} from "./assertions";
// Fixtures
export {
  getTranscriptPath,
  loadFixtureFile,
  loadJsonFixture,
  loadTranscriptSection,
  MALFORMED_DELTA_MESSAGE,
  SAMPLE_ARTIFACT_FIXTURE,
  SAMPLE_DELTA_MESSAGE,
  SAMPLE_EXCERPT,
} from "./fixtures";
// Logging utilities
export {
  clearLogBuffer,
  createLoggingFetch,
  createTestLogger,
  formatLogBuffer,
  formatLogBufferAsJson,
  getLogBuffer,
  getLogBufferByCategory,
  getLogSummary,
  LogCategories,
  type LogCategory,
  type LogEntry,
  type LogLevel,
  type LogOptions,
  setupTestLogging,
  withStep,
} from "./logging";
// Request helpers for API route testing
export {
  createAuthenticatedRequest,
  createMockRequest,
  type MockRequestOptions,
  setupAgentMailTestEnv,
  teardownAgentMailTestEnv,
} from "./request-helpers";
