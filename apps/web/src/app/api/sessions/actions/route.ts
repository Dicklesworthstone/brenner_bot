import { isAbsolute, resolve, win32 } from "node:path";
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { AgentMailClient, type AgentMailMessage } from "@/lib/agentMail";
import {
  createEmptyArtifact,
  lintArtifact,
  mergeArtifactWithTimestamps,
  renderArtifactMarkdown,
} from "@/lib/artifact-merge";
import { checkOrchestrationAuth } from "@/lib/auth";
import { parseDeltaMessage, type ValidDelta } from "@/lib/delta-parser";
import {
  extractVersion,
  getDeltaMessagesForCurrentRound,
  parseSubjectType,
} from "@/lib/threadStatus";

export const runtime = "nodejs";

// ============================================================================
// Types
// ============================================================================

type SessionAction = "compile" | "publish" | "request_critique" | "post_delta";

interface SessionActionRequest {
  action: SessionAction;
  projectKey?: string;
  threadId: string;
  sender?: string;
  recipients?: string[];
  subject?: string;
  bodyMd?: string;
  ackRequired?: boolean;
}

interface CompileResult {
  success: true;
  action: "compile";
  threadId: string;
  version: number;
  compiledAt: string;
  artifactMarkdown: string;
  lint: ReturnType<typeof lintArtifact>;
  merge: {
    applied: number;
    skipped: number;
    warnings: unknown[];
  };
  deltaStats: {
    /** Total DELTA messages across all rounds */
    deltaMessageCount: number;
    /** Total delta blocks parsed across all messages */
    totalBlocks: number;
    /** Valid delta blocks that were applied */
    validBlocks: number;
    /** Invalid delta blocks that were skipped */
    invalidBlocks: number;
    /** Number of DELTA messages in current round (since last COMPILED) */
    currentRoundDeltaCount: number;
  };
}

interface PublishResult {
  success: true;
  action: "publish";
  threadId: string;
  version: number;
  compiledAt: string;
  messageId?: number;
}

interface CritiqueRequestResult {
  success: true;
  action: "request_critique";
  threadId: string;
  version: number;
  messageId?: number;
}

interface PostDeltaResult {
  success: true;
  action: "post_delta";
  threadId: string;
  messageId?: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: "VALIDATION_ERROR" | "AUTH_ERROR" | "NETWORK_ERROR" | "MERGE_ERROR" | "SERVER_ERROR";
  details?: unknown;
}

// ============================================================================
// Helpers
// ============================================================================

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveProjectKey(
  rawProjectKey?: string,
):
  | { ok: true; projectKey: string }
  | { ok: false; error: string; code: "VALIDATION_ERROR" | "SERVER_ERROR" } {
  const fallback = process.env.BRENNER_PROJECT_KEY || repoRootFromWebCwd();
  const trimmed = rawProjectKey?.trim();
  const candidate = trimmed && trimmed.length > 0 ? trimmed : fallback;
  const isAbs = isAbsolute(candidate) || win32.isAbsolute(candidate);
  if (!isAbs) {
    return {
      ok: false,
      error: trimmed
        ? "Invalid projectKey: must be an absolute path"
        : "Server misconfigured: BRENNER_PROJECT_KEY must be absolute",
      code: trimmed ? "VALIDATION_ERROR" : "SERVER_ERROR",
    };
  }
  const isWindowsPath = win32.isAbsolute(candidate) && !candidate.startsWith("/");
  const projectKey = isWindowsPath ? win32.normalize(candidate) : resolve(candidate);
  return { ok: true, projectKey };
}

