"use client";

/**
 * Tutorial Layout
 *
 * Responsive layout for all tutorial pages with:
 * - Desktop (>=1024px): Sidebar with full progress list
 * - Tablet (768-1023px): Collapsed icon sidebar
 * - Mobile (<768px): Header progress bar
 *
 * @see brenner_bot-e521 (Tutorial Layout)
 */

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { SidebarProgress } from "@/components/tutorial";
import { TutorialProvider, useTutorialOptional } from "@/lib/tutorial-context";
import type { TutorialPathId, TutorialStepMeta } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// Path Configuration
// ============================================================================

interface PathConfig {
  id: TutorialPathId;
  title: string;
  shortTitle: string;
  steps: TutorialStepMeta[];
  accent: string;
}

const PATH_CONFIGS: Record<string, PathConfig> = {
  "quick-start": {
    id: "quick-start",
    title: "Quick Start",
    shortTitle: "Quick Start",
    accent: "oklch(0.72 0.19 145)",
    steps: [
      // Step 1: Mobile-friendly (reading/understanding)
      {
        id: "qs-1",
        stepNumber: 1,
        title: "What Is This?",
        estimatedTime: "~3 min",
        completed: false,
      },
      // Step 2-6: Desktop required (terminal commands)
      {
        id: "qs-2",
        stepNumber: 2,
        title: "Prerequisites",
        estimatedTime: "~2 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Review the prerequisites to prepare your desktop",
      },
      {
        id: "qs-3",
        stepNumber: 3,
        title: "Clone & Install",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Run git clone and bun install on your desktop",
      },
      {
        id: "qs-4",
        stepNumber: 4,
        title: "Search the Corpus",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Run brenner search commands in your terminal",
      },
      {
        id: "qs-5",
        stepNumber: 5,
        title: "Build an Excerpt",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Create an excerpt file using the CLI",
      },
      {
        id: "qs-6",
        stepNumber: 6,
        title: "Your First Session",
        estimatedTime: "~8 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Run your first brenner session in the terminal",
      },
      // Step 7: Mobile-friendly (reading output)
      {
        id: "qs-7",
        stepNumber: 7,
        title: "Understand the Output",
        estimatedTime: "~5 min",
        completed: false,
      },
    ],
  },
  "agent-assisted": {
    id: "agent-assisted",
    title: "Agent-Assisted Research",
    shortTitle: "Agent-Assisted",
    accent: "oklch(0.65 0.2 250)",
    steps: [
      // Step 1: Mobile-friendly (reading/understanding)
      {
        id: "aa-1",
        stepNumber: 1,
        title: "Why Agent-Assisted?",
        estimatedTime: "~3 min",
        completed: false,
      },
      // Steps 2-7: Desktop required (agent execution)
      {
        id: "aa-2",
        stepNumber: 2,
        title: "Prerequisites",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Ensure Claude Code or Codex CLI is installed",
      },
      {
        id: "aa-3",
        stepNumber: 3,
        title: "Clone into Agent Context",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Clone the repo within your AI agent session",
      },
      {
        id: "aa-4",
        stepNumber: 4,
        title: "Agent Studies the System",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Have your agent explore the codebase",
      },
      {
        id: "aa-5",
        stepNumber: 5,
        title: "Define Your Research Problem",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Provide your hypothesis to the agent",
      },
      {
        id: "aa-6",
        stepNumber: 6,
        title: "Agent Builds the Inputs",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Agent creates excerpts and session config",
      },
      {
        id: "aa-7",
        stepNumber: 7,
        title: "Agent Runs the Brenner Loop",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Agent executes the protocol loop",
      },
      // Step 8: Mobile-friendly (human review)
      {
        id: "aa-8",
        stepNumber: 8,
        title: "Human Review",
        estimatedTime: "~5 min",
        completed: false,
      },
    ],
  },
  "multi-agent": {
    id: "multi-agent-cockpit",
    title: "Multi-Agent Cockpit",
    shortTitle: "Multi-Agent",
    accent: "oklch(0.7 0.15 30)",
    steps: [
      // All multi-agent steps require desktop (infrastructure setup)
      {
        id: "ma-1",
        stepNumber: 1,
        title: "Cockpit Overview",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Understand the multi-agent architecture",
      },
      {
        id: "ma-2",
        stepNumber: 2,
        title: "Agent Mail Setup",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Configure Agent Mail MCP server",
      },
      {
        id: "ma-3",
        stepNumber: 3,
        title: "Register Agents",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Register agents with the mail system",
      },
      {
        id: "ma-4",
        stepNumber: 4,
        title: "Define Roles",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Assign roles to each agent",
      },
      {
        id: "ma-5",
        stepNumber: 5,
        title: "Coordinate Research",
        estimatedTime: "~15 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Orchestrate agent collaboration",
      },
      {
        id: "ma-6",
        stepNumber: 6,
        title: "Handle Disagreements",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Resolve agent conflicts",
      },
      {
        id: "ma-7",
        stepNumber: 7,
        title: "Synthesize Results",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Combine agent outputs",
      },
      {
        id: "ma-8",
        stepNumber: 8,
        title: "File Reservations",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Manage file locks between agents",
      },
      {
        id: "ma-9",
        stepNumber: 9,
        title: "Best Practices",
        estimatedTime: "~5 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Learn multi-agent best practices",
      },
      {
        id: "ma-10",
        stepNumber: 10,
        title: "Advanced Patterns",
        estimatedTime: "~10 min",
        completed: false,
        requiresDesktop: true,
        mobileAlternative: "Explore advanced orchestration",
      },
    ],
  },
};

