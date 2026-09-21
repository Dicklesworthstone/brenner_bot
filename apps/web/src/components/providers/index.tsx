"use client";

/**
 * Providers Index
 *
 * Central export for all React context providers.
 * Import from here to get all providers in one place.
 */

export { getQueryClient, QueryProvider, type QueryProviderProps } from "./QueryProvider";

// ============================================================================
// UNIFIED PROVIDERS WRAPPER
// ============================================================================

import * as React from "react";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { ExcerptBasketProvider } from "@/components/excerpt";
import { SectionDataProvider } from "@/components/section-data-provider";
import { registerServiceWorker } from "@/lib/offline";
import { QueryProvider } from "./QueryProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Unified Providers component that wraps all application providers.
 *
 * Provider order matters:
 * 1. QueryProvider (TanStack Query) - outermost for data layer
 * 2. (Future) StoreProvider - for client state
 * 3. (Future) ThemeProvider - for theming
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { Providers } from "@/components/providers";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Providers>{children}</Providers>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function Providers({ children }: ProvidersProps) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      void registerServiceWorker();
    }
  }, []);

  return (
    <AnalyticsProvider>
      <QueryProvider>
        <SectionDataProvider>
          <ExcerptBasketProvider>{children}</ExcerptBasketProvider>
        </SectionDataProvider>
      </QueryProvider>
    </AnalyticsProvider>
  );
}

export type { ProvidersProps };
