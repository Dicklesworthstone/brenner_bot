"use client";

/**
 * Domain Selector Component
 *
 * Allows users to select their research domain at session start.
 * This selection customizes the Brenner Loop experience with domain-specific:
 * - Common confounds
 * - Research designs
 * - Effect size norms
 * - Literature sources
 *
 * @see brenner_bot-ukd1.4 - FEATURE: Domain Templates
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  Brain,
  Check,
  ChevronRight,
  Code,
  HeartPulse,
  Info,
  Microscope,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type DomainId,
  type DomainOption,
  getDomainTemplate,
  listDomainOptions,
} from "@/lib/brenner-loop/domains";

// ============================================================================
// Icon Rendering
// ============================================================================

/**
 * Renders an icon by name. This avoids creating components during render.
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
    case "Microscope":
      return <Microscope {...props} />;
    case "Code":
      return <Code {...props} />;
    case "Zap":
      return <Zap {...props} />;
    case "Atom":
      return <Atom {...props} />;
    default:
      return <Settings {...props} />;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface DomainSelectorProps {
  /** Currently selected domain (controlled) */
  selectedDomain?: DomainId;

  /** Callback when domain is selected */
  onSelect?: (domainId: DomainId) => void;

  /** Whether to show expanded details */
  showDetails?: boolean;

  /** Whether the selection is disabled */
  disabled?: boolean;

  /** Optional class name for the container */
  className?: string;
}

// ============================================================================
// Domain Card Component
// ============================================================================

interface DomainCardProps {
  option: DomainOption;
  selected: boolean;
  onSelect: () => void;
  showDetails: boolean;
  disabled: boolean;
}

function DomainCard({ option, selected, onSelect, showDetails, disabled }: DomainCardProps) {
  const template = showDetails ? getDomainTemplate(option.id) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
    >
      <Card
        className={`
          relative cursor-pointer transition-all duration-200
          ${
            selected
              ? "ring-2 ring-primary border-primary bg-primary/5"
              : "hover:border-muted-foreground/50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onClick={disabled ? undefined : onSelect}
        role="button"
        aria-pressed={selected}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {/* Selection indicator */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" />
            </div>
          </motion.div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${option.colorClass}`}>
              {renderIcon(option.icon, "h-5 w-5")}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{option.name}</CardTitle>
              <CardDescription className="text-sm line-clamp-2">
                {option.description}
              </CardDescription>
            </div>
            <ChevronRight
              className={`h-5 w-5 text-muted-foreground transition-transform ${selected ? "rotate-90" : ""}`}
            />
          </div>
        </CardHeader>

        {/* Expanded details when selected and showDetails is true */}
        <AnimatePresence>
          {selected && showDetails && template && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Common Confounds</p>
                    <div className="flex flex-wrap gap-1">
                      {template.confoundLibrary.slice(0, 3).map((c) => (
                        <Badge key={c.id} variant="secondary" className="text-xs">
                          {c.name}
                        </Badge>
                      ))}
                      {template.confoundLibrary.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.confoundLibrary.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Effect Size Norm</p>
                    <p className="text-foreground">
                      {template.effectSizeNorms.metric}: {template.effectSizeNorms.medium} (medium)
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Research Designs</p>
                    <div className="flex flex-wrap gap-1">
                      {template.researchDesigns.slice(0, 2).map((d) => (
                        <Badge key={d.id} variant="outline" className="text-xs">
                          {d.name}
                        </Badge>
                      ))}
                      {template.researchDesigns.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.researchDesigns.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Key Resources</p>
                    <p className="text-foreground">
                      {template.literatureSources
                        .filter((s) => s.priority === "primary")
                        .map((s) => s.name)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DomainSelector({
  selectedDomain,
  onSelect,
  showDetails = true,
  disabled = false,
  className = "",
}: DomainSelectorProps) {
  const options = React.useMemo(() => listDomainOptions(), []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Your Research Domain</h3>
          <p className="text-sm text-muted-foreground">
            This helps us provide domain-specific guidance on confounds, designs, and effect sizes.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>
                Different fields have different common confounds and research norms. Selecting your
                domain customizes the Brenner Loop to catch field-specific pitfalls.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Domain Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((option) => (
          <DomainCard
            key={option.id}
            option={option}
            selected={selectedDomain === option.id}
            onSelect={() => onSelect?.(option.id)}
            showDetails={showDetails}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Custom domain option */}
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => onSelect?.("custom")}
          disabled={disabled}
        >
          <Settings className="h-4 w-4 mr-2" />
          Use custom domain settings
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Selector (for inline use)
// ============================================================================

export interface CompactDomainSelectorProps {
  selectedDomain?: DomainId;
  onSelect?: (domainId: DomainId) => void;
  disabled?: boolean;
}

export function CompactDomainSelector({
  selectedDomain,
  onSelect,
  disabled = false,
}: CompactDomainSelectorProps) {
  const options = React.useMemo(() => listDomainOptions(), []);
  const selected = selectedDomain ? getDomainTemplate(selectedDomain) : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Domain:</span>
      {options.map((option) => {
        const isSelected = selectedDomain === option.id;

        return (
          <TooltipProvider key={option.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`h-8 ${isSelected ? option.colorClass : ""}`}
                  onClick={() => onSelect?.(option.id)}
                  disabled={disabled}
                >
                  {renderIcon(option.icon, "h-4 w-4 mr-1")}
                  {option.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{option.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {selected && (
        <span className="text-xs text-muted-foreground ml-2">
          ({selected.confoundLibrary.length} confounds tracked)
        </span>
      )}
    </div>
  );
}

export default DomainSelector;
