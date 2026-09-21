"use client";

/**
 * Hypothesis Graveyard Component
 *
 * A gallery view of falsified hypotheses with:
 * - Searchable list
 * - Filtering by death type
 * - Expandable cards showing details
 * - Statistics overview
 * - Learning patterns
 *
 * @see brenner_bot-an1n.7 (bead)
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  analyzeFailurePatterns,
  calculateGraveyardStats,
  DEATH_TYPE_ICONS,
  DEATH_TYPE_LABELS,
  type DeathType,
  type FailurePattern,
  type FalsifiedHypothesis,
  formatFalsificationDate,
  type GraveyardStats,
  getDeathTypeDisplay,
} from "@/lib/brenner-loop/graveyard";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface HypothesisGraveyardProps {
  /** List of falsified hypotheses */
  entries: FalsifiedHypothesis[];
  /** Callback when an entry is selected */
  onSelect?: (entry: FalsifiedHypothesis) => void;
  /** Callback to view a successor hypothesis */
  onViewSuccessor?: (hypothesisId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function SearchIcon({ className }: { className?: string }) {
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
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatsOverviewProps {
  stats: GraveyardStats;
}

function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-foreground">{stats.totalFalsified}</p>
          <p className="text-sm text-muted-foreground">Total Falsified</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-success">{stats.withSuccessors}</p>
          <p className="text-sm text-muted-foreground">Led to Successors</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-primary">
            {stats.avgLessonsPerFalsification.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">Avg Lessons/Failure</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-warning">{stats.withEpitaphs}</p>
          <p className="text-sm text-muted-foreground">With Epitaphs</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface FailurePatternsProps {
  patterns: FailurePattern[];
}

function FailurePatterns({ patterns }: FailurePatternsProps) {
  if (patterns.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-semibold text-foreground mb-4">Failure Patterns</h3>
        <div className="space-y-3">
          {patterns.map((pattern, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {pattern.frequency.toFixed(0)}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{pattern.name}</p>
                <p className="text-sm text-muted-foreground">{pattern.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface GraveyardEntryCardProps {
  entry: FalsifiedHypothesis;
  isExpanded: boolean;
  onToggle: () => void;
  onViewSuccessor?: (hypothesisId: string) => void;
}

function GraveyardEntryCard({
  entry,
  isExpanded,
  onToggle,
  onViewSuccessor,
}: GraveyardEntryCardProps) {
  const display = getDeathTypeDisplay(entry.deathType);

  return (
    <Card className="overflow-hidden">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left flex items-start gap-4 hover:bg-muted/30 transition-colors"
      >
        <span className="text-2xl">{display.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                display.color === "red" && "bg-destructive/10 text-destructive",
                display.color === "orange" && "bg-warning/10 text-warning",
                display.color === "yellow" &&
                  "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                display.color === "purple" &&
                  "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                display.color === "gray" && "bg-muted text-muted-foreground",
                display.color === "blue" && "bg-info/10 text-info",
              )}
            >
              {display.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatFalsificationDate(entry.falsifiedAt)}
            </span>
          </div>

          <p className="font-medium text-foreground mt-1 line-clamp-2">
            {entry.hypothesis.statement}
          </p>

          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{entry.deathSummary}</p>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <ChevronDownIcon className="size-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
              {/* Brenner Quote */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm italic text-foreground">&ldquo;{entry.brennerQuote}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">— Brenner</p>
              </div>

              {/* Epitaph */}
              {entry.epitaph && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Epitaph</p>
                  <p className="text-sm text-foreground">{entry.epitaph}</p>
                </div>
              )}

              {/* Lessons Learned */}
              {entry.learning.lessonsLearned.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Lessons Learned</p>
                  <ul className="space-y-1">
                    {entry.learning.lessonsLearned.map((lesson, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary">•</span>
                        {lesson}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What Remains Open */}
              {entry.learning.whatRemainsOpen.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Questions Remaining
                  </p>
                  <ul className="space-y-1">
                    {entry.learning.whatRemainsOpen.map((question, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-warning">?</span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Successor Hypotheses */}
              {entry.successorHypothesisIds.length > 0 && onViewSuccessor && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Successor Hypotheses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.successorHypothesisIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onViewSuccessor(id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 text-success text-xs hover:bg-success/20 transition-colors"
                      >
                        <LinkIcon className="size-3" />
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Killing Blow */}
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <p className="text-xs font-medium text-destructive mb-1">Killing Blow</p>
                <p className="text-sm text-foreground">{entry.killingBlow.observation}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Test: {entry.killingBlow.test.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================================================
// Filter Component
// ============================================================================

interface GraveyardFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDeathType: DeathType | null;
  onDeathTypeChange: (type: DeathType | null) => void;
}

function GraveyardFilters({
  searchQuery,
  onSearchChange,
  selectedDeathType,
  onDeathTypeChange,
}: GraveyardFiltersProps) {
  const deathTypes: DeathType[] = [
    "direct_falsification",
    "mechanism_failure",
    "effect_size_collapse",
    "superseded",
    "unmeasurable",
    "scope_reduction",
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search graveyard..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Death Type Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <button
          type="button"
          onClick={() => onDeathTypeChange(null)}
          className={cn(
            "px-3 py-1 rounded-full text-sm transition-colors",
            selectedDeathType === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          All
        </button>
        {deathTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onDeathTypeChange(type === selectedDeathType ? null : type)}
            className={cn(
              "px-3 py-1 rounded-full text-sm transition-colors inline-flex items-center gap-1",
              selectedDeathType === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <span>{DEATH_TYPE_ICONS[type]}</span>
            <span className="hidden sm:inline">{DEATH_TYPE_LABELS[type]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function HypothesisGraveyard({
  entries,
  onViewSuccessor,
  className,
}: HypothesisGraveyardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDeathType, setSelectedDeathType] = React.useState<DeathType | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showStats, setShowStats] = React.useState(true);

  // Calculate stats and patterns
  const stats = React.useMemo(() => calculateGraveyardStats(entries), [entries]);
  const patterns = React.useMemo(() => analyzeFailurePatterns(entries), [entries]);

  // Filter entries
  const filteredEntries = React.useMemo(() => {
    let result = entries;

    // Filter by death type
    if (selectedDeathType) {
      result = result.filter((e) => e.deathType === selectedDeathType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.hypothesis.statement.toLowerCase().includes(query) ||
          e.deathSummary.toLowerCase().includes(query) ||
          e.epitaph.toLowerCase().includes(query) ||
          e.learning.lessonsLearned.some((l) => l.toLowerCase().includes(query)),
      );
    }

    // Sort by date (newest first)
    return result.sort((a, b) => {
      const dateA = typeof a.falsifiedAt === "string" ? new Date(a.falsifiedAt) : a.falsifiedAt;
      const dateB = typeof b.falsifiedAt === "string" ? new Date(b.falsifiedAt) : b.falsifiedAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [entries, selectedDeathType, searchQuery]);

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span>🪦</span> Hypothesis Graveyard
          </h2>
          <p className="text-muted-foreground mt-1">
            {entries.length} hypotheses laid to rest. Each one a lesson learned.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="text-sm text-primary hover:underline"
        >
          {showStats ? "Hide Stats" : "Show Stats"}
        </button>
      </div>

      {/* Stats */}
      <AnimatePresence initial={false}>
        {showStats && entries.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            <StatsOverview stats={stats} />
            <FailurePatterns patterns={patterns} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <GraveyardFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedDeathType={selectedDeathType}
        onDeathTypeChange={setSelectedDeathType}
      />

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredEntries.length} of {entries.length} entries
        {selectedDeathType && (
          <span>
            {" "}
            of type <span className="text-primary">{DEATH_TYPE_LABELS[selectedDeathType]}</span>
          </span>
        )}
      </p>

      {/* Entry list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.03,
              }}
            >
              <GraveyardEntryCard
                entry={entry}
                isExpanded={expandedId === entry.id}
                onToggle={() => handleToggle(entry.id)}
                onViewSuccessor={onViewSuccessor}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {filteredEntries.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            {entries.length === 0 ? (
              <>
                <p className="text-2xl mb-2">🌱</p>
                <p className="text-muted-foreground">The graveyard is empty.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No hypotheses have been falsified yet. That&apos;s either very good or very bad.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No entries match your search.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDeathType(null);
                  }}
                  className="mt-4 text-primary hover:underline"
                >
                  Clear filters
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
