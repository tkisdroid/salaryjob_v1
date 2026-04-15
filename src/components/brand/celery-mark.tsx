import { type SVGProps } from "react";

/**
 * 샐러리잡 brand mark — minimal tilted celery.
 *
 * 기본적으로 decorative(aria-hidden). 랜딩에서 이 마크는 항상 인접
 * 텍스트("샐러리잡", "사업자 전용" 등)와 함께 등장하므로 스크린리더가
 * 같은 이름을 두 번 읽지 않도록 숨긴다. 단독으로 링크 접근 이름이 되어야
 * 한다면 consumer 에서 `aria-label` + `role="img"` 를 직접 지정한다.
 *
 * 색은 `currentColor` 로 상속받는다. 호출부에서 `text-brand` /
 * `text-brand-deep` 등을 지정하면 OKLCH 토큰 마이그레이션을 자동 추종.
 * 잎/줄기 톤 차이는 stroke+fill opacity 조합으로 재현.
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
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <g transform="rotate(-14 32 32)" fill="currentColor">
        {/* Stalk — single rounded shape (deeper tone) */}
        <path
          d="M24 56 Q24 60, 28 60 L36 60 Q40 60, 40 56 L40 30 Q40 22, 32 22 Q24 22, 24 30 Z"
          fillOpacity="0.78"
        />
        {/* Leaf trefoil on top */}
        <circle cx="23" cy="20" r="6" />
        <circle cx="32" cy="13" r="7" />
        <circle cx="41" cy="20" r="6" />
      </g>
    </svg>
  );
}
