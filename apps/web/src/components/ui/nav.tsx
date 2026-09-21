"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useOfflineQueue } from "@/lib/offline";
import { useThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Icons
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
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
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

const GlossaryIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const SessionsIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.07a1.125 1.125 0 01-1.135 1.416H3.933a1.125 1.125 0 01-1.135-1.416L5 14.5"
    />
  </svg>
);

const TranscriptIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm-3 9.75h6m-6 3h3"
    />
  </svg>
);

const OperatorsIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 3.75H5.25A1.5 1.5 0 003.75 5.25V9A1.5 1.5 0 005.25 10.5H9A1.5 1.5 0 0010.5 9V5.25A1.5 1.5 0 009 3.75zM18.75 3.75H15A1.5 1.5 0 0013.5 5.25V9A1.5 1.5 0 0015 10.5h3.75A1.5 1.5 0 0020.25 9V5.25a1.5 1.5 0 00-1.5-1.5zM9 13.5H5.25a1.5 1.5 0 00-1.5 1.5v3.75a1.5 1.5 0 001.5 1.5H9a1.5 1.5 0 001.5-1.5V15a1.5 1.5 0 00-1.5-1.5zM18.75 13.5H15a1.5 1.5 0 00-1.5 1.5v3.75a1.5 1.5 0 001.5 1.5h3.75a1.5 1.5 0 001.5-1.5V15a1.5 1.5 0 00-1.5-1.5z"
    />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: <HomeIcon /> },
  { href: "/corpus/transcript", label: "Transcript", icon: <TranscriptIcon /> },
  { href: "/corpus", label: "Corpus", icon: <BookIcon /> },
  { href: "/operators", label: "Operators", icon: <OperatorsIcon /> },
  { href: "/distillations", label: "Distillations", icon: <SparklesIcon /> },
  { href: "/glossary", label: "Glossary", icon: <GlossaryIcon /> },
  { href: "/method", label: "Method", icon: <BeakerIcon /> },
  { href: "/sessions", label: "Sessions", icon: <SessionsIcon /> },
];

// Helper to check if nav item is active (handles nested routes like /corpus vs /corpus/transcript)
function isNavItemActive(pathname: string, itemHref: string): boolean {
  if (pathname === itemHref) return true;
  if (pathname.startsWith(`${itemHref}/`)) {
    // Check if another nav item is a more specific match
    const moreSpecificMatch = NAV_ITEMS.some(
      (other) =>
        other.href !== itemHref &&
        other.href.startsWith(`${itemHref}/`) &&
        (pathname === other.href || pathname.startsWith(`${other.href}/`)),
    );
    return !moreSpecificMatch;
  }
  return false;
}

// Desktop Header Navigation with animated indicator
export function HeaderNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("hidden lg:flex items-center gap-1", className)}>
      {NAV_ITEMS.slice(1).map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {item.label}
            {isActive && (
              <motion.span
                layoutId="nav-indicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Mobile Bottom Navigation with sliding indicator
export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const navRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });

  // iOS Safari visual viewport fix - adjusts for address bar animation
  // Only runs on iOS Safari where the dynamic address bar causes fixed elements to detach
  React.useEffect(() => {
    // Detect iOS Safari specifically - we don't want this running on desktop browsers
    // where it could cause issues with zoom or on Android which handles this differently
    const isIOSSafari =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window);

    if (!isIOSSafari) return;

    const nav = containerRef.current;
    const vv = window.visualViewport;
    if (!vv || !nav) return;

    let ticking = false;
    const updatePosition = () => {
      // Calculate offset between layout viewport and visual viewport
      // This compensates for iOS Safari's address bar collapsing/expanding
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      nav.style.bottom = `${offset}px`;
      ticking = false;
    };

    const handleViewportChange = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updatePosition);
      }
    };

    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);
    updatePosition(); // Initial position

    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
      // Reset to CSS default on cleanup
      nav.style.bottom = "";
    };
  }, []);

  // Calculate active index
  const activeIndex = React.useMemo(() => {
    return NAV_ITEMS.findIndex((item) => isNavItemActive(pathname, item.href));
  }, [pathname]);

  // Update indicator position when active index changes
  React.useEffect(() => {
    if (!navRef.current || activeIndex < 0) return;

    const navElement = navRef.current;
    const items = navElement.querySelectorAll<HTMLAnchorElement>("[data-nav-item]");
    const activeItem = items[activeIndex];

    if (activeItem) {
      const navRect = navElement.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      setIndicatorStyle({
        left: itemRect.left - navRect.left + itemRect.width / 2 - 12, // Center 24px indicator
        width: 24,
      });
    }
  }, [activeIndex]);

  return (
    <nav ref={containerRef} className={cn("bottom-nav lg:hidden", className)}>
      <div ref={navRef} className="relative flex items-center justify-around h-16">
        {/* Sliding indicator */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-1.5 h-1 rounded-full bg-primary"
            initial={false}
            animate={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 35,
              mass: 1,
            }}
          />
        )}

        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-nav-item
              className="bottom-nav-item touch-target"
              data-active={isActive}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {item.icon}
              </motion.div>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Reading Progress Bar
