import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { FirstRunOnboarding } from "./FirstRunOnboarding";

const STORAGE_KEY = "brennerbot:onboarding:sessions:v1";

describe("FirstRunOnboarding", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it("auto-opens when the user has not seen it", async () => {
    render(<FirstRunOnboarding />);

    expect(await screen.findByText("Welcome to Sessions")).toBeInTheDocument();
  });

  it("does not open when the user has already seen it", () => {
    localStorage.setItem(STORAGE_KEY, "1");

    render(<FirstRunOnboarding />);
    expect(screen.queryByText("Welcome to Sessions")).not.toBeInTheDocument();
  });

  it("marks as seen when dismissed", async () => {
    const user = userEvent.setup();

    render(<FirstRunOnboarding />);
    await screen.findByText("Welcome to Sessions");

    await user.click(screen.getByRole("button", { name: /show again/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });
});
