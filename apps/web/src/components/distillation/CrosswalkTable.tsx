"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface CrosswalkCell {
  label: string;
  fullText?: string;
  anchor?: string; // e.g., "axiom-1" to link to /corpus/distillation-opus-45#axiom-1
}

interface CrosswalkRow {
  concept: string;
  opus: CrosswalkCell;
  gpt: CrosswalkCell;
  gemini: CrosswalkCell;
}

// ============================================================================
// DATA
// ============================================================================

const CROSSWALK_DATA: CrosswalkRow[] = [
  {
    concept: "Foundation",
    opus: {
      label: "Two Axioms",
      fullText: "1) Evolution does not optimize; it satisfies. 2) Function precedes mechanism.",
      anchor: "part-i-the-two-axioms",
    },
    gpt: {
      label: "One sentence + objective function",
      fullText:
        "Define the thesis in one sentence, then derive an optimization objective that naturally includes constraints.",
      anchor: "define-the-thesis-one-sentence",
    },
    gemini: {
      label: "Root Access",
      fullText:
        "Begin at the most fundamental level, like Brenner accessing biology from first principles via molecular structure.",
      anchor: "root-access",
    },
  },
  {
    concept: "Operators",
    opus: {
      label: "Operator algebra + compositions",
      fullText:
        "Primitives like SLICE, SCALE, SWITCH that combine following algebraic rules to form complex research moves.",
      anchor: "operators-as-an-algebra",
    },
    gpt: {
      label: "Operator basis + loop + rubric",
      fullText:
        "A set of operator primitives, a loop structure for iteration, and rubrics for evaluation.",
      anchor: "operator-basis",
    },
    gemini: {
      label: "Instruction set",
      fullText: "Brenner primitives as low-level instructions that can be sequenced and composed.",
      anchor: "instruction-set",
    },
  },
  {
    concept: "Execution",
    opus: {
      label: "Brenner Loop",
      fullText:
        "Iterate: Select simplest adequate model organism, define one falsifiable prediction, run minimal discriminative test, update.",
      anchor: "the-brenner-loop",
    },
    gpt: {
      label: "9-step loop + worksheet",
      fullText:
        "A structured 9-step research cycle with worksheets for each phase, from thesis to validation.",
      anchor: "the-9-step-brenner-research-cycle",
    },
    gemini: {
      label: "Debug protocol + scheduler",
      fullText:
        "Treat research as debugging, with a scheduler that manages attention and priorities.",
      anchor: "debug-protocol",
    },
  },
  {
    concept: "Quality",
    opus: {
      label: "Failure modes section",
      fullText:
        "Explicit catalog of common failure modes: technique worship, mechanism fetish, over-engineering.",
      anchor: "failure-modes",
    },
    gpt: {
      label: "12 guardrails",
      fullText:
        "Twelve specific guardrails to prevent methodological drift and maintain research integrity.",
      anchor: "guardrails",
    },
    gemini: {
      label: "Error handling",
      fullText: "Systematic error detection and correction protocols built into the methodology.",
      anchor: "error-handling",
    },
  },
  {
    concept: "Social",
    opus: {
      label: "Conversation as technology",
      fullText:
        "Dialogue as a tool for hypothesis refinement: 'If you can't explain it simply, you don't understand it.'",
      anchor: "conversation-as-technology",
    },
    gpt: {
      label: "Conversation as hypothesis search",
      fullText:
        "Use conversation to explore the hypothesis space, test ideas, and refine understanding.",
      anchor: "conversation-as-hypothesis-search",
    },
    gemini: {
      label: "Brenner-Crick GAN",
      fullText:
        "Model the Brenner-Crick dynamic as a generative adversarial network for idea generation and critique.",
      anchor: "brenner-crick-gan",
    },
  },
];

