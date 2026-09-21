import { beforeEach, describe, expect, it } from "vitest";
import { enqueueOfflineAction, getOfflineQueue } from "./offline";

describe("offline queue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("filters out prototype-polluted entries", () => {
    const protoKey = "__proto__";
    localStorage.setItem(
      "brenner-offline-queue",
      JSON.stringify([
        {
          id: "polluted",
          kind: "session-action",
          createdAt: "2026-01-01T00:00:00.000Z",
          attemptCount: 0,
          payload: {},
          [protoKey]: { polluted: true },
        },
      ]),
    );

    expect(getOfflineQueue()).toEqual([]);
  });

  it("returns enqueued actions", () => {
    const item = enqueueOfflineAction("session-action", { action: "compile", threadId: "T1" });
    const queue = getOfflineQueue();

    expect(queue.length).toBe(1);
    expect(queue[0]?.id).toBe(item.id);
    expect(queue[0]?.kind).toBe("session-action");
  });
});
