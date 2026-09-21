/**
 * E2E Tests: API Failure Handling (Agent Mail integration)
 *
 * These tests focus on browser-visible failure modes for orchestration APIs.
 * They are intended to run against a local dev server with lab mode enabled.
 *
 * Safety:
 * - Skips entirely when BASE_URL is not localhost/127.0.0.1 (production default).
 * - Skips individual tests when /sessions/new is hidden (404) or locked (auth not configured).
 */

import { expect, test, waitForNetworkIdle } from "./utils";
import { withStep } from "./utils/e2e-logging";

type E2ELogger = ReturnType<typeof import("./utils/e2e-logging").createE2ELogger>;

function baseUrlHost(): string {
  const raw = (process.env.BASE_URL || "https://brennerbot.org").trim();
  try {
    return new URL(raw).hostname;
  } catch {
    return "brennerbot.org";
  }
}

function isLocalE2EEnvironment(): boolean {
  const host = baseUrlHost();
  return host === "localhost" || host === "127.0.0.1";
}

async function tryOpenAuthenticatedSessionForm(params: {
  page: import("@playwright/test").Page;
  context: import("@playwright/test").BrowserContext;
  logger: E2ELogger;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: "lab_disabled" | "locked" | "unexpected";
      status: number;
      pageText: string;
    }
> {
  const labSecret = (process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e").trim();

  // Only set the auth cookie on localhost-style environments.
  const domain = baseUrlHost();
  await params.context.addCookies([
    {
      name: "brenner_lab_secret",
      value: labSecret,
      domain,
      path: "/",
    },
  ]);

  const response = await params.page.goto("/sessions/new");
  await waitForNetworkIdle(params.page, params.logger);

  const status = response?.status() ?? 0;
  const pageText = (await params.page.locator("body").textContent()) ?? "";

  if (status === 404) return { ok: false, reason: "lab_disabled", status, pageText };
  if (pageText.includes("Lab Mode Locked"))
    return { ok: false, reason: "locked", status, pageText };

  // Heuristic: the form should contain the standard submit label.
  const hasForm =
    pageText.includes("Send Kickoff") ||
    (await params.page.locator('button[type="submit"]').count()) > 0;
  if (!hasForm) return { ok: false, reason: "unexpected", status, pageText };

  return { ok: true };
}

async function fillMinimalKickoffForm(params: {
  page: import("@playwright/test").Page;
  logger: E2ELogger;
  threadId: string;
}): Promise<void> {
  await withStep(params.logger, params.page, "Fill minimal kickoff form fields", async () => {
    await params.page.locator('input[name="threadId"]').fill(params.threadId);
    await params.page.locator('input[name="sender"]').fill("BlueLake");
    await params.page.locator('input[name="recipients"]').fill("PurpleMountain");
    await params.page
      .locator('textarea[name="excerpt"]')
      .fill("This is a test excerpt used for API failure E2E coverage.");
  });
}

test.describe("API Failure Handling (local-only)", () => {
  test.skip(
    !isLocalE2EEnvironment(),
    "Runs only against local dev server (set BASE_URL=http://localhost:3000).",
  );

  test("shows NETWORK_ERROR message when Agent Mail is unreachable (502)", async ({
    page,
    logger,
    context,
  }) => {
    const gate = await tryOpenAuthenticatedSessionForm({ page, logger, context });
    if (!gate.ok) {
      test.skip(
        true,
        `Skipping (sessions/new not available): ${gate.reason} (HTTP ${gate.status})`,
      );
    }

    await page.route("**/api/sessions", async (route) => {
      await route.fulfill({
        status: 502,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          success: false,
          code: "NETWORK_ERROR",
          error: "Agent Mail unreachable: ECONNREFUSED",
        }),
      });
    });

    await fillMinimalKickoffForm({ page, logger, threadId: "E2E-API-FAILURE-NETWORK" });

    await withStep(logger, page, "Submit kickoff and verify error banner", async () => {
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Failed to send kickoff")).toBeVisible();
      await expect(page.getByText(/Could not reach Agent Mail/i)).toBeVisible();
    });
  });

  test("retries once on transient failure, then succeeds", async ({ page, logger, context }) => {
    const gate = await tryOpenAuthenticatedSessionForm({ page, logger, context });
    if (!gate.ok) {
      test.skip(
        true,
        `Skipping (sessions/new not available): ${gate.reason} (HTTP ${gate.status})`,
      );
    }

    const threadId = `E2E-API-RETRY-${Date.now()}`;
    let callCount = 0;

    await page.route("**/api/sessions", async (route) => {
      callCount += 1;
      if (callCount === 1) {
        await route.fulfill({
          status: 503,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            success: false,
            code: "NETWORK_ERROR",
            error: "Agent Mail unreachable: transient 503",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ success: true, threadId, messageId: 123 }),
      });
    });

    await fillMinimalKickoffForm({ page, logger, threadId });

    await withStep(logger, page, "Submit kickoff and verify eventual success", async () => {
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText(/Kickoff sent successfully!/i)).toBeVisible({ timeout: 30000 });
    });

    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  test("surfaces a readable error when API returns invalid/truncated JSON", async ({
    page,
    logger,
    context,
  }) => {
    const gate = await tryOpenAuthenticatedSessionForm({ page, logger, context });
    if (!gate.ok) {
      test.skip(
        true,
        `Skipping (sessions/new not available): ${gate.reason} (HTTP ${gate.status})`,
      );
    }

    await page.route("**/api/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: '{"success": false, "code": "SERVER_ERROR", "error": "truncated"',
      });
    });

    await fillMinimalKickoffForm({ page, logger, threadId: "E2E-API-FAILURE-TRUNCATED" });

    await withStep(logger, page, "Submit kickoff and verify error banner renders", async () => {
      await page.locator('button[type="submit"]').click();
      const header = page.getByText("Failed to send kickoff");
      await expect(header).toBeVisible();
      // Browser error messages differ; just assert we render *some* error detail instead of hanging/crashing.
      await expect(header.locator("..").locator("p")).toBeVisible();
    });
  });

  test("shows AUTH_ERROR message for unauthorized responses (401)", async ({
    page,
    logger,
    context,
  }) => {
    const gate = await tryOpenAuthenticatedSessionForm({ page, logger, context });
    if (!gate.ok) {
      test.skip(
        true,
        `Skipping (sessions/new not available): ${gate.reason} (HTTP ${gate.status})`,
      );
    }

    await page.route("**/api/sessions", async (route) => {
      await route.fulfill({
        status: 401,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          success: false,
          code: "AUTH_ERROR",
          error: "Not authorized",
        }),
      });
    });

    await fillMinimalKickoffForm({ page, logger, threadId: "E2E-API-FAILURE-AUTH" });

    await withStep(logger, page, "Submit kickoff and verify auth error message", async () => {
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Failed to send kickoff")).toBeVisible();
      await expect(
        page.getByText(/Not authorized\. Please check your lab mode settings\./i),
      ).toBeVisible();
    });
  });

  test("shows SERVER_ERROR message for internal server errors (500)", async ({
    page,
    logger,
    context,
  }) => {
    const gate = await tryOpenAuthenticatedSessionForm({ page, logger, context });
    if (!gate.ok) {
      test.skip(
        true,
        `Skipping (sessions/new not available): ${gate.reason} (HTTP ${gate.status})`,
      );
    }

    await page.route("**/api/sessions", async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          success: false,
          code: "SERVER_ERROR",
          error: "Internal Server Error",
        }),
      });
    });

    await fillMinimalKickoffForm({ page, logger, threadId: "E2E-API-FAILURE-500" });

    await withStep(logger, page, "Submit kickoff and verify server error message", async () => {
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Failed to send kickoff")).toBeVisible();
      await expect(page.getByText(/Server error: Internal Server Error/i)).toBeVisible();
    });
  });
});
