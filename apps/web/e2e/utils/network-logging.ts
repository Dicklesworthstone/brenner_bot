/**
 * Network Request Logging and Performance Timing for E2E Tests
 *
 * Provides detailed network request logging and performance metrics collection.
 * Philosophy: Make network issues easy to diagnose.
 */

import type { Page, Request, Response, TestInfo } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

export interface NetworkRequestLog {
  timestamp: string;
  method: string;
  url: string;
  resourceType: string;
  status?: number;
  statusText?: string;
  duration?: number;
  failure?: string;
}

export interface PerformanceTimingData {
  startTime: number;
  domContentLoaded?: number;
  load?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  lcpElement?: string;
  cumulativeLayoutShift?: number;
  interactionToNextPaint?: number;
}

export interface NetworkContext {
  testTitle: string;
  networkLogs: NetworkRequestLog[];
  performanceTiming: PerformanceTimingData;
  harPath?: string;
}

// ============================================================================
// State
// ============================================================================

const networkContexts = new Map<string, NetworkContext>();
const pendingRequests = new Map<string, { startTime: number; url: string }>();

// HAR file output directory
const HAR_OUTPUT_DIR = "test-results/har";

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Context Management
// ============================================================================

export function createNetworkContext(testTitle: string): NetworkContext {
  const context: NetworkContext = {
    testTitle,
    networkLogs: [],
    performanceTiming: { startTime: Date.now() },
  };
  networkContexts.set(testTitle, context);
  return context;
}

export function getNetworkContext(testTitle: string): NetworkContext {
  let context = networkContexts.get(testTitle);
  if (!context) {
    context = createNetworkContext(testTitle);
  }
  return context;
}

export function clearNetworkContext(testTitle: string): void {
  networkContexts.delete(testTitle);
}

// ============================================================================
// Network Request Logging
// ============================================================================

export function logNetworkRequest(testTitle: string, request: Request): void {
  const requestId = `${request.method()}-${request.url()}-${Date.now()}`;
  pendingRequests.set(requestId, { startTime: Date.now(), url: request.url() });

  const url = request.url();
  const displayUrl = url.length > 80 ? `${url.slice(0, 80)}...` : url;
  console.log(`\x1b[90m  -> ${request.method()} ${displayUrl}\x1b[0m`);
}

export function logNetworkResponse(testTitle: string, response: Response): void {
  const request = response.request();
  const url = request.url();
  const context = getNetworkContext(testTitle);

  // Find matching pending request
  let duration: number | undefined;
  const entries = Array.from(pendingRequests.entries());
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry[1].url === url) {
      duration = Date.now() - entry[1].startTime;
      pendingRequests.delete(entry[0]);
      break;
    }
  }

  const networkLog: NetworkRequestLog = {
    timestamp: getTimestamp(),
    method: request.method(),
    url: url,
    resourceType: request.resourceType(),
    status: response.status(),
    statusText: response.statusText(),
    duration,
  };
  context.networkLogs.push(networkLog);

  // Log to console with color based on status
  const statusColor =
    response.status() >= 400 ? "\x1b[31m" : response.status() >= 300 ? "\x1b[33m" : "\x1b[32m";
  const durationStr = duration ? ` [${formatDuration(duration)}]` : "";
  const displayUrl = url.length > 60 ? `${url.slice(0, 60)}...` : url;
  console.log(
    `\x1b[90m  <- ${statusColor}${response.status()}\x1b[0m ${request.method()} ${displayUrl}${durationStr}`,
  );
}

export function logNetworkFailure(testTitle: string, request: Request, failure: string): void {
  const context = getNetworkContext(testTitle);
  const networkLog: NetworkRequestLog = {
    timestamp: getTimestamp(),
    method: request.method(),
    url: request.url(),
    resourceType: request.resourceType(),
    failure,
  };
  context.networkLogs.push(networkLog);

  const displayUrl = request.url().length > 60 ? `${request.url().slice(0, 60)}...` : request.url();
  console.log(`\x1b[31m  X ${request.method()} ${displayUrl} FAILED: ${failure}\x1b[0m`);
}

export function setupNetworkLogging(page: Page, testTitle: string): void {
  // Create context if not exists
  getNetworkContext(testTitle);

  page.on("request", (request) => {
    const type = request.resourceType();
    if (["document", "fetch", "xhr", "script", "stylesheet"].includes(type)) {
      logNetworkRequest(testTitle, request);
    }
  });

  page.on("response", (response) => {
    const type = response.request().resourceType();
    if (["document", "fetch", "xhr", "script", "stylesheet"].includes(type)) {
      logNetworkResponse(testTitle, response);
    }
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "Unknown error";
    logNetworkFailure(testTitle, request, failure);
  });
}

