"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  type CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useSectionData } from "./section-data-provider";

// ============================================================================
// Icons
// ============================================================================

const DocumentIcon = ({ className = "size-4" }: { className?: string }) => (
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
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const XIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowRightIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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

// ============================================================================
// Types
// ============================================================================

interface SectionReferenceProps {
  /** The section number (e.g., 106 for §106) */
  sectionNumber: number;
  /** Optional end number for ranges (e.g., 108 for §106-108) */
  endNumber?: number;
  /** Optional section title to display in tooltip */
  title?: string;
  /** Optional preview text snippet */
  preview?: string;
  /** Optional: additional class names */
  className?: string;
}

// ============================================================================
// SectionReference Component
// ============================================================================

/**
 * SectionReference component - makes §XXX section anchors interactive.
 *
 * - Desktop: Shows tooltip on hover with section info and link
 * - Mobile: Shows bottom sheet on tap
 * - Styled with dotted underline to indicate interactivity
 */
export function SectionReference({
  sectionNumber,
  endNumber,
  title: propsTitle,
  preview: propsPreview,
  className,
}: SectionReferenceProps) {
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

  // Hover delay before showing tooltip (matches jargon.tsx for consistency)
  const HOVER_DELAY_MS = 400;

  // Get section data from context (loads from sections.json)
  const { getSection } = useSectionData();
  const sectionData = getSection(sectionNumber);

  // Use props if provided, otherwise fall back to context data
  const title = propsTitle ?? sectionData?.title;
  const preview = propsPreview ?? sectionData?.excerpt;

  // For ranges, link to the first section but show the range in display
  const transcriptUrl = `/corpus/transcript#section-${sectionNumber}`;
  const displayText = endNumber ? `§${sectionNumber}-${endNumber}` : `§${sectionNumber}`;

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
          "relative inline cursor-pointer font-medium",
          "text-primary/90 hover:text-primary",
          "decoration-[1.5px] underline underline-offset-[3px]",
          "decoration-primary/30 decoration-dotted",
          "transition-colors duration-150",
          "hover:decoration-primary/60",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={`Go to transcript section ${sectionNumber}${title ? `: ${title}` : ""}`}
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
                  "before:absolute before:inset-x-0 before:h-1 before:rounded-t-xl before:bg-gradient-to-r before:from-primary/50 before:via-amber-500/50 before:to-primary/50",
                  tooltipLayout.position === "top"
                    ? "before:top-0"
                    : "before:bottom-0 before:rounded-t-none before:rounded-b-xl",
                ].join(" ")}
                style={tooltipLayout.style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <TooltipContent
                  sectionNumber={sectionNumber}
                  endNumber={endNumber}
                  title={title}
                  preview={preview}
                  transcriptUrl={transcriptUrl}
                />
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
                key="section-ref-sheet-container"
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
                  aria-labelledby={`section-ref-sheet-title-${sectionNumber}`}
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
                    <SheetContent
                      sectionNumber={sectionNumber}
                      endNumber={endNumber}
                      title={title}
                      preview={preview}
                      transcriptUrl={transcriptUrl}
                      onClose={handleClose}
                    />
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

interface ContentProps {
  sectionNumber: number;
  endNumber?: number;
  title?: string;
  preview?: string;
  transcriptUrl: string;
  onClose?: () => void;
}

function TooltipContent({ sectionNumber, endNumber, title, preview, transcriptUrl }: ContentProps) {
  const displayRef = endNumber ? `§${sectionNumber}-${endNumber}` : `§${sectionNumber}`;
  const isRange = endNumber !== undefined && endNumber !== sectionNumber;

  return (
    <div className="space-y-3 pt-1">
      {/* Header with section number and title */}
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-amber-500/20 text-primary shadow-sm">
          <DocumentIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">{displayRef}</div>
          {title && (
            <p className="text-sm font-medium text-foreground/80 leading-snug mt-0.5 line-clamp-2">
              {title}
            </p>
          )}
        </div>
      </div>

      {/* Quote preview with nice styling */}
      {preview && (
        <div className="relative pl-3 border-l-2 border-quote/60 bg-quote/5 py-2 pr-2 rounded-r-lg">
          <p className="text-xs leading-relaxed text-foreground/80 italic line-clamp-4">
            &ldquo;{preview}&rdquo;
          </p>
        </div>
      )}

      {/* Fallback when no content is available */}
      {!title && !preview && (
        <p className="text-xs text-muted-foreground py-1">
          {isRange
            ? `Transcript sections ${sectionNumber} through ${endNumber}`
            : `View section ${sectionNumber} in the transcript`}
        </p>
      )}

      {/* Action link */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground/60">Brenner Transcript</span>
        <Link
          href={transcriptUrl}
          className="group inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm transition-colors"
        >
          Read in context
          <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Sheet Content (Mobile)
// ============================================================================

function SheetContent({
  sectionNumber,
  endNumber,
  title,
  preview,
  transcriptUrl,
  onClose,
}: ContentProps) {
  const displayRef = endNumber ? `§${sectionNumber}-${endNumber}` : `§${sectionNumber}`;
  const isRange = endNumber !== undefined && endNumber !== sectionNumber;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-amber-500/20 shadow-lg">
          <DocumentIcon className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3
            id={`section-ref-sheet-title-${sectionNumber}`}
            className="text-xl font-bold text-foreground"
          >
            {displayRef}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRange ? "Transcript sections" : "Brenner Transcript"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Section title */}
        {title && (
          <div className="rounded-xl bg-muted/30 p-4">
            <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Section Topic
            </h4>
            <p className="text-base font-semibold leading-snug text-foreground">{title}</p>
          </div>
        )}

        {/* Quote preview */}
        {preview && (
          <div className="relative rounded-xl border-l-4 border-quote/60 bg-quote/5 p-4">
            <div
              aria-hidden="true"
              className="absolute -top-1 -left-1 text-4xl text-quote/20 font-serif leading-none"
            >
              &ldquo;
            </div>
            <p className="text-sm leading-relaxed text-foreground/85 italic pl-4">{preview}</p>
          </div>
        )}

        {/* Fallback */}
        {!title && !preview && (
          <p className="text-sm text-muted-foreground py-2">
            {isRange
              ? `View sections ${sectionNumber} through ${endNumber} in the full transcript.`
              : `View this section in the full Brenner interview transcript.`}
          </p>
        )}

        {/* Action button */}
        <Link
          href={transcriptUrl}
          onClick={onClose}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all"
        >
          Read in Full Transcript
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Utility: Parse Section References from Text
// ============================================================================

/**
 * Regex to match section references like §42, §106, §1-3
 */
export const SECTION_REF_REGEX = /§(\d+(?:-\d+)?)/g;

/**
 * Parse a string and extract section reference numbers.
 * Returns array of section numbers (e.g., [42, 106])
 */
export function parseSectionReferences(text: string): number[] {
  SECTION_REF_REGEX.lastIndex = 0;
  const matches = text.matchAll(SECTION_REF_REGEX);
  const numbers: number[] = [];

  for (const match of matches) {
    const ref = match[1];
    // Handle ranges like §1-3
    if (ref.includes("-")) {
      const [start, end] = ref.split("-").map(Number);
      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }
    } else {
      numbers.push(parseInt(ref, 10));
    }
  }

  SECTION_REF_REGEX.lastIndex = 0;
  return numbers;
}

/**
 * Check if a string contains section references
 */
export function hasSectionReferences(text: string): boolean {
  SECTION_REF_REGEX.lastIndex = 0;
  const hasRef = SECTION_REF_REGEX.test(text);
  SECTION_REF_REGEX.lastIndex = 0;
  return hasRef;
}

// ============================================================================
// Render Text with Section References
// ============================================================================

interface RenderWithSectionRefsProps {
  /** Text containing section references like §42 */
  text: string;
  /** Optional map of section numbers to titles */
  sectionTitles?: Map<number, string>;
  /** Optional map of section numbers to preview text */
  sectionPreviews?: Map<number, string>;
  /** Optional class name for the wrapper span */
  className?: string;
}

/**
 * Renders text with §XXX references converted to interactive SectionReference components.
 *
 * Usage:
 * ```tsx
 * <RenderWithSectionRefs text="See §42 and §106 for more details" />
 * ```
 */
export function RenderWithSectionRefs({
  text,
  sectionTitles,
  sectionPreviews,
  className,
}: RenderWithSectionRefsProps) {
  // Split text on section references while keeping the delimiters
  const parts = text.split(/(§\d+(?:-\d+)?)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part is a section reference
        const match = part.match(/^§(\d+)(?:-(\d+))?$/);
        if (match) {
          const sectionNumber = parseInt(match[1], 10);
          const endNumber = match[2] ? parseInt(match[2], 10) : undefined;
          const title = sectionTitles?.get(sectionNumber);
          const preview = sectionPreviews?.get(sectionNumber);

          return (
            <SectionReference
              key={`section-${sectionNumber}-${endNumber ?? ""}-${index}`}
              sectionNumber={sectionNumber}
              endNumber={endNumber}
              title={title}
              preview={preview}
            />
          );
        }

        // Regular text - wrap in Fragment with key for proper React keying
        return <Fragment key={`text-${index}`}>{part}</Fragment>;
      })}
    </span>
  );
}
