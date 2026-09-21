/**
 * Unit tests for Method page
 *
 * Tests the method page rendering, operators display, core principles,
 * interactive diagram, and navigation links.
 *
 * @see @/app/method/page.tsx
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MethodPage from "./page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock the BrennerLoopDiagram component (it's interactive/complex)
vi.mock("@/components/method/BrennerLoopDiagram", () => ({
  BrennerLoopDiagram: () => <div data-testid="brenner-loop-diagram">Brenner Loop Diagram</div>,
}));

describe("MethodPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("header section", () => {
    it("displays the page title", () => {
      render(<MethodPage />);

      expect(
        screen.getByRole("heading", { name: /brenner method/i, level: 1 }),
      ).toBeInTheDocument();
    });

    it("shows the subtitle", () => {
      render(<MethodPage />);

      expect(screen.getByText(/framework for scientific discovery/i)).toBeInTheDocument();
    });

    it("shows the methodology description", () => {
      render(<MethodPage />);

      expect(
        screen.getByText(/sydney brenner developed.*distinctive approach/i),
      ).toBeInTheDocument();
    });
  });

  describe("interactive diagram section", () => {
    it("displays the Interactive Diagram badge", () => {
      render(<MethodPage />);

      expect(screen.getByText(/interactive diagram/i)).toBeInTheDocument();
    });

    it("shows The Brenner Loop heading", () => {
      render(<MethodPage />);

      expect(screen.getByRole("heading", { name: /brenner loop/i })).toBeInTheDocument();
    });

    it("renders the BrennerLoopDiagram component", () => {
      render(<MethodPage />);

      expect(screen.getByTestId("brenner-loop-diagram")).toBeInTheDocument();
    });

    it("shows diagram instructions", () => {
      render(<MethodPage />);

      expect(screen.getByText(/hover over each stage to explore/i)).toBeInTheDocument();
    });
  });

  describe("operators section", () => {
    it("displays the Operators heading", () => {
      render(<MethodPage />);

      expect(screen.getByRole("heading", { name: /^operators$/i })).toBeInTheDocument();
    });

    it("shows all five operators", () => {
      render(<MethodPage />);

      expect(screen.getByText("Generate Hypotheses")).toBeInTheDocument();
      expect(screen.getByText("Design Discriminative Test")).toBeInTheDocument();
      expect(screen.getByText("Execute & Observe")).toBeInTheDocument();
      expect(screen.getByText("Update Beliefs")).toBeInTheDocument();
      expect(screen.getByText("Iterate or Terminate")).toBeInTheDocument();
    });

    it("shows operator short codes", () => {
      render(<MethodPage />);

      expect(screen.getByText("GEN")).toBeInTheDocument();
      expect(screen.getByText("TEST")).toBeInTheDocument();
      expect(screen.getByText("RUN")).toBeInTheDocument();
      expect(screen.getByText("UPD")).toBeInTheDocument();
      expect(screen.getByText("LOOP")).toBeInTheDocument();
    });

    it("shows operator descriptions", () => {
      render(<MethodPage />);

      expect(screen.getByText(/produce multiple competing explanations/i)).toBeInTheDocument();
      expect(screen.getByText(/create an experiment that differentiates/i)).toBeInTheDocument();
      expect(screen.getByText(/perform the experiment and record results/i)).toBeInTheDocument();
      expect(screen.getByText(/revise probability estimates/i)).toBeInTheDocument();
      expect(screen.getByText(/decide whether to continue investigation/i)).toBeInTheDocument();
    });

    it("shows operator examples", () => {
      render(<MethodPage />);

      // GEN examples
      expect(screen.getByText("What could cause this phenotype?")).toBeInTheDocument();
      expect(screen.getByText("Brainstorm alternatives")).toBeInTheDocument();

      // TEST examples
      expect(screen.getByText("Knockout experiment")).toBeInTheDocument();
      expect(screen.getByText("Rescue assay")).toBeInTheDocument();

      // RUN examples
      expect(screen.getByText("Run the experiment")).toBeInTheDocument();
      expect(screen.getByText("Document anomalies")).toBeInTheDocument();

      // UPD examples
      expect(screen.getByText("Increase P(H1)")).toBeInTheDocument();
      expect(screen.getByText("Eliminate H3")).toBeInTheDocument();

      // LOOP examples
      expect(screen.getByText("Run another test")).toBeInTheDocument();
      expect(screen.getByText("Publish result")).toBeInTheDocument();
    });
  });

  describe("core principles section", () => {
    it("displays the Core Principles heading", () => {
      render(<MethodPage />);

      expect(screen.getByRole("heading", { name: /core principles/i })).toBeInTheDocument();
    });

    it("shows all four principles", () => {
      render(<MethodPage />);

      expect(screen.getByText("Empirical Constraint")).toBeInTheDocument();
      expect(screen.getByText("Epistemic Humility")).toBeInTheDocument();
      expect(screen.getByText("Problem Selection")).toBeInTheDocument();
      expect(screen.getByText("Hands-On Intuition")).toBeInTheDocument();
    });

    it("shows principle descriptions", () => {
      render(<MethodPage />);

      expect(screen.getByText(/theory follows experiment.*not the other way/i)).toBeInTheDocument();
      const humilityHeading = screen.getByRole("heading", { name: "Epistemic Humility" });
      const humilityCard = humilityHeading.parentElement;
      expect(humilityCard).not.toBeNull();
      expect(humilityCard).toHaveTextContent(/hold all hypotheses loosely/i);
      expect(screen.getByText(/choosing the right problem is more important/i)).toBeInTheDocument();
      expect(
        screen.getByText(/build intuition through direct experimentation/i),
      ).toBeInTheDocument();
    });
  });

  describe("Go Deeper section", () => {
    it("displays the Go Deeper heading", () => {
      render(<MethodPage />);

      expect(screen.getByRole("heading", { name: /go deeper/i })).toBeInTheDocument();
    });

    it("shows Corpus link card", () => {
      render(<MethodPage />);

      const corpusLink = screen.getByRole("link", { name: /corpus.*browse/i });
      expect(corpusLink).toHaveAttribute("href", "/corpus");
      expect(
        screen.getByText(/primary sources with the original transcripts/i),
      ).toBeInTheDocument();
    });

    it("shows Distillations link card", () => {
      render(<MethodPage />);

      const distillationsLink = screen.getByRole("link", {
        name: /distillations.*compare/i,
      });
      expect(distillationsLink).toHaveAttribute("href", "/distillations");
      expect(screen.getByText(/three frontier model analyses/i)).toBeInTheDocument();
    });

    it("shows link labels", () => {
      render(<MethodPage />);

      expect(screen.getByText("Browse corpus")).toBeInTheDocument();
      expect(screen.getByText("Compare models")).toBeInTheDocument();
    });
  });

  describe("planned features section", () => {
    it("shows PLANNED badge", () => {
      render(<MethodPage />);

      expect(screen.getByText("PLANNED")).toBeInTheDocument();
    });

    it("displays Coming Soon heading", () => {
      render(<MethodPage />);

      expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });

    it("lists planned features", () => {
      render(<MethodPage />);

      expect(screen.getByText(/interactive operator palette/i)).toBeInTheDocument();
      expect(screen.getByText(/example walkthroughs from historical/i)).toBeInTheDocument();
    });

    it("shows the Bayesian Crosswalk section (now implemented)", () => {
      render(<MethodPage />);

      // The Bayesian Crosswalk is now a fully implemented interactive component
      expect(screen.getByText(/the bayesian crosswalk/i)).toBeInTheDocument();
      expect(screen.getByText(/implicit bayesianism/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper heading hierarchy", () => {
      render(<MethodPage />);

      // H1 for main title
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(/brenner method/i);

      // H2 for sections
      const h2s = screen.getAllByRole("heading", { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);

      // H3 for subsections (principles, operators)
      const h3s = screen.getAllByRole("heading", { level: 3 });
      expect(h3s.length).toBeGreaterThan(0);
    });

    it("all links are keyboard accessible", () => {
      render(<MethodPage />);

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => {
        expect(link).toBeVisible();
        expect(link).toHaveAttribute("href");
      });
    });
  });
});
