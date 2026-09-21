/**
 * Animation Components
 *
 * Framer Motion-based components for scroll-reveal, parallax, and
 * interactive animations.
 *
 * @see brenner_bot-f8vs.9 (Animation & Scroll Effects System)
 */

"use client";

import { AnimatePresence, type MotionProps, motion, type Variants } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useIntersectionAnimation, useParallax, useReducedMotion } from "./hooks";
import {
  blurIn,
  buttonHover,
  buttonTap,
  cardHover,
  fadeIn,
  fadeUp,
  iconHover,
  popIn,
  scaleIn,
  slideInLeft,
  slideInRight,
  staggerNormal,
  transitions,
  viewport,
} from "./motion-variants";

// ============================================================================
// ANIMATE ON SCROLL COMPONENT
// ============================================================================

type AnimationVariant =
  | "fadeUp"
  | "fadeIn"
  | "scaleIn"
  | "popIn"
  | "slideInRight"
  | "slideInLeft"
  | "blurIn";

const variantMap: Record<AnimationVariant, Variants> = {
  fadeUp,
  fadeIn,
  scaleIn,
  popIn,
  slideInRight,
  slideInLeft,
  blurIn,
};

// Supported HTML elements for AnimateOnScroll
type SupportedElement =
  | "div"
  | "section"
  | "article"
  | "main"
  | "aside"
  | "header"
  | "footer"
  | "nav"
  | "span"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "ul"
  | "ol"
  | "li";

// Motion component map - typed as any internally since each motion element has a unique type
// but they all share the same runtime interface for our use case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const motionComponents: Record<SupportedElement, any> = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  main: motion.main,
  aside: motion.aside,
  header: motion.header,
  footer: motion.footer,
  nav: motion.nav,
  span: motion.span,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
};

interface AnimateOnScrollProps extends Omit<MotionProps, "initial" | "animate" | "variants"> {
  children: React.ReactNode;
  /** Animation variant to use */
  variant?: AnimationVariant;
  /** Custom variants (overrides variant prop) */
  variants?: Variants;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render (limited to common layout elements) */
  as?: SupportedElement;
  /** Disable animation */
  disabled?: boolean;
  /** Only animate once */
  once?: boolean;
  /** Root margin for intersection detection */
  rootMargin?: string;
}

/**
 * Component that animates children when they scroll into view.
 * Uses Framer Motion with IntersectionObserver.
 *
 * @example
 * ```tsx
 * <AnimateOnScroll variant="fadeUp" delay={0.2}>
 *   <Card>Content here</Card>
 * </AnimateOnScroll>
 * ```
 */
export function AnimateOnScroll({
  children,
  variant = "fadeUp",
  variants: customVariants,
  delay = 0,
  className,
  as = "div",
  disabled = false,
  once = true,
  rootMargin = "-100px 0px",
  ...motionProps
}: AnimateOnScrollProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, isInView } = useIntersectionAnimation<HTMLElement>({
    triggerOnce: once,
    rootMargin,
    disabled: disabled || prefersReducedMotion,
  });

  const selectedVariants = customVariants || variantMap[variant];

  // Apply delay to visible state
  const variantsWithDelay = React.useMemo(() => {
    if (delay === 0) return selectedVariants;

    return {
      ...selectedVariants,
      visible: {
        ...(typeof selectedVariants.visible === "object" ? selectedVariants.visible : {}),
        transition: {
          ...(typeof selectedVariants.visible === "object" &&
          selectedVariants.visible &&
          typeof (selectedVariants.visible as { transition?: object }).transition === "object"
            ? (selectedVariants.visible as { transition: object }).transition
            : {}),
          delay,
        },
      },
    };
  }, [selectedVariants, delay]);

  // For reduced motion or disabled, render a plain element (respecting the as prop)
  if (prefersReducedMotion || disabled) {
    const Element = as;
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Element ref={ref as any} className={className}>
        {children}
      </Element>
    );
  }

  // Get the motion component for the specified element
  const MotionElement = motionComponents[as];

  return (
    <MotionElement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variantsWithDelay}
      className={className}
      {...motionProps}
    >
      {children}
    </MotionElement>
  );
}

// ============================================================================
// STAGGER CHILDREN COMPONENT
// ============================================================================

interface StaggerChildrenProps extends Omit<MotionProps, "initial" | "animate" | "variants"> {
  children: React.ReactNode;
  /** Child animation variant */
  childVariant?: AnimationVariant;
  /** Stagger delay between children (seconds) */
  staggerDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Disable animation */
  disabled?: boolean;
  /** Only animate once */
  once?: boolean;
}

/**
 * Container that staggers the animation of its children.
 *
 * @example
 * ```tsx
 * <StaggerChildren staggerDelay={0.1}>
 *   <Card>First</Card>
 *   <Card>Second</Card>
 *   <Card>Third</Card>
 * </StaggerChildren>
 * ```
 */
