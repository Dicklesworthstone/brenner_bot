/**
 * Unit tests for CrosswalkTable visualization component
 *
 * Tests table rendering, sorting behavior, and link construction.
 * Note: Next.js Link is mocked to a plain anchor.
 *
 * @see @/components/distillation/CrosswalkTable.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CrosswalkTable } from "./CrosswalkTable";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function getConceptColumn(container: HTMLElement): string[] {
  const cells = container.querySelectorAll('tbody tr td[role="gridcell"]:first-child');
  return Array.from(cells)
    .map((cell) => (cell.textContent ?? "").trim())
    .filter(Boolean);
}

describe("CrosswalkTable", () => {
  it("renders the desktop grid and core content", () => {
    const { container } = render(<CrosswalkTable />);

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Concept/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Opus 4\.5/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /GPT-5\.2/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Gemini 3/i })).toBeInTheDocument();

    const concepts = getConceptColumn(container);
    expect(concepts[0]).toBe("Foundation");

    // Desktop link text should be the cell label.
    const twoAxioms = screen.getByRole("link", { name: "Two Axioms" });
    expect(twoAxioms).toHaveAttribute("href", "/corpus/distillation-opus-45#part-i-the-two-axioms");
  });

  it("sorts by concept when the Concept header is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<CrosswalkTable />);

    expect(getConceptColumn(container)[0]).toBe("Foundation");

    const conceptHeader = screen.getByRole("columnheader", { name: /Concept/i });
    await user.click(conceptHeader);
    expect(getConceptColumn(container)[0]).toBe("Execution");

    await user.click(conceptHeader);
    expect(getConceptColumn(container)[0]).toBe("Social");
  });
});
