/**
 * Performance E2E Tests
 *
 * Tests Core Web Vitals and enforces performance budgets.
 * See brenner_bot-6u0z for acceptance criteria.
 *
 * Budgets:
 * - LCP (Largest Contentful Paint): < 2.5s
 * - INP (Interaction to Next Paint): < 500ms (lenient for test/CI environments)
 * - CLS (Cumulative Layout Shift): < 0.25
 * - FCP (First Contentful Paint): < 1.8s
 * - TTFB (Time to First Byte): < 500ms (lenient for test/CI environments)
 * - DOM Content Loaded: < 3s
 * - Load: < 5s
 */

import { expect, test } from "@playwright/test";
import { collectPerformanceTiming, type PerformanceTimingData } from "./utils/network-logging";

// ============================================================================
// Performance Budgets (in milliseconds)
// ============================================================================

interface PerformanceBudget {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  inp?: number; // Interaction to Next Paint
  cls?: number; // Cumulative Layout Shift (unitless)
  domContentLoaded?: number;
  load?: number;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  fcp: 1800, // 1.8s
  lcp: 2500, // 2.5s
  inp: 500, // 0.5s (lenient CI ceiling)
  cls: 0.25, // upper bound for "needs improvement"
  domContentLoaded: 3000, // 3s
  load: 5000, // 5s
};

// Page-specific budgets (more lenient for content-heavy pages)
const PAGE_BUDGETS: Record<string, PerformanceBudget> = {
  "/": DEFAULT_BUDGET,
  "/corpus": DEFAULT_BUDGET,
  "/corpus/transcript": {
    fcp: 2000,
    lcp: 3500, // Large document
    domContentLoaded: 4000,
    load: 8000,
  },
  "/method": {
    fcp: 2000,
    lcp: 3000,
    domContentLoaded: 4000,
    load: 6000,
  },
  "/distillations": DEFAULT_BUDGET,
  "/glossary": DEFAULT_BUDGET,
};

// ============================================================================
// Test Helpers
// ============================================================================

function getBudget(path: string): PerformanceBudget {
  return PAGE_BUDGETS[path] || DEFAULT_BUDGET;
}

function formatMetric(value: number | undefined): string {
  if (value === undefined) return "N/A";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function formatCLS(value: number | undefined): string {
  if (value === undefined) return "N/A";
  return value.toFixed(3);
}

async function collectMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  testTitle: string,
): Promise<PerformanceTimingData & { ttfb?: number }> {
  const timing = await collectPerformanceTiming(page, testTitle);

  // Also collect TTFB
  const ttfb = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav) return undefined;
    return nav.responseStart - nav.requestStart;
  });

  return { ...timing, ttfb };
}

// ============================================================================
// Core Web Vitals Tests
// ============================================================================

