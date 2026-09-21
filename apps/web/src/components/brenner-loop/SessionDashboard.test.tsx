import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prev: vi.fn(),
  next: vi.fn(),
  goTo: vi.fn(),
  saveSession: vi.fn().mockResolvedValue(undefined),
  updateHypothesis: vi.fn(),
  advancePhase: vi.fn(),
  appendOperatorApplication: vi.fn(),
  phase: "level_split" as string,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAsyncOperation", () => ({
  useAsyncOperation: () => ({
    isLoading: false,
    isError: false,
    state: {},
    run: async (fn: () => Promise<void>) => await fn(),
  }),
}));

vi.mock("@/components/ui/loading-overlay", () => ({
  LoadingOverlay: () => null,
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("./CorpusSearch", () => ({
  CorpusSearchDialog: () => null,
}));

vi.mock("./HypothesisCard", () => ({
  HypothesisCard: () => <div data-testid="hypothesis-card" />,
}));

vi.mock("./HypothesisIntake", () => ({
  HypothesisIntake: () => <div data-testid="hypothesis-intake" />,
}));

vi.mock("./PhaseTimeline", () => ({
  PhaseTimeline: () => <div data-testid="phase-timeline" />,
}));

vi.mock("./operators/LevelSplitSession", () => ({
  LevelSplitSession: () => <div data-testid="level-split-session" />,
}));

vi.mock("./operators/ExclusionTestSession", () => ({
  ExclusionTestSession: () => <div data-testid="exclusion-test-session" />,
}));

vi.mock("./operators/ObjectTransposeSession", () => ({
  ObjectTransposeSession: () => <div data-testid="object-transpose-session" />,
}));

vi.mock("./operators/ScaleCheckSession", () => ({
  ScaleCheckSession: () => <div data-testid="scale-check-session" />,
}));

vi.mock("./agents/AgentTribunalPanel", () => ({
  AgentTribunalPanel: () => <div data-testid="agent-tribunal-panel" />,
}));

vi.mock("./agents/ObjectionRegisterPanel", () => ({
  ObjectionRegisterPanel: () => <div data-testid="objection-register-panel" />,
}));

vi.mock("./evidence/ConfidenceChart", () => ({
  ConfidenceChart: () => <div data-testid="confidence-chart" />,
}));

vi.mock("./evidence/EvidenceTimeline", () => ({
  EvidenceTimeline: () => <div data-testid="evidence-timeline" />,
}));

vi.mock("@/lib/brenner-loop", async () => {
  const PHASE_ORDER = [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
    "evidence_gathering",
    "revision",
    "complete",
  ] as const;

  return {
    PHASE_ORDER,
    getSessionProgress: () => 25,
    exportSession: vi.fn(async () => new Blob()),
    useSession: () => ({
      session: {
        id: "TEST-1",
        phase: mocks.phase,
        primaryHypothesisId: "H1",
      },
      primaryHypothesis: {
        id: "H1",
        statement: "Test hypothesis",
        createdAt: new Date(),
        updatedAt: new Date(),
        confidence: 50,
        version: 1,
      },
      isLoading: false,
      error: null,
      attachQuote: vi.fn(),
      isDirty: false,
      saveState: { status: "saved" },
      saveSession: mocks.saveSession,
      updateHypothesis: mocks.updateHypothesis,
      advancePhase: mocks.advancePhase,
      appendOperatorApplication: mocks.appendOperatorApplication,
    }),
    useSessionMachine: () => ({
      reachablePhases: [...PHASE_ORDER],
      isComplete: false,
    }),
    usePhaseNavigation: () => ({
      prev: mocks.prev,
      next: mocks.next,
      canPrev: true,
      canNext: true,
      goTo: mocks.goTo,
    }),
  };
});

describe("SessionDashboard keyboard shortcuts", () => {
  it("uses ArrowLeft/ArrowRight to navigate phases", async () => {
    const user = userEvent.setup();
    mocks.prev.mockClear();
    mocks.next.mockClear();
    mocks.phase = "level_split";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowRight}");

    expect(mocks.prev).toHaveBeenCalledTimes(1);
    expect(mocks.next).toHaveBeenCalledTimes(1);
  });

  it("does not navigate phases when Shift+Arrow is pressed", async () => {
    const user = userEvent.setup();
    mocks.prev.mockClear();
    mocks.phase = "level_split";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(mocks.prev).not.toHaveBeenCalled();
  });

  it("supports numeric phase jumps (1-9)", async () => {
    const user = userEvent.setup();
    mocks.goTo.mockClear();
    mocks.phase = "level_split";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    await user.keyboard("2");
    expect(mocks.goTo).toHaveBeenCalledWith("sharpening");
  });

  it("ignores shortcuts while typing in an input", async () => {
    const user = userEvent.setup();
    mocks.prev.mockClear();
    mocks.phase = "level_split";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    await user.keyboard("{ArrowLeft}");
    expect(mocks.prev).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("toggles the shortcuts dialog with ?", async () => {
    const user = userEvent.setup();
    mocks.phase = "level_split";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    await user.keyboard("?");
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
  });
});

describe("SessionDashboard PhaseContent rendering", () => {
  it("renders HypothesisIntake during intake phase", async () => {
    mocks.phase = "intake";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    expect(screen.getByTestId("hypothesis-intake")).toBeInTheDocument();
  });

  it("renders LevelSplitSession during level_split phase", async () => {
    mocks.phase = "level_split";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    expect(screen.getByTestId("level-split-session")).toBeInTheDocument();
  });

  it("renders sharpening editor during sharpening phase", async () => {
    mocks.phase = "sharpening";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    expect(screen.getByTestId("hypothesis-sharpening-editor")).toBeInTheDocument();
  });

  it("renders revision editor during revision phase", async () => {
    mocks.phase = "revision";

    const { SessionDashboard } = await import("./SessionDashboard");
    render(<SessionDashboard />);

    expect(screen.getByTestId("hypothesis-revision-editor")).toBeInTheDocument();
  });
});
