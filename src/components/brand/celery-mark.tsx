import { type SVGProps } from "react";

/**
 * 샐러리잡 brand mark — cartoon celery with shallow 3D shading.
 *
 * Designed at 64x64 with viewBox so it scales cleanly to any size.
 * - Stalk bundle: 3 ribbed segments with side-light gradient
 * - 3 leaf bumps on top with soft top highlights
 * - Drop shadow ellipse at base for depth
 * - White sparkles for cuteness
 *
 * Use the wrapper component <CeleryMark /> with className for sizing.
 * Drop the bare <svg> into anywhere a Lucide icon used to live.
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
      <defs>
        <linearGradient id="celery-stalk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#42b474" />
          <stop offset="45%" stopColor="#88e0a8" />
          <stop offset="100%" stopColor="#42b474" />
        </linearGradient>
        <linearGradient id="celery-leaf" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a8e8c0" />
          <stop offset="100%" stopColor="#5bc98a" />
        </linearGradient>
        <radialGradient id="celery-leaf-hi" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft drop shadow at base */}
      <ellipse cx="32" cy="58" rx="14" ry="2.2" fill="#1e6f3d" opacity="0.12" />

      {/* Stalk bundle: tapered, rounded */}
      <path
        d="M22 56 L20 30 Q20 22, 28 22 L36 22 Q44 22, 44 30 L42 56 Q42 60, 38 60 L26 60 Q22 60, 22 56 Z"
        fill="url(#celery-stalk)"
      />

      {/* Vertical ribbing (celery stringy look) */}
      <path
        d="M28 24 L28 58"
        stroke="#2b8a55"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M32 22 L32 60"
        stroke="#2b8a55"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M36 24 L36 58"
        stroke="#2b8a55"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Left-side highlight */}
      <path
        d="M24 28 L24 54"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Leaf cluster — three bumps */}
      <circle cx="22" cy="20" r="8" fill="url(#celery-leaf)" />
      <circle cx="32" cy="13" r="9.5" fill="url(#celery-leaf)" />
      <circle cx="42" cy="20" r="8" fill="url(#celery-leaf)" />

      {/* Leaf highlight overlays for shallow 3D pop */}
      <circle cx="22" cy="20" r="8" fill="url(#celery-leaf-hi)" />
      <circle cx="32" cy="13" r="9.5" fill="url(#celery-leaf-hi)" />
      <circle cx="42" cy="20" r="8" fill="url(#celery-leaf-hi)" />

      {/* Tiny white sparkle for cuteness */}
      <circle cx="46" cy="14" r="1.2" fill="#ffffff" opacity="0.85" />
      <circle cx="49" cy="16.5" r="0.7" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
