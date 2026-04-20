import { type SVGProps } from "react";

/**
 * 샐러리잡 brand mark — matches Main Page Premium §brand-glyph.
 *
 * Geometric minimal celery: a stalk (rotated -42°) with a darker cut-end
 * band on the right, and a single angular leaf on the top-right.
 *
 * Colors are mapped to the brand palette via CSS custom properties so the
 * glyph scales with the OKLCH token system:
 *   stalk body  → var(--brand)       (#7ec744 in the reference SVG)
 *   cut-end     → var(--brand-dark)  (#5aa82a)
 *   leaf        → var(--brand-deep)  (#4a9a2f)
 *
 * `aria-hidden` by default — the mark always renders next to the
 * wordmark in consumer layouts.
 */
export function CeleryMark({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <g transform="rotate(-42 12 12)">
        {/* Stalk: sharp rectangle, slight corner radius */}
        <rect
          x="2"
          y="10"
          width="20"
          height="7"
          rx="1.2"
          fill="var(--brand)"
        />
        {/* Cut-end darker band on the right edge */}
        <rect
          x="18.5"
          y="10"
          width="3.5"
          height="7"
          rx="1.2"
          fill="var(--brand-dark)"
        />
      </g>
      {/* Single angular leaf, top-right */}
      <path
        d="M17.5 2.5 L21.5 4 L20 8 L16 6.5 Z"
        fill="var(--brand-deep)"
      />
    </svg>
  );
}
