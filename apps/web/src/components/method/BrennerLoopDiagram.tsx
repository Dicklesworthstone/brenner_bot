"use client";

import { useState } from "react";

// ============================================================================
// BRENNER LOOP DIAGRAM - World-class interactive visualization
// ============================================================================

interface LoopStage {
  stage: number;
  title: string;
  shortTitle: string;
  description: string;
  quote: string;
}

const loopStages: LoopStage[] = [
  {
    stage: 1,
    title: "Problem Selection",
    shortTitle: "Problem",
    description: "Choose the right problem - one that is tractable yet significant.",
    quote:
      "I think many fields of science could do a great deal better if they went back to the classical approach of studying a problem.",
  },
  {
    stage: 2,
    title: "Parallel Hypotheses",
    shortTitle: "Hypotheses",
    description: "Generate multiple competing explanations and hold them simultaneously.",
    quote: "You need to have several hypotheses going at the same time.",
  },
  {
    stage: 3,
    title: "Discriminative Tests",
    shortTitle: "Test",
    description: "Design experiments that can falsify hypotheses, not just confirm them.",
    quote: "The important thing is the experiment that tells you which hypothesis is wrong.",
  },
  {
    stage: 4,
    title: "Bayesian Update",
    shortTitle: "Update",
    description: "Update beliefs based on evidence. Let the data speak.",
    quote: "If your model doesn't work, you change your model, not your facts.",
  },
  {
    stage: 5,
    title: "Iterate",
    shortTitle: "Iterate",
    description: "Return with refined hypotheses. Each iteration narrows the possibility space.",
    quote: "Science is an iterative process. You go round and round.",
  },
];

