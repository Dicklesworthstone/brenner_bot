/**
 * Unit tests for lib/auth.ts
 *
 * Tests the Lab Mode authentication and authorization system.
 * Philosophy: NO mocks - test real behavior with real env manipulation.
 *
 * Run with: cd apps/web && bun run test -- src/lib/auth.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  AUTH_CONSTANTS,
  assertOrchestrationAuth,
  checkOrchestrationAuth,
  hasValidLabSecret,
  isLabModeEnabled,
} from "./auth";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Save and restore environment variables for isolated tests.
 */
function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}

/**
 * Create a mock headers object that simulates NextJS/fetch Headers.
 */
function makeHeaders(values: Record<string, string>): { get: (name: string) => string | null } {
  return {
    get: (name: string) => values[name] ?? null,
  };
}

/**
 * Create a mock cookies object that simulates NextJS cookies().
 */
function makeCookies(values: Record<string, string>): {
  get: (name: string) => { value: string } | undefined;
} {
  return {
    get: (name: string) => (values[name] !== undefined ? { value: values[name] } : undefined),
  };
}

// ============================================================================
// Tests: AUTH_CONSTANTS
// ============================================================================

describe("AUTH_CONSTANTS", () => {
  it("exports correct header name", () => {
    expect(AUTH_CONSTANTS.LAB_SECRET_HEADER).toBe("x-brenner-lab-secret");
  });

  it("exports correct cookie name", () => {
    expect(AUTH_CONSTANTS.LAB_SECRET_COOKIE).toBe("brenner_lab_secret");
  });
});

// ============================================================================
// Tests: isLabModeEnabled
// ============================================================================

describe("isLabModeEnabled", () => {
  describe("returns true when explicitly enabled", () => {
    it('recognizes "1"', () => {
      withEnv({ BRENNER_LAB_MODE: "1" }, () => {
        expect(isLabModeEnabled()).toBe(true);
      });
    });

    it('recognizes "true"', () => {
      withEnv({ BRENNER_LAB_MODE: "true" }, () => {
        expect(isLabModeEnabled()).toBe(true);
      });
    });

    it('recognizes "TRUE" (case insensitive)', () => {
      withEnv({ BRENNER_LAB_MODE: "TRUE" }, () => {
        expect(isLabModeEnabled()).toBe(true);
      });
    });

    it('recognizes " 1 " (with whitespace)', () => {
      withEnv({ BRENNER_LAB_MODE: " 1 " }, () => {
        expect(isLabModeEnabled()).toBe(true);
      });
    });

    it('recognizes " True " (mixed case with whitespace)', () => {
      withEnv({ BRENNER_LAB_MODE: " True " }, () => {
        expect(isLabModeEnabled()).toBe(true);
      });
    });
  });

  describe("returns false (fail-closed) for all other values", () => {
    it("returns false when not set", () => {
      withEnv({ BRENNER_LAB_MODE: undefined }, () => {
        expect(isLabModeEnabled()).toBe(false);
      });
    });

    it("returns false for empty string", () => {
      withEnv({ BRENNER_LAB_MODE: "" }, () => {
        expect(isLabModeEnabled()).toBe(false);
      });
    });

    it('returns false for "0"', () => {
      withEnv({ BRENNER_LAB_MODE: "0" }, () => {
        expect(isLabModeEnabled()).toBe(false);
      });
    });

    it('returns false for "false"', () => {
      withEnv({ BRENNER_LAB_MODE: "false" }, () => {
        expect(isLabModeEnabled()).toBe(false);
      });
    });

    it('returns false for "yes"', () => {
      withEnv({ BRENNER_LAB_MODE: "yes" }, () => {
        expect(isLabModeEnabled()).toBe(false);
      });
    });

    it('returns false for "enabled"', () => {
      withEnv({ BRENNER_LAB_MODE: "enabled" }, () => {
        expect(isLabModeEnabled()).toBe(false);
      });
    });

    it("returns false for random string", () => {
      withEnv({ BRENNER_LAB_MODE: "anything-else" }, () => {
        expect(isLabModeEnabled()).toBe(false);
      });
    });
  });
});

// ============================================================================
// Tests: hasValidLabSecret
// ============================================================================