export function ReadingProgress({ className }: { className?: string }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  if (progress === 0) return null;

  return (
    <div
      className={cn("reading-progress", className)}
      style={{ width: `${progress}%` }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    />
  );
}

// Back to Top Button
export function BackToTop({ className }: { className?: string }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const toggleVisible = () => {
      setVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", toggleVisible, { passive: true });
    toggleVisible();

    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      className={cn("back-to-top", visible && "visible", className)}
      aria-label="Back to top"
    >
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}

// Table of Contents with Scroll Spy
export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export function TableOfContents({
  items,
  className,
  title = "On this page",
}: {
  items: TocItem[];
  className?: string;
  title?: string;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible section
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Get the entry closest to the top of the viewport
          const closest = visibleEntries.reduce((prev, curr) => {
            const prevRect = prev.boundingClientRect;
            const currRect = curr.boundingClientRect;
            return Math.abs(prevRect.top) < Math.abs(currRect.top) ? prev : curr;
          });
          setActiveId(closest.target.id);
        }
      },
      {
        rootMargin: "-80px 0% -80% 0%",
        threshold: 0,
      },
    );

    // Observe all headings
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -96; // Offset for fixed header
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className={cn("toc", className)} aria-label="Table of contents">
      <div className="toc-wrapper">
        <h2 className="toc-header">{title}</h2>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item.id)}
                className="toc-item text-left w-full"
                style={{ "--depth": item.level - 1 } as React.CSSProperties}
                data-active={activeId === item.id}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

// Extract headings from content (utility hook)
export function useTableOfContents(contentRef: React.RefObject<HTMLElement | null>) {
  const [items, setItems] = React.useState<TocItem[]>([]);

  React.useEffect(() => {
    if (!contentRef.current) return;

    const headings = contentRef.current.querySelectorAll("h2, h3, h4");
    const tocItems: TocItem[] = [];

    headings.forEach((heading) => {
      if (heading.id) {
        const level = parseInt(heading.tagName[1] ?? "2", 10);
        tocItems.push({
          id: heading.id,
          title: heading.textContent ?? "",
          level,
        });
      }
    });

    setItems(tocItems);
  }, [contentRef]);

  return items;
}

// Theme Toggle
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, mounted, toggleTheme } = useThemePreference();

  if (!mounted) {
    return <div className="size-10" />; // Placeholder to prevent layout shift
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "size-10 rounded-lg flex items-center justify-center",
        "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 active:scale-95",
        "transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <svg
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      ) : (
        <svg
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
      )}
    </button>
  );
}

// Network Status Badge
export function NetworkStatusBadge({ className }: { className?: string }) {
  const { isOnline, queuedCount, isFlushing, flush } = useOfflineQueue();

  if (isOnline && queuedCount === 0) {
    return null;
  }

  const isOffline = !isOnline;
  const badgeLabel = isOffline ? "Offline" : `Queued: ${queuedCount}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
          isOffline
            ? "bg-red-500/15 text-red-700 dark:text-red-400"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        )}
        aria-live="polite"
      >
        {badgeLabel}
      </span>
      {!isOffline && queuedCount > 0 && (
        <button
          type="button"
          onClick={() => void flush()}
          disabled={isFlushing}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            "border border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
            "transition-colors disabled:opacity-60 disabled:pointer-events-none",
          )}
          aria-label="Sync queued actions"
        >
          {isFlushing ? "Syncing..." : "Sync now"}
        </button>
      )}
    </div>
  );
}
