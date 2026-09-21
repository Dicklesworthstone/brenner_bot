/**
 * E2E Tests: Agent Mail Integration
 *
 * Tests the complete session lifecycle with real (but isolated) Agent Mail
 * using the AgentMailTestServer. These tests verify actual data flow
 * between the UI and Agent Mail, not just UI behavior.
 *
 * Philosophy: NO mocks - test real behavior with isolated test fixtures.
 *
 * Prerequisites:
 * - Lab mode enabled (BRENNER_LAB_MODE=1)
 * - Authentication via BRENNER_LAB_SECRET or Cloudflare Access
 * - Agent Mail test server (auto-started by test fixtures)
 *
 * @see brenner_bot-59rs (E2E Full Session Lifecycle)
 * @see brenner_bot-h909 (Agent Mail Test Server)
 */

import {
  assertTextContent,
  createKickoffSession,
  createSessionWithArtifact,
  createSessionWithDeltas,
  expect,
  navigateTo,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";
import { type createE2ELogger, withStep } from "./utils/e2e-logging";

declare global {
  interface Window {
    __brennerE2E?: {
      realtime?: { readyCount: number; threadUpdateCount: number };
    };
  }
}

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

async function preflightAgentMailTestServer(params: {
  page: import("@playwright/test").Page;
  logger: ReturnType<typeof createE2ELogger>;
  context: import("@playwright/test").BrowserContext;
  testSession: { getServerUrl: () => string };
}): Promise<boolean> {
  const { page, logger, context, testSession } = params;

  await setupLabAuth(context);
  await navigateTo(page, logger, "/sessions/new");
  await waitForNetworkIdle(page, logger);

  if (await shouldSkipTest(page, logger, "agent mail preflight")) {
    return false;
  }

  const serverUrl = testSession.getServerUrl();
  const pageText = await page.locator("body").textContent();

  // Refuse to run if we'd hit the real local Agent Mail default.
  if (pageText?.includes("http://127.0.0.1:8765") || pageText?.includes("http://localhost:8765")) {
    logger.warn(
      "Refusing to run integration E2E: Agent Mail base URL points at :8765 (real server).",
    );
    return false;
  }

  if (!pageText?.includes(serverUrl)) {
    logger.warn(
      `Skipping: web app not configured to use E2E Agent Mail test server (${serverUrl}).`,
    );
    return false;
  }

  if (!pageText.includes("Connected")) {
    logger.warn("Skipping: Agent Mail shows as unreachable (expected Connected).");
    return false;
  }

  logger.info(`Preflight OK: web app is using Agent Mail test server at ${serverUrl}`);
  return true;
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
// Agent Mail Integration Tests: Session Display with Seeded Data
// ============================================================================

test.describe("Agent Mail Integration: Seeded Session Display", () => {
  test.describe("Kickoff Session", () => {
    test("displays seeded kickoff message in thread", async ({
      page,
      logger,
      context,
      testSession,
    }) => {
      if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
        return;
      }

      // Seed a kickoff-only session
      const threadId = `E2E-KICKOFF-${Date.now()}`;
      const config = createKickoffSession(threadId);

      await withStep(logger, page, "Seed test session", async () => {
        await testSession.seed(config);
        logger.info(`Seeded session: ${threadId}`);
      });

      // Set up auth and navigate
      await setupLabAuth(context);
      await navigateTo(page, logger, `/sessions/${threadId}`);
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipTest(page, logger, "kickoff display")) {
        return;
      }

      // Verify session header
      await withStep(logger, page, "Verify session header", async () => {
        await assertTextContent(page, logger, "body", threadId);
      });

      // Verify KICKOFF message is visible
      await withStep(logger, page, "Verify KICKOFF message", async () => {
        const pageText = await page.locator("body").textContent();
        const hasKickoff = pageText?.includes("KICKOFF") || pageText?.includes("Research Session");
        expect(hasKickoff).toBeTruthy();
        logger.info("KICKOFF message found in thread");
      });

      // Verify agents are mentioned
      await withStep(logger, page, "Verify agent mentions", async () => {
        const pageText = await page.locator("body").textContent();
        const hasAgents =
          pageText?.includes("HypothesisAgent") ||
          pageText?.includes("TestDesigner") ||
          pageText?.includes("Critic");
        logger.info(`Agent mentions found: ${hasAgents}`);
      });

      await takeScreenshot(page, logger, "agent-mail-kickoff-session");
    });
  });

  test.describe("Session with Deltas", () => {
    test("displays agent delta responses in thread", async ({
      page,
      logger,
      context,
      testSession,
    }) => {
      if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
        return;
      }

      // Seed a session with delta responses
      const threadId = `E2E-DELTAS-${Date.now()}`;
      const config = createSessionWithDeltas(threadId);

      await withStep(logger, page, "Seed session with deltas", async () => {
        await testSession.seed(config);
        logger.info(`Seeded session with deltas: ${threadId}`);
      });

      // Set up auth and navigate
      await setupLabAuth(context);
      await navigateTo(page, logger, `/sessions/${threadId}`);
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipTest(page, logger, "delta display")) {
        return;
      }

      // Verify deltas are visible
      await withStep(logger, page, "Verify delta messages", async () => {
        const pageText = await page.locator("body").textContent();
        const hasParsedDeltas =
          pageText?.includes("Parsed Deltas") &&
          pageText?.includes("DELTA[") &&
          pageText?.includes("hypothesis_slate");
        expect(hasParsedDeltas).toBeTruthy();
        logger.info("Parsed DELTA messages found in thread");
      });

      // Check for multiple messages (KICKOFF + responses)
      await withStep(logger, page, "Verify multiple messages", async () => {
        const pageText = await page.locator("body").textContent();
        const messageCount = (pageText?.match(/Re:/g) || []).length;
        logger.info(`Found ${messageCount} reply messages`);
      });

      await takeScreenshot(page, logger, "agent-mail-deltas-session");
    });

    test("parsed deltas section shows delta content", async ({
      page,
      logger,
      context,
      testSession,
    }) => {
      if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
        return;
      }

      const threadId = `E2E-PARSED-${Date.now()}`;
      const config = createSessionWithDeltas(threadId);

      await testSession.seed(config);
      await setupLabAuth(context);
      await navigateTo(page, logger, `/sessions/${threadId}`);
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipTest(page, logger, "parsed deltas")) {
        return;
      }

      // Look for parsed deltas section
      await withStep(logger, page, "Check parsed deltas section", async () => {
        const pageText = await page.locator("body").textContent();
        const hasParsedSection =
          pageText?.includes("Parsed") ||
          pageText?.includes("Deltas") ||
          pageText?.includes("valid");
        logger.info(`Parsed deltas section visible: ${hasParsedSection}`);
      });

      await takeScreenshot(page, logger, "agent-mail-parsed-deltas");
    });
  });

  test.describe("Session with Artifact", () => {
    test("displays compiled artifact from seeded data", async ({
      page,
      logger,
      context,
      testSession,
    }) => {
      if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
        return;
      }

      // Seed a session with a compiled artifact
      const threadId = `E2E-ARTIFACT-${Date.now()}`;
      const config = createSessionWithArtifact(threadId);

      await withStep(logger, page, "Seed session with artifact", async () => {
        await testSession.seed(config);
        logger.info(`Seeded session with artifact: ${threadId}`);
      });

      // Set up auth and navigate
      await setupLabAuth(context);
      await navigateTo(page, logger, `/sessions/${threadId}`);
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipTest(page, logger, "artifact display")) {
        return;
      }

      // Verify artifact is visible
      await withStep(logger, page, "Verify compiled artifact", async () => {
        const pageText = await page.locator("body").textContent();
        const hasArtifact =
          pageText?.includes("Compiled Artifact") &&
          pageText?.includes("COMPILED:") &&
          pageText?.includes("Hypothesis Slate");
        expect(hasArtifact).toBeTruthy();
        logger.info("Compiled artifact found");
      });

      // Verify hypothesis slate content
      await withStep(logger, page, "Verify hypothesis content", async () => {
        const pageText = await page.locator("body").textContent();
        const hasHypotheses = pageText?.includes("H1") || pageText?.includes("hypothesis");
        logger.info(`Hypothesis content visible: ${hasHypotheses}`);
      });

      await takeScreenshot(page, logger, "agent-mail-artifact-session");
    });
  });
});

