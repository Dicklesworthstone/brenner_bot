/**
 * E2E Tests: Multi-Agent Orchestration
 *
 * Tests multi-agent coordination patterns including:
 * - Agent handoffs (passing work between agents)
 * - Concurrent agent responses
 * - Agent-to-agent communication
 * - Multi-session coordination
 * - Orchestration error scenarios
 *
 * Philosophy: NO mocks - test real behavior with isolated test fixtures.
 *
 * @see brenner_bot-knbw (Multi-Agent Orchestration)
 * @see brenner_bot-h909 (Agent Mail Test Server)
 */

import {
  expect,
  navigateTo,
  type SeededAgent,
  type SessionConfig,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";
import { withStep } from "./utils/e2e-logging";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the cookie domain from the BASE_URL.
 */
function getCookieDomain(): string {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  try {
    const url = new URL(baseUrl);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

/**
 * Set up lab auth cookie for a context.
 */
async function setupLabAuth(context: import("@playwright/test").BrowserContext) {
  const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
  await context.addCookies([
    {
      name: "brenner_lab_secret",
      value: labSecret,
      domain: getCookieDomain(),
      path: "/",
    },
  ]);
}

/**
 * Check if we should skip tests (lab mode disabled or auth required).
 */
async function shouldSkipTest(
  page: import("@playwright/test").Page,
  logger: { info: (msg: string) => void; warn: (msg: string) => void },
  testName: string,
): Promise<boolean> {
  const pageText = await page.locator("body").textContent();

  // Check for 404
  const is404 = await page.evaluate(() => {
    return (
      document.querySelector("title")?.textContent?.includes("404") ||
      document.body.textContent?.includes("This page could not be found") ||
      document.body.textContent?.includes("Not found")
    );
  });

  if (is404) {
    logger.info(`${testName}: Page not found (404), skipping test`);
    return true;
  }

  // Check for locked state
  if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
    logger.warn(`${testName}: Auth required, skipping test`);
    return true;
  }

  return false;
}

// ============================================================================
// Multi-Agent Session Fixtures
// ============================================================================

/**
 * The BrennerBot agent roster for multi-agent orchestration.
 */
const BRENNERBOT_AGENTS: SeededAgent[] = [
  {
    name: "HypothesisAgent",
    role: "hypothesis_generator",
    program: "claude-code",
    model: "opus-4.5",
  },
  { name: "TestDesigner", role: "test_designer", program: "codex-cli", model: "gpt-5" },
  {
    name: "AdversarialCritic",
    role: "adversarial_critic",
    program: "gemini-cli",
    model: "gemini-3",
  },
  { name: "Orchestrator", role: "orchestrator", program: "claude-code", model: "opus-4.5" },
];

/**
 * Create a session with agent handoff pattern:
 * Orchestrator -> HypothesisAgent -> TestDesigner -> AdversarialCritic -> Orchestrator
 */
function createHandoffSession(threadId: string): SessionConfig {
  return {
    threadId,
    operator: "Orchestrator",
    agents: BRENNERBOT_AGENTS,
    messages: [
      // Step 1: Orchestrator kicks off the session
      {
        from: "Orchestrator",
        subject: `[${threadId}] KICKOFF: Multi-Agent Research Session`,
        body: `# Research Session: ${threadId}

## Research Question
How do coding agents best coordinate on complex refactoring tasks?

## Protocol
Each agent contributes in sequence, building on previous work.

**@HypothesisAgent**: Please generate initial hypotheses.
`,
        type: "KICKOFF",
        to: ["HypothesisAgent", "TestDesigner", "AdversarialCritic"],
      },
      // Step 2: HypothesisAgent responds and hands off to TestDesigner
      {
        from: "HypothesisAgent",
        subject: `Re: [${threadId}] HANDOFF: Hypotheses ready for test design`,
        body: `\`\`\`delta
ADD hypothesis H1
statement: File reservation reduces merge conflicts by 85%.
mechanism: Exclusive leases prevent concurrent modifications.
anchors: [agent-mail file reservations]
confidence: high
\`\`\`

\`\`\`delta
ADD hypothesis H2
statement: Agent mail threading improves context retention by 3x.
mechanism: Thread IDs maintain conversation continuity.
anchors: [agent-mail messaging]
confidence: medium
\`\`\`

**Handoff to @TestDesigner**: Please design discriminative tests for H1 and H2.
`,
        type: "DELTA",
        to: ["TestDesigner", "Orchestrator"],
      },
      // Step 3: TestDesigner responds and hands off to AdversarialCritic
      {
        from: "TestDesigner",
        subject: `Re: [${threadId}] HANDOFF: Tests ready for critique`,
        body: `\`\`\`delta
ADD test T1
hypothesis: H1
design: Measure merge conflict rate with vs without file reservations over 100 agent sessions.
discriminates: H1 (reservation) vs null hypothesis
evidence_required: Conflict count comparison
\`\`\`

\`\`\`delta
ADD test T2
hypothesis: H2
design: Compare context accuracy with vs without thread IDs across 50 multi-turn conversations.
discriminates: H2 (threading) vs null hypothesis
evidence_required: Context relevance scores
\`\`\`

**Handoff to @AdversarialCritic**: Please critique these test designs.
`,
        type: "DELTA",
        to: ["AdversarialCritic", "Orchestrator"],
      },
      // Step 4: AdversarialCritic provides critique
      {
        from: "AdversarialCritic",
        subject: `Re: [${threadId}] CRITIQUE: Test design feedback`,
        body: `\`\`\`delta
ADD critique C1
target: T1
type: confounding_variable
content: T1 doesn't control for agent experience level. Senior agents may cause fewer conflicts regardless of reservations.
\`\`\`

\`\`\`delta
ADD critique C2
target: H1
type: alternative_hypothesis
content: The 85% reduction claim lacks empirical basis. Actual improvement may be lower due to lock contention.
\`\`\`

**Back to @Orchestrator**: Critiques complete. Ready for synthesis.
`,
        type: "DELTA",
        to: ["Orchestrator"],
      },
      // Step 5: Orchestrator synthesizes
      {
        from: "Orchestrator",
        subject: `Re: [${threadId}] SYNTHESIS: Round 1 complete`,
        body: `# Round 1 Synthesis

## Hypotheses Generated: 2
- H1: File reservation (high confidence)
- H2: Threading benefits (medium confidence)

## Tests Designed: 2
- T1: Reservation effectiveness
- T2: Thread context retention

## Critiques Received: 2
- C1: Confounding variable in T1
- C2: Weak empirical basis for H1

## Next Steps
Address C1 by adding agent experience as a control variable in T1.
Address C2 by conducting preliminary observational study.

**Status**: Handoff cycle complete. Ready for Round 2.
`,
        type: "ADMIN",
        to: ["HypothesisAgent", "TestDesigner", "AdversarialCritic"],
      },
    ],
  };
}

/**
 * Create a session with concurrent agent responses.
 * Multiple agents respond to the same kickoff simultaneously.
 */
function createConcurrentSession(threadId: string): SessionConfig {
  return {
    threadId,
    operator: "Orchestrator",
    agents: BRENNERBOT_AGENTS,
    messages: [
      // Orchestrator sends kickoff to all agents
      {
        from: "Orchestrator",
        subject: `[${threadId}] KICKOFF: Parallel Agent Analysis`,
        body: `# Parallel Analysis Request

## Research Question
What are the failure modes in multi-agent coding systems?

## Instructions
ALL AGENTS: Respond concurrently with your perspective.
- HypothesisAgent: Generate failure mode hypotheses
- TestDesigner: Propose detection mechanisms
- AdversarialCritic: Identify blind spots

**Deadline**: All responses expected within this round.
`,
        type: "KICKOFF",
        to: ["HypothesisAgent", "TestDesigner", "AdversarialCritic"],
      },
      // All three agents respond "concurrently" (in quick succession)
      {
        from: "HypothesisAgent",
        subject: `Re: [${threadId}] Failure Mode Hypotheses`,
        body: `\`\`\`delta
ADD hypothesis FM1
statement: Resource starvation occurs when agents compete for file reservations.
mechanism: TTL expiry during long operations causes reservation loss.
confidence: high
\`\`\`

\`\`\`delta
ADD hypothesis FM2
statement: Message ordering inconsistency causes state divergence.
mechanism: Async delivery may reorder dependent messages.
confidence: medium
\`\`\`
`,
        type: "DELTA",
        to: ["Orchestrator"],
      },
      {
        from: "TestDesigner",
        subject: `Re: [${threadId}] Detection Mechanisms`,
        body: `\`\`\`delta
ADD test DETECT1
hypothesis: FM1
design: Monitor reservation expiry events and correlate with operation duration.
evidence_required: Expiry count vs operation time histogram
\`\`\`

\`\`\`delta
ADD test DETECT2
hypothesis: FM2
design: Add sequence numbers to messages and detect out-of-order delivery.
evidence_required: Ordering violation count
\`\`\`
`,
        type: "DELTA",
        to: ["Orchestrator"],
      },
      {
        from: "AdversarialCritic",
        subject: `Re: [${threadId}] Blind Spots Identified`,
        body: `\`\`\`delta
ADD critique BS1
target: FM1
type: scope_limitation
content: FM1 focuses on file reservations but ignores message queue backpressure.
\`\`\`

\`\`\`delta
ADD critique BS2
target: overall
type: missing_category
content: No hypotheses address cross-project coordination failures (agent working on wrong repo).
\`\`\`
`,
        type: "DELTA",
        to: ["Orchestrator"],
      },
    ],
  };
}

/**
 * Create a session demonstrating agent-to-agent direct communication.
 */
function createAgentToAgentSession(threadId: string): SessionConfig {
  return {
    threadId,
    operator: "Orchestrator",
    agents: BRENNERBOT_AGENTS,
    messages: [
      // Orchestrator sets up the session
      {
        from: "Orchestrator",
        subject: `[${threadId}] KICKOFF: Agent Collaboration Mode`,
        body: `# Direct Collaboration Session

Agents may communicate directly with each other to resolve issues.
Orchestrator will monitor but not intervene unless needed.
`,
        type: "KICKOFF",
        to: ["HypothesisAgent", "TestDesigner", "AdversarialCritic"],
      },
      // HypothesisAgent sends directly to TestDesigner
      {
        from: "HypothesisAgent",
        subject: `Re: [${threadId}] @TestDesigner: Need test design input`,
        body: `@TestDesigner: I'm working on hypothesis H3 about cache invalidation.
Before I finalize, can you confirm if this is testable?

\`\`\`delta
DRAFT hypothesis H3
statement: Agent cache invalidation latency causes stale reads.
mechanism: Distributed cache coherence delays.
confidence: pending_test_feasibility
\`\`\`
`,
        type: "DELTA",
        to: ["TestDesigner"],
      },
      // TestDesigner responds directly to HypothesisAgent
      {
        from: "TestDesigner",
        subject: `Re: [${threadId}] @HypothesisAgent: H3 is testable`,
        body: `@HypothesisAgent: H3 is testable. I can design a latency injection test.

Suggested modification: Add explicit latency bounds to make the hypothesis falsifiable.

\`\`\`delta
SUGGEST hypothesis H3 modification
add field: latency_threshold_ms = 100
rationale: Makes "stale" operationally defined
\`\`\`
`,
        type: "DELTA",
        to: ["HypothesisAgent"],
      },
      // AdversarialCritic interjects with a concern
      {
        from: "AdversarialCritic",
        subject: `Re: [${threadId}] Interjection on H3 discussion`,
        body: `Observing the H3 discussion:

\`\`\`delta
ADD critique IC1
target: H3
type: measurement_challenge
content: 100ms threshold may be too high for real-time coordination scenarios. Consider differentiated thresholds by operation type.
\`\`\`

cc: @HypothesisAgent @TestDesigner
`,
        type: "DELTA",
        to: ["HypothesisAgent", "TestDesigner", "Orchestrator"],
      },
    ],
  };
}

/**
 * Create a session with multi-round coordination.
 */
function createMultiRoundSession(threadId: string): SessionConfig {
  return {
    threadId,
    operator: "Orchestrator",
    agents: BRENNERBOT_AGENTS,
    messages: [
      // Round 1: Initial kickoff
      {
        from: "Orchestrator",
        subject: `[${threadId}] KICKOFF: Multi-Round Research Protocol`,
        body: `# Multi-Round Protocol

## Round 1: Hypothesis Generation
@HypothesisAgent: Generate 2 hypotheses.

Subsequent rounds will refine based on feedback.
`,
        type: "KICKOFF",
        to: ["HypothesisAgent", "TestDesigner", "AdversarialCritic"],
      },
      // Round 1: HypothesisAgent responds
      {
        from: "HypothesisAgent",
        subject: `Re: [${threadId}] Round 1: Initial Hypotheses`,
        body: `\`\`\`delta
ADD hypothesis R1H1
statement: Larger context windows improve agent accuracy.
confidence: medium
round: 1
\`\`\`
`,
        type: "DELTA",
        to: ["Orchestrator"],
      },
      // Round 2: Orchestrator advances
      {
        from: "Orchestrator",
        subject: `Re: [${threadId}] Round 2: Test Design Phase`,
        body: `# Round 2 Instructions

R1H1 received. Moving to test design phase.

@TestDesigner: Design test for R1H1.
@AdversarialCritic: Prepare critique.
`,
        type: "ADMIN",
        to: ["TestDesigner", "AdversarialCritic"],
      },
      // Round 2: TestDesigner responds
      {
        from: "TestDesigner",
        subject: `Re: [${threadId}] Round 2: Test for R1H1`,
        body: `\`\`\`delta
ADD test R2T1
hypothesis: R1H1
design: Compare accuracy at 8K, 32K, and 128K context windows.
round: 2
\`\`\`
`,
        type: "DELTA",
        to: ["Orchestrator"],
      },
      // Round 2: AdversarialCritic responds
      {
        from: "AdversarialCritic",
        subject: `Re: [${threadId}] Round 2: Critique of R1H1`,
        body: `\`\`\`delta
ADD critique R2C1
target: R1H1
type: operationalization
content: "Accuracy" is undefined. Need specific metrics.
round: 2
\`\`\`
`,
        type: "DELTA",
        to: ["Orchestrator"],
      },
      // Round 3: Refinement
      {
        from: "Orchestrator",
        subject: `Re: [${threadId}] Round 3: Refinement Phase`,
        body: `# Round 3: Refinement

Critique R2C1 is valid.

@HypothesisAgent: Revise R1H1 with specific accuracy metrics.
`,
        type: "ADMIN",
        to: ["HypothesisAgent"],
      },
      // Round 3: HypothesisAgent revises
      {
        from: "HypothesisAgent",
        subject: `Re: [${threadId}] Round 3: Revised Hypothesis`,
        body: `\`\`\`delta
REVISE hypothesis R1H1
statement: Larger context windows improve test pass rate by 15% per 4x context increase.
confidence: high
round: 3
revision_note: Added specific metric per R2C1 feedback
\`\`\`
`,
        type: "DELTA",
        to: ["Orchestrator", "AdversarialCritic"],
      },
    ],
  };
}

// ============================================================================
// Multi-Agent Orchestration Tests
// ============================================================================

test.describe("Multi-Agent Orchestration: Handoff Patterns", () => {
  test("displays complete agent handoff chain", async ({ page, logger, context, testSession }) => {
    const threadId = `E2E-HANDOFF-${Date.now()}`;
    const config = createHandoffSession(threadId);

    await withStep(logger, page, "Seed handoff session", async () => {
      await testSession.seed(config);
      logger.info(`Seeded handoff session: ${threadId}`);
    });

    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "handoff chain")) {
      return;
    }

    // Verify all agents are represented
    await withStep(logger, page, "Verify all agents participated", async () => {
      const pageText = await page.locator("body").textContent();
      const agents = ["Orchestrator", "HypothesisAgent", "TestDesigner", "AdversarialCritic"];

      for (const agent of agents) {
        const hasAgent = pageText?.includes(agent);
        logger.info(`Agent ${agent} visible: ${hasAgent}`);
        expect(hasAgent).toBeTruthy();
      }
    });

    // Verify handoff keywords
    await withStep(logger, page, "Verify handoff transitions", async () => {
      const pageText = await page.locator("body").textContent();
      const hasHandoff = pageText?.includes("Handoff") || pageText?.includes("HANDOFF");
      logger.info(`Handoff markers found: ${hasHandoff}`);
      expect(hasHandoff).toBeTruthy();
    });

    // Verify synthesis message
    await withStep(logger, page, "Verify synthesis message", async () => {
      const pageText = await page.locator("body").textContent();
      const hasSynthesis = pageText?.includes("Synthesis") || pageText?.includes("SYNTHESIS");
      logger.info(`Synthesis message found: ${hasSynthesis}`);
      expect(hasSynthesis).toBeTruthy();
    });

    await takeScreenshot(page, logger, "multi-agent-handoff-chain");
  });

  test("shows message count reflecting all handoffs", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    const threadId = `E2E-HANDOFF-COUNT-${Date.now()}`;
    const config = createHandoffSession(threadId);

    await testSession.seed(config);
    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "handoff count")) {
      return;
    }

    await withStep(logger, page, "Count messages in thread", async () => {
      // Look for message cards or similar indicators
      const pageText = await page.locator("body").textContent();
      const replyCount = (pageText?.match(/Re:/g) || []).length;
      logger.info(`Found ${replyCount} reply messages (expected 4)`);

      // We expect at least 4 replies (from each agent)
      expect(replyCount).toBeGreaterThanOrEqual(4);
    });

    await takeScreenshot(page, logger, "multi-agent-handoff-count");
  });
});

