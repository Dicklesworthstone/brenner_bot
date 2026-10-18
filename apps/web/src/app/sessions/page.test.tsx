import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SessionsListPage from "./page";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "brennerbot.org" })),
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/sessions",
}));

describe("SessionsListPage", () => {
  it("renders the Workspace Research Program & Registry Health dashboard alongside sessions", async () => {
    const jsx = await SessionsListPage();
    render(jsx);

    expect(screen.getByRole("heading", { level: 1, name: /Sessions/i })).toBeInTheDocument();
    const programDashboard = screen.getByTestId("workspace-program-dashboard");
    expect(programDashboard).toBeInTheDocument();
    expect(programDashboard).toHaveTextContent(/Cell Fate Determination|BrennerBot Research Workspace/);
    expect(programDashboard).toHaveTextContent(/RP-CELL-FATE-DETERMINATION-001|RP-WORKSPACE-001/);
    expect(programDashboard).toHaveTextContent("Hypothesis Funnel");
    expect(programDashboard).toHaveTextContent("Assumption & Scale Registry");
    expect(programDashboard).toHaveTextContent("Anomalies & Critiques");
    expect(programDashboard).toHaveTextContent("Test Execution & Potency");
    expect(programDashboard).toHaveTextContent(/\d+ audit interventions/);
  });
});
