/**
 * useAgentDispatch Hook
 *
 * React hook for managing agent dispatch state in the Brenner Loop tribunal.
 * Provides methods to dispatch agents, poll for responses, and track status.
 *
 * @module hooks/useAgentDispatch
 * @see brenner_bot-xlk2.2 (Implement Agent Dispatch via Agent Mail)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentMailClient } from "@/lib/agentMail";
import type { TribunalAgentRole } from "@/lib/brenner-loop/agents";
import type {
  AgentDispatch,
  OperatorResults,
  TribunalAgentResponse,
} from "@/lib/brenner-loop/agents/dispatch";
import {
  checkAgentAvailability,
  createDispatch,
  DEFAULT_DISPATCH_ROLES,
  dispatchAllTasks,
  getDispatchStatus,
  getFallbackContent,
  pollForResponses,
} from "@/lib/brenner-loop/agents/dispatch";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";

// ============================================================================
// Types
// ============================================================================

/**
 * Overall status of the dispatch operation
 */
export type DispatchState =
  | "idle" // Not started
  | "checking" // Checking agent availability
  | "dispatching" // Sending dispatch messages
  | "polling" // Waiting for responses
  | "complete" // All responses received
  | "unavailable" // Agents not available
  | "error"; // Error occurred

/**
 * Configuration for the hook
 */
export interface UseAgentDispatchConfig {
  /** Agent Mail project key (absolute path) */
  projectKey: string;

  /** Sender agent name for dispatches */
  senderName: string;

  /** Poll interval in milliseconds (default: 5000) */
  pollIntervalMs?: number;

  /** Maximum poll attempts before giving up (default: 60 = 5 min with 5s interval) */
  maxPollAttempts?: number;

  /** Auto-start polling after dispatch */
  autoStartPolling?: boolean;
}

/**
 * Return type of the hook
 */
export interface UseAgentDispatchResult {
  /** Current state of the dispatch operation */
  state: DispatchState;

  /** The dispatch object with all tasks and responses */
  dispatch: AgentDispatch | null;

  /** Status counts */
  status: {
    pending: number;
    dispatched: number;
    received: number;
    errors: number;
    total: number;
    complete: boolean;
  } | null;

  /** Available agents (after check) */
  availableAgents: string[];

  /** All responses collected */
  responses: TribunalAgentResponse[];

  /** Fallback content when agents unavailable */
  fallback: ReturnType<typeof getFallbackContent> | null;

  /** Error message if state is "error" */
  error: string | null;

  // Actions

  /** Start a new dispatch for a hypothesis */
  startDispatch: (
    hypothesis: HypothesisCard,
    sessionId: string,
    operatorResults?: OperatorResults,
    roles?: TribunalAgentRole[],
  ) => Promise<void>;

  /** Manually trigger polling for responses */
  poll: () => Promise<void>;

  /** Start continuous polling */
  startPolling: () => void;

  /** Stop continuous polling */
  stopPolling: () => void;

  /** Reset to initial state */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing agent dispatch in the Brenner Loop tribunal
 */
export function useAgentDispatch(config: UseAgentDispatchConfig): UseAgentDispatchResult {
  const {
    projectKey,
    senderName,
    pollIntervalMs = 5000,
    maxPollAttempts = 60,
    autoStartPolling = true,
  } = config;

  // State
  const [state, setState] = useState<DispatchState>("idle");
  const [dispatch, setDispatch] = useState<AgentDispatch | null>(null);
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const [fallback, setFallback] = useState<ReturnType<typeof getFallbackContent> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for polling
  const clientRef = useRef<AgentMailClient | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // Initialize client
  useEffect(() => {
    clientRef.current = new AgentMailClient();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Computed status
  const status = dispatch ? getDispatchStatus(dispatch) : null;
  const responses = dispatch?.responses ?? [];

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  /**
   * Single poll for responses
   */
  const poll = useCallback(async () => {
    if (!dispatch || !clientRef.current) return;
    if (dispatch.complete) {
      stopPolling();
      setState("complete");
      return;
    }

    try {
      const updated = await pollForResponses(clientRef.current, dispatch, {
        projectKey,
        agentName: senderName,
      });

      setDispatch(updated);

      if (updated.complete) {
        stopPolling();
        setState("complete");
      }
    } catch (err) {
      console.error("Poll error:", err);
      // Don't stop polling on transient errors
    }
  }, [dispatch, projectKey, senderName, stopPolling]);

  /**
   * Start continuous polling
   */
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // Already polling

    setState("polling");
    pollCountRef.current = 0;

    pollingRef.current = setInterval(() => {
      pollCountRef.current++;

      if (pollCountRef.current > maxPollAttempts) {
        stopPolling();
        setState("complete"); // Treat as complete even if not all responded
        return;
      }

      void poll();
    }, pollIntervalMs);

    // Initial poll immediately
    void poll();
  }, [poll, pollIntervalMs, maxPollAttempts, stopPolling]);

  /**
   * Start a new dispatch
   */
  const startDispatch = useCallback(
    async (
      hypothesis: HypothesisCard,
      sessionId: string,
      operatorResults?: OperatorResults,
      roles?: TribunalAgentRole[],
    ) => {
      if (!clientRef.current) {
        setError("Agent Mail client not initialized");
        setState("error");
        return;
      }

      // Reset state
      setError(null);
      setFallback(null);
      stopPolling();

      setState("checking");

      try {
        // Check if agents are available
        const availability = await checkAgentAvailability(clientRef.current, projectKey);
        setAvailableAgents(availability.agents);

        if (!availability.available) {
          // No agents available, provide fallback
          const fallbackContent = getFallbackContent(hypothesis);
          setFallback(fallbackContent);
          setState("unavailable");
          return;
        }

        setState("dispatching");

        // Create dispatch
        const newDispatch = createDispatch({
          sessionId,
          hypothesis,
          operatorResults,
          projectKey,
          senderName,
          roles: roles ?? DEFAULT_DISPATCH_ROLES,
        });

        // Dispatch all tasks
        const dispatched = await dispatchAllTasks(clientRef.current, newDispatch, {
          projectKey,
          senderName,
          recipients: availability.agents,
        });

        setDispatch(dispatched);

        // Start polling if auto-enabled
        if (autoStartPolling) {
          startPolling();
        } else {
          setState("polling");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setState("error");
      }
    },
    [projectKey, senderName, autoStartPolling, startPolling, stopPolling],
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    stopPolling();
    setState("idle");
    setDispatch(null);
    setAvailableAgents([]);
    setFallback(null);
    setError(null);
  }, [stopPolling]);

  return {
    state,
    dispatch,
    status,
    availableAgents,
    responses,
    fallback,
    error,
    startDispatch,
    poll,
    startPolling,
    stopPolling,
    reset,
  };
}

export default useAgentDispatch;
