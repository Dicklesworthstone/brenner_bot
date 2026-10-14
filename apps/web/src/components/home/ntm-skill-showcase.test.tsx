/**
 * Unit tests for NtmSkillShowcase component
 *
 * Tests interactive tab navigation, 10-phase loop stepper, 6 operating modes,
 * 6 NTM YAML pipelines, Opportunity Matrix formula, and jsm/ntm install commands.
 *
 * @see brenner_bot-9ohr
 * @see brenner_bot-57nm
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NtmSkillShowcase } from "./ntm-skill-showcase";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NtmSkillShowcase", () => {
  it("renders the header and all 4 interactive tabs", () => {
    render(<NtmSkillShowcase />);

    expect(screen.getByText(/NEW: \/brennerbot-with-ntm Skill/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /1\. Install via jsm & NTM/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /2\. 10-Phase Mandatory Loop/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /3\. 6 Modes & 5 Roles/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /4\. 6 NTM Pipelines & Matrix/i })).toBeInTheDocument();
  });

  it("shows jsm install and ntm robot flag commands on the default Install tab", () => {
    render(<NtmSkillShowcase />);

    expect(screen.getByText(/jsm install brennerbot-with-ntm/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ntm spawn <sess> --cc=2 --cod=1 --gmi=1 --agy=1/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ntm --robot-snapshot \/ --robot-attention/i)).toBeInTheDocument();
  });

  it("switches to the 10-Phase Mandatory Loop tab and allows selecting phases", async () => {
    const user = userEvent.setup();
    render(<NtmSkillShowcase />);

    await user.click(screen.getByRole("tab", { name: /2\. 10-Phase Mandatory Loop/i }));

    expect(screen.getByText("PREFLIGHT")).toBeInTheDocument();
    expect(screen.getByText("TEST")).toBeInTheDocument();
    expect(screen.getByText("DRIFT")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Phase 4.*TEST/i }));
    expect(
      screen.getByText(/Refuter-First Discriminative Tests & Potency Controls/i),
    ).toBeInTheDocument();
  });

  it("switches to the 6 Modes & 5 Roles tab and allows selecting operating modes", async () => {
    const user = userEvent.setup();
    render(<NtmSkillShowcase />);

    await user.click(screen.getByRole("tab", { name: /3\. 6 Modes & 5 Roles/i }));

    expect(screen.getAllByText("Fresh Question").length).toBeGreaterThan(0);
    expect(screen.getByText("Incident Investigation")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Incident Investigation/i }));
    expect(screen.getByText(/High-velocity compressed loop/i)).toBeInTheDocument();
  });

  it("switches to the 6 NTM Pipelines & Matrix tab and switches YAML pipelines", async () => {
    const user = userEvent.setup();
    render(<NtmSkillShowcase />);

    await user.click(screen.getByRole("tab", { name: /4\. 6 NTM Pipelines & Matrix/i }));

    expect(screen.getAllByText(/brennerbot-squad\.yaml/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "brennerbot-incident.yaml" }));
    expect(
      screen.getByText(/Launch compressed incident falsification loop/i),
    ).toBeInTheDocument();
  });
});
