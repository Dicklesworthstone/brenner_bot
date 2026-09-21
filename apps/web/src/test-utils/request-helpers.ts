/**
 * Request Helper Utilities for API Route Testing
 *
 * Provides utilities for creating mock NextRequest objects for testing API routes.
 * Used alongside AgentMailTestServer for integration testing without mocks.
 */

import type { NextRequest } from "next/server";

export interface MockRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Creates a minimal mock NextRequest for API route testing.
 *
 * @example
 * ```typescript
 * const request = createMockRequest({
 *   method: "POST",
 *   body: { threadId: "TEST-1", recipients: ["Claude"] },
 *   headers: { "x-brenner-lab-secret": "test-secret" }
 * });
 *
 * const response = await POST(request);
 * expect(response.status).toBe(200);
 * ```
 */
export function createMockRequest(options: MockRequestOptions = {}): NextRequest {
  const { method = "GET", body, headers = {}, cookies = {}, searchParams = {} } = options;

  const url = new URL("http://localhost:3000/api/test");
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const headerMap = new Headers(headers);
  for (const [key, value] of Object.entries(cookies)) {
    const existing = headerMap.get("cookie") || "";
    headerMap.set("cookie", existing ? `${existing}; ${key}=${value}` : `${key}=${value}`);
  }

  return {
    method,
    url: url.toString(),
    headers: headerMap,
    nextUrl: url,
    json: async () => body,
    text: async () => (body ? JSON.stringify(body) : ""),
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value ? { name, value } : undefined;
      },
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      has: (name: string) => name in cookies,
      set: () => {},
      delete: () => {},
      clear: () => {},
    },
  } as unknown as NextRequest;
}

/**
 * Creates an authenticated mock request with lab mode enabled.
 *
 * @example
 * ```typescript
 * const request = createAuthenticatedRequest({
 *   method: "POST",
 *   body: { action: "compile", threadId: "TEST-1" }
 * });
 * ```
 */
export function createAuthenticatedRequest(
  options: Omit<MockRequestOptions, "headers"> & { headers?: Record<string, string> },
): NextRequest {
  const testSecret = process.env.BRENNER_LAB_SECRET || "test-lab-secret";
  return createMockRequest({
    ...options,
    headers: {
      "x-brenner-lab-secret": testSecret,
      ...options.headers,
    },
  });
}

/**
 * Test setup helper that configures environment for Agent Mail test server.
 *
 * @example
 * ```typescript
 * import { AgentMailTestServer } from "@/test-utils/agent-mail-test-server";
 * import { setupAgentMailTestEnv, teardownAgentMailTestEnv } from "@/test-utils/request-helpers";
 *
 * let server: AgentMailTestServer;
 * let originalEnv: Record<string, string | undefined>;
 *
 * beforeAll(async () => {
 *   server = new AgentMailTestServer();
 *   await server.start(18765);
 *   originalEnv = setupAgentMailTestEnv(server.getPort());
 * });
 *
 * afterAll(async () => {
 *   teardownAgentMailTestEnv(originalEnv);
 *   await server.stop();
 * });
 * ```
 */
export function setupAgentMailTestEnv(port: number): Record<string, string | undefined> {
  const originalEnv = {
    AGENT_MAIL_BASE_URL: process.env.AGENT_MAIL_BASE_URL,
    BRENNER_PROJECT_KEY: process.env.BRENNER_PROJECT_KEY,
  };

  process.env.AGENT_MAIL_BASE_URL = `http://localhost:${port}`;
  process.env.BRENNER_PROJECT_KEY = "/test/project";

  return originalEnv;
}

/**
 * Restores environment variables after Agent Mail test server tests.
 */
export function teardownAgentMailTestEnv(originalEnv: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
