import { describe, expect, it, vi } from "vitest";

import type { AgentMailMessage, AgentMailThread } from "../../agentMail";
import { createHypothesisCard } from "../hypothesis";
import type { AgentDispatch } from "./dispatch";
import {
  buildAgentPrompt,
  createDispatch,
  FALLBACK_BRENNER_QUOTES,
  pollForResponses,
} from "./dispatch";

function buildDispatch(args: {
  threadId: string;
  roles: Array<"devils_advocate" | "experiment_designer">;
}): AgentDispatch {
  const hypothesis = createHypothesisCard({
    id: "HC-RS20260105-001-v1",
    statement: "Spaced repetition improves long-term retention.",
    mechanism: "Distributed practice increases memory consolidation.",
    predictionsIfTrue: ["Spaced group recalls more at 30 days."],
    impossibleIfTrue: ["No difference after controlling study time."],
  });

  const base = createDispatch({
    sessionId: "RS20260105",
    hypothesis,
    projectKey: "/data/projects/brenner_bot",
    senderName: "RoseRobin",
    roles: args.roles,
  });

  return {
    ...base,
    threadId: args.threadId,
    tasks: base.tasks.map((task, idx) => ({
      ...task,
      status: "dispatched",
      messageId: 100 + idx,
      dispatchedAt: new Date().toISOString(),
    })),
  };
}

function buildThread(args: { threadId: string; messages: AgentMailMessage[] }): AgentMailThread {
  return {
    project: "/data/projects/brenner_bot",
    thread_id: args.threadId,
    messages: args.messages,
  };
}

describe("pollForResponses", () => {
  it("does not mis-assign a generic reply to every role", async () => {
    const dispatch = buildDispatch({
      threadId: "TRIBUNAL-RS20260105-test",
      roles: ["devils_advocate", "experiment_designer"],
    });

    const [daTask, edTask] = dispatch.tasks;
    if (!daTask?.messageId || !edTask?.messageId) throw new Error("test setup failed");

    const thread = buildThread({
      threadId: dispatch.threadId,
      messages: [
        {
          id: daTask.messageId,
          thread_id: dispatch.threadId,
          subject: "TRIBUNAL[devils_advocate]: HC-RS20260105-001-v1",
          created_ts: new Date().toISOString(),
          body_md: "prompt",
        },
        {
          id: edTask.messageId,
          thread_id: dispatch.threadId,
          subject: "TRIBUNAL[experiment_designer]: HC-RS20260105-001-v1",
          created_ts: new Date().toISOString(),
          body_md: "prompt",
        },
        {
          id: 999,
          thread_id: dispatch.threadId,
          subject: "Re: thoughts",
          created_ts: new Date().toISOString(),
          body_md: "generic reply without role",
          from: "SomeAgent",
        },
      ],
    });

    const client = {
      readThread: vi.fn(async () => thread),
    } as unknown as { readThread: (args: unknown) => Promise<AgentMailThread> };

    const updated = await pollForResponses(client as never, dispatch, {
      projectKey: "/data/projects/brenner_bot",
      agentName: "RoseRobin",
    });

    expect(updated.tasks.map((t) => t.status)).toEqual(["dispatched", "dispatched"]);
    expect(updated.complete).toBe(false);
  });

  it("matches replies by TRIBUNAL[role] subject bracket", async () => {
    const dispatch = buildDispatch({
      threadId: "TRIBUNAL-RS20260105-bracket",
      roles: ["devils_advocate", "experiment_designer"],
    });

    const [daTask, edTask] = dispatch.tasks;
    if (!daTask?.messageId || !edTask?.messageId) throw new Error("test setup failed");

    const daReply: AgentMailMessage = {
      id: 201,
      thread_id: dispatch.threadId,
      subject: "Re: TRIBUNAL[devils_advocate]: HC-RS20260105-001-v1",
      created_ts: new Date().toISOString(),
      body_md: "DA response",
      from: "DevilsAgent",
    };

    const edReply: AgentMailMessage = {
      id: 202,
      thread_id: dispatch.threadId,
      subject: "Re: TRIBUNAL[experiment_designer]: HC-RS20260105-001-v1",
      created_ts: new Date().toISOString(),
      body_md: "ED response",
      from: "ExperimentAgent",
    };

    const thread = buildThread({
      threadId: dispatch.threadId,
      messages: [
        {
          id: daTask.messageId,
          thread_id: dispatch.threadId,
          subject: "TRIBUNAL[devils_advocate]: HC-RS20260105-001-v1",
          created_ts: new Date().toISOString(),
          body_md: "prompt",
        },
        {
          id: edTask.messageId,
          thread_id: dispatch.threadId,
          subject: "TRIBUNAL[experiment_designer]: HC-RS20260105-001-v1",
          created_ts: new Date().toISOString(),
          body_md: "prompt",
        },
        daReply,
        edReply,
      ],
    });

    const client = {
      readThread: vi.fn(async () => thread),
    } as unknown as { readThread: (args: unknown) => Promise<AgentMailThread> };

    const updated = await pollForResponses(client as never, dispatch, {
      projectKey: "/data/projects/brenner_bot",
      agentName: "RoseRobin",
    });

    expect(updated.tasks.map((t) => t.status)).toEqual(["received", "received"]);
    expect(updated.responses.map((r) => r.role).sort()).toEqual(
      ["devils_advocate", "experiment_designer"].sort(),
    );
    expect(updated.complete).toBe(true);
  });

  it("matches replies by reply_to when subject is ambiguous", async () => {
    const dispatch = buildDispatch({
      threadId: "TRIBUNAL-RS20260105-replyto",
      roles: ["devils_advocate", "experiment_designer"],
    });

    const [daTask, edTask] = dispatch.tasks;
    if (!daTask?.messageId || !edTask?.messageId) throw new Error("test setup failed");

    const thread = buildThread({
      threadId: dispatch.threadId,
      messages: [
        {
          id: daTask.messageId,
          thread_id: dispatch.threadId,
          subject: "TRIBUNAL[devils_advocate]: HC-RS20260105-001-v1",
          created_ts: new Date().toISOString(),
          body_md: "prompt",
        },
        {
          id: edTask.messageId,
          thread_id: dispatch.threadId,
          subject: "TRIBUNAL[experiment_designer]: HC-RS20260105-001-v1",
          created_ts: new Date().toISOString(),
          body_md: "prompt",
        },
        {
          id: 301,
          thread_id: dispatch.threadId,
          reply_to: daTask.messageId,
          subject: "Re: please see attached",
          created_ts: new Date().toISOString(),
          body_md: "DA response via reply_to",
          from: "DevilsAgent",
        },
      ],
    });

    const client = {
      readThread: vi.fn(async () => thread),
    } as unknown as { readThread: (args: unknown) => Promise<AgentMailThread> };

    const updated = await pollForResponses(client as never, dispatch, {
      projectKey: "/data/projects/brenner_bot",
      agentName: "RoseRobin",
    });

    expect(updated.tasks[0]?.status).toBe("received");
    expect(updated.tasks[0]?.response?.content).toContain("reply_to");
    expect(updated.tasks[1]?.status).toBe("dispatched");
    expect(updated.complete).toBe(false);
  });
});