// Calculate pentagon positions
function getStagePosition(index: number, total: number, radius: number) {
  // Start from top (-90 degrees) and go clockwise
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export function BrennerLoopDiagram() {
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const radius = 140;
  const center = 180;
  const nodeSize = 56;
  const svgSize = center * 2; // 360

  return (
    <div className="w-full">
      {/* Desktop: Interactive SVG diagram */}
      <div
        className="hidden lg:block pb-4"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setActiveStage(null);
        }}
      >
        <div className="relative mx-auto" style={{ width: svgSize }}>
          <svg
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            width={svgSize}
            height={svgSize}
            className="block"
            style={{ overflow: "visible" }}
          >
            {/* Background glow */}
            <defs>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </radialGradient>

              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow marker */}
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-primary)" opacity="0.6" />
              </marker>
            </defs>

            {/* Center glow circle */}
            <circle
              cx={center}
              cy={center}
              r={radius - 20}
              fill="url(#centerGlow)"
              className={`transition-opacity duration-500 ${isHovering ? "opacity-100" : "opacity-50"}`}
            />

            {/* Connecting lines - curved paths between nodes */}
            {loopStages.map((_, index) => {
              const current = getStagePosition(index, loopStages.length, radius);
              const nextIndex = (index + 1) % loopStages.length;
              const next = getStagePosition(nextIndex, loopStages.length, radius);

              // Calculate control point for curved line
              const midX = (current.x + next.x) / 2 + center;
              const midY = (current.y + next.y) / 2 + center;
              const controlX = midX + (center - midX) * 0.3;
              const controlY = midY + (center - midY) * 0.3;

              const isActive = activeStage === index + 1 || activeStage === nextIndex + 1;
              const isIteratePath = index === loopStages.length - 1;

              return (
                <g key={`path-${index}`}>
                  {/* Path line */}
                  <path
                    d={`M ${current.x + center} ${current.y + center} Q ${controlX} ${controlY} ${next.x + center} ${next.y + center}`}
                    fill="none"
                    stroke={isIteratePath ? "var(--color-accent)" : "var(--color-primary)"}
                    strokeWidth={isActive ? 3 : 2}
                    strokeOpacity={isActive ? 0.8 : 0.3}
                    strokeDasharray={isIteratePath ? "6 4" : "none"}
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-300"
                    filter={isActive ? "url(#glow)" : undefined}
                  />
                </g>
              );
            })}

            {/* Stage nodes */}
            {loopStages.map((stage, index) => {
              const pos = getStagePosition(index, loopStages.length, radius);
              const isActive = activeStage === stage.stage;
              const isIterateNode = index === loopStages.length - 1;

              return (
                <g
                  key={stage.stage}
                  transform={`translate(${pos.x + center}, ${pos.y + center})`}
                  onMouseEnter={() => setActiveStage(stage.stage)}
                  className="cursor-pointer"
                  style={{ transition: "transform 0.2s ease-out" }}
                >
                  {/* Outer glow ring when active */}
                  {isActive && (
                    <circle
                      r={nodeSize / 2 + 8}
                      fill="none"
                      stroke={isIterateNode ? "var(--color-accent)" : "var(--color-primary)"}
                      strokeWidth="2"
                      opacity="0.4"
                      filter="url(#softGlow)"
                      className="animate-pulse-ring"
                    />
                  )}

                  {/* Node background */}
                  <circle
                    r={nodeSize / 2}
                    fill={isIterateNode ? "var(--color-accent)" : "var(--color-primary)"}
                    filter={isActive ? "url(#glow)" : undefined}
                    className={`transition-all duration-300 ${isActive ? "opacity-100" : "opacity-90"}`}
                    style={{
                      transform: isActive ? "scale(1.1)" : "scale(1)",
                      transformOrigin: "center",
                      transition: "transform 0.2s ease-out",
                    }}
                  />

                  {/* Stage number */}
                  <text
                    y="1"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="18"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {stage.stage}
                  </text>

                  {/* Stage label below node */}
                  <text
                    y={nodeSize / 2 + 16}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="currentColor"
                    fontSize="12"
                    fontWeight="500"
                    className={`select-none pointer-events-none transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-70"
                    }`}
                  >
                    {stage.shortTitle}
                  </text>
                </g>
              );
            })}

            {/* Center iteration indicator */}
            <g transform={`translate(${center}, ${center})`}>
              <circle r="24" fill="var(--color-muted)" opacity="0.5" />
              <RefreshIcon />
            </g>
          </svg>
        </div>

        {/* Active stage detail card - positioned below the diagram */}
        <div
          className={`mx-auto w-80 mt-4 transition-all duration-300 ${
            activeStage
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden"
          }`}
        >
          {activeStage && (
            <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {activeStage}
                </span>
                <h3 className="font-semibold text-foreground">
                  {loopStages[activeStage - 1]?.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {loopStages[activeStage - 1]?.description}
              </p>
              <blockquote className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                &ldquo;{loopStages[activeStage - 1]?.quote}&rdquo;
              </blockquote>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Vertical timeline with tappable cards */}
      <div className="lg:hidden space-y-0">
        {loopStages.map((stage, index) => {
          const isIterateStage = index === loopStages.length - 1;
          const isExpanded = activeStage === stage.stage;

          return (
            <div key={stage.stage} className="relative flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setActiveStage(isExpanded ? null : stage.stage)}
                  className={`flex items-center justify-center size-11 rounded-full font-bold text-sm shadow-lg transition-all duration-200 touch-manipulation active:scale-95 ${
                    isIterateStage
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground"
                  } ${isExpanded ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : ""}`}
                  aria-expanded={isExpanded}
                  aria-label={`Stage ${stage.stage}: ${stage.title}`}
                >
                  {stage.stage}
                </button>
                {index < loopStages.length - 1 && (
                  <div
                    className={`w-0.5 h-full min-h-[60px] my-1 transition-colors duration-200 ${
                      isExpanded ? "bg-primary/50" : "bg-border"
                    }`}
                  />
                )}
                {isIterateStage && (
                  <div className="flex flex-col items-center mt-2">
                    <svg
                      className="size-5 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                      />
                    </svg>
                    <span className="text-[10px] text-muted-foreground mt-1">Loop back</span>
                  </div>
                )}
              </div>

              {/* Content card */}
              <button
                onClick={() => setActiveStage(isExpanded ? null : stage.stage)}
                className={`flex-1 pb-6 text-left touch-manipulation transition-all duration-200 ${
                  isExpanded ? "opacity-100" : "opacity-80"
                }`}
              >
                <div
                  className={`rounded-xl p-3 -ml-1 transition-all duration-200 ${
                    isExpanded ? "bg-muted/50 border border-border shadow-sm" : "hover:bg-muted/30"
                  }`}
                >
                  <h3
                    className={`font-semibold mb-1 transition-colors duration-200 ${
                      isExpanded ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {stage.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                    {stage.description}
                  </p>
                  <blockquote
                    className={`text-xs italic text-muted-foreground border-l-2 pl-2 transition-all duration-200 ${
                      isExpanded ? "border-primary/50" : "border-primary/30"
                    }`}
                  >
                    &ldquo;{stage.quote}&rdquo;
                  </blockquote>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Refresh icon for center - centered using x/y offset
function RefreshIcon() {
  const iconSize = 20;
  return (
    <svg
      x={-iconSize / 2}
      y={-iconSize / 2}
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="text-muted-foreground"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}
