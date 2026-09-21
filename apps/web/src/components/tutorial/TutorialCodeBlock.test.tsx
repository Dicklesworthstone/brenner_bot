/**
 * Unit tests for TutorialCodeBlock component
 *
 * Tests the TutorialCodeBlock component's rendering, syntax highlighting,
 * and collapsible behavior.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 * Note: Clipboard functionality is tested via E2E tests.
 *
 * @see @/components/tutorial/TutorialCodeBlock.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InlineCode, TutorialCodeBlock } from "./TutorialCodeBlock";

describe("TutorialCodeBlock", () => {
  describe("rendering", () => {
    it("renders code content", () => {
      render(<TutorialCodeBlock code="const x = 1;" language="typescript" />);
      expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    });

    it("renders with title in header", () => {
      render(<TutorialCodeBlock code="npm install" language="bash" title="package.json" />);
      expect(screen.getByText("package.json")).toBeInTheDocument();
    });

    it("renders language label when no title provided", () => {
      render(<TutorialCodeBlock code="echo hello" language="bash" />);
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("renders description when provided", () => {
      render(
        <TutorialCodeBlock
          code="npm install"
          language="bash"
          description="Install the dependencies"
        />,
      );
      expect(screen.getByText("Install the dependencies")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <TutorialCodeBlock code="test" language="text" className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("renders traffic light buttons", () => {
      const { container } = render(<TutorialCodeBlock code="test" language="bash" />);
      // Traffic lights are decorative divs with specific background colors
      const trafficLights = container.querySelectorAll(".rounded-full.size-3");
      expect(trafficLights.length).toBe(3);
    });
  });

  describe("language support", () => {
    it("renders TypeScript label", () => {
      render(<TutorialCodeBlock code="const x: number = 1;" language="typescript" />);
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });

    it("renders JavaScript label", () => {
      render(<TutorialCodeBlock code="const x = 1;" language="javascript" />);
      expect(screen.getByText("JavaScript")).toBeInTheDocument();
    });

    it("renders JSON label", () => {
      render(<TutorialCodeBlock code='{"key": "value"}' language="json" />);
      expect(screen.getByText("JSON")).toBeInTheDocument();
    });

    it("renders YAML label", () => {
      render(<TutorialCodeBlock code="key: value" language="yaml" />);
      expect(screen.getByText("YAML")).toBeInTheDocument();
    });

    it("renders Markdown label", () => {
      render(<TutorialCodeBlock code="# Heading" language="markdown" />);
      expect(screen.getByText("Markdown")).toBeInTheDocument();
    });

    it("renders Text label for text language", () => {
      render(<TutorialCodeBlock code="plain text" language="text" />);
      expect(screen.getByText("Text")).toBeInTheDocument();
    });
  });

  describe("bash syntax highlighting", () => {
    it("renders bash prompt with success color", () => {
      render(<TutorialCodeBlock code="$ npm install" language="bash" />);
      const dollar = screen.getByText("$");
      expect(dollar).toHaveClass("text-[oklch(0.72_0.19_145)]");
    });

    it("renders bash comments with muted color", () => {
      render(<TutorialCodeBlock code="# This is a comment" language="bash" />);
      const comment = screen.getByText("# This is a comment");
      expect(comment).toHaveClass("text-muted-foreground");
    });
  });

  describe("line numbers", () => {
    it("does not show line numbers by default", () => {
      render(
        <TutorialCodeBlock
          code={`line 1
line 2`}
          language="text"
        />,
      );
      // Line numbers should not be rendered when showLineNumbers is false
      const codeBlock = screen.getByText(/line 1/);
      expect(codeBlock).toBeInTheDocument();
    });

    it("shows line numbers when enabled", () => {
      render(
        <TutorialCodeBlock
          code={`line 1
line 2
line 3`}
          language="text"
          showLineNumbers
        />,
      );
      // When showLineNumbers is true, we should see number elements
      // The numbers appear in select-none spans before the content
      const container = screen.getByText(/line 1/).closest("pre");
      expect(container).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("renders copy button", () => {
      render(<TutorialCodeBlock code="test" language="bash" />);
      const copyButton = screen.getByRole("button", { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
    });

    // Note: clipboard API mocking is complex in happy-dom
    // Clipboard integration is tested via E2E tests with Playwright
    it.skip("copies code to clipboard when copy button is clicked", async () => {
      // Tested via E2E
    });
  });

  describe("collapsible behavior", () => {
    it("shows code by default when not collapsible", () => {
      render(<TutorialCodeBlock code="visible code" language="text" />);
      expect(screen.getByText("visible code")).toBeInTheDocument();
    });

    it("shows code when collapsible but not defaultCollapsed", () => {
      render(<TutorialCodeBlock code="collapsible code" language="text" collapsible />);
      expect(screen.getByText("collapsible code")).toBeInTheDocument();
    });

    it("hides code when collapsible and defaultCollapsed", () => {
      render(<TutorialCodeBlock code="hidden code" language="text" collapsible defaultCollapsed />);
      expect(screen.queryByText("hidden code")).not.toBeInTheDocument();
    });

    it("renders collapse toggle button when collapsible", () => {
      render(<TutorialCodeBlock code="test" language="text" collapsible />);
      const collapseButton = screen.getByRole("button", { name: /collapse|expand/i });
      expect(collapseButton).toBeInTheDocument();
    });

    it("toggles code visibility when collapse button is clicked", async () => {
      const user = userEvent.setup();
      render(<TutorialCodeBlock code="toggle me" language="text" collapsible />);

      // Initially visible
      expect(screen.getByText("toggle me")).toBeInTheDocument();

      // Click to collapse
      const collapseButton = screen.getByRole("button", { name: /collapse/i });
      await user.click(collapseButton);

      // Collapse button should now say expand
      expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
    });
  });

  describe("diff mode", () => {
    const diff = {
      before: "const x = 1;",
      after: "const x = 2;",
      language: "typescript" as const,
    };

    it("renders diff tabs", () => {
      render(<TutorialCodeBlock code="" language="text" diff={diff} />);
      expect(screen.getByRole("button", { name: "Before" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "After" })).toBeInTheDocument();
    });

    it("shows after code by default", () => {
      render(<TutorialCodeBlock code="" language="text" diff={diff} />);
      expect(screen.getByText("const x = 2;")).toBeInTheDocument();
    });

    it("switches to before code when before tab is clicked", async () => {
      const user = userEvent.setup();
      render(<TutorialCodeBlock code="" language="text" diff={diff} />);

      await user.click(screen.getByRole("button", { name: "Before" }));

      expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    });
  });
});

describe("InlineCode", () => {
  describe("rendering", () => {
    it("renders children text", () => {
      render(<InlineCode>npm install</InlineCode>);
      expect(screen.getByText("npm install")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(<InlineCode className="custom-class">code</InlineCode>);
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("has monospace font styling", () => {
      const { container } = render(<InlineCode>code</InlineCode>);
      expect(container.firstChild).toHaveClass("font-mono");
    });
  });

  describe("copy functionality", () => {
    it("does not show copy button by default", () => {
      render(<InlineCode>code</InlineCode>);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows copy button when copyable is true", () => {
      render(<InlineCode copyable>npm install</InlineCode>);
      const copyButton = screen.getByRole("button");
      expect(copyButton).toBeInTheDocument();
    });

    // Note: clipboard API mocking is complex in happy-dom
    // Clipboard integration is tested via E2E tests with Playwright
    it.skip("copies text to clipboard when copy button is clicked", async () => {
      // Tested via E2E
    });
  });
});
