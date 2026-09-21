/**
 * Agent Mail Integration Test Server
 *
 * A lightweight in-memory test server that implements the Agent Mail JSON-RPC protocol.
 * Allows API route tests to run against real (but isolated) Agent Mail infrastructure.
 *
 * Philosophy: NO mocks - test real behavior with isolated test fixtures.
 *
 * @example
 * ```typescript
 * let server: AgentMailTestServer;
 *
 * beforeAll(async () => {
 *   server = new AgentMailTestServer();
 *   await server.start(18765);
 *   process.env.AGENT_MAIL_BASE_URL = 'http://localhost:18765';
 * });
 *
 * afterAll(async () => {
 *   await server.stop();
 * });
 *
 * beforeEach(() => {
 *   server.reset();
 * });
 * ```
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

// ============================================================================
// Types
// ============================================================================

export interface TestAgent {
  id: number;
  name: string;
  program: string;
  model: string;
  task_description: string;
  project_id: number;
  inception_ts: string;
  last_active_ts: string;
}

export interface TestProject {
  id: number;
  slug: string;
  human_key: string;
  created_at: string;
}

export interface TestMessage {
  id: number;
  project_id: number;
  sender_id: number;
  thread_id: string | null;
  subject: string;
  body_md: string;
  importance: "low" | "normal" | "high" | "urgent";
  ack_required: boolean;
  created_ts: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface TestDelivery {
  message_id: number;
  agent_id: number;
  agent_name: string;
  kind: "to" | "cc" | "bcc";
  read_ts: string | null;
  ack_ts: string | null;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface RpcLogEntry {
  ts: string;
  request: JsonRpcRequest;
  response: JsonRpcResponse;
}

// ============================================================================
// Test Server Implementation
// ============================================================================

export class AgentMailTestServer {
  private server: Server | null = null;
  private port: number = 0;

  // In-memory state
  private projects: Map<string, TestProject> = new Map();
  private agents: Map<string, TestAgent> = new Map(); // key: "projectKey:agentName"
  private messages: TestMessage[] = [];
  private deliveries: TestDelivery[] = [];
  private rpcLog: RpcLogEntry[] = [];

  // Auto-increment IDs
  private nextProjectId = 1;
  private nextAgentId = 1;
  private nextMessageId = 1;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async start(port: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      this.server.on("error", reject);

      this.server.listen(port, "127.0.0.1", () => {
        const addr = this.server?.address();
        if (addr && typeof addr === "object") {
          this.port = addr.port;
          resolve(this.port);
        } else {
          reject(new Error("Failed to get server address"));
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
      this.server = null;
    });
  }

  reset(): void {
    this.projects.clear();
    this.agents.clear();
    this.messages = [];
    this.deliveries = [];
    this.rpcLog = [];
    this.nextProjectId = 1;
    this.nextAgentId = 1;
    this.nextMessageId = 1;
    // Also reset error mode to prevent test pollution
    this.errorMode = { enabled: false, code: -32603, message: "Simulated error" };
  }

  getPort(): number {
    return this.port;
  }

  getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  // ============================================================================
  // Request Handler
  // ============================================================================

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS headers for browser-based tests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    try {
      const body = await this.readBody(req);
      const request = JSON.parse(body) as JsonRpcRequest;
      const response = await this.handleJsonRpc(request);

      this.recordRpcLog(request, response);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
    } catch (err) {
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: err instanceof Error ? err.message : "Parse error",
        },
      };
      // Best-effort log for parse errors (we don't have a valid request envelope)
      this.rpcLog.push({
        ts: new Date().toISOString(),
        request: { jsonrpc: "2.0", id: null, method: "parse_error" },
        response,
      });
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
    }
  }

  private recordRpcLog(request: JsonRpcRequest, response: JsonRpcResponse): void {
    this.rpcLog.push({ ts: new Date().toISOString(), request, response });
    // Keep logs bounded to avoid runaway memory usage in long runs.
    if (this.rpcLog.length > 2000) {
      this.rpcLog = this.rpcLog.slice(this.rpcLog.length - 2000);
    }
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  private async handleJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = request;

    // Check if error mode is enabled (for testing error handling scenarios)
    if (this.errorMode.enabled) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: this.errorMode.code, message: this.errorMode.message },
      };
    }

    try {
      let result: unknown;

      if (method === "tools/list") {
        result = this.handleToolsList();
      } else if (method === "tools/call") {
        result = await this.handleToolsCall(
          params as { name: string; arguments: Record<string, unknown> },
        );
      } else if (method === "resources/read") {
        result = this.handleResourcesRead(params as { uri: string });
      } else {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
      }

      return { jsonrpc: "2.0", id, result };
    } catch (err) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : "Internal error",
        },
      };
    }
  }

  // ============================================================================
  // MCP Handlers
  // ============================================================================

  private handleToolsList(): { tools: Array<{ name: string; description: string }> } {
    return {
      tools: [
        { name: "ensure_project", description: "Ensure a project exists" },
        { name: "register_agent", description: "Register an agent identity" },
        { name: "send_message", description: "Send a message to agents" },
        { name: "fetch_inbox", description: "Fetch inbox messages" },
        { name: "mark_message_read", description: "Mark a message as read" },
        { name: "acknowledge_message", description: "Acknowledge a message" },
      ],
    };
  }

  private async handleToolsCall(params: {
    name: string;
    arguments: Record<string, unknown>;
  }): Promise<{ structuredContent: unknown }> {
    const { name, arguments: args } = params;

    let result: unknown;
    switch (name) {
      case "ensure_project":
        result = this.ensureProject(args);
        break;
      case "register_agent":
        result = this.registerAgent(args);
        break;
      case "send_message":
        result = this.sendMessage(args);
        break;
      case "fetch_inbox":
        result = this.fetchInbox(args);
        break;
      case "mark_message_read":
        result = this.markMessageRead(args);
        break;
      case "acknowledge_message":
        result = this.acknowledgeMessage(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Wrap result in structuredContent to match real Agent Mail server format
    return { structuredContent: result };
  }

  private handleResourcesRead(params: { uri: string }): {
    contents: Array<{ uri: string; text: string }>;
  } {
    const { uri } = params;

    // Parse resource:// URIs manually since URL() doesn't handle custom schemes correctly
    const uriWithoutScheme = uri.replace(/^resource:\/\//, "");
    const [pathPart, queryPart] = uriWithoutScheme.split("?");
    const searchParams: Record<string, string> = {};
    if (queryPart) {
      for (const pair of queryPart.split("&")) {
        const [key, value] = pair.split("=");
        if (key) searchParams[key] = decodeURIComponent(value || "");
      }
    }

    if (pathPart.startsWith("inbox/")) {
      const agentName = pathPart.slice("inbox/".length);
      const projectKey = searchParams.project || "";
      const limit = parseInt(searchParams.limit || "20", 10);
      const includeBodies = searchParams.include_bodies === "true";

      const inbox = this.getInboxFor(projectKey, agentName, limit, includeBodies);
      return {
        contents: [{ uri, text: JSON.stringify(inbox) }],
      };
    }

    if (pathPart.startsWith("agents/")) {
      const projectSlug = pathPart.slice("agents/".length);
      const directory = this.getAgentDirectory(projectSlug);
      return {
        contents: [{ uri, text: JSON.stringify(directory) }],
      };
    }

    if (pathPart.startsWith("thread/")) {
      const threadId = pathPart.slice("thread/".length);
      const projectKey = searchParams.project || "";
      const includeBodies = searchParams.include_bodies === "true";

      const thread = this.getThread(projectKey, threadId, includeBodies);
      return {
        contents: [{ uri, text: JSON.stringify(thread) }],
      };
    }

    if (pathPart === "logs") {
      const limit = parseInt(searchParams.limit || "200", 10);
      const entries = this.rpcLog.slice(-Math.max(0, Math.min(limit, 2000)));
      return {
        contents: [{ uri, text: JSON.stringify({ count: this.rpcLog.length, entries }) }],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  // ============================================================================
  // Tool Implementations
  // ============================================================================

  private ensureProject(args: Record<string, unknown>): TestProject {
    const humanKey = args.human_key as string;
    if (!humanKey) throw new Error("human_key is required");

    const existing = this.projects.get(humanKey);
    if (existing) return existing;

    const project: TestProject = {
      id: this.nextProjectId++,
      slug: humanKey.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
      human_key: humanKey,
      created_at: new Date().toISOString(),
    };

    this.projects.set(humanKey, project);
    return project;
  }

  private registerAgent(args: Record<string, unknown>): TestAgent {
    const projectKey = args.project_key as string;
    const program = args.program as string;
    const model = args.model as string;
    const name = (args.name as string) || this.generateAgentName();
    const taskDescription = (args.task_description as string) || "";

    if (!projectKey) throw new Error("project_key is required");
    if (!program) throw new Error("program is required");
    if (!model) throw new Error("model is required");

    // Auto-create project if it doesn't exist (for testing convenience)
    let project = this.projects.get(projectKey);
    if (!project) {
      project = this.ensureProject({ human_key: projectKey });
    }

    const agentKey = `${projectKey}:${name}`;
    const existing = this.agents.get(agentKey);

    if (existing) {
      // Update existing agent
      existing.program = program;
      existing.model = model;
      existing.task_description = taskDescription;
      existing.last_active_ts = new Date().toISOString();
      return existing;
    }

    const agent: TestAgent = {
      id: this.nextAgentId++,
      name,
      program,
      model,
      task_description: taskDescription,
      project_id: project.id,
      inception_ts: new Date().toISOString(),
      last_active_ts: new Date().toISOString(),
    };

    this.agents.set(agentKey, agent);
    return agent;
  }

  private sendMessage(args: Record<string, unknown>): { deliveries: unknown[]; count: number } {
    const projectKey = args.project_key as string;
    const senderName = args.sender_name as string;
    const to = args.to as string[];
    const subject = args.subject as string;
    const bodyMd = args.body_md as string;
    const cc = (args.cc as string[]) || [];
    const bcc = (args.bcc as string[]) || [];
    const threadId = (args.thread_id as string) || null;
    const importance = (args.importance as "low" | "normal" | "high" | "urgent") || "normal";
    const ackRequired = (args.ack_required as boolean) || false;

    if (!projectKey) throw new Error("project_key is required");
    if (!senderName) throw new Error("sender_name is required");
    // Allow empty recipients for thread seeding (messages may not have explicit recipients)
    if (!to) throw new Error("to is required (can be empty array)");
    if (!subject) throw new Error("subject is required");
    if (!bodyMd) throw new Error("body_md is required");

    const project = this.projects.get(projectKey);
    if (!project) throw new Error(`Project not found: ${projectKey}`);

    const senderKey = `${projectKey}:${senderName}`;
    const sender = this.agents.get(senderKey);
    if (!sender) throw new Error(`Sender agent not found: ${senderName}`);

    const message: TestMessage = {
      id: this.nextMessageId++,
      project_id: project.id,
      sender_id: sender.id,
      thread_id: threadId,
      subject,
      body_md: bodyMd,
      importance,
      ack_required: ackRequired,
      created_ts: new Date().toISOString(),
      from: senderName,
      to,
      cc,
      bcc,
    };

    this.messages.push(message);

    // Create deliveries for all recipients (auto-register if needed)
    const allRecipients = [
      ...to.map((name) => ({ name, kind: "to" as const })),
      ...cc.map((name) => ({ name, kind: "cc" as const })),
      ...bcc.map((name) => ({ name, kind: "bcc" as const })),
    ];

    for (const { name, kind } of allRecipients) {
      const recipientKey = `${projectKey}:${name}`;
      let recipient = this.agents.get(recipientKey);

      // Auto-register recipient if not already registered
      if (!recipient) {
        recipient = {
          id: this.nextAgentId++,
          name,
          program: "auto-registered",
          model: "unknown",
          task_description: "",
          project_id: project.id,
          inception_ts: new Date().toISOString(),
          last_active_ts: new Date().toISOString(),
        };
        this.agents.set(recipientKey, recipient);
      }

      this.deliveries.push({
        message_id: message.id,
        agent_id: recipient.id,
        agent_name: name,
        kind,
        read_ts: null,
        ack_ts: null,
      });
    }

    return {
      deliveries: [{ project: projectKey, payload: message }],
      count: 1,
    };
  }

  private fetchInbox(args: Record<string, unknown>): TestMessage[] {
    const projectKey = args.project_key as string;
    const agentName = args.agent_name as string;
    const limit = (args.limit as number) || 20;
    const includeBodies = (args.include_bodies as boolean) || false;

    if (!projectKey) throw new Error("project_key is required");
    if (!agentName) throw new Error("agent_name is required");

    return this.getInboxFor(projectKey, agentName, limit, includeBodies).messages;
  }

  private markMessageRead(args: Record<string, unknown>): {
    message_id: number;
    read: boolean;
    read_at: string;
  } {
    const projectKey = args.project_key as string;
    const agentName = args.agent_name as string;
    const messageId = args.message_id as number;

    if (!projectKey) throw new Error("project_key is required");
    if (!agentName) throw new Error("agent_name is required");
    if (!messageId) throw new Error("message_id is required");

    const delivery = this.deliveries.find(
      (d) => d.message_id === messageId && d.agent_name === agentName,
    );

    if (!delivery) throw new Error(`Delivery not found for message ${messageId} to ${agentName}`);

    const now = new Date().toISOString();
    if (!delivery.read_ts) {
      delivery.read_ts = now;
    }

    return {
      message_id: messageId,
      read: true,
      read_at: delivery.read_ts,
    };
  }

  private acknowledgeMessage(args: Record<string, unknown>): {
    message_id: number;
    acknowledged: boolean;
    acknowledged_at: string;
    read_at: string;
  } {
    const projectKey = args.project_key as string;
    const agentName = args.agent_name as string;
    const messageId = args.message_id as number;

    if (!projectKey) throw new Error("project_key is required");
    if (!agentName) throw new Error("agent_name is required");
    if (!messageId) throw new Error("message_id is required");

    const delivery = this.deliveries.find(
      (d) => d.message_id === messageId && d.agent_name === agentName,
    );

    if (!delivery) throw new Error(`Delivery not found for message ${messageId} to ${agentName}`);

    const now = new Date().toISOString();
    if (!delivery.read_ts) {
      delivery.read_ts = now;
    }
    if (!delivery.ack_ts) {
      delivery.ack_ts = now;
    }

    return {
      message_id: messageId,
      acknowledged: true,
      acknowledged_at: delivery.ack_ts,
      read_at: delivery.read_ts,
    };
  }

  // ============================================================================
  // Resource Helpers
  // ============================================================================

  private getInboxFor(
    projectKey: string,
    agentName: string,
    limit: number,
    includeBodies: boolean,
  ): { project: string; agent: string; count: number; messages: TestMessage[] } {
    const project = this.projects.get(projectKey);
    if (!project) {
      return { project: projectKey, agent: agentName, count: 0, messages: [] };
    }

    // Find all deliveries for this agent
    const agentDeliveries = this.deliveries.filter((d) => d.agent_name === agentName);
    const messageIds = new Set(agentDeliveries.map((d) => d.message_id));

    // Get corresponding messages
    let messages = this.messages
      .filter((m) => messageIds.has(m.id) && m.project_id === project.id)
      .slice(-limit)
      .reverse();

    if (!includeBodies) {
      messages = messages.map((m) => ({ ...m, body_md: "" }));
    }

    return {
      project: projectKey,
      agent: agentName,
      count: messages.length,
      messages,
    };
  }

  private getThread(
    projectKey: string,
    threadId: string,
    includeBodies: boolean,
  ): { project: string; thread_id: string; messages: TestMessage[] } {
    const project = this.projects.get(projectKey);
    if (!project) {
      return { project: projectKey, thread_id: threadId, messages: [] };
    }

    let messages = this.messages.filter(
      (m) => m.project_id === project.id && m.thread_id === threadId,
    );

    if (!includeBodies) {
      messages = messages.map((m) => ({ ...m, body_md: "" }));
    }

    return {
      project: projectKey,
      thread_id: threadId,
      messages,
    };
  }

  private generateAgentName(): string {
    const adjectives = ["Blue", "Green", "Red", "Purple", "Orange", "Silver", "Golden", "Crimson"];
    const nouns = ["Lake", "Mountain", "Forest", "River", "Castle", "Valley", "Meadow", "Storm"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}`;
  }

  // ============================================================================
  // Inspection Methods (for test assertions)
  // ============================================================================

  getMessagesTo(agentName: string): TestMessage[] {
    const deliveries = this.deliveries.filter((d) => d.agent_name === agentName);
    const messageIds = new Set(deliveries.map((d) => d.message_id));
    return this.messages.filter((m) => messageIds.has(m.id));
  }

  getMessagesSentBy(agentName: string): TestMessage[] {
    return this.messages.filter((m) => m.from === agentName);
  }

  getMessagesInThread(threadId: string): TestMessage[] {
    return this.messages.filter((m) => m.thread_id === threadId);
  }

  getRegisteredAgents(): TestAgent[] {
    return Array.from(this.agents.values());
  }

  getRegisteredProjects(): TestProject[] {
    return Array.from(this.projects.values());
  }

  getProject(humanKey: string): TestProject | undefined {
    return this.projects.get(humanKey);
  }

  getProjectAgents(humanKey: string): TestAgent[] {
    const project = this.projects.get(humanKey);
    if (!project) return [];
    return Array.from(this.agents.values()).filter((a) => a.project_id === project.id);
  }

  getAllMessages(): TestMessage[] {
    return [...this.messages];
  }

  getAllDeliveries(): TestDelivery[] {
    return [...this.deliveries];
  }

  // ============================================================================
  // Resource Helpers
  // ============================================================================

  private getAgentDirectory(projectSlug: string): {
    project: { slug: string; human_key: string | null };
    agents: Array<{ name: string; unread_count: number }>;
  } {
    const project = Array.from(this.projects.values()).find((p) => p.slug === projectSlug);
    if (!project) {
      return { project: { slug: projectSlug, human_key: null }, agents: [] };
    }

    const agents = Array.from(this.agents.values())
      .filter((a) => a.project_id === project.id)
      .map((a) => {
        const unreadCount = this.deliveries.filter(
          (d) => d.agent_id === a.id && d.read_ts === null,
        ).length;
        return { name: a.name, unread_count: unreadCount };
      });

    return {
      project: { slug: project.slug, human_key: project.human_key },
      agents,
    };
  }

  /**
   * Seed a thread with pre-defined messages for testing.
   * Creates project and agents as needed.
   */
  seedThread(options: {
    projectKey: string;
    threadId: string;
    messages: Array<{
      from: string;
      to?: string[];
      subject: string;
      body_md: string;
      created_ts?: string;
    }>;
  }): void {
    const { projectKey, threadId, messages } = options;

    // Ensure project exists
    if (!this.projects.has(projectKey)) {
      this.ensureProject({ human_key: projectKey });
    }

    for (const msg of messages) {
      // Register sender if not exists
      const senderKey = `${projectKey}:${msg.from}`;
      if (!this.agents.has(senderKey)) {
        this.registerAgent({
          project_key: projectKey,
          program: "seed",
          model: "test",
          name: msg.from,
        });
      }

      // Send the message
      this.sendMessage({
        project_key: projectKey,
        sender_name: msg.from,
        to: msg.to || [],
        subject: msg.subject,
        body_md: msg.body_md,
        thread_id: threadId,
      });

      // Override the created_ts if provided
      if (msg.created_ts) {
        const lastMessage = this.messages[this.messages.length - 1];
        lastMessage.created_ts = msg.created_ts;
      }
    }
  }

  // For simulating error conditions
  private errorMode: { enabled: boolean; code: number; message: string } = {
    enabled: false,
    code: -32603,
    message: "Simulated error",
  };

  enableErrorMode(code: number, message: string): void {
    this.errorMode = { enabled: true, code, message };
  }

  disableErrorMode(): void {
    this.errorMode = { enabled: false, code: -32603, message: "Simulated error" };
  }
}
