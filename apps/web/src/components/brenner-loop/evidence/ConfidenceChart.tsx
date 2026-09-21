"use client";

/**
 * ConfidenceChart - Line Chart of Confidence Over Time
 *
 * Visualizes how hypothesis confidence evolves as evidence is recorded.
 * Shows the journey from initial confidence through each piece of evidence.
 *
 * Features:
 * - SVG-based line chart (no external dependencies)
 * - Animated data points with framer-motion
 * - Hover states showing evidence details
 * - Color-coded result indicators
 * - Responsive design
 *
 * @see brenner_bot-njjo.4 (bead)
 * @module components/brenner-loop/evidence/ConfidenceChart
 */

import { AnimatePresence, motion } from "framer-motion";
import { Target, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";
import { formatConfidence } from "@/lib/brenner-loop/confidence";
import type { EvidenceEntry, EvidenceResult } from "@/lib/brenner-loop/evidence";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ConfidenceChartProps {
  /** Evidence entries to display (will be sorted by date) */
  entries: EvidenceEntry[];
  /** Initial confidence before any evidence (if known) */
  initialConfidence?: number;
  /** Height of the chart in pixels */
  height?: number;
  /** Whether to show point labels */
  showLabels?: boolean;
  /** Callback when a point is clicked */
  onPointClick?: (entry: EvidenceEntry) => void;
  /** Additional CSS classes */
  className?: string;
}

interface DataPoint {
  x: number;
  y: number;
  confidence: number;
  entry: EvidenceEntry | null;
  result: EvidenceResult | "initial";
}

// ============================================================================
// Constants
// ============================================================================

const RESULT_COLORS: Record<EvidenceResult | "initial", string> = {
  initial: "#6b7280", // gray-500
  supports: "#22c55e", // green-500
  challenges: "#ef4444", // red-500
  inconclusive: "#f59e0b", // amber-500
};

const CHART_PADDING = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 50,
};

// ============================================================================
// Chart SVG Components
// ============================================================================

/**
 * Y-axis with confidence labels
 */
