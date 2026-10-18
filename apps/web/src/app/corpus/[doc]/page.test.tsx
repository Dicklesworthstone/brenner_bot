import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import CorpusDocPage from "./page";

vi.mock("./DocumentContentClient", () => ({
  DocumentContentClient: ({ docId }: { docId: string }) => (
    <div data-testid="mock-doc-content">{docId}</div>
  ),
}));

vi.mock("./DocumentSwipeNavClient", () => ({
  DocumentSwipeNavClient: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("CorpusDocPage", () => {
  it("renders Primary Transcript Cross-References with indexed section count, landmark anchors, and related search hits", async () => {
    const jsx = await CorpusDocPage({
      params: Promise.resolve({ doc: "distillation-gpt-52" }),
    });
    const queryClient = new QueryClient();
    render(<QueryClientProvider client={queryClient}>{jsx}</QueryClientProvider>);

    const crossRefs = screen.getByTestId("corpus-related-transcript-sections");
    expect(crossRefs).toBeInTheDocument();
    expect(crossRefs).toHaveTextContent("Primary Transcript Cross-References");
    expect(crossRefs).toHaveTextContent("236 indexed sections");
    expect(crossRefs).toHaveTextContent(/matches/);
    expect(crossRefs).toHaveTextContent("§1");
    expect(crossRefs).toHaveTextContent("§103");
  });
});
