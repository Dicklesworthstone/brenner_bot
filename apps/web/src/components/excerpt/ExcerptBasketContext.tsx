"use client";

/**
 * ExcerptBasketContext - Context for managing the excerpt basket state
 *
 * Provides methods to add items to the basket from anywhere in the app,
 * most commonly from search results.
 */

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BasketItem } from "./ExcerptBasket";
import { ExcerptBasket } from "./ExcerptBasket";

// ============================================================================
// Types
// ============================================================================

interface BasketContextType {
  items: BasketItem[];
  addItem: (item: Omit<BasketItem, "id" | "addedAt">) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  isOpen: boolean;
  openBasket: () => void;
  closeBasket: () => void;
}

// ============================================================================
// Context
// ============================================================================

const BasketContext = React.createContext<BasketContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

const STORAGE_KEY = "brenner-excerpt-basket";
const SESSION_PREFILL_KEY = "brenner-session-excerpt-prefill";
const SESSION_PREFILL_PARAM = "prefill";
const SESSION_PREFILL_VALUE = "excerpt-basket";

function BookIcon({ className }: { className?: string }) {
  return (
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
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function saveSessionPrefill(markdown: string) {
  try {
    window.localStorage.setItem(SESSION_PREFILL_KEY, markdown);
  } catch {
    // best-effort only
  }
}

export function ExcerptBasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<BasketItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) setItems(parsed as BasketItem[]);
      }
    } catch (error) {
      console.warn("Failed to load basket from localStorage:", error);
    }
  }, []);

  // Save to localStorage when items change
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn("Failed to save basket to localStorage:", error);
    }
  }, [items]);

  const addItem = React.useCallback((item: Omit<BasketItem, "id" | "addedAt">) => {
    setItems((prev) => {
      if (item.anchor && prev.some((existing) => existing.anchor === item.anchor)) {
        return prev;
      }

      const newItem: BasketItem = {
        ...item,
        id: `${item.anchor}-${Date.now()}`,
        addedAt: Date.now(),
      };

      return [...prev, newItem];
    });

    // Auto-open basket when adding items (including duplicates)
    setIsOpen(true);
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearItems = React.useCallback(() => {
    setItems([]);
  }, []);

  const openBasket = React.useCallback(() => setIsOpen(true), []);
  const closeBasket = React.useCallback(() => setIsOpen(false), []);

  return (
    <BasketContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearItems,
        isOpen,
        openBasket,
        closeBasket,
      }}
    >
      {children}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md animate-fade-in"
            onClick={closeBasket}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none",
              "sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[480px] sm:p-6",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Excerpt basket"
          >
            <div className="pointer-events-auto animate-modal-in">
              <ExcerptBasket
                items={items}
                onItemsChange={setItems}
                onClose={closeBasket}
                exportLabel="Prefill Session"
                onExport={(markdown) => {
                  saveSessionPrefill(markdown);
                  closeBasket();
                  router.push(
                    `/sessions/new?${SESSION_PREFILL_PARAM}=${encodeURIComponent(SESSION_PREFILL_VALUE)}`,
                  );
                }}
              />
            </div>
          </div>
        </>
      )}
    </BasketContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useExcerptBasket() {
  const context = React.useContext(BasketContext);
  if (!context) {
    throw new Error("useExcerptBasket must be used within an ExcerptBasketProvider");
  }
  return context;
}

// ============================================================================
// Trigger
// ============================================================================

export function ExcerptBasketTrigger({ className }: { className?: string }) {
  const { openBasket, items } = useExcerptBasket();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openBasket}
      className={cn("gap-2", className)}
      aria-label={
        items.length > 0
          ? `Open excerpt basket (${items.length} ${items.length === 1 ? "item" : "items"})`
          : "Open excerpt basket"
      }
    >
      <BookIcon className="size-4" />
      <span className="hidden sm:inline">Excerpt</span>
      {items.length > 0 && (
        <span className="ml-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {items.length}
        </span>
      )}
    </Button>
  );
}