export function StaggerChildren({
  children,
  childVariant = "fadeUp",
  staggerDelay = 0.1,
  className,
  disabled = false,
  once = true,
  ...motionProps
}: StaggerChildrenProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, isInView } = useIntersectionAnimation<HTMLDivElement>({
    triggerOnce: once,
    disabled: disabled || prefersReducedMotion,
  });

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = variantMap[childVariant];

  if (prefersReducedMotion || disabled) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
      {...motionProps}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// PARALLAX CONTAINER COMPONENT
// ============================================================================

interface ParallaxProps {
  children: React.ReactNode;
  /** Parallax speed factor (0.1-1.0, default 0.5) */
  speed?: number;
  /** Direction of parallax movement */
  direction?: "up" | "down";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Container with scroll-linked parallax effect.
 *
 * @example
 * ```tsx
 * <Parallax speed={0.3}>
 *   <BackgroundImage />
 * </Parallax>
 * ```
 */
export function Parallax({ children, speed = 0.5, direction = "up", className }: ParallaxProps) {
  const prefersReducedMotion = useReducedMotion();
  const y = useParallax({ speed, direction, respectReducedMotion: true });

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================================
// INTERACTIVE CARD COMPONENT
// ============================================================================

interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Disable hover/tap effects */
  disabled?: boolean;
  /** Custom hover animation */
  hoverAnimation?: typeof cardHover;
}

/**
 * Card with interactive hover and tap effects.
 *
 * @example
 * ```tsx
 * <InteractiveCard onClick={handleClick}>
 *   <h3>Title</h3>
 *   <p>Description</p>
 * </InteractiveCard>
 * ```
 */
export function InteractiveCard({
  children,
  disabled = false,
  hoverAnimation = cardHover,
  className,
  ...props
}: InteractiveCardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || disabled) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={hoverAnimation}
      whileTap={{ scale: 0.99, transition: transitions.micro }}
      className={cn("cursor-pointer", className)}
      {...(props as MotionProps)}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// INTERACTIVE BUTTON COMPONENT
// ============================================================================

// Props that conflict between HTML and Framer Motion
type ConflictingButtonProps = "onAnimationStart" | "onDragStart" | "onDrag" | "onDragEnd";

interface InteractiveButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, ConflictingButtonProps> {
  children: React.ReactNode;
  /** Disable hover/tap effects */
  disableMotion?: boolean;
}

/**
 * Button with interactive hover and tap effects.
 *
 * @example
 * ```tsx
 * <InteractiveButton onClick={handleSubmit}>
 *   Submit
 * </InteractiveButton>
 * ```
 */
export function InteractiveButton({
  children,
  disableMotion = false,
  className,
  disabled,
  ...props
}: InteractiveButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || disableMotion || disabled) {
    return (
      <button className={className} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      whileHover={buttonHover}
      whileTap={buttonTap}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ============================================================================
// INTERACTIVE ICON COMPONENT
// ============================================================================

// Props that conflict between HTML and Framer Motion for span
type ConflictingSpanProps = "onAnimationStart" | "onDragStart" | "onDrag" | "onDragEnd";

interface InteractiveIconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, ConflictingSpanProps> {
  children: React.ReactNode;
  /** Disable hover effects */
  disabled?: boolean;
}

/**
 * Icon wrapper with interactive hover effects.
 *
 * @example
 * ```tsx
 * <InteractiveIcon>
 *   <ChevronRight />
 * </InteractiveIcon>
 * ```
 */
export function InteractiveIcon({
  children,
  disabled = false,
  className,
  ...props
}: InteractiveIconProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || disabled) {
    return (
      <span className={className} {...props}>
        {children}
      </span>
    );
  }

  return (
    <motion.span whileHover={iconHover} className={cn("inline-flex", className)} {...props}>
      {children}
    </motion.span>
  );
}

// ============================================================================
// PRESENCE ANIMATION COMPONENT
// ============================================================================

interface PresenceAnimationProps {
  children: React.ReactNode;
  /** Whether component is visible */
  isVisible: boolean;
  /** Animation variant */
  variant?: AnimationVariant;
  /** Custom variants */
  variants?: Variants;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wrapper for AnimatePresence with predefined animations.
 *
 * @example
 * ```tsx
 * <PresenceAnimation isVisible={showModal} variant="scaleIn">
 *   <Modal />
 * </PresenceAnimation>
 * ```
 */
export function PresenceAnimation({
  children,
  isVisible,
  variant = "fadeIn",
  variants: customVariants,
  className,
}: PresenceAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const selectedVariants = customVariants || variantMap[variant];

  if (prefersReducedMotion) {
    return isVisible ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={selectedVariants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { AnimateOnScrollProps, AnimationVariant, ParallaxProps, StaggerChildrenProps };
