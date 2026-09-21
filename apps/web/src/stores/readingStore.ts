"use client";

import { Store } from "@tanstack/store";

const STORAGE_KEY = "brenner-reading-positions";
const MAX_POSITIONS = 50; // Limit stored positions to prevent bloat

export interface ReadingPosition {
  scrollOffset: number; // For virtualized lists
  activeSection: number;
  lastRead: number; // Timestamp
}

interface ReadingState {
  positions: Record<string, ReadingPosition>;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function toFiniteNonNegativeInteger(value: unknown): number | null {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  if (n < 0) return null;
  return Math.floor(n);
}

function sanitizeReadingPosition(value: unknown): ReadingPosition | null {
  if (!isRecord(value)) return null;

  const scrollOffset = toFiniteNumber(value.scrollOffset);
  const activeSection = toFiniteNonNegativeInteger(value.activeSection);
  const lastRead = toFiniteNumber(value.lastRead);

  if (scrollOffset === null || scrollOffset < 0) return null;
  if (activeSection === null) return null;
  if (lastRead === null || lastRead < 0) return null;

  return { scrollOffset, activeSection, lastRead };
}

function toNullProtoPositions(
  entries: Array<[string, ReadingPosition]>,
): Record<string, ReadingPosition> {
  const out: Record<string, ReadingPosition> = Object.create(null);
  for (const [key, value] of entries) {
    out[key] = value;
  }
  return out;
}

function prunePositions(
  positions: Record<string, ReadingPosition>,
): Record<string, ReadingPosition> {
  const entries = Object.entries(positions);
  if (entries.length <= MAX_POSITIONS) return positions;

  entries.sort((a, b) => b[1].lastRead - a[1].lastRead);
  return toNullProtoPositions(entries.slice(0, MAX_POSITIONS));
}

function sanitizePositions(value: unknown): Record<string, ReadingPosition> {
  if (!isRecord(value)) return Object.create(null);

  const entries: Array<[string, ReadingPosition]> = [];
  for (const [key, rawPos] of Object.entries(value)) {
    const pos = sanitizeReadingPosition(rawPos);
    if (!pos) continue;
    entries.push([key, pos]);
  }

  entries.sort((a, b) => b[1].lastRead - a[1].lastRead);
  return toNullProtoPositions(entries.slice(0, MAX_POSITIONS));
}

function loadInitialState(): ReadingState {
  if (typeof window === "undefined") {
    return { positions: Object.create(null) };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as unknown;
      if (isRecord(parsed)) {
        return { positions: sanitizePositions(parsed.positions) };
      }
    }
  } catch {
    // Ignore parse errors
  }

  return { positions: Object.create(null) };
}

export const readingStore = new Store<ReadingState>(loadInitialState());

// Persist to localStorage on state changes (debounced)
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

function persistState() {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }

  persistTimeout = setTimeout(() => {
    try {
      const state = readingStore.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, 500);
}

if (typeof window !== "undefined") {
  // Avoid duplicate subscriptions/listeners during dev HMR by reusing stable globals.
  const GLOBAL_STORAGE_HANDLER_KEY = "__brenner_readingStore_storageHandler__";
  const GLOBAL_UNSUBSCRIBE_KEY = "__brenner_readingStore_unsubscribe__";

  const previousUnsubscribe = (globalThis as unknown as Record<string, unknown>)[
    GLOBAL_UNSUBSCRIBE_KEY
  ];
  if (typeof previousUnsubscribe === "function") {
    previousUnsubscribe();
  }

  (globalThis as unknown as Record<string, unknown>)[GLOBAL_UNSUBSCRIBE_KEY] =
    readingStore.subscribe(persistState);

  // Cross-tab sync
  const previousStorageHandler = (globalThis as unknown as Record<string, unknown>)[
    GLOBAL_STORAGE_HANDLER_KEY
  ];
  if (typeof previousStorageHandler === "function") {
    window.removeEventListener("storage", previousStorageHandler as (e: StorageEvent) => void);
  }

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        if (isRecord(parsed)) {
          readingStore.setState(() => ({ positions: sanitizePositions(parsed.positions) }));
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  window.addEventListener("storage", storageHandler);
  (globalThis as unknown as Record<string, unknown>)[GLOBAL_STORAGE_HANDLER_KEY] = storageHandler;
}

// Actions
export function saveReadingPosition(
  docId: string,
  scrollOffset: number,
  activeSection: number,
): void {
  readingStore.setState((state) => {
    const newPositions = toNullProtoPositions(Object.entries(state.positions));
    newPositions[docId] = {
      scrollOffset,
      activeSection,
      lastRead: Date.now(),
    };

    return { positions: prunePositions(newPositions) };
  });
}

export function getReadingPosition(docId: string): ReadingPosition | null {
  return readingStore.state.positions[docId] ?? null;
}

export function clearReadingPosition(docId: string): void {
  readingStore.setState((state) => {
    const positions = toNullProtoPositions(
      Object.entries(state.positions).filter(([key]) => key !== docId),
    );
    return { positions: prunePositions(positions) };
  });
}

export function getRecentDocs(limit: number = 5): string[] {
  const entries = Object.entries(readingStore.state.positions);
  entries.sort((a, b) => b[1].lastRead - a[1].lastRead);
  return entries.slice(0, limit).map(([docId]) => docId);
}