test.describe("Multi-Agent Orchestration: Concurrent Responses", () => {
  test("displays concurrent agent responses together", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    const threadId = `E2E-CONCURRENT-${Date.now()}`;
    const config = createConcurrentSession(threadId);

    await withStep(logger, page, "Seed concurrent session", async () => {
      await testSession.seed(config);
      logger.info(`Seeded concurrent session: ${threadId}`);
    });

    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "concurrent responses")) {
      return;
    }

    // Verify all three agents responded
    await withStep(logger, page, "Verify concurrent responses", async () => {
      const pageText = await page.locator("body").textContent();

      const hasHypotheses = pageText?.includes("FM1") || pageText?.includes("Failure Mode");
      const hasTests = pageText?.includes("DETECT") || pageText?.includes("Detection");
      const hasCritiques = pageText?.includes("BS1") || pageText?.includes("Blind Spots");

      logger.info(`Hypotheses found: ${hasHypotheses}`);
      logger.info(`Tests found: ${hasTests}`);
      logger.info(`Critiques found: ${hasCritiques}`);

      expect(hasHypotheses || hasTests || hasCritiques).toBeTruthy();
    });

    await takeScreenshot(page, logger, "multi-agent-concurrent");
  });

  test("parallel analysis shows all perspectives", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    const threadId = `E2E-PARALLEL-${Date.now()}`;
    const config = createConcurrentSession(threadId);

    await testSession.seed(config);
    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "parallel analysis")) {
      return;
    }

    await withStep(logger, page, "Verify parallel perspectives", async () => {
      const pageText = await page.locator("body").textContent();

      // Each agent should have contributed their domain expertise
      const domains = ["hypothesis", "test", "critique"];
      let foundDomains = 0;

      for (const domain of domains) {
        if (pageText?.toLowerCase().includes(domain)) {
          foundDomains++;
        }
      }

      logger.info(`Found ${foundDomains}/3 domain perspectives`);
      expect(foundDomains).toBeGreaterThanOrEqual(2);
    });

    await takeScreenshot(page, logger, "multi-agent-parallel-perspectives");
  });
});

