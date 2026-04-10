"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// Phase 4 Plan 04-07 — shadcn-style ToggleGroup shim built on radix-ui monolith.
// We do not use `npx shadcn add toggle-group` because that installs a scoped
// package (@radix-ui/react-toggle-group) and the project has standardized on
// the `radix-ui` monolith (see button.tsx / badge.tsx). This file mirrors the
// shadcn default markup so future migration to the canonical shadcn CLI is a
// mechanical swap.

const ToggleGroupContext = React.createContext<{
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}>({});

type ToggleGroupProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Root
> & {
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
};

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  ToggleGroupProps
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-start gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));
ToggleGroup.displayName = "ToggleGroup";

type ToggleGroupItemProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Item
> & {
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
};

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  ToggleGroupItemProps
>(({ className, children, ...props }, ref) => {
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        // base
        "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
        // interaction
        "hover:bg-muted hover:text-foreground",
        // state
        "data-[state=on]:bg-brand data-[state=on]:text-white",
        // disabled
        "disabled:pointer-events-none disabled:opacity-50",
        // a11y focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "border border-input",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
