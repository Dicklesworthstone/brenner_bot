import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionActions } from "./SessionActions";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("SessionActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs an experiment and posts a DELTA message", async () => {
    const user = userEvent.setup();

    const fetchSpy = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : String((input as { url?: unknown })?.url ?? "");
      const bodyText = typeof init?.body === "string" ? init.body : "";
      const body = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};

      if (url === "/api/experiments") {
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              schema_version: "experiment_result_v0.1",
              result_id: "result-1",
              thread_id: body.threadId,
              test_id: body.testId,
              created_at: "2025-01-01T00:00:00Z",
              cwd: "/project",
              argv: body.command,
              timeout_seconds: body.timeout,
              timed_out: false,
              exit_code: 0,
              duration_ms: 12,
              stdout: "hello\n",
              stderr: "",
            },
            resultFile: "/project/artifacts/TEST-1/experiments/T1/test.json",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/sessions/actions") {
        return new Response(
          JSON.stringify({
            success: true,
            action: "post_delta",
            threadId: body.threadId,
            messageId: 456,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Not found", code: "SERVER_ERROR" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });

    vi.stubGlobal("fetch", fetchSpy);

    render(
      <SessionActions
        threadId="TEST-1"
        projectKey="/project"
        defaultSender="Operator"
        defaultRecipients={["Claude"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Experiment panel" }));

    await user.clear(screen.getByLabelText("Test ID"));
    await user.type(screen.getByLabelText("Test ID"), "T1");
    await user.clear(screen.getByLabelText("Command"));
    await user.type(screen.getByLabelText("Command"), "echo hello");
    await user.click(screen.getByRole("button", { name: "Run Experiment" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate DELTA Draft" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Generate DELTA Draft" }));
    const deltaBody = screen.getByLabelText("DELTA body (markdown)") as HTMLTextAreaElement;
    expect(deltaBody.value).toContain("```delta");

    await user.click(screen.getByRole("button", { name: "Post DELTA" }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    const actionCall = fetchSpy.mock.calls.find((call) => call[0] === "/api/sessions/actions");
    expect(actionCall).toBeDefined();

    const actionBodyText = typeof actionCall?.[1]?.body === "string" ? actionCall[1].body : "";
    const actionBody = actionBodyText
      ? (JSON.parse(actionBodyText) as Record<string, unknown>)
      : {};
    expect(actionBody).toMatchObject({
      action: "post_delta",
      threadId: "TEST-1",
      projectKey: "/project",
      sender: "Operator",
      recipients: ["Claude"],
    });
  });

  it("clears stale experiment + DELTA state when a new experiment run fails", async () => {
    const user = userEvent.setup();

    let experimentCalls = 0;
    const fetchSpy = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : String((input as { url?: unknown })?.url ?? "");
      const bodyText = typeof init?.body === "string" ? init.body : "";
      const body = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};

      if (url === "/api/experiments") {
        experimentCalls += 1;

        if (experimentCalls === 1) {
          return new Response(
            JSON.stringify({
              success: true,
              result: {
                schema_version: "experiment_result_v0.1",
                result_id: "result-1",
                thread_id: body.threadId,
                test_id: body.testId,
                created_at: "2025-01-01T00:00:00Z",
                cwd: "/project",
                argv: body.command,
                timeout_seconds: body.timeout,
                timed_out: false,
                exit_code: 0,
                duration_ms: 12,
                stdout: "hello\n",
                stderr: "",
              },
              resultFile: "/project/artifacts/TEST-1/experiments/T1/test.json",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: "Experiment failed", code: "SERVER_ERROR" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/sessions/actions") {
        return new Response(
          JSON.stringify({
            success: true,
            action: "post_delta",
            threadId: body.threadId,
            messageId: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Not found", code: "SERVER_ERROR" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });

    vi.stubGlobal("fetch", fetchSpy);

    render(
      <SessionActions
        threadId="TEST-1"
        projectKey="/project"
        defaultSender="Operator"
        defaultRecipients={["Claude"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Experiment panel" }));

    await user.clear(screen.getByLabelText("Test ID"));
    await user.type(screen.getByLabelText("Test ID"), "T1");
    await user.clear(screen.getByLabelText("Command"));
    await user.type(screen.getByLabelText("Command"), "echo hello");
    await user.click(screen.getByRole("button", { name: "Run Experiment" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate DELTA Draft" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Generate DELTA Draft" }));
    const deltaBody = screen.getByLabelText("DELTA body (markdown)") as HTMLTextAreaElement;
    expect(deltaBody.value).toContain("```delta");
    expect(screen.getByText("Show stdout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Run Experiment" }));

    await waitFor(() => {
      expect(screen.getByText("Experiment failed")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Generate DELTA Draft" })).toBeDisabled();
    expect((screen.getByLabelText("DELTA subject") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("DELTA body (markdown)") as HTMLTextAreaElement).value).toBe("");
    expect(screen.queryByText("Show stdout")).not.toBeInTheDocument();
  });

  it("clears prior errors when generating a DELTA draft", async () => {
    const user = userEvent.setup();

    const fetchSpy = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : String((input as { url?: unknown })?.url ?? "");
      const bodyText = typeof init?.body === "string" ? init.body : "";
      const body = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};

      if (url === "/api/experiments") {
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              schema_version: "experiment_result_v0.1",
              result_id: "result-1",
              thread_id: body.threadId,
              test_id: body.testId,
              created_at: "2025-01-01T00:00:00Z",
              cwd: "/project",
              argv: body.command,
              timeout_seconds: body.timeout,
              timed_out: false,
              exit_code: 0,
              duration_ms: 12,
              stdout: "hello\n",
              stderr: "",
            },
            resultFile: "/project/artifacts/TEST-1/experiments/T1/test.json",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/sessions/actions") {
        if (body.action === "compile") {
          return new Response(
            JSON.stringify({ success: false, error: "Compile failed", code: "SERVER_ERROR" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            action: "post_delta",
            threadId: body.threadId,
            messageId: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Not found", code: "SERVER_ERROR" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });

    vi.stubGlobal("fetch", fetchSpy);

    render(
      <SessionActions
        threadId="TEST-1"
        projectKey="/project"
        defaultSender="Operator"
        defaultRecipients={["Claude"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Experiment panel" }));

    await user.clear(screen.getByLabelText("Test ID"));
    await user.type(screen.getByLabelText("Test ID"), "T1");
    await user.clear(screen.getByLabelText("Command"));
    await user.type(screen.getByLabelText("Command"), "echo hello");
    await user.click(screen.getByRole("button", { name: "Run Experiment" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate DELTA Draft" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Compile" }));

    await waitFor(() => {
      expect(screen.getByText("Compile failed")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Generate DELTA Draft" }));

    await waitFor(() => {
      expect(screen.queryByText("Compile failed")).not.toBeInTheDocument();
    });
  });
});
