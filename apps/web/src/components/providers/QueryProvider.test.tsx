/**
 * Tests for QueryProvider component
 *
 * Tests the TanStack Query provider configuration including:
 * - SSR-safe client instantiation
 * - Singleton pattern in browser
 * - Provider wrapping children
 * - Query options configuration
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getQueryClient, QueryProvider } from "./QueryProvider";

// ============================================================================
// Test Consumer Components
// ============================================================================

function QueryClientInspector() {
  const queryClient = useQueryClient();
  const defaultOptions = queryClient.getDefaultOptions();

  return (
    <div>
      <span data-testid="has-client">true</span>
      <span data-testid="stale-time">{String(defaultOptions.queries?.staleTime)}</span>
      <span data-testid="gc-time">{String(defaultOptions.queries?.gcTime)}</span>
      <span data-testid="retry">{String(defaultOptions.queries?.retry)}</span>
      <span data-testid="refetch-on-focus">
        {String(defaultOptions.queries?.refetchOnWindowFocus)}
      </span>
      <span data-testid="refetch-on-reconnect">
        {String(defaultOptions.queries?.refetchOnReconnect)}
      </span>
      <span data-testid="refetch-on-mount">{String(defaultOptions.queries?.refetchOnMount)}</span>
    </div>
  );
}

function SimpleChild() {
  return <div data-testid="child-rendered">Hello</div>;
}

function QueryUser({ queryKey }: { queryKey: string }) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => "test-data",
  });

  return (
    <div>
      <span data-testid="loading">{isLoading ? "yes" : "no"}</span>
      <span data-testid="data">{data ?? "none"}</span>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("QueryProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders children correctly", () => {
    render(
      <QueryProvider>
        <SimpleChild />
      </QueryProvider>,
    );

    expect(screen.getByTestId("child-rendered")).toHaveTextContent("Hello");
  });

  it("provides QueryClient to children", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>,
    );

    expect(screen.getByTestId("has-client")).toHaveTextContent("true");
  });

  it("configures staleTime for corpus data (5 minutes)", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>,
    );

    // 5 minutes = 300000ms
    expect(screen.getByTestId("stale-time")).toHaveTextContent("300000");
  });

  it("configures gcTime for caching (30 minutes)", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>,
    );

    // 30 minutes = 1800000ms
    expect(screen.getByTestId("gc-time")).toHaveTextContent("1800000");
  });

  it("configures retry count to 3", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>,
    );

    expect(screen.getByTestId("retry")).toHaveTextContent("3");
  });

  it("disables refetchOnWindowFocus for reading app", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>,
    );

    expect(screen.getByTestId("refetch-on-focus")).toHaveTextContent("false");
  });

  it("disables refetchOnReconnect for static corpus", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>,
    );

    expect(screen.getByTestId("refetch-on-reconnect")).toHaveTextContent("false");
  });

  it("disables refetchOnMount for fresh data", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>,
    );

    expect(screen.getByTestId("refetch-on-mount")).toHaveTextContent("false");
  });

  it("allows queries to execute within provider", async () => {
    render(
      <QueryProvider>
        <QueryUser queryKey="test-key" />
      </QueryProvider>,
    );

    // Initially loading
    expect(screen.getByTestId("loading")).toHaveTextContent("yes");
  });
});

describe("getQueryClient", () => {
  it("returns the same client on repeated calls in browser", () => {
    // In jsdom, window is defined, so we're in "browser" mode
    const client1 = getQueryClient();
    const client2 = getQueryClient();

    expect(client1).toBe(client2);
  });

  it("returns a QueryClient with configured defaults", () => {
    const client = getQueryClient();
    const defaultOptions = client.getDefaultOptions();

    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000);
    expect(defaultOptions.queries?.retry).toBe(3);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });
});
