"use client";

import {
  useState,
  useMemo,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { createJob } from "../actions";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Loader2,
  Wallet,
  Users,
  Coins,
  Shirt,
  Package,
  Calendar,
  FileText,
  TrendingUp,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3 | 4 | 5;

export interface BusinessProfileLite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
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

interface FormShape {
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
  dressCode: string;
  whatToBring: string;
  requirements: string;
  duties: string;
}

const STEP_TITLES: Record<Step, string> = {
  1: "업무 기본 정보",
  2: "일정 & 인원",
  3: "보상",
  4: "세부 요구사항",
  5: "미리보기",
};

type SetFormState = Dispatch<SetStateAction<FormShape>>;

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

function NewPostFlow({
  businessProfiles,
  initialUrgent,
}: {
  businessProfiles: BusinessProfileLite[];
  initialUrgent: boolean;
}) {
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    businessProfiles[0]?.id ?? "",
  );

  const [form, setForm] = useState<FormShape>({
    title: "",
    category: "",
    description: "",
    workDate: "",
    startTime: "",
    endTime: "",
    headcount: 1,
    hourlyPay: 12500,
    transportFee: 3000,
    isUrgent: initialUrgent,
    dressCode: "",
    whatToBring: "",
    requirements: "",
    duties: "",
  });

  const workHours = useMemo(() => {
    if (!form.startTime || !form.endTime) return 0;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    let minutes = eh * 60 + em - (sh * 60 + sm);
    if (minutes <= 0) minutes += 24 * 60;
    return Math.round((minutes / 60) * 10) / 10;
  }, [form.startTime, form.endTime]);

  const basePay = Math.floor(form.hourlyPay * workHours);
  const totalPerPerson = basePay + form.transportFee;
  const totalCost = totalPerPerson * form.headcount;

  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1:
        return (
          form.title.trim().length >= 4 &&
          form.category !== "" &&
          form.description.trim().length >= 10
        );
      case 2:
        return (
          form.workDate !== "" &&
          form.startTime !== "" &&
          form.endTime !== "" &&
          form.headcount >= 1
        );
      case 3:
        return form.hourlyPay >= 10030;
      case 4:
        return true;
      case 5:
        return selectedBusinessId !== "";
      default:
        return false;
    }
  };

  const handlePublish = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("businessId", selectedBusinessId);
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("description", form.description);
      fd.append("hourlyPay", String(form.hourlyPay));
      fd.append("transportFee", String(form.transportFee ?? 0));
      fd.append("workDate", form.workDate);
      fd.append("startTime", form.startTime);
      fd.append("endTime", form.endTime);
      fd.append("headcount", String(form.headcount));
      fd.append("dressCode", form.dressCode ?? "");
      fd.append("isUrgent", form.isUrgent ? "true" : "false");

      // Convert newline-separated textareas into array fields.
      form.duties
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((d) => fd.append("duties", d));
      form.requirements
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((r) => fd.append("requirements", r));
      form.whatToBring
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((w) => fd.append("whatToBring", w));

      const result = await createJob(null, fd);
      if (result && "error" in result) {
        if ("redirectTo" in result && result.redirectTo) {
          router.push(result.redirectTo);
          return;
        }
        setError(result.error);
        return;
      }
      // Success path: createJob throws `redirect` which unwinds server-side,
      // so this branch is effectively unreachable in production.
    });
  };

  // ------------------------------------------------------------------------
  // Publishing animation
  // ------------------------------------------------------------------------
  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-ink" />
        <p className="text-[13.5px] font-bold tracking-tight text-ink">
          공고를 등록하고 매칭을 시작하는 중...
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // Step form
  // ------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/95 backdrop-blur-[12px]">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          {step === 1 ? (
            <Link
              href="/biz/posts"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep((step - 1) as Step)}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
              aria-label="이전 단계"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="tabnum text-[10px] font-bold uppercase tracking-wider text-text-subtle">
              {step}/5 단계
            </p>
            <p className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-ink">
              {STEP_TITLES[step]}
            </p>
          </div>
          {form.isUrgent && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--urgent)]/10 px-2.5 py-1 text-[10px] font-extrabold tracking-tight text-[color:var(--urgent)]">
              <Zap className="h-3 w-3 fill-[color:var(--urgent)]" /> 급구
            </span>
          )}
        </div>
        {/* Progress */}
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-ink" : "bg-surface-2"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        {/* Business selector — only show if multiple profiles */}
        {businessProfiles.length > 1 && (
          <Field label="사업장 선택" required>
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
            >
              {businessProfiles.map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.name} — {bp.address}
                </option>
              ))}
            </select>
          </Field>
        )}

        {step === 1 && <Step1Basic form={form} setForm={setForm} />}
        {step === 2 && <Step2Schedule form={form} setForm={setForm} />}
        {step === 3 && (
          <Step3Compensation
            form={form}
            setForm={setForm}
            workHours={workHours}
            basePay={basePay}
            totalPerPerson={totalPerPerson}
            totalCost={totalCost}
          />
        )}
        {step === 4 && <Step4Details form={form} setForm={setForm} />}
        {step === 5 && (
          <Step5Preview
            form={form}
            workHours={workHours}
            totalPerPerson={totalPerPerson}
            totalCost={totalCost}
          />
        )}

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
          {step < 5 ? (
            <button
              type="button"
              data-testid="job-form-next-button"
              disabled={!canProceed(step)}
              onClick={() => setStep((step + 1) as Step)}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[14px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:bg-surface-2 disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
            >
              다음 <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              data-testid="job-form-publish-button"
              disabled={!canProceed(5) || isPending}
              onClick={handlePublish}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[14px] font-extrabold tracking-tight text-ink transition-all hover:bg-brand-dark hover:shadow-soft-green disabled:bg-surface-2 disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
            >
              <Zap className="h-4 w-4 fill-ink" /> 공고 등록하고 매칭 시작
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[12.5px] font-extrabold tracking-tight text-ink">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] font-medium text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Step1Basic({
  form,
  setForm,
}: {
  form: FormShape;
  setForm: SetFormState;
}) {
  return (
    <>
      <div>
        <h2 className="mb-1 text-[18px] font-extrabold tracking-[-0.025em] text-ink">
          어떤 일을 구하시나요?
        </h2>
        <p className="text-[12.5px] font-medium text-muted-foreground">
          근무자가 한눈에 이해할 수 있게 설명해주세요
        </p>
      </div>

      <Field label="공고 제목" required hint="4자 이상, 10자 이내로 핵심만">
        <input
          type="text"
          data-testid="job-title-input"
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="예: 주말 카페 바리스타 보조"
          maxLength={40}
          className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
        />
        {form.title.trim().length > 0 && form.title.trim().length < 4 && (
          <p className="text-[10px] font-bold text-destructive">
            제목은 최소 4자 이상 입력해주세요
          </p>
        )}
      </Field>

      <Field label="카테고리" required hint="업무 유형을 하나 선택해 주세요">
        <fieldset>
          <legend className="sr-only">카테고리</legend>
          <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <label
              key={c.id}
              htmlFor={`job-category-input-${c.id}`}
              data-testid={`job-category-${c.id}`}
              role="radio"
              aria-checked={form.category === c.id}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[18px] border p-3 transition-all active:scale-95 ${
                form.category === c.id
                  ? "border-ink bg-surface-2 shadow-soft"
                  : "border-border bg-surface hover:border-ink/40"
              }`}
            >
              <input
                id={`job-category-input-${c.id}`}
                type="radio"
                name="job-category"
                value={c.id}
                checked={form.category === c.id}
                onChange={(e) => {
                  if (!e.target.checked) return;
                  setForm((prev) => ({ ...prev, category: c.id }));
                }}
                className="sr-only"
              />
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[10.5px] font-bold tracking-tight text-ink">
                {c.label}
              </span>
            </label>
          ))}
          </div>
        </fieldset>
      </Field>

      <Field label="업무 소개" required hint="10자 이상, 업무 내용·분위기 등 자유롭게">
        <textarea
          data-testid="job-description-input"
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="예: 주문 받기, 음료 제조 보조, 매장 정리를 함께 해주실 분을 찾습니다."
          rows={5}
          maxLength={500}
          className="w-full resize-none rounded-[18px] border border-border bg-surface px-4 py-3 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
        />
        {form.description.trim().length > 0 && form.description.trim().length < 10 && (
          <p className="text-[10px] font-bold text-destructive">
            업무 소개는 최소 10자 이상 입력해주세요
          </p>
        )}
      </Field>

      <div className="flex items-start gap-2 rounded-[14px] border border-dashed border-border bg-surface-2/60 p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-deep" />
        <p className="text-[11.5px] font-medium leading-relaxed text-muted-foreground">
          <strong className="font-extrabold text-ink">Tip:</strong> 구체적인
          업무와 분위기를 적으면 매칭률이 2배 높아져요.
        </p>
      </div>
    </>
  );
}

function Step2Schedule({
  form,
  setForm,
}: {
  form: FormShape;
  setForm: SetFormState;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div>
        <h2 className="mb-1 text-[18px] font-extrabold tracking-[-0.025em] text-ink">
          언제, 몇 명이 필요하신가요?
        </h2>
        <p className="text-[12.5px] font-medium text-muted-foreground">
          당일 근무도 가능해요
        </p>
      </div>

      <Field label="근무일" required hint="근무할 날짜를 선택해 주세요">
        <input
          type="date"
          min={today}
          value={form.workDate}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, workDate: e.target.value }))
          }
          className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="시작 시간" required hint="근무 시작 시각">
          <input
            type="time"
            value={form.startTime}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, startTime: e.target.value }))
            }
            className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
          />
          {form.endTime !== "" && form.startTime === "" && (
            <p className="text-[10px] font-bold text-destructive">
              시작 시간을 입력해 주세요
            </p>
          )}
        </Field>
        <Field label="종료 시간" required hint="근무 종료 시각">
          <input
            type="time"
            value={form.endTime}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, endTime: e.target.value }))
            }
            className="h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
          />
          {form.startTime !== "" && form.endTime === "" && (
            <p className="text-[10px] font-bold text-destructive">
              종료 시간을 입력해 주세요
            </p>
          )}
        </Field>
      </div>

      <Field label="모집 인원" required>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                headcount: Math.max(1, prev.headcount - 1),
              }))
            }
            className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface text-[20px] font-extrabold text-ink transition-all hover:border-ink hover:bg-surface-2 active:scale-95"
            aria-label="인원 감소"
          >
            −
          </button>
          <div className="tabnum flex h-12 flex-1 items-center justify-center rounded-[14px] border border-border bg-surface">
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              {form.headcount}명
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                headcount: Math.min(50, prev.headcount + 1),
              }))
            }
            className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface text-[20px] font-extrabold text-ink transition-all hover:border-ink hover:bg-surface-2 active:scale-95"
            aria-label="인원 증가"
          >
            +
          </button>
        </div>
      </Field>

      <Field label="급구 여부">
        <button
          type="button"
          onClick={() =>
            setForm((prev) => ({ ...prev, isUrgent: !prev.isUrgent }))
          }
          className={`flex w-full items-center gap-3 rounded-[18px] border-2 p-4 transition-all ${
            form.isUrgent
              ? "border-[color:var(--urgent)] bg-[color:var(--urgent)]/5"
              : "border-border bg-surface hover:border-[color:var(--urgent)]/40"
          }`}
        >
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${
              form.isUrgent ? "bg-[color:var(--urgent)]" : "bg-surface-2"
            }`}
          >
            <Zap
              className={`h-5 w-5 ${
                form.isUrgent
                  ? "fill-white text-white"
                  : "text-text-subtle"
              }`}
            />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-extrabold tracking-tight text-ink">
              급구로 등록
            </p>
            <p className="text-[11.5px] font-medium text-muted-foreground">
              평균 5분 내 매칭, 상단 노출
            </p>
          </div>
          <div
            className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
              form.isUrgent
                ? "border-[color:var(--urgent)] bg-[color:var(--urgent)]"
                : "border-border"
            }`}
          >
            {form.isUrgent && <Check className="h-3 w-3 text-white" />}
          </div>
        </button>
      </Field>
    </>
  );
}

function Step3Compensation({
  form,
  setForm,
  workHours,
  basePay,
  totalPerPerson,
  totalCost,
}: {
  form: FormShape;
  setForm: SetFormState;
  workHours: number;
  basePay: number;
  totalPerPerson: number;
  totalCost: number;
}) {
  const MINIMUM_WAGE = 10030; // 2026 minimum wage (KRW)
  return (
    <>
      <div>
        <h2 className="mb-1 text-[18px] font-extrabold tracking-[-0.025em] text-ink">
          보상을 얼마로 책정할까요?
        </h2>
        <p className="tabnum text-[12.5px] font-medium text-muted-foreground">
          2026년 최저시급 {formatMoney(MINIMUM_WAGE)}
        </p>
      </div>

      <Field label="시급 (원)" required>
        <div className="relative">
          <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="number"
            value={form.hourlyPay}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                hourlyPay: Number(e.target.value),
              }))
            }
            step={100}
            min={MINIMUM_WAGE}
            className="h-12 w-full rounded-[14px] border border-border bg-surface pl-10 pr-4 text-[14px] font-medium tabnum text-ink transition-colors focus:border-ink focus:outline-none"
          />
        </div>
        {form.hourlyPay < MINIMUM_WAGE && form.hourlyPay > 0 && (
          <p className="text-[10px] font-bold text-destructive">
            최저시급({formatMoney(MINIMUM_WAGE)}) 이상이어야 합니다
          </p>
        )}
      </Field>

      <Field label="교통비 (원)" hint="근무자의 이동 비용을 지원해주세요">
        <div className="relative">
          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="number"
            value={form.transportFee}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                transportFee: Number(e.target.value),
              }))
            }
            step={500}
            min={0}
            className="h-12 w-full rounded-[14px] border border-border bg-surface pl-10 pr-4 text-[14px] font-medium tabnum text-ink transition-colors focus:border-ink focus:outline-none"
          />
        </div>
      </Field>

      <div className="space-y-3 rounded-[22px] bg-ink p-5 text-white shadow-soft-dark">
        <div className="flex items-center justify-between">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-white/70">
            예상 비용 (인당)
          </p>
          <TrendingUp className="h-4 w-4 text-white/60" />
        </div>
        <p className="tabnum text-[28px] font-extrabold tracking-[-0.03em]">
          {formatMoney(totalPerPerson)}
        </p>
        <div className="tabnum space-y-1.5 border-t border-white/15 pt-3 text-[12px] font-medium">
          <div className="flex justify-between text-white/80">
            <span>
              기본급 ({form.hourlyPay.toLocaleString()}원 × {workHours || 0}시간)
            </span>
            <span>{formatMoney(basePay)}</span>
          </div>
          <div className="flex justify-between text-white/80">
            <span>교통비</span>
            <span>{formatMoney(form.transportFee)}</span>
          </div>
          <div className="flex justify-between border-t border-white/15 pt-1.5 font-extrabold">
            <span>총 비용 ({form.headcount}명)</span>
            <span>{formatMoney(totalCost)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-[14px] border border-dashed border-border bg-surface-2/60 p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-subtle" />
        <p className="text-[11.5px] font-medium leading-relaxed text-muted-foreground">
          근무 완료 후 자동으로 3.3% 원천징수된 금액이 근무자 계좌로 즉시
          송금됩니다.
        </p>
      </div>
    </>
  );
}

function Step4Details({
  form,
  setForm,
}: {
  form: FormShape;
  setForm: SetFormState;
}) {
  return (
    <>
      <div>
        <h2 className="mb-1 text-[18px] font-extrabold tracking-[-0.025em] text-ink">
          세부 사항을 입력해주세요
        </h2>
        <p className="text-[12.5px] font-medium text-muted-foreground">
          구체적일수록 노쇼가 줄어요 (모두 선택사항)
        </p>
      </div>

      <Field label="주요 업무" hint="한 줄에 하나씩">
        <textarea
          value={form.duties}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, duties: e.target.value }))
          }
          placeholder="POS 주문 접수&#10;음료 재료 준비&#10;매장 정리 및 청소"
          rows={4}
          className="w-full resize-none rounded-[18px] border border-border bg-surface px-4 py-3 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
        />
      </Field>

      <Field label="지원 조건" hint="한 줄에 하나씩">
        <textarea
          value={form.requirements}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, requirements: e.target.value }))
          }
          placeholder="18세 이상&#10;2시간 이상 서서 근무 가능"
          rows={3}
          className="w-full resize-none rounded-[18px] border border-border bg-surface px-4 py-3 text-[14px] font-medium text-ink transition-colors focus:border-ink focus:outline-none"
        />
      </Field>

      <Field label="복장">
        <div className="relative">
          <Shirt className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={form.dressCode}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dressCode: e.target.value }))
            }
            placeholder="예: 검정 상의 + 어두운 색 바지"
            className="h-12 w-full rounded-[14px] border border-border bg-surface pl-10 pr-4 text-[14px] font-medium tabnum text-ink transition-colors focus:border-ink focus:outline-none"
          />
        </div>
      </Field>

      <Field label="준비물" hint="쉼표로 구분">
        <div className="relative">
          <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={form.whatToBring}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, whatToBring: e.target.value }))
            }
            placeholder="예: 신분증, 마스크"
            className="h-12 w-full rounded-[14px] border border-border bg-surface pl-10 pr-4 text-[14px] font-medium tabnum text-ink transition-colors focus:border-ink focus:outline-none"
          />
        </div>
      </Field>
    </>
  );
}

function Step5Preview({
  form,
  workHours,
  totalPerPerson,
  totalCost,
}: {
  form: FormShape;
  workHours: number;
  totalPerPerson: number;
  totalCost: number;
}) {
  const category = CATEGORIES.find((c) => c.id === form.category);
  return (
    <>
      <div>
        <h2 className="mb-1 text-[18px] font-extrabold tracking-[-0.025em] text-ink">
          이대로 등록할까요?
        </h2>
        <p className="text-[12.5px] font-medium text-muted-foreground">
          등록 후에도 수정할 수 있어요
        </p>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-border-soft bg-surface shadow-soft">
        <div className="border-b border-border-soft bg-surface-2/60 p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <FileText className="h-3 w-3 text-brand-deep" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-deep">
              근무자 화면 미리보기
            </span>
          </div>
          <h3 className="text-[20px] font-extrabold leading-tight tracking-[-0.025em] text-ink">
            {form.title}
          </h3>
          <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
            {category?.emoji} {category?.label}
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[12px] border border-border-soft bg-surface p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                근무일
              </p>
              <p className="tabnum mt-0.5 text-[13px] font-extrabold text-ink">
                {form.workDate}
              </p>
            </div>
            <div className="rounded-[12px] border border-border-soft bg-surface p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                근무 시간
              </p>
              <p className="tabnum mt-0.5 text-[13px] font-extrabold text-ink">
                {form.startTime}~{form.endTime}
              </p>
            </div>
            <div className="rounded-[12px] border border-border-soft bg-surface p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                모집 인원
              </p>
              <p className="tabnum mt-0.5 text-[13px] font-extrabold text-ink">
                {form.headcount}명
              </p>
            </div>
            <div className="rounded-[12px] border border-border-soft bg-surface p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                예상 수입
              </p>
              <p className="tabnum mt-0.5 text-[13px] font-extrabold text-brand-deep">
                {formatMoney(totalPerPerson)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-subtle">
              업무 소개
            </p>
            <p className="text-[12.5px] font-medium leading-relaxed text-ink">
              {form.description}
            </p>
          </div>

          {form.duties && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-subtle">
                주요 업무
              </p>
              <ul className="space-y-0.5 text-[12.5px] font-medium text-ink">
                {form.duties
                  .split("\n")
                  .filter(Boolean)
                  .map((d) => (
                    <li key={d}>· {d}</li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[22px] bg-ink p-5 text-white shadow-soft-dark">
        <p className="text-[11.5px] font-bold uppercase tracking-wider text-white/70">
          총 예상 비용 (원천징수 별도)
        </p>
        <p className="tabnum mt-1 text-[28px] font-extrabold tracking-[-0.03em]">
          {formatMoney(totalCost)}
        </p>
        <p className="tabnum mt-1 text-[11.5px] font-medium text-white/70">
          {form.headcount}명 × {formatMoney(totalPerPerson)} ({workHours}시간 근무)
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-[14px] border border-dashed border-border bg-surface-2/60 p-3">
        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-subtle" />
        <p className="tabnum text-[11.5px] font-medium leading-relaxed text-muted-foreground">
          <Calendar className="mb-0.5 inline h-3 w-3" /> {form.workDate} ·{" "}
          {form.startTime}~{form.endTime}
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function NewJobForm({
  businessProfiles,
  initialUrgent,
}: {
  businessProfiles: BusinessProfileLite[];
  initialUrgent: boolean;
}) {
  return (
    <NewPostFlow
      businessProfiles={businessProfiles}
      initialUrgent={initialUrgent}
    />
  );
}
