/**
 * Unit tests for AgentProgress component
 *
 * @see @/components/brenner-loop/AgentProgress.tsx
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentProgress } from "./AgentProgress";

describe("AgentProgress", () => {
  const steps = ["Reading", "Analyzing", "Responding"];

  it("renders agent name and progress state", () => {
    render(
      <AgentProgress agent="devils_advocate" steps={steps} currentStep={1} status="working" />,
    );

    expect(screen.getByText(/devils advocate is working/i)).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Analyzing")).toBeInTheDocument();
  });

  it("shows completion state when status is complete", () => {
    render(
      <AgentProgress agent="experiment_designer" steps={steps} currentStep={1} status="complete" />,
    );

    expect(screen.getByText(/experiment designer completed/i)).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });
});