// ============================================================================
// Performance Timing
// ============================================================================

export async function collectPerformanceTiming(
  page: Page,
  testTitle: string,
): Promise<PerformanceTimingData> {
  const context = getNetworkContext(testTitle);

  try {
    const performanceData = await page.evaluate(async () => {
      const perf = window.performance;
      const navigation = perf.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const paint = perf.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint");

      const lcpData = await new Promise<{
        value?: number;
        element?: string;
      }>((resolve) => {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEntry | undefined;
            const lcpEntry = lastEntry as PerformanceEntry & { element?: Element };
            const element = lcpEntry?.element;
            const tag = element?.tagName?.toLowerCase();
            const id = element?.id ? `#${element.id}` : "";
            const className = typeof element?.className === "string" ? element.className : "";
            const classes = className
              ? `.${className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(".")}`
              : "";
            const text = element?.textContent?.trim().slice(0, 80);
            const elementLabel = tag
              ? `${tag}${id}${classes}${text ? ` "${text}"` : ""}`
              : undefined;

            observer.disconnect();
            resolve({ value: lcpEntry?.startTime, element: elementLabel });
          });

          observer.observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => resolve({}), 100);
        } catch {
          resolve({});
        }
      });

      const cls = await new Promise<number | undefined>((resolve) => {
        try {
          let total = 0;
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries() as Array<
              PerformanceEntry & { hadRecentInput?: boolean; value?: number }
            >;
            for (const entry of entries) {
              if (!entry.hadRecentInput && typeof entry.value === "number") {
                total += entry.value;
              }
            }
          });
          observer.observe({ type: "layout-shift", buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(total || undefined);
          }, 100);
        } catch {
          resolve(undefined);
        }
      });

      const inp = await new Promise<number | undefined>((resolve) => {
        try {
          let max = 0;
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries() as Array<
              PerformanceEntry & { interactionId?: number; duration?: number }
            >;
            for (const entry of entries) {
              if (!entry.interactionId) continue;
              if (typeof entry.duration === "number" && entry.duration > max) {
                max = entry.duration;
              }
            }
          });
          observer.observe({ type: "event", buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(max || undefined);
          }, 100);
        } catch {
          resolve(undefined);
        }
      });

      return {
        startTime: navigation?.startTime || 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd || undefined,
        load: navigation?.loadEventEnd || undefined,
        firstContentfulPaint: fcp?.startTime || undefined,
        largestContentfulPaint: lcpData.value,
        lcpElement: lcpData.element,
        cumulativeLayoutShift: cls,
        interactionToNextPaint: inp,
      };
    });

    context.performanceTiming = performanceData;
    console.log(
      `\x1b[32m  Performance: FCP=${performanceData.firstContentfulPaint?.toFixed(0) || "N/A"}ms, Load=${performanceData.load?.toFixed(0) || "N/A"}ms\x1b[0m`,
    );

    return performanceData;
  } catch {
    return context.performanceTiming;
  }
}

// ============================================================================
// Getters and Formatters
// ============================================================================

export function getNetworkLogs(testTitle: string): NetworkRequestLog[] {
  return getNetworkContext(testTitle).networkLogs;
}

export function getPerformanceTiming(testTitle: string): PerformanceTimingData {
  return getNetworkContext(testTitle).performanceTiming;
}

export function formatNetworkLogsAsText(testTitle: string): string {
  const context = getNetworkContext(testTitle);
  const header = `\n${"=".repeat(60)}\nNetwork Requests: ${testTitle}\nTotal: ${context.networkLogs.length}\n${"=".repeat(60)}\n`;

  const logLines = context.networkLogs.map((entry) => {
    const statusStr = entry.status
      ? `${entry.status} ${entry.statusText || ""}`
      : entry.failure || "pending";
    const durationStr = entry.duration ? ` [${formatDuration(entry.duration)}]` : "";
    const displayUrl = entry.url.length > 60 ? `${entry.url.slice(0, 60)}...` : entry.url;
    return `${entry.timestamp.slice(11, 23)} ${entry.method.padEnd(6)} ${statusStr.padEnd(12)} ${displayUrl}${durationStr}`;
  });

  return header + logLines.join("\n");
}

// ============================================================================
// HAR File Generation
// ============================================================================

/**
 * HAR (HTTP Archive) format types.
 * See: http://www.softwareishard.com/blog/har-12-spec/
 */
interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    cookies: unknown[];
    headers: unknown[];
    queryString: unknown[];
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: unknown[];
    headers: unknown[];
    content: {
      size: number;
      mimeType: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, never>;
  timings: {
    send: number;
    wait: number;
    receive: number;
  };
}

