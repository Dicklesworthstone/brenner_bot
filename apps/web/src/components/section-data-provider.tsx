"use client";

import * as React from "react";

// ============================================================================
// Types
// ============================================================================

interface SectionMeta {
  t: string; // title
  e: string; // excerpt
}

interface SectionDataContextValue {
  /** Get section data by number */
  getSection: (num: number) => { title: string; excerpt: string } | null;
  /** Whether data is loaded */
  isLoaded: boolean;
}

// ============================================================================
// Context
// ============================================================================

const SectionDataContext = React.createContext<SectionDataContextValue>({
  getSection: () => null,
  isLoaded: false,
});

// ============================================================================
// Hook
// ============================================================================

export function useSectionData() {
  return React.useContext(SectionDataContext);
}

// ============================================================================
// Provider
// ============================================================================

interface SectionDataProviderProps {
  children: React.ReactNode;
}

export function SectionDataProvider({ children }: SectionDataProviderProps) {
  const [data, setData] = React.useState<Record<number, SectionMeta> | null>(null);

  // Load section data once
  React.useEffect(() => {
    // Avoid refetching if already loaded
    if (data) return;

    fetch("/search/sections.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load sections");
        return res.json();
      })
      .then((json: Record<string, SectionMeta>) => {
        // Convert string keys to numbers
        const parsed: Record<number, SectionMeta> = {};
        for (const [key, value] of Object.entries(json)) {
          parsed[parseInt(key, 10)] = value;
        }
        setData(parsed);
      })
      .catch((err) => {
        console.warn("Failed to load section data:", err);
        // Set empty object to prevent retry loops
        setData({});
      });
  }, [data]);

  const getSection = React.useCallback(
    (num: number): { title: string; excerpt: string } | null => {
      if (!data) return null;
      const section = data[num];
      if (!section) return null;
      return { title: section.t, excerpt: section.e };
    },
    [data],
  );

  const contextValue = React.useMemo(
    () => ({
      getSection,
      isLoaded: data !== null,
    }),
    [getSection, data],
  );

  return <SectionDataContext.Provider value={contextValue}>{children}</SectionDataContext.Provider>;
}
