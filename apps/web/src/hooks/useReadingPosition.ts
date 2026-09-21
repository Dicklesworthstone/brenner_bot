"use client";

import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearReadingPosition,
  type ReadingPosition,
  readingStore,
  saveReadingPosition,
} from "@/stores/readingStore";

interface UseReadingPositionOptions {
  /** Debounce delay in ms for saving position (default: 500) */
  debounceMs?: number;
  /** Maximum section index - positions beyond this are treated as invalid */
  maxSection?: number;
}

interface UseReadingPositionReturn {
  /** Current saved position, or null if none */
  position: ReadingPosition | null;
  /** Save current reading position (debounced) */
  save: (scrollOffset: number, activeSection: number) => void;
  /** Clear saved position for this document */
  clear: () => void;
  /** Whether there's a position that can be restored (resets when docId changes) */
  canRestore: boolean;
  /** Call this after restoring to prevent repeated restoration attempts */
  markRestored: () => void;
}

/**
 * Hook for persisting and restoring reading positions.
 *
 * @param docId - Unique document identifier (e.g., "transcript", "distillation-opus-45")
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function TranscriptViewer({ docId, data }) {
 *   const { position, save, canRestore, markRestored } = useReadingPosition(docId, {
 *     maxSection: data.sections.length - 1,
 *   });
 *
 *   // Restore position on mount
 *   useEffect(() => {
 *     if (canRestore && position) {
 *       virtualizer.scrollToIndex(position.activeSection, { align: 'start' });
 *       markRestored();
 *     }
 *   }, [canRestore, position, markRestored]);
 *
 *   // Save on scroll
 *   const handleScroll = () => {
 *     save(virtualizer.scrollOffset, activeSection);
 *   };
 * }
 * ```
 */
export function useReadingPosition(
  docId: string,
  options: UseReadingPositionOptions = {},
): UseReadingPositionReturn {
  const { debounceMs = 500, maxSection } = options;

  const position = useStore(readingStore, (state) => state.positions[docId] ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track restoration state using state (key includes docId to auto-reset)
  const [restoredDocId, setRestoredDocId] = useState<string | null>(null);

  // Validate position against maxSection
  const validPosition =
    position && (maxSection === undefined || position.activeSection <= maxSection)
      ? position
      : null;

  // Can restore if: valid position exists AND we haven't marked this docId as restored
  const canRestore = validPosition !== null && restoredDocId !== docId;

  // Debounced save
  const save = useCallback(
    (scrollOffset: number, activeSection: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        saveReadingPosition(docId, scrollOffset, activeSection);
      }, debounceMs);
    },
    [docId, debounceMs],
  );

  // Clear position
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    clearReadingPosition(docId);
  }, [docId]);

  // Mark as restored
  const markRestored = useCallback(() => {
    setRestoredDocId(docId);
  }, [docId]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    position: validPosition,
    save,
    clear,
    canRestore,
    markRestored,
  };
}
