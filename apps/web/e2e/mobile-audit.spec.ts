import { expect, test } from "@playwright/test";

/**
 * Mobile Visual Audit
 *
 * Captures screenshots of all pages at mobile widths (375px, 414px, 768px)
 * in both light and dark modes for visual review and issue identification.
 *
 * Run with: bun run test:e2e --grep "Mobile Audit"
 */

const WIDTHS = [
  { width: 375, name: "375" }, // iPhone SE/Mini
  { width: 414, name: "414" }, // iPhone Plus/Pro Max
  { width: 768, name: "768" }, // iPad portrait
] as const;

const THEMES = ["light", "dark"] as const;

const PAGES = [
  { path: "/", name: "home" },
  { path: "/corpus", name: "corpus-index" },
  { path: "/corpus/initial-metaprompt", name: "initial-metaprompt" },
  { path: "/corpus/metaprompt", name: "metaprompt" },
  { path: "/corpus/distillation-gpt-52", name: "distillation-gpt" },
  { path: "/corpus/distillation-gemini-3", name: "distillation-gemini" },
  { path: "/distillations", name: "distillations" },
];

// Large pages - take viewport screenshot to avoid timeout (or exceed 32767px height limit)
const LARGE_PAGES = [
  { path: "/corpus/transcript", name: "transcript" },
  { path: "/corpus/quote-bank", name: "quote-bank" },
  { path: "/corpus/distillation-opus-45", name: "distillation-opus" },
  { path: "/distillations/compare", name: "distillations-compare" },
  { path: "/method", name: "method" },
];

const SCREENSHOT_DIR = "./screenshots/mobile-audit";

test.describe("Mobile Audit Screenshots", () => {
  test.describe.configure({ mode: "parallel" });

  // Regular pages - full page screenshot
  for (const page of PAGES) {
    for (const { width, name: widthName } of WIDTHS) {
      for (const theme of THEMES) {
        test(`${page.name} @ ${widthName}px ${theme}`, async ({ page: p, context }) => {
          // Set viewport
          await p.setViewportSize({ width, height: 800 });

          // Set color scheme
          await context.addInitScript((t) => {
            localStorage.setItem("theme", t);
            document.documentElement.classList.toggle("dark", t === "dark");
          }, theme);

          await p.goto(page.path, { waitUntil: "networkidle" });

          // Force theme class after navigation (in case localStorage doesn't work)
          await p.evaluate((t) => {
            document.documentElement.classList.toggle("dark", t === "dark");
          }, theme);

          // Wait for any animations/transitions
          await p.waitForTimeout(500);

          // Take full page screenshot
          await p.screenshot({
            path: `${SCREENSHOT_DIR}/${page.name}_${widthName}_${theme}.png`,
            fullPage: true,
          });

          // Basic check - page has content
          const bodyText = await p.locator("body").textContent();
          expect(bodyText?.length).toBeGreaterThan(50);
        });
      }
    }
  }

  // Large pages - viewport screenshot only
  for (const page of LARGE_PAGES) {
    for (const { width, name: widthName } of WIDTHS) {
      for (const theme of THEMES) {
        test(`${page.name} @ ${widthName}px ${theme} (viewport)`, async ({ page: p, context }) => {
          // Set viewport
          await p.setViewportSize({ width, height: 800 });

          // Set color scheme
          await context.addInitScript((t) => {
            localStorage.setItem("theme", t);
            document.documentElement.classList.toggle("dark", t === "dark");
          }, theme);

          await p.goto(page.path, { waitUntil: "networkidle" });
          await p.evaluate((t) => {
            document.documentElement.classList.toggle("dark", t === "dark");
          }, theme);

          await p.waitForTimeout(500);

          // Viewport screenshot for large pages
          await p.screenshot({
            path: `${SCREENSHOT_DIR}/${page.name}_${widthName}_${theme}.png`,
          });

          // Basic check
          const bodyText = await p.locator("body").textContent();
          expect(bodyText?.length).toBeGreaterThan(100);
        });
      }
    }
  }
});

test.describe("Mobile Touch Target Audit", () => {
  test("check interactive elements meet 44px minimum", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });

    // Find all interactive elements
    const interactives = await page.locator("a, button, [role='button']").all();

    const smallTargets: { selector: string; size: { width: number; height: number } }[] = [];

    for (const el of interactives) {
      const box = await el.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        const text = await el.textContent();
        smallTargets.push({
          selector: text?.slice(0, 30) || "unknown",
          size: { width: Math.round(box.width), height: Math.round(box.height) },
        });
      }
    }

    // Log small targets for review (don't fail, just report)
    if (smallTargets.length > 0) {
      console.log("\n=== Touch Targets Below 44px ===");
      for (const t of smallTargets) {
        console.log(`  "${t.selector}" - ${t.size.width}x${t.size.height}px`);
      }
      console.log(`\nTotal: ${smallTargets.length} elements below minimum\n`);
    }

    // Take screenshot with annotations
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/touch-targets-home.png`,
      fullPage: true,
    });
  });
});

test.describe("Mobile Overflow Check", () => {
  for (const pageDef of PAGES.slice(0, 5)) {
    test(`check horizontal overflow on ${pageDef.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(pageDef.path, { waitUntil: "networkidle" });

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasOverflow) {
        console.log(`\n!!! Horizontal overflow detected on ${pageDef.name} !!!\n`);
      }

      expect(hasOverflow).toBe(false);
    });
  }
});
