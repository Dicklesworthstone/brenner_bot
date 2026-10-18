import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SessionDetailPage from "./page";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/sessions/demo-bio-nanochat-001",
}));

describe("SessionDetailPage", () => {
  it("renders DemoSessionDetail with the 7-Dimension Brenner Method Scorecard panel", async () => {
    const jsx = await SessionDetailPage({
      params: Promise.resolve({ threadId: "demo-bio-nanochat-001" }),
    });
    render(jsx);

    expect(screen.getByText("Demo Session")).toBeInTheDocument();
    const scorecardPanel = screen.getByTestId("session-scorecard-panel");
    expect(scorecardPanel).toBeInTheDocument();
    expect(scorecardPanel).toHaveTextContent("7-Dimension Brenner Method Scorecard");
    expect(scorecardPanel).toHaveTextContent(/Grade [A-F]/);
    expect(scorecardPanel).toHaveTextContent("Paradox Grounding");
    expect(scorecardPanel).toHaveTextContent("Hypothesis Kill Rate");
    expect(scorecardPanel).toHaveTextContent("Test Discriminability");
    expect(scorecardPanel).toHaveTextContent("Assumption Tracking");
    expect(scorecardPanel).toHaveTextContent("Third Alternative Discovery");
    expect(scorecardPanel).toHaveTextContent("Experimental Feasibility");
    expect(scorecardPanel).toHaveTextContent("Adversarial Pressure");
    expect(scorecardPanel).toHaveTextContent("Clean Audit");
  });

  it("renders DemoSessionNotFound for an unknown demo session ID", async () => {
    const jsx = await SessionDetailPage({
      params: Promise.resolve({ threadId: "demo-nonexistent-999" }),
    });
    render(jsx);

    expect(screen.getByText("Demo Session Not Found")).toBeInTheDocument();
  });
});
