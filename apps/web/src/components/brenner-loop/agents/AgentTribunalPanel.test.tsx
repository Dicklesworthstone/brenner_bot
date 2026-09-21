import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import type { AgentMailMessage } from "@/lib/agentMail";
import { AgentTribunalPanel } from "./AgentTribunalPanel";

function msg(
  partial: Partial<AgentMailMessage> & Pick<AgentMailMessage, "id" | "subject" | "created_ts">,
): AgentMailMessage {
  return {
    thread_id: "TRIBUNAL-SESSION-abc",
    ...partial,
  };
}

describe("AgentTribunalPanel", () => {
  it("renders default tribunal agent cards", () => {
    render(<AgentTribunalPanel messages={[]} />);

    expect(screen.getByText(/agent tribunal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/devil's advocate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/experiment designer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/statistician/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/brenner channeler/i).length).toBeGreaterThan(0);
  });

  it("shows response preview and opens modal for a completed role", async () => {
    const user = userEvent.setup();
    const dispatch = msg({
      id: 10,
      subject: "TRIBUNAL[devils_advocate]: HC-123",
      created_ts: "2026-01-05T00:00:00.000Z",
      body_md: "request",
      from: "Operator",
      to: ["AgentA"],
    });
    const reply = msg({
      id: 11,
      reply_to: 10,
      subject: "Re: TRIBUNAL[devils_advocate]: HC-123",
      created_ts: "2026-01-05T00:10:00.000Z",
      body_md: "Here is the **analysis**.\n\nSecond paragraph.",
      from: "AgentA",
      to: ["Operator"],
    });

    render(<AgentTribunalPanel messages={[dispatch, reply]} roles={["devils_advocate"]} />);

    expect(screen.getAllByText(/here is the/i).length).toBeGreaterThan(0);

    const expandButtons = screen.getAllByRole("button", { name: /expand full response/i });
    await user.click(expandButtons[0]);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/here is the\s+analysis/i);
    expect(dialog).toHaveTextContent(/second paragraph/i);
  });

  it("renders heuristic synthesis when multiple roles have responses", () => {
    const responses: AgentMailMessage[] = [
      msg({
        id: 21,
        subject: "Re: TRIBUNAL[devils_advocate]: HC-123",
        created_ts: "2026-01-05T00:10:00.000Z",
        body_md:
          "- Selection bias is a major confound; anxious people may self-select.\n- The mechanism is not well supported.",
        from: "AgentA",
        to: ["Operator"],
      }),
      msg({
        id: 22,
        subject: "Re: TRIBUNAL[experiment_designer]: HC-123",
        created_ts: "2026-01-05T00:12:00.000Z",
        body_md:
          "- Selection bias is a major confound; randomize if possible.\n- Design a randomized intervention study.",
        from: "AgentB",
        to: ["Operator"],
      }),
    ];

    render(
      <AgentTribunalPanel
        messages={responses}
        roles={["devils_advocate", "experiment_designer"]}
      />,
    );

    expect(screen.getByText(/heuristic synthesis/i)).toBeInTheDocument();
    expect(screen.getAllByText(/selection bias/i).length).toBeGreaterThan(0);
  });

  it("blocks completion while objections remain unresolved", async () => {
    localStorage.clear();

    const response = msg({
      id: 123,
      subject: "Re: TRIBUNAL[devils_advocate]: HC-123",
      created_ts: "2026-01-05T00:10:00.000Z",
      body_md: ["## Analysis", "", "### Key Objection", "Reverse causation is plausible."].join(
        "\n",
      ),
      from: "AgentA",
      to: ["Operator"],
    });

    render(
      <AgentTribunalPanel
        threadId="TRIBUNAL-SESSION-abc"
        messages={[response]}
        roles={["devils_advocate"]}
      />,
    );

    expect(screen.getByText(/completion blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/blocked: 1 objection/i)).toBeInTheDocument();

    act(() => {
      localStorage.setItem(
        "brenner-objection-register:TRIBUNAL-SESSION-abc",
        JSON.stringify({ "123:0": "addressed" }),
      );
      window.dispatchEvent(
        new CustomEvent("brenner-objection-register-updated", {
          detail: { threadId: "TRIBUNAL-SESSION-abc" },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText(/completion blocked/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/blocked:/i)).not.toBeInTheDocument();
    });
  });
});
