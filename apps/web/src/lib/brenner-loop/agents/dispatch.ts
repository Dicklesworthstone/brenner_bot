/**
 * Agent Dispatch Module
 *
 * Implements the agent dispatch system for the Brenner Loop tribunal.
 * Agents are dispatched via Agent Mail to analyze hypotheses and provide
 * multi-perspective feedback.
 *
 * @module brenner-loop/agents/dispatch
 * @see brenner_bot-xlk2.2 (Implement Agent Dispatch via Agent Mail)
 */

import type { AgentMailClient, AgentMailMessage } from "../../agentMail";
import type { HypothesisCard } from "../hypothesis";
import type {
  ExclusionTestResult,
  LevelSplitResult,
  ObjectTransposeResult,
  ScaleCheckResult,
} from "../types";
import { buildSystemPromptContext, getPersona } from "./agent-personas";
// NOTE: Import directly from agent-personas to avoid circular dependency with index.ts
// (index.ts re-exports from both agent-personas.ts and dispatch.ts)
import type { TribunalAgentRole } from "./index";

// ============================================================================
// Types
// ============================================================================

/**
 * Status of an agent task
 */
export type AgentTaskStatus =
  | "pending" // Not yet dispatched
  | "dispatched" // Message sent, awaiting response
  | "received" // Response received
  | "error"; // Error occurred

/**
 * A task representing a single agent's involvement
 */
export interface AgentTask {
  /** The agent's role */
  role: TribunalAgentRole;

  /** Current status */
  status: AgentTaskStatus;

  /** Agent Mail message ID for the dispatch */
  messageId?: number;

  /** All Agent Mail message IDs if sent to multiple recipients */
  messageIds?: number[];

  /** When the task was dispatched */
  dispatchedAt?: string;

  /** The agent's response (if received) */
  response?: TribunalAgentResponse;

  /** Error message if status is "error" */
  error?: string;
}

/**
 * A response from a tribunal agent
 */
export interface TribunalAgentResponse {
  /** The agent's role */
  role: TribunalAgentRole;

  /** Response content (markdown) */
  content: string;

  /** When the response was received */
  receivedAt: string;

  /** Agent Mail message ID */
  messageId: number;

  /** The responding agent's name */
  agentName?: string;
}

/**
 * Operator results collected for context
 */
export interface OperatorResults {
  levelSplit?: LevelSplitResult[];
  exclusionTest?: ExclusionTestResult[];
  objectTranspose?: ObjectTransposeResult[];
  scaleCheck?: ScaleCheckResult[];
}

/**
 * The full dispatch state for a tribunal session
 */
export interface AgentDispatch {
  /** Session ID this dispatch belongs to */
  sessionId: string;

  /** Agent Mail thread ID for this tribunal */
  threadId: string;

  /** The hypothesis being analyzed */
  hypothesis: HypothesisCard;

  /** Operator results for context */
  operatorResults: OperatorResults;

  /** Tasks for each agent role */
  tasks: AgentTask[];

  /** All responses collected */
  responses: TribunalAgentResponse[];

  /** Timestamp when dispatch was created */
  createdAt: string;

  /** Whether the tribunal is complete */
  complete: boolean;
}

/**
 * Configuration for creating a new dispatch
 */
export interface CreateDispatchOptions {
  /** Session ID */
  sessionId: string;

  /** Hypothesis to analyze */
  hypothesis: HypothesisCard;

  /** Operator results for context */
  operatorResults?: OperatorResults;

  /** Agent Mail project key (absolute path) */
  projectKey: string;

  /** Sender agent name for dispatches */
  senderName: string;

  /** Which roles to dispatch to (defaults to all except synthesis) */
  roles?: TribunalAgentRole[];
}

/**
 * Options for polling for responses
 */
export interface PollOptions {
  /** Agent Mail project key */
  projectKey: string;

  /** Agent name to check inbox for */
  agentName: string;

