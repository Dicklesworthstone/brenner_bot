import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TechnicalArchitectureSection } from "./technical-architecture-section";

describe("TechnicalArchitectureSection", () => {
  it("renders the section header", () => {
    render(<TechnicalArchitectureSection />);

    expect(screen.getByText("Technical Architecture")).toBeInTheDocument();
    expect(
      screen.getByText("Built for Serious Work: Architecture That Respects Your Research"),
    ).toBeInTheDocument();
  });

  it("renders all four architecture feature blocks", () => {
    render(<TechnicalArchitectureSection />);

    expect(screen.getByText("CLI-First Design")).toBeInTheDocument();
    expect(screen.getByText("Your Terminal, Your Subscriptions, Your Control")).toBeInTheDocument();

    expect(screen.getByText("Local-First Storage")).toBeInTheDocument();
    expect(screen.getByText("Your Data Stays With You")).toBeInTheDocument();

    expect(screen.getByText("Deterministic Merging")).toBeInTheDocument();
    expect(screen.getByText("Reproducible by Design")).toBeInTheDocument();

    expect(screen.getByText("Security Model")).toBeInTheDocument();
    expect(screen.getByText("Fail-Closed, Not Fail-Open")).toBeInTheDocument();
  });

  it("renders feature benefit badges", () => {
    render(<TechnicalArchitectureSection />);

    expect(screen.getByText("No API keys to manage or leak")).toBeInTheDocument();
    expect(screen.getByText("IndexedDB for structured data")).toBeInTheDocument();
    expect(screen.getByText("Last-write-wins for conflicts")).toBeInTheDocument();
    expect(screen.getByText("Timing-safe secret comparison")).toBeInTheDocument();
  });

  it("renders the Join-Key Contract section", () => {
    render(<TechnicalArchitectureSection />);

    expect(screen.getByText("The Join-Key Contract")).toBeInTheDocument();
    expect(screen.getByText("Thread ID is the universal join key")).toBeInTheDocument();
    expect(screen.getByText("Agent Mail thread")).toBeInTheDocument();
    expect(screen.getByText("ntm session")).toBeInTheDocument();
    expect(screen.getByText("Artifact file path")).toBeInTheDocument();
    expect(screen.getByText("Beads issue ID")).toBeInTheDocument();
  });

  it("renders CLI command showcase", () => {
    render(<TechnicalArchitectureSection />);

    expect(screen.getByText("brenner-cli")).toBeInTheDocument();
    expect(screen.getByText("# Search the corpus")).toBeInTheDocument();
    expect(screen.getByText("# Start a session")).toBeInTheDocument();
    expect(screen.getByText("# Watch session status")).toBeInTheDocument();
    expect(screen.getByText("# Compile artifacts")).toBeInTheDocument();
  });

  it("renders performance stats", () => {
    render(<TechnicalArchitectureSection />);

    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("CLI startup")).toBeInTheDocument();
    expect(screen.getByText("Artifact compile")).toBeInTheDocument();
    expect(screen.getByText("Test suite")).toBeInTheDocument();
    expect(screen.getByText("4300+ tests")).toBeInTheDocument();
  });

  it("renders key principle quote", () => {
    render(<TechnicalArchitectureSection />);

    expect(screen.getByText("Key Principle")).toBeInTheDocument();
    expect(screen.getByText(/Same inputs, same outputs/)).toBeInTheDocument();
  });
});
