"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  PenSquare,
  X,
  MapPin,
  Calendar,
  Clock,
  Wallet,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostType = "job-seek" | "free";

interface FormState {
  postType: PostType;
  title: string;
  content: string;
  tags: string[];
  tagInput: string;
  location: string;
  scheduleDate: string;
  scheduleTime: string;
  payMin: string;
  payMax: string;
}

const INITIAL_STATE: FormState = {
  postType: "job-seek",
  title: "",
  content: "",
  tags: [],
  tagInput: "",
  location: "",
  scheduleDate: "",
  scheduleTime: "",
  payMin: "",
  payMax: "",
};

const SUGGESTED_TAGS = [
  "카페",
  "편의점",
  "음식점",
  "물류",
  "행사",
  "사무",
  "교육",
  "청소",
  "주말",
  "야간",
  "단기",
  "초보 환영",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreatePostPage() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed.length === 0) return;
      if (form.tags.includes(trimmed)) return;

      setForm((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmed],
        tagInput: "",
      }));
    },
    [form.tags]
  );

  const removeTag = useCallback((tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(form.tagInput);
      }
    },
    [form.tagInput, addTag]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Mock submission - just log for now
    },
    []
  );

  const isJobSeek = form.postType === "job-seek";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1 -ml-1 hover:bg-muted rounded-md">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <PenSquare className="w-5 h-5 text-brand" />
            글 등록
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Post type selector */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isJobSeek ? "default" : "outline"}
            onClick={() => updateField("postType", "job-seek")}
            className={isJobSeek ? "bg-brand hover:bg-brand-dark" : ""}
          >
            구직
          </Button>
          <Button
            type="button"
            variant={!isJobSeek ? "default" : "outline"}
            onClick={() => updateField("postType", "free")}
            className={!isJobSeek ? "bg-brand hover:bg-brand-dark" : ""}
          >
            자유
          </Button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-medium flex items-center gap-1"
          >
            제목 <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder={
              isJobSeek
                ? "예: 주말 카페 알바 구합니다"
                : "자유롭게 제목을 입력하세요"
            }
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
            required
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <label
            htmlFor="content"
            className="text-sm font-medium flex items-center gap-1"
          >
            내용 <span className="text-destructive">*</span>
          </label>
          <textarea
            id="content"
            value={form.content}
            onChange={(e) => updateField("content", e.target.value)}
            placeholder={
              isJobSeek
                ? "경력, 가능한 시간대, 희망 직종 등을 자세히 적어주세요"
                : "자유롭게 내용을 작성하세요"
            }
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors resize-none"
            required
          />
          <p className="text-xs text-muted-foreground text-right">
            {form.content.length}자
          </p>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label
            htmlFor="tags"
            className="text-sm font-medium flex items-center gap-1"
          >
            <Tag className="w-4 h-4" />
            태그
          </label>

          {/* Entered tags */}
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map((tag) => (
                <Badge key={tag} variant="default" className="gap-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <input
            id="tags"
            type="text"
            value={form.tagInput}
            onChange={(e) => updateField("tagInput", e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="태그를 입력하고 Enter (최대 5개)"
            disabled={form.tags.length >= 5}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors disabled:opacity-50"
          />

          {/* Suggested tags */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TAGS.filter((t) => !form.tags.includes(t))
              .slice(0, 8)
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  disabled={form.tags.length >= 5}
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-brand/10 hover:border-brand/40 transition-colors"
                  >
                    + {tag}
                  </Badge>
                </button>
              ))}
          </div>
        </div>

        {/* Location (job-seek only) */}
        {isJobSeek && (
          <>
            <Separator />

            <div className="space-y-2">
              <label
                htmlFor="location"
                className="text-sm font-medium flex items-center gap-1"
              >
                <MapPin className="w-4 h-4" />
                희망 근무지
              </label>
              <input
                id="location"
                type="text"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="예: 강남구, 서초구"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
              />
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  htmlFor="schedule-date"
                  className="text-sm font-medium flex items-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  가능 날짜
                </label>
                <input
                  id="schedule-date"
                  type="text"
                  value={form.scheduleDate}
                  onChange={(e) => updateField("scheduleDate", e.target.value)}
                  placeholder="예: 주말, 평일"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="schedule-time"
                  className="text-sm font-medium flex items-center gap-1"
                >
                  <Clock className="w-4 h-4" />
                  가능 시간
                </label>
                <input
                  id="schedule-time"
                  type="text"
                  value={form.scheduleTime}
                  onChange={(e) => updateField("scheduleTime", e.target.value)}
                  placeholder="예: 09-18시"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
                />
              </div>
            </div>

            {/* Pay expectations */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Wallet className="w-4 h-4" />
                희망 시급
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.payMin}
                  onChange={(e) => updateField("payMin", e.target.value)}
                  placeholder="최소"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
                />
                <span className="text-muted-foreground text-sm shrink-0">
                  ~
                </span>
                <input
                  type="number"
                  value={form.payMax}
                  onChange={(e) => updateField("payMax", e.target.value)}
                  placeholder="최대"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
                />
                <span className="text-muted-foreground text-sm shrink-0">
                  원
                </span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-brand hover:bg-brand-dark text-white h-11"
          disabled={form.title.length === 0 || form.content.length === 0}
        >
          등록하기
        </Button>
      </form>
    </div>
  );
}