interface Har {
  log: {
    version: string;
    creator: {
      name: string;
      version: string;
    };
    pages: Array<{
      startedDateTime: string;
      id: string;
      title: string;
    }>;
    entries: HarEntry[];
  };
}

/**
 * Generate HAR file content from network logs.
 * HAR format is widely supported by browser DevTools and network analysis tools.
 */
export function generateHar(testTitle: string): Har {
  const context = getNetworkContext(testTitle);
  const pageId = `page_${testTitle.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const entries: HarEntry[] = context.networkLogs
    .filter((log) => log.status !== undefined) // Only completed requests
    .map((log) => {
      const duration = log.duration || 0;

      return {
        startedDateTime: log.timestamp,
        time: duration,
        request: {
          method: log.method,
          url: log.url,
          httpVersion: "HTTP/1.1",
          cookies: [],
          headers: [],
          queryString: [],
          headersSize: -1,
          bodySize: -1,
        },
        response: {
          status: log.status || 0,
          statusText: log.statusText || "",
          httpVersion: "HTTP/1.1",
          cookies: [],
          headers: [],
          content: {
            size: -1,
            mimeType: getMimeType(log.resourceType),
          },
          redirectURL: "",
          headersSize: -1,
          bodySize: -1,
        },
        cache: {},
        timings: {
          send: 0,
          wait: duration * 0.8,
          receive: duration * 0.2,
        },
      };
    });

  const firstEntry = context.networkLogs[0];
  const startTime = firstEntry?.timestamp || new Date().toISOString();

  return {
    log: {
      version: "1.2",
      creator: {
        name: "Brenner Bot E2E Tests",
        version: "1.0",
      },
      pages: [
        {
          startedDateTime: startTime,
          id: pageId,
          title: testTitle,
        },
      ],
      entries,
    },
  };
}

/**
 * Get MIME type from resource type.
 */
function getMimeType(resourceType: string): string {
  const mimeTypes: Record<string, string> = {
    document: "text/html",
    script: "application/javascript",
    stylesheet: "text/css",
    image: "image/png",
    font: "font/woff2",
    xhr: "application/json",
    fetch: "application/json",
    media: "video/mp4",
    websocket: "application/octet-stream",
    other: "application/octet-stream",
  };
  return mimeTypes[resourceType] || "application/octet-stream";
}

/**
 * Save HAR file to disk using pre-generated JSON content.
 * This avoids regenerating the HAR when it's already been serialized.
 */
function saveHarFileDirect(testTitle: string, harJson: string): string | undefined {
  const context = getNetworkContext(testTitle);

  // Ensure HAR output directory exists
  if (!fs.existsSync(HAR_OUTPUT_DIR)) {
    fs.mkdirSync(HAR_OUTPUT_DIR, { recursive: true });
  }

  const safeTitle = testTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 100);
  const harPath = path.join(HAR_OUTPUT_DIR, `${safeTitle}_${Date.now()}.har`);

  fs.writeFileSync(harPath, harJson);

  context.harPath = harPath;
  console.log(`\x1b[32m  HAR file saved: ${harPath}\x1b[0m`);

  return harPath;
}

/**
 * Save HAR file to disk and store path in context.
 * Generates HAR from network logs if not already generated.
 */
export function saveHarFile(testTitle: string): string | undefined {
  const context = getNetworkContext(testTitle);

  if (context.networkLogs.length === 0) {
    return undefined;
  }

  const har = generateHar(testTitle);
  return saveHarFileDirect(testTitle, JSON.stringify(har, null, 2));
}

export async function attachNetworkLogsToTest(
  testInfo: TestInfo,
  testTitle: string,
): Promise<void> {
  const context = getNetworkContext(testTitle);

  if (context.networkLogs.length > 0) {
    await testInfo.attach("network-logs.json", {
      body: JSON.stringify(context.networkLogs, null, 2),
      contentType: "application/json",
    });

    await testInfo.attach("network-logs.txt", {
      body: formatNetworkLogsAsText(testTitle),
      contentType: "text/plain",
    });

    // Generate HAR once and reuse for both attachment and disk save
    const har = generateHar(testTitle);
    const harJson = JSON.stringify(har, null, 2);

    await testInfo.attach("network.har", {
      body: harJson,
      contentType: "application/json",
    });

    // Also save to disk for easy access with Chrome DevTools
    saveHarFileDirect(testTitle, harJson);
  }

  await testInfo.attach("performance-timing.json", {
    body: JSON.stringify(context.performanceTiming, null, 2),
    contentType: "application/json",
  });
}
