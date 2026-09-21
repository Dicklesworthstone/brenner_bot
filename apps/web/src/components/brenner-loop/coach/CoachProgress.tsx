/**
 * Coach Progress Components
 *
 * Progress encouragement and achievement tracking for coach mode.
 *
 * @see brenner_bot-reew.8 (bead)
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Award, Check, Sparkles, Star, Target, TrendingUp, Trophy, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { type CoachLevel, LEVEL_THRESHOLDS, useCoach } from "@/lib/brenner-loop/coach-context";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: "trophy" | "star" | "sparkles" | "award" | "target";
  unlocked: boolean;
  unlockedAt?: string;
}

// ============================================================================
// Progress Celebration
// ============================================================================

export interface ProgressCelebrationProps {
  /** The achievement or milestone message */
  message: string;

  /** Secondary detail text */
  detail?: string;

  /** Type of celebration */
  variant?: "success" | "milestone" | "achievement";

  /** Auto-dismiss after ms (0 to disable) */
  autoDismissMs?: number;

  /** Called when dismissed */
  onDismiss?: () => void;

  /** Additional CSS classes */
  className?: string;
}

export function ProgressCelebration({
  message,
  detail,
  variant = "success",
  autoDismissMs = 5000,
  onDismiss,
  className,
}: ProgressCelebrationProps): React.ReactElement {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const variantConfig = {
    success: {
      bg: "bg-green-50 dark:bg-green-950/50",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-900 dark:text-green-100",
      icon: Check,
      iconBg: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-400",
    },
    milestone: {
      bg: "bg-purple-50 dark:bg-purple-950/50",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-900 dark:text-purple-100",
      icon: TrendingUp,
      iconBg: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    achievement: {
      bg: "bg-amber-50 dark:bg-amber-950/50",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-900 dark:text-amber-100",
      icon: Trophy,
      iconBg: "bg-amber-100 dark:bg-amber-900",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={cn(
            "fixed top-4 right-4 z-50 max-w-sm",
            "rounded-lg border shadow-lg",
            config.bg,
            config.border,
            className,
          )}
        >
          <div className="flex items-start gap-3 p-4">
            <div className={cn("rounded-full p-2 shrink-0", config.iconBg)}>
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium", config.text)}>{message}</p>
              {detail && <p className={cn("text-sm opacity-70 mt-0.5", config.text)}>{detail}</p>}
            </div>
            <button
              onClick={handleDismiss}
              className={cn(
                "shrink-0 rounded p-1 hover:opacity-70 transition-opacity",
                config.text,
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar for auto-dismiss */}
          {autoDismissMs > 0 && (
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
              className={cn("h-1 origin-left", config.iconBg)}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Level Badge
// ============================================================================

export interface LevelBadgeProps {
  /** Current level */
  level: CoachLevel;

  /** Sessions until next level */
  sessionsToNextLevel?: number;

  /** Whether to show compact version */
  compact?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export function LevelBadge({
  level,
  sessionsToNextLevel,
  compact = false,
  className,
}: LevelBadgeProps): React.ReactElement {
  const levelConfig = {
    beginner: {
      label: "Beginner",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      icon: Star,
    },
    intermediate: {
      label: "Intermediate",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      icon: Award,
    },
    advanced: {
      label: "Advanced",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      icon: Trophy,
    },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          config.color,
          className,
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", config.color)}>
        <Icon className="h-4 w-4" />
        <span className="font-medium text-sm">{config.label}</span>
      </div>
      {sessionsToNextLevel !== undefined && level !== "advanced" && (
        <span className="text-xs text-muted-foreground">
          {sessionsToNextLevel} session{sessionsToNextLevel !== 1 ? "s" : ""} to next level
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Achievement Card
// ============================================================================

export interface AchievementCardProps {
  achievement: Achievement;
  className?: string;
}

export function AchievementCard({
  achievement,
  className,
}: AchievementCardProps): React.ReactElement {
  const iconMap = {
    trophy: Trophy,
    star: Star,
    sparkles: Sparkles,
    award: Award,
    target: Target,
  };

  const Icon = iconMap[achievement.icon];

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        achievement.unlocked
          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/30 opacity-60",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-full p-2",
            achievement.unlocked
              ? "bg-amber-100 dark:bg-amber-900"
              : "bg-gray-200 dark:bg-gray-800",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              achievement.unlocked
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-400 dark:text-gray-600",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              "font-medium",
              achievement.unlocked
                ? "text-amber-900 dark:text-amber-100"
                : "text-gray-700 dark:text-gray-300",
            )}
          >
            {achievement.title}
          </h4>
          <p
            className={cn(
              "text-sm mt-0.5",
              achievement.unlocked
                ? "text-amber-700 dark:text-amber-300"
                : "text-gray-500 dark:text-gray-500",
            )}
          >
            {achievement.description}
          </p>
          {achievement.unlocked && achievement.unlockedAt && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Progress Stats
// ============================================================================

export interface CoachProgressStatsProps {
  className?: string;
}

export function CoachProgressStats({ className }: CoachProgressStatsProps): React.ReactElement {
  const { progress, effectiveLevel } = useCoach();

  const stats = [
    {
      label: "Sessions Completed",
      value: progress.sessionsCompleted,
      icon: Check,
    },
    {
      label: "Hypotheses Formulated",
      value: progress.hypothesesFormulated,
      icon: Target,
    },
    {
      label: "Checkpoints Passed",
      value: progress.checkpointsPassed,
      icon: Award,
    },
    {
      label: "Concepts Learned",
      value: progress.seenConcepts.size,
      icon: Star,
    },
  ];

  // Calculate sessions to next level using imported thresholds
  const sessionsToNextLevel =
    effectiveLevel === "beginner"
      ? LEVEL_THRESHOLDS.intermediate - progress.sessionsCompleted
      : effectiveLevel === "intermediate"
        ? LEVEL_THRESHOLDS.advanced - progress.sessionsCompleted
        : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Level display */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Your Progress</h3>
        <LevelBadge
          level={effectiveLevel}
          sessionsToNextLevel={sessionsToNextLevel > 0 ? sessionsToNextLevel : undefined}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-muted/30 p-4 text-center">
            <stat.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {progress.firstSessionDate && (
        <div className="text-sm text-muted-foreground">
          <p>Started: {new Date(progress.firstSessionDate).toLocaleDateString()}</p>
          {progress.lastSessionDate && (
            <p>Last active: {new Date(progress.lastSessionDate).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ProgressCelebration;
