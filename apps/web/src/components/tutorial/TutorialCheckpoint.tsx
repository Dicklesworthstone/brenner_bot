"use client";

/**
 * TutorialCheckpoint - Celebration milestone component
 *
 * Shown between major steps to celebrate progress and preview what's next.
 * Features:
 * - Celebratory confetti animation (more particles, wider spread)
 * - Stagger reveal for accomplishments list
 * - Shimmer effect on continue button
 * - Premium celebration visuals
 */

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle, PartyPopper, Sparkles, Star, Trophy } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import type { CheckpointData } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface TutorialCheckpointProps {
  /** Checkpoint data */
  data: CheckpointData;
  /** Continue callback */
  onContinue: () => void;
  /** Whether to show the confetti animation */
  showConfetti?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Confetti Particle
// ============================================================================

// Seeded random function for deterministic confetti
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

interface ConfettiParticleProps {
  delay: number;
  index: number;
  variant?: "burst" | "rain";
}

function ConfettiParticle({ delay, index, variant = "burst" }: ConfettiParticleProps) {
  // Use index as seed for deterministic randomness
  const seed1 = seededRandom(index * 1);
  const seed2 = seededRandom(index * 2);
  const seed3 = seededRandom(index * 3);
  const seed4 = seededRandom(index * 4);
  const seed5 = seededRandom(index * 5);
  const seed6 = seededRandom(index * 6);

  const colors = [
    "bg-primary",
    "bg-accent",
    "bg-[oklch(0.72_0.19_145)]",
    "bg-amber-400",
    "bg-pink-400",
    "bg-violet-400",
    "bg-cyan-400",
  ];
  const color = colors[index % colors.length];

  // Vary shapes
  const shapes = ["rounded-full", "rounded-sm", "rounded-none rotate-45"];
  const shape = shapes[Math.floor(seed6 * shapes.length)];

  const size = seed1 > 0.6 ? "size-2.5" : seed1 > 0.3 ? "size-2" : "size-1.5";
  const duration = variant === "rain" ? 2 + seed2 * 1.5 : 1.2 + seed2 * 0.8;
  const xOffset = (seed3 - 0.5) * (variant === "rain" ? 300 : 250);
  const yOffset = variant === "rain" ? 150 + seed4 * 100 : -100 - seed4 * 60;
  const rotation = seed5 * 720 * (seed6 > 0.5 ? 1 : -1);
  const startX = (seed6 - 0.5) * 100;

  return (
    <motion.div
      className={cn("absolute", color, size, shape)}
      initial={{
        opacity: 1,
        y: variant === "rain" ? -20 : 0,
        x: startX,
        rotate: 0,
        scale: variant === "rain" ? 0.5 : 1,
      }}
      animate={{
        opacity: [1, 1, 0],
        y: yOffset,
        x: startX + xOffset,
        rotate: rotation,
        scale: variant === "rain" ? [0.5, 1, 0.8] : [1, 1.2, 0.8],
      }}
      transition={{
        duration,
        delay,
        ease: variant === "rain" ? "easeIn" : "easeOut",
      }}
      style={{
        top: variant === "rain" ? "0%" : "40%",
        left: "50%",
      }}
    />
  );
}

// Sparkle star particle
function SparkleParticle({ delay, index }: { delay: number; index: number }) {
  const seed1 = seededRandom(index * 10);
  const seed2 = seededRandom(index * 20);
  const x = (seed1 - 0.5) * 300;
  const y = seed2 * 200 - 50;

  return (
    <motion.div
      className="absolute"
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 0.8,
        delay: delay + 0.3,
        ease: "easeOut",
      }}
      style={{
        top: `${30 + y * 0.2}%`,
        left: `calc(50% + ${x}px)`,
      }}
    >
      <Star className="size-3 text-amber-400 fill-amber-400" />
    </motion.div>
  );
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function TutorialCheckpoint({
  data,
  onContinue,
  showConfetti = true,
  className,
}: TutorialCheckpointProps) {
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const [isButtonHovered, setIsButtonHovered] = React.useState(false);

  React.useEffect(() => {
    setHasAnimated(true);
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative overflow-hidden rounded-3xl border-2 border-[oklch(0.72_0.19_145/0.3)] bg-gradient-to-br from-[oklch(0.72_0.19_145/0.1)] via-[oklch(0.72_0.19_145/0.05)] to-primary/5 p-8 sm:p-10 text-center",
        className,
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute -top-10 -right-10 size-48 bg-[oklch(0.72_0.19_145/0.2)] rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 size-40 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.25, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-accent/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Enhanced Confetti - burst + rain + sparkles with proper exit animations */}
      <AnimatePresence>
        {showConfetti && hasAnimated && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            {/* Burst particles */}
            {Array.from({ length: 25 }).map((_, i) => (
              <ConfettiParticle key={`burst-${i}`} delay={i * 0.03} index={i} variant="burst" />
            ))}
            {/* Rain particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <ConfettiParticle
                key={`rain-${i}`}
                delay={0.5 + i * 0.08}
                index={i + 30}
                variant="rain"
              />
            ))}
            {/* Sparkle stars */}
            {Array.from({ length: 8 }).map((_, i) => (
              <SparkleParticle key={`sparkle-${i}`} delay={i * 0.1} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative space-y-6">
        {/* Trophy Icon with glow and orbiting sparkles */}
        <motion.div variants={itemVariants} className="relative mx-auto">
          {/* Orbiting sparkles around trophy */}
          <motion.div
            className="absolute -top-2 -left-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="size-5 text-amber-400" />
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute -bottom-1 -right-3"
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            >
              <Sparkles className="size-4 text-primary" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
            className="relative mx-auto flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.19_145)] to-[oklch(0.65_0.19_145)] shadow-xl shadow-[oklch(0.72_0.19_145/0.4)]"
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{
                boxShadow: [
                  "0 0 0 0 oklch(0.72 0.19 145 / 0.4)",
                  "0 0 0 12px oklch(0.72 0.19 145 / 0)",
                  "0 0 0 0 oklch(0.72 0.19 145 / 0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <Trophy className="size-8 text-[oklch(0.15_0.02_145)]" />
          </motion.div>
        </motion.div>

        {/* Title with gradient and celebratory party poppers */}
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 15 }}
          >
            <PartyPopper className="size-6 text-pink-400 -scale-x-100" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-[oklch(0.72_0.19_145)] bg-clip-text text-transparent">
            {data.title}
          </h2>
          <motion.div
            initial={{ scale: 0, rotate: 30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 15 }}
          >
            <PartyPopper className="size-6 text-amber-400" />
          </motion.div>
        </motion.div>

        {/* Accomplishments with stagger */}
        <motion.div variants={itemVariants} className="space-y-3">
          <p className="text-sm font-semibold text-[oklch(0.72_0.19_145)]">
            You&apos;ve accomplished:
          </p>
          <ul className="space-y-2.5 text-left max-w-md mx-auto">
            {data.accomplishments.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.12, type: "spring", stiffness: 300, damping: 25 }}
                className="flex items-center gap-3 text-muted-foreground bg-card/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.6 + i * 0.12,
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                >
                  <CheckCircle className="size-5 text-[oklch(0.72_0.19_145)] shrink-0" />
                </motion.div>
                <span className="text-sm">{item}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Next preview */}
        <motion.div variants={itemVariants} className="pt-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Coming up:</span> {data.nextPreview}
          </p>
        </motion.div>

        {/* Continue button with shimmer */}
        <motion.div variants={itemVariants} className="pt-4">
          <motion.div
            onHoverStart={() => setIsButtonHovered(true)}
            onHoverEnd={() => setIsButtonHovered(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onContinue}
              size="lg"
              className="relative overflow-hidden bg-gradient-to-r from-[oklch(0.72_0.19_145)] to-[oklch(0.65_0.19_145)] text-[oklch(0.15_0.02_145)] hover:from-[oklch(0.68_0.19_145)] hover:to-[oklch(0.60_0.19_145)] shadow-xl shadow-[oklch(0.72_0.19_145/0.3)] font-semibold px-8"
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: isButtonHovered ? ["-100%", "200%"] : "-100%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
              <span className="relative z-10">Continue</span>
              <motion.div
                className="relative z-10"
                animate={{ x: isButtonHovered ? 4 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <ArrowRight className="size-5 ml-2" />
              </motion.div>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Type is already exported with the interface definition above