function YAxis({ height }: { height: number }) {
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <g>
      {/* Axis line */}
      <line
        x1={CHART_PADDING.left}
        y1={CHART_PADDING.top}
        x2={CHART_PADDING.left}
        y2={height - CHART_PADDING.bottom}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={1}
      />

      {/* Ticks and labels */}
      {ticks.map((tick) => {
        const y = height - CHART_PADDING.bottom - (tick / 100) * chartHeight;
        return (
          <g key={tick}>
            {/* Gridline */}
            <line
              x1={CHART_PADDING.left}
              y1={y}
              x2="100%"
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {/* Label */}
            <text
              x={CHART_PADDING.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs"
            >
              {tick}%
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Confidence band highlighting regions
 */
function ConfidenceBands({ width, height }: { width: number; height: number }) {
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;

  // Calculate band positions
  const bands = [
    { min: 80, max: 100, color: "#22c55e", opacity: 0.05 }, // High confidence
    { min: 60, max: 80, color: "#84cc16", opacity: 0.03 },
    { min: 40, max: 60, color: "#eab308", opacity: 0.03 },
    { min: 20, max: 40, color: "#f97316", opacity: 0.03 },
    { min: 0, max: 20, color: "#ef4444", opacity: 0.05 }, // Low confidence
  ];

  return (
    <g>
      {bands.map((band, i) => {
        const y1 = height - CHART_PADDING.bottom - (band.max / 100) * chartHeight;
        const y2 = height - CHART_PADDING.bottom - (band.min / 100) * chartHeight;
        const bandHeight = y2 - y1;

        return (
          <rect
            key={i}
            x={CHART_PADDING.left}
            y={y1}
            width={chartWidth}
            height={bandHeight}
            fill={band.color}
            opacity={band.opacity}
          />
        );
      })}
    </g>
  );
}

/**
 * The confidence line connecting points
 */
function ConfidenceLine({ points }: { points: DataPoint[] }) {
  if (points.length < 2) return null;

  const pathData = points
    .map((point, i) => {
      const cmd = i === 0 ? "M" : "L";
      return `${cmd} ${point.x} ${point.y}`;
    })
    .join(" ");

  return (
    <motion.path
      d={pathData}
      fill="none"
      stroke="url(#confidenceGradient)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    />
  );
}

/**
 * Data point with hover state
 */
function DataPointMarker({
  point,
  isHovered,
  onClick,
  onHover,
}: {
  point: DataPoint;
  isHovered: boolean;
  onClick?: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const color = RESULT_COLORS[point.result];

  return (
    <g>
      {/* Hover ring */}
      <motion.circle
        cx={point.x}
        cy={point.y}
        r={isHovered ? 12 : 0}
        fill={color}
        opacity={0.2}
        initial={false}
        animate={{ r: isHovered ? 12 : 0 }}
        transition={{ duration: 0.15 }}
      />

      {/* Main point */}
      <motion.circle
        cx={point.x}
        cy={point.y}
        r={isHovered ? 6 : 4}
        fill={color}
        stroke="white"
        strokeWidth={2}
        style={{ cursor: point.entry ? "pointer" : "default" }}
        onClick={onClick}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        initial={{ scale: 0 }}
        animate={{ scale: 1, r: isHovered ? 6 : 4 }}
        transition={{ duration: 0.2 }}
      />
    </g>
  );
}

/**
 * Tooltip showing point details
 */
function PointTooltip({ point, chartHeight }: { point: DataPoint; chartHeight: number }) {
  const isAbove = point.y > chartHeight / 2;
  const tooltipY = isAbove ? point.y - 50 : point.y + 15;

  // Determine label text - "Initial" for the first point, otherwise capitalize result
  const labelText =
    point.result === "initial"
      ? "Initial"
      : point.result.charAt(0).toUpperCase() + point.result.slice(1);

  return (
    <motion.g
      initial={{ opacity: 0, y: isAbove ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <rect
        x={point.x - 60}
        y={tooltipY}
        width={120}
        height={40}
        rx={6}
        className="fill-popover stroke-border"
        strokeWidth={1}
      />
      <text
        x={point.x}
        y={tooltipY + 16}
        textAnchor="middle"
        className="fill-foreground text-xs font-medium"
      >
        {formatConfidence(point.confidence)}
      </text>
      <text
        x={point.x}
        y={tooltipY + 30}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {labelText}
      </text>
    </motion.g>
  );
}

// ============================================================================
// Summary Stats
// ============================================================================

function ChartSummary({
  entries,
  initialConfidence,
  finalConfidence,
}: {
  entries: EvidenceEntry[];
  initialConfidence: number;
  finalConfidence: number;
}) {
  const delta = finalConfidence - initialConfidence;
  const supports = entries.filter((e) => e.result === "supports").length;
  const challenges = entries.filter((e) => e.result === "challenges").length;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Target className="size-3 text-muted-foreground" />
          <span>
            <span className="text-muted-foreground">Start: </span>
            <span className="font-medium">{formatConfidence(initialConfidence)}</span>
          </span>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Now: </span>
          <span className="font-medium">{formatConfidence(finalConfidence)}</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1",
            delta > 0 && "text-green-500",
            delta < 0 && "text-red-500",
            delta === 0 && "text-muted-foreground",
          )}
        >
          {delta > 0 ? (
            <TrendingUp className="size-3" />
          ) : delta < 0 ? (
            <TrendingDown className="size-3" />
          ) : null}
          <span className="font-medium">
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full bg-green-500" />
          <span>
            {supports} {supports === 1 ? "support" : "supports"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full bg-red-500" />
          <span>
            {challenges} {challenges === 1 ? "challenge" : "challenges"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center bg-muted/20 rounded-lg border border-dashed border-border"
      style={{ height }}
    >
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <TrendingUp className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        Record evidence to see your confidence journey
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfidenceChart({
  entries,
  initialConfidence,
  height = 200,
  showLabels = true,
  onPointClick,
  className,
}: ConfidenceChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(400);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Resize observer for responsive width
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((observerEntries) => {
      const entry = observerEntries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Sort entries chronologically and compute data points
  const { points, effectiveInitial, finalConfidence } = React.useMemo(() => {
    if (entries.length === 0) {
      return { points: [], effectiveInitial: 50, finalConfidence: 50 };
    }

    const sorted = [...entries].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );

    // Determine initial confidence
    const firstEntry = sorted[0];
    const effectiveInitial = initialConfidence ?? firstEntry.confidenceBefore;

    // Calculate chart dimensions
    const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
    const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

    // Create data points
    const dataPoints: DataPoint[] = [];

    // Initial point
    dataPoints.push({
      x: CHART_PADDING.left,
      y: height - CHART_PADDING.bottom - (effectiveInitial / 100) * chartHeight,
      confidence: effectiveInitial,
      entry: null,
      result: "initial",
    });

    // Entry points
    sorted.forEach((entry, index) => {
      const x = CHART_PADDING.left + ((index + 1) / sorted.length) * chartWidth;
      const y = height - CHART_PADDING.bottom - (entry.confidenceAfter / 100) * chartHeight;

      dataPoints.push({
        x,
        y,
        confidence: entry.confidenceAfter,
        entry,
        result: entry.result,
      });
    });

    const finalConfidence = sorted[sorted.length - 1].confidenceAfter;

    return { points: dataPoints, effectiveInitial, finalConfidence };
  }, [entries, initialConfidence, width, height]);

  if (entries.length === 0) {
    return (
      <div ref={containerRef} className={className}>
        <EmptyChart height={height} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("overflow-hidden", className)}>
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient for the line */}
            <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Background bands */}
          <ConfidenceBands width={width} height={height} />

          {/* Y Axis */}
          <YAxis height={height} />

          {/* Confidence line */}
          <ConfidenceLine points={points} />

          {/* Data points */}
          {points.map((point, index) => (
            <DataPointMarker
              key={index}
              point={point}
              isHovered={hoveredIndex === index}
              onClick={point.entry && onPointClick ? () => onPointClick(point.entry!) : undefined}
              onHover={(hovered) => setHoveredIndex(hovered ? index : null)}
            />
          ))}

          {/* Tooltip for hovered point */}
          <AnimatePresence>
            {hoveredIndex !== null && points[hoveredIndex] && (
              <PointTooltip key="tooltip" point={points[hoveredIndex]} chartHeight={height} />
            )}
          </AnimatePresence>

          {/* X-axis label */}
          <text
            x={width / 2}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            Evidence Timeline
          </text>
        </svg>

        {/* Summary stats */}
        {showLabels && (
          <ChartSummary
            entries={entries}
            initialConfidence={effectiveInitial}
            finalConfidence={finalConfidence}
          />
        )}
      </div>
    </div>
  );
}

export default ConfidenceChart;
