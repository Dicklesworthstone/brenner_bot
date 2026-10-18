import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TutorialExamplePage, {
  generateMetadata,
  generateStaticParams,
} from "./page";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

describe("TutorialExamplePage (/tutorial/examples/[slug])", () => {
  it("generates static params for all worked domain examples", () => {
    const slugs = generateStaticParams().map((item) => item.slug);
    expect(slugs).toContain("biology-cell-fate");
    expect(slugs).toContain("cs-llm-hallucination");
    expect(slugs).toContain("social-community-toxicity");
    expect(slugs.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves Next.js 16 async params in generateMetadata", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "biology-cell-fate" }),
    });
    expect(metadata.title).toContain("Cell Fate");

    const missingMetadata = await generateMetadata({
      params: Promise.resolve({ slug: "non-existent-example" }),
    });
    expect(missingMetadata.title).toBe("Example Not Found");
  });

  it("renders worked domain example with 7-Dimension Brenner Scorecard and transcript anchor links from async params", async () => {
    const ui = await TutorialExamplePage({
      params: Promise.resolve({ slug: "biology-cell-fate" }),
    });
    render(ui);

    expect(screen.getByTestId("example-brenner-scorecard")).toBeInTheDocument();
    expect(screen.getByTestId("example-scorecard-grade")).toHaveTextContent(/Grade [A-F]/);
    expect(screen.getByTestId("example-dimension-paradoxGrounding")).toBeInTheDocument();
    expect(screen.getByTestId("example-dimension-thirdAlternativeDiscovery")).toBeInTheDocument();
    expect(screen.getByTestId("example-third-alt-summary")).toHaveTextContent(/Third alternative/i);

    const anchorLink = screen.getByTestId("excerpt-anchor-link-§58");
    expect(anchorLink).toHaveAttribute("href", "/corpus/transcript#section-58");
  });

  it("invokes notFound() for unknown example slugs", async () => {
    await expect(
      TutorialExamplePage({
        params: Promise.resolve({ slug: "does-not-exist" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });
});
