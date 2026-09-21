"use client";

/**
 * Dialog Component
 *
 * A polished, accessible modal dialog with world-class UX:
 * - Smooth spring-based animations
 * - Backdrop blur with elegant overlay
 * - Touch-friendly close button (44px target)
 * - Multiple size variants
 * - Keyboard navigation support
 * - Focus management with visible indicators
 * - Mobile-responsive (full-screen on small devices)
 *
 * @module components/ui/dialog
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Icons
// ============================================================================

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================================
// Root Components
// ============================================================================

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

// ============================================================================
// Overlay
// ============================================================================

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-50",
      // Elegant backdrop with blur
      "bg-black/60 backdrop-blur-sm",
      // Smooth fade animation
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "duration-200",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ============================================================================
// Content Variants
// ============================================================================

const dialogContentVariants = cva(
  [
    // Base positioning
    "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
    // Layout
    "grid w-full gap-4 p-6",
    // Styling
    "border bg-card text-card-foreground shadow-2xl",
    // Animation
    "duration-300",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
    // Focus styling
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "max-w-sm rounded-xl",
        default: "max-w-lg rounded-xl sm:rounded-2xl",
        lg: "max-w-2xl rounded-xl sm:rounded-2xl",
        xl: "max-w-4xl rounded-xl sm:rounded-2xl",
        // Full screen on mobile, large modal on desktop
        full: [
          "max-w-full h-full sm:max-w-4xl sm:h-auto sm:max-h-[90vh]",
          "rounded-none sm:rounded-2xl",
        ].join(" "),
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

// ============================================================================
// Content
// ============================================================================

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Hide the close button */
  hideCloseButton?: boolean;
  /** Custom close button aria-label */
  closeButtonLabel?: string;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    { className, children, size, hideCloseButton = false, closeButtonLabel = "Close", ...props },
    ref,
  ) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        data-size={size}
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              // Positioning
              "absolute right-3 top-3",
              // Touch-friendly size (44px minimum)
              "size-11 sm:size-10",
              // Styling
              "rounded-full flex items-center justify-center",
              "text-muted-foreground",
              // Transitions
              "transition-all duration-150",
              // Hover state
              "hover:bg-muted hover:text-foreground",
              // Active/pressed state
              "active:scale-95 active:bg-muted/80",
              // Focus state
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Disabled state
              "disabled:pointer-events-none disabled:opacity-50",
            )}
            aria-label={closeButtonLabel}
          >
            <CloseIcon />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

// ============================================================================
// Header
// ============================================================================

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add a subtle separator line below the header */
  separated?: boolean;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, separated = false, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dialog-header"
      className={cn(
        "flex flex-col space-y-2",
        // Right padding for close button
        "pr-10",
        // Optional separator
        separated && "pb-4 border-b border-border",
        className,
      )}
      {...props}
    />
  ),
);
DialogHeader.displayName = "DialogHeader";

// ============================================================================
// Footer
// ============================================================================

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add a subtle separator line above the footer */
  separated?: boolean;
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, separated = false, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dialog-footer"
      className={cn(
        // Stack on mobile, row on desktop
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3",
        // Optional separator
        separated && "pt-4 border-t border-border",
        className,
      )}
      {...props}
    />
  ),
);
DialogFooter.displayName = "DialogFooter";

// ============================================================================
// Title
// ============================================================================

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight",
      "text-foreground",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// ============================================================================
// Description
// ============================================================================

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ============================================================================
// Body (optional content wrapper)
// ============================================================================

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable scrolling for long content */
  scrollable?: boolean;
}

const DialogBody = React.forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, scrollable = false, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dialog-body"
      className={cn(
        "py-2",
        scrollable && "overflow-y-auto max-h-[60vh] overscroll-contain -mx-6 px-6",
        className,
      )}
      {...props}
    />
  ),
);
DialogBody.displayName = "DialogBody";

// ============================================================================
// Exports
// ============================================================================

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogContentVariants,
};
