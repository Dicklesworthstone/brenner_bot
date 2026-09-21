/**
 * Tribunal Objections
 *
 * Extracts objections raised by tribunal agents from their markdown responses.
 * Used by the Objection Register UI to track and resolve challenges.
 *
 * @module brenner-loop/agents/objections
 * @see brenner_bot-xlk2.6 (bead)
 */

import type { AgentMailMessage } from "../../agentMail";
import { isTribunalAgentRole, TRIBUNAL_AGENTS, type TribunalAgentRole } from "./index";

export const OBJECTION_REGISTER_UPDATED_EVENT = "brenner-objection-register-updated";

export type ObjectionType =
  | "alternative_explanation"
  | "reverse_causation"
  | "confound_identified"
  | "measurement_issue"
  | "selection_bias"
  | "logic_error"
  | "missing_evidence"
  | "effect_size_concern"
  | "generalization_problem"
  | "other";

export type ObjectionSeverity = "fatal" | "serious" | "moderate" | "minor";

export type ExtractedObjection = {
  id: string;
  type: ObjectionType;
  severity: ObjectionSeverity;
  summary: string;
  fullArgument: string;
  source: {
    messageId: number;
    agentName: string | null;
    role: TribunalAgentRole | null;
    createdAt: string;
    subject: string;
  };
};

function normalizeRoleToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function inferRoleFromSubject(subject: string | null | undefined): TribunalAgentRole | null {
  const subjectText = typeof subject === "string" ? subject : "";
  if (!subjectText) return null;

  const match = subjectText.match(/\bTRIBUNAL\[([^\]]+)\]:/i);
  if (match?.[1]) {
    const token = normalizeRoleToken(match[1]);
    return isTribunalAgentRole(token) ? token : null;
  }

  const normalized = normalizeRoleToken(subjectText);
  for (const role of Object.keys(TRIBUNAL_AGENTS) as TribunalAgentRole[]) {
    if (normalized.includes(role)) return role;
  }

  return null;
}

function looksLikeHeading(line: string): boolean {
  return /^#{1,6}\s+\S+/.test(line);
}

function isKeyObjectionHeading(line: string): boolean {
  return /^#{2,6}\s+key objection\b/i.test(line.trim());
}

function isFenceLine(line: string): boolean {
  return line.trimStart().startsWith("```");
}

function stripLeadingListMarker(line: string): string {
  return line.replace(/^\s*>+\s?/, "").replace(/^\s*(?:[-*]|\d+[.)])\s+/, "");
}

function collapseToSummary(markdown: string, maxChars = 220): string {
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");
  const firstMeaningfulLine =
    withoutCodeBlocks
      .split(/\r?\n/)
      .map((line) => stripLeadingListMarker(line.trim()))
      .find((line) => line.length > 0) ?? "";

  const collapsed = firstMeaningfulLine.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function classifyObjectionType(text: string): ObjectionType {
  const lower = text.toLowerCase();

  if (lower.includes("reverse causation") || lower.includes("could be the reverse")) {
    return "reverse_causation";
  }
  if (
    lower.includes("selection bias") ||
    lower.includes("self-selection") ||
    lower.includes("sampling bias")
  ) {
    return "selection_bias";
  }
  if (
    lower.includes("confound") ||
    lower.includes("confounding") ||
    lower.includes("third variable")
  ) {
    return "confound_identified";
  }
  if (lower.includes("measurement") || lower.includes("self-report") || lower.includes("proxy")) {
    return "measurement_issue";
  }
  if (lower.includes("effect size") || lower.includes("too small to matter")) {
    return "effect_size_concern";
  }
  if (lower.includes("generaliz") || lower.includes("external validity")) {
    return "generalization_problem";
  }
  if (
    lower.includes("no evidence") ||
    lower.includes("unsupported") ||
    lower.includes("needs evidence")
  ) {
    return "missing_evidence";
  }
  if (
    lower.includes("doesn't follow") ||
    lower.includes("non sequitur") ||
    /\blogic(?:al)?\b/.test(lower)
  ) {
    return "logic_error";
  }
  if (
    lower.includes("alternative explanation") ||
    lower.includes("another explanation") ||
    lower.includes("could instead")
  ) {
    return "alternative_explanation";
  }

  return "other";
}

function classifySeverity(text: string): ObjectionSeverity {
  const lower = text.toLowerCase();
  const deniesRuleOut = lower.includes("doesn't rule out") || lower.includes("does not rule out");

  if (
    lower.includes("fatal") ||
    lower.includes("deal-breaker") ||
    lower.includes("cannot be true") ||
    lower.includes("impossible") ||
    (!deniesRuleOut && lower.includes("rules out"))
  ) {
    return "fatal";
  }

  if (
    lower.includes("serious") ||
    lower.includes("major") ||
    lower.includes("fundamental") ||
    lower.includes("undermines") ||
    lower.includes("strong objection")
  ) {
    return "serious";
  }

  if (lower.includes("minor") || lower.includes("nit")) {
    return "minor";
  }

  return "moderate";
}

export function extractKeyObjectionBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];

  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (isFenceLine(line)) inFence = !inFence;
    if (inFence) continue;
    if (!isKeyObjectionHeading(line)) continue;

    const buffer: string[] = [];
    let j = i + 1;
    let blockInFence = false;
    while (j < lines.length) {
      const next = lines[j] ?? "";
      if (isFenceLine(next)) blockInFence = !blockInFence;
      if (!blockInFence && looksLikeHeading(next)) break;
      buffer.push(next);
      j += 1;
    }

    const joined = buffer.join("\n").trim();
    if (joined) blocks.push(joined);
    i = j - 1;
  }

  return blocks;
}

export function extractTribunalObjections(messages: AgentMailMessage[]): ExtractedObjection[] {
  const out: ExtractedObjection[] = [];

  for (const message of messages) {
    if (!message.body_md) continue;
    if (!/key objection/i.test(message.body_md)) continue;

    const blocks = extractKeyObjectionBlocks(message.body_md);
    if (blocks.length === 0) continue;

    const role = inferRoleFromSubject(message.subject);

    blocks.forEach((block, idx) => {
      const summary = collapseToSummary(block);
      const fullArgument = block.trim();
      if (!summary || !fullArgument) return;

      out.push({
        id: `${message.id}:${idx}`,
        type: classifyObjectionType(fullArgument),
        severity: classifySeverity(fullArgument),
        summary,
        fullArgument,
        source: {
          messageId: message.id,
          agentName: message.from ?? null,
          role,
          createdAt: message.created_ts,
          subject: message.subject,
        },
      });
    });
  }

  return out;
}
