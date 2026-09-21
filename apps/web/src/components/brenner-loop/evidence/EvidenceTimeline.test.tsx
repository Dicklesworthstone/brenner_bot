import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import type {
  DiscriminativePower,
  EvidenceEntry,
  EvidenceResult,
  TestType,
} from "@/lib/brenner-loop/evidence";

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
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
    g: ({ children, ...props }: React.SVGProps<SVGGElement>) => <g {...props}>{children}</g>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/**
 * Create a test evidence entry with sensible defaults
 */
function createTestEntry(overrides: Partial<EvidenceEntry> = {}): EvidenceEntry {
  return {
    id: `EV-test-${Math.random().toString(36).slice(2, 7)}`,
    sessionId: "test-session",
    hypothesisVersion: "H1",
    test: {
      id: "test-001",
      description: "Test description",
      type: "observation" as TestType,
      discriminativePower: 3 as DiscriminativePower,
    },
    predictionIfTrue: "Expected if true",
    predictionIfFalse: "Expected if false",
    result: "supports" as EvidenceResult,
    observation: "What was observed",
    confidenceBefore: 50,
    confidenceAfter: 60,
    interpretation: "This supports the hypothesis",
    recordedAt: new Date(),
    ...overrides,
  };
}

describe("EvidenceTimeline", () => {
  it("renders empty state when no entries", async () => {
    const { EvidenceTimeline } = await import("./EvidenceTimeline");
    render(<EvidenceTimeline entries={[]} />);

    expect(screen.getByText(/No Evidence Yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Run tests and record evidence/i)).toBeInTheDocument();
  });

  it("renders timeline with evidence entries", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        id: "EV-001",
        result: "supports",
        observation: "First observation",
        confidenceBefore: 50,
        confidenceAfter: 60,
      }),
      createTestEntry({
        id: "EV-002",
        result: "challenges",
        observation: "Second observation",
        confidenceBefore: 60,
        confidenceAfter: 45,
      }),
    ];

    const { EvidenceTimeline } = await import("./EvidenceTimeline");
    render(<EvidenceTimeline entries={entries} />);

    // Should show observations in timeline cards
    expect(screen.getByText(/First observation/i)).toBeInTheDocument();
    expect(screen.getByText(/Second observation/i)).toBeInTheDocument();
  });

  it("calls onSelectEntry when entry is clicked", async () => {
    const user = userEvent.setup();
    const onSelectEntry = vi.fn();

    const entry = createTestEntry({
      id: "EV-click-test",
      observation: "Clickable observation",
    });

    const { EvidenceTimeline } = await import("./EvidenceTimeline");
    render(<EvidenceTimeline entries={[entry]} onSelectEntry={onSelectEntry} />);

    // Click on the timeline card
    const card = screen.getByText(/Clickable observation/i).closest("button");
    expect(card).toBeInTheDocument();
    await user.click(card!);

    expect(onSelectEntry).toHaveBeenCalledWith(entry);
  });

  it("displays confidence changes with direction indicators", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        id: "EV-up",
        result: "supports",
        confidenceBefore: 50,
        confidenceAfter: 62, // +12
      }),
      createTestEntry({
        id: "EV-down",
        result: "challenges",
        confidenceBefore: 62,
        confidenceAfter: 40, // -22
      }),
    ];

    const { EvidenceTimeline } = await import("./EvidenceTimeline");
    render(<EvidenceTimeline entries={entries} />);

    // Should show confidence values (62% appears twice: as "after" for first, "before" for second)
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getAllByText("62%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("supports compact mode", async () => {
    const entry = createTestEntry({
      observation: "Compact mode test",
      recordedAt: new Date("2025-06-15T12:00:00Z"), // Use UTC to avoid timezone issues
    });

    const { EvidenceTimeline } = await import("./EvidenceTimeline");
    const { container, rerender } = render(<EvidenceTimeline entries={[entry]} compact={false} />);

    // Non-compact should show observation text
    expect(screen.getByText("Compact mode test")).toBeInTheDocument();
    // Non-compact shows observation with line-clamp
    expect(container.querySelector(".line-clamp-2")).toBeInTheDocument();

    // Re-render in compact mode
    rerender(<EvidenceTimeline entries={[entry]} compact={true} />);

    // Compact mode hides the observation preview (no line-clamp-2)
    expect(container.querySelector(".line-clamp-2")).not.toBeInTheDocument();
  });

  it("sorts entries by date (newest first)", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        id: "EV-old",
        observation: "Old entry observation",
        recordedAt: new Date("2025-01-01T12:00:00Z"),
      }),
      createTestEntry({
        id: "EV-new",
        observation: "New entry observation",
        recordedAt: new Date("2025-01-15T12:00:00Z"),
      }),
    ];

    const { EvidenceTimeline } = await import("./EvidenceTimeline");
    render(<EvidenceTimeline entries={entries} />);

    // Check that both observations are present
    expect(screen.getByText(/Old entry observation/i)).toBeInTheDocument();
    expect(screen.getByText(/New entry observation/i)).toBeInTheDocument();

    // Get all observation texts and verify order (newest first in timeline)
    const oldElement = screen.getByText(/Old entry observation/i);
    const newElement = screen.getByText(/New entry observation/i);

    // The "new" entry should appear before "old" in the DOM (since sorted newest-first)
    expect(newElement.compareDocumentPosition(oldElement)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
