"use client";

/**
 * useSessionMutation - TanStack Query Mutation for Session Kickoff
 *
 * Manages the session creation workflow with proper loading, error, and success states.
 * Wraps the /api/sessions POST endpoint.
 *
 * @example
 * ```tsx
 * function SessionForm() {
 *   const mutation = useSessionMutation();
 *
 *   const handleSubmit = (data: SessionKickoffInput) => {
 *     mutation.mutate(data, {
 *       onSuccess: (result) => {
 *         toast.success(`Session ${result.threadId} created!`);
 *         router.push(`/sessions/new?sent=1&thread=${result.threadId}`);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {mutation.isPending && <LoadingSpinner />}
 *       {mutation.isError && <ErrorMessage error={mutation.error} />}
 *       ...
 *     </form>
 *   );
 * }
 * ```
 */

import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { normalizeSystemError, nowMs, trackSystemEvent, trackSystemLatency } from "@/lib/analytics";
import { enqueueOfflineAction, isOnline } from "@/lib/offline";
import type { AgentRole, OperatorSelection } from "@/lib/schemas/session";

// ============================================================================
// Types
// ============================================================================

/** A single recipient-to-role mapping */
export interface RecipientRole {
  agentName: string;
  role: AgentRole;
}

export interface SessionKickoffInput {
  /** Agent Mail project key (defaults to repo root) */
  projectKey?: string;
  /** Name of the sending agent */
  sender: string;
  /** List of recipient agent names */
  recipients: string[];
  /** Unique thread identifier */
  threadId: string;
  /** Optional email subject (auto-generated if omitted) */
  subject?: string;
  /** Transcript excerpt to analyze */
  excerpt: string;
  /** Optional focus theme */
  theme?: string;
  /** Optional target domain */
  domain?: string;
  /** Optional guiding question */
  question?: string;
  /** Whether to require acknowledgment */
  ackRequired?: boolean;
  /** Custom operator selection per role (from prompt builder UI) */
  operatorSelection?: OperatorSelection;
  /** Roster mode: role_separated (each agent gets role-specific prompt) or unified */
  rosterMode?: "role_separated" | "unified";
  /** Explicit roster entries mapping agents to roles */
  roster?: RecipientRole[];
}

export interface SessionKickoffResult {
  success: true;
  threadId: string;
  messageId?: number;
  queued?: boolean;
  queuedAt?: string;
}

export interface SessionKickoffError {
  success: false;
  error: string;
  code: "VALIDATION_ERROR" | "AUTH_ERROR" | "NETWORK_ERROR" | "SERVER_ERROR";
}

export class SessionMutationError extends Error {
  code: SessionKickoffError["code"];

  constructor(response: SessionKickoffError) {
    super(response.error);
    this.name = "SessionMutationError";
    this.code = response.code;
  }

  get isValidationError(): boolean {
    return this.code === "VALIDATION_ERROR";
  }

  get isAuthError(): boolean {
    return this.code === "AUTH_ERROR";
  }

  get isNetworkError(): boolean {
    return this.code === "NETWORK_ERROR";
  }

  get isServerError(): boolean {
    return this.code === "SERVER_ERROR";
  }
}

// ============================================================================
// Mutation Function
// ============================================================================

async function createSession(input: SessionKickoffInput): Promise<SessionKickoffResult> {
  const start = nowMs();
  if (!isOnline()) {
    const payload = input as unknown as Record<string, unknown>;
    const queued = enqueueOfflineAction("session-kickoff", payload);
    trackSystemEvent("session_kickoff_queued", { reason: "offline" });
    return { success: true, threadId: input.threadId, queued: true, queuedAt: queued.createdAt };
  }

  let response: Response;
  try {
    response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (err) {
    if (!isOnline()) {
      const payload = input as unknown as Record<string, unknown>;
      const queued = enqueueOfflineAction("session-kickoff", payload);
      trackSystemEvent("session_kickoff_queued", { reason: "offline_after_error" });
      return { success: true, threadId: input.threadId, queued: true, queuedAt: queued.createdAt };
    }
    trackSystemEvent("session_kickoff_error", {
      stage: "network",
      ...normalizeSystemError(err),
    });
    throw new SessionMutationError({
      success: false,
      error: "Network request failed",
      code: "NETWORK_ERROR",
    });
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const success =
    response.ok && !!(data as SessionKickoffResult | SessionKickoffError | null)?.success;
  trackSystemLatency("session_kickoff", nowMs() - start, {
    status_code: response.status,
    success,
  });

  if (!success) {
    const payload: SessionKickoffError =
      data && typeof data === "object"
        ? (data as SessionKickoffError)
        : ({
            success: false,
            error: "Request failed",
            code: "NETWORK_ERROR",
          } satisfies SessionKickoffError);
    trackSystemEvent("session_kickoff_error", {
      status_code: response.status,
      error_code: payload.code,
      error_message: payload.error,
    });
    throw new SessionMutationError(payload);
  }

  return data as SessionKickoffResult;
}

// ============================================================================
// Hook
// ============================================================================

export type UseSessionMutationOptions = Omit<
  UseMutationOptions<SessionKickoffResult, SessionMutationError, SessionKickoffInput>,
  "mutationFn"
>;

/**
 * Mutation hook for creating Brenner Loop sessions.
 *
 * Features:
 * - Type-safe input/output
 * - Automatic retry (1 attempt by default via QueryProvider)
 * - Rich error types with code discrimination
 * - Loading state via isPending
 * - Success callbacks for navigation/toast
 *
 * @param options - Additional TanStack Query mutation options
 * @returns Mutation object with mutate/mutateAsync functions
 */
export function useSessionMutation(options?: UseSessionMutationOptions) {
  return useMutation({
    mutationFn: createSession,
    ...options,
  });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Type guard to check if an error is a SessionMutationError.
 */
export function isSessionMutationError(error: unknown): error is SessionMutationError {
  return error instanceof SessionMutationError;
}

/**
 * Get a user-friendly error message for display.
 */
export function getSessionErrorMessage(error: unknown): string {
  if (isSessionMutationError(error)) {
    switch (error.code) {
      case "VALIDATION_ERROR":
        return `Validation error: ${error.message}`;
      case "AUTH_ERROR":
        return "Not authorized. Please check your lab mode settings.";
      case "NETWORK_ERROR":
        return "Could not reach Agent Mail. Is the server running?";
      case "SERVER_ERROR":
        return `Server error: ${error.message}`;
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