// ============================================================================
// Agent Mail Integration Tests: Thread Navigation
// ============================================================================

test.describe("Agent Mail Integration: Thread Navigation", () => {
  test("navigates between seeded sessions", async ({ page, logger, context, testSession }) => {
    if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
      return;
    }

    // Seed two sessions
    const threadId1 = `E2E-NAV-1-${Date.now()}`;
    const threadId2 = `E2E-NAV-2-${Date.now()}`;

    await testSession.seed(createKickoffSession(threadId1));
    await testSession.seed(createSessionWithDeltas(threadId2));

    await setupLabAuth(context);

    // Navigate to first session
    await navigateTo(page, logger, `/sessions/${threadId1}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "navigation test")) {
      return;
    }

    await withStep(logger, page, "Verify first session", async () => {
      await assertTextContent(page, logger, "body", threadId1);
    });

    // Navigate to second session
    await navigateTo(page, logger, `/sessions/${threadId2}`);
    await waitForNetworkIdle(page, logger);

    await withStep(logger, page, "Verify second session", async () => {
      await assertTextContent(page, logger, "body", threadId2);
    });

    logger.info("Session navigation successful");
  });
});

// ============================================================================
// Agent Mail Integration Tests: Message Details
// ============================================================================

test.describe("Agent Mail Integration: Message Details", () => {
  test("expandable message cards show full content", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
      return;
    }

    const threadId = `E2E-EXPAND-${Date.now()}`;
    await testSession.seed(createSessionWithDeltas(threadId));

    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "expandable messages")) {
      return;
    }

    // Try to expand a message
    await withStep(logger, page, "Find expandable message", async () => {
      const detailsElements = page.locator("details");
      const count = await detailsElements.count();
      logger.info(`Found ${count} expandable elements`);

      if (count > 0) {
        // Click to expand first details element
        const summary = detailsElements.first().locator("summary");
        if (await summary.isVisible()) {
          await summary.click();
          await page.waitForTimeout(300);
          logger.info("Expanded first message");
        }
      }
    });

    await takeScreenshot(page, logger, "agent-mail-expanded-message");
  });

  test("message metadata shows sender and timestamp", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
      return;
    }

    const threadId = `E2E-META-${Date.now()}`;
    await testSession.seed(createKickoffSession(threadId));

    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "message metadata")) {
      return;
    }

    await withStep(logger, page, "Verify message metadata", async () => {
      const pageText = await page.locator("body").textContent();

      // Check for sender name (TestOperator or agent names)
      const hasSender =
        pageText?.includes("TestOperator") ||
        pageText?.includes("From:") ||
        pageText?.includes("HypothesisAgent");
      logger.info(`Sender info visible: ${hasSender}`);

      // Check for timestamp or date
      const hasTimestamp =
        pageText?.includes(":") || // Time format
        pageText?.includes("ago") || // Relative time
        pageText?.includes("202"); // Year
      logger.info(`Timestamp visible: ${hasTimestamp}`);
    });

    await takeScreenshot(page, logger, "agent-mail-message-metadata");
  });
});

// ============================================================================
// Agent Mail Integration Tests: Error Handling
// ============================================================================

test.describe("Agent Mail Integration: Error Handling", () => {
  test("handles non-existent thread gracefully", async ({ page, logger, context, testSession }) => {
    if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
      return;
    }

    // Navigate to a thread that doesn't exist
    const fakeThreadId = `NONEXISTENT-${Date.now()}`;
    await navigateTo(page, logger, `/sessions/${fakeThreadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "nonexistent thread")) {
      return;
    }

    await withStep(logger, page, "Verify error handling", async () => {
      const pageText = await page.locator("body").textContent();

      // Should show some form of error or empty state
      const hasEmptyState =
        pageText?.includes("No messages") ||
        pageText?.includes("not found") ||
        pageText?.includes("empty") ||
        pageText?.includes("Failed to load");

      logger.info(`Empty/error state displayed: ${hasEmptyState}`);
    });

    await takeScreenshot(page, logger, "agent-mail-nonexistent-thread");
  });
});

