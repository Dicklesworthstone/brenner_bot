/**
 * Unit tests for Textarea component
 *
 * Tests the Textarea component with label, error, hint, and autoResize.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/ui/textarea.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  describe("rendering", () => {
    it("renders textarea element", () => {
      render(<Textarea />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Textarea className="custom-class" />);
      expect(screen.getByRole("textbox")).toHaveClass("custom-class");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    it("supports placeholder", () => {
      render(<Textarea placeholder="Enter message..." />);
      expect(screen.getByPlaceholderText("Enter message...")).toBeInTheDocument();
    });

    it("supports rows attribute", () => {
      render(<Textarea rows={5} />);
      expect(screen.getByRole("textbox")).toHaveAttribute("rows", "5");
    });
  });

  describe("label", () => {
    it("renders label when provided", () => {
      render(<Textarea label="Message" />);
      expect(screen.getByText("Message")).toBeInTheDocument();
    });

    it("associates label with textarea", () => {
      render(<Textarea label="Message" />);
      const textarea = screen.getByLabelText("Message");
      expect(textarea).toBeInTheDocument();
    });

    it("uses custom id when provided", () => {
      render(<Textarea label="Message" id="message-input" />);
      expect(screen.getByLabelText("Message")).toHaveAttribute("id", "message-input");
    });
  });

  describe("error state", () => {
    it("renders error message", () => {
      render(<Textarea error="Message is required" />);
      expect(screen.getByText("Message is required")).toBeInTheDocument();
    });

    it("sets aria-invalid when error exists", () => {
      render(<Textarea error="Error" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("has error styling", () => {
      render(<Textarea error="Error" />);
      expect(screen.getByRole("textbox")).toHaveClass("border-destructive");
    });
  });

  describe("hint", () => {
    it("renders hint text", () => {
      render(<Textarea hint="Enter your feedback" />);
      expect(screen.getByText("Enter your feedback")).toBeInTheDocument();
    });

    it("hides hint when error is present", () => {
      render(<Textarea hint="Helpful hint" error="Error message" />);
      expect(screen.queryByText("Helpful hint")).not.toBeInTheDocument();
      expect(screen.getByText("Error message")).toBeInTheDocument();
    });
  });

  describe("autoResize", () => {
    it("has resize-y by default", () => {
      render(<Textarea />);
      expect(screen.getByRole("textbox")).toHaveClass("resize-y");
    });

    it("has resize-none when autoResize is true", () => {
      render(<Textarea autoResize />);
      expect(screen.getByRole("textbox")).toHaveClass("resize-none");
    });
  });

  describe("interactions", () => {
    it("accepts user input", async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Hello world");

      expect(textarea).toHaveValue("Hello world");
    });

    it("calls onChange handler", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Textarea onChange={handleChange} />);

      await user.type(screen.getByRole("textbox"), "a");
      expect(handleChange).toHaveBeenCalled();
    });

    it("supports disabled state", () => {
      render(<Textarea disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("has aria-describedby for error", () => {
      render(<Textarea id="test" error="Error message" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "test-error");
    });

    it("has aria-describedby for hint", () => {
      render(<Textarea id="test" hint="Hint message" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "test-hint");
    });
  });
});
