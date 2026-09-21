/**
 * Unit tests for useAsyncOperation hook
 *
 * @see @/hooks/useAsyncOperation.ts
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsyncOperation } from "./useAsyncOperation";

describe("useAsyncOperation", () => {
  it("runs an operation and reports success", async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const operation = vi.fn(async () => "ok");
    const onSuccess = vi.fn();

    await act(async () => {
      await result.current.run(operation, { message: "Saving", onSuccess });
    });

    expect(operation).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith("ok");
    expect(result.current.state.status).toBe("success");
  });

  it("rolls back and reports error on failure", async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const rollback = vi.fn();

    await act(async () => {
      await result.current.run(
        async () => {
          throw new Error("boom");
        },
        { message: "Saving", rollback },
      );
    });

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBe("boom");
  });

  it("supports optimistic updates", async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const optimisticUpdate = vi.fn();

    await act(async () => {
      await result.current.run(async () => "ok", { optimisticUpdate });
    });

    expect(optimisticUpdate).toHaveBeenCalledTimes(1);
  });
});