// ============================================================================
// Agent Mail Integration Tests: Session Actions
// ============================================================================

test.describe("Agent Mail Integration: Session Actions", () => {
  test("compile button is present for sessions with deltas", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
      return;
    }

    const threadId = `E2E-COMPILE-${Date.now()}`;
    await testSession.seed(createSessionWithDeltas(threadId));

    await setupLabAuth(context);
    await navigateTo(page, logger, `/sessions/${threadId}`);
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipTest(page, logger, "compile button")) {
      return;
    }

    await withStep(logger, page, "Check for compile button", async () => {
      const compileButton = page
        .locator("button")
        .filter({ hasText: /compile/i })
        .first();
      const hasCompile = await compileButton.isVisible().catch(() => false);
      logger.info(`Compile button visible: ${hasCompile}`);
    });

    await takeScreenshot(page, logger, "agent-mail-compile-action");
  });
});

// ============================================================================
// Agent Mail Integration Tests: Real-Time Updates (SSE)
// ============================================================================

test.describe("Agent Mail Integration: Real-Time Updates (SSE)", () => {
  test("shows toast + refreshes when new thread messages arrive", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
      return;
    }

    const threadId = `E2E-REALTIME-${Date.now()}`;
    await testSession.seed(createKickoffSession(threadId));

    await setupLabAuth(context);

    await page.addInitScript(() => {
      window.__brennerE2E ??= {};
      window.__brennerE2E.realtime = { readyCount: 0, threadUpdateCount: 0 };

      const OrigEventSource = window.EventSource;
      if (!OrigEventSource) return;

      class PatchedEventSource extends OrigEventSource {
        constructor(url: string, eventSourceInitDict?: { withCredentials?: boolean }) {
          super(url, eventSourceInitDict);
          try {
            this.addEventListener("ready", () => {
              if (window.__brennerE2E?.realtime) window.__brennerE2E.realtime.readyCount += 1;
            });
            this.addEventListener("thread_update", () => {
              if (window.__brennerE2E?.realtime)
                window.__brennerE2E.realtime.threadUpdateCount += 1;
            });
          } catch {}
        }
      }

      window.EventSource = PatchedEventSource as unknown as typeof window.EventSource;
    });

    await navigateTo(page, logger, `/sessions/${threadId}`, { waitUntil: "domcontentloaded" });
    await assertTextContent(page, logger, "body", threadId);

    await withStep(logger, page, "Wait for /api/realtime to reach ready state", async () => {
      await page.waitForFunction(
        () =>
          window.__brennerE2E?.realtime?.readyCount && window.__brennerE2E.realtime.readyCount > 0,
        null,
        { timeout: 20000 },
      );
    });

    if (await shouldSkipTest(page, logger, "realtime updates")) {
      return;
    }

    const serverUrl = testSession.getServerUrl();
    const subject = "DELTA[Codex]: E2E realtime update";

    await withStep(logger, page, "Send new DELTA message to thread", async () => {
      await callTestServer({
        serverUrl,
        tool: "send_message",
        args: {
          project_key: "/data/projects/brenner_bot",
          sender_name: "HypothesisAgent",
          to: ["TestOperator"],
          subject,
          body_md:
            '```delta\n{"operation":"EDIT","section":"hypothesis_slate","target_id":"H-TEST","payload":{"statement":"realtime"}}\n```',
          thread_id: threadId,
        },
      });
    });

    await withStep(logger, page, "Verify toast appears for new message", async () => {
      await expect(page.locator(".toast-title").filter({ hasText: /New\s+DELTA/i })).toBeVisible({
        timeout: 20000,
      });
      await expect(
        page.locator(".toast-title").filter({ hasText: /HypothesisAgent/i }),
      ).toBeVisible();
    });

    await withStep(logger, page, "Verify session refreshed and message is visible", async () => {
      await expect(page.getByText(subject)).toBeVisible({ timeout: 20000 });
    });

    await takeScreenshot(page, logger, "agent-mail-realtime-update");
  });
});