test.describe("Performance: Core Web Vitals", () => {
  const pages = [
    { path: "/", name: "Home" },
    { path: "/corpus", name: "Corpus Index" },
    { path: "/distillations", name: "Distillations" },
    { path: "/glossary", name: "Glossary" },
  ];

  for (const { path, name } of pages) {
    test(`${name} page meets performance budgets`, async ({ page }, testInfo) => {
      const budget = getBudget(path);

      // Navigate and wait for load
      await page.goto(path, { waitUntil: "networkidle" });

      // Collect performance metrics
      const metrics = await collectMetrics(page, testInfo.title);

      // Log metrics for debugging
      console.log(`\n${name} Performance Metrics:`);
      console.log(
        `  FCP:  ${formatMetric(metrics.firstContentfulPaint)} (budget: ${formatMetric(budget.fcp)})`,
      );
      console.log(
        `  LCP:  ${formatMetric(metrics.largestContentfulPaint)} (budget: ${formatMetric(budget.lcp)})`,
      );
      console.log(`  LCP element: ${metrics.lcpElement || "N/A"}`);
      console.log(
        `  INP:  ${formatMetric(metrics.interactionToNextPaint)} (budget: ${formatMetric(budget.inp)})`,
      );
      console.log(
        `  CLS:  ${formatCLS(metrics.cumulativeLayoutShift)} (budget: ${formatCLS(budget.cls)})`,
      );
      console.log(
        `  DCL:  ${formatMetric(metrics.domContentLoaded)} (budget: ${formatMetric(budget.domContentLoaded)})`,
      );
      console.log(`  Load: ${formatMetric(metrics.load)} (budget: ${formatMetric(budget.load)})`);
      console.log(`  TTFB: ${formatMetric(metrics.ttfb)}`);

      // Attach metrics to test report
      await testInfo.attach("performance-metrics", {
        body: JSON.stringify(
          {
            page: path,
            metrics: {
              fcp: metrics.firstContentfulPaint,
              lcp: metrics.largestContentfulPaint,
              lcpElement: metrics.lcpElement,
              inp: metrics.interactionToNextPaint,
              cls: metrics.cumulativeLayoutShift,
              domContentLoaded: metrics.domContentLoaded,
              load: metrics.load,
              ttfb: metrics.ttfb,
            },
            budgets: budget,
          },
          null,
          2,
        ),
        contentType: "application/json",
      });

      // Assert budgets (soft assertions to get all failures)
      const errors: string[] = [];

      if (budget.fcp && metrics.firstContentfulPaint !== undefined) {
        if (metrics.firstContentfulPaint > budget.fcp) {
          errors.push(
            `FCP ${formatMetric(metrics.firstContentfulPaint)} exceeds budget ${formatMetric(budget.fcp)}`,
          );
        }
      }

      if (budget.lcp && metrics.largestContentfulPaint !== undefined) {
        if (metrics.largestContentfulPaint > budget.lcp) {
          errors.push(
            `LCP ${formatMetric(metrics.largestContentfulPaint)} exceeds budget ${formatMetric(budget.lcp)}`,
          );
        }
      }

      if (budget.inp && metrics.interactionToNextPaint !== undefined) {
        if (metrics.interactionToNextPaint > budget.inp) {
          errors.push(
            `INP ${formatMetric(metrics.interactionToNextPaint)} exceeds budget ${formatMetric(budget.inp)}`,
          );
        }
      }

      if (budget.cls && metrics.cumulativeLayoutShift !== undefined) {
        if (metrics.cumulativeLayoutShift > budget.cls) {
          errors.push(
            `CLS ${formatCLS(metrics.cumulativeLayoutShift)} exceeds budget ${formatCLS(budget.cls)}`,
          );
        }
      }

      if (budget.domContentLoaded && metrics.domContentLoaded !== undefined) {
        if (metrics.domContentLoaded > budget.domContentLoaded) {
          errors.push(
            `DOM Content Loaded ${formatMetric(metrics.domContentLoaded)} exceeds budget ${formatMetric(budget.domContentLoaded)}`,
          );
        }
      }

      if (budget.load && metrics.load !== undefined) {
        if (metrics.load > budget.load) {
          errors.push(
            `Load ${formatMetric(metrics.load)} exceeds budget ${formatMetric(budget.load)}`,
          );
        }
      }

      if (errors.length > 0) {
        throw new Error(`Performance budget violations:\n- ${errors.join("\n- ")}`);
      }
    });
  }
});

// ============================================================================
// Large Page Performance Tests
// ============================================================================

