import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";

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
 * Create a mock HypothesisCard for testing
 */
function createMockHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  const now = new Date();
  return {
    id: "HC-test-001-v1",
    version: 1,
    statement: "Social media algorithm-driven content causes increased depression in teenagers",
    mechanism: "Algorithm amplifies negative content leading to comparison and isolation",
    domain: ["psychology", "technology"],
    predictionsIfTrue: [
      "Teens with higher social media usage will report more depressive symptoms",
      "Disabling algorithmic feeds should reduce depression scores",
    ],
    predictionsIfFalse: [
      "Depression rates should be similar regardless of social media usage patterns",
      "Chronically depressed teens should not show increased social media usage",
    ],
    impossibleIfTrue: ["Teens using social media extensively show improved mental health outcomes"],
    confounds: [],
    assumptions: ["Social media usage is measurable and quantifiable"],
    confidence: 50,
    tags: ["social-media", "mental-health", "teenagers"],
    createdAt: now,
    updatedAt: now,
    createdBy: "test-user",
    ...overrides,
  };
}

describe("LiteratureSearch", () => {
  it("renders with title and description", async () => {
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    expect(screen.getByText("Literature Search")).toBeInTheDocument();
    expect(screen.getByText(/Search for relevant papers/i)).toBeInTheDocument();
  });

  it("renders tabs for different search modes", async () => {
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    expect(screen.getByRole("tab", { name: /suggested/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /import/i })).toBeInTheDocument();
  });

  it("shows suggested searches based on hypothesis", async () => {
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Should show suggested searches content by default
    expect(screen.getByText(/Suggested searches based on your hypothesis/i)).toBeInTheDocument();
    expect(screen.getByText("Primary Search")).toBeInTheDocument();
  });

  it("switches to manual search tab", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Click on search tab
    const searchTab = screen.getByRole("tab", { name: /search/i });
    await user.click(searchTab);

    // Should show search input
    expect(screen.getByPlaceholderText(/Search for papers/i)).toBeInTheDocument();
  });

  it("switches to import tab", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Click on import tab
    const importTab = screen.getByRole("tab", { name: /import/i });
    await user.click(importTab);

    // Should show import options
    expect(screen.getByText(/Import from BibTeX/i)).toBeInTheDocument();
    expect(screen.getByText(/Lookup by DOI/i)).toBeInTheDocument();
  });

  it("shows BibTeX input in import tab", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Switch to import tab
    const importTab = screen.getByRole("tab", { name: /import/i });
    await user.click(importTab);

    // Should have BibTeX textarea
    const bibtexInput = screen.getByPlaceholderText(/Paste BibTeX entry here/i);
    expect(bibtexInput).toBeInTheDocument();
  });

  it("shows DOI input in import tab", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Switch to import tab
    const importTab = screen.getByRole("tab", { name: /import/i });
    await user.click(importTab);

    // Should have DOI input
    const doiInput = screen.getByPlaceholderText(/10\.1234\/example/i);
    expect(doiInput).toBeInTheDocument();
  });

  it("parses BibTeX entry when submitted", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Switch to import tab
    const importTab = screen.getByRole("tab", { name: /import/i });
    await user.click(importTab);

    // Enter BibTeX using fireEvent.change (userEvent.type interprets {} as keyboard modifiers)
    const bibtexInput = screen.getByPlaceholderText(/Paste BibTeX entry here/i);
    const bibtexContent = `@article{test2023,
      title = {Social Media Effects on Teen Mental Health},
      author = {Smith, John},
      year = {2023}
    }`;

    // Use fireEvent.change for text with special characters
    fireEvent.change(bibtexInput, { target: { value: bibtexContent } });

    // Click parse button
    const parseButton = screen.getByRole("button", { name: /Parse BibTeX/i });
    await user.click(parseButton);

    // Should show imported paper
    expect(screen.getByText("Imported Paper")).toBeInTheDocument();
    // Title may appear multiple times (header and card), so use getAllByText
    expect(
      screen.getAllByText(/Social Media Effects on Teen Mental Health/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows error for invalid BibTeX", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Switch to import tab
    const importTab = screen.getByRole("tab", { name: /import/i });
    await user.click(importTab);

    // Enter invalid BibTeX
    const bibtexInput = screen.getByPlaceholderText(/Paste BibTeX entry here/i);
    await user.type(bibtexInput, "not valid bibtex");

    // Click parse button
    const parseButton = screen.getByRole("button", { name: /Parse BibTeX/i });
    await user.click(parseButton);

    // Should show error
    expect(screen.getByText(/Could not parse BibTeX/i)).toBeInTheDocument();
  });

  it("shows error for invalid DOI", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Switch to import tab
    const importTab = screen.getByRole("tab", { name: /import/i });
    await user.click(importTab);

    // Enter invalid DOI
    const doiInput = screen.getByPlaceholderText(/10\.1234\/example/i);
    await user.type(doiInput, "invalid-doi");

    // Click lookup button
    const lookupButton = screen.getByRole("button", { name: /Lookup/i });
    await user.click(lookupButton);

    // Should show error
    expect(screen.getByText(/Invalid DOI format/i)).toBeInTheDocument();
  });

  it("shows keywords from hypothesis", async () => {
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Should show key terms section
    expect(screen.getByText("Key Terms")).toBeInTheDocument();
  });

  it("shows empty state when no papers", async () => {
    const user = userEvent.setup();
    const { LiteratureSearch } = await import("./LiteratureSearch");
    render(
      <LiteratureSearch
        sessionId="test-session"
        hypothesis={createMockHypothesis()}
        currentConfidence={50}
      />,
    );

    // Switch to search tab (not suggested)
    const searchTab = screen.getByRole("tab", { name: /search/i });
    await user.click(searchTab);

    // Should show empty state
    expect(screen.getByText("No papers yet")).toBeInTheDocument();
  });
});
