import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================//
// Mock localStorage (errorRecovery relies on sessionStorage/recoverSessions)
// ============================================================================//

type StorageSequence = { first: string; then: string; calls: number };

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  const sequences = new Map<string, StorageSequence>();

  return {
    __setGetItemSequence: (key: string, first: string, then: string) => {
      sequences.set(key, { first, then, calls: 0 });
    },
    getItem: (key: string) => {
      const sequence = sequences.get(key);
      if (sequence) {
        sequence.calls += 1;
        return sequence.calls === 1 ? sequence.first : sequence.then;
      }
      return store[key] ?? null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
      sequences.clear();
    },
    get length() {
      return Object.keys(store).length + sequences.size;
    },
    key: (index: number) => {
      const keys = [...Object.keys(store), ...Array.from(sequences.keys())];
      return keys[index] ?? null;
    },
  };
})();

Object.defineProperty(global, "window", {
  value: {
    localStorage: localStorageMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

async function loadModule() {
  return await import("./errorRecovery");
}

describe("errorRecovery", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useRealTimers();
  });

  it("retries transient failures and eventually succeeds", async () => {
    const { withRetry } = await loadModule();
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("Transient error");
        }
        return "ok";
      },
      { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitterRatio: 0 },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("honors shouldRetry=false and fails without additional attempts", async () => {
    const { withRetry } = await loadModule();
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error("nope");
        },
        { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitterRatio: 0, shouldRetry: () => false },
      ),
    ).rejects.toThrow(/nope/);

    expect(attempts).toBe(1);
  });

  it("wraps non-Error throwables after exhausting attempts", async () => {
    const { withRetry } = await loadModule();
    await expect(
      withRetry(
        async () => {
          throw "not-an-error";
        },
        { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitterRatio: 0 },
      ),
    ).rejects.toThrow(/Retry attempts exhausted/);
  });

  it("applies jittered backoff when enabled", async () => {
    const { withRetry } = await loadModule();

    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    let attempts = 0;
    const promise = withRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("transient");
        return "ok";
      },
      { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 10, jitterRatio: 0.5 },
    );

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(attempts).toBe(2);

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fails fast when timeout elapses", async () => {
    const { TimeoutError, withTimeout } = await loadModule();
    vi.useFakeTimers();

    const promise = withTimeout(
      new Promise(() => {
        // never resolves
      }),
      { timeoutMs: 50, timeoutMessage: "Timed out" },
    );

    const expectation = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.runAllTimersAsync();
    await expectation;

    vi.useRealTimers();
  });

  it("returns successfully when the wrapped promise resolves before timeout", async () => {
    const { withTimeout } = await loadModule();

    vi.useFakeTimers();
    const promise = withTimeout(Promise.resolve("ok"), { timeoutMs: 50 });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");

    vi.useRealTimers();
  });

  it("creates user-facing recovery notices", async () => {
    const { createRecoveryNotice } = await loadModule();

    const notice = createRecoveryNotice(
      "Title",
      "Message",
      "warning",
      [{ label: "Retry", variant: "default" }],
      "detail",
      "safe",
    );

    expect(notice.title).toBe("Title");
    expect(notice.severity).toBe("warning");
    expect(notice.actions?.[0]?.label).toBe("Retry");
    expect(notice.detail).toBe("detail");
    expect(notice.safeStateMessage).toBe("safe");
  });

  it("recovers from corrupted sessions when storage becomes valid again", async () => {
    const { loadSessionWithRecovery } = await loadModule();

    const sessionId = "SESSION-RECOVER";
    const sessionKey = `brenner-session-${sessionId}`;

    // Ensure recoverSessions() finds at least one valid session while scanning.
    localStorageMock.setItem(
      "brenner-session-OTHER",
      JSON.stringify({
        id: "OTHER",
        _version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "intake",
        primaryHypothesisId: "",
        alternativeHypothesisIds: [],
        hypothesisCards: {},
      }),
    );

    // First load sees corrupted JSON; second load sees a valid session.
    localStorageMock.__setGetItemSequence(
      sessionKey,
      "not-json",
      JSON.stringify({
        id: sessionId,
        _version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "intake",
        primaryHypothesisId: "",
        alternativeHypothesisIds: [],
        hypothesisCards: {},
      }),
    );

    const result = await loadSessionWithRecovery(sessionId);
    expect(result.recovered).toBe(true);
    expect(result.data?.id).toBe(sessionId);
  });

  it("returns {data:null} when the requested session does not exist", async () => {
    const { loadSessionWithRecovery } = await loadModule();
    const result = await loadSessionWithRecovery("SESSION-MISSING");
    expect(result.data).toBeNull();
    expect(result.recovered).toBe(false);
  });

  it("returns an error when storage fails with non-corruption codes", async () => {
    const { loadSessionWithRecovery } = await loadModule();

    const sessionId = "SESSION-QUOTA";
    localStorageMock.setItem(
      `brenner-session-${sessionId}`,
      JSON.stringify({
        id: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "intake",
        primaryHypothesisId: "",
        alternativeHypothesisIds: [],
        hypothesisCards: {},
      }),
    );

    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = (key: string, value: string) => {
      if (key.startsWith("brenner-session_backup:")) {
        throw new Error("quota exceeded");
      }
      originalSetItem(key, value);
    };

    const result = await loadSessionWithRecovery(sessionId);
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);

    localStorageMock.setItem = originalSetItem;
  });
});
