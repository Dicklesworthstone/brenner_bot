"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

// Spring config for smooth, responsive animations
const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
  mass: 0.8,
};

// Content slide-in animation
const contentSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

interface CollapsibleContextValue {
  isOpen: boolean;
  toggle: () => void;
  contentId: string;
  triggerId: string;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext() {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error("Collapsible components must be used within a Collapsible");
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

interface CollapsibleProps {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled mode */
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const baseId = React.useId();
  const contentId = `${baseId}-content`;
  const triggerId = `${baseId}-trigger`;

  const toggle = React.useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!isOpen);
    } else {
      setUncontrolledOpen((prev) => !prev);
    }
  }, [isControlled, isOpen, onOpenChange]);

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle, contentId, triggerId }}>
      <div className={className} data-state={isOpen ? "open" : "closed"}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

// ============================================================================
// Trigger Component
// ============================================================================

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Show built-in chevron icon */
  showChevron?: boolean;
  /** Position of chevron */
  chevronPosition?: "left" | "right";
  children: React.ReactNode;
}

export function CollapsibleTrigger({
  showChevron = true,
  chevronPosition = "right",
  children,
  className,
  ...props
}: CollapsibleTriggerProps) {
  const { isOpen, toggle, contentId, triggerId } = useCollapsibleContext();

  const { onClick, ...buttonProps } = props;

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    toggle();
  };

  return (
    <button
      {...buttonProps}
      type="button"
      id={triggerId}
      aria-expanded={isOpen}
      aria-controls={contentId}
      onClick={handleClick}
      className={cn(
        "w-full flex items-center justify-between gap-3 cursor-pointer",
        "transition-all touch-manipulation active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {showChevron && chevronPosition === "left" && (
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springConfig}
          className="flex-shrink-0 text-muted-foreground"
        >
          <ChevronIcon />
        </motion.div>
      )}
      <div className="flex-1 text-left">{children}</div>
      {showChevron && chevronPosition === "right" && (
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springConfig}
          className="flex-shrink-0 text-muted-foreground"
        >
          <ChevronIcon />
        </motion.div>
      )}
    </button>
  );
}

// ============================================================================
// Content Component
// ============================================================================

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
  /** Disable animation (for reduced motion preferences) */
  forceMount?: boolean;
}

export function CollapsibleContent({
  children,
  className,
  forceMount = false,
}: CollapsibleContentProps) {
  const { isOpen, contentId, triggerId } = useCollapsibleContext();

  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // If forceMount or reduced motion, render without animation
  if (forceMount || prefersReducedMotion) {
    return isOpen ? (
      <div id={contentId} aria-labelledby={triggerId} className={className}>
        {children}
      </div>
    ) : null;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          id={contentId}
          aria-labelledby={triggerId}
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              height: springConfig,
              opacity: { duration: 0.2, delay: 0.05 },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { ...springConfig, stiffness: 500 },
              opacity: { duration: 0.15 },
            },
          }}
          className={cn("overflow-hidden", className)}
        >
          {/* Inner wrapper with slide-up animation for premium feel */}
          <motion.div
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            exit={{ y: -4 }}
            transition={contentSpring}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Pre-styled Card Variant
// ============================================================================

interface CollapsibleCardProps {
  /** Header title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Optional badge content */
  badge?: React.ReactNode;
  /** Content to reveal */
  children: React.ReactNode;
  /** Default open state */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Container class for the content area */
  contentClassName?: string;
}

export function CollapsibleCard({
  title,
  subtitle,
  badge,
  children,
  defaultOpen,
  open,
  onOpenChange,
  className,
  contentClassName,
}: CollapsibleCardProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "group rounded-xl border border-border bg-card overflow-hidden",
        "transition-all duration-200",
        "hover:border-border-hover hover:shadow-sm",
        "data-[state=open]:border-primary/30 data-[state=open]:shadow-lg data-[state=open]:shadow-primary/5",
        className,
      )}
    >
      <CollapsibleTrigger
        className={cn(
          "p-4 hover:bg-muted/50 active:bg-muted/70 transition-all duration-150",
          "group-data-[state=open]:border-b group-data-[state=open]:border-border/50",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate">{title}</span>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className={contentClassName}>
        <div className="p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Pre-styled Section Variant (for forms/settings)
// ============================================================================

interface CollapsibleSectionProps {
  /** Section label */
  label: string;
  /** Optional help text */
  hint?: string;
  /** Content to reveal */
  children: React.ReactNode;
  /** Default open state */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function CollapsibleSection({
  label,
  hint,
  children,
  defaultOpen,
  open,
  onOpenChange,
  className,
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "group rounded-xl border border-border bg-muted/30 overflow-hidden",
        "transition-all duration-200",
        "hover:border-border-hover",
        "data-[state=open]:border-primary/20 data-[state=open]:bg-muted/50",
        className,
      )}
    >
      <CollapsibleTrigger className="p-4 hover:bg-muted/50 active:bg-muted/70 transition-all duration-150">
        <span className="text-sm text-muted-foreground group-data-[state=open]:text-foreground transition-colors">
          {label}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-4">
          {children}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
