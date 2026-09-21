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

// Mock prompts - reads template files which may not be in test cwd
vi.mock("@/lib/prompts", () => ({
  composePrompt: async () => "COMPOSED PROMPT BODY",
}));

import { POST } from "./route";

const normalizeProjectKey = (value: string): string => {
  const isWindowsPath = win32.isAbsolute(value) && !value.startsWith("/");
  return isWindowsPath ? win32.normalize(value) : resolve(value);
};

describe("POST /api/sessions", () => {
  let server: AgentMailTestServer;
  let originalEnv: Record<string, string | undefined>;

  beforeAll(async () => {
    server = new AgentMailTestServer();
    await server.start(18766);
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
    // Reset BRENNER_PROJECT_KEY if test modified it
    if (originalEnv.BRENNER_PROJECT_KEY === undefined) {
      delete process.env.BRENNER_PROJECT_KEY;
    } else {
      process.env.BRENNER_PROJECT_KEY = originalEnv.BRENNER_PROJECT_KEY;
    }
  });

  it("rejects recipients that become empty after trimming", async () => {
    const response = await POST(
      createMockRequest({
        method: "POST",
        body: {
          sender: "Operator",
          recipients: [" "],
          threadId: "TEST-1",
          excerpt: '### Excerpt\n\n> **§1**: "Hello"\n',
        },
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Missing recipients",
    });
  });

  it.each([["/abs/path/to/repo"], ["C:\\repo\\brenner_bot"], ["\\\\server\\share\\brenner_bot"]])(
    "calls ensure_project for absolute projectKey: %s",
    async (projectKey) => {
      const response = await POST(
        createMockRequest({
          method: "POST",
          body: {
            projectKey,
            sender: "Operator",
            recipients: ["Claude"],
            threadId: "TEST-ABS",
            excerpt: '### Excerpt\n\n> **§1**: "Hello"\n',
          },
        }),
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({ success: true, threadId: "TEST-ABS" });

      // Verify project was created in test server
      const normalizedProjectKey = normalizeProjectKey(projectKey);
      const project = server.getProject(normalizedProjectKey);
      expect(project).toBeDefined();
      expect(project?.human_key).toBe(normalizedProjectKey);

      // Verify sender agent was registered (recipients are auto-registered)
      const agents = server.getProjectAgents(normalizedProjectKey);
      expect(agents.length).toBeGreaterThanOrEqual(1);
      const operatorAgent = agents.find((a) => a.name === "Operator");
      expect(operatorAgent).toBeDefined();
      expect(operatorAgent?.program).toBe("brenner-web");

      // Verify message was sent to recipients
      const messages = server.getMessagesTo("Claude");
      expect(messages).toHaveLength(1);
      expect(messages[0].subject).toContain("KICKOFF");
    },
  );

  it("rejects relative projectKey", async () => {
    const response = await POST(
      createMockRequest({
        method: "POST",
        body: {
          projectKey: "relative/repo",
          sender: "Operator",
          recipients: ["Claude"],
          threadId: "TEST-REL",
          excerpt: '### Excerpt\n\n> **§1**: "Hello"\n',
        },
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Invalid projectKey: must be an absolute path",
    });
  });

  it("defaults to BRENNER_PROJECT_KEY when body.projectKey is omitted", async () => {
    process.env.BRENNER_PROJECT_KEY = "/abs/from/env";

    const response = await POST(
      createMockRequest({
        method: "POST",
        body: {
          sender: "Operator",
          recipients: ["Claude"],
          threadId: "TEST-ENV",
          excerpt: '### Excerpt\n\n> **§1**: "Hello"\n',
        },
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ success: true, threadId: "TEST-ENV" });

    // Verify project was created from env var
    const normalizedProjectKey = normalizeProjectKey("/abs/from/env");
    const project = server.getProject(normalizedProjectKey);
    expect(project).toBeDefined();

    // Verify message was sent
    const messages = server.getMessagesTo("Claude");
    expect(messages).toHaveLength(1);
  });

  it("sends message with correct thread_id", async () => {
    const response = await POST(
      createMockRequest({
        method: "POST",
        body: {
          projectKey: "/test/project",
          sender: "Operator",
          recipients: ["Claude", "Codex"],
          threadId: "THREAD-123",
          excerpt: '### Excerpt\n\n> **§1**: "Test content"\n',
        },
      }),
    );

    expect(response.status).toBe(200);

    // Verify all recipients received the message
    const claudeMessages = server.getMessagesTo("Claude");
    const codexMessages = server.getMessagesTo("Codex");

    expect(claudeMessages).toHaveLength(1);
    expect(codexMessages).toHaveLength(1);
    expect(claudeMessages[0].thread_id).toBe("THREAD-123");
    expect(codexMessages[0].thread_id).toBe("THREAD-123");
  });

  it("normalizes KICKOFF subject prefix", async () => {
    const response = await POST(
      createMockRequest({
        method: "POST",
        body: {
          projectKey: "/test/project",
          sender: "Operator",
          recipients: ["Claude"],
          threadId: "TEST-SUBJECT",
          subject: "Custom topic",
          excerpt: '### Excerpt\n\n> **§1**: "Hello"\n',
        },
      }),
    );

    expect(response.status).toBe(200);

    const messages = server.getMessagesTo("Claude");
    expect(messages).toHaveLength(1);
    expect(messages[0].subject).toBe("KICKOFF: Custom topic");
  });

  it("preserves existing KICKOFF prefix in subject", async () => {
    const response = await POST(
      createMockRequest({
        method: "POST",
        body: {
          projectKey: "/test/project",
          sender: "Operator",
          recipients: ["Claude"],
          threadId: "TEST-PREFIX",
          subject: "KICKOFF: Already has prefix",
          excerpt: '### Excerpt\n\n> **§1**: "Hello"\n',
        },
      }),
    );

    expect(response.status).toBe(200);

    const messages = server.getMessagesTo("Claude");
    expect(messages).toHaveLength(1);
    expect(messages[0].subject).toBe("KICKOFF: Already has prefix");
  });

  it("deduplicates recipients", async () => {
    const response = await POST(
      createMockRequest({
        method: "POST",
        body: {
          projectKey: "/test/project",
          sender: "Operator",
          recipients: ["Claude", "Claude", "Codex", "claude"],
          threadId: "TEST-DEDUP",
          excerpt: '### Excerpt\n\n> **§1**: "Hello"\n',
        },
      }),
    );

    expect(response.status).toBe(200);

    // Verify message was sent
    const allMessages = server.getAllMessages();
    expect(allMessages).toHaveLength(1);

    // Verify the message's `to` field has deduplicated recipients
    // Note: deduplication is case-sensitive, so "Claude" and "claude" are different
    // Input: ["Claude", "Claude", "Codex", "claude"]
    // Expected: ["Claude", "Codex", "claude"] (Claude appears once, not twice)
    const message = allMessages[0];
    expect(message.to).toHaveLength(3);
    expect(message.to).toContain("Claude");
    expect(message.to).toContain("Codex");
    expect(message.to).toContain("claude");

    // Verify deliveries were created for each unique recipient
    const deliveries = server.getAllDeliveries();
    expect(deliveries).toHaveLength(3);
    const deliveryNames = deliveries.map((d) => d.agent_name);
    expect(deliveryNames).toContain("Claude");
    expect(deliveryNames).toContain("Codex");
    expect(deliveryNames).toContain("claude");
  });
});
