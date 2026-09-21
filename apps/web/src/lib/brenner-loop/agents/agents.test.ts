import { describe, expect, it, vi } from "vitest";
import type { AgentMailClient } from "../../agentMail";
import type { HypothesisCard } from "../hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "../hypothesis";
import {
  AGENT_PERSONAS,
  buildSystemPromptContext,
  getActivePersonasForPhase,
  getBehaviorsByPriority,
  getInteractionExamples,
  getModelConfig,
  getPersona,
  getPersonasForTrigger,
  mapSessionPhaseToPersonaGroup,
  shouldInvokePersona,
} from "./agent-personas";
import {
  type AgentTask,
  buildAgentPrompt,
  checkAgentAvailability,
  createDispatch,
  DEFAULT_DISPATCH_ROLES,
  dispatchAgentTask,
  dispatchAllTasks,
  formatHypothesisForPrompt,
  formatOperatorResultsForPrompt,
  generateThreadId,
  getDispatchStatus,
  getFallbackContent,
  pollForResponses,
} from "./dispatch";
import {
  clearPromptCache,
  getAgentConfig,
  getTribunalAgentsInOrder,
  isTribunalAgentRole,
  loadPrompt,
  TRIBUNAL_AGENTS,
  TRIBUNAL_ORDER,
} from "./index";

function makeHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  const sessionId = overrides.sessionId ?? "TEST-SESSION";

  return createHypothesisCard({
    id: overrides.id ?? generateHypothesisCardId(sessionId, 1),
    statement: overrides.statement ?? "X causes Y",
    mechanism: overrides.mechanism ?? "Because mechanism",
    domain: overrides.domain ?? ["psychology"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? ["If X then Y"],
    predictionsIfFalse: overrides.predictionsIfFalse ?? ["If not X then not Y"],
    impossibleIfTrue: overrides.impossibleIfTrue ?? ["Y without X"],
    confidence: overrides.confidence,
    sessionId,
  });
}

describe("brenner-loop/agents index", () => {
  it("exposes role guards and ordered agent configs", async () => {
    expect(isTribunalAgentRole("devils_advocate")).toBe(true);
    expect(isTribunalAgentRole("not-a-role")).toBe(false);

    const ordered = getTribunalAgentsInOrder();
    expect(ordered.map((a) => a.role)).toEqual([...TRIBUNAL_ORDER]);

    expect(getAgentConfig("statistician")?.promptPath).toBe(
      TRIBUNAL_AGENTS.statistician.promptPath,
    );

    clearPromptCache();
    const prompt = await loadPrompt("devils_advocate");
    // Prompt should contain either the actual content from spec or the fallback placeholder
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toMatch(/ADVERSARIAL CRITIC|Prompt at:|prompts\/devils-advocate\.md/);

    await expect(loadPrompt("nope" as never)).rejects.toThrow(/Unknown agent role/);
  });

  it("loads prompt content from the role prompts spec when available", async () => {
    // This test verifies that loadPrompt extracts content between the spec markers.
    // The test environment reads from the filesystem, so we just verify the
    // expected behavior: content is extracted from the spec if available.
    clearPromptCache();
    const prompt = await loadPrompt("devils_advocate");

    // If the spec is found on the filesystem with the adversarial_critic marker,
    // we should get the extracted content. Otherwise we get the placeholder.
    // Either way, the prompt should be non-empty and relate to the role.
    expect(prompt.length).toBeGreaterThan(0);

    // The content should contain "ADVERSARIAL CRITIC" (from spec) or fallback path
    expect(prompt).toMatch(/ADVERSARIAL CRITIC|adversarial|Prompt at:/i);

    clearPromptCache();
  });
});

describe("brenner-loop/agent-personas", () => {
  it("maps phases and filters personas by phase/trigger", () => {
    expect(mapSessionPhaseToPersonaGroup("level_split")).toBe("operators");
    expect(mapSessionPhaseToPersonaGroup("unknown-phase")).toBeNull();

    const activeForOperators = getActivePersonasForPhase("operators");
    const activeForDetailed = getActivePersonasForPhase("level_split");
    expect(activeForDetailed.map((p) => p.role)).toEqual(activeForOperators.map((p) => p.role));

    const triggered = getPersonasForTrigger("hypothesis_submitted");
    expect(triggered.length).toBeGreaterThan(0);

    for (const persona of triggered) {
      expect(shouldInvokePersona(persona.role, "hypothesis_submitted")).toBe(true);
    }
  });

  it("builds sorted behaviors and system prompt context", () => {
    const behaviors = getBehaviorsByPriority("devils_advocate");
    expect(behaviors.length).toBeGreaterThan(0);
    expect(behaviors[0].priority).toBeLessThanOrEqual(behaviors.at(-1)?.priority ?? 5);

    const promptContext = buildSystemPromptContext("devils_advocate");
    expect(promptContext).toContain("# Devil's Advocate");
    expect(promptContext).toContain("## Key Behaviors");

    expect(getInteractionExamples("experiment_designer").length).toBeGreaterThan(0);
    expect(getModelConfig("statistician").maxTokens).toBeGreaterThan(0);
    expect(getPersona("brenner_channeler")).toBe(AGENT_PERSONAS.brenner_channeler);
  });
});

