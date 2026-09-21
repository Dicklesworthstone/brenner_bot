"use client";

/**
 * TutorialPathCard - Card for selecting tutorial paths
 *
 * Adapted from ACFS LessonCard patterns with:
 * - Glassmorphic design with ambient glow
 * - Status indicators (available, locked, completed)
 * - Difficulty and time estimates
 * - Hover animations with reduced motion support
 * - Mobile-friendly touch targets (44px minimum)
 * - Desktop: Gradient border animation, subtle parallax on hover
 * - Mobile: Strong press feedback with ripple effect
 */

import { motion, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion";
import {
  ChevronRight,
  Clock,
  Cpu,
  Lock,
  Play,
  Rocket,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { DifficultyLevel, TutorialPath } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type PathStatus = "available" | "locked" | "completed" | "in_progress";

export interface TutorialPathCardProps {
  /** Path data */
  path: TutorialPath;
  /** Current status of this path */
  status: PathStatus;
  /** Whether this is the recommended path */
  recommended?: boolean;
  /** Callback when card is clicked (if not using href) */
  onClick?: () => void;
  /** Whether to prefer reduced motion */
  prefersReducedMotion?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const pathIcons: Record<string, React.ReactNode> = {
  "quick-start": <Rocket className="size-6" />,
  "agent-assisted": <Cpu className="size-6" />,
  "multi-agent-cockpit": <Users className="size-6" />,
};

const difficultyColors: Record<DifficultyLevel, { bg: string; text: string }> = {
  beginner: { bg: "bg-[oklch(0.72_0.19_145/0.2)]", text: "text-[oklch(0.72_0.19_145)]" },
  intermediate: { bg: "bg-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  advanced: { bg: "bg-destructive/20", text: "text-destructive" },
};

const statusConfig = {
  available: {
    icon: <Play className="size-4" />,
    iconBg: "bg-primary",
    iconText: "text-primary-foreground",
    border: "border-primary/30",
    bg: "bg-primary/5",
    pulse: true,
  },
  in_progress: {
    // Zap icon conveys active energy and work in progress
    icon: <Zap className="size-4" />,
    iconBg: "bg-accent",
    iconText: "text-accent-foreground",
    border: "border-accent/30",
    bg: "bg-accent/5",
    pulse: true,
  },
  completed: {
    // Trophy icon for celebratory achievement feel
    icon: <Trophy className="size-4" />,
    iconBg: "bg-[oklch(0.72_0.19_145)]",
    iconText: "text-[oklch(0.15_0.02_145)]",
    border: "border-[oklch(0.72_0.19_145/0.3)]",
    bg: "bg-[oklch(0.72_0.19_145/0.05)]",
    pulse: false,
  },
  locked: {
    icon: <Lock className="size-4" />,
    iconBg: "bg-muted",
    iconText: "text-muted-foreground",
    border: "border-border",
    bg: "bg-muted/30",
    pulse: false,
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function TutorialPathCard({
  path,
  status,
  recommended = false,
  onClick,
  prefersReducedMotion = false,
  className,
}: TutorialPathCardProps) {
  const isAccessible = status !== "locked";
  const config = statusConfig[status];
  const diffColors = difficultyColors[path.difficulty];
  const icon = pathIcons[path.id] || <Rocket className="size-6" />;
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Parallax effect for desktop
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!cardRef.current || prefersReducedMotion || !isAccessible) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      mouseX.set(x);
      mouseY.set(y);

      // Update CSS custom properties for spotlight effect
      const percentX = ((e.clientX - rect.left) / rect.width) * 100;
      const percentY = ((e.clientY - rect.top) / rect.height) * 100;
      cardRef.current.style.setProperty("--mouse-x", `${percentX}%`);
      cardRef.current.style.setProperty("--mouse-y", `${percentY}%`);
    },
    [mouseX, mouseY, prefersReducedMotion, isAccessible],
  );

  const handleMouseLeave = React.useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const cardContent = (
    <motion.div
      ref={cardRef}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 25 }
      }
      whileHover={isAccessible && !prefersReducedMotion ? { y: -8, scale: 1.02 } : undefined}
      whileTap={isAccessible && !prefersReducedMotion ? { scale: 0.97 } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        !prefersReducedMotion && isAccessible
          ? { rotateX, rotateY, transformPerspective: 1000 }
          : undefined
      }
      className="h-full"
    >
      <div
        className={cn(
          "group relative h-full overflow-hidden rounded-2xl border-2 p-5 sm:p-6 transition-all duration-300",
          config.border,
          config.bg,
          isAccessible
            ? "cursor-pointer hover:border-primary/60 hover:shadow-xl hover:shadow-primary/15"
            : "cursor-not-allowed opacity-60",
          className,
        )}
        style={{ minHeight: 44 }} // Touch target
      >
        {/* Animated gradient border on hover (desktop) */}
        {isAccessible && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <div className="absolute inset-[-2px] rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[gradient-shift_3s_ease_infinite] -z-10" />
            <div className="absolute inset-0 rounded-2xl bg-card" />
          </div>
        )}

        {/* Ambient glow on hover */}
        {isAccessible && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        )}

        {/* Spotlight effect following cursor (desktop only) */}
        {isAccessible && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block"
            style={{
              background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), oklch(0.58 0.19 195 / 0.15), transparent 40%)`,
            }}
          />
        )}

        {/* Top gradient line for available/in_progress */}
        {(status === "available" || status === "in_progress") && (
          <motion.div
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Recommended badge - premium inline style with sparkle */}
        {recommended && isAccessible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 20 }}
            className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[gradient-shift_3s_ease_infinite] px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="size-3.5" />
            </motion.div>
            <span>Recommended</span>
          </motion.div>
        )}

        {/* Status indicator with enhanced animation */}
        <div className="absolute right-4 top-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
            className={cn(
              "relative flex items-center justify-center size-9 rounded-full shadow-lg",
              config.iconBg,
              config.iconText,
            )}
          >
            {/* Glow ring for available status */}
            {config.pulse && !prefersReducedMotion && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    "0 0 0 0 oklch(0.58 0.19 195 / 0.4)",
                    "0 0 0 8px oklch(0.58 0.19 195 / 0)",
                    "0 0 0 0 oklch(0.58 0.19 195 / 0.4)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <motion.div
              animate={config.pulse && !prefersReducedMotion ? { scale: [1, 1.15, 1] } : undefined}
              transition={
                config.pulse && !prefersReducedMotion
                  ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
            >
              {config.icon}
            </motion.div>
          </motion.div>
        </div>

        {/* Path icon */}
        <div
          className={cn(
            "mb-4 flex items-center justify-center size-12 rounded-xl transition-all duration-300",
            status === "completed"
              ? "bg-[oklch(0.72_0.19_145/0.2)] text-[oklch(0.72_0.19_145)]"
              : status === "locked"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/20 text-primary group-hover:bg-primary/30",
            recommended && isAccessible && "mt-8", // Make room for badge
          )}
        >
          {icon}
        </div>

        {/* Title */}
        <h3
          className={cn(
            "mb-2 text-lg sm:text-xl font-bold transition-colors",
            status === "locked"
              ? "text-muted-foreground"
              : "text-foreground group-hover:text-primary",
          )}
        >
          {path.title}
        </h3>

        {/* Description */}
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{path.description}</p>

        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Difficulty badge */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full font-medium capitalize",
              diffColors.bg,
              diffColors.text,
            )}
          >
            {path.difficulty}
          </span>

          {/* Duration */}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" />
            {path.estimatedDuration}
          </span>

          {/* Step count */}
          <span className="text-muted-foreground">{path.totalSteps} steps</span>
        </div>

        {/* Prerequisites (if locked) */}
        {status === "locked" && path.prerequisites && path.prerequisites.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Prerequisites:</span> {path.prerequisites.join(", ")}
            </p>
          </div>
        )}

        {/* Hover arrow with bounce animation */}
        {isAccessible && (
          <motion.div
            className="absolute bottom-4 right-4 flex items-center gap-1 text-primary/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            initial={false}
          >
            <motion.span
              className="text-xs font-medium hidden sm:block"
              initial={{ opacity: 0, x: -10 }}
              whileHover={{ opacity: 1, x: 0 }}
            >
              Start
            </motion.span>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronRight className="size-5 text-primary" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // If there's an href, wrap in Link
  if (isAccessible && path.href) {
    return (
      <Link href={path.href} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  // If there's an onClick handler
  if (isAccessible && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block h-full w-full text-left"
        style={{ minHeight: 44 }}
      >
        {cardContent}
      </button>
    );
  }

  // Otherwise just render the card
  return cardContent;
}

// ============================================================================
// Path Selection Grid
// ============================================================================

export interface TutorialPathGridProps {
  /** Available paths */
  paths: TutorialPath[];
  /** Status for each path by ID */
  pathStatus: Record<string, PathStatus>;
  /** ID of the recommended path */
  recommendedPathId?: string;
  /** Whether to prefer reduced motion */
  prefersReducedMotion?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
};

export function TutorialPathGrid({
  paths,
  pathStatus,
  recommendedPathId,
  prefersReducedMotion = false,
  className,
}: TutorialPathGridProps) {
  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid gap-4 sm:gap-6",
        paths.length <= 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {paths.map((path) => (
        <motion.div key={path.id} variants={prefersReducedMotion ? undefined : itemVariants}>
          <TutorialPathCard
            path={path}
            status={pathStatus[path.id] || "locked"}
            recommended={path.id === recommendedPathId}
            prefersReducedMotion={prefersReducedMotion}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// Types are already exported with their interface definitions above
