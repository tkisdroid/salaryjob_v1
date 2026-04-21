"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { updateJob } from "../../actions";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export interface EditableJob {
  id: string;
  businessId: string;
  title: string;
  category: string;
  description: string;
  workDate: string;
  startTime: string;
  endTime: string;
  headcount: number;
  hourlyPay: number;
  transportFee: number;
  isUrgent: boolean;
  nightShiftAllowance: boolean;
  dressCode: string | null;
  duties: string[];
  requirements: string[];
  whatToBring: string[];
  tags: string[];
  address: string | null;
  addressDetail: string | null;
}

const CATEGORIES = [
  { id: "food", label: "음식점·카페", emoji: "☕" },
  { id: "retail", label: "판매·유통", emoji: "🛍️" },
  { id: "logistics", label: "물류·배송", emoji: "📦" },
  { id: "event", label: "행사·이벤트", emoji: "🎪" },
  { id: "office", label: "사무·행정", emoji: "💼" },
  { id: "cleaning", label: "청소·정리", emoji: "✨" },
  { id: "education", label: "교육·과외", emoji: "📚" },
  { id: "tech", label: "IT·디자인", emoji: "💻" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditJobForm({ job }: { job: EditableJob }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state — pre-populated from job prop
  const [title, setTitle] = useState(job.title);
  const [category, setCategory] = useState(job.category);
  const [description, setDescription] = useState(job.description);
  const [workDate, setWorkDate] = useState(job.workDate);
  const [startTime, setStartTime] = useState(job.startTime);
  const [endTime, setEndTime] = useState(job.endTime);
  const [headcount, setHeadcount] = useState(job.headcount);
  const [hourlyPay, setHourlyPay] = useState(job.hourlyPay);
  const [transportFee, setTransportFee] = useState(job.transportFee);
  const [isUrgent, setIsUrgent] = useState(job.isUrgent);
  const [nightShiftAllowance, setNightShiftAllowance] = useState(
    job.nightShiftAllowance,
  );
  const [dressCode, setDressCode] = useState(job.dressCode ?? "");
  const [duties, setDuties] = useState(job.duties.join("\n"));
  const [requirements, setRequirements] = useState(
    job.requirements.join("\n"),
  );
  const [whatToBring, setWhatToBring] = useState(job.whatToBring.join(", "));
  const [tags, setTags] = useState(job.tags.join(", "));
  const [address, setAddress] = useState(job.address ?? "");
  const [addressDetail, setAddressDetail] = useState(
    job.addressDetail ?? "",
  );

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("jobId", job.id);
      fd.append("businessId", job.businessId);
      fd.append("title", title);
      fd.append("category", category);
      fd.append("description", description);
      fd.append("workDate", workDate);
      fd.append("startTime", startTime);
      fd.append("endTime", endTime);
      fd.append("headcount", String(headcount));
      fd.append("hourlyPay", String(hourlyPay));
      fd.append("transportFee", String(transportFee));
      fd.append("isUrgent", isUrgent ? "true" : "false");
      fd.append(
        "nightShiftAllowance",
        nightShiftAllowance ? "true" : "false",
      );
      fd.append("dressCode", dressCode);
      fd.append("address", address);
      fd.append("addressDetail", addressDetail);

      duties
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((d) => fd.append("duties", d));

      requirements
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((r) => fd.append("requirements", r));

      whatToBring
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((w) => fd.append("whatToBring", w));

      tags
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((t) => fd.append("tags", t));

      const result = await updateJob(null, fd);
      if (result && "error" in result) {
        if ("redirectTo" in result && result.redirectTo) {
          router.push(result.redirectTo);
          return;
        }
        setError(result.error);
        return;
      }
      if (result && "success" in result && result.success) {
        router.push(`/biz/posts/${job.id}`);
      }
    });
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-ink" />
        <p className="text-[13.5px] font-bold tracking-tight text-ink">
          공고를 수정하는 중...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/95 backdrop-blur-[12px]">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            href={`/biz/posts/${job.id}`}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
            aria-label="뒤로"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-[16px] font-extrabold tracking-[-0.025em] text-ink">
            공고 수정
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        {/* Section 1: Basic Info */}
        <section className="space-y-5">
          <h2 className="text-[16px] font-extrabold tracking-[-0.025em] text-ink">
            기본 정보
          </h2>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              공고 제목 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              카테고리 <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] border p-3 transition-all active:scale-95 ${
                    category === c.id
                      ? "border-ink bg-surface-2 shadow-soft"
                      : "border-border bg-surface hover:border-ink/40"
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-[10.5px] font-bold tracking-tight text-ink">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              업무 소개 <span className="text-destructive">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={2000}
              className="w-full resize-none rounded-[18px] border border-border bg-surface px-4 py-3 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>
        </section>

        {/* Section 2: Schedule & Personnel */}
        <section className="space-y-5">
          <h2 className="text-[16px] font-extrabold tracking-[-0.025em] text-ink">
            일정 & 인원
          </h2>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              근무일 <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
                시작 시간 <span className="text-destructive">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
                종료 시간 <span className="text-destructive">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              모집 인원 <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setHeadcount((n) => Math.max(1, n - 1))}
                className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface text-[20px] font-extrabold text-ink transition-all hover:border-ink hover:bg-surface-2 active:scale-95"
                aria-label="인원 감소"
              >
                −
              </button>
              <div className="tabnum flex h-12 flex-1 items-center justify-center rounded-[14px] border border-border bg-surface">
                <span className="text-[17px] font-extrabold tracking-tight text-ink">
                  {headcount}명
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHeadcount((n) => Math.min(100, n + 1))}
                className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface text-[20px] font-extrabold text-ink transition-all hover:border-ink hover:bg-surface-2 active:scale-95"
                aria-label="인원 증가"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-4">
            <span className="flex-1 text-[14px] font-medium text-ink">
              급구로 등록
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isUrgent}
              onClick={() => setIsUrgent((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isUrgent ? "bg-ink" : "bg-surface-2"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isUrgent ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-4">
            <span className="flex-1 text-[14px] font-medium text-ink">
              야간 수당 적용
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={nightShiftAllowance}
              onClick={() => setNightShiftAllowance((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                nightShiftAllowance ? "bg-ink" : "bg-surface-2"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  nightShiftAllowance ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Section 3: Compensation */}
        <section className="space-y-5">
          <h2 className="text-[16px] font-extrabold tracking-[-0.025em] text-ink">
            보상
          </h2>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              시급 (원) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={hourlyPay}
              onChange={(e) => setHourlyPay(Number(e.target.value))}
              step={100}
              min={10030}
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium tabnum text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              교통비 (원)
            </label>
            <input
              type="number"
              value={transportFee}
              onChange={(e) => setTransportFee(Number(e.target.value))}
              step={500}
              min={0}
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium tabnum text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>
        </section>

        {/* Section 4: Details */}
        <section className="space-y-5">
          <h2 className="text-[16px] font-extrabold tracking-[-0.025em] text-ink">
            세부 사항
          </h2>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              주소
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={200}
              placeholder="예: 서울 강남구 테헤란로 123"
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              상세 주소
            </label>
            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              maxLength={100}
              placeholder="예: 2층 202호"
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              주요 업무
            </label>
            <p className="text-[11px] font-medium text-muted-foreground">
              한 줄에 하나씩
            </p>
            <textarea
              value={duties}
              onChange={(e) => setDuties(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-[18px] border border-border bg-surface px-4 py-3 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              지원 조건
            </label>
            <p className="text-[11px] font-medium text-muted-foreground">
              한 줄에 하나씩
            </p>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-[18px] border border-border bg-surface px-4 py-3 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              복장
            </label>
            <input
              type="text"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              maxLength={100}
              placeholder="예: 검정 상의 + 어두운 색 바지"
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              준비물
            </label>
            <p className="text-[11px] font-medium text-muted-foreground">
              쉼표로 구분
            </p>
            <input
              type="text"
              value={whatToBring}
              onChange={(e) => setWhatToBring(e.target.value)}
              placeholder="예: 신분증, 마스크"
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12.5px] font-extrabold tracking-tight text-ink">
              태그
            </label>
            <p className="text-[11px] font-medium text-muted-foreground">
              쉼표로 구분
            </p>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: 단기, 주말, 실내"
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>
        </section>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-[14px] border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] font-semibold text-destructive"
          >
            {error}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-border-soft bg-surface/95 backdrop-blur-[12px] md:bottom-0">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
            className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[14px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:bg-surface-2 disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
          >
            수정 완료
          </button>
        </div>
      </div>
    </div>
  );
}
