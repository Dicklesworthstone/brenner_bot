/**
 * Fixture Factory Functions
 *
 * Dynamic factory functions for creating test fixtures with custom overrides.
 * Useful when you need variations of fixtures for specific test cases.
 *
 * Philosophy: Factories produce real, valid data structures - not mocks.
 */

import type {
  Artifact,
  ArtifactMetadata,
  AssumptionItem,
  CritiqueItem,
  HypothesisItem,
  PredictionItem,
  ResearchThreadItem,
  TestItem,
} from "../lib/artifact-merge";
import type { AgentMailInbox, AgentMailMessage, AgentProfile } from "./api";
import type { DistillationDocument, DocumentSection, TranscriptDocument } from "./documents";
import type { Session, SessionExcerpt, SessionParticipant } from "./sessions";
import type { AuthSession, User } from "./users";

// ============================================================================
// ID Generators
// ============================================================================

let idCounter = 0;

/**
 * Generate a unique ID for test fixtures.
 */
export function generateId(prefix: string = "test"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Reset ID counter (useful between test suites).
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Generate ISO timestamp.
 */
export function generateTimestamp(offsetMinutes: number = 0): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + offsetMinutes);
  return date.toISOString();
}

// ============================================================================
// Document Factories
// ============================================================================

/**
 * Create a transcript document with custom sections.
 */
export function createTranscriptDocument(
  overrides: Partial<TranscriptDocument> = {},
  sections: Partial<DocumentSection>[] = [],
): TranscriptDocument {
  const defaultSections: DocumentSection[] =
    sections.length > 0
      ? sections.map((s, i) => ({
          number: s.number ?? i + 1,
          title: s.title ?? `Section ${i + 1}`,
          text: s.text ?? `Content for section ${i + 1}`,
          anchors: s.anchors ?? [`§${s.number ?? i + 1}`],
          highlights: s.highlights,
          jargonTerms: s.jargonTerms,
        }))
      : [
          {
            number: 1,
            title: "Default Section",
            text: "Default section content.",
            anchors: ["§1"],
          },
        ];

  return {
    id: generateId("transcript"),
    type: "transcript",
    title: "Test Transcript",
    totalSections: defaultSections.length,
    sections: defaultSections,
    ...overrides,
  };
}

/**
 * Create a distillation document.
 */
export function createDistillationDocument(
  model: "opus-4.5" | "gpt-5.2" | "gemini-3" = "opus-4.5",
  overrides: Partial<DistillationDocument> = {},
): DistillationDocument {
  return {
    id: generateId("distillation"),
    type: "distillation",
    title: `Test Distillation (${model})`,
    model,
    totalSections: 1,
    sections: [
      {
        number: 1,
        title: "Test Section",
        text: "Test distillation content.",
        anchors: [],
      },
    ],
    ...overrides,
  };
}

// ============================================================================
// Session Factories
// ============================================================================

/**
 * Create a session fixture with custom properties.
 */
export function createSession(overrides: Partial<Session> = {}): Session {
  const id = overrides.id ?? generateId("session");
  const thread_id =
    overrides.thread_id ?? `RS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${id}`;

  return {
    id,
    thread_id,
    status: "pending",
    research_question: "Default research question for testing.",
    excerpts: [],
    created_at: generateTimestamp(-60), // 1 hour ago
    updated_at: generateTimestamp(),
    participants: [],
    ...overrides,
  };
}

/**
 * Create a session participant.
 */
export function createParticipant(overrides: Partial<SessionParticipant> = {}): SessionParticipant {
  return {
    agent: overrides.agent ?? `Agent-${generateId()}`,
    model: overrides.model ?? "opus-4.5",
    role: overrides.role,
    joined_at: overrides.joined_at ?? generateTimestamp(-30),
  };
}

/**
 * Create a session excerpt.
 */
export function createExcerpt(
  anchor: string,
  text: string,
  source: "transcript" | "quote-bank" | "distillation" = "transcript",
): SessionExcerpt {
  return { anchor, text, source };
}

// ============================================================================
// Artifact Factories
// ============================================================================

/**
 * Create empty artifact metadata.
 */
