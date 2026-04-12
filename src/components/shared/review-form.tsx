"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/ui/star-rating-input";
import { TagChipPicker } from "@/components/ui/tag-chip-picker";
import { reviewErrorToKorean } from "@/lib/errors/review-errors";
import type { ReviewErrorCode } from "@/lib/errors/review-errors";

export interface ReviewFormProps {
  applicationId: string;
  direction: "worker_to_business" | "business_to_worker";
  tagSet: readonly string[];
  redirectOnSuccess: string;
  submitAction: (input: unknown) => Promise<
    | { success: true; reviewId: string }
    | { success: false; error: ReviewErrorCode }
  >;
}

export function ReviewForm({
  applicationId,
  direction,
  tagSet,
  redirectOnSuccess,
  submitAction,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = () => {
    if (rating < 1) {
      toast.error("별점을 선택해주세요");
      return;
    }
    startTransition(async () => {
      const result = await submitAction({
        applicationId,
        rating,
        tags,
        comment: comment.trim() || undefined,
      });
      if (result.success) {
        toast.success("리뷰가 등록되었습니다");
        router.push(redirectOnSuccess);
        router.refresh();
      } else {
        toast.error(reviewErrorToKorean(result.error));
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <section>
        <h2 className="mb-3 text-sm font-bold">별점</h2>
        <StarRatingInput value={rating} onChange={setRating} size="lg" />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-bold">
          어떤 점이{" "}
          {direction === "worker_to_business" ? "좋았나요" : "인상적이었나요"}?
        </h2>
        <TagChipPicker options={tagSet} value={tags} onChange={setTags} max={8} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-bold">코멘트 (선택)</h2>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="후기를 남겨주세요 (최대 500자)"
          className="w-full rounded-md border border-border bg-background p-3 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">{comment.length}/500</p>
      </section>
      <Button
        type="submit"
        disabled={pending || rating < 1}
        className="sticky bottom-4"
      >
        {pending ? "제출 중…" : "리뷰 제출"}
      </Button>
    </form>
  );
}