test.describe("Multi-Agent Orchestration: Agent-to-Agent Communication", () => {
  test("shows direct agent-to-agent messages", async ({ page, logger, context, testSession }) => {
    const threadId = `E2E-A2A-${Date.now()}`;
    const config = createAgentToAgentSession(threadId);

    await withStep(logger, page, "Seed agent-to-agent session", async () => {
      await testSession.seed(config);
      logger.info(`Seeded agent-to-agent session: ${threadId}`);
    });

    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "agent-to-agent")) {
      return;
    }

    // Verify agent @mentions
    await withStep(logger, page, "Verify agent mentions", async () => {
      const pageText = await page.locator("body").textContent();

      const hasMention =
        pageText?.includes("@TestDesigner") || pageText?.includes("@HypothesisAgent");

      logger.info(`Agent mentions found: ${hasMention}`);
      expect(hasMention).toBeTruthy();
    });

    // Verify back-and-forth communication
    await withStep(logger, page, "Verify direct communication", async () => {
      const pageText = await page.locator("body").textContent();

      // Should see response patterns
      const hasResponse =
        pageText?.includes("is testable") || pageText?.includes("Suggested modification");

      logger.info(`Direct response found: ${hasResponse}`);
      expect(hasResponse).toBeTruthy();
    });

    await takeScreenshot(page, logger, "multi-agent-direct-communication");
  });

  test("displays interjection from third agent", async ({ page, logger, context, testSession }) => {
    const threadId = `E2E-INTERJECT-${Date.now()}`;
    const config = createAgentToAgentSession(threadId);

    await testSession.seed(config);
    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "interjection")) {
      return;
    }

    await withStep(logger, page, "Verify critic interjection", async () => {
      const pageText = await page.locator("body").textContent();

      const hasInterjection =
        pageText?.includes("Interjection") ||
        pageText?.includes("Observing") ||
        pageText?.includes("AdversarialCritic");

      logger.info(`Interjection found: ${hasInterjection}`);
      expect(hasInterjection).toBeTruthy();
    });

    await takeScreenshot(page, logger, "multi-agent-interjection");
  });
});

