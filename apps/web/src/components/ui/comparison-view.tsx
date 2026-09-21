"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function SparkleIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  );
}

interface ComparisonPane {
  id: string;
  title: string;
  icon?: React.ReactNode;
  color?: string;
  content: React.ReactNode;
}

interface ComparisonViewProps {
  panes: ComparisonPane[];
  className?: string;
  syncScroll?: boolean;
}

export function ComparisonView({ panes, className, syncScroll = true }: ComparisonViewProps) {
  const [syncing, setSyncing] = React.useState(false);
  const contentRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const isScrolling = React.useRef(false);

  // Sync scroll between panes
  React.useEffect(() => {
    if (!syncScroll || panes.length < 2) return;

    const handleScroll = (sourceIndex: number) => (e: Event) => {
      if (isScrolling.current) return;

      const source = e.target as HTMLDivElement;
      const sourceScrollableHeight = source.scrollHeight - source.clientHeight;

      // Avoid division by zero when content doesn't overflow
      if (sourceScrollableHeight <= 0) return;

      const scrollRatio = source.scrollTop / sourceScrollableHeight;

      isScrolling.current = true;
      setSyncing(true);

      contentRefs.current.forEach((ref, index) => {
        if (ref && index !== sourceIndex) {
          const targetScrollableHeight = ref.scrollHeight - ref.clientHeight;
          if (targetScrollableHeight > 0) {
            const targetScrollTop = scrollRatio * targetScrollableHeight;
            ref.scrollTop = targetScrollTop;
          }
        }
      });

      setTimeout(() => {
        isScrolling.current = false;
      }, 50);

      setTimeout(() => {
        setSyncing(false);
      }, 500);
    };

    const refs = contentRefs.current;
    const handlers = refs.map((ref, index) => {
      if (ref) {
        const handler = handleScroll(index);
        ref.addEventListener("scroll", handler, { passive: true });
        return { ref, handler };
      }
      return null;
    });

    return () => {
      handlers.forEach((item) => {
        if (item) {
          item.ref.removeEventListener("scroll", item.handler);
        }
      });
    };
  }, [syncScroll, panes.length]);

  if (panes.length === 0) return null;

  return (
    <div className={cn("comparison-container", className)}>
      {panes.map((pane, index) => (
        <div key={pane.id} className="comparison-pane">
          {/* Header */}
          <div
            className="comparison-header"
            style={pane.color ? ({ "--pane-color": pane.color } as React.CSSProperties) : undefined}
          >
            {pane.icon && <span className="size-5 text-muted-foreground">{pane.icon}</span>}
            <h3 className="font-semibold">{pane.title}</h3>
            {pane.color && (
              <span className="ml-auto size-3 rounded-full" style={{ background: pane.color }} />
            )}
          </div>

          {/* Content */}
          <div
            ref={(el) => {
              contentRefs.current[index] = el;
            }}
            className="comparison-content prose prose-sm"
          >
            {pane.content}
          </div>
        </div>
      ))}

      {/* Sync indicator */}
      {syncScroll && (
        <div className={cn("comparison-sync-indicator", syncing && "visible")}>Syncing scroll</div>
      )}
    </div>
  );
}

// Model badge component for distillation headers
export function ModelBadge({
  model,
  className,
}: {
  model: "opus" | "gpt" | "gemini";
  className?: string;
}) {
  const config = {
    opus: {
      label: "Opus 4.5",
      className: "model-badge-opus",
    },
    gpt: {
      label: "GPT-5.2",
      className: "model-badge-gpt",
    },
    gemini: {
      label: "Gemini 3",
      className: "model-badge-gemini",
    },
  };

  const { label, className: badgeClass } = config[model];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        badgeClass,
        className,
      )}
    >
      {label}
    </span>
  );
}

// Side-by-side two column comparison
export function TwoColumnComparison({
  left,
  right,
  className,
}: {
  left: { title: string; content: React.ReactNode; color?: string };
  right: { title: string; content: React.ReactNode; color?: string };
  className?: string;
}) {
  return (
    <ComparisonView
      panes={[
        {
          id: "left",
          title: left.title,
          content: left.content,
          color: left.color,
        },
        {
          id: "right",
          title: right.title,
          content: right.content,
          color: right.color,
        },
      ]}
      className={className}
      syncScroll={true}
    />
  );
}

// Three-model comparison for all distillations
export function ThreeModelComparison({
  opus,
  gpt,
  gemini,
  className,
}: {
  opus: React.ReactNode;
  gpt: React.ReactNode;
  gemini: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <ComparisonView
        panes={[
          {
            id: "opus",
            title: "Opus 4.5",
            icon: <SparkleIcon />,
            color: "oklch(0.72 0.14 45)",
            content: opus,
          },
          {
            id: "gpt",
            title: "GPT-5.2",
            icon: <SparkleIcon />,
            color: "oklch(0.62 0.16 145)",
            content: gpt,
          },
        ]}
        syncScroll={true}
      />
      <div className="comparison-pane max-w-full">
        <div
          className="comparison-header"
          style={{ "--pane-color": "oklch(0.58 0.19 195)" } as React.CSSProperties}
        >
          <SparkleIcon />
          <h3 className="font-semibold">Gemini 3</h3>
          <span
            className="ml-auto size-3 rounded-full"
            style={{ background: "oklch(0.58 0.19 195)" }}
          />
        </div>
        <div className="comparison-content prose prose-sm">{gemini}</div>
      </div>
    </div>
  );
}
