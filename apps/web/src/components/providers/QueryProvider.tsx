"use client";

import { type DefaultOptions, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type * as React from "react";

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

/**
 * Default query options optimized for the Brenner Bot corpus.
 *
 * Rationale:
 * - Corpus data (transcript, distillations) rarely changes → long staleTime
 * - Keep parsed documents in memory to avoid re-parsing → long gcTime
 * - Retry failed requests with exponential backoff
 * - Disable refetch on window focus for reading-focused app
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Data is fresh for 5 minutes - corpus rarely changes
    staleTime: 5 * 60 * 1000,
    // Keep data in cache for 30 minutes even when unused
    gcTime: 30 * 60 * 1000,
    // Retry up to 3 times with exponential backoff
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Don't refetch on window focus - reading app doesn't need it
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect - corpus is static
    refetchOnReconnect: false,
    // Don't refetch on mount if data is fresh
    refetchOnMount: false,
  },
  mutations: {
    // Retry mutations once
    retry: 1,
  },
};

// ============================================================================
// QUERY CLIENT SINGLETON
// ============================================================================

/**
 * Create a QueryClient with optimized settings.
 * Uses a singleton pattern via React's useMemo to ensure
 * the same client is used throughout the component tree.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

// For server-side rendering, we need to create a new client each request
// to avoid sharing state between requests
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a new query client
    return makeQueryClient();
  }
  // Browser: reuse the same query client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider wraps the application with TanStack Query context.
 *
 * Features:
 * - Optimized caching for corpus data
 * - SSR-safe client instantiation
 * - Development-only React Query DevTools
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { QueryProvider } from "@/components/providers/QueryProvider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <QueryProvider>{children}</QueryProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Get the query client (SSR-safe)
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { getQueryClient, type QueryProviderProps };
