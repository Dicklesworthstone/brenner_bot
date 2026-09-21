"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toggleThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Icons
const SearchIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const HomeIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

const BookIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const BeakerIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
    />
  </svg>
);

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string[];
  action: () => void;
  section: string;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggleTheme = React.useCallback(() => {
    toggleThemePreference();
  }, []);

  const commands: CommandItem[] = React.useMemo(
    () => [
      {
        id: "home",
        title: "Go to Home",
        icon: <HomeIcon />,
        shortcut: ["G", "H"],
        action: () => router.push("/"),
        section: "Navigation",
      },
      {
        id: "corpus",
        title: "Go to Corpus",
        subtitle: "Browse all documents",
        icon: <BookIcon />,
        shortcut: ["G", "C"],
        action: () => router.push("/corpus"),
        section: "Navigation",
      },
      {
        id: "distillations",
        title: "Go to Distillations",
        subtitle: "Compare model analyses",
        icon: <SparklesIcon />,
        shortcut: ["G", "D"],
        action: () => router.push("/distillations"),
        section: "Navigation",
      },
      {
        id: "method",
        title: "Go to Method",
        subtitle: "Learn the Brenner Loop",
        icon: <BeakerIcon />,
        shortcut: ["G", "M"],
        action: () => router.push("/method"),
        section: "Navigation",
      },
      {
        id: "transcript",
        title: "Read Full Transcript",
        subtitle: "Web of Stories interview",
        icon: <DocumentIcon />,
        action: () => router.push("/corpus/transcript"),
        section: "Documents",
      },
      {
        id: "quote-bank",
        title: "Browse Quote Bank",
        subtitle: "Curated Brenner quotes",
        icon: <DocumentIcon />,
        action: () => router.push("/corpus/quote-bank"),
        section: "Documents",
      },
      {
        id: "opus",
        title: "Opus 4.5 Distillation",
        subtitle: "Two Axioms Framework",
        icon: <SparklesIcon />,
        action: () => router.push("/corpus/distillation-opus-45"),
        section: "Documents",
      },
      {
        id: "gpt",
        title: "GPT-5.2 Distillation",
        subtitle: "Optimization Lens",
        icon: <SparklesIcon />,
        action: () => router.push("/corpus/distillation-gpt-52"),
        section: "Documents",
      },
      {
        id: "gemini",
        title: "Gemini 3 Distillation",
        subtitle: "Minimal Kernel",
        icon: <SparklesIcon />,
        action: () => router.push("/corpus/distillation-gemini-3"),
        section: "Documents",
      },
      {
        id: "toggle-theme",
        title: "Toggle Theme",
        subtitle: "Switch between light and dark mode",
        icon: <MoonIcon />,
        shortcut: ["T"],
        action: toggleTheme,
        section: "Actions",
      },
    ],
    [router, toggleTheme],
  );

  const filteredCommands = React.useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.subtitle?.toLowerCase().includes(lowerQuery) ||
        cmd.section.toLowerCase().includes(lowerQuery),
    );
  }, [commands, query]);

  // Group commands by section
  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.section]) {
        groups[cmd.section] = [];
      }
      groups[cmd.section].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = React.useMemo(() => filteredCommands, [filteredCommands]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd+/ or Ctrl+/ (navigation palette)
      // Note: Cmd+K is reserved for SpotlightSearch (corpus search)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!open) return;

      // Close on Escape
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setSelectedIndex(0);
        return;
      }

      // Navigate with arrow keys
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (flatCommands.length === 0) return;
        setSelectedIndex((prev) => (prev < flatCommands.length - 1 ? prev + 1 : 0));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (flatCommands.length === 0) return;
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatCommands.length - 1));
        return;
      }

      // Execute on Enter
      if (e.key === "Enter" && flatCommands[selectedIndex]) {
        e.preventDefault();
        flatCommands[selectedIndex].action();
        setOpen(false);
        setQuery("");
        setSelectedIndex(0);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, flatCommands, selectedIndex]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Reset selection when query changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="command-palette-backdrop"
        onClick={() => {
          setOpen(false);
          setQuery("");
        }}
      />

      {/* Palette */}
      <div className="command-palette">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <SearchIcon />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="command-palette-input pl-12"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <kbd className="command-palette-kbd">Esc</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="command-palette-results">
          {Object.entries(groupedCommands).map(([section, items]) => (
            <div key={section}>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section}
              </div>
              {items.map((item) => {
                const index = flatCommands.findIndex((c) => c.id === item.id);
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    className={cn(
                      "command-palette-item w-full text-left touch-manipulation active:scale-[0.98] transition-transform",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      isSelected && "bg-muted",
                    )}
                    onClick={() => {
                      item.action();
                      setOpen(false);
                      setQuery("");
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="command-palette-item-icon">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="command-palette-item-title">{item.title}</div>
                      {item.subtitle && (
                        <div className="command-palette-item-subtitle truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div className="command-palette-shortcut">
                        {item.shortcut.map((key, i) => (
                          <React.Fragment key={i}>
                            <kbd className="command-palette-kbd">{key}</kbd>
                            {i < (item.shortcut?.length ?? 0) - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {flatCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p>No commands found.</p>
              <p className="text-sm mt-1">Try a different search term.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="command-palette-kbd">↑</kbd>
              <kbd className="command-palette-kbd">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="command-palette-kbd">↵</kbd>
              <span className="ml-1">Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="command-palette-kbd">⌘</kbd>
            <kbd className="command-palette-kbd">/</kbd>
            <span className="ml-1">to toggle</span>
          </span>
        </div>
      </div>
    </>
  );
}

// Keyboard hint component to show in the header
export function CommandPaletteHint() {
  return (
    <button
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", metaKey: true }));
      }}
    >
      <SearchIcon />
      <span>Search...</span>
      <div className="flex items-center gap-0.5">
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background rounded border border-border">
          ⌘
        </kbd>
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background rounded border border-border">
          /
        </kbd>
      </div>
    </button>
  );
}
