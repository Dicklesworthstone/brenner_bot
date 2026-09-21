/**
 * Unit tests for BayesianCrosswalk visualization component
 *
 * Tests real rendering and expand/collapse interaction for one mapping row.
 * Note: Next.js Link is mocked for Jargon-internal links.
 *
 * @see @/components/method/BayesianCrosswalk.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BayesianCrosswalk } from "./BayesianCrosswalk";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("BayesianCrosswalk", () => {
  it("renders key headings", () => {
    render(<BayesianCrosswalk />);
    expect(screen.getByRole("heading", { name: "The Bayesian Crosswalk" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Brenner Objective Function" }),
    ).toBeInTheDocument();
  });

  it("expands and collapses a mapping row, including transcript links", async () => {
    const user = userEvent.setup();
    render(<BayesianCrosswalk />);

    const row = screen.getByRole("button", { name: /third alternative/i });
    expect(
      screen.queryByText(/When two competing theories both have problems/i),
    ).not.toBeInTheDocument();

    await user.click(row);
    expect(screen.getByText(/When two competing theories both have problems/i)).toBeInTheDocument();

    const transcriptLink = screen.getByRole("link", { name: "§58" });
    expect(transcriptLink).toHaveAttribute("href", "/corpus/transcript#section-58");

    await user.click(row);
    expect(
      screen.queryByText(/When two competing theories both have problems/i),
    ).not.toBeInTheDocument();
  });
});
