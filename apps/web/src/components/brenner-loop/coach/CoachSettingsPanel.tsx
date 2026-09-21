/**
 * Coach Settings Panel
 *
 * UI for configuring coach mode settings.
 *
 * @see brenner_bot-reew.8 (bead)
 */

"use client";

import {
  BookOpen,
  Lightbulb,
  MessageSquare,
  PauseCircle,
  Quote,
  RotateCcw,
  Settings2,
  Shield,
} from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type CoachLevel, type CoachSettings, useCoach } from "@/lib/brenner-loop/coach-context";
import { cn } from "@/lib/utils";
import { CoachProgressStats, LevelBadge } from "./CoachProgress";

// ============================================================================
// Types
// ============================================================================

export interface CoachSettingsPanelProps {
  /** Whether to show progress stats */
  showProgress?: boolean;

  /** Callback when settings change */
  onSettingsChange?: (settings: CoachSettings) => void;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CoachSettingsPanel({
  showProgress = true,
  onSettingsChange,
  className,
}: CoachSettingsPanelProps): React.ReactElement {
  const { settings, effectiveLevel, updateSettings, resetSettings, resetProgress } = useCoach();

  const handleToggle = useCallback(
    (key: keyof CoachSettings, value: boolean) => {
      updateSettings({ [key]: value });
      onSettingsChange?.({ ...settings, [key]: value });
    },
    [updateSettings, onSettingsChange, settings],
  );

  const handleLevelChange = useCallback(
    (level: CoachLevel) => {
      updateSettings({ level });
      onSettingsChange?.({ ...settings, level });
    },
    [updateSettings, onSettingsChange, settings],
  );

  const settingItems = [
    {
      key: "showExamples" as const,
      label: "Show Examples",
      description: "Display worked examples for each phase",
      icon: BookOpen,
    },
    {
      key: "showExplanations" as const,
      label: "Show Explanations",
      description: "Display inline explanations for concepts",
      icon: Lightbulb,
    },
    {
      key: "showBrennerQuotes" as const,
      label: "Show Brenner Quotes",
      description: "Include relevant quotes from the Brenner corpus",
      icon: Quote,
    },
    {
      key: "showProgressTips" as const,
      label: "Show Progress Tips",
      description: "Display tips and encouragement as you work",
      icon: MessageSquare,
    },
    {
      key: "pauseForExplanation" as const,
      label: "Pause for Explanation",
      description: "Pause workflow to explain new concepts",
      icon: PauseCircle,
    },
    {
      key: "requireConfirmation" as const,
      label: "Require Confirmation",
      description: "Ask for confirmation before major actions",
      icon: Shield,
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main toggle card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Coach Mode
              </CardTitle>
              <CardDescription>Get guided help learning the Brenner Method</CardDescription>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => handleToggle("enabled", checked)}
            />
          </div>
        </CardHeader>

        {settings.enabled && (
          <CardContent className="space-y-6">
            {/* Level selector */}
            <div className="space-y-2">
              <Label>Coaching Level</Label>
              <div className="flex items-center gap-4">
                <Select
                  value={settings.level}
                  onValueChange={(value) => handleLevelChange(value as CoachLevel)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">
                      <span className="flex items-center gap-2">🌱 Beginner</span>
                    </SelectItem>
                    <SelectItem value="intermediate">
                      <span className="flex items-center gap-2">🌿 Intermediate</span>
                    </SelectItem>
                    <SelectItem value="advanced">
                      <span className="flex items-center gap-2">🌳 Advanced</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <LevelBadge level={effectiveLevel} compact />
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.level === "beginner" &&
                  "Full explanations and guidance for every concept."}
                {settings.level === "intermediate" &&
                  "Reduced explanations; help only when needed."}
                {settings.level === "advanced" && "Minimal guidance; coach available on demand."}
              </p>
            </div>

            {/* Setting toggles */}
            <div className="space-y-4">
              {settingItems.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={item.key}
                    checked={settings[item.key]}
                    onCheckedChange={(checked) => handleToggle(item.key, checked)}
                  />
                </div>
              ))}
            </div>

            {/* Reset button */}
            <div className="pt-4 border-t">
              <Button variant="outline" size="sm" onClick={resetSettings} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Progress card */}
      {showProgress && settings.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
            <CardDescription>Track your journey learning the Brenner Method</CardDescription>
          </CardHeader>
          <CardContent>
            <CoachProgressStats />

            {/* Reset progress button */}
            <div className="pt-4 mt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure? This will reset all your learning progress.")) {
                    resetProgress();
                  }
                }}
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Progress
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Compact Toggle
// ============================================================================

export interface CoachToggleProps {
  className?: string;
}

/**
 * Compact toggle for coach mode in headers/toolbars.
 */
export function CoachToggle({ className }: CoachToggleProps): React.ReactElement {
  const { settings, toggleCoach, effectiveLevel } = useCoach();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={toggleCoach}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
          settings.enabled
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            : "bg-muted text-muted-foreground",
        )}
        title={settings.enabled ? "Coach mode enabled" : "Coach mode disabled"}
      >
        <Lightbulb className="h-4 w-4" />
        <span className="hidden sm:inline">{settings.enabled ? "Coach On" : "Coach Off"}</span>
      </button>
      {settings.enabled && <LevelBadge level={effectiveLevel} compact />}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default CoachSettingsPanel;
