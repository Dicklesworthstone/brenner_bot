"use client";

/**
 * AnalyticsProvider - GA4 Client-Side Integration for BrennerBot
 *
 * This component initializes Google Analytics 4 and tracks:
 * - Page views (with Next.js App Router integration)
 * - Scroll depth (25%, 50%, 75%, 90%, 100%)
 * - Time on page (30s, 60s, 120s, 300s, 600s checkpoints)
 * - Tab visibility changes
 * - Page exit with engagement summary
 *
 * Usage:
 *   Wrap your app layout with this provider:
 *   <AnalyticsProvider>{children}</AnalyticsProvider>
 */

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { type ReactNode, Suspense, useCallback, useEffect, useRef } from "react";
import {
  type DocumentType,
  GA_MEASUREMENT_ID,
  getOrCreateUserId,
  trackDocumentExit,
  trackPagePerformance,
  trackScrollDepth,
  trackSessionStart,
  trackSystemEvent,
  trackTimeOnDocument,
} from "@/lib/analytics";

// =============================================================================
// Analytics Tracker Component (handles route changes)
// =============================================================================

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gaId = GA_MEASUREMENT_ID?.trim();

  // Refs for tracking engagement
  const hasInitializedGa = useRef(false);
  const hasSentSystemSnapshot = useRef(false);
  const scrollDepthsReached = useRef<Set<25 | 50 | 75 | 90 | 100>>(new Set());
  const pageStartTime = useRef<number>(0); // Initialized in effect on mount
  const lastTimeCheckpoint = useRef<number>(0);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ==========================================================================
  // Initialize gtag and config
  // ==========================================================================

  useEffect(() => {
    if (!gaId) return;
    let loadHandler: (() => void) | null = null;

    // Create gtag stub early
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = ((...args: unknown[]) => {
        window.dataLayer.push(args);
      }) as unknown as Window["gtag"];
    }

    // Initialize GA once
    if (!hasInitializedGa.current) {
      window.gtag("js", new Date());

      // Configure with custom dimensions mapping
      window.gtag("config", gaId, {
        cookie_flags: "SameSite=None;Secure",
        send_page_view: false, // We'll send manually on route changes
        allow_google_signals: true,
        allow_ad_personalization_signals: false,
        custom_map: {
          dimension1: "document_type",
          dimension2: "document_id",
          dimension3: "tutorial_step",
          dimension4: "jargon_term",
          dimension5: "operator_id",
        },
      });

      hasInitializedGa.current = true;

      // Track session start
      trackSessionStart();
      getOrCreateUserId();

      // Track performance after page load
      if (typeof window !== "undefined") {
        if (document.readyState === "complete") {
          // Page already loaded, track immediately
          setTimeout(trackPagePerformance, 100);
        } else {
          // Wait for load event
          loadHandler = () => {
            setTimeout(trackPagePerformance, 100);
          };
          window.addEventListener("load", loadHandler, { once: true });
        }
      }

      if (!hasSentSystemSnapshot.current) {
        const connection = (
          navigator as Navigator & {
            connection?: { effectiveType?: string; downlink?: number; rtt?: number };
          }
        ).connection;

        trackSystemEvent("client_capabilities", {
          hardware_threads: navigator.hardwareConcurrency ?? undefined,
          device_memory_gb:
            (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? undefined,
          connection_type: connection?.effectiveType,
          connection_downlink_mbps: connection?.downlink,
          connection_rtt_ms: connection?.rtt,
        });
        hasSentSystemSnapshot.current = true;
      }
    }

    return () => {
      if (loadHandler) {
        window.removeEventListener("load", loadHandler);
      }
    };
  }, [gaId]);

  // ==========================================================================
  // Track page views on route changes
  // ==========================================================================

  useEffect(() => {
    if (!gaId) return;

    // Reset engagement tracking for new page
    scrollDepthsReached.current = new Set();
    pageStartTime.current = Date.now();
    lastTimeCheckpoint.current = 0;

    // Send page view
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams, gaId]);

  // ==========================================================================
  // Scroll depth tracking
  // ==========================================================================

  const handleScroll = useCallback(() => {
    if (!gaId) return;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

    const milestones: (25 | 50 | 75 | 90 | 100)[] = [25, 50, 75, 90, 100];

    for (const milestone of milestones) {
      if (scrollPercent >= milestone && !scrollDepthsReached.current.has(milestone)) {
        scrollDepthsReached.current.add(milestone);

        // Determine document type from pathname
        const docType = getDocumentTypeFromPath(pathname);
        const docId = getDocumentIdFromPath(pathname);

        trackScrollDepth(milestone, docType, docId);
      }
    }
  }, [pathname, gaId]);

  useEffect(() => {
    if (!gaId) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll, gaId]);

  // ==========================================================================
  // Time on page tracking
  // ==========================================================================

  useEffect(() => {
    if (!gaId) return;

    const timeCheckpoints = [30, 60, 120, 300, 600]; // seconds

    timeIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - pageStartTime.current) / 1000);

      for (const checkpoint of timeCheckpoints) {
        if (elapsed >= checkpoint && lastTimeCheckpoint.current < checkpoint) {
          const docType = getDocumentTypeFromPath(pathname);
          const docId = getDocumentIdFromPath(pathname);

          trackTimeOnDocument(checkpoint, docType, docId);
          lastTimeCheckpoint.current = checkpoint;
        }
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [pathname, gaId]);

  // ==========================================================================
  // Visibility and page exit tracking
  // ==========================================================================

  useEffect(() => {
    if (!gaId) return;

    const handleVisibilityChange = () => {
      const timeSpent = Math.floor((Date.now() - pageStartTime.current) / 1000);

      if (document.hidden) {
        window.gtag?.("event", "page_hidden", {
          page_path: pathname,
          time_spent_seconds: timeSpent,
        });
      } else {
        window.gtag?.("event", "page_visible", {
          page_path: pathname,
        });
      }
    };

    const handleBeforeUnload = () => {
      const timeSpent = Math.floor((Date.now() - pageStartTime.current) / 1000);
      const maxScroll = Math.max(...Array.from(scrollDepthsReached.current), 0);

      const docType = getDocumentTypeFromPath(pathname);
      const docId = getDocumentIdFromPath(pathname);

      trackDocumentExit(docType, docId, timeSpent, maxScroll);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pathname, gaId]);

  return null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine document type from URL pathname
 */
function getDocumentTypeFromPath(pathname: string): DocumentType {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/corpus/transcript")) return "transcript";
  if (pathname.startsWith("/corpus/quotebank")) return "quote_bank";
  if (pathname.startsWith("/corpus")) return "transcript";
  if (pathname.startsWith("/distillations")) return "distillation";
  if (pathname.startsWith("/method")) return "method";
  if (pathname.startsWith("/operators")) return "operators";
  if (pathname.startsWith("/glossary")) return "glossary";
  if (pathname.startsWith("/sessions")) return "session";
  return "landing";
}

/**
 * Extract document ID from URL pathname
 */
function getDocumentIdFromPath(pathname: string): string {
  // Extract meaningful ID from path
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length >= 2) {
    // e.g., /corpus/transcript -> 'transcript'
    // e.g., /distillations/opus -> 'opus'
    return segments[segments.length - 1];
  }

  return segments[0] || "home";
}

// =============================================================================
// Main Provider Component
// =============================================================================

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const gaId = GA_MEASUREMENT_ID?.trim();

  // Skip if GA not configured
  if (!gaId) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Load Google Analytics script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        strategy="afterInteractive"
      />

      {/* Analytics tracker with Suspense for useSearchParams */}
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>

      {children}
    </>
  );
}

export default AnalyticsProvider;
