"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, autoResize = false, id, onChange, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const handleAutoResize = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea && autoResize) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [autoResize, textareaRef]);

    React.useEffect(() => {
      handleAutoResize();
    }, [handleAutoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleAutoResize();
      onChange?.(e);
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            // Base styles - text-base on mobile for better readability, text-sm on desktop
            "flex min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-3 text-base sm:text-sm",
            "transition-all duration-200 ease-out",
            "placeholder:text-muted-foreground/70",
            // Enhanced focus state with glow effect
            "focus:outline-none",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            // Default focus styles (only when not in error state)
            !error && [
              "focus:border-primary",
              "focus-visible:ring-ring/50",
              "focus:shadow-[0_0_0_3px_oklch(0.58_0.19_195_/_0.1),_0_0_20px_oklch(0.58_0.19_195_/_0.1)]",
              "dark:focus:shadow-[0_0_0_3px_oklch(0.72_0.18_195_/_0.15),_0_0_20px_oklch(0.72_0.18_195_/_0.15)]",
            ],
            // Error state with red glow
            error && [
              "border-destructive",
              "focus:border-destructive",
              "focus-visible:ring-destructive/50",
              "focus:shadow-[0_0_0_3px_oklch(0.60_0.22_25_/_0.1),_0_0_20px_oklch(0.60_0.22_25_/_0.1)]",
            ],
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
            // Touch-friendly: prevent zoom on focus in iOS
            "touch-manipulation",
            "resize-y",
            autoResize && "resize-none overflow-hidden",
            className,
          )}
          ref={textareaRef}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-destructive animate-fade-in">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
