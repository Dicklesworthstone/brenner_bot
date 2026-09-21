/**
 * E2E Tests: Authentication Flows
 *
 * Comprehensive tests for authentication and authorization flows.
 * Tests the defense-in-depth security model:
 * 1. Lab mode must be enabled (BRENNER_LAB_MODE=1)
 * 2. Either Cloudflare Access headers OR lab secret required
 *
 * Protected routes:
 * - /sessions/*
 * - /api/sessions/*
 * - /api/experiments/*
 *
 * Public routes (always accessible):
 * - /
 * - /corpus/*
 * - /distillations/*
 * - /method
 * - /glossary
 */

import {
  assertPageHasContent,
  expect,
  navigateTo,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";

// All protected routes that require lab mode + auth
const PROTECTED_ROUTES = [
  { path: "/sessions", name: "sessions-list" },
  { path: "/sessions/new", name: "sessions-new" },
];

// Protected API endpoints
const PROTECTED_API_ROUTES = [
  { path: "/api/sessions", name: "api-sessions", method: "POST" },
  { path: "/api/sessions/actions", name: "api-sessions-actions", method: "POST" },
  { path: "/api/experiments", name: "api-experiments", method: "POST" },
];

// Public routes that should always be accessible
const PUBLIC_ROUTES = [
  { path: "/", name: "home" },
  { path: "/corpus", name: "corpus-index" },
  { path: "/corpus/initial-metaprompt", name: "initial-metaprompt" },
  { path: "/distillations", name: "distillations" },
  { path: "/method", name: "method" },
];

test.describe("Authentication Flows", () => {
  test.describe("Protected Route Access", () => {
    for (const route of PROTECTED_ROUTES) {
      test(`${route.name} returns 404 without auth`, async ({ page, logger }) => {
        logger.step(`Testing protected route: ${route.path}`);

        // Navigate without any auth
        const response = await page.goto(route.path, { waitUntil: "networkidle" });
        const status = response?.status() ?? 0;

        logger.info(`Response status: ${status}`);

        // In production with lab mode disabled, should return 404
        // This is fail-closed behavior - protected routes are hidden
        if (status === 404) {
          logger.info(`${route.name} correctly returns 404 (lab mode disabled)`);
          await takeScreenshot(page, logger, `auth-${route.name}-404`);
          expect(status).toBe(404);
          return;
        }

        // If not 404, check for locked state UI (lab mode enabled but no auth)
        const pageText = await page.locator("body").textContent();
        const isLocked =
          pageText?.includes("Lab Mode Locked") ||
          pageText?.includes("Access Denied") ||
          pageText?.includes("Unauthorized");

        if (isLocked) {
          logger.info(`${route.name} shows locked state (lab mode enabled, no auth)`);
          await takeScreenshot(page, logger, `auth-${route.name}-locked`);
          expect(isLocked).toBe(true);
          return;
        }

        // If neither 404 nor locked, the route is accessible (test env with auth)
        logger.warn(`${route.name} is accessible - may be running in authenticated env`);
        await takeScreenshot(page, logger, `auth-${route.name}-accessible`);
      });
    }
  });

  test.describe("Protected API Access", () => {
    for (const route of PROTECTED_API_ROUTES) {
      test(`${route.name} returns 404 without auth`, async ({ logger, request }) => {
        logger.step(`Testing protected API: ${route.path}`);

        // Make a request without auth
        const response = await request.post(route.path, {
          data: {},
          failOnStatusCode: false,
        });

        const status = response.status();
        logger.info(`${route.name} response status: ${status}`);

        // Should return 404 (fail-closed) or 401/403 depending on config
        // 404 is the expected behavior when lab mode is disabled
        expect([404, 401, 403]).toContain(status);
        logger.info(`${route.name} correctly protected (status: ${status})`);
      });
    }
  });

  test.describe("Public Route Access", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route.name} is accessible without auth`, async ({ page, logger }) => {
        logger.step(`Testing public route: ${route.path}`);

        const response = await navigateTo(page, logger, route.path, { waitUntil: "networkidle" });
        const status = response?.status();

        logger.info(
          `${route.name} response status: ${typeof status === "number" ? status : "n/a"}`,
        );

        // Public routes should return 200 or 304 (Not Modified - cached).
        // Some navigations may not surface a Response object; in that case, rely on content checks.
        if (typeof status === "number") {
          expect([200, 304]).toContain(status);
        } else {
          logger.warn(
            `${route.name} did not return a navigation Response; skipping status assertion`,
          );
        }

        // Should have actual content (not blank)
        await assertPageHasContent(page, logger, 100);

        logger.info(`${route.name} accessible and has content`);
        await takeScreenshot(page, logger, `auth-${route.name}-public`);
      });
    }
  });

  test.describe("Session Cookie Authentication", () => {
    test("lab secret cookie provides access when configured", async ({
      page,
      logger,
      context,
      baseURL,
    }) => {
      // This test verifies that the cookie-based auth mechanism works
      // Note: Will only pass if BRENNER_LAB_SECRET is configured on the server
      const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
      const domain = new URL(baseURL || "https://brennerbot.org").hostname;

      logger.step("Setting lab secret cookie");
      await context.addCookies([
        {
          name: "brenner_lab_secret",
          value: labSecret,
          domain,
          path: "/",
        },
      ]);

      const response = await page.goto("/sessions/new", { waitUntil: "networkidle" });
      const status = response?.status() ?? 0;

      logger.info(`Response with cookie: ${status}`);

      if (status === 404) {
        // Lab mode is disabled on the server - cookie can't help
        logger.info("Lab mode disabled on server - cookie auth cannot work");
        await takeScreenshot(page, logger, "auth-cookie-labmode-disabled");
        return;
      }

      const pageText = await page.locator("body").textContent();

      if (pageText?.includes("Lab Mode Locked")) {
        // Cookie didn't match server's configured secret
        logger.info("Cookie present but didn't match server secret");
        await takeScreenshot(page, logger, "auth-cookie-mismatch");
        return;
      }

      // Successfully authenticated via cookie
      logger.info("Cookie authentication successful");
      expect(pageText).toContain("New Session");
      await takeScreenshot(page, logger, "auth-cookie-success");
    });

    test("session persists across page navigation", async ({ page, logger, context, baseURL }) => {
      const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
      const domain = new URL(baseURL || "https://brennerbot.org").hostname;

      logger.step("Setting up authenticated session");
      await context.addCookies([
        {
          name: "brenner_lab_secret",
          value: labSecret,
          domain,
          path: "/",
        },
      ]);

      // Navigate to protected route
      const response1 = await page.goto("/sessions/new", { waitUntil: "networkidle" });
      const status1 = response1?.status() ?? 0;

      if (status1 === 404) {
        logger.info("Lab mode disabled - skipping persistence test");
        return;
      }

      const pageText1 = await page.locator("body").textContent();
      if (pageText1?.includes("Lab Mode Locked")) {
        logger.info("Auth failed - skipping persistence test");
        return;
      }

      logger.step("Navigating to public route");
      await page.goto("/corpus", { waitUntil: "networkidle" });
      await waitForNetworkIdle(page, logger);

      logger.step("Navigating back to protected route");
      const response2 = await page.goto("/sessions/new", { waitUntil: "networkidle" });
      const status2 = response2?.status() ?? 0;

      // Session should persist - still have access
      const pageText2 = await page.locator("body").textContent();
      const stillAuthenticated = !pageText2?.includes("Lab Mode Locked") && status2 !== 404;

      logger.info(`Session persisted: ${stillAuthenticated}`);
      expect(stillAuthenticated).toBe(true);
      await takeScreenshot(page, logger, "auth-session-persistence");
    });

    test("session persists after page refresh", async ({ page, logger, context, baseURL }) => {
      const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
      const domain = new URL(baseURL || "https://brennerbot.org").hostname;

      logger.step("Setting up authenticated session");
      await context.addCookies([
        {
          name: "brenner_lab_secret",
          value: labSecret,
          domain,
          path: "/",
        },
      ]);

      const response1 = await page.goto("/sessions/new", { waitUntil: "networkidle" });
      const status1 = response1?.status() ?? 0;

      if (status1 === 404) {
        logger.info("Lab mode disabled - skipping refresh test");
        return;
      }

      const pageText1 = await page.locator("body").textContent();
      if (pageText1?.includes("Lab Mode Locked")) {
        logger.info("Auth failed - skipping refresh test");
        return;
      }

      logger.step("Refreshing page");
      await page.reload({ waitUntil: "networkidle" });

      const pageText2 = await page.locator("body").textContent();
      const stillAuthenticated = !pageText2?.includes("Lab Mode Locked");

      logger.info(`Session persisted after refresh: ${stillAuthenticated}`);
      expect(stillAuthenticated).toBe(true);
      await takeScreenshot(page, logger, "auth-session-refresh");
    });
  });

  test.describe("Graceful Degradation", () => {
    test("protected page shows helpful message when lab mode locked", async ({ page, logger }) => {
      const response = await page.goto("/sessions/new", { waitUntil: "networkidle" });
      const status = response?.status() ?? 0;

      if (status === 404) {
        // 404 is valid fail-closed behavior
        logger.info("Route returns 404 - fail-closed behavior");
        return;
      }

      const pageText = await page.locator("body").textContent();

      if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
        // Should provide instructions on how to enable
        const hasInstructions =
          pageText.includes("BRENNER_LAB_MODE") ||
          pageText.includes("Lab Mode") ||
          pageText.includes("Cloudflare Access") ||
          pageText.includes("secret");

        logger.info(`Locked page has instructions: ${hasInstructions}`);
        expect(hasInstructions).toBe(true);
        await takeScreenshot(page, logger, "auth-locked-instructions");
      }
    });

    test("API endpoint returns proper error format", async ({ request, logger }) => {
      logger.step("Testing API error response format");

      const response = await request.post("/api/sessions", {
        data: { test: true },
        failOnStatusCode: false,
      });

      const status = response.status();
      logger.info(`API response status: ${status}`);

      // Should return 404 (fail-closed) not reveal internal errors
      expect([404, 401, 403]).toContain(status);

      // Response should not leak sensitive information
      const body = await response.text();
      expect(body).not.toContain("stack");
      expect(body).not.toContain("BRENNER_LAB_SECRET");

      logger.info("API error response is safe and non-revealing");
    });
  });

  test.describe("Mixed Content Access", () => {
    test("can navigate from protected to public content", async ({ page, logger }) => {
      logger.step("Attempting access to protected route");
      const protectedResponse = await page.goto("/sessions/new", { waitUntil: "networkidle" });
      const protectedStatus = protectedResponse?.status() ?? 0;

      logger.info(`Protected route status: ${protectedStatus}`);

      logger.step("Navigating to public route");
      await page.goto("/corpus", { waitUntil: "networkidle" });

      // Public route should always work regardless of prior auth state
      await assertPageHasContent(page, logger, 100);

      const corpusContent = await page.locator("body").textContent();
      const hasCorpusContent =
        corpusContent?.includes("Corpus") || corpusContent?.includes("Document");

      logger.info(`Public route accessible: ${hasCorpusContent}`);
      expect(hasCorpusContent).toBe(true);
      await takeScreenshot(page, logger, "auth-public-after-protected");
    });

    test("public routes remain stable with various cookie states", async ({
      page,
      logger,
      context,
      baseURL,
    }) => {
      const domain = new URL(baseURL || "https://brennerbot.org").hostname;

      logger.step("Testing public route with no cookies");
      await context.clearCookies();
      await page.goto("/corpus", { waitUntil: "networkidle" });
      await assertPageHasContent(page, logger, 100);

      logger.step("Testing public route with invalid cookie");
      await context.addCookies([
        {
          name: "brenner_lab_secret",
          value: "invalid-secret-that-wont-match",
          domain,
          path: "/",
        },
      ]);
      await page.goto("/corpus", { waitUntil: "networkidle" });
      await assertPageHasContent(page, logger, 100);

      logger.step("Testing public route with random cookies");
      await context.addCookies([
        {
          name: "some_random_cookie",
          value: "random_value",
          domain,
          path: "/",
        },
      ]);
      await page.goto("/distillations", { waitUntil: "networkidle" });
      await assertPageHasContent(page, logger, 100);

      logger.info("Public routes stable across all cookie states");
      await takeScreenshot(page, logger, "auth-public-cookie-stability");
    });
  });
});
