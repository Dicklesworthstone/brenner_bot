import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
    g: ({ children, ...props }: React.SVGProps<SVGGElement>) => <g {...props}>{children}</g>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ResizeObserver as a class
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});

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

describe("ConfidenceChart", () => {
  it("renders empty state when no entries", async () => {
    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={[]} />);

    expect(screen.getByText(/Record evidence to see your confidence journey/i)).toBeInTheDocument();
  });

  it("renders chart with evidence entries", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        id: "EV-001",
        result: "supports",
        confidenceBefore: 50,
        confidenceAfter: 60,
        recordedAt: new Date("2025-01-01"),
      }),
      createTestEntry({
        id: "EV-002",
        result: "challenges",
        confidenceBefore: 60,
        confidenceAfter: 45,
        recordedAt: new Date("2025-01-02"),
      }),
    ];

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={entries} />);

    // Should render an SVG element
    expect(document.querySelector("svg")).toBeInTheDocument();

    // Should show the x-axis label
    expect(screen.getByText("Evidence Timeline")).toBeInTheDocument();
  });

  it("displays summary stats when showLabels is true", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        result: "supports",
        confidenceBefore: 50,
        confidenceAfter: 60,
        recordedAt: new Date("2025-01-01"),
      }),
      createTestEntry({
        result: "challenges",
        confidenceBefore: 60,
        confidenceAfter: 45,
        recordedAt: new Date("2025-01-02"),
      }),
    ];

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={entries} showLabels={true} />);

    // Should show summary stats
    expect(screen.getByText(/Start:/i)).toBeInTheDocument();
    expect(screen.getByText(/Now:/i)).toBeInTheDocument();
    expect(screen.getByText(/1 support/i)).toBeInTheDocument();
    expect(screen.getByText(/1 challenge/i)).toBeInTheDocument();
  });

  it("hides summary stats when showLabels is false", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        result: "supports",
        confidenceBefore: 50,
        confidenceAfter: 60,
      }),
    ];

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={entries} showLabels={false} />);

    // Should NOT show summary stats
    expect(screen.queryByText(/Start:/i)).not.toBeInTheDocument();
  });

  it("renders data points when onPointClick is provided", async () => {
    const onPointClick = vi.fn();

    const entry = createTestEntry({
      id: "EV-click-test",
      confidenceBefore: 50,
      confidenceAfter: 65,
    });

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={[entry]} onPointClick={onPointClick} />);

    // Find data point circles - should have at least initial + entry points
    const circles = document.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(4);

    // Verify the chart rendered with data points
    // The actual count varies due to hover rings and framer-motion mocks
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("uses initialConfidence prop when provided", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        confidenceBefore: 60, // This would be ignored
        confidenceAfter: 70,
        recordedAt: new Date("2025-01-01"),
      }),
    ];

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={entries} initialConfidence={40} showLabels={true} />);

    // Should show our custom initial confidence
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("sorts entries chronologically", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        id: "EV-later",
        confidenceBefore: 60,
        confidenceAfter: 55,
        recordedAt: new Date("2025-01-15"),
      }),
      createTestEntry({
        id: "EV-earlier",
        confidenceBefore: 50,
        confidenceAfter: 60,
        recordedAt: new Date("2025-01-01"),
      }),
    ];

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={entries} showLabels={true} />);

    // Final confidence should be 55 (from the later entry)
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("applies custom height", async () => {
    const entries: EvidenceEntry[] = [
      createTestEntry({
        confidenceBefore: 50,
        confidenceAfter: 60,
      }),
    ];

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={entries} height={300} />);

    const svg = document.querySelector("svg");
    expect(svg).toHaveAttribute("height", "300");
  });

  it("handles single entry correctly", async () => {
    const entry = createTestEntry({
      result: "supports",
      confidenceBefore: 50,
      confidenceAfter: 65,
    });

    const { ConfidenceChart } = await import("./ConfidenceChart");
    render(<ConfidenceChart entries={[entry]} showLabels={true} />);

    // Should show start and end confidence (may appear in multiple places: axis + summary)
    expect(screen.getAllByText("50%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("65%").length).toBeGreaterThanOrEqual(1);

    // Should show +15% delta in summary
    expect(screen.getByText("+15.0%")).toBeInTheDocument();
  });
});
