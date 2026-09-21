import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import type { TestQueueItem } from "@/lib/brenner-loop/test-queue";

// Mock framer-motion for simpler testing
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/**
 * Create a test TestQueueItem with sensible defaults
 */
function createMockTestQueueItem(overrides: Partial<TestQueueItem> = {}): TestQueueItem {
  const id = overrides.id ?? `TQ-test-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    sessionId: "test-session",
    hypothesisId: "HYP-1",
    assumptionIds: [],
    test: {
      id: `ET-${id}`,
      name: overrides.test?.name ?? "Mock Test",
      description: "A mock test for testing",
      category: "natural_experiment",
      falsificationCondition: "If result is X",
      supportCondition: "If result is Y",
      rationale: "Because reasons",
      feasibility: "high",
      discriminativePower: overrides.discriminativePower ?? 3,
    },
    discriminativePower: overrides.discriminativePower ?? 3,
    status: "queued",
    priority: "medium",
    predictionIfTrue: "Prediction if true",
    predictionIfFalse: "Prediction if false",
    addedAt: new Date().toISOString(),
    source: "manual",
    ...overrides,
  };
}

describe("WhatIfSimulator", () => {
  it("renders empty state when no tests available", async () => {
    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[]}
      />,
    );

    expect(screen.getByText(/No Tests Available/i)).toBeInTheDocument();
  });

  it("renders header with title", async () => {
    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[]}
      />,
    );

    expect(screen.getByText("What-If Simulator")).toBeInTheDocument();
  });

  it("renders tabs for different views", async () => {
    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[createMockTestQueueItem()]}
      />,
    );

    // Should have three tabs (visible on larger screens, but always present)
    expect(screen.getByRole("tab", { name: /single/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /scenario/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /compare/i })).toBeInTheDocument();
  });

  it("displays single test what-if analysis", async () => {
    const test = createMockTestQueueItem({
      id: "test-1",
      discriminativePower: 4,
      test: {
        id: "ET-test-1",
        name: "High Power Test",
        description: "A high power test",
        category: "natural_experiment",
        falsificationCondition: "X",
        supportCondition: "Y",
        rationale: "R",
        feasibility: "high",
        discriminativePower: 4,
      },
    });

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[test]}
      />,
    );

    // Should show the test name
    expect(screen.getByText("High Power Test")).toBeInTheDocument();

    // Should show current confidence
    expect(screen.getByText(/Current confidence/i)).toBeInTheDocument();
    // 50% appears multiple times (current confidence, inconclusive outcome)
    expect(screen.getAllByText("50%").length).toBeGreaterThanOrEqual(1);

    // Should show all three outcome types
    expect(screen.getByText(/If result supports/i)).toBeInTheDocument();
    expect(screen.getByText(/If result challenges/i)).toBeInTheDocument();
    expect(screen.getByText(/If result inconclusive/i)).toBeInTheDocument();
  });

  it("allows selecting different tests", async () => {
    const user = userEvent.setup();
    const tests = [
      createMockTestQueueItem({
        id: "test-1",
        test: {
          id: "ET-1",
          name: "First Test",
          description: "D",
          category: "natural_experiment",
          falsificationCondition: "X",
          supportCondition: "Y",
          rationale: "R",
          feasibility: "high",
          discriminativePower: 3,
        },
      }),
      createMockTestQueueItem({
        id: "test-2",
        test: {
          id: "ET-2",
          name: "Second Test",
          description: "D",
          category: "natural_experiment",
          falsificationCondition: "X",
          supportCondition: "Y",
          rationale: "R",
          feasibility: "high",
          discriminativePower: 3,
        },
      }),
    ];

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={tests}
      />,
    );

    // Click on second test
    const secondTestButton = screen.getByRole("button", { name: /Second Test/i });
    await user.click(secondTestButton);

    // Verify second test is now selected (has primary styling)
    expect(secondTestButton).toHaveClass("border-primary");
  });

  it("calls onRunTest when run button is clicked", async () => {
    const user = userEvent.setup();
    const onRunTest = vi.fn();
    const test = createMockTestQueueItem({
      id: "test-run",
      test: {
        id: "ET-run",
        name: "Runnable Test",
        description: "D",
        category: "natural_experiment",
        falsificationCondition: "X",
        supportCondition: "Y",
        rationale: "R",
        feasibility: "high",
        discriminativePower: 3,
      },
    });

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[test]}
        onRunTest={onRunTest}
      />,
    );

    // Click run button
    const runButton = screen.getByRole("button", { name: /Run This Test/i });
    await user.click(runButton);

    expect(onRunTest).toHaveBeenCalledWith(test);
  });

  it("switches to scenario view when tab clicked", async () => {
    const user = userEvent.setup();
    const test = createMockTestQueueItem();

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[test]}
      />,
    );

    // Click scenario tab
    const scenarioTab = screen.getByRole("tab", { name: /scenario/i });
    await user.click(scenarioTab);

    // Should show scenario-specific content
    expect(screen.getByText(/Scenario Projection/i)).toBeInTheDocument();
  });

  it("switches to comparison view when tab clicked", async () => {
    const user = userEvent.setup();
    const test = createMockTestQueueItem();

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[test]}
      />,
    );

    // Click comparison tab
    const compareTab = screen.getByRole("tab", { name: /compare/i });
    await user.click(compareTab);

    // Should show comparison-specific content
    expect(screen.getByText(/Recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/Tests Ranked by Information Value/i)).toBeInTheDocument();
  });

  it("shows test comparison rankings correctly", async () => {
    const user = userEvent.setup();
    const tests = [
      createMockTestQueueItem({
        id: "low-power",
        discriminativePower: 2,
        test: {
          id: "ET-low",
          name: "Low Power Test",
          description: "D",
          category: "natural_experiment",
          falsificationCondition: "X",
          supportCondition: "Y",
          rationale: "R",
          feasibility: "high",
          discriminativePower: 2,
        },
      }),
      createMockTestQueueItem({
        id: "high-power",
        discriminativePower: 5,
        test: {
          id: "ET-high",
          name: "High Power Test",
          description: "D",
          category: "natural_experiment",
          falsificationCondition: "X",
          supportCondition: "Y",
          rationale: "R",
          feasibility: "high",
          discriminativePower: 5,
        },
      }),
    ];

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={tests}
      />,
    );

    // Switch to comparison view
    const compareTab = screen.getByRole("tab", { name: /compare/i });
    await user.click(compareTab);

    // High power test should be recommended and have "Top pick"
    // Text may appear multiple times (in recommendation and in table)
    expect(screen.getAllByText("High Power Test").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Low Power Test").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Top pick/i)).toBeInTheDocument();
  });

  it("shows empty state in comparison view when no tests", async () => {
    const user = userEvent.setup();

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[]}
      />,
    );

    // Switch to comparison view
    const compareTab = screen.getByRole("tab", { name: /compare/i });
    await user.click(compareTab);

    expect(screen.getByText(/No Tests to Compare/i)).toBeInTheDocument();
  });

  it("displays discriminative power with star rating", async () => {
    const test = createMockTestQueueItem({
      discriminativePower: 4,
      test: {
        id: "ET-stars",
        name: "Four Star Test",
        description: "D",
        category: "natural_experiment",
        falsificationCondition: "X",
        supportCondition: "Y",
        rationale: "R",
        feasibility: "high",
        discriminativePower: 4,
      },
    });

    const { WhatIfSimulator } = await import("./WhatIfSimulator");
    render(
      <WhatIfSimulator
        sessionId="test-session"
        hypothesisId="HYP-1"
        currentConfidence={50}
        tests={[test]}
      />,
    );

    // For discriminativePower 4, getStarRating returns 3 filled + 2 empty
    expect(screen.getByText("★★★☆☆")).toBeInTheDocument();
  });
});
