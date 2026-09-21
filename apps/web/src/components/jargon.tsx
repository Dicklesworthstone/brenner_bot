"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getJargon, type JargonTerm } from "@/lib/jargon";

// ============================================================================
// Icons
// ============================================================================

const LightbulbIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const XIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

// ============================================================================
// Animation Configs
// ============================================================================

const springSmooth = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

const springSnappy = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
};

// Stagger configuration for child elements
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0 },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springSnappy },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
};

// ============================================================================
// Types
// ============================================================================

interface JargonProps {
  /** The term key to look up in the dictionary */
  term: string;
  /** Optional: override the display text (defaults to term.term) */
  children?: ReactNode;
  /** Optional: additional class names */
  className?: string;
}

// ============================================================================
// Jargon Component
// ============================================================================

/**
 * Jargon component - makes technical terms accessible with hover/tap tooltips.
 *
 * - Desktop: Shows tooltip on hover
 * - Mobile: Shows bottom sheet on tap
 * - Styled with dotted underline to indicate interactivity
 */
export function Jargon({ term, children, className }: JargonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tooltipLayout, setTooltipLayout] = useState<{
    position: "top" | "bottom";
    style: CSSProperties;
  }>({ position: "top", style: {} });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Hover delay before showing tooltip (UX best practice: 300-500ms)
  const HOVER_DELAY_MS = 400;

  const termKey = term.toLowerCase().replace(/[\s_]+/g, "-");
  const jargonData = getJargon(termKey);

  const portalContainer = typeof document === "undefined" ? null : document.body;

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate tooltip position for desktop
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || isMobile) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const offsetWidth = triggerRef.current.offsetWidth;

    const position: "top" | "bottom" = rect.top < 200 ? "bottom" : "top";

    const left = Math.min(
      Math.max(16, rect.left - 140 + offsetWidth / 2),
      Math.max(16, window.innerWidth - 336),
    );

    const verticalStyle =
      position === "top" ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 };

    setTooltipLayout({ position, style: { left, ...verticalStyle } });
  }, [isOpen, isMobile]);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, isMobile]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    // Clear any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    // Clear any pending open (in case of rapid mouse movements)
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
    }
    // Delay before showing tooltip to prevent accidental triggers
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, HOVER_DELAY_MS);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    // Cancel any pending open
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, [isMobile]);

  const handleFocus = useCallback(() => {
    if (isMobile) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setIsOpen(true);
  }, [isMobile]);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (isMobile) return;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && tooltipRef.current?.contains(relatedTarget)) {
        return;
      }
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    },
    [isMobile],
  );

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!jargonData) {
    const content = children || term;
    return <span className={className}>{content}</span>;
  }

  const displayText = children || jargonData.term;

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={[
          "relative inline cursor-help",
          "decoration-[2px] underline underline-offset-[3px]",
          "decoration-primary/50 decoration-dotted",
          "transition-all duration-200",
          "hover:decoration-primary hover:text-primary hover:decoration-solid",
          "active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={`Learn about ${jargonData.term}`}
        aria-expanded={isOpen}
      >
        {displayText}
      </button>

      {/* Desktop Tooltip */}
      {portalContainer &&
        createPortal(
          <AnimatePresence>
            {isOpen && !isMobile && Object.keys(tooltipLayout.style).length > 0 && (
              <motion.div
                ref={tooltipRef}
                initial={{ opacity: 0, y: tooltipLayout.position === "top" ? 8 : -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: tooltipLayout.position === "top" ? 8 : -8, scale: 0.95 }}
                transition={springSnappy}
                className={[
                  "fixed z-[9999] w-80 max-w-[calc(100vw-2rem)]",
                  "rounded-xl border border-border/50 bg-card/95 p-4 shadow-2xl backdrop-blur-xl",
                  "before:absolute before:inset-x-0 before:h-1 before:rounded-t-xl before:bg-gradient-to-r before:from-primary/50 before:via-purple-500/50 before:to-primary/50",
                  tooltipLayout.position === "top"
                    ? "before:top-0"
                    : "before:bottom-0 before:rounded-t-none before:rounded-b-xl",
                ].join(" ")}
                style={tooltipLayout.style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <TooltipContent term={jargonData} termKey={termKey} />
              </motion.div>
            )}
          </AnimatePresence>,
          portalContainer,
        )}

      {/* Mobile Bottom Sheet */}
      {portalContainer &&
        createPortal(
          <AnimatePresence>
            {isOpen && isMobile && (
              <motion.div
                key="mobile-sheet-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
                  style={{ touchAction: "none" }}
                  onClick={handleClose}
                  aria-hidden="true"
                />

                {/* Sheet */}
                <motion.div
                  ref={tooltipRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`jargon-sheet-title-${termKey}`}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={springSmooth}
                  className="fixed inset-x-0 bottom-0 z-[9999] flex max-h-[80vh] flex-col rounded-t-3xl border-t border-border/50 bg-card shadow-2xl"
                  style={{ touchAction: "pan-y" }}
                >
                  {/* Handle */}
                  <div className="flex shrink-0 justify-center pt-3 pb-1">
                    <div className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
                  </div>

                  {/* Close button - z-10 ensures it's above scrollable content */}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 active:bg-muted/60"
                    aria-label="Close"
                  >
                    <XIcon />
                  </button>

                  {/* Content */}
                  <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <SheetContent term={jargonData} termKey={termKey} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalContainer,
        )}
    </>
  );
}

// ============================================================================
// Tooltip Content (Desktop)
// ============================================================================

function TooltipContent({ term, termKey }: { term: JargonTerm; termKey: string }) {
  const glossaryHref = `/glossary#${encodeURIComponent(termKey)}`;

  return (
    <motion.div
      className="space-y-2"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div variants={staggerItem} className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <LightbulbIcon className="h-3.5 w-3.5" />
        </div>
        <span className="font-semibold text-foreground">{term.term}</span>
      </motion.div>

      <motion.p variants={staggerItem} className="text-sm leading-relaxed text-muted-foreground">
        {term.short}
      </motion.p>

      {term.analogy && (
        <motion.div
          variants={staggerItem}
          className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
        >
          <span className="font-medium text-primary">Think of it like:</span> {term.analogy}
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="flex items-center justify-end pt-1">
        <Link
          href={glossaryHref}
          className="group inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          View full entry
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Sheet Content (Mobile)
// ============================================================================

// Sheet stagger config (slower for mobile, more dramatic)
const sheetStaggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const sheetStaggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springSmooth },
};

// Chip stagger for related terms
const chipContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const chipItem = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: springSnappy },
};

function SheetContent({ term, termKey }: { term: JargonTerm; termKey: string }) {
  const glossaryHref = `/glossary#${encodeURIComponent(termKey)}`;

  return (
    <motion.div
      className="space-y-5"
      variants={sheetStaggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={sheetStaggerItem} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-lg">
          <LightbulbIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 id={`jargon-sheet-title-${termKey}`} className="text-xl font-bold text-foreground">
            {term.term}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{term.short}</p>
        </div>
      </motion.div>

      <div className="space-y-4">
        <motion.div variants={sheetStaggerItem}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            What is it?
          </h4>
          <p className="text-sm leading-relaxed text-foreground">{term.long}</p>
        </motion.div>

        {term.why && (
          <motion.div
            variants={sheetStaggerItem}
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Why it matters
            </p>
            <p className="text-sm leading-relaxed text-foreground">{term.why}</p>
          </motion.div>
        )}

        {term.analogy && (
          <motion.div
            variants={sheetStaggerItem}
            className="rounded-xl border border-primary/20 bg-primary/5 p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="size-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Think of it like...
              </p>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{term.analogy}</p>
          </motion.div>
        )}

        {term.related && term.related.length > 0 && (
          <motion.div variants={sheetStaggerItem}>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Related Terms
            </h4>
            <motion.div
              className="flex flex-wrap gap-2"
              variants={chipContainer}
              initial="hidden"
              animate="visible"
            >
              {term.related.map((relatedTerm) => (
                <motion.span
                  key={relatedTerm}
                  variants={chipItem}
                  className="rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {relatedTerm}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        )}

        <motion.div variants={sheetStaggerItem} className="pt-2">
          <Link
            href={glossaryHref}
            className="group inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            View in glossary
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Convenience component for inline jargon that matches surrounding text style
 */
export function JargonInline({ term, children, className }: JargonProps) {
  return (
    <Jargon term={term} className={`font-normal ${className || ""}`}>
      {children}
    </Jargon>
  );
}