export function createArtifactMetadata(
  sessionId: string,
  overrides: Partial<ArtifactMetadata> = {},
): ArtifactMetadata {
  const now = generateTimestamp();
  return {
    session_id: sessionId,
    created_at: now,
    updated_at: now,
    version: 1,
    status: "draft",
    contributors: [],
    ...overrides,
  };
}

/**
 * Create a hypothesis item.
 */
export function createHypothesis(overrides: Partial<HypothesisItem> = {}): HypothesisItem {
  const id = overrides.id ?? generateId("H");
  return {
    id,
    name: overrides.name ?? "Test Hypothesis",
    claim: overrides.claim ?? "This is a test claim.",
    mechanism: overrides.mechanism ?? "Test mechanism explanation.",
    anchors: overrides.anchors ?? [],
    third_alternative: overrides.third_alternative ?? false,
  };
}

/**
 * Create a discriminative test item.
 */
export function createTest(overrides: Partial<TestItem> = {}): TestItem {
  const id = overrides.id ?? generateId("T");
  return {
    id,
    name: overrides.name ?? "Test Discriminative Test",
    procedure: overrides.procedure ?? "Test procedure description.",
    discriminates: overrides.discriminates ?? "H1 vs H2",
    expected_outcomes: overrides.expected_outcomes ?? {
      H1: "Expected outcome if H1 is true",
      H2: "Expected outcome if H2 is true",
    },
    potency_check: overrides.potency_check ?? "Control to verify test sensitivity.",
    feasibility: overrides.feasibility,
    score: overrides.score,
  };
}

/**
 * Create an assumption item.
 */
export function createAssumption(overrides: Partial<AssumptionItem> = {}): AssumptionItem {
  const id = overrides.id ?? generateId("A");
  return {
    id,
    name: overrides.name ?? "Test Assumption",
    statement: overrides.statement ?? "We assume this is true.",
    load: overrides.load ?? "If false, the analysis is compromised.",
    test: overrides.test ?? "Verification method.",
    status: overrides.status ?? "unchecked",
    scale_check: overrides.scale_check,
    calculation: overrides.calculation,
  };
}

/**
 * Create a critique item.
 */
export function createCritique(overrides: Partial<CritiqueItem> = {}): CritiqueItem {
  const id = overrides.id ?? generateId("C");
  return {
    id,
    name: overrides.name ?? "Test Critique",
    attack: overrides.attack ?? "This could be wrong because...",
    evidence: overrides.evidence ?? "Evidence that would confirm this attack.",
    current_status: overrides.current_status ?? "Unresolved",
    real_third_alternative: overrides.real_third_alternative,
  };
}

/**
 * Create a prediction item.
 */
export function createPrediction(overrides: Partial<PredictionItem> = {}): PredictionItem {
  const id = overrides.id ?? generateId("P");
  return {
    id,
    condition: overrides.condition ?? "Under test condition X",
    predictions: overrides.predictions ?? {
      H1: "Prediction if H1 is true",
      H2: "Prediction if H2 is true",
    },
  };
}

/**
 * Create a research thread.
 */
export function createResearchThread(
  overrides: Partial<ResearchThreadItem> = {},
): ResearchThreadItem {
  return {
    id: "RT",
    statement: overrides.statement ?? "Default research question?",
    context: overrides.context ?? "Context for the research.",
    why_it_matters: overrides.why_it_matters ?? "Why this matters.",
    anchors: overrides.anchors,
  };
}

/**
 * Create a complete artifact.
 */
export function createArtifact(overrides: Partial<Artifact> = {}): Artifact {
  const sessionId = overrides.metadata?.session_id ?? generateId("session");

  return {
    metadata: createArtifactMetadata(sessionId, overrides.metadata),
    sections: {
      research_thread: overrides.sections?.research_thread ?? null,
      hypothesis_slate: overrides.sections?.hypothesis_slate ?? [],
      predictions_table: overrides.sections?.predictions_table ?? [],
      discriminative_tests: overrides.sections?.discriminative_tests ?? [],
      assumption_ledger: overrides.sections?.assumption_ledger ?? [],
      anomaly_register: overrides.sections?.anomaly_register ?? [],
      adversarial_critique: overrides.sections?.adversarial_critique ?? [],
    },
  };
}

/**
 * Create a valid, complete artifact with all required sections.
 */
