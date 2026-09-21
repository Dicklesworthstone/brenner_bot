"use client";

/**
 * Label Component
 *
 * A polished, accessible form label with world-class UX:
 * - Required/optional field indicators
 * - Error state styling
 * - Inline description/help text support
 * - Size variants
 * - Disabled state handling
 * - Consistent with form design patterns
 *
 * @module components/ui/label
 */

import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Variants
// ============================================================================

const labelVariants = cva(
  [
    "font-medium leading-none",
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
    "transition-colors duration-150",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
      error: {
        true: "text-destructive",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      error: false,
    },
  },
);

// ============================================================================
// Types
// ============================================================================

interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  /** Show required indicator (*) */
  required?: boolean;
  /** Show optional indicator text */
  optional?: boolean;
  /** Inline description/help text */
  description?: string;
  /** Error state - changes color to destructive */
  error?: boolean;
}

// ============================================================================
// Label Component
// ============================================================================

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, size, error, required, optional, description, children, ...props }, ref) => (
    <div data-slot="label-wrapper" className="flex flex-col gap-1">
      <LabelPrimitive.Root
        ref={ref}
        data-slot="label"
        data-error={error || undefined}
        className={cn(labelVariants({ size, error }), "inline-flex items-center gap-1", className)}
        {...props}
      >
        {children}
        {required && (
          <span
            data-slot="label-required"
            className="text-destructive font-semibold"
            aria-hidden="true"
          >
            *
          </span>
        )}
        {optional && !required && (
          <span
            data-slot="label-optional"
            className="text-muted-foreground font-normal text-xs ml-1"
          >
            (optional)
          </span>
        )}
      </LabelPrimitive.Root>
      {description && (
        <span
          data-slot="label-description"
          className={cn(
            "text-xs leading-relaxed",
            error ? "text-destructive/80" : "text-muted-foreground",
          )}
        >
          {description}
        </span>
      )}
    </div>
  ),
);
Label.displayName = LabelPrimitive.Root.displayName;

// ============================================================================
// Simple Label (no wrapper, for inline use)
// ============================================================================

const LabelSimple = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  Omit<LabelProps, "description">
>(({ className, size, error, required, optional, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    data-slot="label"
    data-error={error || undefined}
    className={cn(labelVariants({ size, error }), "inline-flex items-center gap-1", className)}
    {...props}
  >
    {children}
    {required && (
      <span
        data-slot="label-required"
        className="text-destructive font-semibold"
        aria-hidden="true"
      >
        *
      </span>
    )}
    {optional && !required && (
      <span data-slot="label-optional" className="text-muted-foreground font-normal text-xs ml-1">
        (optional)
      </span>
    )}
  </LabelPrimitive.Root>
));
LabelSimple.displayName = "LabelSimple";

// ============================================================================
// Form Field Wrapper (combines label + input + error message)
// ============================================================================

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label text */
  label: string;
  /** HTML for attribute to connect label to input */
  htmlFor?: string;
  /** Show required indicator */
  required?: boolean;
  /** Show optional indicator */
  optional?: boolean;
  /** Description/help text */
  description?: string;
  /** Error message to display */
  error?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      label,
      htmlFor,
      required,
      optional,
      description,
      error,
      size = "default",
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      data-slot="form-field"
      data-error={!!error || undefined}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      <Label
        htmlFor={htmlFor}
        required={required}
        optional={optional}
        description={description}
        error={!!error}
        size={size}
      >
        {label}
      </Label>
      {children}
      {error && (
        <span
          data-slot="form-field-error"
          role="alert"
          className="text-xs text-destructive flex items-center gap-1"
        >
          <svg
            className="size-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          {error}
        </span>
      )}
    </div>
  ),
);
FormField.displayName = "FormField";

// ============================================================================
// Exports
// ============================================================================

export { FormField, Label, LabelSimple, labelVariants };
