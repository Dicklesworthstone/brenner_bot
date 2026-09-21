"use client";

/**
 * PromptCard - Display a versioned prompt template with copy functionality
 *
 * Features:
 * - Version badge and "tested with" indicators
 * - Variable placeholders highlighted
 * - One-click copy with success feedback
 * - Collapsible explanation section
 * - Mobile-optimized with larger touch targets
 *
 * @see brenner_bot-u38r (Tutorial Content: Prompt Templates Library)
 */

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ChevronDown, Info } from "lucide-react";
import * as React from "react";
import { CopyButton } from "@/components/ui/copy-button";
import type { PromptTemplate, PromptVariable } from "@/lib/tutorial-data/prompts";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface PromptCardProps {
  /** The prompt template to display */
  prompt: PromptTemplate;
  /** Show the explanation section expanded by default */
  showExplanation?: boolean;
  /** Show variables section */
  showVariables?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for lists */
  compact?: boolean;
}

// ============================================================================
// Variable Highlight Component
// ============================================================================

function VariableHighlight({ variable }: { variable: PromptVariable }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs border border-amber-500/30">
      {variable.placeholder}
    </span>
  );
}

// ============================================================================
// Content with Highlighted Variables
// ============================================================================

function HighlightedContent({
  content,
  variables,
}: {
  content: string;
  variables?: PromptVariable[];
}) {
  if (!variables || variables.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Create a regex pattern that matches all variable placeholders
  const pattern = variables.map((v) => v.placeholder.replace(/[[\]]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${pattern})`, "g");

  const parts = content.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const matchingVar = variables.find((v) => v.placeholder === part);
        if (matchingVar) {
          return (
            <span
              key={i}
              className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs border border-amber-500/30"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PromptCard({
  prompt,
  showExplanation = false,
  showVariables = true,
  className,
  compact = false,
}: PromptCardProps) {
  const [isExplanationOpen, setIsExplanationOpen] = React.useState(showExplanation);
  const [isContentOpen, setIsContentOpen] = React.useState(!compact);

  const lines = prompt.content.split("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden",
        "shadow-md transition-all duration-300 hover:shadow-lg hover:border-primary/30",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 border-b border-border/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{prompt.name}</h3>
            {/* Version badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">
              v{prompt.version}
            </span>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {prompt.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Tested with badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {prompt.testedWith.map((agent) => (
            <span
              key={agent}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[oklch(0.72_0.19_145/0.1)] text-[oklch(0.72_0.19_145)] text-xs"
            >
              <CheckCircle2 className="size-3" />
              {agent}
            </span>
          ))}
        </div>
      </div>

      {/* Variables Section */}
      {showVariables && prompt.variables && prompt.variables.length > 0 && (
        <div className="p-4 bg-amber-500/5 border-b border-border/50">
          <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
            Variables to Fill In
          </h4>
          <div className="space-y-2">
            {prompt.variables.map((variable) => (
              <div key={variable.placeholder} className="flex items-start gap-3">
                <VariableHighlight variable={variable} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{variable.description}</p>
                  {variable.example && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">
                      Example: {variable.example}
                    </p>
                  )}
                </div>
                {variable.required && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-xs">
                    Required
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Content */}
      <div className="relative">
        {/* Toggle for compact mode */}
        {compact && (
          <button
            type="button"
            onClick={() => setIsContentOpen(!isContentOpen)}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-medium">
              {isContentOpen ? "Hide prompt" : "Show prompt"} ({lines.length} lines)
            </span>
            <motion.div
              animate={{ rotate: isContentOpen ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <ChevronDown className="size-4 text-muted-foreground" />
            </motion.div>
          </button>
        )}

        <AnimatePresence initial={false}>
          {isContentOpen && (
            <motion.div
              initial={compact ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              exit={compact ? { height: 0, opacity: 0 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="relative group">
                {/* Copy button */}
                <div className="absolute top-3 right-3 z-10">
                  <CopyButton
                    text={prompt.content}
                    variant="badge"
                    size="sm"
                    label="Copy prompt"
                    successMessage="Prompt copied!"
                    showPreview={false}
                    className="shadow-md"
                  />
                </div>

                {/* Content with syntax highlighting for variables */}
                <div className="p-4 pr-20 bg-[oklch(0.12_0.015_260)] overflow-x-auto">
                  <pre className="font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    <HighlightedContent content={prompt.content} variables={prompt.variables} />
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Explanation Section */}
      <div className="border-t border-border/50">
        <button
          type="button"
          onClick={() => setIsExplanationOpen(!isExplanationOpen)}
          className={cn(
            "flex items-center justify-between w-full px-4 py-3",
            "text-left transition-colors",
            "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="size-4" />
            <span className="text-sm font-medium">Why this structure?</span>
          </div>
          <motion.div
            animate={{ rotate: isExplanationOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isExplanationOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {prompt.explanation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Known Issues (if any) */}
      {prompt.knownIssues && prompt.knownIssues.length > 0 && (
        <div className="px-4 py-3 bg-destructive/5 border-t border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1">
                Known Issues
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {prompt.knownIssues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer with metadata */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border/50 text-xs text-muted-foreground">
        <span>
          Used in:{" "}
          {prompt.usedIn.map((step, i) => (
            <React.Fragment key={step}>
              {i > 0 && ", "}
              <span className="font-mono text-primary">{step}</span>
            </React.Fragment>
          ))}
        </span>
        <span>Last tested: {prompt.lastTested}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Compact List Item Version
// ============================================================================

export interface PromptListItemProps {
  prompt: PromptTemplate;
  onClick?: () => void;
  className?: string;
}

export function PromptListItem({ prompt, onClick, className }: PromptListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full p-4 text-left",
        "rounded-xl border border-border bg-card",
        "hover:border-primary/30 hover:shadow-md transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground">{prompt.name}</h4>
          <span className="text-xs text-muted-foreground font-mono">v{prompt.version}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 truncate">
          {prompt.content.split("\n")[0].slice(0, 60)}...
        </p>
      </div>
      <ChevronDown className="size-5 text-muted-foreground -rotate-90 shrink-0" />
    </button>
  );
}
