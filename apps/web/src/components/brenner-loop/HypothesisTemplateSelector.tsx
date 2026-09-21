"use client";

/**
 * Hypothesis Template Selector Component
 *
 * Allows users to browse and select hypothesis templates by domain.
 * Provides a "Start from Example" experience for new sessions.
 *
 * @see brenner_bot-838e - FEATURE: Hypothesis Template Library
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Code,
  HeartPulse,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getFeaturedTemplates,
  getTemplate,
  type HypothesisTemplate,
  searchTemplates,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from "@/lib/brenner-loop/hypothesis-templates";

// ============================================================================
// Icon Rendering
// ============================================================================

/**
 * Renders an icon by name.
 */
function renderIcon(iconName: string, className?: string): React.ReactNode {
  const props = { className };
  switch (iconName) {
    case "Brain":
      return <Brain {...props} />;
    case "HeartPulse":
      return <HeartPulse {...props} />;
    case "TrendingUp":
      return <TrendingUp {...props} />;
    case "Code":
      return <Code {...props} />;
    case "Zap":
      return <Zap {...props} />;
    case "Settings":
      return <Settings {...props} />;
    default:
      return <BookOpen {...props} />;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface HypothesisTemplateSelectorProps {
  /** Callback when a template is selected */
  onSelect?: (template: HypothesisTemplate) => void;

  /** Whether to show the selector in compact mode */
  compact?: boolean;

  /** Optional class name */
  className?: string;

  /** Whether selection is disabled */
  disabled?: boolean;
}

// ============================================================================
// Category Card Component
// ============================================================================

interface CategoryCardProps {
  category: TemplateCategory;
  selected: boolean;
  onSelect: () => void;
  templateCount: number;
}

function CategoryCard({ category, selected, onSelect, templateCount }: CategoryCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-lg border transition-all duration-200
        ${
          selected
            ? "ring-2 ring-primary border-primary bg-primary/5"
            : "hover:border-muted-foreground/50 bg-card"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${category.colorClass}`}>
          {renderIcon(category.icon, "h-5 w-5")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{category.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {templateCount} template{templateCount !== 1 ? "s" : ""}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${selected ? "rotate-90" : ""}`}
        />
      </div>
    </motion.button>
  );
}

// ============================================================================
// Template Card Component
// ============================================================================

interface TemplateCardProps {
  template: HypothesisTemplate;
  onSelect: () => void;
  onPreview: () => void;
}

function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  const difficultyColors = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Card className="relative group hover:shadow-md transition-shadow">
      {template.featured && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="text-sm mt-1 line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className={difficultyColors[template.difficulty]}>
            {template.difficulty}
          </Badge>
          {template.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onPreview}>
            Preview
          </Button>
          <Button size="sm" className="flex-1" onClick={onSelect}>
            Use Template
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Template Preview Dialog
// ============================================================================

interface TemplatePreviewProps {
  template: HypothesisTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
}

function TemplatePreview({ template, open, onOpenChange, onSelect }: TemplatePreviewProps) {
  if (!template) return null;

  const content = template.template;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.name}
            {template.featured && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Statement */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Hypothesis Statement
              </h4>
              <p className="text-foreground bg-muted/50 p-3 rounded-lg">{content.statement}</p>
            </div>

            {/* Mechanism */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Proposed Mechanism</h4>
              <p className="text-foreground bg-muted/50 p-3 rounded-lg">{content.mechanism}</p>
            </div>

            {/* Predictions If True */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Predictions If True
              </h4>
              <ul className="space-y-1">
                {content.predictionsIfTrue.map((pred, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>{pred}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Predictions If False */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Predictions If False
              </h4>
              <ul className="space-y-1">
                {content.predictionsIfFalse.map((pred, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <X className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <span>{pred}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Falsification Conditions */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                What Would Falsify This (Impossible If True)
              </h4>
              <ul className="space-y-1">
                {content.impossibleIfTrue.map((cond, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                    <span className="shrink-0">⚠️</span>
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confounds */}
            {content.confounds.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Confounds to Consider
                </h4>
                <div className="space-y-2">
                  {content.confounds.map((confound, i) => (
                    <div key={i} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{confound.name}</span>
                        {confound.likelihood !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(confound.likelihood * 100)}% likely
                          </Badge>
                        )}
                      </div>
                      {confound.description && (
                        <p className="text-sm text-muted-foreground mt-1">{confound.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assumptions */}
            {content.assumptions.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Background Assumptions
                </h4>
                <ul className="space-y-1">
                  {content.assumptions.map((assumption, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Confidence */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Suggested starting confidence:</span>
              <Badge variant="outline">{content.suggestedConfidence}%</Badge>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSelect}>
            Use This Template
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function HypothesisTemplateSelector({
  onSelect,
  compact = false,
  className = "",
  disabled = false,
}: HypothesisTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [previewTemplate, setPreviewTemplate] = React.useState<HypothesisTemplate | null>(null);

  // Get templates to display
  const displayedTemplates = React.useMemo(() => {
    if (searchQuery.trim()) {
      return searchTemplates(searchQuery);
    }

    if (selectedCategory) {
      const category = TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory);
      if (category) {
        return category.templateIds
          .map((id) => getTemplate(id))
          .filter((t): t is HypothesisTemplate => t !== undefined);
      }
    }

    return getFeaturedTemplates();
  }, [selectedCategory, searchQuery]);

  const handleSelect = (template: HypothesisTemplate) => {
    onSelect?.(template);
    setPreviewTemplate(null);
  };

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Start from template:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {getFeaturedTemplates()
            .slice(0, 4)
            .map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => handleSelect(template)}
                disabled={disabled}
              >
                {template.name}
              </Button>
            ))}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={disabled}>
                Browse all...
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>Hypothesis Template Library</DialogTitle>
                <DialogDescription>
                  Choose a template to start from. Templates provide example hypotheses with
                  discriminative structure you can customize.
                </DialogDescription>
              </DialogHeader>
              <HypothesisTemplateSelector onSelect={onSelect} disabled={disabled} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value) setSelectedCategory(null);
          }}
          className="pl-10"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Categories */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Categories</h3>
          <div className="space-y-2">
            {TEMPLATE_CATEGORIES.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                selected={selectedCategory === category.id}
                onSelect={() => {
                  setSelectedCategory(category.id);
                  setSearchQuery("");
                }}
                templateCount={category.templateIds.length}
              />
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {searchQuery
                ? `Search results (${displayedTemplates.length})`
                : selectedCategory
                  ? TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.name
                  : "Featured Templates"}
            </h3>
            {selectedCategory && !searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                Show featured
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory ?? searchQuery ?? "featured"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {displayedTemplates.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No templates found. Try a different search or category.
                </div>
              ) : (
                displayedTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => handleSelect(template)}
                    onPreview={() => setPreviewTemplate(template)}
                  />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Preview Dialog */}
      <TemplatePreview
        template={previewTemplate}
        open={previewTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewTemplate(null);
        }}
        onSelect={() => previewTemplate && handleSelect(previewTemplate)}
      />
    </div>
  );
}

// ============================================================================
// Compact Template Picker (for inline use)
// ============================================================================

export interface CompactTemplatePickerProps {
  /** Callback when a template is selected */
  onSelect?: (template: HypothesisTemplate) => void;

  /** Currently selected template ID */
  selectedId?: string;

  /** Whether selection is disabled */
  disabled?: boolean;
}

export function CompactTemplatePicker({
  onSelect,
  selectedId,
  disabled = false,
}: CompactTemplatePickerProps) {
  const featured = getFeaturedTemplates();
  const selectedTemplate = selectedId ? getTemplate(selectedId) : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Template:</span>
      {featured.map((template) => {
        const isSelected = selectedId === template.id;

        return (
          <Button
            key={template.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => onSelect?.(template)}
            disabled={disabled}
          >
            {template.name}
          </Button>
        );
      })}

      {selectedTemplate && (
        <span className="text-xs text-muted-foreground ml-2">({selectedTemplate.difficulty})</span>
      )}
    </div>
  );
}

export default HypothesisTemplateSelector;
