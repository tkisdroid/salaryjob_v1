import { type SVGProps } from "react";

/**
 * 샐러리잡 brand mark — minimal tilted celery.
 *
 * Flat 2-tone, no gradients, no ribbing, no sparkles. Tilted ~-14°
 * so it reads as a cheerful standalone mark at any size.
 *
 * Drop <CeleryMark className="h-10 w-10" /> anywhere a Lucide icon
 * used to live.
 */
export function CeleryMark({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="샐러리잡 로고"
      {...rest}
    >
      <g transform="rotate(-14 32 32)">
        {/* Stalk — single rounded shape */}
        <path
          d="M24 56 Q24 60, 28 60 L36 60 Q40 60, 40 56 L40 30 Q40 22, 32 22 Q24 22, 24 30 Z"
          fill="#42b474"
        />
        {/* Leaf trefoil on top */}
        <circle cx="23" cy="20" r="6" fill="#5bc98a" />
        <circle cx="32" cy="13" r="7" fill="#5bc98a" />
        <circle cx="41" cy="20" r="6" fill="#5bc98a" />
      </g>
    </svg>
  );
}
