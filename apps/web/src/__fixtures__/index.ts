/**
 * Test Data Fixtures Library
 *
 * Comprehensive, realistic test data fixtures for the BrennerBot web application.
 * These fixtures mirror real data structures and can be used across unit tests,
 * integration tests, and E2E tests.
 *
 * Philosophy: NO mocks - use actual data structures.
 *
 * Usage:
 * ```typescript
 * import { validArtifactFixture, createSession, quoteBankFixture } from "@/__fixtures__";
 *
 * describe("MyComponent", () => {
 *   it("renders with real data", () => {
 *     render(<MyComponent artifact={validArtifactFixture} />);
 *   });
 *
 *   it("handles custom session", () => {
 *     const session = createSession({
 *       status: "active",
 *       research_question: "Custom question",
 *     });
 *     render(<SessionView session={session} />);
 *   });
 * });
 * ```
 *
 * @module __fixtures__
 * @see brenner_bot-77t2
 */

// ============================================================================
// Document Fixtures
// ============================================================================

export {
  comprehensiveTranscript,
  type DistillationDocument,
  // Types
  type DocumentSection,
  emptyTranscript,
  geminiDistillation,
  gptDistillation,
  type MetapromptDocument,
  // Metaprompt fixtures
  metapromptFixture,
  // Transcript fixtures
  minimalTranscript,
  // Distillation fixtures
  opusDistillation,
  type QuoteBankDocument,
  type QuoteBankEntry,
  // Quote bank fixtures
  quoteBankFixture,
  rawMultiQuoteMarkdown,
  rawNoSectionsMarkdown,
  // Raw markdown (for parser testing)
  rawTranscriptMarkdown,
  type TranscriptDocument,
} from "./documents";

// ============================================================================
// Session Fixtures
// ============================================================================

export {
  // Session fixtures
  activeSessionFixture,
  cancelledSessionFixture,
  completedSessionFixture,
  draftArtifactFixture,
  emptyArtifactFixture,
  errorSessionFixture,
  pendingSessionFixture,
  type Session,
  type SessionExcerpt,
  type SessionParticipant,
  // Types
  type SessionStatus,
  // Assumption fixtures
  sampleAssumptions,
  // Critique fixtures
  sampleCritiques,
  // Hypothesis fixtures
  sampleHypotheses,
  // Prediction fixtures
  samplePredictions,
  // Research thread
  sampleResearchThread,
  // Test fixtures
  sampleTests,
  // Complete artifact fixtures
  validArtifactFixture,
} from "./sessions";

// ============================================================================
// User Fixtures
// ============================================================================

export {
  type AuthSession,
  adminAuthSessionFixture,
  adminUserFixture,
  // User fixtures
  authenticatedUserFixture,
  type CloudflareAccessPayload,
  expiredAuthSessionFixture,
  expiredCloudflarePayloadFixture,
  guestUserFixture,
  invalidAudienceCloudflarePayloadFixture,
  minimalUserFixture,
  observerUserFixture,
  // Permission matrix
  permissionMatrixFixture,
  type User,
  type UserPreferences,
  // Types
  type UserRole,
  // Auth session fixtures
  validAuthSessionFixture,
  // Cloudflare Access fixtures
  validCloudflarePayloadFixture,
} from "./users";

// ============================================================================
// API Response Fixtures
// ============================================================================

export {
  type AgentMailInbox,
  // Types
  type AgentMailMessage,
  type AgentMailThread,
  type AgentProfile,
  agentListFixture,
  // Agent Mail success fixtures
  agentMailInboxFixture,
  agentMailThreadFixture,
  // Agent Mail error fixtures
  agentNotFoundErrorFixture,
  agentProfileFixture,
  emptyInboxFixture,
  // HTTP error fixtures
  error400Fixture,
  error401Fixture,
  error403Fixture,
  error404Fixture,
  error409Fixture,
  error422Fixture,
  error429Fixture,
  error500Fixture,
  error502Fixture,
  error503Fixture,
  error504Fixture,
  fileReservationConflictErrorFixture,
  type JsonRpcError,
  type JsonRpcResponse,
  jsonRpcErrorFixture,
  jsonRpcMethodNotFoundFixture,
  jsonRpcParseErrorFixture,
  // JSON-RPC fixtures
  jsonRpcSuccessFixture,
  projectNotFoundErrorFixture,
  rateLimitErrorFixture,
} from "./api";

// ============================================================================
// Factory Functions
// ============================================================================

export {
  createAgentMailInbox,
  // Agent Mail factories
  createAgentMailMessage,
  createAgentProfile,
  createArtifact,
  // Artifact factories
  createArtifactMetadata,
  createAssumption,
  createAuthSession,
  createCritique,
  createDistillationDocument,
  createExcerpt,
  createHypothesis,
  createParticipant,
  createPrediction,
  createResearchThread,
  // Session factories
  createSession,
  createTest,
  // Document factories
  createTranscriptDocument,
  // User factories
  createUser,
  createValidArtifact,
  // Utilities
  generateId,
  generateTimestamp,
  resetIdCounter,
} from "./factories";
