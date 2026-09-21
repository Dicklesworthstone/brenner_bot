"use client";

/**
 * TutorialCodeBlock - Syntax highlighted code block with copy functionality
 *
 * Features:
 * - Syntax highlighting via highlight.js (through rehype-highlight)
 * - Copy button with success feedback and keyboard shortcut hint
 * - Optional title bar with filename/description (traffic light style)
 * - Optional line numbers with hover highlighting
 * - Collapsible for long code blocks
 * - Diff mode for before/after comparisons
 * - Scroll indicators for horizontal overflow
 * - Mobile-optimized with larger touch targets
 */

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronDown, Code, Command, Copy, Terminal } from "lucide-react";
import * as React from "react";
import { CopyButton } from "@/components/ui/copy-button";
import type { CodeDiff, CodeLanguage } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface TutorialCodeBlockProps {
  /** The code to display */
  code: string;
  /** Programming language for syntax highlighting */
  language?: CodeLanguage;
  /** Optional title (e.g., filename) */
  title?: string;
  /** Optional description below title */
  description?: string;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Make the code block collapsible */
  collapsible?: boolean;
  /** Start collapsed (only if collapsible) */
  defaultCollapsed?: boolean;
  /** Alternative: show a diff view */
  diff?: CodeDiff;
  /** Additional CSS classes */
  className?: string;
  /** Max height before scrolling (default: none) */
  maxHeight?: string;
}

// ============================================================================
// Language Mapping
// ============================================================================

const languageLabels: Record<CodeLanguage, string> = {
  bash: "Terminal",
  typescript: "TypeScript",
  javascript: "JavaScript",
  markdown: "Markdown",
  json: "JSON",
  yaml: "YAML",
  text: "Text",
};

const languageIcons: Record<CodeLanguage, React.ReactNode> = {
  bash: <Terminal className="size-4" />,
  typescript: <Code className="size-4" />,
  javascript: <Code className="size-4" />,
  markdown: <Code className="size-4" />,
  json: <Code className="size-4" />,
  yaml: <Code className="size-4" />,
  text: <Code className="size-4" />,
};

// ============================================================================
// Code Line Component
// ============================================================================

