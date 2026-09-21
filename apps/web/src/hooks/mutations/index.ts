/**
 * Mutations Index
 *
 * Central export for all TanStack Query mutation hooks.
 * Mutations handle data modifications (POST, PUT, DELETE operations).
 */

export {
  getSessionErrorMessage,
  isSessionMutationError,
  type SessionKickoffError,
  type SessionKickoffInput,
  type SessionKickoffResult,
  SessionMutationError,
  type UseSessionMutationOptions,
  useSessionMutation,
} from "./useSessionMutation";
