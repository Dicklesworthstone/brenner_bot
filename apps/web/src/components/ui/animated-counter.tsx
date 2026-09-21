"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/animations/hooks";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  duration?: number;
  delay?: number;
}

/**
 * Animated counter that counts up from 0 to the target value.
 * Uses easeOutExpo for a snappy feel.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  duration = 1000,
  delay = 0,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Start animation when element is in viewport
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasStarted]);

  // Animate the counter using requestAnimationFrame (external system callback)
  useEffect(() => {
    if (!hasStarted) return;

    const startTime = performance.now() + delay;
    let animationFrame: number;

    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - 2 ** (-10 * t);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed < 0) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      // For reduced motion, skip to final value immediately
      if (prefersReducedMotion) {
        setDisplayValue(value);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const currentValue = Math.round(easedProgress * value);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasStarted, value, duration, delay, prefersReducedMotion]);

  return (
    <span ref={elementRef}>
      {displayValue}
      {suffix}
    </span>
  );
}
