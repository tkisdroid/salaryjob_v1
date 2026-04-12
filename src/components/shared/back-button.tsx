"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
  fallbackHref?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

function canUseBrowserBack() {
  if (typeof window === "undefined") return false;
  if (window.history.length <= 1) return false;
  if (!document.referrer) return false;

  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function BackButton({
  className,
  fallbackHref,
  ariaLabel,
  children,
}: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (fallbackHref && !canUseBrowserBack()) {
      router.push(fallbackHref);
      return;
    }

    router.back();
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
