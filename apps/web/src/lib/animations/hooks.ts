/**
 * Animation Hooks
 *
 * Provides hooks for reduced motion detection and scroll-linked animations.
 *
 * @see brenner_bot-f8vs.9 (Animation & Scroll Effects System)
 */

"use client";

import { type MotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { TIMING } from "./motion-variants";

// ============================================================================
// REDUCED MOTION HOOK
// ============================================================================

/**
 * Hook to detect user's reduced motion preference.
 *
 * @returns true if user prefers reduced motion
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * const animationDuration = prefersReducedMotion ? 0 : 0.5;
 * ```
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false, // Server snapshot
  );
}

/**
 * Hook that returns animation values based on reduced motion preference.
 *
 * @returns Object with conditional animation values
 *
 * @example
 * ```tsx
 * const { duration, shouldAnimate } = useAnimationPreference();
 * ```
 */
export function useAnimationPreference() {
  const prefersReducedMotion = useReducedMotion();

  return useMemo(
    () => ({
      shouldAnimate: !prefersReducedMotion,
      duration: prefersReducedMotion ? 0 : TIMING.normal,
      microDuration: prefersReducedMotion ? 0 : TIMING.micro,
      slowDuration: prefersReducedMotion ? 0 : TIMING.slow,
    }),
    [prefersReducedMotion],
  );
}

// ============================================================================
// PARALLAX HOOKS
// ============================================================================

interface UseParallaxOptions {
  /** Parallax speed factor. 0.5 = moves at half scroll speed (default) */
  speed?: number;
  /** Direction of parallax movement */
  direction?: "up" | "down";
  /** Whether to disable on reduced motion preference */
  respectReducedMotion?: boolean;
}

/**
 * Hook for scroll-linked parallax effect.
 *
 * @param options - Configuration options
 * @returns MotionValue for y transform
 *
 * @example
 * ```tsx
 * function ParallaxBackground() {
 *   const y = useParallax({ speed: 0.3 });
 *   return <motion.div style={{ y }}>Background</motion.div>;
 * }
 * ```
 */
export function useParallax(options: UseParallaxOptions = {}): MotionValue<number> {
  const { speed = 0.5, direction = "up", respectReducedMotion = true } = options;

  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Calculate parallax offset based on scroll position
  const multiplier = direction === "up" ? -speed : speed;
  const rawY = useTransform(scrollY, (latest) => {
    if (respectReducedMotion && prefersReducedMotion) return 0;
    return latest * multiplier;
  });

  // Smooth the motion with spring physics
  const y = useSpring(rawY, { stiffness: 100, damping: 30 });

  return y;
}

interface UseScrollProgressOptions {
  /** Container element ref (defaults to document) */
  container?: React.RefObject<HTMLElement | null>;
  /** Start tracking when element is this far into viewport (0-1) */
  offset?: [string, string];
}

/**
 * Hook for tracking scroll progress through an element.
 *
 * @param elementRef - Ref to the element to track
 * @param options - Configuration options
 * @returns Progress value from 0 to 1
 *
 * @example
 * ```tsx
 * function ProgressSection() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   const progress = useScrollProgress(ref);
 *
 *   return (
 *     <div ref={ref}>
 *       <motion.div style={{ scaleX: progress }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollProgress(
  elementRef: React.RefObject<HTMLElement | null>,
  options: UseScrollProgressOptions = {},
): MotionValue<number> {
  const { offset = ["start end", "end start"] } = options;

  const { scrollYProgress } = useScroll({
    target: elementRef,
    offset: offset as ["start end", "end start"],
    container: options.container,
  });

  return scrollYProgress;
}

/**
 * Hook for element visibility based on scroll progress.
 *
 * @param elementRef - Ref to the element to track
 * @returns Object with progress value and visibility state
 */
export function useScrollVisibility(elementRef: React.RefObject<HTMLElement | null>) {
  const progress = useScrollProgress(elementRef);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = progress.on("change", (latest) => {
      // Element is visible when progress is between 0 and 1
      setIsVisible(latest > 0 && latest < 1);
    });

    return unsubscribe;
  }, [progress]);

  return { progress, isVisible };
}

// ============================================================================
// SCROLL VELOCITY HOOK
// ============================================================================

