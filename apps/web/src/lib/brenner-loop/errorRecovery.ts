/**
 * Error Recovery Utilities
 *
 * Provides resilient wrappers for transient failures, data corruption,
 * and agent dispatch timeouts.
 *
 * @see brenner_bot-ft14 (bead)
 */

import { recoverSessions, StorageError, sessionStorage } from "./storage";
import type { Session } from "./types";
import { isSession } from "./types";

// ============================================================================
// Types
// ============================================================================

export type RecoverySeverity = "info" | "warning" | "error";

export interface RecoveryAction {
  label: string;
  action?: () => void;
  variant?: "default" | "outline" | "destructive";
}

export interface RecoveryNotice {
  title: string;
  message: string;
  detail?: string;
  safeStateMessage?: string;
  severity: RecoverySeverity;
  actions?: RecoveryAction[];
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export interface TimeoutOptions {
  timeoutMs: number;
  timeoutMessage?: string;
}

export interface RecoveryResult<T> {
  data: T | null;
  recovered: boolean;
  error?: Error;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(delay: number, jitterRatio: number): number {
  if (jitterRatio <= 0) return delay;
  const jitter = delay * jitterRatio;
  const min = Math.max(0, delay - jitter);
  const max = delay + jitter;
  return Math.round(min + Math.random() * (max - min));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Retry wrapper with exponential backoff.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    jitterRatio = 0.2,
    shouldRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const allowRetry = shouldRetry ? shouldRetry(error, attempt) : true;
      if (!allowRetry || attempt === maxAttempts) break;

      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(withJitter(delay, jitterRatio));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Retry attempts exhausted");
}

/**
 * Promise wrapper that rejects with TimeoutError after a timeout.
 */
export async function withTimeout<T>(promise: Promise<T>, options: TimeoutOptions): Promise<T> {
  const { timeoutMs, timeoutMessage = "Operation timed out" } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Attempt to load a session and recover if corrupted.
 */
export async function loadSessionWithRecovery(sessionId: string): Promise<RecoveryResult<Session>> {
  try {
    const session = await sessionStorage.load(sessionId);
    if (!session) {
      return { data: null, recovered: false };
    }

    if (!isSession(session)) {
      throw new StorageError("Session validation failed", "CORRUPTED_DATA");
    }

    return { data: session, recovered: false };
  } catch (error) {
    if (error instanceof StorageError && error.code === "CORRUPTED_DATA") {
      const recoveredCount = await recoverSessions();
      if (recoveredCount > 0) {
        const session = await sessionStorage.load(sessionId).catch(() => null);
        if (session && isSession(session)) {
          return { data: session, recovered: true };
        }
      }
    }

    return {
      data: null,
      recovered: false,
      error: error instanceof Error ? error : new Error("Failed to load session"),
    };
  }
}

/**
 * Build a user-facing notice for common recovery categories.
 */
export function createRecoveryNotice(
  title: string,
  message: string,
  severity: RecoverySeverity,
  actions?: RecoveryAction[],
  detail?: string,
  safeStateMessage?: string,
): RecoveryNotice {
  return {
    title,
    message,
    severity,
    actions,
    detail,
    safeStateMessage,
  };
}
