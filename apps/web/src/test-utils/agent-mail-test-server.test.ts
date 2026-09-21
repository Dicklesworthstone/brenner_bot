/**
 * Tests for Agent Mail Integration Test Server
 *
 * Tests the test server itself to ensure it correctly implements
 * the Agent Mail JSON-RPC protocol.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AgentMailTestServer } from "./agent-mail-test-server";

describe("AgentMailTestServer", () => {
  let server: AgentMailTestServer;
  let baseUrl: string;

  beforeAll(async () => {
    server = new AgentMailTestServer();
    const port = await server.start(0); // Random available port
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  async function callJsonRpc(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${baseUrl}/mcp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "test-" + Date.now(),
        method,
        params: params ?? {},
      }),
    });

    const json = await response.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
  }

  async function toolsCall(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await callJsonRpc("tools/call", { name, arguments: args });
    // Unwrap structuredContent to match what clients expect after parsing
    if (result && typeof result === "object" && "structuredContent" in result) {
      return (result as { structuredContent: unknown }).structuredContent;
    }
    return result;
  }

  async function resourcesRead(uri: string): Promise<unknown> {
    return callJsonRpc("resources/read", { uri });
  }

  // ============================================================================
  // Lifecycle Tests
  // ============================================================================

  describe("lifecycle", () => {
    it("starts in under 100ms", async () => {
      const testServer = new AgentMailTestServer();
      const start = performance.now();
      await testServer.start(0);
      const elapsed = performance.now() - start;
      await testServer.stop();

      expect(elapsed).toBeLessThan(100);
    });

    it("returns the assigned port", () => {
      expect(server.getPort()).toBeGreaterThan(0);
    });

    it("returns correct base URL", () => {
      expect(server.getBaseUrl()).toBe(baseUrl);
    });

    it("resets state between tests", async () => {
      // Create some state
      await toolsCall("ensure_project", { human_key: "/test/project" });
      expect(server.getRegisteredProjects()).toHaveLength(1);

      // Reset
      server.reset();
      expect(server.getRegisteredProjects()).toHaveLength(0);
    });
  });

  // ============================================================================
  // tools/list Tests
  // ============================================================================

  describe("tools/list", () => {
    it("returns list of available tools", async () => {
      const result = await callJsonRpc("tools/list");

      expect(result).toHaveProperty("tools");
      const tools = (result as { tools: Array<{ name: string }> }).tools;
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("ensure_project");
      expect(toolNames).toContain("register_agent");
      expect(toolNames).toContain("send_message");
      expect(toolNames).toContain("fetch_inbox");
    });
  });

  // ============================================================================
  // ensure_project Tests
  // ============================================================================

  describe("ensure_project", () => {
    it("creates a new project", async () => {
      const result = await toolsCall("ensure_project", {
        human_key: "/data/projects/test",
      });

      expect(result).toMatchObject({
        id: expect.any(Number),
        slug: expect.any(String),
        human_key: "/data/projects/test",
        created_at: expect.any(String),
      });
    });

    it("returns existing project on duplicate call", async () => {
      const result1 = await toolsCall("ensure_project", {
        human_key: "/data/projects/test",
      });
      const result2 = await toolsCall("ensure_project", {
        human_key: "/data/projects/test",
      });

      expect(result1).toEqual(result2);
    });

    it("throws if human_key is missing", async () => {
      await expect(toolsCall("ensure_project", {})).rejects.toThrow("human_key is required");
    });
  });

  // ============================================================================
  // register_agent Tests
  // ============================================================================

  describe("register_agent", () => {
    beforeEach(async () => {
      await toolsCall("ensure_project", { human_key: "/test/project" });
    });

    it("registers a new agent", async () => {
      const result = await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "vitest",
        model: "test-model",
        name: "TestAgent",
        task_description: "Running tests",
      });

      expect(result).toMatchObject({
        id: expect.any(Number),
        name: "TestAgent",
        program: "vitest",
        model: "test-model",
        task_description: "Running tests",
        project_id: expect.any(Number),
      });
    });

    it("generates random name if not provided", async () => {
      const result = await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "vitest",
        model: "test-model",
      });

      const agent = result as { name: string };
      expect(agent.name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+$/);
    });

    it("updates existing agent on re-registration", async () => {
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "vitest",
        model: "v1",
        name: "TestAgent",
      });

      const result = await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "vitest",
        model: "v2",
        name: "TestAgent",
      });

      const agent = result as { model: string };
      expect(agent.model).toBe("v2");
      expect(server.getRegisteredAgents()).toHaveLength(1);
    });

    it("auto-creates project if not found", async () => {
      // Projects are auto-created for testing convenience
      const result = await toolsCall("register_agent", {
        project_key: "/auto-created",
        program: "test",
        model: "test",
        name: "AutoAgent",
      });

      expect(result).toMatchObject({
        name: "AutoAgent",
        program: "test",
        model: "test",
      });

      // Verify project was auto-created
      const project = server.getProject("/auto-created");
      expect(project).toBeDefined();
      expect(project?.human_key).toBe("/auto-created");
    });
  });

  // ============================================================================
  // send_message Tests
  // ============================================================================

  describe("send_message", () => {
    beforeEach(async () => {
      await toolsCall("ensure_project", { human_key: "/test/project" });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Sender",
      });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Receiver",
      });
    });

    it("sends a message", async () => {
      const result = await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Sender",
        to: ["Receiver"],
        subject: "Test Subject",
        body_md: "Test body",
      });

      expect(result).toMatchObject({
        deliveries: expect.arrayContaining([
          expect.objectContaining({
            project: "/test/project",
            payload: expect.objectContaining({
              subject: "Test Subject",
              body_md: "Test body",
              from: "Sender",
              to: ["Receiver"],
            }),
          }),
        ]),
        count: 1,
      });
    });

    it("creates deliveries for recipients", async () => {
      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Sender",
        to: ["Receiver"],
        subject: "Test",
        body_md: "Body",
      });

      const deliveries = server.getAllDeliveries();
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].agent_name).toBe("Receiver");
      expect(deliveries[0].kind).toBe("to");
    });

    it("handles cc and bcc recipients", async () => {
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "CcAgent",
      });

      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Sender",
        to: ["Receiver"],
        cc: ["CcAgent"],
        subject: "Test",
        body_md: "Body",
      });

      const deliveries = server.getAllDeliveries();
      expect(deliveries).toHaveLength(2);
      expect(deliveries.find((d) => d.agent_name === "CcAgent")?.kind).toBe("cc");
    });

    it("sets thread_id when provided", async () => {
      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Sender",
        to: ["Receiver"],
        subject: "Test",
        body_md: "Body",
        thread_id: "THREAD-123",
      });

      const messages = server.getMessagesInThread("THREAD-123");
      expect(messages).toHaveLength(1);
    });

    it("throws if sender not registered", async () => {
      await expect(
        toolsCall("send_message", {
          project_key: "/test/project",
          sender_name: "Unknown",
          to: ["Receiver"],
          subject: "Test",
          body_md: "Body",
        }),
      ).rejects.toThrow("Sender agent not found");
    });
  });

  // ============================================================================
  // fetch_inbox / resources/read inbox Tests
  // ============================================================================

  describe("inbox", () => {
    beforeEach(async () => {
      await toolsCall("ensure_project", { human_key: "/test/project" });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Agent1",
      });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Agent2",
      });
    });

    it("fetches inbox messages via tool", async () => {
      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Agent1",
        to: ["Agent2"],
        subject: "Hello",
        body_md: "World",
      });

      const result = await toolsCall("fetch_inbox", {
        project_key: "/test/project",
        agent_name: "Agent2",
      });

      expect(result).toHaveLength(1);
      const msg = (result as Array<{ subject: string }>)[0];
      expect(msg.subject).toBe("Hello");
    });

    it("fetches inbox via resource URI", async () => {
      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Agent1",
        to: ["Agent2"],
        subject: "Test",
        body_md: "Body",
      });

      const result = await resourcesRead(
        `resource://inbox/Agent2?project=/test/project&include_bodies=true`,
      );

      const contents = (result as { contents: Array<{ text: string }> }).contents;
      const inbox = JSON.parse(contents[0].text);

      expect(inbox.agent).toBe("Agent2");
      expect(inbox.messages).toHaveLength(1);
      expect(inbox.messages[0].body_md).toBe("Body");
    });

    it("excludes body_md when include_bodies is false", async () => {
      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Agent1",
        to: ["Agent2"],
        subject: "Test",
        body_md: "Secret Body",
      });

      const result = await resourcesRead(
        `resource://inbox/Agent2?project=/test/project&include_bodies=false`,
      );

      const contents = (result as { contents: Array<{ text: string }> }).contents;
      const inbox = JSON.parse(contents[0].text);

      expect(inbox.messages[0].body_md).toBe("");
    });

    it("returns empty inbox for agent with no messages", async () => {
      const result = await toolsCall("fetch_inbox", {
        project_key: "/test/project",
        agent_name: "Agent1",
      });

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // resources/read thread Tests
  // ============================================================================

  describe("thread", () => {
    beforeEach(async () => {
      await toolsCall("ensure_project", { human_key: "/test/project" });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Agent1",
      });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Agent2",
      });
    });

    it("fetches thread messages", async () => {
      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Agent1",
        to: ["Agent2"],
        subject: "Thread Message 1",
        body_md: "Body 1",
        thread_id: "THREAD-1",
      });

      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Agent2",
        to: ["Agent1"],
        subject: "Re: Thread Message 1",
        body_md: "Body 2",
        thread_id: "THREAD-1",
      });

      const result = await resourcesRead(
        `resource://thread/THREAD-1?project=/test/project&include_bodies=true`,
      );

      const contents = (result as { contents: Array<{ text: string }> }).contents;
      const thread = JSON.parse(contents[0].text);

      expect(thread.thread_id).toBe("THREAD-1");
      expect(thread.messages).toHaveLength(2);
    });

    it("returns empty thread for unknown thread_id", async () => {
      const result = await resourcesRead(`resource://thread/UNKNOWN?project=/test/project`);

      const contents = (result as { contents: Array<{ text: string }> }).contents;
      const thread = JSON.parse(contents[0].text);

      expect(thread.messages).toHaveLength(0);
    });
  });

  // ============================================================================
  // mark_message_read / acknowledge_message Tests
  // ============================================================================

  describe("message acknowledgement", () => {
    let messageId: number;

    beforeEach(async () => {
      await toolsCall("ensure_project", { human_key: "/test/project" });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Sender",
      });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Receiver",
      });

      const result = await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Sender",
        to: ["Receiver"],
        subject: "Test",
        body_md: "Body",
        ack_required: true,
      });

      const payload = (result as { deliveries: Array<{ payload: { id: number } }> }).deliveries[0]
        .payload;
      messageId = payload.id;
    });

    it("marks message as read", async () => {
      const result = await toolsCall("mark_message_read", {
        project_key: "/test/project",
        agent_name: "Receiver",
        message_id: messageId,
      });

      expect(result).toMatchObject({
        message_id: messageId,
        read: true,
        read_at: expect.any(String),
      });
    });

    it("acknowledges message", async () => {
      const result = await toolsCall("acknowledge_message", {
        project_key: "/test/project",
        agent_name: "Receiver",
        message_id: messageId,
      });

      expect(result).toMatchObject({
        message_id: messageId,
        acknowledged: true,
        acknowledged_at: expect.any(String),
        read_at: expect.any(String),
      });
    });

    it("throws for unknown message", async () => {
      await expect(
        toolsCall("mark_message_read", {
          project_key: "/test/project",
          agent_name: "Receiver",
          message_id: 99999,
        }),
      ).rejects.toThrow("Delivery not found");
    });
  });

  // ============================================================================
  // Inspection Method Tests
  // ============================================================================

  describe("inspection methods", () => {
    beforeEach(async () => {
      await toolsCall("ensure_project", { human_key: "/test/project" });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Agent1",
      });
      await toolsCall("register_agent", {
        project_key: "/test/project",
        program: "test",
        model: "test",
        name: "Agent2",
      });

      await toolsCall("send_message", {
        project_key: "/test/project",
        sender_name: "Agent1",
        to: ["Agent2"],
        subject: "Hello",
        body_md: "World",
      });
    });

    it("getMessagesTo returns messages to specific agent", () => {
      const messages = server.getMessagesTo("Agent2");
      expect(messages).toHaveLength(1);
      expect(messages[0].subject).toBe("Hello");
    });

    it("getMessagesSentBy returns messages from specific agent", () => {
      const messages = server.getMessagesSentBy("Agent1");
      expect(messages).toHaveLength(1);
      expect(messages[0].from).toBe("Agent1");
    });

    it("getRegisteredAgents returns all agents", () => {
      const agents = server.getRegisteredAgents();
      expect(agents).toHaveLength(2);
      expect(agents.map((a) => a.name).sort()).toEqual(["Agent1", "Agent2"]);
    });

    it("getRegisteredProjects returns all projects", () => {
      const projects = server.getRegisteredProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].human_key).toBe("/test/project");
    });

    it("getAllMessages returns all messages", () => {
      const messages = server.getAllMessages();
      expect(messages).toHaveLength(1);
    });

    it("getAllDeliveries returns all deliveries", () => {
      const deliveries = server.getAllDeliveries();
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].agent_name).toBe("Agent2");
    });
  });

  // ============================================================================
  // Error Mode Tests
  // ============================================================================

  describe("error mode", () => {
    it("returns error response when error mode is enabled", async () => {
      server.enableErrorMode(-32000, "Simulated server error");

      await expect(toolsCall("ensure_project", { human_key: "/test/project" })).rejects.toThrow(
        "Simulated server error",
      );

      server.disableErrorMode();
    });

    it("resumes normal operation after disabling error mode", async () => {
      server.enableErrorMode(-32000, "Temporary error");
      server.disableErrorMode();

      const result = await toolsCall("ensure_project", {
        human_key: "/test/project",
      });

      expect(result).toMatchObject({
        human_key: "/test/project",
      });
    });

    it("uses custom error code", async () => {
      server.enableErrorMode(-32001, "Custom error");

      const response = await fetch(`${baseUrl}/mcp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "test-error",
          method: "tools/call",
          params: { name: "ensure_project", arguments: { human_key: "/test" } },
        }),
      });

      const json = await response.json();
      expect(json.error).toMatchObject({
        code: -32001,
        message: "Custom error",
      });

      server.disableErrorMode();
    });

    it("reset() clears error mode to prevent test pollution", async () => {
      server.enableErrorMode(-32000, "Should be cleared by reset");
      server.reset();

      // After reset, error mode should be disabled and calls should succeed
      const result = await toolsCall("ensure_project", {
        human_key: "/test/project",
      });

      expect(result).toMatchObject({
        human_key: "/test/project",
      });
    });
  });
});
