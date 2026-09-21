/**
 * Framer Motion Animation Variants and Shared Configuration
 *
 * This module provides a cohesive animation system using Framer Motion.
 * All animations respect reduced motion preferences and use GPU-accelerated
 * transforms for performance.
 *
 * @see brenner_bot-f8vs.9 (Animation & Scroll Effects System)
 */

import type { TargetAndTransition, Transition, Variants } from "framer-motion";

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

/**
 * Standard animation timings based on the bead spec:
 * - Micro-interaction: 100-200ms
 * - Content reveal: 400-600ms
 * - Complex diagram: 800-1200ms
 * - Page transition: 300-500ms
 */
export const TIMING = {
  micro: 0.15,
  fast: 0.3,
  normal: 0.5,
  slow: 0.8,
  complex: 1.0,
} as const;

// ============================================================================
// EASING PRESETS
// ============================================================================

/**
 * Standard easing curves for consistent animation feel.
 */
export const EASING = {
  /** Standard ease-out for most animations */
  easeOut: [0.4, 0, 0.2, 1] as const,
  /** Smooth ease-in-out for transitions */
  easeInOut: [0.4, 0, 0.6, 1] as const,
  /** Snappy spring-like feel */
  spring: [0.175, 0.885, 0.32, 1.275] as const,
  /** Gentle deceleration */
  decelerate: [0, 0, 0.2, 1] as const,
  /** Quick start, slow finish */
  accelerate: [0.4, 0, 1, 1] as const,
} as const;

// ============================================================================
// BASE TRANSITIONS
// ============================================================================

/**
 * Reusable transition configurations.
 */
export const transitions = {
  /** Fast transitions for micro-interactions */
  micro: {
    duration: TIMING.micro,
    ease: EASING.easeOut,
  } satisfies Transition,

  /** Fast transitions for quick actions */
  fast: {
    duration: TIMING.fast,
    ease: EASING.easeOut,
  } satisfies Transition,

  /** Standard content animations */
  normal: {
    duration: TIMING.normal,
    ease: EASING.easeOut,
  } satisfies Transition,

  /** Slower, more dramatic reveals */
  slow: {
    duration: TIMING.slow,
    ease: EASING.easeInOut,
  } satisfies Transition,

  /** Spring physics for bouncy interactions */
  spring: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  } satisfies Transition,

  /** Gentle spring for larger elements */
  gentleSpring: {
    type: "spring",
    stiffness: 200,
    damping: 25,
  } satisfies Transition,
} as const;

// ============================================================================
// ENTRY ANIMATION VARIANTS
// ============================================================================

/**
 * Fade up animation - elements fade in while moving up.
 * Use for: Text blocks, cards, images
 */
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
};

/**
 * Fade in animation - simple opacity fade.
 * Use for: Subtle reveals, overlays
 */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: transitions.normal,
  },
};

/**
 * Scale in animation - element scales up from smaller size.
 * Use for: Buttons, badges, icons, modals
 */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.normal,
  },
};

/**
 * Pop in animation - playful scale with spring physics.
 * Use for: Notifications, tooltips, success states
 */
export const popIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring,
  },
};

/**
 * Slide in from right animation.
 * Use for: Side panels, drawers
 */
export const slideInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.normal,
  },
};

/**
 * Slide in from left animation.
 * Use for: Side panels, drawers
 */
export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.normal,
  },
};

/**
 * Blur in animation - content sharpens as it appears.
 * Use for: Hero sections, focus reveals
 */
export const blurIn: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: transitions.slow,
  },
};

// ============================================================================
// STAGGER CONTAINER VARIANTS
// ============================================================================

/**
 * Stagger children with specified delay between each.
 */
export const staggerContainer = (staggerDelay = 0.1): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1,
    },
  },
});

/**
 * Fast stagger for lists and grids.
 */
export const staggerFast: Variants = staggerContainer(0.05);

/**
 * Normal stagger for content sections.
 */
export const staggerNormal: Variants = staggerContainer(0.1);

/**
 * Slow stagger for dramatic reveals.
 */
export const staggerSlow: Variants = staggerContainer(0.15);

