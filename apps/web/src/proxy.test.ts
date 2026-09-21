/**
 * Unit tests for src/proxy.ts
 *
 * Focus: security gating consistency with lib/auth.ts
 */

import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }

  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function makeRequest(args: {
  pathname: string;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
}): NextRequest {
  const headerMap = new Map<string, string>();
  for (const [key, value] of Object.entries(args.headers ?? {})) {
    if (typeof value !== "string") continue;
    headerMap.set(key.toLowerCase(), value);
  }

  const cookieMap = new Map<string, string>();
  for (const [key, value] of Object.entries(args.cookies ?? {})) {
    if (typeof value !== "string") continue;
    cookieMap.set(key, value);
  }

  return {
    nextUrl: { pathname: args.pathname },
    headers: { get: (name: string) => headerMap.get(name.toLowerCase()) ?? null },
    cookies: {
      get: (name: string) => {
        if (!cookieMap.has(name)) return undefined;
        const value = cookieMap.get(name);
        if (value === undefined) return undefined;
        return { value };
      },
    },
  } as unknown as NextRequest;
}

describe("proxy()", () => {
  it("does not gate public corpus files", () => {
    withEnv({ BRENNER_LAB_MODE: undefined, BRENNER_LAB_SECRET: undefined }, () => {
      const request = makeRequest({ pathname: "/_corpus/complete_brenner_transcript.md" });
      const response = proxy(request);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    });
  });

  it("fails closed when BRENNER_LAB_MODE is disabled", () => {
    withEnv({ BRENNER_LAB_MODE: undefined }, () => {
      const request = makeRequest({ pathname: "/sessions/new" });
      const response = proxy(request);
      expect(response.status).toBe(404);
    });
  });

  it("fails closed for orchestration API routes when BRENNER_LAB_MODE is disabled", () => {
    withEnv({ BRENNER_LAB_MODE: undefined }, () => {
      const request = makeRequest({ pathname: "/api/experiments" });
      const response = proxy(request);
      expect(response.status).toBe(404);
    });
  });

  it("fails closed when lab mode enabled but no auth is provided", () => {
    withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: undefined }, () => {
      const request = makeRequest({ pathname: "/sessions/new" });
      const response = proxy(request);
      expect(response.status).toBe(404);
    });
  });

  it("fails closed for orchestration API routes when lab mode enabled but no auth is provided", () => {
    withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: undefined }, () => {
      const request = makeRequest({ pathname: "/api/sessions/actions" });
      const response = proxy(request);
      expect(response.status).toBe(404);
    });
  });

  it("does not trust Cloudflare Access headers unless BRENNER_TRUST_CF_ACCESS_HEADERS=1", () => {
    withEnv(
      {
        BRENNER_LAB_MODE: "1",
        BRENNER_TRUST_CF_ACCESS_HEADERS: undefined,
        BRENNER_LAB_SECRET: undefined,
      },
      () => {
        const request = makeRequest({
          pathname: "/sessions/new",
          headers: { "cf-access-jwt-assertion": "some.jwt.assertion" },
        });
        const response = proxy(request);
        expect(response.status).toBe(404);
      },
    );
  });

  it("allows Cloudflare Access headers when BRENNER_TRUST_CF_ACCESS_HEADERS=1", () => {
    withEnv(
      {
        BRENNER_LAB_MODE: "1",
        BRENNER_TRUST_CF_ACCESS_HEADERS: "1",
        BRENNER_LAB_SECRET: undefined,
      },
      () => {
        const request = makeRequest({
          pathname: "/sessions/new",
          headers: { "cf-access-jwt-assertion": "some.jwt.assertion" },
        });
        const response = proxy(request);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      },
    );
  });

  it("allows valid lab secret even when Cloudflare Access headers are not trusted", () => {
    withEnv(
      {
        BRENNER_LAB_MODE: "1",
        BRENNER_TRUST_CF_ACCESS_HEADERS: undefined,
        BRENNER_LAB_SECRET: "secret123",
      },
      () => {
        const request = makeRequest({
          pathname: "/sessions/new",
          headers: { "x-brenner-lab-secret": "secret123" },
        });
        const response = proxy(request);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      },
    );
  });

  it("allows orchestration API routes when valid lab secret is provided", () => {
    withEnv(
      {
        BRENNER_LAB_MODE: "1",
        BRENNER_TRUST_CF_ACCESS_HEADERS: undefined,
        BRENNER_LAB_SECRET: "secret123",
      },
      () => {
        const request = makeRequest({
          pathname: "/api/experiments",
          headers: { "x-brenner-lab-secret": "secret123" },
        });
        const response = proxy(request);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      },
    );
  });

  it("rejects lab secret when header has secret as a prefix", () => {
    withEnv(
      {
        BRENNER_LAB_MODE: "1",
        BRENNER_TRUST_CF_ACCESS_HEADERS: undefined,
        BRENNER_LAB_SECRET: "secret123",
      },
      () => {
        const request = makeRequest({
          pathname: "/api/experiments",
          headers: { "x-brenner-lab-secret": "secret123x" },
        });
        const response = proxy(request);
        expect(response.status).toBe(404);
      },
    );
  });
});
