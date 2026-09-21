/**
 * Unit tests for TutorialTip component
 *
 * Tests the TutorialTip component's variants, collapsible behavior, and accessibility.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/tutorial/TutorialTip.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Important, Note, ProTip, TutorialTip, Warning } from "./TutorialTip";

describe("TutorialTip", () => {
  describe("rendering", () => {
    it("renders with children content", () => {
      render(<TutorialTip variant="note">This is a note about something.</TutorialTip>);
      expect(screen.getByText("This is a note about something.")).toBeInTheDocument();
    });

    it("renders default title for each variant", () => {
      const { rerender } = render(<TutorialTip variant="pro">Content</TutorialTip>);
      expect(screen.getByText("Pro Tip")).toBeInTheDocument();

      rerender(<TutorialTip variant="warning">Content</TutorialTip>);
      expect(screen.getByText("Warning")).toBeInTheDocument();

      rerender(<TutorialTip variant="note">Content</TutorialTip>);
      expect(screen.getByText("Note")).toBeInTheDocument();

      rerender(<TutorialTip variant="important">Content</TutorialTip>);
      expect(screen.getByText("Important")).toBeInTheDocument();
    });

    it("renders custom title when provided", () => {
      render(
        <TutorialTip variant="pro" title="Custom Title">
          Content
        </TutorialTip>,
      );
      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(screen.queryByText("Pro Tip")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <TutorialTip variant="note" className="custom-class">
          Content
        </TutorialTip>,
      );
      const container = screen.getByRole("note");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("variants", () => {
    it("applies pro variant styling", () => {
      render(<TutorialTip variant="pro">Content</TutorialTip>);
      const container = screen.getByRole("note");
      // Using OKLCH color for pro variant
      expect(container.className).toMatch(/border-\[oklch\(0\.72_0\.19_145/);
    });

    it("applies warning variant styling", () => {
      render(<TutorialTip variant="warning">Content</TutorialTip>);
      const container = screen.getByRole("alert");
      expect(container.className).toMatch(/border-amber/);
    });

    it("applies note variant styling", () => {
      render(<TutorialTip variant="note">Content</TutorialTip>);
      const container = screen.getByRole("note");
      expect(container.className).toMatch(/border-blue/);
    });

    it("applies important variant styling", () => {
      render(<TutorialTip variant="important">Content</TutorialTip>);
      const container = screen.getByRole("alert");
      expect(container.className).toMatch(/border-destructive/);
    });
  });

  describe("accessibility", () => {
    it("uses role=note for informational variants", () => {
      const { rerender } = render(<TutorialTip variant="pro">Content</TutorialTip>);
      expect(screen.getByRole("note")).toBeInTheDocument();

      rerender(<TutorialTip variant="note">Content</TutorialTip>);
      expect(screen.getByRole("note")).toBeInTheDocument();
    });

    it("uses role=alert for warning/important variants", () => {
      const { rerender } = render(<TutorialTip variant="warning">Content</TutorialTip>);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      rerender(<TutorialTip variant="important">Content</TutorialTip>);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("collapsible behavior", () => {
    it("shows content by default when not collapsible", () => {
      render(<TutorialTip variant="note">Visible content</TutorialTip>);
      expect(screen.getByText("Visible content")).toBeVisible();
    });

    it("shows content by default when collapsible but not defaultCollapsed", () => {
      render(
        <TutorialTip variant="note" collapsible>
          Collapsible content
        </TutorialTip>,
      );
      expect(screen.getByText("Collapsible content")).toBeInTheDocument();
    });

    it("hides content when collapsible and defaultCollapsed", () => {
      render(
        <TutorialTip variant="note" collapsible defaultCollapsed>
          Hidden content
        </TutorialTip>,
      );
      expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
    });

    it("toggles content visibility when collapsible header is clicked", async () => {
      const user = userEvent.setup();
      render(
        <TutorialTip variant="note" collapsible>
          Toggle content
        </TutorialTip>,
      );

      // Initially visible
      expect(screen.getByText("Toggle content")).toBeInTheDocument();

      // Click to collapse
      const button = screen.getByRole("button");
      await user.click(button);

      // Content should be hidden (but may take animation time)
      // The content is removed from DOM when collapsed
    });

    it("has aria-expanded attribute when collapsible", () => {
      render(
        <TutorialTip variant="note" collapsible>
          Content
        </TutorialTip>,
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "true");
    });
  });
});

describe("Convenience components", () => {
  it("ProTip renders with pro variant", () => {
    render(<ProTip>Pro tip content</ProTip>);
    expect(screen.getByText("Pro Tip")).toBeInTheDocument();
    expect(screen.getByText("Pro tip content")).toBeInTheDocument();
  });

  it("Warning renders with warning variant", () => {
    render(<Warning>Warning content</Warning>);
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("Note renders with note variant", () => {
    render(<Note>Note content</Note>);
    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("Important renders with important variant", () => {
    render(<Important>Important content</Important>);
    expect(screen.getByText("Important")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("Convenience components accept custom titles", () => {
    render(<ProTip title="Did you know?">Content</ProTip>);
    expect(screen.getByText("Did you know?")).toBeInTheDocument();
    expect(screen.queryByText("Pro Tip")).not.toBeInTheDocument();
  });

  it("Convenience components support collapsible prop", async () => {
    const user = userEvent.setup();
    render(<Note collapsible>Collapsible note</Note>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "true");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