// ============================================================================
// Helper Hooks
// ============================================================================

function useCurrentPath(): PathConfig | null {
  const pathname = usePathname();

  // Extract path segment from URL
  // /tutorial/quick-start -> quick-start
  // /tutorial/quick-start/step/1 -> quick-start
  const match = pathname.match(/\/tutorial\/([^/]+)/);
  const pathSegment = match?.[1];

  if (!pathSegment || pathSegment === "tutorial") return null;

  return PATH_CONFIGS[pathSegment] || null;
}

function useIsStepPage(): boolean {
  const pathname = usePathname();
  // Match both /step/N and /N patterns for step pages
  // Examples: /tutorial/quick-start/step/1, /tutorial/quick-start/1
  return pathname.includes("/step/") || /\/tutorial\/[^/]+\/\d+$/.test(pathname);
}

// ============================================================================
// Sidebar Component
// ============================================================================

interface SidebarProps {
  config: PathConfig;
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (index: number) => void;
  collapsed?: boolean;
}

function Sidebar({
  config,
  currentStep,
  completedSteps,
  onStepClick,
  collapsed = false,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 z-40",
        "border-r border-border bg-card/95 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-72",
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <Link
            href="/tutorial"
            className={cn(
              "group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
              collapsed && "justify-center",
            )}
          >
            <ChevronLeftIcon className="group-hover:-translate-x-0.5 transition-transform" />
            {!collapsed && <span>Back to Tutorial</span>}
          </Link>
        </div>

        {/* Progress */}
        <div className="flex-1 overflow-y-auto p-4">
          {collapsed ? (
            // Collapsed: Show dots only
            <div className="flex flex-col items-center gap-3">
              {config.steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStep;
                return (
                  <button
                    key={step.id}
                    onClick={() => onStepClick?.(index)}
                    className={cn(
                      "size-3 rounded-full transition-all",
                      isCompleted && "bg-primary",
                      isCurrent &&
                        !isCompleted &&
                        "bg-primary/60 ring-2 ring-primary ring-offset-2 ring-offset-card",
                      !isCurrent && !isCompleted && "bg-muted-foreground/30",
                    )}
                    aria-label={`Step ${step.stepNumber}: ${step.title}`}
                  />
                );
              })}
            </div>
          ) : (
            // Expanded: Full progress list
            <SidebarProgress
              steps={config.steps.map((s, i) => ({
                ...s,
                completed: completedSteps.includes(i),
              }))}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={onStepClick}
              allowJumpAhead={false}
            />
          )}
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{config.shortTitle}</span>
              <span className="mx-1.5">·</span>
              <span>
                {completedSteps.length} of {config.steps.length} complete
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ============================================================================
// Mobile Header
// ============================================================================