describe("hasValidLabSecret", () => {
  describe("when no secret is configured", () => {
    it("returns false regardless of input", () => {
      withEnv({ BRENNER_LAB_SECRET: undefined }, () => {
        expect(hasValidLabSecret()).toBe(false);
        expect(hasValidLabSecret(makeHeaders({ "x-brenner-lab-secret": "anything" }))).toBe(false);
        expect(hasValidLabSecret(undefined, makeCookies({ brenner_lab_secret: "anything" }))).toBe(
          false,
        );
      });
    });

    it("returns false for empty secret string", () => {
      withEnv({ BRENNER_LAB_SECRET: "" }, () => {
        expect(hasValidLabSecret(makeHeaders({ "x-brenner-lab-secret": "" }))).toBe(false);
      });
    });

    it("returns false for whitespace-only secret", () => {
      withEnv({ BRENNER_LAB_SECRET: "   " }, () => {
        expect(hasValidLabSecret(makeHeaders({ "x-brenner-lab-secret": "   " }))).toBe(false);
      });
    });
  });

  describe("when secret is configured", () => {
    const TEST_LAB_VALUE = "lab-test-value-12345";

    it("returns true for matching header", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": TEST_LAB_VALUE });
        expect(hasValidLabSecret(headers)).toBe(true);
      });
    });

    it("returns true for matching cookie", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const cookies = makeCookies({ brenner_lab_secret: TEST_LAB_VALUE });
        expect(hasValidLabSecret(undefined, cookies)).toBe(true);
      });
    });

    it("prefers header over cookie (header checked first)", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": TEST_LAB_VALUE });
        const cookies = makeCookies({ brenner_lab_secret: "wrong-value" });
        expect(hasValidLabSecret(headers, cookies)).toBe(true);
      });
    });

    it("falls back to cookie when header is missing", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({});
        const cookies = makeCookies({ brenner_lab_secret: TEST_LAB_VALUE });
        expect(hasValidLabSecret(headers, cookies)).toBe(true);
      });
    });

    it("falls back to cookie when header is wrong", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": "wrong" });
        const cookies = makeCookies({ brenner_lab_secret: TEST_LAB_VALUE });
        expect(hasValidLabSecret(headers, cookies)).toBe(true);
      });
    });

    it("returns false for wrong header value", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": "wrong-value" });
        expect(hasValidLabSecret(headers)).toBe(false);
      });
    });

    it("returns false for header value that is a strict prefix of the secret", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": TEST_LAB_VALUE.slice(0, -1) });
        expect(hasValidLabSecret(headers)).toBe(false);
      });
    });

    it("returns false for header value that has the secret as a prefix", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": `${TEST_LAB_VALUE}x` });
        expect(hasValidLabSecret(headers)).toBe(false);
      });
    });

    it("returns false for wrong cookie value", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const cookies = makeCookies({ brenner_lab_secret: "wrong-value" });
        expect(hasValidLabSecret(undefined, cookies)).toBe(false);
      });
    });

    it("returns false when both header and cookie are wrong", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": "wrong" });
        const cookies = makeCookies({ brenner_lab_secret: "also-wrong" });
        expect(hasValidLabSecret(headers, cookies)).toBe(false);
      });
    });

    it("is case-sensitive (different case fails)", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": TEST_LAB_VALUE.toUpperCase() });
        expect(hasValidLabSecret(headers)).toBe(false);
      });
    });

    it("handles undefined headers gracefully", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        expect(hasValidLabSecret(undefined)).toBe(false);
      });
    });

    it("handles undefined cookies gracefully", () => {
      withEnv({ BRENNER_LAB_SECRET: TEST_LAB_VALUE }, () => {
        expect(hasValidLabSecret(makeHeaders({}), undefined)).toBe(false);
      });
    });
  });
});

// ============================================================================
// Tests: checkOrchestrationAuth
// ============================================================================

