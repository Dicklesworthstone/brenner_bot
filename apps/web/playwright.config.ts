import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Brenner Bot E2E tests
 *
 * By default, tests run against the live production site.
 * To test locally, set BASE_URL=http://localhost:3000
 *
 * Environment variables:
 * - BASE_URL: Override the base URL (default: https://brennerbot.org)
 * - RECORD_VIDEO: Set to "on" to record videos of all tests, "off" to disable completely
 * - NO_VIDEO: Set to "1" to disable video recording (overrides default retry recording)
 * - SLOW_MO: Set to a number (ms) to slow down actions for debugging
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000, // 60 second timeout per test
  expect: {
    timeout: 10000, // 10 second timeout for assertions
  },
  reporter: [
    // Custom reporter for detailed logging
    ["./e2e/utils/custom-reporter.ts"],
    // HTML report for visual debugging
    ["html", { outputFolder: "playwright-report", open: "never" }],
    // JSON report for CI integration
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "https://brennerbot.org",
    // Tracing: capture on first retry for debugging failures
    trace: "on-first-retry",
    // Screenshots: always capture on failure, optionally on success
    screenshot: "only-on-failure",
    // Video: record on first retry by default (captures failures for debugging)
    // - Set RECORD_VIDEO=on to record all tests
    // - Set RECORD_VIDEO=off or NO_VIDEO=1 to disable
    video:
      process.env.NO_VIDEO === "1" || process.env.RECORD_VIDEO === "off"
        ? "off"
        : process.env.RECORD_VIDEO === "on"
          ? "on"
          : "on-first-retry",
    // Slow motion for debugging (set SLOW_MO=100 for 100ms delay)
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO, 10) : 0,
    },
    // Viewport size
    viewport: { width: 1280, height: 720 },
    // Action timeout
    actionTimeout: 15000,
    // Navigation timeout
    navigationTimeout: 30000,
  },
  projects: [
    // Desktop browsers
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "desktop-firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    // Mobile browsers
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    // WebKit projects are opt-in because they require host dependencies that may be missing
    // in minimal Linux environments (common in CI/containers). Enable with:
    //   PLAYWRIGHT_INCLUDE_WEBKIT=1 bun run test:e2e
    ...(process.env.PLAYWRIGHT_INCLUDE_WEBKIT === "1"
      ? [
          {
            name: "desktop-safari",
            use: { ...devices["Desktop Safari"] },
          },
          {
            name: "mobile-safari",
            use: { ...devices["iPhone 12"] },
          },
        ]
      : []),
  ],
  outputDir: "test-results/",
});
