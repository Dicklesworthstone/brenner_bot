import { normalizeSystemError, nowMs, trackSystemEvent, trackSystemLatency } from "./analytics";
import type { JsonValue } from "./json";

export type AgentMailConfig = {
  baseUrl: string;
  path: string;
  bearerToken?: string;
};

export type AgentMailImportance = "normal" | "high" | "urgent";

export type AgentMailCommitInfo = {
  hexsha: string;
  summary: string;
  authored_ts: string;
  insertions: number;
  deletions: number;
  diff_summary?: {
    hunks: number;
    excerpt?: string[];
  };
};

export type AgentMailMessage = {
  id: number;
  project_id?: number;
  sender_id?: number;
  reply_to?: number;
  thread_id: string | null;
  subject: string;
  importance?: AgentMailImportance;
  ack_required?: boolean;
  created_ts: string;
  attachments?: unknown[];
  body_md?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  kind?: "to" | "cc" | "bcc" | "from" | string;
  commit?: AgentMailCommitInfo | null;
};

export type AgentMailInbox = {
  project: string;
  agent: string;
  count: number;
  messages: AgentMailMessage[];
};

export type AgentMailThread = {
  project: string;
  thread_id: string;
  messages: AgentMailMessage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonRpcEnvelope(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (value.jsonrpc !== "2.0") return false;
  return "result" in value || "error" in value;
}

async function readJsonRpcEnvelopeFromSse(res: Response): Promise<unknown> {
  const reader = res.body?.getReader();

  const parseEventData = (eventData: string): unknown | null => {
    const trimmed = eventData.trim();
    if (!trimmed || trimmed === "[DONE]") return null;

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return isJsonRpcEnvelope(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  if (!reader) {
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    let dataLines: string[] = [];
    let lastDataSnippet = "";

    for (const line of lines) {
      if (line === "") {
        const eventData = dataLines.join("\n");
        dataLines = [];
        lastDataSnippet = eventData.slice(0, 400);
        const parsed = parseEventData(eventData);
        if (parsed) return parsed;
        continue;
      }

      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }

    const finalEventData = dataLines.join("\n");
    lastDataSnippet = finalEventData.slice(0, 400);
    const finalParsed = parseEventData(finalEventData);
    if (finalParsed) return finalParsed;

    throw new Error(`Agent Mail SSE response missing JSON-RPC payload: ${lastDataSnippet}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];
  let lastDataSnippet = "";

  const finalizeEvent = (): unknown | null => {
    const eventData = dataLines.join("\n");
    dataLines = [];
    lastDataSnippet = eventData.slice(0, 400);
    return parseEventData(eventData);
  };

  try {
    // oxlint-disable-next-line no-await-in-loop -- Intentional streaming read loop
    while (true) {
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
          if (parsed) {
            try {
              await reader.cancel();
            } catch {}
            return parsed;
          }
          continue;
        }

        if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
    }
  } finally {
    buffer += decoder.decode();
  }

  if (buffer) {
    for (const line of buffer.split(/\r?\n/)) {
      if (line === "") {
        const parsed = finalizeEvent();
        if (parsed) return parsed;
        continue;
      }
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
  }

  const finalParsed = finalizeEvent();
  if (finalParsed) return finalParsed;

  throw new Error(`Agent Mail SSE response missing JSON-RPC payload: ${lastDataSnippet}`);
}

function readFirstResourceText(result: JsonValue): string {
  if (!isRecord(result))
    throw new Error(`Agent Mail malformed resources/read response: ${JSON.stringify(result)}`);

  const contents = result.contents;
  if (!Array.isArray(contents) || contents.length === 0) {
    throw new Error(
      `Agent Mail resources/read response missing contents: ${JSON.stringify(result)}`,
    );
  }

  const first = contents[0];
  if (!isRecord(first) || typeof first.text !== "string") {
    throw new Error(
      `Agent Mail resources/read response missing first.text: ${JSON.stringify(result)}`,
    );
  }

  return first.text;
}

function parseResourceJson<T>(result: JsonValue): T {
  const text = readFirstResourceText(result);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Agent Mail resources/read returned non-JSON text: ${text.slice(0, 400)}`);
  }
}

export class AgentMailClient {
  private readonly config: AgentMailConfig;

  constructor(config?: Partial<AgentMailConfig>) {
    const baseUrl = (
      config?.baseUrl ??
      process.env.AGENT_MAIL_BASE_URL ??
      "http://127.0.0.1:8765"
    ).replace(/\/+$/, "");
    const rawPath = config?.path ?? process.env.AGENT_MAIL_PATH ?? "/mcp/";
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    const bearerToken = config?.bearerToken ?? process.env.AGENT_MAIL_BEARER_TOKEN;
    this.config = { baseUrl, path, bearerToken };
  }

  private endpoint(): string {
    const p = this.config.path.endsWith("/") ? this.config.path : `${this.config.path}/`;
    return `${this.config.baseUrl}${p}`;
  }

  async call(method: string, params?: JsonValue): Promise<JsonValue> {
    const id = crypto.randomUUID();
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} });
    const start = typeof window === "undefined" ? null : nowMs();
    let status: number | null = null;
    let errorInfo: ReturnType<typeof normalizeSystemError> | null = null;

    const headers: Record<string, string> = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    };
    if (this.config.bearerToken) headers.Authorization = `Bearer ${this.config.bearerToken}`;

    try {
      const res = await fetch(this.endpoint(), { method: "POST", headers, body });
      status = res.status;
      const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";

      let data: unknown;
      if (contentType.includes("text/event-stream")) {
        data = await readJsonRpcEnvelopeFromSse(res);
      } else {
        const text = await res.text();
        try {
          data = text ? (JSON.parse(text) as unknown) : undefined;
        } catch {
          throw new Error(
            `Agent Mail non-JSON response (HTTP ${res.status}): ${text.slice(0, 400)}`,
          );
        }
      }

      if (!res.ok) throw new Error(`Agent Mail HTTP ${res.status}: ${JSON.stringify(data)}`);
      if (!isRecord(data)) throw new Error(`Agent Mail malformed JSON: ${JSON.stringify(data)}`);
      if ("error" in data && data.error)
        throw new Error(`Agent Mail MCP error: ${JSON.stringify(data.error)}`);
      return ("result" in data ? (data.result as JsonValue) : null) satisfies JsonValue;
    } catch (err) {
      errorInfo = normalizeSystemError(err);
      trackSystemEvent("agent_mail_error", {
        method,
        status_code: status ?? undefined,
        ...errorInfo,
      });
      throw err;
    } finally {
      if (start !== null) {
        const durationMs = Math.max(0, Math.round(nowMs() - start));
        trackSystemLatency("agent_mail_call", durationMs, {
          method,
          status_code: status ?? undefined,
          success: !errorInfo,
        });
      }
    }
  }

  toolsList(): Promise<JsonValue> {
    return this.call("tools/list", {});
  }

  toolsCall(name: string, args: Record<string, JsonValue>): Promise<JsonValue> {
    return this.call("tools/call", { name, arguments: args });
  }

  resourcesRead(uri: string): Promise<JsonValue> {
    return this.call("resources/read", { uri });
  }

  private unwrapResult<T>(result: JsonValue): T {
    if (result && typeof result === "object" && "structuredContent" in result) {
      return (result as Record<string, unknown>).structuredContent as T;
    }
    return result as T;
  }

  private resourceUri(
    path: string,
    query?: Record<string, string | number | boolean | null | undefined>,
  ): string {
    const url = new URL(`resource://${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async readInbox(args: {
    projectKey: string;
    agentName: string;
    limit?: number;
    urgentOnly?: boolean;
    includeBodies?: boolean;
    sinceTs?: string;
  }): Promise<AgentMailInbox> {
    const uri = this.resourceUri(`inbox/${args.agentName}`, {
      project: args.projectKey,
      limit: args.limit ?? 20,
      urgent_only: args.urgentOnly ?? false,
      include_bodies: args.includeBodies ?? false,
      since_ts: args.sinceTs,
    });
    const result = await this.resourcesRead(uri);
    return parseResourceJson<AgentMailInbox>(result);
  }

  async readThread(args: {
    projectKey: string;
    threadId: string;
    includeBodies?: boolean;
  }): Promise<AgentMailThread> {
    const uri = this.resourceUri(`thread/${args.threadId}`, {
      project: args.projectKey,
      include_bodies: args.includeBodies ?? false,
    });
    const result = await this.resourcesRead(uri);
    return parseResourceJson<AgentMailThread>(result);
  }

  async markMessageRead(args: {
    projectKey: string;
    agentName: string;
    messageId: number;
  }): Promise<JsonValue> {
    const result = await this.toolsCall("mark_message_read", {
      project_key: args.projectKey,
      agent_name: args.agentName,
      message_id: args.messageId,
    });
    return this.unwrapResult(result);
  }

  async acknowledgeMessage(args: {
    projectKey: string;
    agentName: string;
    messageId: number;
  }): Promise<JsonValue> {
    const result = await this.toolsCall("acknowledge_message", {
      project_key: args.projectKey,
      agent_name: args.agentName,
      message_id: args.messageId,
    });
    return this.unwrapResult(result);
  }

  // ============================================================================
  // Project & Agent Management
  // ============================================================================

  /**
   * Ensure a project exists for the given human key (absolute path).
   * Safe to call multiple times - idempotent.
   */
  async ensureProject(args: { humanKey: string }): Promise<AgentMailProject> {
    const result = await this.toolsCall("ensure_project", {
      human_key: args.humanKey,
    });
    return this.unwrapResult<AgentMailProject>(result);
  }

  /**
   * Register or update an agent identity within a project.
   * Agent names should be adjective+noun combinations (e.g., "BlueLake").
   */
  async registerAgent(args: {
    projectKey: string;
    program: string;
    model: string;
    name?: string;
    taskDescription?: string;
  }): Promise<AgentMailAgent> {
    const result = await this.toolsCall("register_agent", {
      project_key: args.projectKey,
      program: args.program,
      model: args.model,
      ...(args.name && { name: args.name }),
      ...(args.taskDescription && { task_description: args.taskDescription }),
    });
    return this.unwrapResult<AgentMailAgent>(result);
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Send a message to one or more recipients.
   */
  async sendMessage(args: {
    projectKey: string;
    senderName: string;
    to: string[];
    subject: string;
    bodyMd: string;
    cc?: string[];
    bcc?: string[];
    threadId?: string;
    importance?: AgentMailImportance;
    ackRequired?: boolean;
  }): Promise<AgentMailSendResult> {
    const result = await this.toolsCall("send_message", {
      project_key: args.projectKey,
      sender_name: args.senderName,
      to: args.to,
      subject: args.subject,
      body_md: args.bodyMd,
      ...(args.cc && { cc: args.cc }),
      ...(args.bcc && { bcc: args.bcc }),
      ...(args.threadId && { thread_id: args.threadId }),
      ...(args.importance && { importance: args.importance }),
      ...(args.ackRequired !== undefined && { ack_required: args.ackRequired }),
    });
    return this.unwrapResult<AgentMailSendResult>(result);
  }

  /**
   * Reply to an existing message, preserving the thread.
   */
  async replyMessage(args: {
    projectKey: string;
    messageId: number;
    senderName: string;
    bodyMd: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
  }): Promise<AgentMailSendResult> {
    const result = await this.toolsCall("reply_message", {
      project_key: args.projectKey,
      message_id: args.messageId,
      sender_name: args.senderName,
      body_md: args.bodyMd,
      ...(args.to && { to: args.to }),
      ...(args.cc && { cc: args.cc }),
      ...(args.bcc && { bcc: args.bcc }),
    });
    return this.unwrapResult<AgentMailSendResult>(result);
  }

  /**
   * Fetch inbox using the tools/call endpoint (alternative to resource read).
   * Note: The call() method already unwraps the JSON-RPC response, so the result
   * is the tool output directly (an array of messages).
   */
  async fetchInbox(args: {
    projectKey: string;
    agentName: string;
    limit?: number;
    urgentOnly?: boolean;
    includeBodies?: boolean;
    sinceTs?: string;
  }): Promise<AgentMailMessage[]> {
    const result = await this.toolsCall("fetch_inbox", {
      project_key: args.projectKey,
      agent_name: args.agentName,
      limit: args.limit ?? 20,
      urgent_only: args.urgentOnly ?? false,
      include_bodies: args.includeBodies ?? false,
      ...(args.sinceTs && { since_ts: args.sinceTs }),
    });
    // The call() method already extracts the JSON-RPC result field,
    // so we receive the tool output directly
    return this.unwrapResult<AgentMailMessage[]>(result);
  }

  /**
   * Search messages using full-text search.
   */
  async searchMessages(args: {
    projectKey: string;
    query: string;
    limit?: number;
  }): Promise<AgentMailMessage[]> {
    const result = await this.toolsCall("search_messages", {
      project_key: args.projectKey,
      query: args.query,
      limit: args.limit ?? 20,
    });
    return this.unwrapResult<AgentMailMessage[]>(result);
  }

  /**
   * Get thread summary with participants, key points, and action items.
   */
  async summarizeThread(args: {
    projectKey: string;
    threadId: string;
    includeExamples?: boolean;
  }): Promise<AgentMailThreadSummary> {
    const result = await this.toolsCall("summarize_thread", {
      project_key: args.projectKey,
      thread_id: args.threadId,
      include_examples: args.includeExamples ?? false,
    });
    return this.unwrapResult<AgentMailThreadSummary>(result);
  }

  /**
   * Start a session with project+agent registration and inbox fetch.
   * Convenience macro for initialization.
   */
  async startSession(args: {
    humanKey: string;
    program: string;
    model: string;
    agentName?: string;
    taskDescription?: string;
    inboxLimit?: number;
  }): Promise<AgentMailSessionStart> {
    const result = await this.toolsCall("macro_start_session", {
      human_key: args.humanKey,
      program: args.program,
      model: args.model,
      ...(args.agentName && { agent_name: args.agentName }),
      ...(args.taskDescription && { task_description: args.taskDescription }),
      inbox_limit: args.inboxLimit ?? 10,
    });
    return this.unwrapResult<AgentMailSessionStart>(result);
  }
}

// ============================================================================
// Additional Types
// ============================================================================

export type AgentMailProject = {
  id: number;
  slug: string;
  human_key: string;
  created_at: string;
};

export type AgentMailAgent = {
  id: number;
  name: string;
  program: string;
  model: string;
  task_description: string;
  inception_ts: string;
  last_active_ts: string;
  project_id: number;
};

export type AgentMailSendResult = {
  deliveries: Array<{
    project: string;
    payload: AgentMailMessage;
  }>;
  count: number;
};

export type AgentMailThreadSummary = {
  thread_id: string;
  summary: {
    participants: string[];
    key_points: string[];
    action_items: string[];
  };
  examples?: AgentMailMessage[];
};

export type AgentMailSessionStart = {
  project: AgentMailProject;
  agent: AgentMailAgent;
  inbox: AgentMailMessage[];
};