describe("checkOrchestrationAuth", () => {
  describe("when lab mode is disabled", () => {
    it("returns unauthorized with appropriate message", () => {
      withEnv({ BRENNER_LAB_MODE: "0", BRENNER_LAB_SECRET: undefined }, () => {
        const result = checkOrchestrationAuth();
        expect(result.authorized).toBe(false);
        expect(result.reason).toContain("Lab mode is disabled");
        expect(result.reason).toContain("BRENNER_LAB_MODE=1");
      });
    });

    it("ignores valid credentials when lab mode is off", () => {
      withEnv({ BRENNER_LAB_MODE: "0", BRENNER_LAB_SECRET: "secret" }, () => {
        const headers = makeHeaders({ "x-brenner-lab-secret": "secret" });
        const result = checkOrchestrationAuth(headers);
        expect(result.authorized).toBe(false);
      });
    });
  });

  describe("when lab mode is enabled", () => {
    describe("with Cloudflare Access headers", () => {
      it("authorizes with JWT header", () => {
        withEnv(
          {
            BRENNER_LAB_MODE: "1",
            BRENNER_LAB_SECRET: undefined,
            BRENNER_TRUST_CF_ACCESS_HEADERS: "1",
          },
          () => {
            const headers = makeHeaders({ "cf-access-jwt-assertion": "some-jwt-token" });
            const result = checkOrchestrationAuth(headers);
            expect(result.authorized).toBe(true);
            expect(result.reason).toContain("Cloudflare Access");
          },
        );
      });

      it("authorizes with email header", () => {
        withEnv(
          {
            BRENNER_LAB_MODE: "1",
            BRENNER_LAB_SECRET: undefined,
            BRENNER_TRUST_CF_ACCESS_HEADERS: "1",
          },
          () => {
            const headers = makeHeaders({
              "cf-access-authenticated-user-email": "user@example.com",
            });
            const result = checkOrchestrationAuth(headers);
            expect(result.authorized).toBe(true);
            expect(result.reason).toContain("Cloudflare Access");
          },
        );
      });

      it("does not trust Cloudflare Access headers unless explicitly enabled", () => {
        withEnv(
          {
            BRENNER_LAB_MODE: "1",
            BRENNER_LAB_SECRET: undefined,
            BRENNER_TRUST_CF_ACCESS_HEADERS: undefined,
          },
          () => {
            const headers = makeHeaders({ "cf-access-jwt-assertion": "some-jwt-token" });
            const result = checkOrchestrationAuth(headers);
            expect(result.authorized).toBe(false);
            expect(result.reason).toContain("BRENNER_TRUST_CF_ACCESS_HEADERS");
          },
        );
      });

      it("ignores empty JWT header", () => {
        withEnv(
          {
            BRENNER_LAB_MODE: "1",
            BRENNER_LAB_SECRET: undefined,
            BRENNER_TRUST_CF_ACCESS_HEADERS: "1",
          },
          () => {
            const headers = makeHeaders({ "cf-access-jwt-assertion": "" });
            const result = checkOrchestrationAuth(headers);
            expect(result.authorized).toBe(false);
          },
        );
      });

      it("ignores whitespace-only JWT header", () => {
        withEnv(
          {
            BRENNER_LAB_MODE: "1",
            BRENNER_LAB_SECRET: undefined,
            BRENNER_TRUST_CF_ACCESS_HEADERS: "1",
          },
          () => {
            const headers = makeHeaders({ "cf-access-jwt-assertion": "   " });
            const result = checkOrchestrationAuth(headers);
            expect(result.authorized).toBe(false);
          },
        );
      });
    });

    describe("with lab secret", () => {
      it("authorizes with valid header secret", () => {
        withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: "my-test-key" }, () => {
          const headers = makeHeaders({ "x-brenner-lab-secret": "my-test-key" });
          const result = checkOrchestrationAuth(headers);
          expect(result.authorized).toBe(true);
          expect(result.reason).toContain("lab secret");
        });
      });

      it("authorizes with valid cookie secret", () => {
        withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: "my-test-key" }, () => {
          const cookies = makeCookies({ brenner_lab_secret: "my-test-key" });
          const result = checkOrchestrationAuth(undefined, cookies);
          expect(result.authorized).toBe(true);
          expect(result.reason).toContain("lab secret");
        });
      });

      it("returns invalid secret message when secret is configured but wrong", () => {
        withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: "my-test-key" }, () => {
          const headers = makeHeaders({ "x-brenner-lab-secret": "wrong-key" });
          const result = checkOrchestrationAuth(headers);
          expect(result.authorized).toBe(false);
          expect(result.reason).toContain("Invalid or missing lab secret");
        });
      });
    });

    describe("with no auth configured", () => {
      it("returns appropriate message when no secret is configured", () => {
        withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: undefined }, () => {
          const result = checkOrchestrationAuth();
          expect(result.authorized).toBe(false);
          expect(result.reason).toContain("No BRENNER_LAB_SECRET configured");
          expect(result.reason).toContain("BRENNER_TRUST_CF_ACCESS_HEADERS");
        });
      });
    });

    describe("priority order", () => {
      it("prefers Cloudflare Access over lab secret", () => {
        withEnv(
          {
            BRENNER_LAB_MODE: "1",
            BRENNER_LAB_SECRET: "test-key",
            BRENNER_TRUST_CF_ACCESS_HEADERS: "1",
          },
          () => {
            const headers = makeHeaders({
              "cf-access-jwt-assertion": "jwt-token",
              "x-brenner-lab-secret": "test-key",
            });
            const result = checkOrchestrationAuth(headers);
            expect(result.authorized).toBe(true);
            expect(result.reason).toContain("Cloudflare Access");
          },
        );
      });
    });
  });
});

// ============================================================================
// Tests: assertOrchestrationAuth
// ============================================================================

describe("assertOrchestrationAuth", () => {
  it("does not throw when authorized", () => {
    withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: "test-key" }, () => {
      const headers = makeHeaders({ "x-brenner-lab-secret": "test-key" });
      expect(() => assertOrchestrationAuth(headers)).not.toThrow();
    });
  });

  it("throws when not authorized", () => {
    withEnv({ BRENNER_LAB_MODE: "0" }, () => {
      expect(() => assertOrchestrationAuth()).toThrow("Orchestration denied");
    });
  });

  it("includes reason in error message", () => {
    withEnv({ BRENNER_LAB_MODE: "0" }, () => {
      expect(() => assertOrchestrationAuth()).toThrow("Lab mode is disabled");
    });
  });

  it("throws with secret mismatch message", () => {
    withEnv({ BRENNER_LAB_MODE: "1", BRENNER_LAB_SECRET: "correct" }, () => {
      const headers = makeHeaders({ "x-brenner-lab-secret": "wrong" });
      expect(() => assertOrchestrationAuth(headers)).toThrow("Invalid or missing lab secret");
    });
  });
});