interface MobileHeaderProps {
  config: PathConfig;
  currentStep: number;
  totalSteps: number;
  onMenuClick: () => void;
}

function MobileHeader({ config, currentStep, totalSteps, onMenuClick }: MobileHeaderProps) {
  // Note: This component is wrapped with md:hidden in parent, so no responsive hiding needed here
  return (
    <div className="fixed top-16 left-0 right-0 z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm">
        <button onClick={onMenuClick} className="flex items-center gap-2 text-sm font-medium">
          <MenuIcon />
          <span>{config.shortTitle}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Mobile Menu Overlay
// ============================================================================

interface MobileMenuProps {
  config: PathConfig;
  currentStep: number;
  completedSteps: number[];
  onStepClick: (index: number) => void;
  onClose: () => void;
}

function MobileMenu({
  config,
  currentStep,
  completedSteps,
  onStepClick,
  onClose,
}: MobileMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 lg:hidden"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Menu panel */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border shadow-2xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link
              href="/tutorial"
              className="text-sm font-medium hover:text-primary transition-colors"
              onClick={onClose}
            >
              <ChevronLeftIcon className="inline mr-1" />
              All Tutorials
            </Link>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <XIcon />
            </button>
          </div>

          {/* Title */}
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold">{config.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedSteps.length} of {config.steps.length} steps complete
            </p>
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto p-4">
            <SidebarProgress
              steps={config.steps.map((s, i) => ({
                ...s,
                completed: completedSteps.includes(i),
              }))}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={(index) => {
                onStepClick(index);
                onClose();
              }}
              allowJumpAhead={false}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Layout Content (Uses Context)
// ============================================================================

function TutorialLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathConfig = useCurrentPath();
  const isStepPage = useIsStepPage();
  const tutorial = useTutorialOptional();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Get current step and completed steps from context or defaults
  const currentStep = tutorial?.currentStep ?? 0;
  const completedSteps = tutorial?.completedSteps ?? [];

  // Handle step navigation
  const handleStepClick = React.useCallback(
    (index: number) => {
      if (tutorial) {
        tutorial.goToStep(index);
      }
      // In the future, navigate to step page
      // router.push(`/tutorial/${pathConfig.id}/step/${index + 1}`);
    },
    [tutorial],
  );

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Tablet breakpoint detection for sidebar collapse
  React.useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      setSidebarCollapsed(width >= 768 && width < 1024);
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // If not on a path page, just render children
  if (!pathConfig) {
    return <>{children}</>;
  }

  // If on landing page (not step page), render without progress UI
  if (!isStepPage) {
    return (
      <main className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">{children}</div>
      </main>
    );
  }

  // Full layout with sidebar/header for step pages
  return (
    <>
      {/* Desktop/Tablet Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          config={pathConfig}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader
          config={pathConfig}
          currentStep={currentStep}
          totalSteps={pathConfig.steps.length}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenu
            config={pathConfig}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            onClose={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          // Tablet: collapsed sidebar (16px), Desktop: full sidebar (72rem = 288px)
          "md:pl-16 lg:pl-72",
          // Mobile: header offset, Tablet+: no offset (sidebar handles spacing)
          "pt-[60px] md:pt-0",
        )}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">{children}</div>
      </main>
    </>
  );
}

// ============================================================================
// Main Layout Export
// ============================================================================

export default function TutorialLayout({ children }: { children: React.ReactNode }) {
  return (
    <TutorialProvider>
      <TutorialLayoutContent>{children}</TutorialLayoutContent>
    </TutorialProvider>
  );
}
