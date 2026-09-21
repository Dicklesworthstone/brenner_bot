/**
 * Session Template Selector
 *
 * UI component for selecting a session template when starting a new session.
 * Displays template cards with descriptions and allows preview of phase configuration.
 *
 * @see brenner_bot-reew.7 - FEATURE: Session Templates
 * @module components/brenner-loop/SessionTemplateSelector
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  FlaskConical,
  Info,
  Microscope,
  Settings,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPhaseName } from "@/lib/brenner-loop/session-machine";

import type { SessionTemplate } from "@/lib/brenner-loop/session-templates";
import {
  AGENT_ROLE_INFO,
  getFeaturedSessionTemplates,
  getPhaseOrderForTemplate,
  SESSION_TEMPLATES,
} from "@/lib/brenner-loop/session-templates";
import { cn } from "@/lib/utils";

// ============================================================================
// Icon Mapping
// ============================================================================

/**
 * Renders an icon based on template icon name.
 * Defined outside render to satisfy static component rules.
 */
function TemplateIcon({ iconName, className }: { iconName: string; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (iconName) {
    case "Zap":
      return <Zap className={cls} />;
    case "Microscope":
      return <Microscope className={cls} />;
    case "BookOpen":
      return <BookOpen className={cls} />;
    case "FlaskConical":
      return <FlaskConical className={cls} />;
    case "Swords":
      return <Swords className={cls} />;
    case "Settings":
    default:
      return <Settings className={cls} />;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface SessionTemplateSelectorProps {
  /** Currently selected template ID */
  selectedTemplateId?: string;

  /** Called when a template is selected */
  onSelectTemplate: (template: SessionTemplate) => void;

  /** Whether to show all templates or just featured */
  showAll?: boolean;

  /** Optional className */
  className?: string;
}

export interface CompactTemplateSelectorProps {
  /** Currently selected template ID */
  selectedTemplateId?: string;

  /** Called when a template is selected */
  onSelectTemplate: (template: SessionTemplate) => void;

  /** Optional className */
  className?: string;
}

// ============================================================================
// Template Card Component
// ============================================================================

interface TemplateCardProps {
  template: SessionTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function TemplateCard({ template, isSelected, onSelect, onPreview }: TemplateCardProps) {
  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={onSelect}
        className={cn(
          "relative w-full text-left rounded-lg border-2 p-4 transition-all",
          "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Selected indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-white",
              template.colorClass,
            )}
          >
            <TemplateIcon iconName={template.icon} className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {template.tagline}
            </p>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.expectedDuration}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {template.defaultAgents.length} agents
          </span>
        </div>

        {/* Depth badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant={
              template.defaultDepth === "quick"
                ? "secondary"
                : template.defaultDepth === "standard"
                  ? "default"
                  : "outline"
            }
            className="text-xs"
          >
            {template.defaultDepth}
          </Badge>
          {template.featured && (
            <Badge variant="default" className="text-xs bg-yellow-500">
              Recommended
            </Badge>
          )}
        </div>
      </motion.button>

      <button
        type="button"
        onClick={onPreview}
        className="absolute bottom-3 right-3 z-10 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Preview template details"
      >
        <Info className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

// ============================================================================
// Template Preview Dialog
// ============================================================================

interface TemplatePreviewDialogProps {
  template: SessionTemplate | null;
  open: boolean;
  onClose: () => void;
  onSelect: (template: SessionTemplate) => void;
}

function TemplatePreviewDialog({ template, open, onClose, onSelect }: TemplatePreviewDialogProps) {
  if (!template) return null;

  const phases = getPhaseOrderForTemplate(template);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center text-white",
                template.colorClass,
              )}
            >
              <TemplateIcon iconName={template.icon} className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle>{template.name}</DialogTitle>
              <DialogDescription>{template.tagline}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300">{template.description}</p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="w-4 h-4" />
              {template.expectedDuration}
            </span>
            <Badge variant="secondary">{template.defaultDepth} depth</Badge>
          </div>

          {/* Best for */}
          <div>
            <h4 className="text-sm font-medium mb-2">Best for:</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {template.bestFor.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Phases */}
          <div>
            <h4 className="text-sm font-medium mb-2">Phases:</h4>
            <div className="flex flex-wrap gap-1">
              {phases
                .filter((p) => p.phase !== "complete")
                .map(({ phase, status }) => (
                  <Badge
                    key={phase}
                    variant={
                      status === "required"
                        ? "default"
                        : status === "optional"
                          ? "secondary"
                          : "outline"
                    }
                    className={cn("text-xs", status === "skipped" && "opacity-50 line-through")}
                  >
                    {getPhaseName(phase)}
                  </Badge>
                ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Required
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                Optional
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-200 opacity-50" />
                Skipped
              </span>
            </div>
          </div>

          {/* Agents */}
          {template.defaultAgents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Default Agents:</h4>
              <div className="space-y-2">
                {template.defaultAgents.map((role) => {
                  const info = AGENT_ROLE_INFO[role];
                  return (
                    <div key={role} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {info.name}
                      </Badge>
                      <span className="text-gray-500 text-xs">{info.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onSelect(template);
              onClose();
            }}
          >
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Full session template selector with cards and preview.
 */
export function SessionTemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  showAll = false,
  className,
}: SessionTemplateSelectorProps) {
  const [previewTemplate, setPreviewTemplate] = useState<SessionTemplate | null>(null);

  const templates = showAll ? SESSION_TEMPLATES : getFeaturedSessionTemplates();

  const handleSelect = useCallback(
    (template: SessionTemplate) => {
      onSelectTemplate(template);
    },
    [onSelectTemplate],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Choose Session Type
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a template that matches your research needs
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => handleSelect(template)}
              onPreview={() => setPreviewTemplate(template)}
            />
          ))}
        </AnimatePresence>
      </div>

      {!showAll && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setPreviewTemplate(SESSION_TEMPLATES.find((t) => t.id === "custom") ?? null)
            }
          >
            <Settings className="w-4 h-4 mr-2" />
            Custom Session
          </Button>
        </div>
      )}

      <TemplatePreviewDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelect={handleSelect}
      />
    </div>
  );
}

// ============================================================================
// Compact Selector
// ============================================================================

/**
 * Compact template selector for inline use.
 * Shows templates in a horizontal list with minimal info.
 */
export function CompactTemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  className,
}: CompactTemplateSelectorProps) {
  const templates = getFeaturedSessionTemplates();

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {templates.map((template) => {
        const isSelected = selectedTemplateId === template.id;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelectTemplate(template)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
              "text-sm font-medium",
              isSelected
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
            )}
          >
            <TemplateIcon iconName={template.icon} className="w-4 h-4" />
            {template.name}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Dropdown Selector
// ============================================================================

export interface TemplateDropdownProps {
  selectedTemplateId?: string;
  onSelectTemplate: (template: SessionTemplate) => void;
  className?: string;
}

/**
 * Dropdown-style template selector.
 * Good for space-constrained UIs.
 */
export function TemplateDropdown({
  selectedTemplateId,
  onSelectTemplate,
  className,
}: TemplateDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedTemplate = selectedTemplateId
    ? SESSION_TEMPLATES.find((t) => t.id === selectedTemplateId)
    : null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border",
          "text-sm font-medium transition-all",
          "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        )}
      >
        <span className="flex items-center gap-2">
          <TemplateIcon iconName={selectedTemplate?.icon ?? "Settings"} className="w-4 h-4" />
          {selectedTemplate?.name ?? "Select Template"}
        </span>
        <ChevronRight className={cn("w-4 h-4 transition-transform", open && "rotate-90")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          >
            {SESSION_TEMPLATES.map((template) => {
              const isSelected = selectedTemplateId === template.id;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onSelectTemplate(template);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 text-left text-sm",
                    "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                    isSelected && "bg-blue-50 dark:bg-blue-950",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded flex items-center justify-center text-white",
                      template.colorClass,
                    )}
                  >
                    <TemplateIcon iconName={template.icon} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {template.expectedDuration}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
