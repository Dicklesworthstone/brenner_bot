/**
 * Tests for SectionDataProvider component
 *
 * Tests the context provider that loads and provides section metadata.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionDataProvider, useSectionData } from "./section-data-provider";

// Test consumer component
function TestConsumer({ sectionNum }: { sectionNum: number }) {
  const { getSection, isLoaded } = useSectionData();
  const section = getSection(sectionNum);

  return (
    <div>
      <span data-testid="is-loaded">{isLoaded ? "loaded" : "loading"}</span>
      {section && (
        <>
          <span data-testid="section-title">{section.title}</span>
          <span data-testid="section-excerpt">{section.excerpt}</span>
        </>
      )}
      {!section && isLoaded && <span data-testid="section-not-found">not found</span>}
    </div>
  );
}

// Mock section data matching the expected format
const mockSectionData = {
  "1": { t: "Section One Title", e: "Excerpt for section one" },
  "2": { t: "Section Two Title", e: "Excerpt for section two" },
  "58": { t: "Famous Quote Section", e: "A memorable excerpt" },
};

describe("SectionDataProvider", () => {
  beforeEach(() => {
    // Reset fetch mock
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("provides isLoaded=false initially", async () => {
    // Slow response that doesn't resolve immediately
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SectionDataProvider>
        <TestConsumer sectionNum={1} />
      </SectionDataProvider>,
    );

    expect(screen.getByTestId("is-loaded")).toHaveTextContent("loading");
  });

  it("fetches section data and provides it via context", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionData),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SectionDataProvider>
        <TestConsumer sectionNum={1} />
      </SectionDataProvider>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId("is-loaded")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("section-title")).toHaveTextContent("Section One Title");
    expect(screen.getByTestId("section-excerpt")).toHaveTextContent("Excerpt for section one");
  });

  it("fetches from correct endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionData),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SectionDataProvider>
        <TestConsumer sectionNum={1} />
      </SectionDataProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/search/sections.json");
    });
  });

  it("returns null for non-existent sections", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionData),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SectionDataProvider>
        <TestConsumer sectionNum={999} />
      </SectionDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-loaded")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("section-not-found")).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SectionDataProvider>
        <TestConsumer sectionNum={1} />
      </SectionDataProvider>,
    );

    // Should still become loaded (with empty data) after error
    await waitFor(() => {
      expect(screen.getByTestId("is-loaded")).toHaveTextContent("loaded");
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to load section data:", expect.any(Error));

    consoleWarnSpy.mockRestore();
  });

  it("handles non-ok response", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SectionDataProvider>
        <TestConsumer sectionNum={1} />
      </SectionDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-loaded")).toHaveTextContent("loaded");
    });

    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it("converts string keys to numbers correctly", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          "58": { t: "Section 58", e: "Famous section" },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SectionDataProvider>
        <TestConsumer sectionNum={58} />
      </SectionDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("section-title")).toHaveTextContent("Section 58");
    });
  });

  it("does not refetch if data already loaded", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionData),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <SectionDataProvider>
        <TestConsumer sectionNum={1} />
      </SectionDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-loaded")).toHaveTextContent("loaded");
    });

    // Rerender with different section
    rerender(
      <SectionDataProvider>
        <TestConsumer sectionNum={2} />
      </SectionDataProvider>,
    );

    // Should still only have fetched once
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // But should have data for section 2
    await waitFor(() => {
      expect(screen.getByTestId("section-title")).toHaveTextContent("Section Two Title");
    });
  });
});

describe("useSectionData hook", () => {
  it("returns default values outside provider", () => {
    // Render without provider
    function TestComponent() {
      const { getSection, isLoaded } = useSectionData();
      return (
        <div>
          <span data-testid="is-loaded">{isLoaded ? "yes" : "no"}</span>
          <span data-testid="section">{getSection(1) === null ? "null" : "data"}</span>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId("is-loaded")).toHaveTextContent("no");
    expect(screen.getByTestId("section")).toHaveTextContent("null");
  });
});
