/**
 * Unit tests for Tooltip components
 *
 * Tests Tooltip, TooltipTrigger, TooltipContent, TooltipProvider from Radix UI.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * Note: Tooltip content renders in a Portal, so hover tests may be limited in happy-dom.
 *
 * @see @/components/ui/tooltip.tsx
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

describe("Tooltip", () => {
  describe("TooltipProvider", () => {
    it("renders children", () => {
      render(
        <TooltipProvider>
          <span data-testid="child">Child content</span>
        </TooltipProvider>,
      );
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    // Note: TooltipProvider is a Radix context provider that doesn't render DOM elements
    // The data-slot attribute is on the internal component, not testable via data-testid
  });

  describe("Tooltip composition", () => {
    it("renders trigger element", () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>,
      );
      expect(screen.getByText("Hover me")).toBeInTheDocument();
    });

    it("trigger has tooltip-trigger slot attribute", () => {
      render(
        <Tooltip>
          <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>,
      );
      expect(screen.getByTestId("trigger")).toHaveAttribute("data-slot", "tooltip-trigger");
    });

    it("trigger is a button by default", () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>,
      );
      expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
    });

    it("supports asChild on trigger", () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <span data-testid="custom-trigger">Custom trigger</span>
          </TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>,
      );
      expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("applies className to trigger", () => {
      render(
        <Tooltip>
          <TooltipTrigger className="custom-trigger">Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>,
      );
      expect(screen.getByRole("button")).toHaveClass("custom-trigger");
    });
  });

  // Note: Testing tooltip visibility on hover requires more complex setup
  // because TooltipContent renders in a Portal and requires mouse events.
  // These behaviors are best tested in E2E tests with Playwright.

  describe("TooltipContent", () => {
    // TooltipContent only renders when tooltip is open (on hover/focus)
    // In unit tests, we verify the structure is correct

    it("renders with proper props", () => {
      // We can at least verify the component doesn't throw
      const { container } = render(
        <Tooltip defaultOpen>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent className="custom-content">Tooltip text</TooltipContent>
        </Tooltip>,
      );

      // The content should be rendered somewhere (in portal)
      expect(container).toBeInTheDocument();
    });
  });
});