test.describe("Performance: Large Pages", () => {
  test("Transcript page loads within extended budget", async ({ page }, testInfo) => {
    const budget = getBudget("/corpus/transcript");

    await page.goto("/corpus/transcript", { waitUntil: "networkidle" });

    const metrics = await collectMetrics(page, testInfo.title);

    console.log(`\nTranscript Performance Metrics:`);
    console.log(
      `  FCP:  ${formatMetric(metrics.firstContentfulPaint)} (budget: ${formatMetric(budget.fcp)})`,
    );
    console.log(
      `  LCP:  ${formatMetric(metrics.largestContentfulPaint)} (budget: ${formatMetric(budget.lcp)})`,
    );
    console.log(`  Load: ${formatMetric(metrics.load)} (budget: ${formatMetric(budget.load)})`);

    // Transcript is a large document - just ensure it loads within extended budget
    if (metrics.load !== undefined && budget.load) {
      expect(metrics.load).toBeLessThan(budget.load);
    }
  });

  test("Method reference page loads within extended budget", async ({ page }, testInfo) => {
    const budget = getBudget("/method");

    await page.goto("/method", { waitUntil: "networkidle" });

    const metrics = await collectMetrics(page, testInfo.title);

    console.log(`\nMethod Reference Performance Metrics:`);
    console.log(
      `  FCP:  ${formatMetric(metrics.firstContentfulPaint)} (budget: ${formatMetric(budget.fcp)})`,
    );
    console.log(
      `  LCP:  ${formatMetric(metrics.largestContentfulPaint)} (budget: ${formatMetric(budget.lcp)})`,
    );
    console.log(`  Load: ${formatMetric(metrics.load)} (budget: ${formatMetric(budget.load)})`);

    if (metrics.load !== undefined && budget.load) {
      expect(metrics.load).toBeLessThan(budget.load);
    }
  });
});

// ============================================================================
// Interaction Performance Tests
// ============================================================================

test.describe("Performance: Interactions", () => {
  test("Search modal opens quickly", async ({ page }) => {
    await page.goto("/corpus", { waitUntil: "networkidle" });

    // Measure time to open search modal
    // Use Control+k for cross-platform compatibility (works on Linux CI)
    const startTime = Date.now();
    await page.keyboard.press("Control+k");

    // Wait for search modal to appear
    const searchModal = page.locator('[data-testid="spotlight-search"], [role="dialog"]');
    await searchModal.first().waitFor({ state: "visible", timeout: 2000 });

    const openTime = Date.now() - startTime;
    console.log(`\nSearch modal open time: ${openTime}ms (budget: 500ms)`);

    expect(openTime).toBeLessThan(500); // 500ms allows CI variance
  });

  test("Navigation between pages is fast", async ({ page, isMobile }) => {
    // Load initial page
    await page.goto("/", { waitUntil: "networkidle" });

    // Navigate to corpus and measure
    const startTime = Date.now();

    if (isMobile) {
      // On mobile, nav links are in hamburger menu - use direct navigation
      await page.goto("/corpus", { waitUntil: "networkidle" });
    } else {
      // On desktop, click the visible nav link
      await page.click('a[href="/corpus"]');
      await page.waitForLoadState("networkidle");
    }

    const navigationTime = Date.now() - startTime;

    console.log(`\nNavigation time (Home -> Corpus): ${navigationTime}ms (budget: 2000ms)`);

    expect(navigationTime).toBeLessThan(2000);
  });
});

// ============================================================================
// TTFB Tests
// ============================================================================

test.describe("Performance: Time to First Byte", () => {
  const endpoints = [
    { path: "/", name: "Home" },
    { path: "/corpus", name: "Corpus" },
  ];

  for (const { path, name } of endpoints) {
    test(`${name} has acceptable TTFB`, async ({ page }) => {
      // Navigate and collect TTFB
      await page.goto(path, { waitUntil: "domcontentloaded" });

      const ttfb = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        if (!nav) return undefined;
        return nav.responseStart - nav.requestStart;
      });

      console.log(`\n${name} TTFB: ${formatMetric(ttfb)} (budget: 500ms)`);

      // TTFB budget is more lenient in test environment
      if (ttfb !== undefined) {
        expect(ttfb).toBeLessThan(500); // 500ms for local/CI
      }
    });
  }
});
