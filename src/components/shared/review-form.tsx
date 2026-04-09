"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  PartyPopper,
  Loader2,
  Send,
  CheckCircle2,
} from "lucide-react";

export type ReviewDirection = "worker-to-business" | "business-to-worker";

export interface ReviewSubject {
  id: string;
  name: string;
  avatar: string; // emoji or initial
  subtitle: string; // e.g., "스타벅스 역삼점" or "근무 23회 · 완료율 100%"
}

export interface ReviewFormProps {
  direction: ReviewDirection;
  subject: ReviewSubject;
  jobTitle: string;
  backHref: string;
  doneHref: string;
}

// Quick preset tags keyed by direction
const PRESET_TAGS: Record<ReviewDirection, readonly string[]> = {
  "worker-to-business": [
    "친절한 분위기",
    "업무 설명 꼼꼼",
    "식사 제공",
    "깨끗한 환경",
    "시간 여유로움",
    "다시 오고 싶어요",
    "담당자 친절",
    "시간 정확",
  ],
  "business-to-worker": [
    "성실함",
    "시간 엄수",
    "적극적",
    "친절한 응대",
    "업무 이해도 높음",
    "다시 함께하고 싶어요",
    "소통 원활",
    "주변 정리 잘함",
  ],
};

const DIRECTION_COPY: Record<
  ReviewDirection,
  {
    title: string;
    intro: string;
    ratingPrompt: string;
    commentPlaceholder: string;
    confirmButton: string;
  }
> = {
  "worker-to-business": {
    title: "업체 리뷰",
    intro: "근무한 업체는 어떠셨나요?",
    ratingPrompt: "업체의 근무 환경을 평가해주세요",
    commentPlaceholder:
      "예: 담당자님이 정말 친절하셨고 업무도 어렵지 않았어요. 다시 오고 싶어요!",
    confirmButton: "리뷰 남기기",
  },
  "business-to-worker": {
    title: "근무자 평가",
    intro: "근무자와 함께 일한 경험은 어떠셨나요?",
    ratingPrompt: "근무자의 업무 태도를 평가해주세요",
    commentPlaceholder:
      "예: 시간을 정확히 지키고 적극적으로 업무에 임해주셨어요. 다음에도 함께하고 싶습니다.",
    confirmButton: "평가 제출",
  },
};

export function ReviewForm({
  direction,
  subject,
  jobTitle,
  backHref,
  doneHref,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [stage, setStage] = useState<"form" | "submitting" | "done">("form");

  const copy = DIRECTION_COPY[direction];
  const presetTags = PRESET_TAGS[direction];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    setStage("submitting");
    setTimeout(() => setStage("done"), 900);
  };

  const ratingLabels: Record<number, string> = {
    1: "별로였어요",
    2: "아쉬웠어요",
    3: "보통이에요",
    4: "좋았어요",
    5: "최고였어요!",
  };
  const currentLabel =
    hoverRating > 0
      ? ratingLabels[hoverRating]
      : rating > 0
      ? ratingLabels[rating]
      : "별점을 눌러주세요";

  // -------------------------------------------------------------------------
  // Done state
  // -------------------------------------------------------------------------
  if (stage === "done") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center mb-5">
            <PartyPopper className="w-12 h-12 text-brand" />
          </div>
          <h1 className="text-2xl font-bold mb-2">리뷰 감사합니다!</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            여러분의 리뷰가 더 나은 매칭을 만들어요.
            <br />
            성실한 리뷰에는 포인트가 지급됩니다.
          </p>

          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
                {subject.avatar}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-sm truncate">{subject.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {subject.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-center gap-1.5 text-xs text-brand font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              +500P 적립됨
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/95 backdrop-blur p-4">
          <div className="max-w-lg mx-auto">
            <Link
              href={doneHref}
              className="block w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-center leading-[3rem] shadow-lg shadow-brand/20 transition-colors"
            >
              완료
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Submitting state
  // -------------------------------------------------------------------------
  if (stage === "submitting") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
        <p className="text-sm font-medium">리뷰를 저장하는 중...</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href={backHref}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <p className="text-sm font-bold flex-1">{copy.title}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Intro */}
        <div className="text-center">
          <h1 className="text-xl font-bold">{copy.intro}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            솔직한 리뷰는 모두에게 도움이 됩니다
          </p>
        </div>

        {/* Subject card */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center text-3xl shrink-0">
              {subject.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">
                {jobTitle}
              </p>
              <h2 className="font-bold text-base line-clamp-1">
                {subject.name}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {subject.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Star rating */}
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-xs font-bold text-muted-foreground mb-3">
            {copy.ratingPrompt}
          </p>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    i <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <p
            className={`text-sm font-bold ${
              rating > 0 || hoverRating > 0
                ? "text-brand"
                : "text-muted-foreground"
            }`}
          >
            {currentLabel}
          </p>
        </section>

        {/* Preset tags */}
        <section>
          <h3 className="text-xs font-bold mb-2">
            어떤 점이 좋았나요?{" "}
            <span className="text-muted-foreground font-normal">
              (복수 선택 가능)
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {presetTags.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-full text-xs font-medium border-2 transition-all ${
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-border bg-background hover:border-brand/40"
                  }`}
                >
                  {selected && "✓ "}
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        {/* Comment */}
        <section>
          <h3 className="text-xs font-bold mb-2">
            한 마디 남겨주세요{" "}
            <span className="text-muted-foreground font-normal">(선택)</span>
          </h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={copy.commentPlaceholder}
            rows={5}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm resize-none"
          />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {comment.length} / 500
          </p>
        </section>

        <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
          작성된 리뷰는 상대방에게 익명으로 전달되며,
          <br />
          거짓·욕설·비방성 리뷰는 운영 정책에 따라 삭제될 수 있습니다.
        </p>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            type="button"
            disabled={rating === 0}
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> {copy.confirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}