function CodeLine({
  line,
  lineNumber,
  showLineNumber,
  diffType,
  language,
  isHighlighted,
  onHover,
}: {
  line: string;
  lineNumber: number;
  showLineNumber: boolean;
  diffType?: "add" | "remove" | "context";
  language?: CodeLanguage;
  isHighlighted?: boolean;
  onHover?: (lineNumber: number | null) => void;
}) {
  // Render bash lines with colored $ prompt and comments
  const renderBashLine = (text: string) => {
    if (text.startsWith("$")) {
      return (
        <>
          <span className="text-[oklch(0.72_0.19_145)]">$</span>
          <span className="text-foreground">{text.slice(1)}</span>
        </>
      );
    }
    if (text.startsWith("#")) {
      return <span className="text-muted-foreground italic">{text}</span>;
    }
    return text;
  };

  return (
    <div
      className={cn(
        "flex group/line transition-colors duration-150",
        diffType === "add" &&
          "bg-[oklch(0.72_0.19_145/0.1)] border-l-2 border-[oklch(0.72_0.19_145)]",
        diffType === "remove" &&
          "bg-destructive/10 border-l-2 border-destructive line-through opacity-70",
        isHighlighted && !diffType && "bg-primary/10",
      )}
      onMouseEnter={() => onHover?.(lineNumber)}
      onMouseLeave={() => onHover?.(null)}
    >
      {showLineNumber && (
        <span
          className={cn(
            "select-none w-12 pr-4 text-right shrink-0 transition-colors duration-150 font-mono text-xs",
            isHighlighted
              ? "text-primary"
              : "text-muted-foreground/40 group-hover/line:text-muted-foreground/60",
          )}
        >
          {lineNumber}
        </span>
      )}
      <span className="flex-1 pr-4">
        {diffType === "add" && (
          <span className="text-[oklch(0.72_0.19_145)] mr-1 font-bold">+</span>
        )}
        {diffType === "remove" && <span className="text-destructive mr-1 font-bold">-</span>}
        {language === "bash" ? renderBashLine(line) : line || " "}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TutorialCodeBlock({
  code,
  language = "text",
  title,
  description,
  showLineNumbers = false,
  collapsible = false,
  defaultCollapsed = false,
  diff,
  className,
  maxHeight,
}: TutorialCodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [activeTab, setActiveTab] = React.useState<"before" | "after">("after");
  const [highlightedLine, setHighlightedLine] = React.useState<number | null>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [hasMoreToScroll, setHasMoreToScroll] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Smooth scroll-linked opacity using motion values
  const scrollProgress = useMotionValue(0);
  const scrollEndProgress = useMotionValue(0);

  // Transform scroll position to opacity (0 when at edge, 1 when scrolled)
  const leftIndicatorOpacity = useTransform(scrollProgress, [0, 0.05], [0.15, 1]);
  const rightIndicatorOpacity = useTransform(scrollEndProgress, [0, 0.05], [1, 0.15]);

  // If diff mode, use diff data
  const displayCode = diff ? (activeTab === "before" ? diff.before : diff.after) : code;
  const displayLanguage = diff ? diff.language : language;
  const lines = displayCode.split("\n");

  // Calculate if code is "long" (more than 15 lines)
  const isLong = lines.length > 15;

  // Track scroll position with motion values for smooth indicator transitions
  const updateScrollProgress = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll > 0) {
      // How far we've scrolled from the start (0-1)
      scrollProgress.set(scrollLeft / maxScroll);
      // How far we are from the end (0-1, inverted)
      const endProgress = (maxScroll - scrollLeft) / maxScroll;
      scrollEndProgress.set(endProgress);
      // Track if there's more content to scroll (for mobile hint)
      setHasMoreToScroll(endProgress > 0.1);
    } else {
      scrollProgress.set(0);
      scrollEndProgress.set(0);
      setHasMoreToScroll(false);
    }
  }, [scrollProgress, scrollEndProgress]);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollProgress();
    container.addEventListener("scroll", updateScrollProgress);
    window.addEventListener("resize", updateScrollProgress);

    return () => {
      container.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
    };
  }, [updateScrollProgress, displayCode]);

  // Detect platform for keyboard shortcut display (use userAgent since platform is deprecated)
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  // Header content - Terminal style with traffic lights (ACFS pattern)
  const headerContent = (
    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-b border-border/50">
      <div className="flex items-center gap-3 min-w-0">
        {/* Traffic light buttons */}
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-destructive/60" />
          <div className="size-3 rounded-full bg-amber-500/60" />
          <div className="size-3 rounded-full bg-success/60" />
        </div>

        {/* Title or language label */}
        {title ? (
          <span className="text-xs text-muted-foreground font-mono truncate">{title}</span>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {languageIcons[displayLanguage]}
            <span className="text-xs font-mono">{languageLabels[displayLanguage]}</span>
          </div>
        )}

        {/* Diff tabs */}
        {diff && (
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setActiveTab("before")}
              className={cn(
                "px-2 py-0.5 text-xs rounded transition-colors",
                activeTab === "before"
                  ? "bg-destructive/20 text-destructive"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Before
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("after")}
              className={cn(
                "px-2 py-0.5 text-xs rounded transition-colors",
                activeTab === "after"
                  ? "bg-success/20 text-success"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              After
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Keyboard shortcut hint (desktop only) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/60"
            >
              {isMac ? <Command className="size-3" /> : <span className="text-[10px]">Ctrl</span>}
              <span>+</span>
              <Copy className="size-3" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        {collapsible && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "touch-manipulation active:scale-95",
            )}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand code" : "Collapse code"}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <ChevronDown className="size-4" />
            </motion.div>
          </button>
        )}

        {/* Copy button with larger touch target on mobile */}
        <CopyButton
          text={displayCode}
          variant="ghost"
          size="sm"
          label="Copy"
          successMessage={`Copied ${lines.length} lines`}
          showPreview={false}
          className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
        />
      </div>
    </div>
  );

  // Description (if provided)
  const descriptionContent = description && (
    <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b border-border">
      {description}
    </div>
  );

  // Code content with enhanced scroll indicators
  const codeContent = (
    <div className="relative group/code">
      <div
        ref={scrollContainerRef}
        className={cn(
          "overflow-x-auto font-mono text-sm leading-relaxed scrollbar-hide scroll-smooth",
          maxHeight && "overflow-y-auto",
          !collapsible && isLong && !maxHeight && "max-h-[400px] overflow-y-auto",
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <pre className="p-4 m-0">
          <code className={`language-${displayLanguage}`}>
            {lines.map((line, i) => (
              <CodeLine
                key={i}
                line={line}
                lineNumber={i + 1}
                showLineNumber={showLineNumbers}
                language={displayLanguage}
                isHighlighted={highlightedLine === i + 1}
                onHover={setHighlightedLine}
              />
            ))}
          </code>
        </pre>
      </div>

      {/* Enhanced scroll fade indicators with smooth scroll-linked opacity */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[oklch(0.12_0.015_260)] via-[oklch(0.12_0.015_260/0.8)] to-transparent"
        style={{ opacity: leftIndicatorOpacity }}
      />
      <motion.div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[oklch(0.12_0.015_260)] via-[oklch(0.12_0.015_260/0.8)] to-transparent"
        style={{ opacity: rightIndicatorOpacity }}
      />

      {/* Scroll hint for mobile - shows when content is scrollable */}
      <AnimatePresence>
        {hasMoreToScroll && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute bottom-2 right-2 sm:hidden flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs backdrop-blur-sm"
          >
            <span>Scroll</span>
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1, repeat: Infinity }}>
              →
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "rounded-xl border border-border/50 bg-[oklch(0.12_0.015_260)] overflow-hidden",
        "shadow-md transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30",
        className,
      )}
    >
      {/* Header */}
      {headerContent}

      {/* Description */}
      {descriptionContent}

      {/* Code (collapsible) */}
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
              {codeContent}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        codeContent
      )}
    </motion.div>
  );
}

// ============================================================================
// Inline Code Component (for inline snippets)
// ============================================================================

export interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
  copyable?: boolean;
}

export function InlineCode({ children, className, copyable = false }: InlineCodeProps) {
  const text = typeof children === "string" ? children : "";

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1",
        "px-1.5 py-0.5 rounded-md",
        "bg-muted font-mono text-sm",
        "border border-border/50",
        "transition-all duration-200 hover:bg-muted/80 hover:border-primary/30",
        copyable && "group pr-7 cursor-pointer hover:shadow-sm",
        className,
      )}
    >
      <span className="text-primary/90">{children}</span>
      {copyable && text && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2">
          <CopyButton
            text={text}
            variant="ghost"
            size="sm"
            showPreview={false}
            className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity duration-200"
          />
        </span>
      )}
    </span>
  );
}

// Types are already exported with their interface definitions above
