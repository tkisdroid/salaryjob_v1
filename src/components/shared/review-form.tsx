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
      className="flex flex-col gap-4"
    >
      <section className="rounded-[22px] border border-border-soft bg-surface p-5">
        <h2 className="mb-3 text-[13px] font-extrabold tracking-tight text-ink">
          별점
        </h2>
        <StarRatingInput value={rating} onChange={setRating} size="lg" />
      </section>
      <section className="rounded-[22px] border border-border-soft bg-surface p-5">
        <h2 className="mb-3 text-[13px] font-extrabold tracking-tight text-ink">
          어떤 점이{" "}
          {direction === "worker_to_business" ? "좋았나요" : "인상적이었나요"}?
        </h2>
        <TagChipPicker options={tagSet} value={tags} onChange={setTags} max={8} />
      </section>
      <section className="rounded-[22px] border border-border-soft bg-surface p-5">
        <h2 className="mb-3 text-[13px] font-extrabold tracking-tight text-ink">
          코멘트 <span className="font-medium text-text-subtle">(선택)</span>
        </h2>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="후기를 남겨주세요 (최대 500자)"
          className="w-full resize-none rounded-[14px] border border-border bg-surface px-4 py-3 text-[14px] font-medium text-ink placeholder:text-text-subtle transition-colors focus:border-ink focus:outline-none"
        />
        <p className="tabnum mt-1.5 text-right text-[11px] font-semibold text-text-subtle">
          {comment.length}/500
        </p>
      </section>
      <Button
        type="submit"
        disabled={pending || rating < 1}
        className="sticky bottom-4 h-12 rounded-full bg-ink text-[14px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
      >
        {pending ? "제출 중…" : "리뷰 제출"}
      </Button>
    </form>
  );
}
