"use client";

/**
 * TutorialTip - Callout boxes for tips, warnings, notes, and important info
 *
 * Variants:
 * - pro: Green, lightbulb icon - best practices and pro tips
 * - warning: Amber, warning triangle - things to watch out for
 * - note: Blue, info icon - additional context
 * - important: Red, exclamation - critical information
 */

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ChevronDown, Info, Lightbulb } from "lucide-react";
import * as React from "react";
import type { TipVariant } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface TutorialTipProps {
  /** Tip variant determines colors and icon */
  variant: TipVariant;
  /** Optional title (if not provided, uses default for variant) */
  title?: string;
  /** Content of the tip */
  children: React.ReactNode;
  /** Make the tip collapsible */
  collapsible?: boolean;
  /** Start collapsed (only if collapsible) */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Variant Config
// ============================================================================

interface VariantConfig {
  icon: React.ReactNode;
  defaultTitle: string;
  containerClass: string;
  iconContainerClass: string;
  titleClass: string;
}

const variantConfigs: Record<TipVariant, VariantConfig> = {
  pro: {
    icon: <Lightbulb className="size-5" />,
    defaultTitle: "Pro Tip",
    containerClass:
      "border-[oklch(0.72_0.19_145/0.3)] bg-gradient-to-br from-[oklch(0.72_0.19_145/0.08)] to-[oklch(0.72_0.19_145/0.02)]",
    iconContainerClass:
      "bg-gradient-to-br from-[oklch(0.72_0.19_145/0.3)] to-[oklch(0.72_0.19_145/0.15)] text-[oklch(0.72_0.19_145)] shadow-sm shadow-[oklch(0.72_0.19_145/0.2)]",
    titleClass: "text-[oklch(0.72_0.19_145)]",
  },
  warning: {
    icon: <AlertTriangle className="size-5" />,
    defaultTitle: "Warning",
    containerClass: "border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-amber-500/2",
    iconContainerClass:
      "bg-gradient-to-br from-amber-500/30 to-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/20",
    titleClass: "text-amber-600 dark:text-amber-400",
  },
  note: {
    icon: <Info className="size-5" />,
    defaultTitle: "Note",
    containerClass: "border-blue-500/30 bg-gradient-to-br from-blue-500/8 to-blue-500/2",
    iconContainerClass:
      "bg-gradient-to-br from-blue-500/30 to-blue-500/15 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/20",
    titleClass: "text-blue-600 dark:text-blue-400",
  },
  important: {
    icon: <AlertCircle className="size-5" />,
    defaultTitle: "Important",
    containerClass: "border-destructive/30 bg-gradient-to-br from-destructive/8 to-destructive/2",
    iconContainerClass:
      "bg-gradient-to-br from-destructive/30 to-destructive/15 text-destructive shadow-sm shadow-destructive/20",
    titleClass: "text-destructive",
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function TutorialTip({
  variant,
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: TutorialTipProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isHovered, setIsHovered] = React.useState(false);
  const config = variantConfigs[variant];

  const displayTitle = title || config.defaultTitle;

  // Header (clickable if collapsible)
  const HeaderWrapper = collapsible ? "button" : "div";
  const headerProps = collapsible
    ? {
        type: "button" as const,
        onClick: () => setIsCollapsed(!isCollapsed),
        "aria-expanded": !isCollapsed,
        className: cn(
          "w-full flex items-center gap-3 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg",
          "touch-manipulation active:scale-[0.99] transition-transform",
        ),
      }
    : { className: "flex items-center gap-3" };

  // Determine if this is an attention-grabbing variant
  const isAttention = variant === "warning" || variant === "important";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "relative rounded-xl border p-4 transition-all duration-300 overflow-hidden",
        config.containerClass,
        "hover:shadow-lg hover:shadow-current/10",
        className,
      )}
      role={isAttention ? "alert" : "note"}
      whileHover={{ y: -2 }}
    >
      {/* Subtle top border highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current/20 to-transparent" />

      {/* Attention pulse for warning/important */}
      {isAttention && (
        <motion.div
          className={cn(
            "absolute -inset-px rounded-xl border-2",
            variant === "warning" ? "border-amber-500/30" : "border-destructive/30",
          )}
          animate={{
            opacity: [0.5, 0, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <HeaderWrapper {...headerProps}>
        {/* Icon with enhanced micro-animations */}
        <motion.div
          className={cn(
            "relative flex items-center justify-center size-9 rounded-xl shrink-0",
            config.iconContainerClass,
          )}
          animate={
            isHovered
              ? {
                  scale: 1.1,
                  rotate:
                    variant === "pro" ? [0, -10, 10, 0] : variant === "warning" ? [0, 5, -5, 0] : 0,
                }
              : { scale: 1, rotate: 0 }
          }
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {/* Glow effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0"
            animate={{
              opacity: isHovered ? 0.5 : 0,
              scale: isHovered ? 1.2 : 1,
            }}
            style={{
              background:
                variant === "pro"
                  ? "oklch(0.72 0.19 145 / 0.3)"
                  : variant === "warning"
                    ? "oklch(0.75 0.15 75 / 0.3)"
                    : variant === "note"
                      ? "oklch(0.6 0.15 240 / 0.3)"
                      : "oklch(0.6 0.2 25 / 0.3)",
              filter: "blur(8px)",
            }}
          />
          {config.icon}
        </motion.div>

        {/* Title */}
        <span className={cn("font-semibold text-sm flex-1 transition-colors", config.titleClass)}>
          {displayTitle}
        </span>

        {/* Collapse toggle */}
        {collapsible && (
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="size-4" />
          </motion.div>
        )}
      </HeaderWrapper>

      {/* Content with reveal animation */}
      {collapsible ? (
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
                className="pt-3 pl-11 text-sm text-muted-foreground leading-relaxed"
              >
                {children}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="pt-3 pl-11 text-sm text-muted-foreground leading-relaxed">{children}</div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

export function ProTip({ title, children, ...props }: Omit<TutorialTipProps, "variant">) {
  return (
    <TutorialTip variant="pro" title={title} {...props}>
      {children}
    </TutorialTip>
  );
}

export function Warning({ title, children, ...props }: Omit<TutorialTipProps, "variant">) {
  return (
    <TutorialTip variant="warning" title={title} {...props}>
      {children}
    </TutorialTip>
  );
}

export function Note({ title, children, ...props }: Omit<TutorialTipProps, "variant">) {
  return (
    <TutorialTip variant="note" title={title} {...props}>
      {children}
    </TutorialTip>
  );
}

export function Important({ title, children, ...props }: Omit<TutorialTipProps, "variant">) {
  return (
    <TutorialTip variant="important" title={title} {...props}>
      {children}
    </TutorialTip>
  );
}

// Type is already exported with the interface definition above
