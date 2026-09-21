import { beforeEach, describe, expect, it, vi } from "vitest";

const toolsCallMock = vi.hoisted(() =>
  vi.fn(async (tool: string) => {
    if (tool === "ensure_project") return { structuredContent: { slug: "test-project" } };
    return { structuredContent: {} };
  }),
);

const resourcesReadMock = vi.hoisted(() =>
  vi.fn(async () => {
    return {
      contents: [{ text: JSON.stringify({ agents: [{ name: "TestAgent", unread_count: 0 }] }) }],
    };
  }),
);

vi.mock("@/lib/agentMail", () => ({
  AgentMailClient: class AgentMailClientMock {
    toolsCall = toolsCallMock;
    resourcesRead = resourcesReadMock;
  },
}));

vi.mock("@/lib/auth", () => ({
  isLabModeEnabled: () => true,
  checkOrchestrationAuth: () => ({ authorized: true, reason: "ok" }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({}),
}));

vi.mock("@/components/sessions", () => ({
  SessionForm: () => null,
}));

import NewSessionPage from "./page";

async function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<void> | void,
) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }

  try {
    return await fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

describe("NewSessionPage", () => {
  beforeEach(() => {
    toolsCallMock.mockClear();
    resourcesReadMock.mockClear();
  });

  it.each([["/abs/path/to/repo"], ["C:\\repo\\brenner_bot"], ["\\\\server\\share\\brenner_bot"]])(
    "calls ensure_project when BRENNER_PROJECT_KEY is absolute: %s",
    async (projectKey) => {
      await withEnv({ BRENNER_PROJECT_KEY: projectKey }, async () => {
        await NewSessionPage({ searchParams: Promise.resolve({}) });
      });

      expect(toolsCallMock).toHaveBeenCalledWith("ensure_project", { human_key: projectKey });
    },
  );

  it("does not call ensure_project when BRENNER_PROJECT_KEY is a relative slug", async () => {
    await withEnv({ BRENNER_PROJECT_KEY: "relative-project" }, async () => {
      await NewSessionPage({ searchParams: Promise.resolve({}) });
    });

    expect(toolsCallMock.mock.calls.some(([tool]) => tool === "ensure_project")).toBe(false);
  });
});
