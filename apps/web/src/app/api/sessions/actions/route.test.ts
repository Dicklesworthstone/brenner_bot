import { resolve, win32 } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentMailTestServer,
  createMockRequest,
  setupAgentMailTestEnv,
  teardownAgentMailTestEnv,
} from "@/test-utils";

// Keep infrastructure mocks - these are Next.js internals that don't work outside request context
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({}),
}));

vi.mock("@/lib/auth", () => ({
  checkOrchestrationAuth: () => ({ authorized: true, reason: "ok" }),
}));

import { POST } from "./route";

const normalizeProjectKey = (value: string): string => {
  const isWindowsPath = win32.isAbsolute(value) && !value.startsWith("/");
  return isWindowsPath ? win32.normalize(value) : resolve(value);
};

describe("POST /api/sessions/actions", () => {
  let server: AgentMailTestServer;
  let originalEnv: Record<string, string | undefined>;

  beforeAll(async () => {
    server = new AgentMailTestServer();
    await server.start(18767);
    originalEnv = setupAgentMailTestEnv(server.getPort());
  });

  afterAll(async () => {
    teardownAgentMailTestEnv(originalEnv);
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
    process.env.BRENNER_PROJECT_KEY = "/test/project";
  });

  afterEach(() => {
    // Restore BRENNER_PROJECT_KEY to the test-setup value (not the original pre-test value)
    // This is needed because some tests modify this env var
    process.env.BRENNER_PROJECT_KEY = "/test/project";
  });

  // Helper to create delta message body
  function createDeltaBody(delta: object): string {
    return ["```delta", JSON.stringify(delta), "```"].join("\n");
  }

  // Helper to seed a thread with a DELTA message
  function seedDeltaThread(threadId: string, delta: object): void {
    server.seedThread({
      projectKey: "/test/project",
      threadId,
      messages: [
        {
          from: "Codex",
          subject: "DELTA[gpt]: Research thread seed",
          body_md: createDeltaBody(delta),
          created_ts: "2025-01-01T00:00:00Z",
        },
      ],
    });
  }

  // Helper to seed a thread with a COMPILED message
  function seedCompiledThread(threadId: string, version: number): void {
    server.seedThread({
      projectKey: "/test/project",
      threadId,
      messages: [
        {
          from: "Operator",
          subject: `COMPILED: v${version} artifact`,
          body_md: `# Brenner Protocol Artifact: ${threadId}\n\nVersion: ${version}`,
          created_ts: "2025-01-01T00:02:00Z",
        },
      ],
    });
  }

  describe("compile action", () => {
    it("returns a compile preview when DELTA messages exist", async () => {
      // Seed thread with DELTA message
      seedDeltaThread("TEST-1", {
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: {
          statement: "Test statement",
          context: "Test context",
          why_it_matters: "Test why",
          anchors: ["§1"],
        },
      });

      const response = await POST(
        createMockRequest({
          method: "POST",
          body: { action: "compile", threadId: "TEST-1" },
        }),
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        success: true,
        action: "compile",
        threadId: "TEST-1",
        version: 1,
      });
      const artifactMarkdown = (json as { artifactMarkdown?: unknown }).artifactMarkdown;
      expect(String(artifactMarkdown)).toContain("# Brenner Protocol Artifact: TEST-1");
    });

    it("fails loudly when a DELTA message contains no parseable delta blocks", async () => {
      server.seedThread({
        projectKey: "/test/project",
        threadId: "TEST-NO-FENCE",
        messages: [
          {
            from: "Codex",
            subject: "DELTA[gpt]: Inline JSON (invalid)",
            body_md: JSON.stringify({
              operation: "EDIT",
              section: "research_thread",
              target_id: null,
              payload: { statement: "Missing fence" },
            }),
            created_ts: "2025-01-01T00:00:00Z",
          },
        ],
      });

      const response = await POST(
        createMockRequest({
          method: "POST",
          body: { action: "compile", threadId: "TEST-NO-FENCE" },
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
      });
      expect((json as { error?: string }).error).toContain("no parseable delta blocks");
      expect((json as { details?: unknown }).details).toBeTruthy();
    });
  });

  describe("publish action", () => {
    it("publishes a COMPILED message with the compiled artifact body", async () => {
      // Seed thread with DELTA message
      seedDeltaThread("TEST-2", {
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: {
          statement: "Test statement",
          context: "Test context",
          why_it_matters: "Test why",
        },
      });

      const response = await POST(
        createMockRequest({
          method: "POST",
          body: {
            action: "publish",
            threadId: "TEST-2",
            sender: "Operator",
            recipients: ["Claude"],
          },
        }),
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        success: true,
        action: "publish",
        threadId: "TEST-2",
        version: 1,
      });
      expect(json).toHaveProperty("messageId");

      // Verify COMPILED message was sent
      const messages = server.getMessagesInThread("TEST-2");
      const compiledMsg = messages.find((m) => m.subject.startsWith("COMPILED"));
      expect(compiledMsg).toBeDefined();
    });
  });

  describe("post_delta action", () => {
    it("posts a DELTA message when bodyMd contains a delta block", async () => {
      const deltaBody = createDeltaBody({
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: { context: "Observed X" },
        rationale: "Record experiment outcome",
      });

      const response = await POST(
        createMockRequest({
          method: "POST",
          body: {
            action: "post_delta",
            threadId: "TEST-DELTA",
            sender: "Operator",
            recipients: ["Claude"],
            subject: "Experiment T1 result",
            bodyMd: deltaBody,
          },
        }),
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        success: true,
        action: "post_delta",
        threadId: "TEST-DELTA",
      });
      expect(json).toHaveProperty("messageId");

      // Verify DELTA message was sent
      const messages = server.getMessagesInThread("TEST-DELTA");
      expect(messages).toHaveLength(1);
      expect(messages[0].subject).toMatch(/^DELTA\[/);
      expect(messages[0].body_md).toContain("```delta");
    });

    it("rejects post_delta when bodyMd does not include a delta block", async () => {
      const response = await POST(
        createMockRequest({
          method: "POST",
          body: {
            action: "post_delta",
            threadId: "TEST-NO-DELTA",
            sender: "Operator",
            recipients: ["Claude"],
            subject: "DELTA[human]: no blocks",
            bodyMd: "no delta blocks here",
          },
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
      });
    });
  });

  describe("request_critique action", () => {
    it("rejects critique requests when no compiled artifact exists", async () => {
      // Empty thread - no COMPILED message
      server.seedThread({
        projectKey: "/test/project",
        threadId: "TEST-3",
        messages: [],
      });

      const response = await POST(
        createMockRequest({
          method: "POST",
          body: {
            action: "request_critique",
            threadId: "TEST-3",
            sender: "Operator",
            recipients: ["Codex"],
          },
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
      });
    });

    it("sends a QUESTION critique request when a compiled artifact exists", async () => {
      // Seed thread with COMPILED message
      seedCompiledThread("TEST-4", 2);

      const response = await POST(
        createMockRequest({
          method: "POST",
          body: {
            action: "request_critique",
            threadId: "TEST-4",
            sender: "Operator",
            recipients: ["Codex", "Gemini"],
          },
        }),
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        success: true,
        action: "request_critique",
        threadId: "TEST-4",
        version: 2,
      });
      expect(json).toHaveProperty("messageId");

      // Verify QUESTION message was sent
      const messages = server.getMessagesInThread("TEST-4");
      const questionMsg = messages.find((m) => m.subject.startsWith("QUESTION"));
      expect(questionMsg).toBeDefined();
    });
  });

  describe("project key handling", () => {
    it("defaults to BRENNER_PROJECT_KEY when body.projectKey is omitted", async () => {
      process.env.BRENNER_PROJECT_KEY = "/abs/from/env";
      const normalizedProjectKey = normalizeProjectKey("/abs/from/env");

      // Seed thread in the env-specified project
      server.seedThread({
        projectKey: normalizedProjectKey,
        threadId: "TEST-ENV",
        messages: [
          {
            from: "Codex",
            subject: "DELTA[gpt]: Research thread seed",
            body_md: createDeltaBody({
              operation: "EDIT",
              section: "research_thread",
              target_id: null,
              payload: {
                statement: "Test statement",
                context: "Test context",
                why_it_matters: "Test why",
              },
            }),
            created_ts: "2025-01-01T00:00:00Z",
          },
        ],
      });

      const response = await POST(
        createMockRequest({
          method: "POST",
          body: {
            action: "publish",
            threadId: "TEST-ENV",
            sender: "Operator",
            recipients: ["Claude"],
          },
        }),
      );

      expect(response.status).toBe(200);

      // Verify project was used from env var
      const project = server.getProject(normalizedProjectKey);
      expect(project).toBeDefined();
    });
  });
});
