"use client";

import * as React from "react";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/lib/animations/hooks";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type RevealAnimation =
  | "reveal-up"
  | "reveal-scale"
  | "reveal-slide-right"
  | "reveal-slide-left"
  | "reveal-blur"
  | "fade-in-up"
  | "fade-in"
  | "fade-in-scale";

interface AnimatedElementProps {
  children: React.ReactNode;
  /** Animation to play when element enters viewport */
  animation?: RevealAnimation;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Duration of animation (ms) - optional, uses CSS default */
  duration?: number;
  /** Whether animation should only play once (default: true) */
  once?: boolean;
  /** Visibility threshold to trigger animation (0-1) */
  threshold?: number;
  /** Root margin for earlier/later triggering */
  rootMargin?: string;
  /** Additional CSS classes */
  className?: string;
  /** HTML tag to render */
  as?: keyof React.JSX.IntrinsicElements;
  /** Disable animation (useful for reduced motion) */
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Wrapper component that applies scroll-reveal animations to children.
 * Uses Intersection Observer for performant viewport detection.
 *
 * @example
 * ```tsx
 * <AnimatedElement animation="reveal-up" delay={100}>
 *   <Card>Content here</Card>
 * </AnimatedElement>
 * ```
 */
export function AnimatedElement({
  children,
  animation = "reveal-up",
  delay = 0,
  duration,
  once = true,
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
  className,
  as: Component = "div",
  disabled = false,
}: AnimatedElementProps) {
  const { ref, hasBeenInView } = useInView<HTMLDivElement>({
    threshold,
    rootMargin,
    triggerOnce: once,
  });

  const prefersReducedMotion = useReducedMotion();

  const shouldAnimate = !disabled && !prefersReducedMotion;

  const animationClass = shouldAnimate
    ? hasBeenInView
      ? `animate-${animation}`
      : "opacity-0"
    : "";

  const style: React.CSSProperties = shouldAnimate
    ? {
        animationDelay: delay > 0 ? `${delay}ms` : undefined,
        animationDuration: duration ? `${duration}ms` : undefined,
      }
    : {};

  return React.createElement(
    Component,
    {
      ref,
      className: cn(animationClass, className),
      style,
    },
    children,
  );
}

// ============================================================================
// STAGGERED ANIMATION CONTAINER
// ============================================================================

interface StaggerContainerProps {
  children: React.ReactNode;
  /** Base delay for first child (ms) */
  baseDelay?: number;
  /** Delay increment between children (ms) */
  staggerDelay?: number;
  /** Animation to apply to children */
  animation?: RevealAnimation;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Container that applies staggered animations to direct children.
 * Each child gets an increasing delay for a cascade effect.
 *
 * @example
 * ```tsx
 * <StaggerContainer staggerDelay={100}>
 *   <Card>First (0ms delay)</Card>
 *   <Card>Second (100ms delay)</Card>
 *   <Card>Third (200ms delay)</Card>
 * </StaggerContainer>
 * ```
 */
export function StaggerContainer({
  children,
  baseDelay = 0,
  staggerDelay = 75,
  animation = "reveal-up",
  className,
}: StaggerContainerProps) {
  const childArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <AnimatedElement key={index} animation={animation} delay={baseDelay + index * staggerDelay}>
          {child}
        </AnimatedElement>
      ))}
    </div>
  );
}

// ============================================================================
// HERO BACKGROUND COMPONENT
// ============================================================================

interface HeroBackgroundProps {
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Show animated gradient orbs */
  showOrbs?: boolean;
  /** Show subtle grid pattern */
  showGrid?: boolean;
  /** Primary orb color class */
  primaryOrbClass?: string;
  /** Accent orb color class */
  accentOrbClass?: string;
}

/**
 * Animated hero background with floating gradient orbs and optional grid pattern.
 * Creates a premium, Linear/Stripe-inspired visual effect.
 */
export function HeroBackground({
  children,
  className,
  showOrbs = true,
  showGrid = true,
  primaryOrbClass = "bg-primary/20",
  accentOrbClass = "bg-accent/15",
}: HeroBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Animated gradient orbs */}
      {showOrbs && (
        <div className="absolute inset-0 -z-10 pointer-events-none">
          {/* Primary orb - top right */}
          <div
            className={cn(
              "absolute -top-40 -right-40 size-96 rounded-full blur-3xl",
              "animate-orb-float-1",
              primaryOrbClass,
            )}
          />
          {/* Accent orb - bottom left */}
          <div
            className={cn(
              "absolute -bottom-40 -left-40 size-80 rounded-full blur-3xl",
              "animate-orb-float-2",
              accentOrbClass,
            )}
          />
          {/* Third orb - center */}
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "size-64 rounded-full blur-3xl opacity-50",
              "animate-orb-float-3",
              primaryOrbClass,
            )}
          />
        </div>
      )}

      {/* Subtle grid pattern */}
      {showGrid && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, var(--border) 1px, transparent 1px),
                              linear-gradient(to bottom, var(--border) 1px, transparent 1px)`,
            backgroundSize: "4rem 4rem",
          }}
        />
      )}

      {children}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { AnimatedElementProps, HeroBackgroundProps, RevealAnimation, StaggerContainerProps };