// ============================================================================
// HOVER & TAP ANIMATION STATES
// ============================================================================

/**
 * Card hover effect - subtle lift and shadow.
 * Use for: Cards, interactive panels
 */
export const cardHover: TargetAndTransition = {
  y: -4,
  transition: transitions.micro,
};

/**
 * Button hover effect - subtle scale.
 * Use for: Buttons, interactive elements
 */
export const buttonHover: TargetAndTransition = {
  scale: 1.02,
  transition: transitions.micro,
};

/**
 * Button tap effect - quick scale down.
 * Use for: Click feedback
 */
export const buttonTap: TargetAndTransition = {
  scale: 0.98,
  transition: { duration: 0.1 },
};

/**
 * Icon hover effect - gentle pulse.
 * Use for: Icon buttons, action icons
 */
export const iconHover: TargetAndTransition = {
  scale: 1.1,
  transition: transitions.spring,
};

// ============================================================================
// EXIT ANIMATION VARIANTS
// ============================================================================

/**
 * Fade out animation.
 */
export const fadeOut: Variants = {
  visible: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
};

/**
 * Scale out animation.
 */
export const scaleOut: Variants = {
  visible: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.fast,
  },
};

/**
 * Slide out down animation.
 */
export const slideOutDown: Variants = {
  visible: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: transitions.fast,
  },
};

// ============================================================================
// PAGE TRANSITION VARIANTS
// ============================================================================

/**
 * Page fade transition.
 * Use for: Route transitions
 */
export const pageFade: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: { duration: TIMING.fast },
  },
  exit: {
    opacity: 0,
    transition: { duration: TIMING.fast },
  },
};

/**
 * Page slide up transition.
 * Use for: Modal-like page transitions
 */
export const pageSlideUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transitions.fast,
  },
};

// ============================================================================
// MODAL & OVERLAY VARIANTS
// ============================================================================

/**
 * Modal backdrop animation.
 */
export const backdrop: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

/**
 * Modal content animation.
 */
export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transitions.fast,
  },
};

/**
 * Bottom sheet animation.
 */
export const bottomSheet: Variants = {
  hidden: {
    y: "100%",
  },
  visible: {
    y: 0,
    transition: transitions.gentleSpring,
  },
  exit: {
    y: "100%",
    transition: transitions.fast,
  },
};

// ============================================================================
// ACCORDION/COLLAPSE VARIANTS
// ============================================================================

/**
 * Accordion content expand/collapse.
 */
export const accordionContent: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: EASING.easeOut },
      opacity: { duration: 0.2, ease: EASING.easeOut },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: EASING.easeOut },
      opacity: { duration: 0.3, delay: 0.1, ease: EASING.easeOut },
    },
  },
};

// ============================================================================
// LOADING STATE VARIANTS
// ============================================================================

/**
 * Skeleton shimmer animation config (use with CSS).
 */
export const skeletonShimmer: Variants = {
  initial: {
    backgroundPosition: "-200% 0",
  },
  animate: {
    backgroundPosition: "200% 0",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Spinner rotation.
 */
export const spinner: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a delayed variant by adding delay to all transitions.
 */
export function withDelay<T extends Variants>(variants: T, delayMs: number): T {
  const delay = delayMs / 1000;

  return Object.fromEntries(
    Object.entries(variants).map(([key, value]) => {
      if (typeof value === "object" && value !== null && "transition" in value) {
        const v = value as TargetAndTransition;
        return [
          key,
          {
            ...v,
            transition: {
              ...(typeof v.transition === "object" ? v.transition : {}),
              delay:
                (typeof v.transition === "object" && v.transition && "delay" in v.transition
                  ? (v.transition.delay as number)
                  : 0) + delay,
            },
          },
        ];
      }
      return [key, value];
    }),
  ) as T;
}

/**
 * Create viewport settings for whileInView animations.
 */
export const viewport = {
  /** Trigger once when 20% visible */
  once: { once: true, margin: "-100px 0px" },
  /** Trigger once when 10% visible (for large elements) */
  early: { once: true, margin: "-50px 0px" },
  /** Trigger every time element enters/exits */
  always: { once: false, margin: "-100px 0px" },
} as const;
