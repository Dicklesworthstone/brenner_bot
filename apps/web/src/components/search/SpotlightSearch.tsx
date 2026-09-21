"use client";

import {
  ArrowRight,
  Beaker,
  BookOpen,
  Command,
  CornerDownLeft,
  FileText,
  Home,
  Keyboard,
  Layers,
  Loader2,
  Moon,
  Plus,
  Quote,
  ScrollText,
  Search,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { createBasketItem, useExcerptBasket } from "@/components/excerpt";
import { useDebounce } from "@/hooks/useDebounce";
import { searchAction } from "@/lib/globalSearchAction";
import {
  type GlobalSearchHit,
  type GlobalSearchResult,
  getCategoryInfo,
  type SearchCategory,
} from "@/lib/globalSearchTypes";
import { toggleThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  keyboardShortcutsEnabled?: boolean;
  vimMode?: boolean;
  onToggleKeyboardShortcuts?: () => void;
  onToggleVimMode?: () => void;
}

type SpotlightCommandSection = "Navigation" | "Session" | "Actions" | "Preferences";

interface SpotlightCommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string[];
  keywords?: string[];
  section: SpotlightCommandSection;
  action: () => void;
}

type SpotlightSelectableItem =
  | { type: "command"; command: SpotlightCommandItem }
  | { type: "hit"; hit: GlobalSearchHit };

// ============================================================================
// Main Component
// ============================================================================

