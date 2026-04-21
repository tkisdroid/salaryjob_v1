"use client";

import { useState, useTransition } from "react";
import { Heart, Send } from "lucide-react";
import { sendWorkerOffer, toggleFavoriteWorker } from "../actions";
import { cn } from "@/lib/utils";

export function WorkerDetailActions({
  workerId,
  initialFavorite,
}: {
  workerId: string;
  initialFavorite: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onFavorite = () => {
    const previous = favorite;
    setFavorite(!previous);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await toggleFavoriteWorker(workerId);
      if (result.success) {
        setFavorite(result.isFavorite);
        setMessage(result.isFavorite ? "단골로 저장했습니다." : "단골에서 해제했습니다.");
      } else {
        setFavorite(previous);
        setError(result.error);
      }
    });
  };

  const onOffer = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await sendWorkerOffer(workerId);
      if (result.success) setMessage(result.message);
      else setError(result.error);
    });
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOffer}
          disabled={isPending}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isPending ? "처리 중..." : "제안 보내기"}
        </button>
        <button
          type="button"
          onClick={onFavorite}
          disabled={isPending}
          aria-label={favorite ? "단골 해제" : "단골 등록"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2 disabled:opacity-50"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              favorite ? "fill-brand-deep text-brand-deep" : "text-text-subtle",
            )}
          />
        </button>
      </div>
      {message && (
        <p role="status" className="text-[12px] font-bold text-brand-deep">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12px] font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
