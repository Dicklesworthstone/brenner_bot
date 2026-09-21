/**
 * Unit tests for SessionForm component
 *
 * Tests the session creation form with validation, submission, and error handling.
 * Philosophy: Test core functionality without triggering complex child component states.
 *
 * @see brenner_bot-ph4p (bead)
 * @see @/components/sessions/SessionForm.tsx
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionForm } from "./SessionForm";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock the mutation hook
const mockMutate = vi.fn();
type MockMutationState = {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const mockMutationState: MockMutationState = {
  isPending: false,
  isError: false,
  error: null,
};

vi.mock("@/hooks/mutations/useSessionMutation", () => ({
  useSessionMutation: () => ({
    mutate: mockMutate,
    ...mockMutationState,
  }),
  getSessionErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

// Mock Jargon component to simplify testing
vi.mock("@/components/jargon", () => ({
  Jargon: ({ term, children }: { term: string; children: ReactNode }) => (
    <span data-jargon={term}>{children}</span>
  ),
}));

// Mock RosterAssignment to prevent it from rendering checkboxes that interfere with tests
vi.mock("./RosterAssignment", () => ({
  RosterAssignment: () => <div data-testid="roster-assignment">Roster Assignment Mock</div>,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderSessionForm(props: { defaultSender?: string; defaultProjectKey?: string } = {}) {
  const queryClient = createQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <SessionForm {...props} />
      </QueryClientProvider>,
    ),
    queryClient,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("SessionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationState.isPending = false;
    mockMutationState.isError = false;
    mockMutationState.error = null;
  });

  describe("rendering", () => {
    it("renders all form sections", () => {
      renderSessionForm();

      expect(screen.getByRole("heading", { name: "Session Setup" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Content" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Operator Selection" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();
    });

    it("renders thread ID field", () => {
      renderSessionForm();

      const input = screen.getByPlaceholderText("FEAT-123");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("name", "threadId");
    });

    it("renders sender field", () => {
      renderSessionForm();

      const input = screen.getByPlaceholderText("GreenCastle");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("name", "sender");
    });

    it("renders recipients field", () => {
      renderSessionForm();

      const input = screen.getByPlaceholderText("BlueMountain, RedForest");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("name", "recipients");
    });

    it("renders excerpt textarea", () => {
      renderSessionForm();

      const textarea = screen.getByPlaceholderText(/paste transcript chunks/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute("name", "excerpt");
    });

    it("renders optional fields (theme, domain, question)", () => {
      renderSessionForm();

      expect(screen.getByPlaceholderText("decision experiments")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("biology")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/most discriminative next experiment/i),
      ).toBeInTheDocument();
    });

    it("renders acknowledgment checkbox", () => {
      renderSessionForm();

      expect(screen.getByText("Require acknowledgment")).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("renders submit button", () => {
      renderSessionForm();

      expect(screen.getByRole("button", { name: /send kickoff/i })).toBeInTheDocument();
    });

    it("applies default sender when provided", () => {
      renderSessionForm({ defaultSender: "TestAgent" });

      const senderInput = screen.getByPlaceholderText("GreenCastle");
      expect(senderInput).toHaveValue("TestAgent");
    });
  });

  describe("field validation", () => {
    it("does not submit form with empty required fields", async () => {
      const user = userEvent.setup();
      renderSessionForm();

      // Try to submit without filling required fields
      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      // Mutation should not have been called
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("does not submit form without excerpt", async () => {
      const user = userEvent.setup();
      renderSessionForm({ defaultSender: "TestAgent" });

      // Fill required fields except excerpt
      await user.type(screen.getByPlaceholderText("FEAT-123"), "FEAT-001");
      await user.type(screen.getByPlaceholderText("BlueMountain, RedForest"), "Agent1");

      // Try to submit without excerpt
      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      // Mutation should not have been called (validation failed)
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("thread ID field has aria-invalid attribute for error display", () => {
      renderSessionForm();

      const threadIdInput = screen.getByPlaceholderText("FEAT-123");
      expect(threadIdInput).toHaveAttribute("aria-invalid");
    });

    it("sender field has aria-invalid attribute for error display", () => {
      renderSessionForm();

      const senderInput = screen.getByPlaceholderText("GreenCastle");
      expect(senderInput).toHaveAttribute("aria-invalid");
    });

    it("excerpt field has aria-invalid attribute for error display", () => {
      renderSessionForm();

      const excerptInput = screen.getByPlaceholderText(/paste transcript chunks/i);
      expect(excerptInput).toHaveAttribute("aria-invalid");
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when submitting", () => {
      mockMutationState.isPending = true;

      renderSessionForm();

      expect(screen.getByText("Sending...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });

    it("disables thread ID input when submitting", () => {
      mockMutationState.isPending = true;

      renderSessionForm();

      expect(screen.getByPlaceholderText("FEAT-123")).toBeDisabled();
    });

    it("disables sender input when submitting", () => {
      mockMutationState.isPending = true;

      renderSessionForm();

      expect(screen.getByPlaceholderText("GreenCastle")).toBeDisabled();
    });

    it("disables recipients input when submitting", () => {
      mockMutationState.isPending = true;

      renderSessionForm();

      expect(screen.getByPlaceholderText("BlueMountain, RedForest")).toBeDisabled();
    });

    it("disables excerpt textarea when submitting", () => {
      mockMutationState.isPending = true;

      renderSessionForm();

      expect(screen.getByPlaceholderText(/paste transcript chunks/i)).toBeDisabled();
    });

    it("shows loading message", () => {
      mockMutationState.isPending = true;

      renderSessionForm();

      expect(screen.getByText(/composing prompt and sending to agent mail/i)).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("displays error message when submission fails", () => {
      mockMutationState.isError = true;
      mockMutationState.error = new Error("Network error");

      renderSessionForm();

      expect(screen.getByText("Failed to send kickoff")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("has error styling", () => {
      mockMutationState.isError = true;
      mockMutationState.error = new Error("Test error");

      renderSessionForm();

      // The error container is the grandparent of the error title text
      const errorTitle = screen.getByText("Failed to send kickoff");
      const textContainer = errorTitle.parentElement;
      const errorContainer = textContainer?.parentElement;
      expect(errorContainer).toHaveClass("border-destructive/30");
    });
  });

  describe("hints and help text", () => {
    it("shows hint text for thread ID", () => {
      renderSessionForm();

      expect(screen.getByText("Unique identifier for this research thread")).toBeInTheDocument();
    });

    it("shows hint text for agent name", () => {
      renderSessionForm();

      expect(screen.getByText("How you'll appear in Agent Mail")).toBeInTheDocument();
    });

    it("shows hint text for recipients", () => {
      renderSessionForm();

      expect(screen.getByText("Comma-separated list of agent names")).toBeInTheDocument();
    });

    it("shows hint text for excerpt", () => {
      renderSessionForm();

      expect(
        screen.getByText("The raw Brenner transcript material to analyze"),
      ).toBeInTheDocument();
    });

    it("shows hint for optional fields", () => {
      renderSessionForm();

      expect(screen.getByText("Optional focus area")).toBeInTheDocument();
      expect(screen.getByText("Optional field context")).toBeInTheDocument();
      expect(screen.getByText("Optional guiding question")).toBeInTheDocument();
    });
  });

  describe("operator selection", () => {
    it("includes OperatorSelector component", () => {
      renderSessionForm();

      expect(screen.getByText("Click to customize role operators")).toBeInTheDocument();
    });
  });

  describe("acknowledgment checkbox", () => {
    it("is unchecked by default", () => {
      renderSessionForm();

      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("can be toggled", async () => {
      const user = userEvent.setup();
      renderSessionForm();

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("shows description", () => {
      renderSessionForm();

      expect(screen.getByText("Recipients must explicitly confirm receipt")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls mutate on valid form submission", async () => {
      const user = userEvent.setup();
      renderSessionForm({ defaultSender: "TestAgent", defaultProjectKey: "/test/project" });

      // Fill required fields using placeholders (avoids label conflicts)
      await user.type(screen.getByPlaceholderText("FEAT-123"), "TEST-001");
      await user.type(screen.getByPlaceholderText("BlueMountain, RedForest"), "Agent1");
      await user.type(
        screen.getByPlaceholderText(/paste transcript chunks/i),
        "This is a sufficiently long excerpt that meets the 20 character minimum requirement.",
      );

      // Submit
      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it("includes form data in mutation call", async () => {
      const user = userEvent.setup();
      renderSessionForm({ defaultSender: "TestAgent" });

      await user.type(screen.getByPlaceholderText("FEAT-123"), "FEAT-999");
      await user.type(screen.getByPlaceholderText("BlueMountain, RedForest"), "Recipient1");
      await user.type(
        screen.getByPlaceholderText(/paste transcript chunks/i),
        "Sufficiently long excerpt for testing the form submission.",
      );

      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            threadId: "FEAT-999",
            sender: "TestAgent",
          }),
          expect.any(Object),
        );
      });
    });

    it("includes optional fields when filled", async () => {
      const user = userEvent.setup();
      renderSessionForm({ defaultSender: "TestAgent" });

      // Fill required
      await user.type(screen.getByPlaceholderText("FEAT-123"), "FEAT-001");
      await user.type(screen.getByPlaceholderText("BlueMountain, RedForest"), "Agent");
      await user.type(
        screen.getByPlaceholderText(/paste transcript chunks/i),
        "Long enough excerpt for testing purposes here.",
      );

      // Fill optional
      await user.type(screen.getByPlaceholderText("decision experiments"), "cell fate");
      await user.type(screen.getByPlaceholderText("biology"), "developmental");
      await user.type(screen.getByPlaceholderText(/most discriminative/i), "What next?");

      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            theme: "cell fate",
            domain: "developmental",
            question: "What next?",
          }),
          expect.any(Object),
        );
      });
    });

    it("includes ackRequired when checked", async () => {
      const user = userEvent.setup();
      renderSessionForm({ defaultSender: "TestAgent" });

      // Fill required
      await user.type(screen.getByPlaceholderText("FEAT-123"), "FEAT-001");
      await user.type(screen.getByPlaceholderText("BlueMountain, RedForest"), "Agent");
      await user.type(
        screen.getByPlaceholderText(/paste transcript chunks/i),
        "Long enough excerpt for testing purposes here.",
      );

      // Check ack
      await user.click(screen.getByRole("checkbox"));

      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            ackRequired: true,
          }),
          expect.any(Object),
        );
      });
    });
  });

  describe("success handling", () => {
    it("redirects on successful submission", async () => {
      const user = userEvent.setup();

      mockMutate.mockImplementation((_data, options) => {
        options?.onSuccess?.({ threadId: "FEAT-SUCCESS" });
      });

      renderSessionForm({ defaultSender: "TestAgent" });

      await user.type(screen.getByPlaceholderText("FEAT-123"), "FEAT-SUCCESS");
      await user.type(screen.getByPlaceholderText("BlueMountain, RedForest"), "Agent");
      await user.type(
        screen.getByPlaceholderText(/paste transcript chunks/i),
        "Long enough excerpt for testing purposes.",
      );

      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/sessions/new?sent=1&thread=FEAT-SUCCESS");
      });
    });
  });

  describe("subject field", () => {
    it("renders subject field with auto-generate hint", () => {
      renderSessionForm();

      const subjectInput = screen.getByPlaceholderText(/KICKOFF:/);
      expect(subjectInput).toBeInTheDocument();
      expect(screen.getByText(/auto-generated from thread ID/i)).toBeInTheDocument();
    });

    it("subject is optional", async () => {
      const user = userEvent.setup();
      renderSessionForm({ defaultSender: "TestAgent" });

      // Fill required fields without subject
      await user.type(screen.getByPlaceholderText("FEAT-123"), "FEAT-001");
      await user.type(screen.getByPlaceholderText("BlueMountain, RedForest"), "Agent");
      await user.type(
        screen.getByPlaceholderText(/paste transcript chunks/i),
        "Long enough excerpt for testing purposes.",
      );

      await user.click(screen.getByRole("button", { name: /send kickoff/i }));

      // Should still submit without subject
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });
  });
});
