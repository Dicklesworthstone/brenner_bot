/**
 * E2E Agent Mail Seeder
 *
 * Utilities for seeding test sessions with Agent Mail test data.
 * Uses the AgentMailTestServer for isolated, deterministic E2E tests.
 *
 * @see brenner_bot-59rs (E2E Full Session Lifecycle)
 * @see brenner_bot-h909 (Agent Mail Test Server)
 */

import { AgentMailTestServer } from "../../src/test-utils/agent-mail-test-server";

// ============================================================================
// Types
// ============================================================================

export interface SessionConfig {
  /** Thread ID for the session */
  threadId: string;
  /** Operator/human who created the session */
  operator?: string;
  /** Messages to seed in the thread */
  messages?: SeededMessage[];
  /** Whether the session has a compiled artifact */
  hasArtifact?: boolean;
  /** Agents to register */
  agents?: SeededAgent[];
}

export interface SeededMessage {
  from: string;
  subject: string;
  body: string;
  type?:
    | "KICKOFF"
    | "DELTA"
    | "CRITIQUE"
    | "ACK"
    | "EVIDENCE"
    | "RESULT"
    | "ADMIN"
    | "COMPILE"
    | "PUBLISH";
  to?: string[];
}

export interface SeededAgent {
  name: string;
  role: "hypothesis_generator" | "test_designer" | "adversarial_critic" | "orchestrator";
  program?: string;
  model?: string;
}

// ============================================================================
// Test Server Singleton
// ============================================================================

let testServer: AgentMailTestServer | null = null;
let serverPort: number = 0;

function resolveDesiredPort(): number {
  const explicit = process.env.E2E_AGENT_MAIL_TEST_PORT?.trim();
  if (explicit) {
    const parsed = Number(explicit);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) return parsed;
  }

  const baseUrl = process.env.E2E_AGENT_MAIL_BASE_URL?.trim();
  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      if (url.port) {
        const parsed = Number(url.port);
        if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) return parsed;
      }
    } catch {
      // Ignore invalid URL env vars - fall back to random port
    }
  }

  return 0;
}

/**
 * Get or create the test server singleton.
 */
export async function getTestServer(): Promise<AgentMailTestServer> {
  if (!testServer) {
    testServer = new AgentMailTestServer();
    serverPort = await testServer.start(resolveDesiredPort()); // Default: random; can be pinned via env
  }
  return testServer;
}

/**
 * Get the test server URL.
 */
export function getTestServerUrl(): string {
  if (!testServer || !serverPort) {
    throw new Error("Test server not started. Call getTestServer() first.");
  }
  return `http://127.0.0.1:${serverPort}`;
}

/**
 * Stop the test server.
 */
export async function stopTestServer(): Promise<void> {
  if (testServer) {
    await testServer.stop();
    testServer = null;
    serverPort = 0;
  }
}

/**
 * Reset test server state (between tests).
 */
export function resetTestServer(): void {
  if (testServer) {
    testServer.reset();
  }
}

// ============================================================================
// Session Seeding
// ============================================================================

/**
 * Seed a test session with messages and agents.
 */
export async function seedTestSession(config: SessionConfig): Promise<void> {
  // Ensure test server is running (we don't need the return value)
  await getTestServer();
  const projectKey = "/data/projects/brenner_bot";

  // Register the orchestrator first
  const orchestratorName = config.operator || "TestOrchestrator";
  await callTestServer("register_agent", {
    project_key: projectKey,
    name: orchestratorName,
    program: "e2e-test",
    model: "test-model",
    task_description: `E2E test session: ${config.threadId}`,
  });

  // Register additional agents
  for (const agent of config.agents || []) {
    await callTestServer("register_agent", {
      project_key: projectKey,
      name: agent.name,
      program: agent.program || "e2e-test",
      model: agent.model || "test-model",
      task_description: `Role: ${agent.role}`,
    });
  }

  // Send seeded messages
  for (const msg of config.messages || []) {
    const recipients = msg.to || ["AllAgents"];
    await callTestServer("send_message", {
      project_key: projectKey,
      sender_name: msg.from,
      to: recipients,
      subject: msg.subject,
      body_md: msg.body,
      thread_id: config.threadId,
    });
  }
}

/**
 * Clean up a test session.
 */
export async function cleanupTestSession(threadId: string): Promise<void> {
  // Test server is in-memory, so cleanup is just for consistency
  // The reset() call between tests handles actual cleanup
  void threadId;
}

// ============================================================================
// Helpers
// ============================================================================