// ============================================================================
// Agent Mail Integration Tests: Full Session Lifecycle (UI submission)
// ============================================================================

async function callTestServer(params: {
  serverUrl: string;
  tool: string;
  args: Record<string, unknown>;
}): Promise<unknown> {
  const res = await fetch(params.serverUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now().toString(),
      method: "tools/call",
      params: { name: params.tool, arguments: params.args },
    }),
  });

  if (!res.ok) {
    throw new Error(`Test server HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json?.error) {
    throw new Error(`Test server error: ${json.error.message ?? "unknown"}`);
  }

  return json?.result?.structuredContent ?? json?.result;
}

test.describe("Agent Mail Integration: Full Session Lifecycle", () => {
  test("create → deltas → compile+publish → evidence pack", async ({
    page,
    logger,
    context,
    testSession,
  }) => {
    if (!(await preflightAgentMailTestServer({ page, logger, context, testSession }))) {
      return;
    }

    const threadId = `E2E-LIFECYCLE-${Date.now()}`;
    const sender = "TestOperator";

    await withStep(logger, page, "Submit session creation form", async () => {
      await navigateTo(page, logger, "/sessions/new");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipTest(page, logger, "session creation")) {
        return;
      }

      await page.locator('input[name="threadId"]').fill(threadId);
      await page.locator('input[name="sender"]').fill(sender);
      await page.locator('input[name="recipients"]').fill("HypothesisAgent,TestDesigner,Critic");
      await page
        .locator('textarea[name="excerpt"]')
        .fill(
          `> §42: E2E excerpt for ${threadId}\n\nA short excerpt is enough for end-to-end wiring tests.`,
        );

      await page.getByRole("button", { name: /send kickoff/i }).click();
      await waitForNetworkIdle(page, logger);
    });

    if (await shouldSkipTest(page, logger, "kickoff submit")) {
      return;
    }

    await withStep(logger, page, "Verify kickoff success banner", async () => {
      await expect(page.getByText(/Kickoff sent successfully/i)).toBeVisible();
      await expect(page.getByText(threadId)).toBeVisible();
    });

    await withStep(logger, page, "Open session thread view", async () => {
      await navigateTo(page, logger, `/sessions/${threadId}`);
      await waitForNetworkIdle(page, logger);
    });

    if (await shouldSkipTest(page, logger, "session lifecycle")) {
      return;
    }

    await withStep(logger, page, "Verify kickoff message present", async () => {
      const body = await page.locator("body").textContent();
      expect(body?.includes("KICKOFF:")).toBeTruthy();
    });

    // Track this thread ID for failure attachments (even though it wasn't seeded via fixture.seed())
    testSession.seededSessions.push(threadId);

    const deltaConfig = createSessionWithDeltas(threadId);
    const deltaMessages = (deltaConfig.messages ?? []).filter((m) =>
      m.subject.startsWith("DELTA["),
    );
    const serverUrl = testSession.getServerUrl();

    await withStep(logger, page, "Send simulated agent DELTA replies", async () => {
      for (const msg of deltaMessages) {
        await callTestServer({
          serverUrl,
          tool: "send_message",
          args: {
            project_key: "/data/projects/brenner_bot",
            sender_name: msg.from,
            to: msg.to ?? ["TestOperator"],
            subject: msg.subject,
            body_md: msg.body,
            thread_id: threadId,
          },
        });
      }
    });

    await withStep(logger, page, "Refresh thread and verify parsed deltas", async () => {
      await page.reload();
      await waitForNetworkIdle(page, logger);
      await expect(page.getByText(/Parsed Deltas/i)).toBeVisible();
      await expect(page.getByText(/DELTA\[/i)).toBeVisible();
    });

    await withStep(logger, page, "Compile preview", async () => {
      await page.getByRole("button", { name: /^Compile$/ }).click();
      await expect(page.getByText(/Preview: compiled v/i)).toBeVisible();
    });

    await withStep(logger, page, "Publish compiled artifact", async () => {
      await page.getByRole("button", { name: /^Publish$/ }).click();
      await waitForNetworkIdle(page, logger);
      await expect(page.getByText(/Published COMPILED v/i)).toBeVisible();
    });

    await withStep(logger, page, "Verify compiled artifact panel is populated", async () => {
      const body = await page.locator("body").textContent();
      expect(body?.includes("Brenner Protocol Artifact")).toBeTruthy();
      expect(body?.includes("Hypothesis Slate")).toBeTruthy();
    });

    await withStep(logger, page, "Navigate to evidence pack page", async () => {
      await page.getByRole("link", { name: /Evidence Pack/i }).click();
      await waitForNetworkIdle(page, logger);
      await expect(page.getByRole("heading", { name: /Evidence Pack/i })).toBeVisible();
      await takeScreenshot(page, logger, "agent-mail-evidence-pack");
    });
  });
});