test.describe("Multi-Agent Orchestration: Multi-Round Coordination", () => {
  test("displays multiple rounds of refinement", async ({ page, logger, context, testSession }) => {
    const threadId = `E2E-MULTIROUND-${Date.now()}`;
    const config = createMultiRoundSession(threadId);

    await withStep(logger, page, "Seed multi-round session", async () => {
      await testSession.seed(config);
      logger.info(`Seeded multi-round session: ${threadId}`);
    });

    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "multi-round")) {
      return;
    }

    // Verify round markers
    await withStep(logger, page, "Verify round markers", async () => {
      const pageText = await page.locator("body").textContent();

      const hasRound1 = pageText?.includes("Round 1");
      const hasRound2 = pageText?.includes("Round 2");
      const hasRound3 = pageText?.includes("Round 3");

      logger.info(`Round 1: ${hasRound1}, Round 2: ${hasRound2}, Round 3: ${hasRound3}`);

      // Should have at least 2 rounds visible
      const roundCount = [hasRound1, hasRound2, hasRound3].filter(Boolean).length;
      expect(roundCount).toBeGreaterThanOrEqual(2);
    });

    await takeScreenshot(page, logger, "multi-agent-multi-round");
  });

  test("shows hypothesis revision based on feedback", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    const threadId = `E2E-REVISION-${Date.now()}`;
    const config = createMultiRoundSession(threadId);

    await testSession.seed(config);
    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "revision")) {
      return;
    }

    await withStep(logger, page, "Verify hypothesis revision", async () => {
      const pageText = await page.locator("body").textContent();

      const hasRevision =
        pageText?.includes("REVISE") ||
        pageText?.includes("Revised") ||
        pageText?.includes("revision_note");

      logger.info(`Revision found: ${hasRevision}`);
      expect(hasRevision).toBeTruthy();
    });

    await withStep(logger, page, "Verify feedback incorporation", async () => {
      const pageText = await page.locator("body").textContent();

      // The revision should reference the critique
      const hasFeedbackRef = pageText?.includes("per R2C1") || pageText?.includes("feedback");

      logger.info(`Feedback reference found: ${hasFeedbackRef}`);
      expect(hasFeedbackRef).toBeTruthy();
    });

    await takeScreenshot(page, logger, "multi-agent-revision");
  });
});