async function callTestServer(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const url = getTestServerUrl();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now().toString(),
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(`Test server error: ${response.status}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(`Tool error: ${result.error.message}`);
  }

  return result.result;
}

function deltaBlock(delta: unknown): string {
  return ["```delta", JSON.stringify(delta, null, 2), "```"].join("\n");
}

// ============================================================================
// Pre-built Test Fixtures
// ============================================================================

/**
 * Create a basic kickoff-only session.
 */
export function createKickoffSession(threadId: string): SessionConfig {
  return {
    threadId,
    operator: "TestOperator",
    agents: [
      { name: "HypothesisAgent", role: "hypothesis_generator" },
      { name: "TestDesigner", role: "test_designer" },
      { name: "Critic", role: "adversarial_critic" },
    ],
    messages: [
      {
        from: "TestOperator",
        subject: `KICKOFF: [${threadId}] Test Research Session`,
        body: `# Research Session: ${threadId}

## Excerpt
> §42: This is a test excerpt for E2E testing purposes.

## Research Question
What are the key factors that influence test reliability?

## Session Protocol
1. Generate hypotheses
2. Design discriminative tests
3. Critique and refine
`,
        type: "KICKOFF",
        to: ["HypothesisAgent", "TestDesigner", "Critic"],
      },
    ],
  };
}

/**
 * Create a session with agent responses (deltas).
 */
export function createSessionWithDeltas(threadId: string): SessionConfig {
  const base = createKickoffSession(threadId);

  const codexDeltas = [
    {
      operation: "EDIT",
      section: "research_thread",
      target_id: null,
      payload: {
        statement: "How do we reduce flaky tests in CI?",
        context: "E2E fixture thread for validating end-to-end session mechanics.",
        why_it_matters: "Flaky tests waste time and erode trust in results.",
        anchors: ["§42", "inference"],
      },
      rationale: "Establish research thread statement/context for lint + compilation.",
    },
    {
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null,
      payload: {
        name: "Isolation-first hypothesis",
        claim: "Test reliability depends primarily on isolation of test cases.",
        mechanism: "Shared state couples tests, creating cross-test interference and flakiness.",
        anchors: ["inference"],
      },
      rationale: "Primary hypothesis: shared state drives flakiness.",
    },
    {
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null,
      payload: {
        name: "Timing/async hypothesis",
        claim: "Flakiness is dominated by timing, async scheduling, and event ordering.",
        mechanism: "Race conditions and nondeterministic scheduling cause intermittent failures.",
        anchors: ["inference"],
      },
      rationale: "Alternative hypothesis: time + nondeterminism dominate.",
    },
    {
      operation: "ADD",
      section: "hypothesis_slate",
      target_id: null,
      payload: {
        name: "Third alternative: environment instability",
        claim: "The tests are mostly correct; CI environment instability drives failures.",
        mechanism:
          "Resource contention, noisy neighbors, and infra variability surface as flakiness.",
        anchors: ["inference"],
        third_alternative: true,
      },
      rationale: "Third alternative: neither 'test design' nor 'code' is primary—infra is.",
    },
    {
      operation: "ADD",
      section: "predictions_table",
      target_id: null,
      payload: {
        condition: "Run suite with strict isolation (fresh state per test)",
        predictions: {
          H1: "Pass rate increases markedly; failures cluster at shared-state boundaries.",
          H2: "Little change unless isolation affects timing; race failures persist.",
          H3: "Little change; failures correlate with load/host variance.",
        },
      },
      rationale: "Isolation should strongly discriminate H1 from H2/H3.",
    },
    {
      operation: "ADD",
      section: "predictions_table",
      target_id: null,
      payload: {
        condition: "Add deterministic scheduler / eliminate race windows",
        predictions: {
          H1: "Minor improvement; shared-state coupling still produces flakiness.",
          H2: "Major improvement; race failures drop sharply.",
          H3: "Minor improvement; infra variability still dominates.",
        },
      },
      rationale: "Scheduler control should discriminate H2.",
    },
    {
      operation: "ADD",
      section: "predictions_table",
      target_id: null,
      payload: {
        condition: "Re-run suite across CI hosts with varying load",
        predictions: {
          H1: "Failure rate roughly stable across hosts once isolated.",
          H2: "Failure rate roughly stable; race sensitivity not host-dependent.",
          H3: "Failure rate correlates strongly with host load/infra jitter.",
        },
      },
      rationale: "Host/load correlation discriminates H3 (third alternative).",
    },
  ];

  const opusDeltas = [
    {
      operation: "ADD",
      section: "discriminative_tests",
      target_id: null,
      payload: {
        name: "Isolation A/B test",
        procedure:
          "Run N=200 CI iterations comparing isolated vs shared-state mode; record failure rate and failure loci.",
        discriminates: "H1 vs (H2,H3) by testing whether isolation collapses flakiness.",
        expected_outcomes: {
          H1: "Large delta in pass rate in isolated mode.",
          H2: "Small delta; race failures persist.",
          H3: "Small delta; failures track load/infra.",
        },
        potency_check:
          "If isolation changes timing, ensure we attribute improvement to state (not scheduler).",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 2 },
      },
      rationale: "Directly tests whether shared-state coupling is the dominant mechanism.",
    },
    {
      operation: "ADD",
      section: "discriminative_tests",
      target_id: null,
      payload: {
        name: "Load sensitivity sweep",
        procedure:
          "Run suite while varying CPU/memory pressure; quantify failure correlation with load metrics.",
        discriminates: "H3 vs (H1,H2) by testing dependence on infra variability.",
        expected_outcomes: {
          H1: "Weak dependence after isolation.",
          H2: "Weak dependence; race failures depend on scheduling, not load.",
          H3: "Strong dependence; failures increase with load/jitter.",
        },
        potency_check: "Keep test inputs identical across load conditions; only vary load.",
        score: { likelihood_ratio: 2, cost: 2, speed: 1, ambiguity: 2 },
      },
      rationale: "Separates code/test causes from environmental causes.",
    },
    {
      operation: "ADD",
      section: "assumption_ledger",
      target_id: null,
      payload: {
        name: "Failure rate is measurable",
        statement: "Repeated runs yield a stable estimate of flakiness probability.",
        load: "Moderate",
        test: "Estimate CI failure rate across N runs; verify confidence interval narrows with N.",
      },
      rationale: "Without measurable flakiness probability, discrimination is impossible.",
    },
    {
      operation: "ADD",
      section: "assumption_ledger",
      target_id: null,
      payload: {
        name: "Isolation toggle does not alter semantics",
        statement: "Isolation changes coupling, not intended behavior of the system under test.",
        load: "High",
        test: "Verify isolated runs still cover the same code paths and assertions as baseline.",
      },
      rationale: "Otherwise improvements could be artifact of altered workload.",
    },
    {
      operation: "ADD",
      section: "assumption_ledger",
      target_id: null,
      payload: {
        name: "Scale check: sample size adequacy",
        statement: "N runs is large enough to detect expected effect size.",
        load: "High",
        test: "Power calculation for difference in proportions at alpha=0.05.",
        scale_check: true,
        calculation:
          "If p=0.10 baseline and we expect to reduce to 0.03, N≈150 per arm gives >80% power (rule-of-thumb).",
      },
      rationale: "Ensure we’re not underpowered and misled by noise.",
    },
  ];

  const geminiDeltas = [
    {
      operation: "ADD",
      section: "adversarial_critique",
      target_id: null,
      payload: {
        name: "Confounding: isolation changes timing",
        attack:
          "Isolation may change concurrency and scheduling, confounding attribution to shared state.",
        evidence:
          "If isolated mode also changes timing windows, race failures may disappear even if H1 is false.",
        current_status: "Unresolved — requires potency controls in test design.",
      },
      rationale: "Force potency control between 'state' and 'timing'.",
    },
    {
      operation: "ADD",
      section: "adversarial_critique",
      target_id: null,
      payload: {
        name: "Hidden fourth alternative",
        attack:
          "All three hypotheses could be wrong; failures might stem from nondeterministic external dependencies.",
        evidence:
          "If failures correlate with network calls or external services, neither state, timing, nor infra load is primary.",
        current_status: "Investigate by hermeticizing external dependencies (record/replay).",
        real_third_alternative: true,
      },
      rationale: "Enforce the 'both could be wrong' Brenner move.",
    },
  ];

  return {
    ...base,
    messages: [
      ...base.messages!,
      {
        from: "HypothesisAgent",
        subject: `DELTA[codex_cli]: [${threadId}] Hypotheses + predictions`,
        body: codexDeltas.map(deltaBlock).join("\n\n"),
        type: "DELTA",
        to: ["TestOperator"],
      },
      {
        from: "TestDesigner",
        subject: `DELTA[opus]: [${threadId}] Discriminative tests + assumptions`,
        body: opusDeltas.map(deltaBlock).join("\n\n"),
        type: "DELTA",
        to: ["TestOperator"],
      },
      {
        from: "Critic",
        subject: `DELTA[gemini_cli]: [${threadId}] Adversarial critiques`,
        body: geminiDeltas.map(deltaBlock).join("\n\n"),
        type: "DELTA",
        to: ["TestOperator"],
      },
    ],
  };
}

/**
 * Create a session with a compiled artifact.
 */
export function createSessionWithArtifact(threadId: string): SessionConfig {
  const base = createSessionWithDeltas(threadId);
  return {
    ...base,
    hasArtifact: true,
    messages: [
      ...base.messages!,
      {
        from: "TestOperator",
        subject: `COMPILED: v1 ${threadId} artifact`,
        body: `# Research Artifact: ${threadId}

## Hypothesis Slate

### H1: Test Isolation
**Statement**: Test reliability depends primarily on isolation of test cases.

## Tests

### T1: Isolation Comparison
**Design**: Run 100 iterations with and without shared state.

## Critiques

### C1: Missing Assumption
**Target**: H1
**Content**: Assumes shared state is primary cause of flakiness.
`,
        type: "COMPILE",
        to: ["HypothesisAgent", "TestDesigner", "Critic"],
      },
    ],
  };
}
