import { isAbsolute, resolve, win32 } from "node:path";
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { AgentMailClient } from "@/lib/agentMail";
import { checkOrchestrationAuth } from "@/lib/auth";
import { composePrompt } from "@/lib/prompts";
import type { OperatorSelection } from "@/lib/schemas/session";
import { composeKickoffMessages, type AgentRole as SessionAgentRole } from "@/lib/session-kickoff";

export const runtime = "nodejs";

// ============================================================================
// Types
// ============================================================================

/** Single recipient-to-role mapping */
interface RecipientRole {
  agentName: string;
  role: SessionAgentRole;
}

interface SessionKickoffRequest {
  projectKey?: string;
  sender: string;
  recipients: string[];
  threadId: string;
  subject?: string;
  excerpt: string;
  theme?: string;
  domain?: string;
  question?: string;
  ackRequired?: boolean;
  /** Custom operator selection per role (from prompt builder UI) */
  operatorSelection?: OperatorSelection;
  /** Roster mode: role_separated (each agent gets role-specific prompt) or unified */
  rosterMode?: "role_separated" | "unified";
  /** Explicit roster entries mapping agents to roles */
  roster?: RecipientRole[];
}

interface SessionKickoffResponse {
  success: true;
  threadId: string;
  messageId?: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: "VALIDATION_ERROR" | "AUTH_ERROR" | "NETWORK_ERROR" | "SERVER_ERROR";
}

// ============================================================================
// Helpers
// ============================================================================

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
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

function normalizeKickoffSubject(threadId: string, rawSubject?: string): string {
  const subject = rawSubject?.trim();

  if (!subject) {
    return `KICKOFF: [${threadId}] Brenner Loop kickoff`;
  }

  return /^KICKOFF:/i.test(subject) ? subject : `KICKOFF: ${subject}`;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SessionKickoffResponse | ErrorResponse>> {
  // Auth check
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const authResult = checkOrchestrationAuth(reqHeaders, reqCookies);

  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: "Not found", code: "AUTH_ERROR" },
      { status: 404 },
    );
  }

  // Parse body
  let body: SessionKickoffRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Validate required fields
  const { sender, recipients, threadId, excerpt } = body;

  if (!sender?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing sender", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const cleanSender = sender.trim();

  if (!threadId?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing thread ID", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const cleanThreadId = threadId.trim();

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { success: false, error: "Missing recipients", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const normalizedRecipients = Array.from(
    new Set(
      recipients.map((r) => (typeof r === "string" ? r.trim() : "")).filter((r) => r.length > 0),
    ),
  );

  if (normalizedRecipients.length === 0) {
    return NextResponse.json(
      { success: false, error: "Missing recipients", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (!excerpt?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing transcript excerpt", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Compose and send
  try {
    const projectKeyResult = resolveProjectKey(body.projectKey);
    if (!projectKeyResult.ok) {
      return NextResponse.json(
        { success: false, error: projectKeyResult.error, code: projectKeyResult.code },
        { status: projectKeyResult.code === "VALIDATION_ERROR" ? 400 : 500 },
      );
    }
    const projectKey = projectKeyResult.projectKey;
    const client = new AgentMailClient();
    const subject = normalizeKickoffSubject(cleanThreadId, body.subject);

    // Check if using role-separated mode with explicit roster
    const useRoleSeparated =
      body.rosterMode === "role_separated" && body.roster && body.roster.length > 0;

    // Ensure project exists
    const ensured = await client.ensureProject({ humanKey: projectKey });
    if (!ensured.slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Agent Mail: could not resolve project slug",
          code: "NETWORK_ERROR",
        },
        { status: 502 },
      );
    }

    // Register sender agent
    await client.registerAgent({
      projectKey,
      program: "brenner-web",
      model: "nextjs",
      name: cleanSender,
      taskDescription: `Brenner Bot session: ${cleanThreadId}`,
    });

    let messageId: number | undefined;

    if (useRoleSeparated) {
      // Build recipientRoles mapping from roster
      const recipientRoles: Record<string, SessionAgentRole> = {};
      const roster = body.roster ?? [];
      for (const entry of roster) {
        recipientRoles[entry.agentName] = entry.role;
      }

      // Compose role-specific kickoff messages
      const kickoffMessages = composeKickoffMessages({
        threadId: cleanThreadId,
        researchQuestion: body.question?.trim() || "Analyze the provided transcript excerpt",
        context: body.theme?.trim() || body.domain?.trim() || "Brenner Protocol research session",
        excerpt: excerpt.trim(),
        recipients: normalizedRecipients,
        recipientRoles,
        operatorSelection: body.operatorSelection,
      });

      // Send role-specific message to each recipient
      for (const msg of kickoffMessages) {
        const result = await client.sendMessage({
          projectKey,
          senderName: cleanSender,
          to: [msg.to],
          subject: msg.subject,
          bodyMd: msg.body,
          threadId: cleanThreadId,
          ackRequired: Boolean(body.ackRequired),
        });

        // Capture first message ID
        if (messageId === undefined && result.deliveries.length > 0) {
          messageId = result.deliveries[0]?.payload.id;
        }
      }
    } else {
      const composedBody = await composePrompt({
        templatePathFromRepoRoot: "metaprompt_by_gpt_52.md",
        excerpt,
        theme: body.theme?.trim(),
        domain: body.domain?.trim(),
        question: body.question?.trim(),
        operatorSelection: body.operatorSelection,
      });

      // Unified mode: send same message to all recipients
      const result = await client.sendMessage({
        projectKey,
        senderName: cleanSender,
        to: normalizedRecipients,
        subject,
        bodyMd: composedBody,
        threadId: cleanThreadId,
        ackRequired: Boolean(body.ackRequired),
      });

      if (result.deliveries.length > 0) {
        messageId = result.deliveries[0]?.payload.id;
      }
    }

    return NextResponse.json({
      success: true,
      threadId: cleanThreadId,
      messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Distinguish between network errors and server errors
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return NextResponse.json(
        { success: false, error: `Agent Mail unreachable: ${message}`, code: "NETWORK_ERROR" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { success: false, error: message, code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