describe("buildAgentPrompt", () => {
  const hypothesis = createHypothesisCard({
    id: "HC-RS20260105-001-v1",
    statement: "Spaced repetition improves long-term retention.",
    mechanism: "Distributed practice increases memory consolidation.",
    predictionsIfTrue: ["Spaced group recalls more at 30 days."],
    impossibleIfTrue: ["No difference after controlling study time."],
  });

  it("includes Brenner quote bank + citation requirement for brenner_channeler", () => {
    const prompt = buildAgentPrompt("brenner_channeler", hypothesis, {});
    expect(prompt).toContain("Brenner Quote Bank");
    expect(prompt).toContain("Citation Requirement");
    expect(prompt).toContain("§42");
    expect(prompt).toContain("do not fabricate");
  });

  it("does not include Brenner quote bank for other roles", () => {
    const prompt = buildAgentPrompt("devils_advocate", hypothesis, {});
    expect(prompt).not.toContain("Brenner Quote Bank");
    expect(prompt).not.toContain("Citation Requirement");
  });

  it("uses citable transcript anchors for fallback quotes", () => {
    expect(FALLBACK_BRENNER_QUOTES.map((q) => q.section)).toContain("§42");
    expect(FALLBACK_BRENNER_QUOTES.map((q) => q.section)).toContain("§66");
    expect(FALLBACK_BRENNER_QUOTES.map((q) => q.section)).toContain("§91");
    expect(FALLBACK_BRENNER_QUOTES.map((q) => q.section)).toContain("§103");
    expect(FALLBACK_BRENNER_QUOTES.map((q) => q.section)).toContain("§147");
  });
});
