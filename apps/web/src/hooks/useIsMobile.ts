"use client";

/**
 * useIsMobile - Device detection hook for responsive behavior
 *
 * Detects mobile devices using:
 * 1. Viewport width (< 768px)
 * 2. Touch capability check
 * 3. User agent heuristics (for SSR-safe initial guess)
 *
 * Returns true on mobile devices, false on desktop.
 *
 * @see brenner_bot-1cv2 (Tutorial Mobile UX)
 * @module hooks/useIsMobile
 */

import * as React from "react";

const MOBILE_BREAKPOINT = 768; // Matches Tailwind's md breakpoint

/**
 * Check if the user agent suggests a mobile device.
 * Used for initial SSR-safe guess before client hydration.
 */
function checkUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
}

/**
 * Check if the device has touch capability.
 * Most mobile devices support touch, most desktops don't.
 */
function checkTouchCapability(): boolean {
  if (typeof window === "undefined") return false;

  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}

export interface UseIsMobileOptions {
  /** Custom breakpoint in pixels (default: 768) */
  breakpoint?: number;
  /** Consider touch-only devices as mobile even with wide screens */
  includeTouchDevices?: boolean;
}

export function useIsMobile(options: UseIsMobileOptions = {}): boolean {
  const { breakpoint = MOBILE_BREAKPOINT, includeTouchDevices = false } = options;

  // Initial state: use user agent for SSR-safe guess
  const [isMobile, setIsMobile] = React.useState(() => {
    // On server, default to false (optimistic for desktop)
    if (typeof window === "undefined") return false;

    // On client, check viewport width immediately
    return window.innerWidth < breakpoint;
  });

  React.useEffect(() => {
    const checkIsMobile = () => {
      const widthCheck = window.innerWidth < breakpoint;
      const touchCheck = includeTouchDevices ? checkTouchCapability() : false;
      const uaCheck = checkUserAgent();

      // Mobile if viewport is narrow, OR if we're on a touch device with mobile UA
      setIsMobile(widthCheck || (touchCheck && uaCheck));
    };

    // Check on mount
    checkIsMobile();

    // Listen to resize events
    window.addEventListener("resize", checkIsMobile);

    // Also check on orientation change (mobile-specific event)
    window.addEventListener("orientationchange", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
      window.removeEventListener("orientationchange", checkIsMobile);
    };
  }, [breakpoint, includeTouchDevices]);

  return isMobile;
}

/**
 * Simple hook that just checks viewport width.
 * Use this when you only care about screen size, not device type.
 */
export function useIsSmallScreen(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isSmall, setIsSmall] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  React.useEffect(() => {
    const checkWidth = () => {
      setIsSmall(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [breakpoint]);

  return isSmall;
}

export default useIsMobile;
