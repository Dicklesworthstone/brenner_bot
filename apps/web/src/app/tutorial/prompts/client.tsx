"use client";

/**
 * PromptLibraryClient - Interactive prompt library with filtering
 *
 * Client component for the prompts page that handles:
 * - Tag filtering
 * - Search (optional)
 * - Prompt card rendering
 *
 * @see brenner_bot-u38r (Tutorial Content: Prompt Templates Library)
 */

import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import * as React from "react";
import { PromptCard } from "@/components/tutorial";
import { getAllPrompts, getAllTags } from "@/lib/tutorial-data/prompts";

// ============================================================================
// Main Component
// ============================================================================

export function PromptLibraryClient() {
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const allPrompts = getAllPrompts();
  const allTags = getAllTags();

  // Filter prompts
  const filteredPrompts = React.useMemo(() => {
    let result = allPrompts;

    // Filter by tag
    if (selectedTag) {
      result = result.filter((p) => p.tags.includes(selectedTag));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query) ||
          p.explanation.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [allPrompts, selectedTag, searchQuery]);

  return (
    <div className="space-y-8 px-4 sm:px-0">
      {/* Filters */}
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Tag filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
              selectedTag === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                selectedTag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredPrompts.length} of {allPrompts.length} prompts
          {selectedTag && (
            <span>
              {" "}
              tagged with <span className="text-primary font-medium">{selectedTag}</span>
            </span>
          )}
          {searchQuery && (
            <span>
              {" "}
              matching <span className="text-primary font-medium">&ldquo;{searchQuery}&rdquo;</span>
            </span>
          )}
        </div>
      </div>

      {/* Prompt Cards */}
      <div className="max-w-4xl mx-auto space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredPrompts.map((prompt, index) => (
            <motion.div
              key={prompt.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.05,
              }}
            >
              <PromptCard prompt={prompt} showExplanation={false} showVariables />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {filteredPrompts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">No prompts found matching your criteria.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedTag(null);
                setSearchQuery("");
              }}
              className="mt-4 text-primary hover:underline"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
