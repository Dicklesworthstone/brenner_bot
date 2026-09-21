import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QualityAssuranceSection } from "./quality-assurance-section";

describe("QualityAssuranceSection", () => {
  it("renders the section header", () => {
    render(<QualityAssuranceSection />);

    expect(screen.getByText("Research Hygiene")).toBeInTheDocument();
    expect(screen.getByText("Built-In Guardrails for Rigorous Science")).toBeInTheDocument();
  });

  it("renders all four feature blocks", () => {
    render(<QualityAssuranceSection />);

    expect(screen.getByText("Coach Mode")).toBeInTheDocument();
    expect(screen.getByText("Learn the Method While You Work")).toBeInTheDocument();

    expect(screen.getByText("Prediction Lock")).toBeInTheDocument();
    expect(screen.getByText("Prevent Hindsight Bias")).toBeInTheDocument();

    expect(screen.getByText("Calibration Tracking")).toBeInTheDocument();
    expect(screen.getByText("Know Your Accuracy")).toBeInTheDocument();

    expect(screen.getByText("Confound Detection")).toBeInTheDocument();
    expect(screen.getByText("See What You Might Miss")).toBeInTheDocument();
  });

  it("renders research domain badges", () => {
    render(<QualityAssuranceSection />);

    expect(screen.getByText("Psychology")).toBeInTheDocument();
    expect(screen.getByText("Epidemiology")).toBeInTheDocument();
    expect(screen.getByText("Economics")).toBeInTheDocument();
    expect(screen.getByText("Biology")).toBeInTheDocument();
    expect(screen.getByText("Sociology")).toBeInTheDocument();
    expect(screen.getByText("Neuroscience")).toBeInTheDocument();
  });

  it("renders artifact linting section", () => {
    render(<QualityAssuranceSection />);

    expect(screen.getByText("Artifact Linting")).toBeInTheDocument();
    expect(screen.getByText("50+ rules for research hygiene")).toBeInTheDocument();
    expect(screen.getByText("Hypothesis Hygiene")).toBeInTheDocument();
    expect(screen.getByText("Test Design")).toBeInTheDocument();
  });

  it("renders the comparison table", () => {
    render(<QualityAssuranceSection />);

    expect(screen.getByText("Without Guardrails vs. With BrennerBot")).toBeInTheDocument();
    expect(screen.getByText("Without Guardrails")).toBeInTheDocument();
    expect(screen.getByText("With BrennerBot")).toBeInTheDocument();
    expect(screen.getByText("Predictions locked before execution")).toBeInTheDocument();
  });

  it("renders feature highlights for coach mode", () => {
    render(<QualityAssuranceSection />);

    expect(screen.getByText("Three levels: beginner, intermediate, advanced")).toBeInTheDocument();
    expect(screen.getByText("Auto-promotes based on tracked progress")).toBeInTheDocument();
  });
});
