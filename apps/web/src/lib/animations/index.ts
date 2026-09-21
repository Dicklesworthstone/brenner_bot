/**
 * Animation Module Index
 *
 * Unified animation system with Framer Motion variants, hooks, and components.
 *
 * @see brenner_bot-f8vs.9 (Animation & Scroll Effects System)
 *
 * @example
 * ```tsx
 * import {
 *   AnimateOnScroll,
 *   fadeUp,
 *   useReducedMotion,
 *   useParallax,
 * } from "@/lib/animations";
 *
 * function Section() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <AnimateOnScroll variant="fadeUp">
 *       <Content />
 *     </AnimateOnScroll>
 *   );
 * }
 * ```
 */

// ============================================================================
// MOTION VARIANTS
// ============================================================================

export {
  // Accordion
  accordionContent,
  // Modal/overlay animations
  backdrop,
  blurIn,
  bottomSheet,
  buttonHover,
  buttonTap,
  // Hover/tap states
  cardHover,
  EASING,
  fadeIn,
  // Exit animations
  fadeOut,
  // Entry animations
  fadeUp,
  iconHover,
  modalContent,
  // Page transitions
  pageFade,
  pageSlideUp,
  popIn,
  scaleIn,
  scaleOut,
  // Loading states
  skeletonShimmer,
  slideInLeft,
  slideInRight,
  slideOutDown,
  spinner,
  // Stagger containers
  staggerContainer,
  staggerFast,
  staggerNormal,
  staggerSlow,
  // Timing constants
  TIMING,
  transitions,
  viewport,
  // Utilities
  withDelay,
} from "./motion-variants";

// ============================================================================
// HOOKS
// ============================================================================

export {
  useAnimationPreference,
  // Hover
  useHoverState,
  // Intersection
  useIntersectionAnimation,
  // Parallax & scroll
  useParallax,
  // Reduced motion
  useReducedMotion,
  useScrollProgress,
  useScrollVelocity,
  useScrollVisibility,
  // Stagger
  useStaggerDelays,
} from "./hooks";

// ============================================================================
// COMPONENTS
// ============================================================================

export {
  // Scroll-reveal
  AnimateOnScroll,
  // Types
  type AnimateOnScrollProps,
  type AnimationVariant,
  InteractiveButton,
  // Interactive elements
  InteractiveCard,
  InteractiveIcon,
  // Parallax
  Parallax,
  type ParallaxProps,
  // Presence
  PresenceAnimation,
  StaggerChildren,
  type StaggerChildrenProps,
} from "./components";