export function createValidArtifact(sessionId?: string): Artifact {
  const id = sessionId ?? generateId("session");

  return createArtifact({
    metadata: {
      session_id: id,
      created_at: generateTimestamp(-60),
      updated_at: generateTimestamp(),
      version: 3,
      status: "active",
      contributors: [
        { agent: "TestAgent1", contributed_at: generateTimestamp(-60) },
        { agent: "TestAgent2", contributed_at: generateTimestamp(-30) },
      ],
    },
    sections: {
      research_thread: createResearchThread(),
      hypothesis_slate: [
        createHypothesis({ id: "H1", name: "First Hypothesis" }),
        createHypothesis({ id: "H2", name: "Second Hypothesis" }),
        createHypothesis({ id: "H3", name: "Third Alternative", third_alternative: true }),
      ],
      predictions_table: [
        createPrediction({ id: "P1" }),
        createPrediction({ id: "P2" }),
        createPrediction({ id: "P3" }),
      ],
      discriminative_tests: [createTest({ id: "T1" }), createTest({ id: "T2" })],
      assumption_ledger: [
        createAssumption({ id: "A1" }),
        createAssumption({ id: "A2", scale_check: true, calculation: "Scale calculation." }),
      ],
      anomaly_register: [],
      adversarial_critique: [
        createCritique({ id: "C1" }),
        createCritique({ id: "C2", real_third_alternative: true }),
      ],
    },
  });
}

// ============================================================================
// User Factories
// ============================================================================

/**
 * Create a user fixture.
 */
export function createUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? generateId("user");
  return {
    id,
    email: overrides.email ?? `${id}@example.com`,
    name: overrides.name ?? `Test User ${id}`,
    role: overrides.role ?? "researcher",
    created_at: overrides.created_at ?? generateTimestamp(-7 * 24 * 60), // 1 week ago
    last_login_at: overrides.last_login_at,
    preferences: overrides.preferences,
  };
}

/**
 * Create an auth session.
 */
export function createAuthSession(user?: User, overrides: Partial<AuthSession> = {}): AuthSession {
  const sessionUser = user ?? createUser();
  return {
    user: sessionUser,
    access_token: overrides.access_token ?? `token-${generateId()}`,
    refresh_token: overrides.refresh_token,
    expires_at: overrides.expires_at ?? generateTimestamp(60), // 1 hour from now
    issued_at: overrides.issued_at ?? generateTimestamp(),
  };
}

// ============================================================================
// Agent Mail Factories
// ============================================================================

/**
 * Create an Agent Mail message.
 */
export function createAgentMailMessage(
  overrides: Partial<AgentMailMessage> = {},
): AgentMailMessage {
  return {
    id: overrides.id ?? Math.floor(Math.random() * 10000),
    subject: overrides.subject ?? "Test Message",
    from: overrides.from ?? "TestSender",
    to: overrides.to ?? ["TestRecipient"],
    body_md: overrides.body_md ?? "This is a test message.",
    importance: overrides.importance ?? "normal",
    ack_required: overrides.ack_required ?? false,
    created_ts: overrides.created_ts ?? generateTimestamp(-10),
    read_ts: overrides.read_ts,
    ack_ts: overrides.ack_ts,
    thread_id: overrides.thread_id,
    cc: overrides.cc,
    bcc: overrides.bcc,
    attachments: overrides.attachments,
  };
}

/**
 * Create an Agent Mail inbox.
 */
export function createAgentMailInbox(
  agent: string,
  messages: AgentMailMessage[] = [],
): AgentMailInbox {
  return {
    project: "/data/projects/brenner_bot",
    agent,
    count: messages.length,
    messages,
  };
}

/**
 * Create an agent profile.
 */
export function createAgentProfile(overrides: Partial<AgentProfile> = {}): AgentProfile {
  const id = overrides.id ?? Math.floor(Math.random() * 1000);
  return {
    id,
    name: overrides.name ?? `Agent-${id}`,
    program: overrides.program ?? "claude-code",
    model: overrides.model ?? "opus-4.5",
    task_description: overrides.task_description ?? "Test task",
    inception_ts: overrides.inception_ts ?? generateTimestamp(-120),
    last_active_ts: overrides.last_active_ts ?? generateTimestamp(),
    project_id: overrides.project_id ?? 8,
  };
}
