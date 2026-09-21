import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import type { AgentMailMessage } from "@/lib/agentMail";
import { ObjectionRegisterPanel } from "./ObjectionRegisterPanel";

function msg(
  partial: Partial<AgentMailMessage> & Pick<AgentMailMessage, "id" | "subject" | "created_ts">,
): AgentMailMessage {
  return {
    thread_id: "TRIBUNAL-SESSION-abc",
    ...partial,
  };
}

describe("ObjectionRegisterPanel", () => {
  it("renders extracted objections with default Open status", () => {
    localStorage.clear();

    const messages: AgentMailMessage[] = [
      msg({
        id: 123,
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "DevilBot",
        body_md: [
          "## Critical Assessment",
          "",
          "### Key Objection",
          "Reverse causation is plausible.",
        ].join("\n"),
      }),
    ];

    render(<ObjectionRegisterPanel threadId="TRIBUNAL-SESSION-abc" messages={messages} />);

    expect(screen.getByText(/objection register/i)).toBeInTheDocument();
    expect(screen.getByText("Reverse causation is plausible.")).toBeInTheDocument();

    const trigger = screen.getByLabelText("Objection status 123:0");
    expect(trigger).toHaveTextContent("Open");

    const snapshotRaw = localStorage.getItem(
      "brenner-objection-register-snapshot:TRIBUNAL-SESSION-abc",
    );
    expect(snapshotRaw).toContain("Reverse causation is plausible.");
  });

  it("persists status changes per thread in localStorage", async () => {
    localStorage.clear();
    const user = userEvent.setup();

    const messages: AgentMailMessage[] = [
      msg({
        id: 123,
        subject: "TRIBUNAL[devils_advocate]: HYP-1",
        created_ts: "2026-01-01T00:00:00.000Z",
        from: "DevilBot",
        body_md: [
          "## Critical Assessment",
          "",
          "### Key Objection",
          "Reverse causation is plausible.",
        ].join("\n"),
      }),
    ];

    const { unmount } = render(
      <ObjectionRegisterPanel threadId="TRIBUNAL-SESSION-abc" messages={messages} />,
    );

    const trigger = screen.getByLabelText("Objection status 123:0");
    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "Addressed" }));

    expect(screen.getByLabelText("Objection status 123:0")).toHaveTextContent("Addressed");

    const raw = localStorage.getItem("brenner-objection-register:TRIBUNAL-SESSION-abc");
    expect(raw).toContain('"123:0":"addressed"');

    unmount();

    render(<ObjectionRegisterPanel threadId="TRIBUNAL-SESSION-abc" messages={messages} />);
    expect(screen.getByLabelText("Objection status 123:0")).toHaveTextContent("Addressed");
  });
});