const MODEL_CONFIGS = {
  opus: {
    name: "Opus 4.5",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-500/30",
    docId: "distillation-opus-45",
  },
  gpt: {
    name: "GPT-5.2",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-500/30",
    docId: "distillation-gpt-52",
  },
  gemini: {
    name: "Gemini 3",
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/30",
    docId: "distillation-gemini-3",
  },
};

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    setShow(true);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      className="relative"
    >
      {children}
      {show && (
        <div
          className="fixed z-50 max-w-xs px-3 py-2 text-sm text-foreground bg-popover border border-border rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-full -mt-2 pointer-events-none"
          style={{ left: position.x, top: position.y }}
        >
          {content}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-popover" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TABLE CELL COMPONENT
// ============================================================================

interface TableCellContentProps {
  cell: CrosswalkCell;
  model: keyof typeof MODEL_CONFIGS;
}

function TableCellContent({ cell, model }: TableCellContentProps) {
  const config = MODEL_CONFIGS[model];
  const href = cell.anchor ? `/corpus/${config.docId}#${cell.anchor}` : `/corpus/${config.docId}`;

  const content = (
    <Link
      href={href}
      className={cn(
        "block px-4 py-3 h-full transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "text-sm leading-relaxed text-foreground/90",
      )}
    >
      {cell.label}
    </Link>
  );

  if (cell.fullText) {
    return <Tooltip content={cell.fullText}>{content}</Tooltip>;
  }

  return content;
}

// ============================================================================
// MOBILE CARD VIEW
// ============================================================================

interface MobileCardProps {
  row: CrosswalkRow;
}

function MobileCard({ row }: MobileCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Concept header */}
      <div className="px-4 py-3 bg-muted/50 border-b border-border">
        <h3 className="font-semibold text-foreground">{row.concept}</h3>
      </div>

      {/* Model cells */}
      <div className="divide-y divide-border">
        {(["opus", "gpt", "gemini"] as const).map((model) => {
          const config = MODEL_CONFIGS[model];
          const cell = row[model];
          const href = cell.anchor
            ? `/corpus/${config.docId}#${cell.anchor}`
            : `/corpus/${config.docId}`;

          return (
            <Link
              key={model}
              href={href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 active:bg-muted/50 active:scale-[0.99] transition-all touch-manipulation"
            >
              <div
                className={cn(
                  "flex-shrink-0 size-8 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                  `bg-gradient-to-br ${config.color}`,
                )}
              >
                {config.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">{config.name}</div>
                <div className="text-sm text-foreground truncate">{cell.label}</div>
              </div>
              <ChevronRightIcon />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// COLUMN HELPER & DEFINITIONS
// ============================================================================

const columnHelper = createColumnHelper<CrosswalkRow>();

// ============================================================================
// SORT INDICATOR COMPONENT
// ============================================================================

function SortIndicator({ direction }: { direction: false | "asc" | "desc" }) {
  if (!direction) {
    return <span className="ml-1 text-muted-foreground/40 text-xs">⇅</span>;
  }
  return <span className="ml-1 text-foreground text-xs">{direction === "asc" ? "↑" : "↓"}</span>;
}

// ============================================================================
// MODEL HEADER COMPONENT
// ============================================================================

interface ModelHeaderProps {
  model: keyof typeof MODEL_CONFIGS;
  sortDirection: false | "asc" | "desc";
}

function ModelHeader({ model, sortDirection }: ModelHeaderProps) {
  const config = MODEL_CONFIGS[model];
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "size-6 rounded-md flex items-center justify-center text-white text-xs font-bold",
          `bg-gradient-to-br ${config.color}`,
        )}
      >
        {config.name[0]}
      </div>
      <span className={cn("font-semibold text-sm", config.textColor)}>{config.name}</span>
      <SortIndicator direction={sortDirection} />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CrosswalkTableProps {
  className?: string;
}

export function CrosswalkTable({ className }: CrosswalkTableProps) {
  const [hoveredRowId, setHoveredRowId] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Define columns using column helper
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("concept", {
        header: ({ column }) => (
          <div className="flex items-center gap-1 cursor-pointer select-none touch-manipulation active:scale-[0.98] transition-transform">
            <span>Concept</span>
            <SortIndicator direction={column.getIsSorted()} />
          </div>
        ),
        cell: (info) => (
          <span className="font-medium text-foreground">{info.getValue() as string}</span>
        ),
      }),
      columnHelper.accessor("opus", {
        header: ({ column }) => <ModelHeader model="opus" sortDirection={column.getIsSorted()} />,
        cell: (info) => <TableCellContent cell={info.getValue() as CrosswalkCell} model="opus" />,
        sortingFn: (rowA, rowB) => rowA.original.opus.label.localeCompare(rowB.original.opus.label),
      }),
      columnHelper.accessor("gpt", {
        header: ({ column }) => <ModelHeader model="gpt" sortDirection={column.getIsSorted()} />,
        cell: (info) => <TableCellContent cell={info.getValue() as CrosswalkCell} model="gpt" />,
        sortingFn: (rowA, rowB) => rowA.original.gpt.label.localeCompare(rowB.original.gpt.label),
      }),
      columnHelper.accessor("gemini", {
        header: ({ column }) => <ModelHeader model="gemini" sortDirection={column.getIsSorted()} />,
        cell: (info) => <TableCellContent cell={info.getValue() as CrosswalkCell} model="gemini" />,
        sortingFn: (rowA, rowB) =>
          rowA.original.gemini.label.localeCompare(rowB.original.gemini.label),
      }),
    ],
    [],
  );

  // Create table instance
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table hook is stable; safe to skip compiler memoization.
  const table = useReactTable({
    data: CROSSWALK_DATA,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse" role="grid">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => {
                  const isConceptColumn = header.id === "concept";
                  const modelKey = header.id as keyof typeof MODEL_CONFIGS;
                  const config = !isConceptColumn ? MODEL_CONFIGS[modelKey] : null;

                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          header.column.getToggleSortingHandler()?.(e);
                        }
                      }}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={
                        header.column.getIsSorted()
                          ? header.column.getIsSorted() === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className={cn(
                        "px-4 py-3 text-left border-r border-border last:border-r-0 cursor-pointer select-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset",
                        "hover:bg-muted/70 transition-colors",
                        isConceptColumn
                          ? "sticky left-0 z-10 bg-muted/50 text-sm font-semibold text-muted-foreground uppercase tracking-wider w-32"
                          : config?.bgColor,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={cn(
                  "border-t border-border transition-colors",
                  hoveredRowId === row.id
                    ? "bg-muted/30"
                    : rowIndex % 2 === 0
                      ? "bg-card"
                      : "bg-muted/10",
                )}
                onMouseEnter={() => setHoveredRowId(row.id)}
                onMouseLeave={() => setHoveredRowId(null)}
              >
                {row.getVisibleCells().map((cell) => {
                  const isConceptColumn = cell.column.id === "concept";

                  return (
                    <td
                      key={cell.id}
                      role="gridcell"
                      className={cn(
                        "border-r border-border last:border-r-0",
                        isConceptColumn ? "sticky left-0 z-10 bg-inherit px-4 py-3" : "p-0",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (unchanged - no sorting on mobile) */}
      <div className="lg:hidden space-y-4">
        {CROSSWALK_DATA.map((row) => (
          <MobileCard key={row.concept} row={row} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function ChevronRightIcon() {
  return (
    <svg
      className="size-4 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export default CrosswalkTable;
