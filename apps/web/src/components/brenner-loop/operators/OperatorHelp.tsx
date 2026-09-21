"use client";

/**
 * OperatorHelp - Comprehensive help panel for operator sessions
 *
 * Provides extended documentation, Brenner examples, common mistakes,
 * and success criteria for each operator. Can be triggered from the
 * help button in the operator header.
 *
 * @see brenner_bot-yh1c (bead)
 * @module components/brenner-loop/operators/OperatorHelp
 */

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Quote,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOperatorDocumentation, getStepTip } from "@/lib/brenner-loop/operators/docs";
import type { OperatorType } from "@/lib/brenner-loop/operators/framework";
import { OPERATOR_METADATA } from "@/lib/brenner-loop/operators/framework";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface OperatorHelpProps {
  /** The operator type */
  operatorType: OperatorType;
  /** Current step ID (for contextual tips) */
  currentStepId?: string;
  /** Variant for trigger button */
  variant?: "icon" | "button" | "text";
  /** Additional CSS classes for trigger */
  className?: string;
}

export interface OperatorHelpPanelProps {
  /** The operator type */
  operatorType: OperatorType;
  /** Current step ID */
  currentStepId?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Section Components
// ============================================================================

interface HelpSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function HelpSection({ title, icon, children, className }: HelpSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

interface BulletListProps {
  items: string[];
  className?: string;
}

function BulletList({ items, className }: BulletListProps) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
          <ChevronRight className="size-4 flex-shrink-0 mt-0.5 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// Help Panel Content
// ============================================================================

export function OperatorHelpPanel({
  operatorType,
  currentStepId,
  className,
}: OperatorHelpPanelProps) {
  const docs = getOperatorDocumentation(operatorType);
  const currentTip = currentStepId ? getStepTip(operatorType, currentStepId) : undefined;

  return (
    <div className={cn("space-y-8", className)}>
      {/* Current Step Tip (if available) */}
      {currentTip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm mb-1">{currentTip.headline}</h3>
              <p className="text-sm text-muted-foreground">{currentTip.guidance}</p>

              {currentTip.example && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Example
                  </p>
                  <p className="text-sm italic">{currentTip.example}</p>
                </div>
              )}

              {currentTip.antiPattern && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                    Avoid
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">{currentTip.antiPattern}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guidance">Guidance</TabsTrigger>
          <TabsTrigger value="example">Example</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Key Question */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">
              Key Question
            </p>
            <p className="text-lg font-medium">&ldquo;{docs.keyQuestion}&rdquo;</p>
          </div>

          {/* Concept */}
          <HelpSection
            title="What This Operator Does"
            icon={<BookOpen className="size-4 text-blue-500" />}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{docs.concept}</p>
          </HelpSection>

          {/* When to Use */}
          <HelpSection
            title="When to Use"
            icon={<CheckCircle2 className="size-4 text-green-500" />}
          >
            <BulletList items={docs.whenToUse} />
          </HelpSection>

          {/* When NOT to Use */}
          {docs.whenNotToUse && docs.whenNotToUse.length > 0 && (
            <HelpSection
              title="When NOT to Use"
              icon={<AlertTriangle className="size-4 text-amber-500" />}
            >
              <BulletList items={docs.whenNotToUse} />
            </HelpSection>
          )}
        </TabsContent>

        {/* Guidance Tab */}
        <TabsContent value="guidance" className="space-y-6 mt-4">
          {/* Common Mistakes */}
          <HelpSection
            title="Common Mistakes"
            icon={<AlertTriangle className="size-4 text-red-500" />}
          >
            <div className="space-y-2">
              {docs.commonMistakes.map((mistake, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50"
                >
                  <span className="text-red-500 font-medium text-sm">{index + 1}.</span>
                  <p className="text-sm text-red-700 dark:text-red-300">{mistake}</p>
                </div>
              ))}
            </div>
          </HelpSection>

          {/* Success Criteria */}
          <HelpSection
            title="Success Criteria"
            icon={<CheckCircle2 className="size-4 text-green-500" />}
          >
            <div className="space-y-2">
              {docs.successCriteria.map((criterion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50"
                >
                  <CheckCircle2 className="size-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">{criterion}</p>
                </div>
              ))}
            </div>
          </HelpSection>
        </TabsContent>

        {/* Example Tab */}
        <TabsContent value="example" className="space-y-6 mt-4">
          {/* Brenner Example */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Quote className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium text-sm">From Brenner&apos;s Work</h3>
                <p className="text-xs text-muted-foreground">{docs.brennerExample.title}</p>
              </div>
            </div>

            <blockquote className="pl-4 border-l-2 border-amber-400 italic text-sm text-muted-foreground leading-relaxed">
              {docs.brennerExample.description}
            </blockquote>

            {docs.brennerExample.quoteSection && (
              <p className="mt-3 text-xs text-muted-foreground">
                See also: <span className="font-mono">{docs.brennerExample.quoteSection}</span> in
                the corpus
              </p>
            )}
          </div>

          {/* Full Explanation */}
          <HelpSection
            title="Detailed Explanation"
            icon={<BookOpen className="size-4 text-blue-500" />}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {docs.explanation}
              </p>
            </div>
          </HelpSection>

          {/* Relevant Sections */}
          {docs.relevantQuoteSections.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Related Corpus Sections
              </p>
              <div className="flex flex-wrap gap-2">
                {docs.relevantQuoteSections.map((section) => (
                  <span
                    key={section}
                    className="px-2 py-1 text-xs font-mono rounded bg-background border border-border"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Main Help Component (with Dialog trigger)
// ============================================================================

export function OperatorHelp({
  operatorType,
  currentStepId,
  variant = "icon",
  className,
}: OperatorHelpProps) {
  const metadata = OPERATOR_METADATA[operatorType];
  const [open, setOpen] = React.useState(false);

  const triggerContent = React.useMemo(() => {
    switch (variant) {
      case "icon":
        return (
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground hover:text-foreground", className)}
          >
            <HelpCircle className="size-5" />
            <span className="sr-only">Help</span>
          </Button>
        );
      case "button":
        return (
          <Button variant="outline" size="sm" className={className}>
            <HelpCircle className="size-4 mr-2" />
            Help
          </Button>
        );
      case "text":
        return (
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors",
              className,
            )}
          >
            <HelpCircle className="size-4" />
            <span>How does this work?</span>
          </button>
        );
    }
  }, [variant, className]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerContent}</DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader separated>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center size-10 rounded-xl text-lg font-semibold",
                operatorType === "level_split" && "bg-blue-500/10 text-blue-500",
                operatorType === "exclusion_test" && "bg-green-500/10 text-green-500",
                operatorType === "object_transpose" && "bg-purple-500/10 text-purple-500",
                operatorType === "scale_check" && "bg-orange-500/10 text-orange-500",
              )}
            >
              {metadata.symbol}
            </div>
            <div>
              <DialogTitle>{metadata.name} Help</DialogTitle>
              <DialogDescription>{metadata.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody scrollable>
          <OperatorHelpPanel operatorType={operatorType} currentStepId={currentStepId} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default OperatorHelp;
