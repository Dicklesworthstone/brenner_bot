/**
 * Unit tests for BottomSheet component
 *
 * Tests the BottomSheet modal, useBottomSheet hook, and BottomSheetActions.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/ui/bottom-sheet.tsx
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BottomSheet, BottomSheetActions, useBottomSheet } from "./bottom-sheet";

// Test component that uses the useBottomSheet hook
function TestBottomSheetConsumer() {
  const { isOpen, open, close, toggle } = useBottomSheet();
  return (
    <div>
      <button onClick={open}>Open Sheet</button>
      <button onClick={close}>Close Sheet</button>
      <button onClick={toggle}>Toggle Sheet</button>
      <span data-testid="sheet-state">{isOpen ? "open" : "closed"}</span>
      <BottomSheet open={isOpen} onClose={close} title="Test Sheet">
        <div data-testid="sheet-content">Sheet Content</div>
      </BottomSheet>
    </div>
  );
}

describe("BottomSheet", () => {
  beforeEach(() => {
    // Ensure body is clean before each test
    document.body.innerHTML = "";
  });

  afterEach(() => {
    // Clean up any remaining styles that might leak between tests
    document.body.style.overflow = "";
  });

  describe("useBottomSheet hook", () => {
    it("initializes with isOpen as false", () => {
      render(<TestBottomSheetConsumer />);
      expect(screen.getByTestId("sheet-state")).toHaveTextContent("closed");
    });

    it("opens sheet when open is called", async () => {
      const user = userEvent.setup();
      render(<TestBottomSheetConsumer />);

      await user.click(screen.getByText("Open Sheet"));
      expect(screen.getByTestId("sheet-state")).toHaveTextContent("open");
    });

    it("closes sheet when close is called", async () => {
      const user = userEvent.setup();
      render(<TestBottomSheetConsumer />);

      await user.click(screen.getByText("Open Sheet"));
      expect(screen.getByTestId("sheet-state")).toHaveTextContent("open");

      await user.click(screen.getByText("Close Sheet"));
      expect(screen.getByTestId("sheet-state")).toHaveTextContent("closed");
    });

    it("toggles sheet state", async () => {
      const user = userEvent.setup();
      render(<TestBottomSheetConsumer />);

      await user.click(screen.getByText("Toggle Sheet"));
      expect(screen.getByTestId("sheet-state")).toHaveTextContent("open");

      await user.click(screen.getByText("Toggle Sheet"));
      expect(screen.getByTestId("sheet-state")).toHaveTextContent("closed");
    });
  });

  describe("BottomSheet component", () => {
    it("renders nothing when closed", () => {
      render(
        <BottomSheet open={false} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders dialog when open", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("renders children content", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div data-testid="child">Child Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
        expect(screen.getByText("Child Content")).toBeInTheDocument();
      });
    });

    it("renders title when provided", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()} title="Sheet Title">
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByText("Sheet Title")).toBeInTheDocument();
      });
    });

    it("does not render title header when title is not provided", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Should not have title element
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("calls onClose when backdrop is clicked", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <BottomSheet open={true} onClose={handleClose}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click the backdrop (aria-hidden element)
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (!(backdrop instanceof HTMLElement)) {
        throw new Error("Expected backdrop element to be present");
      }
      await user.click(backdrop);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when escape key is pressed", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <BottomSheet open={true} onClose={handleClose}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <BottomSheet open={true} onClose={handleClose} title="With Close Button">
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const closeButton = screen.getByRole("button", { name: "Close" });
      await user.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("locks body scroll when open", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when closed", async () => {
      const { rerender } = render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      rerender(
        <BottomSheet open={false} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe("");
      });
    });

    it("applies custom className", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()} className="custom-class">
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveClass("custom-class");
      });
    });

    it("has correct aria attributes", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()} title="Accessible Sheet">
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-modal", "true");
        expect(dialog).toHaveAttribute("aria-labelledby", "bottom-sheet-title");
      });
    });

    it("does not have aria-labelledby when no title", async () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).not.toHaveAttribute("aria-labelledby");
      });
    });
  });

  describe("BottomSheetActions", () => {
    it("renders action buttons", () => {
      const actions = [
        { id: "edit", label: "Edit", onClick: vi.fn() },
        { id: "delete", label: "Delete", onClick: vi.fn(), destructive: true },
      ];

      render(<BottomSheetActions actions={actions} onClose={vi.fn()} />);

      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("calls action onClick and onClose when action is clicked", async () => {
      const user = userEvent.setup();
      const handleEdit = vi.fn();
      const handleClose = vi.fn();

      const actions = [{ id: "edit", label: "Edit", onClick: handleEdit }];

      render(<BottomSheetActions actions={actions} onClose={handleClose} />);

      await user.click(screen.getByText("Edit"));

      expect(handleEdit).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("applies destructive styling to destructive actions", () => {
      const actions = [{ id: "delete", label: "Delete", onClick: vi.fn(), destructive: true }];

      render(<BottomSheetActions actions={actions} onClose={vi.fn()} />);

      const button = screen.getByText("Delete").closest("button");
      expect(button).toHaveClass("text-destructive");
    });

    it("renders action icons when provided", () => {
      const TestIcon = () => <span data-testid="test-icon">Icon</span>;
      const actions = [{ id: "edit", label: "Edit", onClick: vi.fn(), icon: <TestIcon /> }];

      render(<BottomSheetActions actions={actions} onClose={vi.fn()} />);

      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });
  });

  describe("integration", () => {
    it("full open/close flow with hook", async () => {
      const user = userEvent.setup();
      render(<TestBottomSheetConsumer />);

      // Initially closed
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Open
      await user.click(screen.getByText("Open Sheet"));
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
      });

      // Close via close button
      await user.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.getByTestId("sheet-state")).toHaveTextContent("closed");
    });
  });
});