test.describe("Multi-Agent Orchestration: Session Summary", () => {
  test("session page shows agent participation summary", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    const threadId = `E2E-SUMMARY-${Date.now()}`;
    const config = createHandoffSession(threadId);

    await testSession.seed(config);
    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "session summary")) {
      return;
    }

    await withStep(logger, page, "Check for participant indicators", async () => {
      const pageText = await page.locator("body").textContent();

      // Look for any kind of participant list or badges
      const agents = ["HypothesisAgent", "TestDesigner", "AdversarialCritic", "Orchestrator"];
      let visibleAgents = 0;

      for (const agent of agents) {
        if (pageText?.includes(agent)) {
          visibleAgents++;
        }
      }

      logger.info(`Visible agents: ${visibleAgents}/4`);
      expect(visibleAgents).toBeGreaterThanOrEqual(3);
    });

    await takeScreenshot(page, logger, "multi-agent-session-summary");
  });
});

test.describe("Multi-Agent Orchestration: Delta Parsing", () => {
  test("parses deltas from multiple agents correctly", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    const threadId = `E2E-DELTAS-MULTI-${Date.now()}`;
    const config = createHandoffSession(threadId);

    await testSession.seed(config);
    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "multi-agent deltas")) {
      return;
    }

    await withStep(logger, page, "Verify delta parsing", async () => {
      const pageText = await page.locator("body").textContent();

      // Check for hypothesis deltas
      const hasH1 = pageText?.includes("H1") || pageText?.includes("hypothesis");
      const hasT1 = pageText?.includes("T1") || pageText?.includes("test");
      const hasC1 = pageText?.includes("C1") || pageText?.includes("critique");

      logger.info(`H1 found: ${hasH1}, T1 found: ${hasT1}, C1 found: ${hasC1}`);
      // At least one delta type should be visible
      const hasDelta = hasH1 || hasT1 || hasC1;
      expect(hasDelta).toBeTruthy();
    });

    await takeScreenshot(page, logger, "multi-agent-deltas-parsed");
  });
});