export function SpotlightSearch({
  isOpen,
  onClose,
  keyboardShortcutsEnabled,
  vimMode,
  onToggleKeyboardShortcuts,
  onToggleVimMode,
}: SpotlightSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { addItem, openBasket } = useExcerptBasket();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, isPending] = useDebounce(query, 150);
  const [results, setResults] = React.useState<GlobalSearchResult | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [activeCategory, setActiveCategory] = React.useState<SearchCategory>("all");
  const [isCheatsheetOpen, setIsCheatsheetOpen] = React.useState(false);

  const toggleTheme = React.useCallback(() => {
    toggleThemePreference();
  }, []);

  const sessionId = React.useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] !== "sessions") return null;
    const candidate = parts[1];
    if (!candidate || candidate === "new") return null;
    return candidate;
  }, [pathname]);

  const commands = React.useMemo<SpotlightCommandItem[]>(() => {
    const pushAndClose = (href: string) => {
      router.push(href);
      onClose();
    };

    const items: SpotlightCommandItem[] = [
      {
        id: "nav-home",
        title: "Go to Home",
        icon: <Home className="size-4" />,
        shortcut: ["G", "H"],
        keywords: ["home", "index", "start"],
        section: "Navigation",
        action: () => pushAndClose("/"),
      },
      {
        id: "nav-corpus",
        title: "Go to Corpus",
        subtitle: "Browse all documents",
        icon: <BookOpen className="size-4" />,
        shortcut: ["G", "C"],
        keywords: ["corpus", "documents"],
        section: "Navigation",
        action: () => pushAndClose("/corpus"),
      },
      {
        id: "nav-distillations",
        title: "Go to Distillations",
        subtitle: "Compare model analyses",
        icon: <Sparkles className="size-4" />,
        shortcut: ["G", "D"],
        keywords: ["distillations", "models"],
        section: "Navigation",
        action: () => pushAndClose("/distillations"),
      },
      {
        id: "nav-method",
        title: "Go to Method",
        subtitle: "Learn the Brenner Loop",
        icon: <Beaker className="size-4" />,
        shortcut: ["G", "M"],
        keywords: ["method", "brenner loop", "operators"],
        section: "Navigation",
        action: () => pushAndClose("/method"),
      },
      {
        id: "nav-operators",
        title: "Go to Operators",
        subtitle: "Operator palette + prompt builder",
        icon: <Layers className="size-4" />,
        shortcut: ["G", "O"],
        keywords: ["operators", "operator palette", "prompts"],
        section: "Navigation",
        action: () => pushAndClose("/operators"),
      },
      {
        id: "doc-transcript",
        title: "Read Full Transcript",
        subtitle: "Web of Stories interview",
        icon: <ScrollText className="size-4" />,
        keywords: ["transcript"],
        section: "Navigation",
        action: () => pushAndClose("/corpus/transcript"),
      },
      {
        id: "doc-quote-bank",
        title: "Browse Quote Bank",
        subtitle: "Curated Brenner quotes",
        icon: <Quote className="size-4" />,
        keywords: ["quotes", "quote bank"],
        section: "Navigation",
        action: () => pushAndClose("/corpus/quote-bank"),
      },
      {
        id: "doc-opus",
        title: "Opus 4.5 Distillation",
        subtitle: "Two Axioms Framework",
        icon: <Sparkles className="size-4" />,
        keywords: ["opus", "distillation"],
        section: "Navigation",
        action: () => pushAndClose("/corpus/distillation-opus-45"),
      },
      {
        id: "doc-gpt",
        title: "GPT‑5.2 Distillation",
        subtitle: "Optimization lens",
        icon: <Sparkles className="size-4" />,
        keywords: ["gpt", "gpt-5.2", "distillation"],
        section: "Navigation",
        action: () => pushAndClose("/corpus/distillation-gpt-52"),
      },
      {
        id: "doc-gemini",
        title: "Gemini 3 Distillation",
        subtitle: "Minimal kernel",
        icon: <Sparkles className="size-4" />,
        keywords: ["gemini", "distillation"],
        section: "Navigation",
        action: () => pushAndClose("/corpus/distillation-gemini-3"),
      },
      {
        id: "sessions",
        title: "Go to Sessions",
        subtitle: "View running threads and local sessions",
        icon: <Terminal className="size-4" />,
        shortcut: ["G", "S"],
        keywords: ["sessions", "threads", "agent mail"],
        section: "Navigation",
        action: () => pushAndClose("/sessions"),
      },
      {
        id: "new-session",
        title: "New Session",
        subtitle: "Start a lab-mode orchestration thread",
        icon: <Terminal className="size-4" />,
        keywords: ["new", "session", "lab"],
        section: "Actions",
        action: () => pushAndClose("/sessions/new"),
      },
      {
        id: "open-excerpt-basket",
        title: "Open Excerpt Basket",
        subtitle: "Manage cited snippets for kickoffs",
        icon: <BookOpen className="size-4" />,
        keywords: ["excerpt", "basket", "citations"],
        section: "Actions",
        action: () => {
          openBasket();
          onClose();
        },
      },
      {
        id: "toggle-theme",
        title: "Toggle Theme",
        subtitle: "Switch between light and dark",
        icon: <Moon className="size-4" />,
        keywords: ["theme", "dark", "light"],
        section: "Actions",
        action: () => {
          toggleTheme();
          onClose();
        },
      },
      {
        id: "cheatsheet",
        title: "Keyboard Shortcuts",
        subtitle: "Show cheatsheet",
        icon: <Keyboard className="size-4" />,
        shortcut: ["?"],
        keywords: ["shortcuts", "help"],
        section: "Actions",
        action: () => setIsCheatsheetOpen(true),
      },
    ];

    if (sessionId) {
      const base = `/sessions/${sessionId}`;
      items.push(
        {
          id: "session-overview",
          title: "Session: Overview",
          subtitle: sessionId,
          icon: <Terminal className="size-4" />,
          keywords: ["session", "overview"],
          section: "Session",
          action: () => pushAndClose(base),
        },
        {
          id: "session-hypothesis",
          title: "Session: Hypothesis",
          icon: <Terminal className="size-4" />,
          keywords: ["session", "hypothesis"],
          section: "Session",
          action: () => pushAndClose(`${base}/hypothesis`),
        },
        {
          id: "session-evidence",
          title: "Session: Evidence",
          icon: <Terminal className="size-4" />,
          keywords: ["session", "evidence"],
          section: "Session",
          action: () => pushAndClose(`${base}/evidence`),
        },
        {
          id: "session-operators",
          title: "Session: Operators",
          icon: <Terminal className="size-4" />,
          keywords: ["session", "operators"],
          section: "Session",
          action: () => pushAndClose(`${base}/operators`),
        },
        {
          id: "session-test-queue",
          title: "Session: Test Queue",
          icon: <Terminal className="size-4" />,
          keywords: ["session", "tests", "queue"],
          section: "Session",
          action: () => pushAndClose(`${base}/test-queue`),
        },
        {
          id: "session-agents",
          title: "Session: Agents",
          icon: <Terminal className="size-4" />,
          keywords: ["session", "agents", "tribunal"],
          section: "Session",
          action: () => pushAndClose(`${base}/agents`),
        },
        {
          id: "session-brief",
          title: "Session: Brief",
          icon: <Terminal className="size-4" />,
          keywords: ["session", "brief"],
          section: "Session",
          action: () => pushAndClose(`${base}/brief`),
        },
      );
    }

    if (typeof onToggleKeyboardShortcuts === "function") {
      items.push({
        id: "prefs-shortcuts",
        title: `Keyboard shortcuts: ${keyboardShortcutsEnabled === false ? "Off" : "On"}`,
        subtitle: "Enable/disable non-command-palette shortcuts",
        icon: <Keyboard className="size-4" />,
        keywords: ["keyboard", "shortcuts", "preferences"],
        section: "Preferences",
        action: () => onToggleKeyboardShortcuts(),
      });
    }

    if (typeof onToggleVimMode === "function") {
      items.push({
        id: "prefs-vim-mode",
        title: `Vim mode: ${vimMode ? "On" : "Off"}`,
        subtitle: "Enable j/k navigation on session pages",
        icon: <Keyboard className="size-4" />,
        keywords: ["vim", "hjkl", "preferences"],
        section: "Preferences",
        action: () => onToggleVimMode(),
      });
    }

    return items;
  }, [
    router,
    openBasket,
    toggleTheme,
    sessionId,
    onClose,
    keyboardShortcutsEnabled,
    vimMode,
    onToggleKeyboardShortcuts,
    onToggleVimMode,
  ]);

  const trimmedQuery = query.trim();

  const displayedCommands = React.useMemo(() => {
    if (!trimmedQuery) return commands;
    if (trimmedQuery.length < 2) return [];
    const q = trimmedQuery.toLowerCase();
    return commands.filter((cmd) => {
      const haystack = [cmd.title, cmd.subtitle ?? "", cmd.section, ...(cmd.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, trimmedQuery]);

  const flatItems = React.useMemo<SpotlightSelectableItem[]>(() => {
    const hits = results?.hits ?? [];
    return [
      ...displayedCommands.map((command) => ({ type: "command" as const, command })),
      ...hits.map((hit) => ({ type: "hit" as const, hit })),
    ];
  }, [displayedCommands, results?.hits]);

  const groupedCommands = React.useMemo(() => {
    const groups: Record<SpotlightCommandSection, SpotlightCommandItem[]> = {
      Navigation: [],
      Session: [],
      Actions: [],
      Preferences: [],
    };
    for (const cmd of displayedCommands) {
      groups[cmd.section].push(cmd);
    }
    return groups;
  }, [displayedCommands]);

  const commandIndexById = React.useMemo(() => {
    return new Map(displayedCommands.map((cmd, index) => [cmd.id, index]));
  }, [displayedCommands]);

  const navigateToResult = React.useCallback(
    (hit: GlobalSearchHit) => {
      // Include query param for back-to-search and multi-match navigation
      const url = new URL(hit.url, window.location.origin);
      const trimmed = query.trim();
      if (trimmed) {
        url.searchParams.set("q", trimmed);
      }
      router.push(url.pathname + url.search + url.hash);
      onClose();
    },
    [router, onClose, query],
  );

  const canAddHitToExcerpt = React.useCallback((hit: GlobalSearchHit): boolean => {
    if (hit.category !== "transcript" && hit.category !== "quote-bank") return false;
    if (!hit.anchor || !hit.snippet) return false;
    return /^§\d+$/.test(hit.anchor);
  }, []);

  const addHitToExcerpt = React.useCallback(
    (hit: GlobalSearchHit) => {
      if (!canAddHitToExcerpt(hit)) return;
      addItem(createBasketItem(hit));
      onClose();
    },
    [addItem, onClose, canAddHitToExcerpt],
  );

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
      setActiveCategory("all");
      setIsCheatsheetOpen(false);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex((prev) => {
      if (flatItems.length === 0) return 0;
      return prev < flatItems.length ? prev : 0;
    });
  }, [flatItems.length, isOpen]);

  // Perform search when debounced query changes
  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      setSelectedIndex(0);
      setIsSearching(false);
      return;
    }

    // Track whether this effect has been superseded by a newer one
    let cancelled = false;

    const search = async () => {
      setIsSearching(true);
      try {
        const result = await searchAction(debouncedQuery, {
          limit: 25,
          category: activeCategory,
        });
        // Only update state if this search is still current
        if (!cancelled) {
          setResults(result);
          setSelectedIndex(0);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Search failed:", err);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    search();

    // Cleanup: mark this search as stale when deps change or component unmounts
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeCategory]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (isCheatsheetOpen) {
          setIsCheatsheetOpen(false);
          return;
        }
        onClose();
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setIsCheatsheetOpen((prev) => !prev);
        return;
      }

      if (isCheatsheetOpen) return;

      if (flatItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
      } else if (e.key === "Enter" && flatItems[selectedIndex]) {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item.type === "command") {
          item.command.action();
          return;
        }
        const hit = item.hit;
        if (e.shiftKey && canAddHitToExcerpt(hit)) {
          addHitToExcerpt(hit);
          return;
        }
        navigateToResult(hit);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    flatItems,
    selectedIndex,
    onClose,
    navigateToResult,
    addHitToExcerpt,
    canAddHitToExcerpt,
    isCheatsheetOpen,
  ]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (!resultsRef.current) return;
    const selectedEl = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const isLoading = isPending || isSearching;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4 pointer-events-none">
        <div
          className="w-full max-w-2xl pointer-events-auto animate-modal-in"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          {/* Search Container */}
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-2xl shadow-primary/5">
            {/* Decorative gradient border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-amber-500/10 opacity-50 pointer-events-none" />
            <div className="absolute inset-[1px] rounded-2xl bg-card pointer-events-none" />

            {/* Cheatsheet Overlay */}
            {isCheatsheetOpen && (
              <div className="absolute inset-0 z-20 bg-card/95 backdrop-blur-md">
                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Keyboard shortcuts</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Press <kbd className="kbd">Esc</kbd> to close.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCheatsheetOpen(false)}
                      className="p-2 -m-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      aria-label="Close shortcuts"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Palette
                      </div>
                      <ShortcutRow label="Open palette">
                        <kbd className="kbd">
                          <Command className="size-3" />
                        </kbd>
                        <kbd className="kbd">K</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Navigate">
                        <kbd className="kbd">↑</kbd>
                        <kbd className="kbd">↓</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Select">
                        <kbd className="kbd">
                          <CornerDownLeft className="size-3" />
                        </kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Add to excerpt basket">
                        <kbd className="kbd">⇧</kbd>
                        <kbd className="kbd">
                          <CornerDownLeft className="size-3" />
                        </kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Help">
                        <kbd className="kbd">?</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Close">
                        <kbd className="kbd">Esc</kbd>
                      </ShortcutRow>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Navigation
                      </div>
                      <ShortcutRow label="Home">
                        <kbd className="kbd">G</kbd>
                        <kbd className="kbd">H</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Corpus">
                        <kbd className="kbd">G</kbd>
                        <kbd className="kbd">C</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Distillations">
                        <kbd className="kbd">G</kbd>
                        <kbd className="kbd">D</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Method">
                        <kbd className="kbd">G</kbd>
                        <kbd className="kbd">M</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Operators">
                        <kbd className="kbd">G</kbd>
                        <kbd className="kbd">O</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Sessions">
                        <kbd className="kbd">G</kbd>
                        <kbd className="kbd">S</kbd>
                      </ShortcutRow>
                      <ShortcutRow label="Session section">
                        <kbd className="kbd">[</kbd>
                        <kbd className="kbd">]</kbd>
                      </ShortcutRow>
                      {vimMode && (
                        <ShortcutRow label="Session section (vim)">
                          <kbd className="kbd">J</kbd>
                          <kbd className="kbd">K</kbd>
                        </ShortcutRow>
                      )}
                      {vimMode && (
                        <>
                          <ShortcutRow label="Session: first section">
                            <kbd className="kbd">G</kbd>
                            <kbd className="kbd">G</kbd>
                          </ShortcutRow>
                          <ShortcutRow label="Session: last section">
                            <kbd className="kbd">G</kbd>
                          </ShortcutRow>
                        </>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Tip: Type at least <span className="font-mono text-foreground">2</span>{" "}
                        characters to match commands. Shorter queries search the corpus only.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <div className="relative flex items-center">
                <div className="absolute left-4 sm:left-5 text-muted-foreground">
                  {isLoading ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <Search className="size-5" />
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search transcript, quotes, distillations..."
                  className={cn(
                    "w-full bg-transparent py-4 sm:py-5 pl-12 sm:pl-14 pr-12 sm:pr-14",
                    "text-base sm:text-lg text-foreground placeholder:text-muted-foreground/60",
                    "border-b border-border/50",
                    "focus:outline-none",
                  )}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-4 sm:right-5 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Category Filters */}
              {query && (
                <div className="relative px-4 sm:px-5 py-2 border-b border-border/30">
                  {/* Scroll fade indicators */}
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card to-transparent z-10 sm:hidden" />
                  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent z-10 sm:hidden" />
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
                    <CategoryPill
                      category="all"
                      isActive={activeCategory === "all"}
                      onClick={() => setActiveCategory("all")}
                      count={results?.totalMatches}
                    />
                    <CategoryPill
                      category="transcript"
                      isActive={activeCategory === "transcript"}
                      onClick={() => setActiveCategory("transcript")}
                      count={results?.categories.transcript}
                    />
                    <CategoryPill
                      category="quote-bank"
                      isActive={activeCategory === "quote-bank"}
                      onClick={() => setActiveCategory("quote-bank")}
                      count={results?.categories["quote-bank"]}
                    />
                    <CategoryPill
                      category="distillation"
                      isActive={activeCategory === "distillation"}
                      onClick={() => setActiveCategory("distillation")}
                      count={results?.categories.distillation}
                    />
                    <CategoryPill
                      category="metaprompt"
                      isActive={activeCategory === "metaprompt"}
                      onClick={() => setActiveCategory("metaprompt")}
                      count={results?.categories.metaprompt}
                    />
                    <CategoryPill
                      category="raw-response"
                      isActive={activeCategory === "raw-response"}
                      onClick={() => setActiveCategory("raw-response")}
                      count={results?.categories["raw-response"]}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            <div
              ref={resultsRef}
              className="relative max-h-[50vh] sm:max-h-[60vh] overflow-y-auto overscroll-contain"
            >
              {/* Commands */}
              {displayedCommands.length > 0 && (
                <div className="p-2 sm:p-3 border-b border-border/30">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {trimmedQuery ? "Matching commands" : "Commands"}
                  </div>
                  <div className="mt-1 space-y-3">
                    {(["Navigation", "Session", "Actions", "Preferences"] as const).map(
                      (section) => {
                        const sectionCommands = groupedCommands[section];
                        if (sectionCommands.length === 0) return null;
                        return (
                          <div key={section}>
                            <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                              {section}
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {sectionCommands.map((command) => {
                                const index = commandIndexById.get(command.id);
                                if (typeof index !== "number") return null;
                                return (
                                  <CommandResultItem
                                    key={command.id}
                                    command={command}
                                    isSelected={selectedIndex === index}
                                    index={index}
                                    onClick={() => command.action()}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {/* Loading Skeletons */}
              {isLoading && !results && query && (
                <div className="p-3 sm:p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SearchResultSkeleton key={i} delay={i * 50} />
                  ))}
                </div>
              )}

              {/* Results List */}
              {results && results.hits.length > 0 && (
                <div className="p-2 sm:p-3">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {results.totalMatches} result{results.totalMatches !== 1 ? "s" : ""}{" "}
                    <span className="opacity-60">({results.searchTimeMs}ms)</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.hits.map((hit, index) => {
                      const globalIndex = displayedCommands.length + index;
                      return (
                        <SearchResultItem
                          key={hit.id}
                          hit={hit}
                          query={debouncedQuery}
                          isSelected={selectedIndex === globalIndex}
                          index={globalIndex}
                          onClick={() => navigateToResult(hit)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          onAddToExcerpt={() => addHitToExcerpt(hit)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results */}
              {results && results.hits.length === 0 && !isLoading && <EmptyState query={query} />}

              {/* Initial State */}
              {!query && <InitialState onSearch={setQuery} />}
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-t border-border/50 bg-muted/30">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="kbd">↑</kbd>
                  <kbd className="kbd">↓</kbd>
                  <span className="ml-1 hidden sm:inline">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd">
                    <CornerDownLeft className="size-3" />
                  </kbd>
                  <span className="ml-1 hidden sm:inline">Open</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd">⇧</kbd>
                  <kbd className="kbd">
                    <CornerDownLeft className="size-3" />
                  </kbd>
                  <span className="ml-1 hidden sm:inline">Add to Excerpt</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd">?</kbd>
                  <span className="ml-1 hidden sm:inline">Shortcuts</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd">Esc</kbd>
                  <span className="ml-1 hidden sm:inline">Close</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Command className="size-3" />
                <span>K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ShortcutRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}

function CategoryPill({
  category,
  isActive,
  onClick,
  count,
}: {
  category: SearchCategory;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) {
  const label =
    category === "all" ? "All" : getCategoryInfo(category as Exclude<SearchCategory, "all">).label;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn("text-[10px] sm:text-xs", isActive ? "opacity-80" : "opacity-60")}>
          {count}
        </span>
      )}
    </button>
  );
}

function CommandResultItem({
  command,
  isSelected,
  index,
  onClick,
  onMouseEnter,
}: {
  command: SpotlightCommandItem;
  isSelected: boolean;
  index: number;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      data-index={index}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent",
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center size-9 rounded-lg",
          isSelected ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground",
        )}
      >
        {command.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-sm text-foreground truncate">{command.title}</div>
            {command.subtitle && (
              <div className="text-xs text-muted-foreground truncate">{command.subtitle}</div>
            )}
          </div>

          {command.shortcut && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {command.shortcut.map((key, i) => (
                <kbd key={`${command.id}-shortcut-${i}`} className="kbd">
                  {key}
                </kbd>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({
  hit,
  query,
  isSelected,
  index,
  onClick,
  onMouseEnter,
  onAddToExcerpt,
}: {
  hit: GlobalSearchHit;
  query: string;
  isSelected: boolean;
  index: number;
  onClick: () => void;
  onMouseEnter: () => void;
  onAddToExcerpt: () => void;
}) {
  const categoryInfo = getCategoryInfo(hit.category);
  const canAddToExcerpt =
    (hit.category === "transcript" || hit.category === "quote-bank") &&
    typeof hit.anchor === "string" &&
    /^§\d+$/.test(hit.anchor);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey && canAddToExcerpt) {
        onAddToExcerpt();
        return;
      }
      onClick();
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      data-index={index}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-2.5 sm:py-3 rounded-xl text-left transition-all",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent",
      )}
      style={{
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center size-9 sm:size-10 rounded-lg",
          getCategoryBgClass(hit.category, hit.model),
        )}
      >
        <CategoryIcon
          category={hit.category}
          className={cn("size-4 sm:size-5", getCategoryTextClass(hit.category, hit.model))}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm sm:text-base text-foreground truncate">
            {hit.title}
          </span>
          {hit.anchor && (
            <span className="flex-shrink-0 text-xs font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
              {hit.anchor}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          <HighlightedText text={hit.snippet} query={query} />
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded",
              getCategoryBadgeClass(hit.category, hit.model),
            )}
          >
            {categoryInfo.label}
          </span>
          {hit.model && <ModelBadge model={hit.model} />}
        </div>
      </div>

      {/* Actions */}
      {canAddToExcerpt && (
        <div className="flex-shrink-0 self-center">
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center size-8 rounded-lg",
              "text-muted-foreground hover:text-primary hover:bg-primary/10 active:bg-primary/20 active:scale-95",
              "transition-all touch-manipulation",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToExcerpt();
            }}
            aria-label="Add to excerpt basket"
            title="Add to excerpt basket"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}

      {/* Arrow */}
      <div
        className={cn(
          "flex-shrink-0 self-center transition-transform",
          isSelected ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
        )}
      >
        <ArrowRight className="size-4 text-primary" />
      </div>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (terms.length === 0) return <>{text}</>;
  const regex = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = terms.some((t) => part.toLowerCase() === t);
        return isMatch ? (
          <mark
            key={i}
            className="bg-transparent text-primary font-medium border-b border-primary/50"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ModelBadge({ model }: { model: "gpt" | "opus" | "gemini" }) {
  const config = {
    gpt: { label: "GPT", class: "bg-gpt/10 text-gpt border-gpt/20" },
    opus: { label: "Opus", class: "bg-opus/10 text-opus border-opus/20" },
    gemini: { label: "Gemini", class: "bg-gemini/10 text-gemini border-gemini/20" },
  };

  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded border",
        config[model].class,
      )}
    >
      {config[model].label}
    </span>
  );
}

function SearchResultSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="size-10 rounded-lg animate-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded animate-shimmer" />
        <div className="h-3 w-full rounded animate-shimmer" />
        <div className="h-3 w-3/4 rounded animate-shimmer" />
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="px-6 py-12 sm:py-16 text-center animate-fade-in">
      <div className="inline-flex items-center justify-center size-14 sm:size-16 rounded-2xl bg-muted/50 mb-4">
        <Search className="size-6 sm:size-7 text-muted-foreground" />
      </div>
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-1">No results found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        No matches for &ldquo;<span className="text-foreground font-medium">{query}</span>&rdquo;.
        Try different keywords or check your spelling.
      </p>
    </div>
  );
}

function InitialState({ onSearch }: { onSearch: (text: string) => void }) {
  return (
    <div className="px-6 py-10 sm:py-12 text-center">
      <div className="inline-flex items-center justify-center size-12 sm:size-14 rounded-2xl bg-primary/10 mb-3 sm:mb-4">
        <ScrollText className="size-5 sm:size-6 text-primary" />
      </div>
      <h3 className="text-sm sm:text-base font-medium text-foreground mb-1">
        Search the Brenner Corpus
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-4 sm:mb-6">
        Search across 236 transcript sections, quotes, distillations, and model responses.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <SuggestionChip text="C. elegans" onClick={onSearch} />
        <SuggestionChip text="molecular biology" onClick={onSearch} />
        <SuggestionChip text="Sydney Brenner" onClick={onSearch} />
        <SuggestionChip text="genetics" onClick={onSearch} />
      </div>
    </div>
  );
}

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95 transition-all touch-manipulation"
    >
      <Search className="size-3" />
      {text}
    </button>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  switch (category) {
    case "transcript":
      return <ScrollText className={className} />;
    case "quote-bank":
      return <Quote className={className} />;
    case "distillation":
      return <Sparkles className={className} />;
    case "metaprompt":
      return <Terminal className={className} />;
    case "raw-response":
      return <FileText className={className} />;
    default:
      return <FileText className={className} />;
  }
}

function getCategoryBgClass(category: string, model?: string): string {
  if (model) {
    switch (model) {
      case "gpt":
        return "bg-gpt/10";
      case "opus":
        return "bg-opus/10";
      case "gemini":
        return "bg-gemini/10";
    }
  }

  switch (category) {
    case "transcript":
      return "bg-primary/10";
    case "quote-bank":
      return "bg-amber-500/10";
    case "distillation":
      return "bg-purple-500/10";
    case "metaprompt":
      return "bg-emerald-500/10";
    case "raw-response":
      return "bg-slate-500/10";
    default:
      return "bg-muted";
  }
}

function getCategoryTextClass(category: string, model?: string): string {
  if (model) {
    switch (model) {
      case "gpt":
        return "text-gpt";
      case "opus":
        return "text-opus";
      case "gemini":
        return "text-gemini";
    }
  }

  switch (category) {
    case "transcript":
      return "text-primary";
    case "quote-bank":
      return "text-amber-500";
    case "distillation":
      return "text-purple-500";
    case "metaprompt":
      return "text-emerald-500";
    case "raw-response":
      return "text-slate-500";
    default:
      return "text-muted-foreground";
  }
}

function getCategoryBadgeClass(category: string, model?: string): string {
  if (model) {
    switch (model) {
      case "gpt":
        return "bg-gpt/10 text-gpt";
      case "opus":
        return "bg-opus/10 text-opus";
      case "gemini":
        return "bg-gemini/10 text-gemini";
    }
  }

  switch (category) {
    case "transcript":
      return "bg-primary/10 text-primary";
    case "quote-bank":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "distillation":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "metaprompt":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "raw-response":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ============================================================================
// Provider Component
// ============================================================================

const KEYBOARD_SHORTCUTS_ENABLED_KEY = "brenner.keyboard.shortcuts.enabled";
const KEYBOARD_VIM_MODE_KEY = "brenner.keyboard.shortcuts.vim";

const GLOBAL_NAV_SEQUENCE_TIMEOUT_MS = 900;

const SESSION_NAV_ORDER = [
  "overview",
  "hypothesis",
  "operators",
  "test-queue",
  "agents",
  "evidence",
  "brief",
] as const;

type SessionNavLocation = (typeof SESSION_NAV_ORDER)[number];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function parseSessionNavContext(
  pathname: string,
): { sessionId: string; location: SessionNavLocation } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "sessions") return null;

  const sessionId = parts[1];
  if (!sessionId || sessionId === "new") return null;

  const segment = parts[2];
  const location: SessionNavLocation =
    segment === "hypothesis"
      ? "hypothesis"
      : segment === "operators"
        ? "operators"
        : segment === "test-queue"
          ? "test-queue"
          : segment === "agents"
            ? "agents"
            : segment === "evidence"
              ? "evidence"
              : segment === "brief"
                ? "brief"
                : "overview";

  return { sessionId, location };
}

function buildSessionNavHref(sessionId: string, location: SessionNavLocation): string {
  const base = `/sessions/${sessionId}`;
  switch (location) {
    case "hypothesis":
      return `${base}/hypothesis`;
    case "operators":
      return `${base}/operators`;
    case "test-queue":
      return `${base}/test-queue`;
    case "agents":
      return `${base}/agents`;
    case "evidence":
      return `${base}/evidence`;
    case "brief":
      return `${base}/brief`;
    case "overview":
    default:
      return base;
  }
}

interface SearchContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  keyboardShortcutsEnabled: boolean;
  vimMode: boolean;
  toggleKeyboardShortcuts: () => void;
  toggleVimMode: () => void;
}

const SearchContext = React.createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = React.useState(false);
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = React.useState(true);
  const [vimMode, setVimMode] = React.useState(false);

  const globalNavRef = React.useRef<{ leader: "g" | null; startedAt: number }>({
    leader: null,
    startedAt: 0,
  });

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);
  const toggleKeyboardShortcuts = React.useCallback(
    () => setKeyboardShortcutsEnabled((prev) => !prev),
    [],
  );
  const toggleVimMode = React.useCallback(() => setVimMode((prev) => !prev), []);

  // Load prefs (localStorage is source of truth)
  React.useEffect(() => {
    try {
      const rawEnabled = localStorage.getItem(KEYBOARD_SHORTCUTS_ENABLED_KEY);
      if (rawEnabled !== null) {
        setKeyboardShortcutsEnabled(rawEnabled === "1" || rawEnabled === "true");
      }
      const rawVim = localStorage.getItem(KEYBOARD_VIM_MODE_KEY);
      if (rawVim !== null) {
        setVimMode(rawVim === "1" || rawVim === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(KEYBOARD_SHORTCUTS_ENABLED_KEY, keyboardShortcutsEnabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [keyboardShortcutsEnabled]);

  React.useEffect(() => {
    try {
      localStorage.setItem(KEYBOARD_VIM_MODE_KEY, vimMode ? "1" : "0");
    } catch {
      // ignore
    }
  }, [vimMode]);

  // Global keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
        return;
      }

      if (isOpen) return;
      if (!keyboardShortcutsEnabled) return;
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const session = parseSessionNavContext(pathname);
      if (session) {
        if (vimMode && e.key === "G") {
          e.preventDefault();
          router.push(
            buildSessionNavHref(
              session.sessionId,
              SESSION_NAV_ORDER[SESSION_NAV_ORDER.length - 1]!,
            ),
          );
          return;
        }

        const idx = SESSION_NAV_ORDER.indexOf(session.location);
        if (idx !== -1) {
          const goByDelta = (delta: number) => {
            const nextIndex = idx + delta;
            const nextLoc = SESSION_NAV_ORDER[nextIndex];
            if (!nextLoc) return;
            router.push(buildSessionNavHref(session.sessionId, nextLoc));
          };

          if (e.key === "]") {
            e.preventDefault();
            goByDelta(1);
            return;
          }

          if (e.key === "[") {
            e.preventDefault();
            goByDelta(-1);
            return;
          }

          const lower = e.key.toLowerCase();
          if (vimMode && lower === "j") {
            e.preventDefault();
            goByDelta(1);
            return;
          }

          if (vimMode && lower === "k") {
            e.preventDefault();
            goByDelta(-1);
            return;
          }
        }
      }

      // GitHub-style: g then key = jump
      const now = Date.now();
      const state = globalNavRef.current;
      if (state.leader && now - state.startedAt > GLOBAL_NAV_SEQUENCE_TIMEOUT_MS) {
        state.leader = null;
        state.startedAt = 0;
      }

      const key = e.key.toLowerCase();
      if (!state.leader) {
        if (key === "g") {
          e.preventDefault();
          state.leader = "g";
          state.startedAt = now;
        }
        return;
      }

      // leader === "g"
      state.leader = null;
      state.startedAt = 0;

      if (key === "g" && session && vimMode) {
        e.preventDefault();
        router.push(buildSessionNavHref(session.sessionId, SESSION_NAV_ORDER[0]));
        return;
      }

      const href =
        key === "h"
          ? "/"
          : key === "c"
            ? "/corpus"
            : key === "d"
              ? "/distillations"
              : key === "m"
                ? "/method"
                : key === "o"
                  ? "/operators"
                  : key === "s"
                    ? "/sessions"
                    : null;

      if (href) {
        e.preventDefault();
        router.push(href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle, isOpen, keyboardShortcutsEnabled, vimMode, router, pathname]);

  return (
    <SearchContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        keyboardShortcutsEnabled,
        vimMode,
        toggleKeyboardShortcuts,
        toggleVimMode,
      }}
    >
      {children}
      <SpotlightSearch
        isOpen={isOpen}
        onClose={close}
        keyboardShortcutsEnabled={keyboardShortcutsEnabled}
        vimMode={vimMode}
        onToggleKeyboardShortcuts={toggleKeyboardShortcuts}
        onToggleVimMode={toggleVimMode}
      />
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = React.useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}

// ============================================================================
// Search Trigger Button
// ============================================================================

export function SearchTrigger({ className }: { className?: string }) {
  const { open } = useSearch();

  return (
    <button
      onClick={open}
      aria-label="Open search"
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "border border-border bg-muted/50 hover:bg-muted transition-all",
        "text-sm text-muted-foreground hover:text-foreground",
        "touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search...</span>
      <div className="hidden sm:flex items-center gap-0.5 ml-2">
        <kbd className="kbd">
          <Command className="size-3" />
        </kbd>
        <kbd className="kbd">K</kbd>
      </div>
    </button>
  );
}
