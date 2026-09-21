/**
 * Unit tests for OperatorSelector component
 *
 * Tests the operator selection interface for Brenner Protocol sessions.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see brenner_bot-ph4p (bead)
 * @see @/components/sessions/OperatorSelector.tsx
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_OPERATORS, type OperatorSelection, OperatorSelector } from "./OperatorSelector";

// ============================================================================
// Test Helpers
// ============================================================================

function renderOperatorSelector(
  props: Partial<{
    value: OperatorSelection;
    onChange: (selection: OperatorSelection) => void;
    disabled: boolean;
  }> = {},
) {
  const defaultProps = {
    value: { ...DEFAULT_OPERATORS },
    onChange: vi.fn(),
    disabled: false,
    ...props,
  };

  return {
    ...render(<OperatorSelector {...defaultProps} />),
    onChange: defaultProps.onChange,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("OperatorSelector", () => {
  describe("rendering", () => {
    it("renders collapsed state by default", () => {
      renderOperatorSelector();

      expect(screen.getByText("Operator Selection")).toBeInTheDocument();
      expect(screen.getByText("Click to customize role operators")).toBeInTheDocument();
    });

    it("expands when header clicked", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      const header = screen.getByRole("button", { name: /operator selection/i });
      await user.click(header);

      expect(screen.getByText("Hypothesis Generator")).toBeInTheDocument();
      expect(screen.getByText("Test Designer")).toBeInTheDocument();
      expect(screen.getByText("Adversarial Critic")).toBeInTheDocument();
    });

    it("shows 'Customize operators per role' when expanded", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      expect(screen.getByText("Customize operators per role")).toBeInTheDocument();
    });

    it("shows operator count per role when expanded", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Find the role cards
      const roleCards = document.querySelectorAll('[class*="bg-gradient-to-br"]');
      const hypothesisCard = roleCards[0];
      const testDesignerCard = roleCards[1];
      const adversarialCard = roleCards[2];

      // Default operators counts
      expect(
        within(hypothesisCard as HTMLElement).getByText("3 operators selected"),
      ).toBeInTheDocument();
      expect(
        within(testDesignerCard as HTMLElement).getByText("4 operators selected"),
      ).toBeInTheDocument();
      expect(
        within(adversarialCard as HTMLElement).getByText("3 operators selected"),
      ).toBeInTheDocument();
    });

    it("shows Custom badge when operators differ from defaults", async () => {
      const customValue: OperatorSelection = {
        ...DEFAULT_OPERATORS,
        hypothesis_generator: ["⊘ Level-Split"], // Only 1 instead of 3
      };

      renderOperatorSelector({ value: customValue });

      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("does not show Custom badge when using defaults", () => {
      renderOperatorSelector({ value: { ...DEFAULT_OPERATORS } });

      expect(screen.queryByText("Custom")).not.toBeInTheDocument();
    });
  });

  describe("operator selection", () => {
    it("shows all operators when expanded", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Check for some known operators
      expect(screen.getAllByText("Level-Split").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Cross-Domain").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Theory-Kill").length).toBeGreaterThanOrEqual(1);
    });

    it("calls onChange when operator toggled on", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      // Start with only one operator for hypothesis_generator
      const value: OperatorSelection = {
        hypothesis_generator: ["⊘ Level-Split"],
        test_designer: [...DEFAULT_OPERATORS.test_designer],
        adversarial_critic: [...DEFAULT_OPERATORS.adversarial_critic],
        devils_advocate: [...DEFAULT_OPERATORS.devils_advocate],
        experiment_designer: [...DEFAULT_OPERATORS.experiment_designer],
        statistician: [...DEFAULT_OPERATORS.statistician],
        brenner_channeler: [...DEFAULT_OPERATORS.brenner_channeler],
        synthesis: [...DEFAULT_OPERATORS.synthesis],
      };

      renderOperatorSelector({ value, onChange });

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Find the Hypothesis Generator role card
      const roleCards = document.querySelectorAll('[class*="bg-gradient-to-br"]');
      const hypothesisCard = roleCards[0];

      // Find an unselected operator in hypothesis_generator section
      const crossDomainButton = within(hypothesisCard as HTMLElement).getByRole("button", {
        name: /cross-domain/i,
      });

      await user.click(crossDomainButton);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hypothesis_generator: expect.arrayContaining(["⊘ Level-Split", "⊕ Cross-Domain"]),
        }),
      );
    });

    it("calls onChange when operator toggled off", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      renderOperatorSelector({ onChange });

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Find the Hypothesis Generator role card
      const roleCards = document.querySelectorAll('[class*="bg-gradient-to-br"]');
      const hypothesisCard = roleCards[0];

      // Find and click Level-Split (which should be selected by default)
      const levelSplitButton = within(hypothesisCard as HTMLElement).getByRole("button", {
        name: /level-split/i,
      });

      await user.click(levelSplitButton);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hypothesis_generator: expect.not.arrayContaining(["⊘ Level-Split"]),
        }),
      );
    });

    it("highlights selected operators", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Find the Hypothesis Generator role card
      const roleCards = document.querySelectorAll('[class*="bg-gradient-to-br"]');
      const hypothesisCard = roleCards[0];

      // Level-Split should be selected by default for hypothesis_generator
      const levelSplitButton = within(hypothesisCard as HTMLElement).getByRole("button", {
        name: /level-split/i,
      });

      // Selected operators have specific styling classes
      expect(levelSplitButton).toHaveClass("bg-primary/10");
    });
  });

  describe("reset functionality", () => {
    it("shows reset button when customized", async () => {
      const user = userEvent.setup();
      const customValue: OperatorSelection = {
        hypothesis_generator: ["⊘ Level-Split"],
        test_designer: [...DEFAULT_OPERATORS.test_designer],
        adversarial_critic: [...DEFAULT_OPERATORS.adversarial_critic],
        devils_advocate: [...DEFAULT_OPERATORS.devils_advocate],
        experiment_designer: [...DEFAULT_OPERATORS.experiment_designer],
        statistician: [...DEFAULT_OPERATORS.statistician],
        brenner_channeler: [...DEFAULT_OPERATORS.brenner_channeler],
        synthesis: [...DEFAULT_OPERATORS.synthesis],
      };

      renderOperatorSelector({ value: customValue });

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeInTheDocument();
    });

    it("does not show reset button when using defaults", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      expect(screen.queryByRole("button", { name: /reset to defaults/i })).not.toBeInTheDocument();
    });

    it("resets to defaults when reset clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const customValue: OperatorSelection = {
        hypothesis_generator: ["⊘ Level-Split"],
        test_designer: ["✂ Exclusion-Test"],
        adversarial_critic: ["† Theory-Kill"],
        devils_advocate: [...DEFAULT_OPERATORS.devils_advocate],
        experiment_designer: [...DEFAULT_OPERATORS.experiment_designer],
        statistician: [...DEFAULT_OPERATORS.statistician],
        brenner_channeler: [...DEFAULT_OPERATORS.brenner_channeler],
        synthesis: [...DEFAULT_OPERATORS.synthesis],
      };

      renderOperatorSelector({ value: customValue, onChange });

      await user.click(screen.getByRole("button", { name: /operator selection/i }));
      await user.click(screen.getByRole("button", { name: /reset to defaults/i }));

      expect(onChange).toHaveBeenCalledWith(DEFAULT_OPERATORS);
    });
  });

  describe("role cards", () => {
    it("renders all three role cards", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      expect(screen.getByText("Hypothesis Generator")).toBeInTheDocument();
      expect(screen.getByText("Test Designer")).toBeInTheDocument();
      expect(screen.getByText("Adversarial Critic")).toBeInTheDocument();
    });

    it("shows role descriptions", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      expect(screen.getByText("Codex / GPT-5.2")).toBeInTheDocument();
      expect(screen.getByText("Opus / Claude")).toBeInTheDocument();
      expect(screen.getByText("Gemini 3")).toBeInTheDocument();
    });

    it("updates operator count when operators change", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <OperatorSelector value={DEFAULT_OPERATORS} onChange={vi.fn()} />,
      );

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Find the Hypothesis Generator role card
      const roleCards = document.querySelectorAll('[class*="bg-gradient-to-br"]');
      const hypothesisCard = roleCards[0];

      // Should show 3 operators for hypothesis_generator
      expect(
        within(hypothesisCard as HTMLElement).getByText("3 operators selected"),
      ).toBeInTheDocument();

      // Rerender with fewer operators
      rerender(
        <OperatorSelector
          value={{
            ...DEFAULT_OPERATORS,
            hypothesis_generator: ["⊘ Level-Split"],
          }}
          onChange={vi.fn()}
        />,
      );

      expect(
        within(hypothesisCard as HTMLElement).getByText("1 operator selected"),
      ).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables header button when disabled", () => {
      renderOperatorSelector({ disabled: true });

      const header = screen.getByRole("button", { name: /operator selection/i });
      expect(header).toBeDisabled();
    });

    it("disables operator buttons when disabled", async () => {
      const user = userEvent.setup();
      // First render enabled to expand
      const { rerender } = render(
        <OperatorSelector value={DEFAULT_OPERATORS} onChange={vi.fn()} disabled={false} />,
      );

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Now disable and check operator buttons
      rerender(<OperatorSelector value={DEFAULT_OPERATORS} onChange={vi.fn()} disabled={true} />);

      // Find any operator button
      const operatorButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.textContent?.includes("Level-Split"));

      operatorButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it("does not call onChange when disabled", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      // Start enabled to expand
      const { rerender } = render(
        <OperatorSelector value={DEFAULT_OPERATORS} onChange={onChange} disabled={false} />,
      );

      await user.click(screen.getByRole("button", { name: /operator selection/i }));

      // Now disable
      rerender(<OperatorSelector value={DEFAULT_OPERATORS} onChange={onChange} disabled={true} />);

      // Try to click an operator (should do nothing since disabled)
      const roleCards = document.querySelectorAll('[class*="bg-gradient-to-br"]');
      const hypothesisCard = roleCards[0];
      const levelSplitButton = within(hypothesisCard as HTMLElement).getByRole("button", {
        name: /level-split/i,
      });

      await user.click(levelSplitButton);

      // onChange should not have been called (except potentially from initial click)
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("collapse/expand toggle", () => {
    it("collapses when header clicked again", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      const header = screen.getByRole("button", { name: /operator selection/i });

      // Expand
      await user.click(header);
      expect(screen.getByText("Hypothesis Generator")).toBeInTheDocument();

      // Collapse
      await user.click(header);
      expect(screen.queryByText("Hypothesis Generator")).not.toBeInTheDocument();
    });

    it("rotates chevron icon when expanded", async () => {
      const user = userEvent.setup();
      renderOperatorSelector();

      const header = screen.getByRole("button", { name: /operator selection/i });

      // Find chevron by its parent container
      const chevron = header.querySelector("svg");
      expect(chevron).toBeInTheDocument();

      // Before expansion, should not have rotate class
      expect(chevron).not.toHaveClass("rotate-180");

      await user.click(header);

      // After expansion, should have rotate class
      expect(chevron).toHaveClass("rotate-180");
    });
  });
});

describe("DEFAULT_OPERATORS", () => {
  it("exports default operators", () => {
    expect(DEFAULT_OPERATORS).toBeDefined();
    expect(DEFAULT_OPERATORS.hypothesis_generator).toBeDefined();
    expect(DEFAULT_OPERATORS.test_designer).toBeDefined();
    expect(DEFAULT_OPERATORS.adversarial_critic).toBeDefined();
  });

  it("has correct default operators for hypothesis_generator", () => {
    expect(DEFAULT_OPERATORS.hypothesis_generator).toContain("⊘ Level-Split");
    expect(DEFAULT_OPERATORS.hypothesis_generator).toContain("⊕ Cross-Domain");
    expect(DEFAULT_OPERATORS.hypothesis_generator).toContain("◊ Paradox-Hunt");
  });

  it("has correct default operators for test_designer", () => {
    expect(DEFAULT_OPERATORS.test_designer).toContain("✂ Exclusion-Test");
    expect(DEFAULT_OPERATORS.test_designer).toContain("⌂ Materialize");
    expect(DEFAULT_OPERATORS.test_designer).toContain("⟂ Object-Transpose");
    expect(DEFAULT_OPERATORS.test_designer).toContain("🎭 Potency-Check");
  });

  it("has correct default operators for adversarial_critic", () => {
    expect(DEFAULT_OPERATORS.adversarial_critic).toContain("ΔE Exception-Quarantine");
    expect(DEFAULT_OPERATORS.adversarial_critic).toContain("† Theory-Kill");
    expect(DEFAULT_OPERATORS.adversarial_critic).toContain("⊞ Scale-Check");
  });
});
