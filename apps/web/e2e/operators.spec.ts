/**
 * E2E Tests: Operators Page
 *
 * Covers core user flows on /operators across desktop + mobile projects.
 */

import {
  assertPageHasContent,
  assertUrl,
  clickElement,
  expect,
  fillInput,
  navigateTo,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";

test.describe("Operators Page", () => {
  test("should load and render operator cards", async ({ page, logger }) => {
    await navigateTo(page, logger, "/operators");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 200);

    await expect(page.locator("h1")).toContainText("Brenner Operators");
    await expect(
      page.locator('input[placeholder="Search operators, triggers, failure modes, quotes..."]'),
    ).toBeVisible();

    const operatorCards = page.locator('button:has(div[role="checkbox"])');
    expect(await operatorCards.count()).toBeGreaterThan(0);

    await takeScreenshot(page, logger, "operators-page");
  });

  test("should filter operators by category pill", async ({ page, logger }) => {
    await navigateTo(page, logger, "/operators");
    await waitForNetworkIdle(page, logger);

    const operatorCards = page.locator('button:has(div[role="checkbox"])');
    expect(await operatorCards.count()).toBeGreaterThan(0);

    const pillRow = page
      .locator("div.flex.gap-2.overflow-x-auto")
      .filter({ has: page.locator('button:has-text("All")') })
      .first();

    const getPill = (label: string) => pillRow.locator("button").filter({ hasText: label }).first();

    const getPillCount = async (label: string) => {
      const pill = getPill(label);
      await pill.scrollIntoViewIfNeeded();
      await expect(pill).toBeVisible();
      const countText = await pill.locator("span.tabular-nums").textContent();
      const count = Number.parseInt((countText ?? "").trim(), 10);
      expect(Number.isFinite(count)).toBe(true);
      return count;
    };

    const allCount = await getPillCount("All");
    await expect(operatorCards).toHaveCount(allCount);

    const experimentationCount = await getPillCount("Experimentation");
    await clickElement(page, logger, getPill("Experimentation"), "Experimentation category");
    await expect(operatorCards).toHaveCount(experimentationCount);

    await clickElement(page, logger, getPill("All"), "All categories");
    await expect(operatorCards).toHaveCount(allCount);
  });

  test("should open and close an operator detail sheet", async ({ page, logger }) => {
    await navigateTo(page, logger, "/operators");
    await waitForNetworkIdle(page, logger);

    const operatorCards = page.locator('button:has(div[role="checkbox"])');
    expect(await operatorCards.count()).toBeGreaterThan(0);

    const firstCard = operatorCards.first();
    const firstTitle = (await firstCard.locator("h3").textContent())?.trim() || "first operator";
    logger.info(`Opening operator detail sheet for: ${firstTitle}`);

    await clickElement(page, logger, firstCard, "First operator card");

    const sheet = page.locator('[role="dialog"][aria-labelledby="operator-sheet-title"]');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(firstTitle);

    await takeScreenshot(page, logger, "operators-detail-sheet");

    await clickElement(
      page,
      logger,
      sheet.locator('button[aria-label="Close"]').first(),
      "Close sheet",
    );
    await expect(sheet).toBeHidden();
  });

  test("should filter via search and clear search", async ({ page, logger }) => {
    await navigateTo(page, logger, "/operators");
    await waitForNetworkIdle(page, logger);

    const operatorCards = page.locator('button:has(div[role="checkbox"])');
    const initialCount = await operatorCards.count();
    expect(initialCount).toBeGreaterThan(0);

    const firstTitle = (await operatorCards.first().locator("h3").textContent())?.trim();
    expect(firstTitle).toBeTruthy();

    const searchInputSelector =
      'input[placeholder="Search operators, triggers, failure modes, quotes..."]';
    await fillInput(page, logger, searchInputSelector, firstTitle ?? "", "Search input");

    const matchingCard = operatorCards.filter({ hasText: firstTitle ?? "" }).first();
    await expect(matchingCard).toBeVisible();

    await takeScreenshot(page, logger, "operators-search-filtered");

    await clickElement(page, logger, 'button[aria-label="Clear search"]', "Clear search");
    await expect(page.locator(searchInputSelector)).toHaveValue("");
    await expect(operatorCards).toHaveCount(initialCount);
  });

  test("should navigate to glossary from jargon trigger", async ({ page, logger }) => {
    await navigateTo(page, logger, "/operators");
    await waitForNetworkIdle(page, logger);

    const isMobile = await page.evaluate(() => window.matchMedia("(max-width: 768px)").matches);
    logger.info(`Viewport mode: ${isMobile ? "mobile" : "desktop"}`);

    await clickElement(page, logger, 'button:has-text("discriminative tests")', "Jargon trigger");

    const glossaryLinkText = isMobile ? "View in glossary" : "View full entry";
    const glossaryLink = page.locator("a").filter({ hasText: glossaryLinkText }).first();

    await expect(glossaryLink).toBeVisible();
    await clickElement(page, logger, glossaryLink, "Glossary link");

    await waitForNetworkIdle(page, logger);
    await assertUrl(page, logger, "/glossary#discriminative-test");

    await takeScreenshot(page, logger, "operators-jargon-glossary");
  });
});
