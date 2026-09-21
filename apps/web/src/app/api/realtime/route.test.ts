import type { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMailTestServer, setupAgentMailTestEnv, teardownAgentMailTestEnv } from "@/test-utils";
import { GET } from "./route";

// Next.js request-context globals don't exist in vitest
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({}),
}));

vi.mock("@/lib/auth", () => ({
  checkOrchestrationAuth: () => ({ authorized: true, reason: "ok" }),
}));

async function readSseEvent(
  response: Response,
  eventName: string,
  timeoutMs = 2000,
): Promise<{ id: number | null; event: string; data: string | null }> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing SSE response body reader");

  const decoder = new TextDecoder();
  const startedAt = Date.now();

  let buffer = "";
  let dataLines: string[] = [];
  let currentEvent = "";
  let currentId: number | null = null;

  const finalizeEvent = () => {
    const name = currentEvent.trim();
    const data = dataLines.length > 0 ? dataLines.join("\n") : null;
    const id = currentId;
    dataLines = [];
    currentEvent = "";
    currentId = null;
    return { id, event: name, data };
  };

  try {
    while (true) {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for SSE event: ${eventName}`);
      }

      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) break;

        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);

        if (line === "") {
          const parsed = finalizeEvent();
          if (parsed.event === eventName) {
            return parsed;
          }
          continue;
        }

        if (line.startsWith("id:")) {
          const raw = line.slice(3).trim();
          const parsedId = Number.parseInt(raw, 10);
          currentId = Number.isFinite(parsedId) ? parsedId : null;
          continue;
        }

        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trimStart();
          continue;
        }

        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {}
  }

  throw new Error(`SSE stream ended before receiving event: ${eventName}`);
}

function createRealtimeRequest(options: {
  threadId: string;
  cursor?: string;
  lastEventId?: string;
}): NextRequest {
  const url = new URL("http://localhost:3000/api/realtime");
  url.searchParams.set("threadId", options.threadId);
  if (options.cursor !== undefined) url.searchParams.set("cursor", options.cursor);
  url.searchParams.set("pollIntervalMs", "500");

  const headers = new Headers();
  if (options.lastEventId !== undefined) headers.set("last-event-id", options.lastEventId);

  const controller = new AbortController();
  // Use actual Request constructor to ensure request.headers.get() works correctly.
  // A plain object with a headers property doesn't implement the Headers API properly
  // when accessed via request.headers.get() after casting to NextRequest.
  const request = new Request(url.toString(), {
    headers,
    signal: controller.signal,
  });

  return request as unknown as NextRequest;
}

describe("GET /api/realtime", () => {
  let server: AgentMailTestServer;
  let originalEnv: Record<string, string | undefined>;

  beforeAll(async () => {
    server = new AgentMailTestServer();
    await server.start(0);
    originalEnv = setupAgentMailTestEnv(server.getPort());
  });

  afterAll(async () => {
    teardownAgentMailTestEnv(originalEnv);
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
  });

  it("respects last-event-id when higher than cursor query param (reconnect safety)", async () => {
    const threadId = "TRIBUNAL-TEST-realtime";
    server.seedThread({
      projectKey: "/test/project",
      threadId,
      messages: [
        { from: "Operator", to: ["AgentA"], subject: "MSG: 1", body_md: "hello" },
        { from: "AgentA", to: ["Operator"], subject: "MSG: 2", body_md: "world" },
        { from: "AgentB", to: ["Operator"], subject: "MSG: 3", body_md: "!" },
      ],
    });

    const response = await GET(
      createRealtimeRequest({
        threadId,
        cursor: "0",
        lastEventId: "2",
      }),
    );

    expect(response.status).toBe(200);
    const ready = await readSseEvent(response, "ready");
    expect(ready.id).toBe(2);
  });

  it("uses cursor query param on first connect when last-event-id is missing", async () => {
    const threadId = "TRIBUNAL-TEST-realtime-initial";
    server.seedThread({
      projectKey: "/test/project",
      threadId,
      messages: [{ from: "Operator", to: ["AgentA"], subject: "MSG: 1", body_md: "hello" }],
    });

    const response = await GET(
      createRealtimeRequest({
        threadId,
        cursor: "0",
      }),
    );

    expect(response.status).toBe(200);
    const ready = await readSseEvent(response, "ready");
    expect(ready.id).toBe(0);
  });
});
