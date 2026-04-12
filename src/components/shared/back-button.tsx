"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
  children: React.ReactNode;
}

export function BackButton({ className, children }: BackButtonProps) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => router.back()}>
      {children}
    </button>
  );
}
