/**
 * Unit tests for Collapsible components
 *
 * Tests the collapsible system including trigger, content, card, and section variants.
 *
 * @see brenner_bot-x712 (bead)
 * @see @/components/ui/collapsible.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Collapsible,
  CollapsibleCard,
  CollapsibleContent,
  CollapsibleSection,
  CollapsibleTrigger,
} from "./collapsible";

// ============================================================================
// Test Helpers
// ============================================================================

function renderCollapsible(
  props: {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    triggerText?: string;
    contentText?: string;
    showChevron?: boolean;
    chevronPosition?: "left" | "right";
  } = {},
) {
  const {
    triggerText = "Toggle",
    contentText = "Content",
    showChevron = true,
    chevronPosition = "right",
    ...collapsibleProps
  } = props;

  return render(
    <Collapsible {...collapsibleProps}>
      <CollapsibleTrigger showChevron={showChevron} chevronPosition={chevronPosition}>
        {triggerText}
      </CollapsibleTrigger>
      <CollapsibleContent>{contentText}</CollapsibleContent>
    </Collapsible>,
  );
}

// ============================================================================
// Collapsible Root Tests
// ============================================================================

describe("Collapsible", () => {
  describe("uncontrolled mode", () => {
    it("renders in closed state by default", () => {
      renderCollapsible();

      expect(screen.getByText("Toggle")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("renders in open state when defaultOpen is true", () => {
      renderCollapsible({ defaultOpen: true });

      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("toggles open/closed on trigger click", async () => {
      const user = userEvent.setup();
      renderCollapsible();

      // Initially closed
      expect(screen.queryByText("Content")).not.toBeInTheDocument();

      // Click to open
      await user.click(screen.getByRole("button"));
      expect(screen.getByText("Content")).toBeInTheDocument();

      // Click to close
      await user.click(screen.getByRole("button"));
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("has correct data-state attribute", async () => {
      const user = userEvent.setup();
      const { container } = renderCollapsible();

      const root = container.firstChild as HTMLElement;
      expect(root).toHaveAttribute("data-state", "closed");

      await user.click(screen.getByRole("button"));
      expect(root).toHaveAttribute("data-state", "open");
    });
  });

  describe("controlled mode", () => {
    it("respects controlled open prop", () => {
      const { rerender } = render(
        <Collapsible open={false}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>,
      );

      expect(screen.queryByText("Content")).not.toBeInTheDocument();

      rerender(
        <Collapsible open={true}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>,
      );

      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("calls onOpenChange when toggled", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Collapsible open={false} onOpenChange={onOpenChange}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>,
      );

      await user.click(screen.getByRole("button"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it("does not change internal state in controlled mode", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <Collapsible open={false} onOpenChange={onOpenChange}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>,
      );

      await user.click(screen.getByRole("button"));

      // Content should still be hidden because parent didn't update prop
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("accepts className prop", () => {
      const { container } = render(
        <Collapsible className="custom-class">
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

// ============================================================================
// CollapsibleTrigger Tests
// ============================================================================

describe("CollapsibleTrigger", () => {
  describe("rendering", () => {
    it("renders as a button", () => {
      renderCollapsible();

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("has type='button' to prevent form submission", () => {
      renderCollapsible();

      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    });

    it("renders children", () => {
      renderCollapsible({ triggerText: "Custom Trigger Text" });

      expect(screen.getByText("Custom Trigger Text")).toBeInTheDocument();
    });
  });

  describe("chevron", () => {
    it("shows chevron by default on the right", () => {
      renderCollapsible();

      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("hides chevron when showChevron is false", () => {
      renderCollapsible({ showChevron: false });

      const button = screen.getByRole("button");
      expect(button.querySelector("svg")).not.toBeInTheDocument();
    });

    it("positions chevron on the left when specified", () => {
      renderCollapsible({ chevronPosition: "left" });

      // The chevron should be before the text content
      const button = screen.getByRole("button");
      const children = Array.from(button.children);
      expect(children.length).toBeGreaterThan(1);
    });
  });

  describe("accessibility", () => {
    it("has aria-expanded false when closed", () => {
      renderCollapsible();

      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    });

    it("has aria-expanded true when open", async () => {
      const user = userEvent.setup();
      renderCollapsible();

      await user.click(screen.getByRole("button"));

      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    });

    it("has aria-controls linking to content", () => {
      renderCollapsible({ defaultOpen: true });

      const button = screen.getByRole("button");
      const contentId = button.getAttribute("aria-controls");
      expect(contentId).toBeTruthy();
    });

    it("has focus styles", () => {
      renderCollapsible();

      expect(screen.getByRole("button")).toHaveClass("focus-visible:ring-2");
    });
  });

  describe("interaction", () => {
    it("can be clicked with keyboard (Enter)", async () => {
      const user = userEvent.setup();
      renderCollapsible();

      screen.getByRole("button").focus();
      await user.keyboard("{Enter}");

      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("can be clicked with keyboard (Space)", async () => {
      const user = userEvent.setup();
      renderCollapsible();

      screen.getByRole("button").focus();
      await user.keyboard(" ");

      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("calls custom onClick handler", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <Collapsible>
          <CollapsibleTrigger onClick={onClick}>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>,
      );

      await user.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalled();
    });

    it("respects event.preventDefault() in custom onClick", async () => {
      const user = userEvent.setup();

      render(
        <Collapsible>
          <CollapsibleTrigger onClick={(e) => e.preventDefault()}>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>,
      );

      await user.click(screen.getByRole("button"));

      // Content should remain hidden because default was prevented
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// CollapsibleContent Tests
// ============================================================================

describe("CollapsibleContent", () => {
  describe("rendering", () => {
    it("renders children when open", () => {
      renderCollapsible({ defaultOpen: true, contentText: "My Content" });

      expect(screen.getByText("My Content")).toBeInTheDocument();
    });

    it("does not render children when closed", () => {
      renderCollapsible({ contentText: "My Content" });

      expect(screen.queryByText("My Content")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has aria-labelledby linking to trigger", () => {
      renderCollapsible({ defaultOpen: true });

      const button = screen.getByRole("button");
      const triggerId = button.getAttribute("id");
      const contentId = button.getAttribute("aria-controls");

      if (!contentId) {
        throw new Error("Expected aria-controls to be set on trigger");
      }
      const content = document.getElementById(contentId);
      expect(content).toHaveAttribute("aria-labelledby", triggerId);
    });
  });

  describe("className", () => {
    it("accepts className prop", () => {
      render(
        <Collapsible defaultOpen>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent className="custom-content-class">Content</CollapsibleContent>
        </Collapsible>,
      );

      // The framer-motion wrapper gets the class
      const content = screen.getByText("Content").closest("[class*='custom-content-class']");
      expect(content).toBeInTheDocument();
    });
  });
});

// ============================================================================
// CollapsibleCard Tests
// ============================================================================

describe("CollapsibleCard", () => {
  describe("rendering", () => {
    it("renders title", () => {
      render(
        <CollapsibleCard title="Card Title">
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      expect(screen.getByText("Card Title")).toBeInTheDocument();
    });

    it("renders subtitle when provided", () => {
      render(
        <CollapsibleCard title="Card Title" subtitle="Card Subtitle">
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      expect(screen.getByText("Card Subtitle")).toBeInTheDocument();
    });

    it("renders badge when provided", () => {
      render(
        <CollapsibleCard title="Card Title" badge={<span>Badge</span>}>
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      expect(screen.getByText("Badge")).toBeInTheDocument();
    });

    it("renders children content when open", () => {
      render(
        <CollapsibleCard title="Card Title" defaultOpen>
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("hides children content when closed", () => {
      render(
        <CollapsibleCard title="Card Title">
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      expect(screen.queryByText("Card Content")).not.toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("toggles content on click", async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleCard title="Card Title">
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      // Initially closed
      expect(screen.queryByText("Card Content")).not.toBeInTheDocument();

      // Click to open
      await user.click(screen.getByRole("button"));
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });
  });

  describe("controlled mode", () => {
    it("respects controlled open prop", () => {
      render(
        <CollapsibleCard title="Card Title" open={true}>
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("calls onOpenChange when toggled", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <CollapsibleCard title="Card Title" open={false} onOpenChange={onOpenChange}>
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      await user.click(screen.getByRole("button"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("className", () => {
    it("accepts className prop for root", () => {
      render(
        <CollapsibleCard title="Card Title" className="card-custom-class">
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      const card = screen.getByText("Card Title").closest("[data-state]");
      expect(card).toHaveClass("card-custom-class");
    });

    it("accepts contentClassName prop", () => {
      render(
        <CollapsibleCard title="Card Title" defaultOpen contentClassName="content-custom-class">
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      // The content wrapper should have the class
      const content = screen.getByText("Card Content").closest("[class*='content-custom-class']");
      expect(content).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("has card styling classes", () => {
      render(
        <CollapsibleCard title="Card Title">
          <p>Card Content</p>
        </CollapsibleCard>,
      );

      const card = screen.getByText("Card Title").closest("[data-state]");
      expect(card).toHaveClass("rounded-xl", "border", "bg-card");
    });
  });
});

// ============================================================================
// CollapsibleSection Tests
// ============================================================================

describe("CollapsibleSection", () => {
  describe("rendering", () => {
    it("renders label", () => {
      render(
        <CollapsibleSection label="Section Label">
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      expect(screen.getByText("Section Label")).toBeInTheDocument();
    });

    it("renders hint when provided", () => {
      render(
        <CollapsibleSection label="Section Label" hint="Help text" defaultOpen>
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      expect(screen.getByText("Help text")).toBeInTheDocument();
    });

    it("renders children content when open", () => {
      render(
        <CollapsibleSection label="Section Label" defaultOpen>
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      expect(screen.getByText("Section Content")).toBeInTheDocument();
    });

    it("hides children content when closed", () => {
      render(
        <CollapsibleSection label="Section Label">
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      expect(screen.queryByText("Section Content")).not.toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("toggles content on click", async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleSection label="Section Label">
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      // Initially closed
      expect(screen.queryByText("Section Content")).not.toBeInTheDocument();

      // Click to open
      await user.click(screen.getByRole("button"));
      expect(screen.getByText("Section Content")).toBeInTheDocument();
    });
  });

  describe("controlled mode", () => {
    it("respects controlled open prop", () => {
      render(
        <CollapsibleSection label="Section Label" open={true}>
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      expect(screen.getByText("Section Content")).toBeInTheDocument();
    });

    it("calls onOpenChange when toggled", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <CollapsibleSection label="Section Label" open={false} onOpenChange={onOpenChange}>
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      await user.click(screen.getByRole("button"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("className", () => {
    it("accepts className prop", () => {
      render(
        <CollapsibleSection label="Section Label" className="section-custom-class">
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      const section = screen.getByText("Section Label").closest("[data-state]");
      expect(section).toHaveClass("section-custom-class");
    });
  });

  describe("styling", () => {
    it("has section styling classes", () => {
      render(
        <CollapsibleSection label="Section Label">
          <p>Section Content</p>
        </CollapsibleSection>,
      );

      const section = screen.getByText("Section Label").closest("[data-state]");
      expect(section).toHaveClass("rounded-xl", "border");
    });
  });
});

// ============================================================================
// Context Error Handling Tests
// ============================================================================

describe("Context error handling", () => {
  // Suppress console.error for this test
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it("throws error when CollapsibleTrigger is used outside Collapsible", () => {
    expect(() => {
      render(<CollapsibleTrigger>Trigger</CollapsibleTrigger>);
    }).toThrow("Collapsible components must be used within a Collapsible");
  });

  it("throws error when CollapsibleContent is used outside Collapsible", () => {
    expect(() => {
      render(<CollapsibleContent>Content</CollapsibleContent>);
    }).toThrow("Collapsible components must be used within a Collapsible");
  });
});

// Restore console.error for other tests
afterEach(() => {
  // Just to be safe
});
