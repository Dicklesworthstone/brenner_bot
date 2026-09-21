/**
 * Unit tests for Tabs components
 *
 * Tests Tabs, TabsList, TabsTrigger, TabsContent from Radix UI.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/ui/tabs.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs", () => {
  describe("rendering", () => {
    it("renders tabs container", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("has tabs slot attribute", () => {
      render(
        <Tabs defaultValue="tab1" data-testid="tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByTestId("tabs")).toHaveAttribute("data-slot", "tabs");
    });

    it("applies custom className", () => {
      render(
        <Tabs defaultValue="tab1" className="custom-tabs" data-testid="tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByTestId("tabs")).toHaveClass("custom-tabs");
    });
  });

  describe("TabsList", () => {
    it("renders tablist role", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("has tabs-list slot attribute", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tablist")).toHaveAttribute("data-slot", "tabs-list");
    });

    it("applies custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tablist")).toHaveClass("custom-list");
    });
  });

  describe("TabsTrigger", () => {
    it("renders tab buttons", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tab", { name: "Tab 1" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Tab 2" })).toBeInTheDocument();
    });

    it("has tabs-trigger slot attribute", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tab")).toHaveAttribute("data-slot", "tabs-trigger");
    });

    it("shows active state for selected tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute("data-state", "active");
      expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute("data-state", "inactive");
    });

    it("applies custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tab")).toHaveClass("custom-trigger");
    });
  });

  describe("TabsContent", () => {
    it("renders content for active tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Content 1");
    });

    it("has tabs-content slot attribute", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tabpanel")).toHaveAttribute("data-slot", "tabs-content");
    });

    it("applies custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            Content 1
          </TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tabpanel")).toHaveClass("custom-content");
    });
  });

  describe("interactions", () => {
    it("switches content on tab click", async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      expect(screen.getByRole("tabpanel")).toHaveTextContent("Content 1");

      await user.click(screen.getByRole("tab", { name: "Tab 2" }));

      expect(screen.getByRole("tabpanel")).toHaveTextContent("Content 2");
    });

    it("updates active state on click", async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      await user.click(screen.getByRole("tab", { name: "Tab 2" }));

      expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute("data-state", "active");
      expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute("data-state", "inactive");
    });
  });

  describe("accessibility", () => {
    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      // Focus the first tab
      screen.getByRole("tab", { name: "Tab 1" }).focus();

      // Arrow right to move to next tab
      await user.keyboard("{ArrowRight}");

      expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveFocus();
    });

    it("has proper tab association with panel", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );

      const tab = screen.getByRole("tab");
      const panel = screen.getByRole("tabpanel");

      // Tab should control the panel
      expect(tab).toHaveAttribute("aria-controls", panel.id);
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    });
  });
});
