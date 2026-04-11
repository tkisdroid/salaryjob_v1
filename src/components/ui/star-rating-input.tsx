"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingInputProps {
  value: number;
  onChange?: (next: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = { sm: 20, md: 28, lg: 40 } as const;

export function StarRatingInput({
  value,
  onChange,
  readOnly = false,
  size = "md",
  className,
}: StarRatingInputProps) {
  const px = SIZE_MAP[size];
  return (
    <div role="radiogroup" aria-label="별점" className={cn("flex gap-1", className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const label = `${i}점`;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === value}
            aria-label={label}
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(i)}
            className={cn(
              "transition-transform",
              !readOnly && "hover:scale-110 cursor-pointer",
              readOnly && "cursor-default",
            )}
          >
            <Star
              width={px}
              height={px}
              className={cn(
                filled
                  ? "fill-brand text-brand"
                  : "fill-transparent text-border",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
