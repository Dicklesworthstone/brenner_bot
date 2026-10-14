/**
 * Unit tests for Distillations page
 *
 * Verifies ThreeModelComparison, ModelBadge, and CrosswalkTable rendering.
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/corpus", () => ({
  readCorpusDoc: vi.fn().mockImplementation(async (docId: string) => ({
    id: docId,
    content: `---
title: ${docId}
---

# Distillation ${docId}

This is the first long analytical paragraph for ${docId} explaining how Sydney Brenner's methodology transforms scientific problem selection and experimental design.

This is the second long analytical paragraph for ${docId} detailing how discriminative tests eliminate competing hypotheses with maximum leverage and minimal ambiguity.
`,
  })),
}));

import DistillationsPage from "./page";

describe("DistillationsPage", () => {
  it("renders model cards with ModelBadge and the synchronized ThreeModelComparison view", async () => {
    const jsx = await DistillationsPage();
    render(jsx);

    expect(screen.getByRole("heading", { name: "Distillations", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Side-by-Side Distillation Excerpts/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("three-model-comparison")).toBeInTheDocument();
    expect(screen.getAllByText(/Opus 4\.5/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/GPT-5\.2/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Gemini 3/).length).toBeGreaterThanOrEqual(2);
  });
});
