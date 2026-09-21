/**
 * Unit tests for Input components
 *
 * Tests the Input and SearchInput components.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/ui/input.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Input, SearchInput } from "./input";

describe("Input", () => {
  describe("rendering", () => {
    it("renders input element", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Input className="custom-class" />);
      expect(screen.getByRole("textbox")).toHaveClass("custom-class");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("supports placeholder", () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
    });
  });

  describe("label", () => {
    it("renders label when provided", () => {
      render(<Input label="Email" />);
      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("associates label with input", () => {
      render(<Input label="Email" />);
      const input = screen.getByLabelText("Email");
      expect(input).toBeInTheDocument();
    });

    it("uses custom id when provided", () => {
      render(<Input label="Email" id="email-input" />);
      expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email-input");
    });
  });

  describe("error state", () => {
    it("renders error message", () => {
      render(<Input error="Invalid email" />);
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
    });

    it("sets aria-invalid when error exists", () => {
      render(<Input error="Invalid email" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("has error styling", () => {
      render(<Input error="Invalid" />);
      expect(screen.getByRole("textbox")).toHaveClass("border-destructive");
    });
  });

  describe("hint", () => {
    it("renders hint text", () => {
      render(<Input hint="Enter your email address" />);
      expect(screen.getByText("Enter your email address")).toBeInTheDocument();
    });

    it("hides hint when error is present", () => {
      render(<Input hint="Helpful hint" error="Error message" />);
      expect(screen.queryByText("Helpful hint")).not.toBeInTheDocument();
      expect(screen.getByText("Error message")).toBeInTheDocument();
    });
  });

  describe("icon", () => {
    it("renders icon on left by default", () => {
      render(<Input icon={<span data-testid="icon">🔍</span>} />);
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("adds left padding for left icon", () => {
      render(<Input icon={<span>🔍</span>} iconPosition="left" />);
      expect(screen.getByRole("textbox")).toHaveClass("pl-10");
    });

    it("adds right padding for right icon", () => {
      render(<Input icon={<span>✓</span>} iconPosition="right" />);
      expect(screen.getByRole("textbox")).toHaveClass("pr-10");
    });
  });

  describe("type attribute", () => {
    it("defaults to text type (no explicit attribute)", () => {
      render(<Input />);
      // Input defaults to text when no type specified
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("supports email type", () => {
      render(<Input type="email" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("supports password type", () => {
      render(<Input type="password" />);
      // Password inputs don't have textbox role
      expect(document.querySelector("input[type='password']")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("accepts user input", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello");

      expect(input).toHaveValue("Hello");
    });

    it("calls onChange handler", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      await user.type(screen.getByRole("textbox"), "a");
      expect(handleChange).toHaveBeenCalled();
    });

    it("supports disabled state", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("has aria-describedby for error", () => {
      render(<Input id="test" error="Error message" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "test-error");
    });

    it("has aria-describedby for hint", () => {
      render(<Input id="test" hint="Hint message" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "test-hint");
    });
  });
});

describe("SearchInput", () => {
  it("renders with search icon", () => {
    render(<SearchInput />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("has type search", () => {
    render(<SearchInput />);
    expect(screen.getByRole("searchbox")).toHaveAttribute("type", "search");
  });

  it("applies custom className", () => {
    render(<SearchInput className="custom-search" />);
    expect(screen.getByRole("searchbox")).toHaveClass("custom-search");
  });

  it("accepts placeholder", () => {
    render(<SearchInput placeholder="Search..." />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<SearchInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
