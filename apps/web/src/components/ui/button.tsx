import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-all duration-150 ease-out touch-manipulation select-none",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Press feedback: scale down slightly on press with subtle ripple
    "active:scale-[0.98] ripple",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground shadow-sm",
          "hover:bg-primary/90 hover:shadow-md",
          "active:bg-primary/95 active:shadow-sm",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground shadow-sm",
          "hover:bg-destructive/90 hover:shadow-md",
          "active:bg-destructive/95",
          "focus-visible:ring-destructive/50",
        ].join(" "),
        outline: [
          "border border-border bg-background shadow-xs",
          "hover:bg-muted hover:border-border-hover",
          "active:bg-muted/80",
          "dark:bg-card dark:hover:bg-muted",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground shadow-xs",
          "hover:bg-secondary-hover",
          "active:bg-secondary",
        ].join(" "),
        ghost: [
          "hover:bg-muted hover:text-foreground",
          "active:bg-muted/80",
          "dark:hover:bg-muted/50 dark:active:bg-muted/30",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
          "active:scale-100 active:text-primary/80",
        ].join(" "),
        glow: [
          "bg-primary text-primary-foreground shadow-md",
          "hover:shadow-lg hover:shadow-primary/25",
          "active:shadow-md",
          "dark:hover:shadow-primary/40",
        ].join(" "),
      },
      size: {
        // Touch-friendly heights: 44px on mobile, 40px on desktop
        default: "h-11 sm:h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 text-base has-[>svg]:px-4",
        xl: "h-14 rounded-xl px-8 text-lg has-[>svg]:px-6",
        // Icon buttons: 44px on mobile for touch, 40px on desktop
        icon: "size-11 sm:size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      loading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
