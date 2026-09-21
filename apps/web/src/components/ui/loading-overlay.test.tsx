/**
 * Unit tests for LoadingOverlay component
 *
 * @see @/components/ui/loading-overlay.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoadingOverlay } from "./loading-overlay";

describe("LoadingOverlay", () => {
  it("does not render when not visible", () => {
    render(<LoadingOverlay visible={false} message="Loading" />);
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });

  it("renders message, detail, and progress", () => {
    render(
      <LoadingOverlay
        visible
        message="Analyzing"
        detail="This may take a minute"
        progress={0.25}
      />,
    );

    expect(screen.getByText("Analyzing")).toBeInTheDocument();
    expect(screen.getByText("This may take a minute")).toBeInTheDocument();
    expect(screen.getByText("25% complete")).toBeInTheDocument();
  });

  it("fires onCancel when cancel is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<LoadingOverlay visible message="Working" cancellable onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