  /** Maximum number of messages to fetch */
  limit?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default roles to dispatch to (synthesis comes after others complete)
 */
export const DEFAULT_DISPATCH_ROLES: TribunalAgentRole[] = [
  "devils_advocate",
  "experiment_designer",
  "statistician",
  "brenner_channeler",
];

/**
 * Subject prefix for tribunal dispatch messages
 */
export const DISPATCH_SUBJECT_PREFIX = "TRIBUNAL[";

/**
 * Curated Brenner quotes for fallback when agents unavailable
 */
export const FALLBACK_BRENNER_QUOTES = [
  { quote: "You've got to really find out.", section: "§42" },
  {
    quote:
      "I've always tried to materialise the question in the form of: well, if it is like this, how would you go about doing anything about it?",
    section: "§66",
  },
  { quote: "Get the scale of everything right.", section: "§66" },
  { quote: "You've forgotten there's a third alternative. Both could be wrong.", section: "§103" },
  {
    quote:
      "The choice of the experimental object remains one of the most important things to do in biology.",
    section: "§91",
  },
  { quote: "Exclusion is always a tremendously good thing in science.", section: "§147" },
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a new agent dispatch for a tribunal session.
 * Initializes tasks for each role but does not send messages yet.
 */
export function createDispatch(options: CreateDispatchOptions): AgentDispatch {
  const roles = options.roles ?? DEFAULT_DISPATCH_ROLES;

  const tasks: AgentTask[] = roles.map((role) => ({
    role,
    status: "pending",
  }));

  return {
    sessionId: options.sessionId,
    threadId: "", // Will be set when first message is sent
    hypothesis: options.hypothesis,
    operatorResults: options.operatorResults ?? {},
    tasks,
    responses: [],
    createdAt: new Date().toISOString(),
    complete: false,
  };
}

/**
 * Generate a thread ID for a tribunal session
 */
export function generateThreadId(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  return `TRIBUNAL-${sessionId}-${timestamp}`;
}

/**
 * Format a hypothesis for inclusion in agent prompts
 */
export function formatHypothesisForPrompt(hypothesis: HypothesisCard): string {
  const lines: string[] = [
    "## Hypothesis Under Review",
    "",
    `**ID**: ${hypothesis.id}`,
    "",
    `**Statement**: ${hypothesis.statement}`,
    "",
    `**Mechanism**: ${hypothesis.mechanism}`,
    "",
    `**Domain**: ${hypothesis.domain.length > 0 ? hypothesis.domain.join(", ") : "Not specified"}`,
    "",
  ];

  if (hypothesis.impossibleIfTrue && hypothesis.impossibleIfTrue.length > 0) {
    lines.push("**Would Falsify**:");
    hypothesis.impossibleIfTrue.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (hypothesis.predictionsIfTrue && hypothesis.predictionsIfTrue.length > 0) {
    lines.push("**Predictions if True**:");
    hypothesis.predictionsIfTrue.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (hypothesis.predictionsIfFalse && hypothesis.predictionsIfFalse.length > 0) {
    lines.push("**Predictions if False**:");
    hypothesis.predictionsIfFalse.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (hypothesis.confounds && hypothesis.confounds.length > 0) {
    lines.push("**Identified Confounds**:");
    hypothesis.confounds.forEach((c) => {
      lines.push(`- ${c.name}: ${c.description}`);
    });
    lines.push("");
  }

  if (hypothesis.assumptions && hypothesis.assumptions.length > 0) {
    lines.push("**Explicit Assumptions**:");
    hypothesis.assumptions.forEach((a) => lines.push(`- ${a}`));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format operator results for inclusion in agent prompts
 */
export function formatOperatorResultsForPrompt(results: OperatorResults): string {
  const sections: string[] = [];

  if (results.levelSplit && results.levelSplit.length > 0) {
    sections.push("## Level Split Results (Σ)");
    results.levelSplit.forEach((r) => {
      sections.push(`- Applied at: ${r.appliedAt}`);
      if (r.conflationDetected) {
        sections.push(`- Conflation detected: ${r.conflationDescription ?? "Yes"}`);
      }
      r.levels.forEach((l) => {
        sections.push(`  - **${l.name}** (${l.levelType}): ${l.description}`);
      });
    });
    sections.push("");
  }

  if (results.exclusionTest && results.exclusionTest.length > 0) {
    sections.push("## Exclusion Test Results (⊘)");
    results.exclusionTest.forEach((r) => {
      r.designedTests.forEach((t) => {
        sections.push(`- **${t.name}**: ${t.procedure}`);
        sections.push(`  Could exclude: ${t.couldExclude.join(", ")}`);
      });
    });
    sections.push("");
  }

  if (results.objectTranspose && results.objectTranspose.length > 0) {
    sections.push("## Object Transpose Results (⟳)");
    results.objectTranspose.forEach((r) => {
      sections.push(`- Original system: ${r.originalSystem}`);
      if (r.selectedSystem) {
        sections.push(`- Selected alternative: ${r.selectedSystem}`);
        sections.push(`- Rationale: ${r.selectionRationale ?? "Not specified"}`);
      }
    });
    sections.push("");
  }

  if (results.scaleCheck && results.scaleCheck.length > 0) {
    sections.push("## Scale Check Results (⊙)");
    results.scaleCheck.forEach((r) => {
      sections.push(`- Plausible: ${r.plausible ? "Yes" : "No"}`);
      r.calculations.forEach((c) => {
        sections.push(`  - ${c.name}: ${c.result} ${c.units} → ${c.implication}`);
      });
      if (r.ruledOutByScale.length > 0) {
        sections.push(`- Ruled out by scale: ${r.ruledOutByScale.join(", ")}`);
      }
    });
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Build the full prompt body for an agent role
 */
export function buildAgentPrompt(
  role: TribunalAgentRole,
  hypothesis: HypothesisCard,
  operatorResults: OperatorResults,
): string {
  const persona = getPersona(role);
  const systemContext = buildSystemPromptContext(role);
  const hypothesisContext = formatHypothesisForPrompt(hypothesis);
  const operatorContext = formatOperatorResultsForPrompt(operatorResults);

  const parts: string[] = [
    "# Tribunal Analysis Request",
    "",
    systemContext,
    "",
    "---",
    "",
    hypothesisContext,
  ];

  if (operatorContext.trim()) {
    parts.push("---", "", operatorContext);
  }

  if (role === "brenner_channeler") {
    parts.push(
      "---",
      "",
      "## Brenner Quote Bank (citable transcript anchors)",
      "",
      ...FALLBACK_BRENNER_QUOTES.map((q) => `- ${q.quote} (${q.section})`),
      "",
      "## Citation Requirement",
      "",
      "- Include 2–4 transcript citations using the `§NN` anchor format.",
      "- Prefer citing from the quote bank above; if you cite beyond it, do not fabricate anchors.",
      "",
    );
  }

  parts.push(
    "---",
    "",
    "## Your Task",
    "",
    `As the ${persona.displayName}, please analyze this hypothesis according to your mandate.`,
    "",
    `${persona.corePurpose}`,
    "",
    "Provide your analysis in markdown format. Be specific and actionable.",
    "",
  );

  return parts.join("\n");
}

/**
 * Dispatch a single agent task via Agent Mail
 */
export async function dispatchAgentTask(
  client: AgentMailClient,
  dispatch: AgentDispatch,
  role: TribunalAgentRole,
  options: {
    projectKey: string;
    senderName: string;
    recipients: string[];
  },
): Promise<{ messageId: number; messageIds: number[] } | { error: string }> {
  const promptBody = buildAgentPrompt(role, dispatch.hypothesis, dispatch.operatorResults);

  const subject = `${DISPATCH_SUBJECT_PREFIX}${role}]: ${dispatch.hypothesis.id}`;

  try {
    const result = await client.sendMessage({
      projectKey: options.projectKey,
      senderName: options.senderName,
      to: options.recipients,
      subject,
      bodyMd: promptBody,
      threadId: dispatch.threadId || undefined,
      importance: "normal",
      ackRequired: false,
    });

    const deliveries = result.deliveries;
    const messageIds =
      deliveries
        ?.map((delivery) => delivery.payload?.id)
        .filter((id): id is number => typeof id === "number") ?? [];

    if (messageIds.length > 0) {
      return { messageId: messageIds[0], messageIds };
    }

    return { error: "Failed to extract message IDs from response" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Dispatch all pending tasks in a tribunal
 */
export async function dispatchAllTasks(
  client: AgentMailClient,
  dispatch: AgentDispatch,
  options: {
    projectKey: string;
    senderName: string;
    recipients: string[];
  },
): Promise<AgentDispatch> {
  // Generate thread ID if not set
  if (!dispatch.threadId) {
    dispatch = {
      ...dispatch,
      threadId: generateThreadId(dispatch.sessionId),
    };
  }

  const updatedTasks: AgentTask[] = [];

  for (const task of dispatch.tasks) {
    if (task.status !== "pending") {
      updatedTasks.push(task);
      continue;
    }

    const result = await dispatchAgentTask(client, dispatch, task.role, options);

    if ("messageId" in result) {
      updatedTasks.push({
        ...task,
        status: "dispatched",
        messageId: result.messageId,
        messageIds: result.messageIds,
        dispatchedAt: new Date().toISOString(),
      });
    } else {
      updatedTasks.push({
        ...task,
        status: "error",
        error: result.error,
      });
    }
  }

  return {
    ...dispatch,
    tasks: updatedTasks,
  };
}

/**
 * Check for responses to dispatched tasks
 */
export async function pollForResponses(
  client: AgentMailClient,
  dispatch: AgentDispatch,
  options: PollOptions,
): Promise<AgentDispatch> {
  if (!dispatch.threadId) {
    return dispatch;
  }

  try {
    const thread = await client.readThread({
      projectKey: options.projectKey,
      threadId: dispatch.threadId,
      includeBodies: true,
    });

    const newResponses: TribunalAgentResponse[] = [...dispatch.responses];
    const updatedTasks: AgentTask[] = [];

    const roleSet = new Set<TribunalAgentRole>(dispatch.tasks.map((t) => t.role));
    const messageIdToRole = new Map<number, TribunalAgentRole>();
    for (const task of dispatch.tasks) {
      if (typeof task.messageId === "number") {
        messageIdToRole.set(task.messageId, task.role);
      }
      if (Array.isArray(task.messageIds)) {
        for (const id of task.messageIds) {
          messageIdToRole.set(id, task.role);
        }
      }
    }

    const roleToResponseMessage = new Map<TribunalAgentRole, AgentMailMessage>();
    const usedMessageIds = new Set<number>();
    const dispatchMessageIds = new Set<number>();
    for (const task of dispatch.tasks) {
      if (typeof task.messageId === "number") dispatchMessageIds.add(task.messageId);
      if (Array.isArray(task.messageIds)) {
        for (const id of task.messageIds) dispatchMessageIds.add(id);
      }
    }

    const inferRoleFromSubject = (subject: string | undefined): TribunalAgentRole | null => {
      const subjectText = typeof subject === "string" ? subject : "";
      if (subjectText.length === 0) return null;

      const bracketMatch = subjectText.match(/\bTRIBUNAL\[([^\]]+)\]:/i);
      if (bracketMatch && bracketMatch[1]) {
        const token = bracketMatch[1].trim().toLowerCase().replace(/-/g, "_");
        if (roleSet.has(token as TribunalAgentRole)) {
          return token as TribunalAgentRole;
        }
      }

      const normalized = subjectText.toLowerCase();
      for (const role of roleSet) {
        if (normalized.includes(role.toLowerCase())) return role;
      }

      return null;
    };

    // Prefer newest messages (thread is typically chronological).
    for (const msg of [...thread.messages].reverse()) {
      if (!msg.body_md) continue;
      if (dispatchMessageIds.has(msg.id)) continue;
      if (usedMessageIds.has(msg.id)) continue;

      let role: TribunalAgentRole | null = null;

      if (typeof msg.reply_to === "number") {
        role = messageIdToRole.get(msg.reply_to) ?? null;
      }

      if (!role) {
        role = inferRoleFromSubject(msg.subject);
      }

      if (!role) continue;
      if (roleToResponseMessage.has(role)) continue;

      roleToResponseMessage.set(role, msg);
      usedMessageIds.add(msg.id);
    }

    const unresolvedRoles = dispatch.tasks
      .filter((task) => task.status === "dispatched" && !roleToResponseMessage.has(task.role))
      .map((task) => task.role);
    const unmatchedMessages = thread.messages.filter(
      (m): m is AgentMailMessage & { body_md: string } => {
        if (!m.body_md) return false;
        if (dispatchMessageIds.has(m.id)) return false;
        return inferRoleFromSubject(m.subject) === null && typeof m.reply_to !== "number";
      },
    );

    for (const task of dispatch.tasks) {
      if (task.status === "received" || task.status === "pending" || task.status === "error") {
        updatedTasks.push(task);
        continue;
      }

      const responseMessage = roleToResponseMessage.get(task.role) ?? null;

      if (!responseMessage || !responseMessage.body_md) {
        // If there's exactly one outstanding task, allow a single ambiguous reply.
        if (
          unresolvedRoles.length === 1 &&
          unresolvedRoles[0] === task.role &&
          unmatchedMessages.length === 1
        ) {
          const fallbackMsg = unmatchedMessages[0];
          const response: TribunalAgentResponse = {
            role: task.role,
            content: fallbackMsg.body_md,
            receivedAt: fallbackMsg.created_ts,
            messageId: fallbackMsg.id,
            agentName: fallbackMsg.from,
          };

          if (!newResponses.some((r) => r.messageId === response.messageId)) {
            newResponses.push(response);
          }

          updatedTasks.push({
            ...task,
            status: "received",
            response,
          });
          continue;
        }

        updatedTasks.push(task);
        continue;
      }

      const response: TribunalAgentResponse = {
        role: task.role,
        content: responseMessage.body_md,
        receivedAt: responseMessage.created_ts,
        messageId: responseMessage.id,
        agentName: responseMessage.from,
      };

      // Only add if not already in responses
      if (!newResponses.some((r) => r.messageId === response.messageId)) {
        newResponses.push(response);
      }

      updatedTasks.push({
        ...task,
        status: "received",
        response,
      });
    }

    // Check if all tasks are complete
    const allReceived = updatedTasks.every((t) => t.status === "received" || t.status === "error");

    return {
      ...dispatch,
      tasks: updatedTasks,
      responses: newResponses,
      complete: allReceived,
    };
  } catch (err) {
    // Polling failed, return unchanged
    console.error("Failed to poll for responses:", err);
    return dispatch;
  }
}

/**
 * Check if tribunal agents are available (any registered in project)
 */
export async function checkAgentAvailability(
  client: AgentMailClient,
  projectKey: string,
): Promise<{ available: boolean; agents: string[] }> {
  const parseAgents = (result: unknown): string[] | null => {
    if (!result || typeof result !== "object") return null;
    if (!("contents" in result)) return null;

    const contents = (result as { contents?: Array<{ text?: string }> }).contents;
    if (!contents || contents.length === 0 || !contents[0]?.text) return null;

    const data = JSON.parse(contents[0].text) as {
      agents?: Array<{ name: string; program: string }>;
    };

    return (
      data.agents
        ?.filter((a) => a.program !== "brenner-cli") // Exclude orchestrator agents
        .map((a) => a.name) ?? []
    );
  };

  const encodedProject = encodeURIComponent(projectKey);
  const candidateUris = [
    `resource://agents?project=${encodedProject}`,
    `resource://agents/${encodedProject}`,
    `resource://agents/${projectKey}`,
  ];

  for (const uri of candidateUris) {
    try {
      const result = await client.resourcesRead(uri);
      const agents = parseAgents(result);
      if (agents) {
        return { available: agents.length > 0, agents };
      }
    } catch {
      // Try the next URI pattern.
    }
  }

  return { available: false, agents: [] };
}

/**
 * Get fallback content when agents are unavailable.
 * Returns self-reflection questions and Brenner quotes to guide the user.
 *
 * @param hypothesis - Reserved for future use (could customize questions based on hypothesis)
 */
export function getFallbackContent(hypothesis: HypothesisCard): {
  status: "unavailable";
  quotes: typeof FALLBACK_BRENNER_QUOTES;
  selfReflectionQuestions: string[];
} {
  void hypothesis;
  const selfReflectionQuestions = [
    "What would it take to convince you that your hypothesis is wrong?",
    "What is the strongest alternative explanation you can think of?",
    "What hidden assumptions are you making?",
    "If both leading theories are wrong, what would that look like?",
    "What is the simplest experiment that could rule out your hypothesis?",
  ];

  return {
    status: "unavailable",
    quotes: FALLBACK_BRENNER_QUOTES,
    selfReflectionQuestions,
  };
}

/**
 * Get the completion status of a dispatch
 */
export function getDispatchStatus(dispatch: AgentDispatch): {
  pending: number;
  dispatched: number;
  received: number;
  errors: number;
  total: number;
  complete: boolean;
} {
  const counts = {
    pending: 0,
    dispatched: 0,
    received: 0,
    errors: 0,
    total: dispatch.tasks.length,
    complete: dispatch.complete,
  };

  for (const task of dispatch.tasks) {
    switch (task.status) {
      case "pending":
        counts.pending++;
        break;
      case "dispatched":
        counts.dispatched++;
        break;
      case "received":
        counts.received++;
        break;
      case "error":
        counts.errors++;
        break;
    }
  }

  return counts;
}
