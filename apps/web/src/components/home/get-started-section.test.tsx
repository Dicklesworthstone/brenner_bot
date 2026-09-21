import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GetStartedSection } from "./get-started-section";

describe("GetStartedSection", () => {
  it("renders the section header", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.getByText("Ready to Transform Your Research?")).toBeInTheDocument();
  });

  it("renders the installation command block", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("One Command to Get Started")).toBeInTheDocument();
    expect(screen.getByText(/curl -fsSL/)).toBeInTheDocument();
  });

  it("renders installation options", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("--easy-mode")).toBeInTheDocument();
    expect(screen.getByText("--verify")).toBeInTheDocument();
    expect(screen.getByText("--system")).toBeInTheDocument();
    expect(screen.getByText("Minimal prompts")).toBeInTheDocument();
  });

  it("renders all three user paths", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("For Researchers")).toBeInTheDocument();
    expect(screen.getByText("Run your first Brenner session")).toBeInTheDocument();

    expect(screen.getByText("For Developers")).toBeInTheDocument();
    expect(screen.getByText("Contribute to the project")).toBeInTheDocument();

    expect(screen.getByText("For the Curious")).toBeInTheDocument();
    expect(screen.getByText("Understand the method first")).toBeInTheDocument();
  });

  it("renders user path steps", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("Install the CLI")).toBeInTheDocument();
    expect(screen.getByText("Clone the repository")).toBeInTheDocument();
    expect(screen.getByText("Read the Brenner method overview")).toBeInTheDocument();
  });

  it("renders user path CTAs", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("Start Researching")).toBeInTheDocument();
    expect(screen.getByText("View on GitHub")).toBeInTheDocument();
    expect(screen.getByText("Learn the Method")).toBeInTheDocument();
  });

  it("renders quick start preview", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("Quick Start Preview")).toBeInTheDocument();
    expect(screen.getByText("Your first session in 4 steps")).toBeInTheDocument();
    expect(screen.getByText("# Verify installation")).toBeInTheDocument();
    expect(screen.getByText("# Search the corpus")).toBeInTheDocument();
  });

  it("renders social proof badges", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("MIT License")).toBeInTheDocument();
    expect(screen.getByText("4300+ Tests")).toBeInTheDocument();
    expect(screen.getByText("100% Open Source")).toBeInTheDocument();
  });

  it("renders final CTA", () => {
    render(<GetStartedSection />);

    expect(screen.getByText("Get Started Now")).toBeInTheDocument();
    expect(screen.getByText("Read the Docs")).toBeInTheDocument();
    expect(screen.getByText("View Source")).toBeInTheDocument();
  });

  it("renders footer note about open source", () => {
    render(<GetStartedSection />);

    expect(screen.getByText(/Brenner Bot is 100% free and open source/)).toBeInTheDocument();
    expect(screen.getByText(/No hidden costs, no data collection/)).toBeInTheDocument();
  });
});
