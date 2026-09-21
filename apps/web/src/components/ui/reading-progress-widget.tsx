"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ReadingProgressWidgetProps {
  className?: string;
  showTimeEstimate?: boolean;
  wordsPerMinute?: number;
}

export function ReadingProgressWidget({
  className,
  showTimeEstimate = true,
  wordsPerMinute = 200,
}: ReadingProgressWidgetProps) {
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState<string>("");

  // Cache total word count to avoid recalculating on every scroll
  const totalWordsRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Calculate total words once on mount
    const mainContent = document.querySelector("main");
    const text = mainContent?.textContent ?? "";
    totalWordsRef.current = text.split(/\s+/).filter(Boolean).length;

    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      const clampedProgress = Math.min(100, Math.max(0, scrollPercent));

      setProgress(clampedProgress);
      setVisible(scrollTop > 200);

      // Calculate time remaining using cached word count
      if (showTimeEstimate && docHeight > 0 && totalWordsRef.current !== null) {
        const remainingPercent = 100 - clampedProgress;
        const remainingWords = Math.round((remainingPercent / 100) * totalWordsRef.current);
        const minutesRemaining = Math.ceil(remainingWords / wordsPerMinute);

        if (minutesRemaining <= 0) {
          setTimeRemaining("");
        } else if (minutesRemaining === 1) {
          setTimeRemaining("1 min left");
        } else {
          setTimeRemaining(`${minutesRemaining} min left`);
        }
      }
    };

    window.addEventListener("scroll", calculateProgress, { passive: true });
    calculateProgress();

    return () => window.removeEventListener("scroll", calculateProgress);
  }, [showTimeEstimate, wordsPerMinute]);

  // SVG circle calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("reading-widget", visible && "visible", className)}>
      <div className="reading-widget-progress">
        <svg viewBox="0 0 48 48">
          <circle className="reading-widget-progress-bg" cx="24" cy="24" r={radius} />
          <circle
            className="reading-widget-progress-bar"
            cx="24"
            cy="24"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <span className="reading-widget-text">{Math.round(progress)}%</span>
      </div>
      {showTimeEstimate && timeRemaining && (
        <div className="reading-widget-time">{timeRemaining}</div>
      )}
    </div>
  );
}

// Compact inline reading progress (for headers)
export function ReadingProgressInline({ className }: { className?: string }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    window.addEventListener("scroll", calculateProgress, { passive: true });
    calculateProgress();

    return () => window.removeEventListener("scroll", calculateProgress);
  }, []);

  if (progress === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span>{Math.round(progress)}%</span>
    </div>
  );
}
