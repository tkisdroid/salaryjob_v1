"use client";

import { cn } from "@/lib/utils";

export interface TagChipPickerProps {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  className?: string;
}

export function TagChipPicker({
  options,
  value,
  onChange,
  max = 8,
  className,
}: TagChipPickerProps) {
  const toggle = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else if (value.length < max) {
      onChange([...value, tag]);
    }
  };
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((tag) => {
        const selected = value.includes(tag);
        const disabled = !selected && value.length >= max;
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => toggle(tag)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background",
              disabled && "opacity-40 cursor-not-allowed",
              !disabled && !selected && "hover:bg-muted",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
