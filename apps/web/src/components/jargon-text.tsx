"use client";

/**
 * JargonText - Automatically wraps jargon terms with interactive tooltips
 *
 * A drop-in replacement for plain text that auto-detects jargon terms from
 * the dictionary and wraps them with the Jargon component for tooltips.
 *
 * @example Basic usage
 * ```tsx
 * <JargonText>
 *   Sydney Brenner chose C. elegans because of its potency for genetic analysis.
 * </JargonText>
 * // "C. elegans" and "potency" become interactive jargon tooltips
 * ```
 *
 * @example With search highlights
 * ```tsx
 * <JargonText highlights={["genetic"]}>
 *   Brenner's genetic code work was groundbreaking.
 * </JargonText>
 * // "genetic" is highlighted, "genetic code" has jargon tooltip
 * ```
 *
 * @example Custom wrapper element
 * ```tsx
 * <JargonText as="blockquote" className="italic">
 *   The decision experiment is crucial.
 * </JargonText>
 * ```
 */

import { type ComponentPropsWithoutRef, type ElementType, type ReactNode, useMemo } from "react";
import { Jargon } from "@/components/jargon";
import { findJargonInText, type JargonMatch } from "@/lib/jargon";

// ============================================================================
// Types
// ============================================================================

type PolymorphicProps<E extends ElementType> = {
  /** The element type to render (default: "span") */
  as?: E;
  /** The text content to process for jargon terms */
  children: string;
  /** Optional search terms to highlight (in addition to jargon) */
  highlights?: string[];
  /** Whether to enable jargon detection (default: true) */
  enableJargon?: boolean;
} & Omit<ComponentPropsWithoutRef<E>, "children" | "as">;

// ============================================================================
// Highlight Rendering Helper
// ============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface TextSegment {
  type: "text" | "jargon" | "highlight" | "jargon-highlight";
  content: string;
  termKey?: string;
}

/**
 * Segments text into parts: plain text, jargon terms, highlights, and overlapping jargon+highlights.
 */
function segmentText(
  text: string,
  jargonMatches: JargonMatch[],
  highlights?: string[],
): TextSegment[] {
  if (jargonMatches.length === 0 && (!highlights || highlights.length === 0)) {
    return [{ type: "text", content: text }];
  }

  // Create a map of character positions to their "annotations"
  interface Annotation {
    isJargon: boolean;
    termKey?: string;
    isHighlight: boolean;
  }

  const annotations: Annotation[] = Array.from({ length: text.length }, () => ({
    isJargon: false,
    isHighlight: false,
  }));

  // Mark jargon positions
  for (const match of jargonMatches) {
    for (let i = match.start; i < match.end; i++) {
      annotations[i] = {
        ...annotations[i],
        isJargon: true,
        termKey: match.termKey,
      };
    }
  }

  // Mark highlight positions
  if (highlights && highlights.length > 0) {
    // Filter out empty/whitespace strings to prevent infinite regex matches
    const validHighlights = highlights.filter((h) => h.trim().length > 0);
    if (validHighlights.length > 0) {
      const pattern = validHighlights.map(escapeRegex).join("|");
      const regex = new RegExp(`(${pattern})`, "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        for (let i = match.index; i < match.index + match[0].length; i++) {
          annotations[i] = { ...annotations[i], isHighlight: true };
        }
      }
    }
  }

  // Build segments by grouping consecutive characters with same annotation type
  const segments: TextSegment[] = [];
  let currentSegment: TextSegment | null = null;

  for (let i = 0; i < text.length; i++) {
    const ann = annotations[i];
    let type: TextSegment["type"];

    if (ann.isJargon && ann.isHighlight) {
      type = "jargon-highlight";
    } else if (ann.isJargon) {
      type = "jargon";
    } else if (ann.isHighlight) {
      type = "highlight";
    } else {
      type = "text";
    }

    // Check if we can continue the current segment
    const canContinue =
      currentSegment && currentSegment.type === type && currentSegment.termKey === ann.termKey;

    if (canContinue && currentSegment) {
      currentSegment.content += text[i];
    } else {
      // Start a new segment
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        type,
        content: text[i],
        termKey: ann.termKey,
      };
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

// ============================================================================
// JargonText Component
// ============================================================================

/**
 * Renders text with automatic jargon term detection and optional search highlights.
 *
 * Jargon terms are wrapped in the Jargon component for interactive tooltips.
 * Search highlights are rendered with a highlight style.
 * When a term is both jargon and highlighted, it gets both treatments.
 */
export function JargonText<E extends ElementType = "span">({
  as,
  children,
  highlights,
  enableJargon = true,
  ...props
}: PolymorphicProps<E>): ReactNode {
  const Component = as || "span";

  const rendered = useMemo(() => {
    const text = children;

    // Find jargon matches
    const jargonMatches = enableJargon ? findJargonInText(text) : [];

    // Segment the text
    const segments = segmentText(text, jargonMatches, highlights);

    // Render segments
    return segments.map((segment, i) => {
      switch (segment.type) {
        case "text":
          return <span key={i}>{segment.content}</span>;

        case "jargon":
          return segment.termKey ? (
            <Jargon key={i} term={segment.termKey}>
              {segment.content}
            </Jargon>
          ) : (
            <span key={i}>{segment.content}</span>
          );

        case "highlight":
          return (
            <span key={i} className="font-semibold text-primary bg-primary/10 px-0.5 rounded">
              {segment.content}
            </span>
          );

        case "jargon-highlight":
          // Both jargon tooltip AND highlight styling
          return segment.termKey ? (
            <Jargon
              key={i}
              term={segment.termKey}
              className="font-semibold text-primary bg-primary/10 px-0.5 rounded"
            >
              {segment.content}
            </Jargon>
          ) : (
            <span key={i} className="font-semibold text-primary bg-primary/10 px-0.5 rounded">
              {segment.content}
            </span>
          );

        default:
          return <span key={i}>{segment.content}</span>;
      }
    });
  }, [children, highlights, enableJargon]);

  return <Component {...props}>{rendered}</Component>;
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Paragraph with jargon detection.
 */
export function JargonParagraph({
  children,
  highlights,
  className = "",
  ...props
}: {
  children: string;
  highlights?: string[];
  className?: string;
} & Omit<ComponentPropsWithoutRef<"p">, "children">) {
  return (
    <JargonText as="p" highlights={highlights} className={className} {...props}>
      {children}
    </JargonText>
  );
}

/**
 * Blockquote with jargon detection.
 */
export function JargonBlockquote({
  children,
  highlights,
  className = "",
  ...props
}: {
  children: string;
  highlights?: string[];
  className?: string;
} & Omit<ComponentPropsWithoutRef<"blockquote">, "children">) {
  return (
    <JargonText as="blockquote" highlights={highlights} className={className} {...props}>
      {children}
    </JargonText>
  );
}
