/**
 * useAsyncOperation Hook
 *
 * Tracks async operation state with optional progress and optimistic updates.
 *
 * @module hooks/useAsyncOperation
 * @see brenner_bot-ik2s (Implement Loading States & Optimistic Updates)
 */

"use client";

import { useCallback, useMemo, useState } from "react";

export type AsyncOperationStatus = "idle" | "loading" | "success" | "error";

export interface AsyncOperationState {
  status: AsyncOperationStatus;
  progress?: number;
  message?: string;
  startedAt?: string;
  estimatedDuration?: number;
  cancellable: boolean;
  error?: string;
}

export interface AsyncOperationOptions {
  message?: string;
  progress?: number;
  estimatedDuration?: number;
  cancellable?: boolean;
}

export interface RunOperationOptions<T> extends AsyncOperationOptions {
  optimisticUpdate?: () => void;
  rollback?: () => void;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export interface UseAsyncOperationResult {
  state: AsyncOperationState;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  start: (options?: AsyncOperationOptions) => void;
  update: (options: Partial<AsyncOperationOptions>) => void;
  succeed: (message?: string) => void;
  fail: (error: Error, message?: string) => void;
  reset: () => void;
  run: <T>(operation: () => Promise<T>, options?: RunOperationOptions<T>) => Promise<T | null>;
}

const initialState: AsyncOperationState = {
  status: "idle",
  cancellable: false,
};

export function useAsyncOperation(): UseAsyncOperationResult {
  const [state, setState] = useState<AsyncOperationState>(initialState);

  const start = useCallback((options?: AsyncOperationOptions) => {
    setState({
      status: "loading",
      message: options?.message,
      progress: options?.progress,
      estimatedDuration: options?.estimatedDuration,
      cancellable: options?.cancellable ?? false,
      startedAt: new Date().toISOString(),
    });
  }, []);

  const update = useCallback((options: Partial<AsyncOperationOptions>) => {
    setState((prev) => ({
      ...prev,
      message: options.message ?? prev.message,
      progress: options.progress ?? prev.progress,
      estimatedDuration: options.estimatedDuration ?? prev.estimatedDuration,
      cancellable: options.cancellable ?? prev.cancellable,
    }));
  }, []);

  const succeed = useCallback((message?: string) => {
    setState((prev) => ({
      ...prev,
      status: "success",
      message: message ?? prev.message,
      progress: 1,
      error: undefined,
    }));
  }, []);

  const fail = useCallback((error: Error, message?: string) => {
    setState((prev) => ({
      ...prev,
      status: "error",
      message: message ?? prev.message,
      error: error.message,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const run = useCallback(
    async <T>(operation: () => Promise<T>, options?: RunOperationOptions<T>) => {
      const { optimisticUpdate, rollback, onSuccess, onError, ...stateOptions } = options ?? {};

      start(stateOptions);
      optimisticUpdate?.();

      try {
        const result = await operation();
        succeed(stateOptions.message);
        onSuccess?.(result);
        return result;
      } catch (error) {
        rollback?.();
        const err = error instanceof Error ? error : new Error("Operation failed");
        fail(err, stateOptions.message);
        onError?.(err);
        return null;
      }
    },
    [fail, start, succeed],
  );

  const derived = useMemo(() => {
    return {
      isLoading: state.status === "loading",
      isError: state.status === "error",
      isSuccess: state.status === "success",
    };
  }, [state.status]);

  return {
    state,
    ...derived,
    start,
    update,
    succeed,
    fail,
    reset,
    run,
  };
}

export default useAsyncOperation;
