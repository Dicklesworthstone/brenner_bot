/**
 * Unit tests for CommandPalette component
 *
 * Tests the command palette interface for navigation and actions.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see brenner_bot-ph4p (bead)
 * @see @/components/ui/command-palette.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette, CommandPaletteHint } from "./command-palette";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function renderCommandPalette() {
  return render(<CommandPalette />);
}

function renderCommandPaletteHint() {
  return render(<CommandPaletteHint />);
}

// ============================================================================
// Tests
// ============================================================================

describe("CommandPalette", () => {
  describe("initial state", () => {
    it("renders nothing when closed", () => {
      renderCommandPalette();

      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
      expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
    });
  });

  describe("opening and closing", () => {
    it("opens on Cmd+/", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
    });

    it("opens on Ctrl+/", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Control>}/{/Control}");

      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
    });

    it("closes on Escape", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      // Open
      await user.keyboard("{Meta>}/{/Meta}");
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();

      // Close
      await user.keyboard("{Escape}");
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("closes when backdrop clicked", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      // Open
      await user.keyboard("{Meta>}/{/Meta}");
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();

      // Click backdrop
      const backdrop = document.querySelector(".command-palette-backdrop");
      expect(backdrop).toBeInTheDocument();
      await user.click(backdrop as Element);

      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("toggles open/close on repeated Cmd+/", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      // Open
      await user.keyboard("{Meta>}/{/Meta}");
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();

      // Close
      await user.keyboard("{Meta>}/{/Meta}");
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });
  });

  describe("command display", () => {
    it("shows all commands when opened", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Navigation commands
      expect(screen.getByText("Go to Home")).toBeInTheDocument();
      expect(screen.getByText("Go to Corpus")).toBeInTheDocument();
      expect(screen.getByText("Go to Distillations")).toBeInTheDocument();
      expect(screen.getByText("Go to Method")).toBeInTheDocument();

      // Document commands
      expect(screen.getByText("Read Full Transcript")).toBeInTheDocument();
      expect(screen.getByText("Browse Quote Bank")).toBeInTheDocument();

      // Action commands
      expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
    });

    it("groups commands by section", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      expect(screen.getByText("Navigation")).toBeInTheDocument();
      expect(screen.getByText("Documents")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("shows subtitles for commands that have them", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      expect(screen.getByText("Browse all documents")).toBeInTheDocument();
      expect(screen.getByText("Compare model analyses")).toBeInTheDocument();
      expect(screen.getByText("Learn the Brenner Loop")).toBeInTheDocument();
    });

    it("shows keyboard shortcuts for commands that have them", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Multiple keyboard shortcut indicators should be visible
      const kbdElements = document.querySelectorAll(".command-palette-kbd");
      expect(kbdElements.length).toBeGreaterThan(0);
    });
  });

  describe("search filtering", () => {
    it("filters commands as user types", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "corpus");

      expect(screen.getByText("Go to Corpus")).toBeInTheDocument();
      expect(screen.queryByText("Go to Method")).not.toBeInTheDocument();
    });

    it("filters by title", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "home");

      expect(screen.getByText("Go to Home")).toBeInTheDocument();
    });

    it("filters by subtitle", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "interview");

      expect(screen.getByText("Read Full Transcript")).toBeInTheDocument();
      expect(screen.getByText("Web of Stories interview")).toBeInTheDocument();
    });

    it("filters by section name", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "actions");

      expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
    });

    it("shows empty state when no commands match", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "xyznonexistent");

      expect(screen.getByText("No commands found.")).toBeInTheDocument();
      expect(screen.getByText("Try a different search term.")).toBeInTheDocument();
    });

    it("is case insensitive", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "CORPUS");

      expect(screen.getByText("Go to Corpus")).toBeInTheDocument();
    });

    it("clears search query when closed and reopened", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      // Open and type
      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "corpus");

      // Close
      await user.keyboard("{Escape}");

      // Reopen - should be cleared
      await user.keyboard("{Meta>}/{/Meta}");
      expect(screen.getByPlaceholderText("Search commands...")).toHaveValue("");
    });
  });

  describe("keyboard navigation", () => {
    it("highlights first command by default", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Find the first command item
      const firstItem = document.querySelector(".command-palette-item.bg-muted");
      expect(firstItem).toBeInTheDocument();
    });

    it("moves selection down with ArrowDown", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Get initial selected item
      const initialSelected = document.querySelector(".command-palette-item.bg-muted");
      expect(initialSelected).toBeInTheDocument();

      await user.keyboard("{ArrowDown}");

      // Get new selected item
      const newSelected = document.querySelector(".command-palette-item.bg-muted");
      expect(newSelected).not.toBe(initialSelected);
    });

    it("moves selection up with ArrowUp", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Get current selected before going up
      const beforeUp = document.querySelector(".command-palette-item.bg-muted");

      await user.keyboard("{ArrowUp}");

      const afterUp = document.querySelector(".command-palette-item.bg-muted");
      expect(afterUp).not.toBe(beforeUp);
    });

    it("wraps selection at bottom", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Navigate to the last item
      const allItems = document.querySelectorAll(".command-palette-item");
      for (let i = 0; i < allItems.length; i++) {
        await user.keyboard("{ArrowDown}");
      }

      // Should wrap to first - re-query since classes may have changed
      const selectedItem = document.querySelector(".command-palette-item.bg-muted");
      expect(selectedItem).toBeInTheDocument();
      expect(selectedItem).toBe(allItems[0]);
    });

    it("wraps selection at top", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // First item is selected by default, arrow up should go to last
      await user.keyboard("{ArrowUp}");

      const allItems = document.querySelectorAll(".command-palette-item");
      const lastItem = allItems[allItems.length - 1];
      expect(lastItem).toHaveClass("bg-muted");
    });

    it("resets selection when query changes", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Navigate down a few times
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Type to filter
      await user.type(screen.getByPlaceholderText("Search commands..."), "theme");

      // First matching item should be selected
      const toggleTheme = screen.getByText("Toggle Theme");
      expect(toggleTheme.closest(".command-palette-item")).toHaveClass("bg-muted");
    });
  });

  describe("command execution", () => {
    it("executes command on Enter", async () => {
      const user = userEvent.setup();

      // Import useRouter to check navigation
      const mockPush = vi.fn();
      const navModule = await import("next/navigation");
      (navModule as unknown as { useRouter: () => unknown }).useRouter = () => ({
        push: mockPush,
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
      });

      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.keyboard("{Enter}");

      // Should close palette after execution
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("executes command on click", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Click on a command
      const corpusCommand = screen.getByText("Go to Corpus");
      await user.click(corpusCommand.closest("button") as Element);

      // Should close palette after execution
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("clears query after execution", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "corpus");
      await user.keyboard("{Enter}");

      // Reopen - query should be cleared
      await user.keyboard("{Meta>}/{/Meta}");
      expect(screen.getByPlaceholderText("Search commands...")).toHaveValue("");
    });
  });

  describe("mouse interactions", () => {
    it("highlights item on hover", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      // Find a command that's not the first one
      const corpusCommand = screen.getByText("Go to Corpus").closest("button");
      await user.hover(corpusCommand as Element);

      expect(corpusCommand).toHaveClass("bg-muted");
    });
  });

  describe("footer", () => {
    it("shows navigation instructions", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      expect(screen.getByText("Navigate")).toBeInTheDocument();
      expect(screen.getByText("Select")).toBeInTheDocument();
      expect(screen.getByText("to toggle")).toBeInTheDocument();
    });
  });

  describe("focus management", () => {
    it("focuses input when opened", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");

      const input = screen.getByPlaceholderText("Search commands...");
      expect(document.activeElement).toBe(input);
    });
  });

  describe("theme toggle", () => {
    beforeEach(() => {
      document.documentElement.classList.remove("dark");
      localStorage.clear();
    });

    afterEach(() => {
      document.documentElement.classList.remove("dark");
      localStorage.clear();
    });

    it("toggles dark mode when theme command executed", async () => {
      const user = userEvent.setup();
      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "theme");
      await user.keyboard("{Enter}");

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("toggles back to light mode", async () => {
      const user = userEvent.setup();
      document.documentElement.classList.add("dark");

      renderCommandPalette();

      await user.keyboard("{Meta>}/{/Meta}");
      await user.type(screen.getByPlaceholderText("Search commands..."), "theme");
      await user.keyboard("{Enter}");

      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(localStorage.getItem("theme")).toBe("light");
    });
  });
});

describe("CommandPaletteHint", () => {
  it("renders the hint button", () => {
    renderCommandPaletteHint();

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("Search...")).toBeInTheDocument();
  });

  it("shows keyboard shortcut indicators", () => {
    renderCommandPaletteHint();

    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("/")).toBeInTheDocument();
  });

  it("dispatches keyboard event when clicked", async () => {
    const user = userEvent.setup();
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    renderCommandPaletteHint();

    await user.click(screen.getByRole("button"));

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "keydown",
        key: "/",
        metaKey: true,
      }),
    );

    dispatchSpy.mockRestore();
  });

  it("has correct styling classes", () => {
    renderCommandPaletteHint();

    const button = screen.getByRole("button");
    expect(button).toHaveClass("hidden", "lg:flex");
  });
});
