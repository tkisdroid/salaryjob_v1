"use client";

import Link from "next/link";
import { useState } from "react";
import { X, Star } from "lucide-react";

export interface ReviewPromptBannerProps {
  unreviewedCount: number;
  firstUnreviewedAppId: string | null;
}

export function ReviewPromptBanner({
  unreviewedCount,
  firstUnreviewedAppId,
}: ReviewPromptBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (unreviewedCount === 0 || !firstUnreviewedAppId || dismissed) return null;
  return (
    <div className="relative mb-4 flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
      <Star className="h-5 w-5 flex-shrink-0 text-yellow-500" />
      <p className="flex-1 text-sm">
        {unreviewedCount}건의 근무에 아직 리뷰를 작성하지 않았어요.{" "}
        <Link
          href={`/my/applications/${firstUnreviewedAppId}/review`}
          className="font-semibold underline"
        >
          리뷰 작성하기
        </Link>
      </p>
      <button
        type="button"
        aria-label="배너 닫기"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