function parseEnsureProjectSlug(result: unknown): string | null {
  if (!isRecord(result)) return null;

  if (typeof result.slug === "string") {
    return result.slug;
  }

  const structuredContent = result.structuredContent;
  if (isRecord(structuredContent) && typeof structuredContent.slug === "string") {
    return structuredContent.slug;
  }

  const maybeContent = result.content;
  if (Array.isArray(maybeContent) && maybeContent.length > 0) {
    const first = maybeContent[0];
    const text = isRecord(first) && typeof first.text === "string" ? first.text : undefined;
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        return isRecord(parsed) && typeof parsed.slug === "string" ? parsed.slug : null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function extractMessageId(result: unknown): number | undefined {
  if (!isRecord(result)) return undefined;

  const directDeliveries = result.deliveries;
  if (Array.isArray(directDeliveries) && directDeliveries.length > 0) {
    const first = directDeliveries[0];
    if (isRecord(first)) {
      const payload = first.payload;
      if (isRecord(payload) && typeof payload.id === "number") {
        return payload.id;
      }
    }
  }

  const sc = result.structuredContent;
  if (isRecord(sc)) {
    const deliveries = sc.deliveries;
    if (Array.isArray(deliveries) && deliveries.length > 0) {
      const first = deliveries[0];
      if (isRecord(first)) {
        const payload = first.payload;
        if (isRecord(payload) && typeof payload.id === "number") {
          return payload.id;
        }
      }
    }
  }

  return undefined;
}

function normalizeRecipients(recipients: unknown): string[] | null {
  if (!Array.isArray(recipients) || recipients.length === 0) return null;

  const normalized = Array.from(
    new Set(
      recipients.map((r) => (typeof r === "string" ? r.trim() : "")).filter((r) => r.length > 0),
    ),
  );

  return normalized.length > 0 ? normalized : null;
}

function normalizeCompiledSubject(threadId: string, version: number, rawSubject?: string): string {
  const subject = rawSubject?.trim();
  const defaultSubject = `COMPILED: v${version} ${threadId} artifact`;
  if (!subject) return defaultSubject;
  return /^COMPILED:/i.test(subject) ? subject : `COMPILED: ${subject}`;
}

function critiqueRequestSubject(threadId: string, version: number): string {
  return `QUESTION: [${threadId}] Please critique v${version} artifact`;
}

function findKickoffCreatedAt(messages: AgentMailMessage[]): string | null {
  const kickoff = messages.find((m) => parseSubjectType(m.subject).type === "kickoff");
  return kickoff?.created_ts ?? null;
}

function computeNextCompiledVersion(messages: AgentMailMessage[]): number {
  const compiledMessages = messages.filter((m) => parseSubjectType(m.subject).type === "compiled");
  const versions = compiledMessages
    .map((m) => extractVersion(m.subject))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (versions.length > 0) return Math.max(...versions) + 1;
  if (compiledMessages.length > 0) return compiledMessages.length + 1;
  return 1;
}

function getLatestCompiled(messages: AgentMailMessage[]): AgentMailMessage | null {
  const compiledMessages = messages.filter((m) => parseSubjectType(m.subject).type === "compiled");
  if (compiledMessages.length === 0) return null;
  return (
    [...compiledMessages].sort((a, b) => a.created_ts.localeCompare(b.created_ts)).at(-1) ?? null
  );
}

async function compileThread(params: {
  projectKey: string;
  threadId: string;
}): Promise<
  | { ok: true; result: Omit<CompileResult, "success" | "action">; messages: AgentMailMessage[] }
  | { ok: false; response: ErrorResponse }
> {
  const { projectKey, threadId } = params;
  const client = new AgentMailClient();

  let threadMessages: AgentMailMessage[];
  try {
    const thread = await client.readThread({ projectKey, threadId, includeBodies: true });
    threadMessages = thread.messages ?? [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      message.includes("ECONNREFUSED") || message.includes("fetch failed")
        ? "NETWORK_ERROR"
        : "SERVER_ERROR";
    return {
      ok: false,
      response: { success: false, error: `Agent Mail thread fetch failed: ${message}`, code },
    };
  }

  const compiledAt = new Date().toISOString();
  const createdAt = findKickoffCreatedAt(threadMessages) ?? compiledAt;
  const version = computeNextCompiledVersion(threadMessages);

  // For a complete artifact, we process ALL deltas from all rounds.
  // This ensures the compiled artifact contains the full state, not just incremental changes.
  // (Incremental compilation on top of previous artifact would require complex artifact parsing.)
  const allDeltaMessages = threadMessages.filter(
    (m) => parseSubjectType(m.subject).type === "delta" && typeof m.body_md === "string",
  );

  // For stats, we also track current round deltas separately.
  const currentRoundDeltas = getDeltaMessagesForCurrentRound(threadMessages);
  const currentRoundDeltaMessages = currentRoundDeltas.filter((m) => typeof m.body_md === "string");

  // Use all deltas for compilation
  const deltaMessages = allDeltaMessages;

  const collected: Array<ValidDelta & { timestamp: string; agent: string }> = [];
  const deltaFenceErrors: Array<{
    messageId: number;
    from: string;
    subject: string;
    createdAt: string;
    bodyPreview: string;
  }> = [];
  let totalBlocks = 0;
  let validBlocks = 0;
  let invalidBlocks = 0;

  for (const message of deltaMessages) {
    const body = message.body_md ?? "";
    const parsed = parseDeltaMessage(body);

    if (parsed.totalBlocks === 0) {
      const agent = message.from?.trim() || "unknown";
      deltaFenceErrors.push({
        messageId: message.id,
        from: agent,
        subject: message.subject,
        createdAt: message.created_ts,
        bodyPreview: body.trim().slice(0, 240),
      });
      continue;
    }

    totalBlocks += parsed.totalBlocks;
    validBlocks += parsed.validCount;
    invalidBlocks += parsed.invalidCount;

    const agent = message.from?.trim() || "unknown";
    const timestamp = message.created_ts;
    for (const delta of parsed.deltas) {
      if (!delta.valid) continue;
      collected.push({ ...delta, timestamp, agent });
    }
  }

  if (deltaFenceErrors.length > 0) {
    return {
      ok: false,
      response: {
        success: false,
        code: "VALIDATION_ERROR",
        error:
          "Found DELTA messages with no parseable delta blocks. " +
          "Resend the message using fenced ```delta blocks (see specs/delta_output_format_v0.1.md).",
        details: {
          count: deltaFenceErrors.length,
          messages: deltaFenceErrors,
          remediation_template: [
            "```delta",
            "{",
            '  "operation": "ADD",',
            '  "section": "hypothesis_slate",',
            '  "target_id": null,',
            '  "payload": { "id": "H1", "name": "…", "claim": "…", "mechanism": "…", "anchors": ["inference"] },',
            '  "rationale": "…"',
            "}",
            "```",
          ].join("\n"),
        },
      },
    };
  }

  const base = createEmptyArtifact(threadId);
  base.metadata.created_at = createdAt;
  base.metadata.updated_at = createdAt;

  const merge = mergeArtifactWithTimestamps(base, collected);
  if (!merge.ok) {
    return {
      ok: false,
      response: {
        success: false,
        error: "Artifact merge failed (blocking publish)",
        code: "MERGE_ERROR",
        details: { errors: merge.errors, warnings: merge.warnings },
      },
    };
  }

  const artifact = merge.artifact;
  artifact.metadata.version = version;
  artifact.metadata.updated_at = compiledAt;
  artifact.metadata.status = "active";

  const artifactMarkdown = renderArtifactMarkdown(artifact);
  const lint = lintArtifact(artifact);

  return {
    ok: true,
    result: {
      threadId,
      version,
      compiledAt,
      artifactMarkdown,
      lint,
      merge: {
        applied: merge.applied_count,
        skipped: merge.skipped_count,
        warnings: merge.warnings,
      },
      deltaStats: {
        deltaMessageCount: deltaMessages.length,
        totalBlocks,
        validBlocks,
        invalidBlocks,
        currentRoundDeltaCount: currentRoundDeltaMessages.length,
      },
    },
    messages: threadMessages,
  };
}

async function ensureProjectAndRegisterSender(args: {
  client: AgentMailClient;
  projectKey: string;
  sender: string;
  taskDescription: string;
}): Promise<ErrorResponse | null> {
  const { client, projectKey, sender, taskDescription } = args;

  const ensured = await client.toolsCall("ensure_project", { human_key: projectKey });
  const ensuredSlug = parseEnsureProjectSlug(ensured);
  if (!ensuredSlug) {
    return {
      success: false,
      error: "Agent Mail: could not resolve project slug",
      code: "NETWORK_ERROR",
    };
  }

  await client.toolsCall("register_agent", {
    project_key: projectKey,
    name: sender,
    program: "brenner-web",
    model: "nextjs",
    task_description: taskDescription,
  });

  return null;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    CompileResult | PublishResult | CritiqueRequestResult | PostDeltaResult | ErrorResponse
  >
> {
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const authResult = checkOrchestrationAuth(reqHeaders, reqCookies);

  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: "Not found", code: "AUTH_ERROR" },
      { status: 404 },
    );
  }

  let body: SessionActionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const action = body.action;
  if (
    action !== "compile" &&
    action !== "publish" &&
    action !== "request_critique" &&
    action !== "post_delta"
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid action", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (!body.threadId?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing thread ID", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const threadId = body.threadId.trim();
  const projectKeyResult = resolveProjectKey(body.projectKey);
  if (!projectKeyResult.ok) {
    return NextResponse.json(
      { success: false, error: projectKeyResult.error, code: projectKeyResult.code },
      { status: projectKeyResult.code === "VALIDATION_ERROR" ? 400 : 500 },
    );
  }
  const projectKey = projectKeyResult.projectKey;

  if (action === "compile") {
    const compiled = await compileThread({ projectKey, threadId });
    if (!compiled.ok) {
      let status = 500;
      if (compiled.response.code === "VALIDATION_ERROR") {
        status = 400;
      } else if (compiled.response.code === "NETWORK_ERROR") {
        status = 502;
      } else if (compiled.response.code === "MERGE_ERROR") {
        status = 422;
      }
      return NextResponse.json(compiled.response, { status });
    }

    return NextResponse.json({ success: true, action: "compile", ...compiled.result });
  }

  if (action === "publish") {
    const sender = body.sender?.trim();
    if (!sender) {
      return NextResponse.json(
        { success: false, error: "Missing sender", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const recipients = normalizeRecipients(body.recipients);
    if (!recipients) {
      return NextResponse.json(
        { success: false, error: "Missing recipients", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const compiled = await compileThread({ projectKey, threadId });
    if (!compiled.ok) {
      let status = 500;
      if (compiled.response.code === "VALIDATION_ERROR") {
        status = 400;
      } else if (compiled.response.code === "NETWORK_ERROR") {
        status = 502;
      } else if (compiled.response.code === "MERGE_ERROR") {
        status = 422;
      }
      return NextResponse.json(compiled.response, { status });
    }

    try {
      const client = new AgentMailClient();

      const ensured = await ensureProjectAndRegisterSender({
        client,
        projectKey,
        sender,
        taskDescription: `Brenner Bot publish compiled artifact: ${threadId}`,
      });
      if (ensured) {
        return NextResponse.json(ensured, { status: 502 });
      }

      const subject = normalizeCompiledSubject(threadId, compiled.result.version, body.subject);
      const sendResult = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to: recipients,
        subject,
        body_md: compiled.result.artifactMarkdown,
        thread_id: threadId,
        ack_required: Boolean(body.ackRequired),
      });

      const messageId = extractMessageId(sendResult);
      return NextResponse.json({
        success: true,
        action: "publish",
        threadId,
        version: compiled.result.version,
        compiledAt: compiled.result.compiledAt,
        messageId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        message.includes("ECONNREFUSED") || message.includes("fetch failed")
          ? "NETWORK_ERROR"
          : "SERVER_ERROR";
      const status = code === "NETWORK_ERROR" ? 502 : 500;
      return NextResponse.json({ success: false, error: message, code }, { status });
    }
  }

  if (action === "post_delta") {
    const sender = body.sender?.trim();
    if (!sender) {
      return NextResponse.json(
        { success: false, error: "Missing sender", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const recipients = normalizeRecipients(body.recipients);
    if (!recipients) {
      return NextResponse.json(
        { success: false, error: "Missing recipients", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const rawSubject = body.subject?.trim() ?? "";
    const subject = /^DELTA\[[^\]]+\]:/i.test(rawSubject)
      ? rawSubject
      : rawSubject.length > 0
        ? `DELTA[human]: ${rawSubject}`
        : `DELTA[human]: [${threadId}] experiment deltas`;

    const bodyMd = body.bodyMd?.trim();
    if (!bodyMd) {
      return NextResponse.json(
        { success: false, error: "Missing bodyMd", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const hasDeltaFence =
      /```delta\s*\r?\n[\s\S]*?```/m.test(bodyMd) || /:::delta\s*\r?\n[\s\S]*?:::/m.test(bodyMd);
    if (!hasDeltaFence) {
      return NextResponse.json(
        {
          success: false,
          error: "bodyMd must include at least one ```delta or :::delta fenced block",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    try {
      const client = new AgentMailClient();

      const ensured = await ensureProjectAndRegisterSender({
        client,
        projectKey,
        sender,
        taskDescription: `Brenner Bot post delta message: ${threadId}`,
      });
      if (ensured) {
        return NextResponse.json(ensured, { status: 502 });
      }

      const sendResult = await client.toolsCall("send_message", {
        project_key: projectKey,
        sender_name: sender,
        to: recipients,
        subject,
        body_md: bodyMd,
        thread_id: threadId,
        ack_required: Boolean(body.ackRequired),
      });

      const messageId = extractMessageId(sendResult);
      return NextResponse.json({
        success: true,
        action: "post_delta",
        threadId,
        messageId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        message.includes("ECONNREFUSED") || message.includes("fetch failed")
          ? "NETWORK_ERROR"
          : "SERVER_ERROR";
      return NextResponse.json(
        { success: false, error: message, code },
        { status: code === "NETWORK_ERROR" ? 502 : 500 },
      );
    }
  }

  // request_critique
  const sender = body.sender?.trim();
  if (!sender) {
    return NextResponse.json(
      { success: false, error: "Missing sender", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const recipients = normalizeRecipients(body.recipients);
  if (!recipients) {
    return NextResponse.json(
      { success: false, error: "Missing recipients", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Read thread and require an existing compiled artifact to critique.
  const client = new AgentMailClient();
  let threadMessages: AgentMailMessage[];
  try {
    const thread = await client.readThread({ projectKey, threadId, includeBodies: true });
    threadMessages = thread.messages ?? [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      message.includes("ECONNREFUSED") || message.includes("fetch failed")
        ? "NETWORK_ERROR"
        : "SERVER_ERROR";
    return NextResponse.json(
      { success: false, error: `Agent Mail thread fetch failed: ${message}`, code },
      { status: code === "NETWORK_ERROR" ? 502 : 500 },
    );
  }

  const latestCompiled = getLatestCompiled(threadMessages);
  if (!latestCompiled?.body_md) {
    return NextResponse.json(
      {
        success: false,
        error: "No compiled artifact found yet. Publish a COMPILED message first.",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  const currentVersion =
    extractVersion(latestCompiled.subject) ??
    Math.max(
      1,
      threadMessages.filter((m) => parseSubjectType(m.subject).type === "compiled").length,
    );
  const subject = critiqueRequestSubject(threadId, currentVersion);

  const critiqueBody = [
    `# Critique Request (v${currentVersion})`,
    "",
    "Please read the latest compiled artifact and respond with one `CRITIQUE:` message per major attack.",
    "",
    "**Rules**:",
    "- Cite transcript anchors `(§n)` when invoking Brenner",
    "- Label reasoning as `[inference]`",
    "- If you propose fixes, use `DELTA[...]` subjects and include fenced `delta` blocks (see specs/delta_output_format_v0.1.md)",
    "",
    "## Current Compiled Artifact",
    "",
    latestCompiled.body_md.trimEnd(),
    "",
  ].join("\n");

  try {
    const ensured = await ensureProjectAndRegisterSender({
      client,
      projectKey,
      sender,
      taskDescription: `Brenner Bot critique request: ${threadId}`,
    });
    if (ensured) {
      return NextResponse.json(ensured, { status: 502 });
    }

    const sendResult = await client.toolsCall("send_message", {
      project_key: projectKey,
      sender_name: sender,
      to: recipients,
      subject,
      body_md: critiqueBody,
      thread_id: threadId,
      ack_required: Boolean(body.ackRequired),
    });

    const messageId = extractMessageId(sendResult);
    return NextResponse.json({
      success: true,
      action: "request_critique",
      threadId,
      version: currentVersion,
      messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      message.includes("ECONNREFUSED") || message.includes("fetch failed")
        ? "NETWORK_ERROR"
        : "SERVER_ERROR";
    return NextResponse.json(
      { success: false, error: message, code },
      { status: code === "NETWORK_ERROR" ? 502 : 500 },
    );
  }
}
