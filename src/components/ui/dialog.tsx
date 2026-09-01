"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/** Portaled menus sit outside dialog bounds; an outside click would otherwise close both. */
const FLOATING_UI_SELECTOR = [
  "[data-radix-dropdown-menu-content]",
  "[data-radix-select-content]",
  "[data-radix-popover-content]",
  "[data-radix-popper-content-wrapper]",
].join(",");

function originalEventTarget(event: { detail?: { originalEvent?: Event } }): EventTarget | null {
  return event.detail?.originalEvent?.target ?? null;
}

function preventDismissWhileFloatingUiOpen(event: {
  preventDefault: () => void;
  detail?: { originalEvent?: Event };
}) {
  if (document.querySelector(FLOATING_UI_SELECTOR)) {
    event.preventDefault();
    return;
  }
  // Nested dialogs: a click inside another [role=dialog] is "outside" this one.
  // Radix would otherwise dismiss and swallow the click (Save on a confirm prompt).
  const clicked = originalEventTarget(event);
  if (clicked instanceof Element && clicked.closest('[role="dialog"]')) {
    event.preventDefault();
  }
}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string;
    hideCloseButton?: boolean;
    closeButtonClassName?: string;
  }
>(
  (
    {
      className,
      children,
      overlayClassName,
      hideCloseButton = false,
      closeButtonClassName,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      ...props
    },
    ref,
  ) => (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[6px] border border-border bg-card p-5 shadow-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        onPointerDownOutside={(event) => {
          preventDismissWhileFloatingUiOpen(event);
          onPointerDownOutside?.(event);
        }}
        onFocusOutside={(event) => {
          preventDismissWhileFloatingUiOpen(event);
          onFocusOutside?.(event);
        }}
        onInteractOutside={(event) => {
          preventDismissWhileFloatingUiOpen(event);
          onInteractOutside?.(event);
        }}
        {...props}
      >
        {children}
        {!hideCloseButton ? (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground",
              closeButtonClassName,
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 pr-6", className)} {...props} />;
}

function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold", className)} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