/**
 * Hook to track scroll velocity for momentum-based effects.
 *
 * @returns Current scroll velocity (pixels per second, smoothed)
 */
export function useScrollVelocity(): MotionValue<number> {
  const { scrollY } = useScroll();

  const velocity = useSpring(
    useTransform(scrollY, (current) => current),
    { stiffness: 100, damping: 20 },
  );

  return velocity;
}

// ============================================================================
// STAGGER DELAY HOOK
// ============================================================================

/**
 * Hook to calculate stagger delays for a list of items.
 *
 * @param count - Number of items
 * @param baseDelay - Delay for first item (ms)
 * @param staggerDelay - Delay between items (ms)
 * @returns Array of delay values
 *
 * @example
 * ```tsx
 * function List({ items }) {
 *   const delays = useStaggerDelays(items.length, 100, 50);
 *   return items.map((item, i) => (
 *     <motion.div
 *       initial={{ opacity: 0 }}
 *       animate={{ opacity: 1, transition: { delay: delays[i] } }}
 *     />
 *   ));
 * }
 * ```
 */
export function useStaggerDelays(count: number, baseDelay = 0, staggerDelay = 75): number[] {
  return useMemo(() => {
    const delays: number[] = [];
    for (let i = 0; i < count; i++) {
      delays.push((baseDelay + i * staggerDelay) / 1000);
    }
    return delays;
  }, [count, baseDelay, staggerDelay]);
}

// ============================================================================
// INTERSECTION ANIMATION HOOK
// ============================================================================

interface UseIntersectionAnimationOptions {
  /** Threshold for triggering (0-1) */
  threshold?: number;
  /** Root margin for earlier/later triggering */
  rootMargin?: string;
  /** Only trigger once */
  triggerOnce?: boolean;
  /** Disable animation */
  disabled?: boolean;
}

/**
 * Hook that combines intersection observer with animation state.
 *
 * @param options - Configuration options
 * @returns Object with ref and animation state
 *
 * @example
 * ```tsx
 * function AnimatedCard() {
 *   const { ref, isInView, hasAnimated } = useIntersectionAnimation();
 *
 *   return (
 *     <motion.div
 *       ref={ref}
 *       initial="hidden"
 *       animate={isInView ? "visible" : "hidden"}
 *       variants={fadeUp}
 *     />
 *   );
 * }
 * ```
 */
export function useIntersectionAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionAnimationOptions = {},
) {
  const {
    threshold = 0.1,
    rootMargin = "-100px 0px",
    triggerOnce = true,
    disabled = false,
  } = options;

  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // If reduced motion or disabled, show immediately
  const shouldSkipAnimation = disabled || prefersReducedMotion;

  useEffect(() => {
    if (shouldSkipAnimation) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        if (entry.isIntersecting) {
          setIsInView(true);
          setHasAnimated(true);

          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, shouldSkipAnimation]);

  return {
    ref,
    isInView: shouldSkipAnimation ? true : isInView,
    hasAnimated: shouldSkipAnimation ? true : hasAnimated,
  };
}

// ============================================================================
// HOVER STATE HOOK
// ============================================================================

/**
 * Hook for tracking hover state with delay options.
 *
 * @param enterDelay - Delay before hover state becomes true (ms)
 * @param leaveDelay - Delay before hover state becomes false (ms)
 * @returns Object with hover state and event handlers
 */
export function useHoverState(enterDelay = 0, leaveDelay = 0) {
  const [isHovered, setIsHovered] = useState(false);
  const enterTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onMouseEnter = useCallback(() => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
    }

    if (enterDelay > 0) {
      enterTimeout.current = setTimeout(() => setIsHovered(true), enterDelay);
    } else {
      setIsHovered(true);
    }
  }, [enterDelay]);

  const onMouseLeave = useCallback(() => {
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current);
    }

    if (leaveDelay > 0) {
      leaveTimeout.current = setTimeout(() => setIsHovered(false), leaveDelay);
    } else {
      setIsHovered(false);
    }
  }, [leaveDelay]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (enterTimeout.current) clearTimeout(enterTimeout.current);
      if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    };
  }, []);

  return {
    isHovered,
    hoverProps: { onMouseEnter, onMouseLeave },
  };
}
