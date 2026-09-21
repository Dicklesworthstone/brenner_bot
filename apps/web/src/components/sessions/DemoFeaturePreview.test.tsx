import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DemoFeaturePreview } from "./DemoFeaturePreview";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("DemoFeaturePreview", () => {
  it("renders feature name and description", () => {
    render(
      <DemoFeaturePreview
        threadId="demo-test-001"
        featureName="Evidence Pack"
        featureDescription="Collect external evidence"
      />,
    );

    expect(screen.getByText("Evidence Pack - Demo Preview")).toBeInTheDocument();
    expect(screen.getByText("Collect external evidence")).toBeInTheDocument();
  });

  it("includes back link to demo session", () => {
    render(
      <DemoFeaturePreview
        threadId="demo-test-001"
        featureName="Test Feature"
        featureDescription="Description"
      />,
    );

    const backLink = screen.getByRole("link", {
      name: /back to demo session/i,
    });
    expect(backLink).toHaveAttribute("href", "/sessions/demo-test-001");
  });

  it("includes learn how to set up link", () => {
    render(
      <DemoFeaturePreview
        threadId="demo-test-001"
        featureName="Test Feature"
        featureDescription="Description"
      />,
    );

    const learnMore = screen.getByRole("link", {
      name: /learn how to set up/i,
    });
    expect(learnMore).toHaveAttribute("href", "/tutorial/quick-start");
  });
});