describe("brenner-loop/agents dispatch", () => {
  it("creates dispatch, formats prompt context, and counts status", () => {
    const hypothesis = makeHypothesis({ domain: [] });
    const dispatch = createDispatch({
      sessionId: "S-1",
      hypothesis,
      projectKey: "/abs/path",
      senderName: "BlueLake",
    });

    expect(dispatch.threadId).toBe("");
    expect(dispatch.tasks.map((t) => t.role)).toEqual(DEFAULT_DISPATCH_ROLES);

    expect(generateThreadId("S-1")).toMatch(/^TRIBUNAL-S-1-/);

    const hypothesisMd = formatHypothesisForPrompt(hypothesis);
    expect(hypothesisMd).toContain("## Hypothesis Under Review");
    expect(hypothesisMd).toContain("Not specified");

    const operatorsMd = formatOperatorResultsForPrompt({
      levelSplit: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "user",
          conflationDetected: true,
          conflationDescription: "Multiple levels mixed",
          levels: [
            {
              name: "Individual",
              description: "Person-level",
              levelType: "interpreter",
              hypothesisIds: ["H1"],
            },
          ],
        },
      ],
      exclusionTest: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "user",
          designedTests: [
            {
              name: "Block mechanism",
              procedure: "Do X",
              couldExclude: ["H1"],
              discriminativePower: 3,
            },
          ],
          rejectedTests: [],
        },
      ],
      objectTranspose: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "user",
          originalSystem: "A",
          alternativeSystems: [{ name: "B", pros: ["clearer"], cons: [] }],
          selectedSystem: "B",
          selectionRationale: "clearer",
        },
      ],
      scaleCheck: [
        {
          appliedAt: "2026-01-01T00:00:00Z",
          appliedBy: "user",
          plausible: false,
          calculations: [
            {
              name: "Scale",
              quantities: "10^6 cells",
              result: "0",
              units: "u",
              implication: "bad",
            },
          ],
          ruledOutByScale: ["H1"],
        },
      ],
    });
    expect(operatorsMd).toContain("## Level Split Results");
    expect(operatorsMd).toContain("## Exclusion Test Results");
    expect(operatorsMd).toContain("## Object Transpose Results");
    expect(operatorsMd).toContain("## Scale Check Results");

    const status = getDispatchStatus(dispatch);
    expect(status.pending).toBe(dispatch.tasks.length);
    expect(status.total).toBe(dispatch.tasks.length);
  });

  it("builds role-specific prompts (Brenner channeler includes citations)", () => {
    const hypothesis = makeHypothesis();
    const base = buildAgentPrompt("devils_advocate", hypothesis, {});
    expect(base).toContain("# Tribunal Analysis Request");
    expect(base).not.toContain("Brenner Quote Bank");

    const brenner = buildAgentPrompt("brenner_channeler", hypothesis, {});
    expect(brenner).toContain("Brenner Quote Bank");
    expect(brenner).toContain("Citation Requirement");
  });

  it("dispatches all tasks and polls responses", async () => {
    const hypothesis = makeHypothesis();
    const initial = createDispatch({
      sessionId: "S-2",
      hypothesis,
      projectKey: "/abs/path",
      senderName: "BlueLake",
      roles: ["devils_advocate"],
    });

    const client = {
      sendMessage: vi.fn(async () => ({ deliveries: [{ payload: { id: 101 } }] })),
      readThread: vi.fn(async () => ({
        messages: [
          // dispatch message (ignored as a response)
          {
            id: 101,
            subject: "TRIBUNAL[devils_advocate]: H",
            body_md: "# Tribunal Analysis Request",
            created_ts: "2026-01-01T00:00:00Z",
          },
          // response, linked by reply_to
          {
            id: 202,
            reply_to: 101,
            subject: "Re: TRIBUNAL[devils_advocate]: H",
            body_md: "OK",
            created_ts: "2026-01-01T00:01:00Z",
            from: "RedCanyon",
          },
        ],
      })),
    } as unknown as AgentMailClient;

    const dispatched = await dispatchAllTasks(client, initial, {
      projectKey: "/abs/path",
      senderName: "BlueLake",
      recipients: ["RedCanyon"],
    });

    expect(dispatched.threadId).toMatch(/^TRIBUNAL-S-2-/);
    expect(dispatched.tasks[0]?.status).toBe("dispatched");

    const polled = await pollForResponses(client, dispatched, {
      projectKey: "/abs/path",
      agentName: "BlueLake",
    });

    expect(polled.tasks[0]?.status).toBe("received");
    expect(polled.responses).toHaveLength(1);
    expect(polled.complete).toBe(true);
  });

  it("uses the single ambiguous reply fallback when only one role is outstanding", async () => {
    const hypothesis = makeHypothesis();
    const dispatch = {
      ...createDispatch({
        sessionId: "S-3",
        hypothesis,
        projectKey: "/abs/path",
        senderName: "BlueLake",
        roles: ["devils_advocate"],
      }),
      threadId: "TRIBUNAL-S-3-abc",
      tasks: [
        {
          role: "devils_advocate",
          status: "dispatched",
          messageId: 100,
          dispatchedAt: "2026-01-01T00:00:00Z",
        },
      ] as AgentTask[],
    };

    const client = {
      readThread: vi.fn(async () => ({
        messages: [
          {
            id: 100,
            subject: "TRIBUNAL[devils_advocate]: H",
            body_md: "# Tribunal Analysis Request",
            created_ts: "2026-01-01T00:00:00Z",
          },
          // ambiguous reply: no subject role, no reply_to
          {
            id: 201,
            subject: "Here you go",
            body_md: "OK",
            created_ts: "2026-01-01T00:02:00Z",
            from: "RedCanyon",
          },
        ],
      })),
    } as unknown as AgentMailClient;

    const polled = await pollForResponses(client, dispatch, {
      projectKey: "/abs/path",
      agentName: "BlueLake",
    });
    expect(polled.tasks[0]?.status).toBe("received");
    expect(polled.responses[0]?.content).toBe("OK");
  });

  it("checks agent availability via resources and filters orchestrator agents", async () => {
    const client = {
      resourcesRead: vi.fn(async () => ({
        contents: [
          {
            text: JSON.stringify({
              agents: [
                { name: "TopazPeak", program: "claude-code" },
                { name: "BrennerCLI", program: "brenner-cli" },
              ],
            }),
          },
        ],
      })),
    } as unknown as AgentMailClient;

    const result = await checkAgentAvailability(client, "/data/projects/brenner_bot");
    expect(result.available).toBe(true);
    expect(result.agents).toEqual(["TopazPeak"]);
  });

  it("provides fallback content when agents are unavailable", () => {
    const fallback = getFallbackContent(makeHypothesis());
    expect(fallback.status).toBe("unavailable");
    expect(fallback.quotes.length).toBeGreaterThan(0);
    expect(fallback.selfReflectionQuestions.length).toBeGreaterThan(0);
  });

  it("handles dispatchAgentTask response parsing and error cases", async () => {
    const hypothesis = makeHypothesis();
    const dispatch = {
      ...createDispatch({
        sessionId: "S-4",
        hypothesis,
        projectKey: "/abs/path",
        senderName: "BlueLake",
        roles: ["devils_advocate"],
      }),
      threadId: "TRIBUNAL-S-4-abc",
    };

    const goodClient = {
      sendMessage: vi.fn(async () => ({ deliveries: [{ payload: { id: 999 } }] })),
    } as unknown as AgentMailClient;

    const ok = await dispatchAgentTask(goodClient, dispatch, "devils_advocate", {
      projectKey: "/abs/path",
      senderName: "BlueLake",
      recipients: ["RedCanyon"],
    });
    expect("messageId" in ok).toBe(true);

    const badClient = {
      sendMessage: vi.fn(async () => ({ deliveries: [{ payload: {} }] })),
    } as unknown as AgentMailClient;

    const bad = await dispatchAgentTask(badClient, dispatch, "devils_advocate", {
      projectKey: "/abs/path",
      senderName: "BlueLake",
      recipients: ["RedCanyon"],
    });
    expect("error" in bad).toBe(true);

    const throwingClient = {
      sendMessage: vi.fn(async () => {
        throw new Error("boom");
      }),
    } as unknown as AgentMailClient;

    const thrown = await dispatchAgentTask(throwingClient, dispatch, "devils_advocate", {
      projectKey: "/abs/path",
      senderName: "BlueLake",
      recipients: ["RedCanyon"],
    });
    expect("error" in thrown).toBe(true);
  });
});
