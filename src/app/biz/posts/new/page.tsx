"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/format";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Loader2,
  Clock,
  Wallet,
  Users,
  Coins,
  Shirt,
  Package,
  Calendar,
  FileText,
  PartyPopper,
  TrendingUp,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3 | 4 | 5;

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

interface FormData {
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

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

function NewPostFlow() {
  const searchParams = useSearchParams();
  const initialUrgent = searchParams.get("urgent") === "1";

  const [step, setStep] = useState<Step>(1);
  const [published, setPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [form, setForm] = useState<FormData>({
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
        return true;
      default:
        return false;
    }
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublished(true);
    }, 1200);
  };

  // ------------------------------------------------------------------------
  // Published state
  // ------------------------------------------------------------------------
  if (published) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center mb-5 relative">
            <PartyPopper className="w-12 h-12 text-brand" />
            <div className="absolute inset-0 rounded-full border-2 border-brand animate-ping opacity-25" />
          </div>
          <h1 className="text-2xl font-bold mb-2">공고가 등록됐어요!</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {form.isUrgent
              ? "급구 공고로 등록되어 즉시 매칭이 시작됩니다."
              : "매칭이 자동으로 시작됩니다."}
            <br />
            지원이 들어오면 알림으로 알려드려요.
          </p>

          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-left">
            <p className="text-[10px] text-muted-foreground mb-1">등록된 공고</p>
            <p className="font-bold text-sm mb-2">{form.title}</p>
            <div className="pt-3 border-t border-border space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {form.workDate} · {form.startTime}~{form.endTime}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                {form.headcount}명 모집
              </div>
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3 h-3" />
                인당 {formatMoney(totalPerPerson)}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/95 backdrop-blur p-4 space-y-2">
          <div className="max-w-lg mx-auto space-y-2">
            <Link
              href="/biz"
              className="block w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-center leading-[3rem] shadow-lg shadow-brand/20 transition-colors"
            >
              대시보드로
            </Link>
            <Link
              href="/biz/posts"
              className="block w-full h-11 rounded-xl border border-border hover:bg-muted font-medium text-sm text-center leading-[2.75rem] transition-colors"
            >
              공고 목록 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // Publishing animation
  // ------------------------------------------------------------------------
  if (isPublishing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
        <p className="text-sm font-medium">공고를 등록하고 매칭을 시작하는 중...</p>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // Step form
  // ------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {step === 1 ? (
            <Link
              href="/biz/posts"
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep((step - 1) as Step)}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">
              {step}/5 단계
            </p>
            <p className="text-sm font-bold truncate">{STEP_TITLES[step]}</p>
          </div>
          {form.isUrgent && (
            <span className="shrink-0 bg-red-500/10 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 fill-red-600" /> 급구
            </span>
          )}
        </div>
        {/* Progress */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all ${
                  s <= step ? "bg-brand" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
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
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {step < 5 ? (
            <button
              type="button"
              disabled={!canProceed(step)}
              onClick={() => setStep((step + 1) as Step)}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
            >
              다음 <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20 transition-colors"
            >
              <Zap className="w-4 h-4 fill-white" /> 공고 등록하고 매칭 시작
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
      <label className="text-xs font-bold flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Step1Basic({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-lg font-bold mb-1">어떤 일을 구하시나요?</h2>
        <p className="text-xs text-muted-foreground">
          근무자가 한눈에 이해할 수 있게 설명해주세요
        </p>
      </div>

      <Field label="공고 제목" required hint="10자 이내로 핵심만">
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="예: 주말 카페 바리스타 보조"
          maxLength={40}
          className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
        />
      </Field>

      <Field label="카테고리" required>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setForm({ ...form, category: c.id })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                form.category === c.id
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-brand/40"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[10px] font-medium">{c.label}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="업무 소개"
        required
        hint="업무 내용, 분위기 등 자유롭게"
      >
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="예: 주문 받기, 음료 제조 보조, 매장 정리를 함께 해주실 분을 찾습니다."
          rows={5}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm resize-none"
        />
      </Field>

      <div className="rounded-xl bg-brand/5 border border-brand/20 p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">AI 도우미 Tip:</strong> 구체적인
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
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div>
        <h2 className="text-lg font-bold mb-1">언제, 몇 명이 필요하신가요?</h2>
        <p className="text-xs text-muted-foreground">
          당일 근무도 가능해요
        </p>
      </div>

      <Field label="근무일" required>
        <input
          type="date"
          min={today}
          value={form.workDate}
          onChange={(e) => setForm({ ...form, workDate: e.target.value })}
          className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="시작 시간" required>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
          />
        </Field>
        <Field label="종료 시간" required>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
          />
        </Field>
      </div>

      <Field label="모집 인원" required>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, headcount: Math.max(1, form.headcount - 1) })
            }
            className="w-11 h-11 rounded-xl border border-border hover:bg-muted flex items-center justify-center text-xl font-bold"
          >
            −
          </button>
          <div className="flex-1 h-11 rounded-xl border border-border bg-background flex items-center justify-center">
            <span className="text-lg font-bold">{form.headcount}명</span>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, headcount: Math.min(50, form.headcount + 1) })
            }
            className="w-11 h-11 rounded-xl border border-border hover:bg-muted flex items-center justify-center text-xl font-bold"
          >
            +
          </button>
        </div>
      </Field>

      <Field label="급구 여부">
        <button
          type="button"
          onClick={() => setForm({ ...form, isUrgent: !form.isUrgent })}
          className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
            form.isUrgent
              ? "border-red-500 bg-red-500/5"
              : "border-border hover:border-red-500/40"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              form.isUrgent ? "bg-red-500" : "bg-muted"
            }`}
          >
            <Zap
              className={`w-5 h-5 ${
                form.isUrgent ? "text-white fill-white" : "text-muted-foreground"
              }`}
            />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-sm">급구로 등록</p>
            <p className="text-[11px] text-muted-foreground">
              평균 5분 내 매칭, 상단 노출
            </p>
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              form.isUrgent
                ? "border-red-500 bg-red-500"
                : "border-border"
            }`}
          >
            {form.isUrgent && <Check className="w-3 h-3 text-white" />}
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
  form: FormData;
  setForm: (f: FormData) => void;
  workHours: number;
  basePay: number;
  totalPerPerson: number;
  totalCost: number;
}) {
  const MINIMUM_WAGE = 10030; // 2026 minimum wage (KRW)
  return (
    <>
      <div>
        <h2 className="text-lg font-bold mb-1">보상을 얼마로 책정할까요?</h2>
        <p className="text-xs text-muted-foreground">
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
              setForm({ ...form, hourlyPay: Number(e.target.value) })
            }
            step={100}
            min={MINIMUM_WAGE}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
          />
        </div>
        {form.hourlyPay < MINIMUM_WAGE && form.hourlyPay > 0 && (
          <p className="text-[10px] text-red-500">
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
              setForm({ ...form, transportFee: Number(e.target.value) })
            }
            step={500}
            min={0}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
          />
        </div>
      </Field>

      {/* Live preview */}
      <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs opacity-90">예상 비용 (인당)</p>
          <TrendingUp className="w-4 h-4 opacity-80" />
        </div>
        <p className="text-3xl font-bold">{formatMoney(totalPerPerson)}</p>
        <div className="mt-3 pt-3 border-t border-white/20 space-y-1 text-xs">
          <div className="flex justify-between opacity-90">
            <span>
              기본급 ({form.hourlyPay.toLocaleString()}원 × {workHours || 0}시간)
            </span>
            <span>{formatMoney(basePay)}</span>
          </div>
          <div className="flex justify-between opacity-90">
            <span>교통비</span>
            <span>{formatMoney(form.transportFee)}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
          <span className="text-xs opacity-90">
            총 비용 ({form.headcount}명)
          </span>
          <span className="text-lg font-bold">{formatMoney(totalCost)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-muted/50 p-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
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
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-lg font-bold mb-1">세부 사항을 입력해주세요</h2>
        <p className="text-xs text-muted-foreground">
          구체적일수록 노쇼가 줄어요 (모두 선택사항)
        </p>
      </div>

      <Field label="주요 업무" hint="한 줄에 하나씩">
        <textarea
          value={form.duties}
          onChange={(e) => setForm({ ...form, duties: e.target.value })}
          placeholder="POS 주문 접수&#10;음료 재료 준비&#10;매장 정리 및 청소"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm resize-none"
        />
      </Field>

      <Field label="지원 조건" hint="한 줄에 하나씩">
        <textarea
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          placeholder="18세 이상&#10;2시간 이상 서서 근무 가능"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm resize-none"
        />
      </Field>

      <Field label="복장">
        <div className="relative">
          <Shirt className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={form.dressCode}
            onChange={(e) => setForm({ ...form, dressCode: e.target.value })}
            placeholder="예: 검정 상의 + 어두운 색 바지"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
          />
        </div>
      </Field>

      <Field label="준비물" hint="쉼표로 구분">
        <div className="relative">
          <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={form.whatToBring}
            onChange={(e) => setForm({ ...form, whatToBring: e.target.value })}
            placeholder="예: 신분증, 마스크"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm"
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
  form: FormData;
  workHours: number;
  totalPerPerson: number;
  totalCost: number;
}) {
  const category = CATEGORIES.find((c) => c.id === form.category);
  return (
    <>
      <div>
        <h2 className="text-lg font-bold mb-1">이대로 등록할까요?</h2>
        <p className="text-xs text-muted-foreground">
          등록 후에도 수정할 수 있어요
        </p>
      </div>

      {/* Preview as worker would see */}
      <div className="rounded-2xl border-2 border-brand/20 overflow-hidden">
        <div className="bg-brand/5 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3 h-3 text-brand" />
            <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
              근무자 화면 미리보기
            </span>
          </div>
          <h3 className="text-xl font-bold leading-tight">{form.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {category?.emoji} {category?.label}
          </p>
        </div>
        <div className="p-4 space-y-3 bg-card">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">근무일</p>
              <p className="font-bold">{form.workDate}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">
                근무 시간
              </p>
              <p className="font-bold">
                {form.startTime}~{form.endTime}
              </p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">
                모집 인원
              </p>
              <p className="font-bold">{form.headcount}명</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">
                예상 수입
              </p>
              <p className="font-bold text-brand">
                {formatMoney(totalPerPerson)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-1">
              업무 소개
            </p>
            <p className="text-xs leading-relaxed">{form.description}</p>
          </div>

          {form.duties && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1">
                주요 업무
              </p>
              <ul className="text-xs space-y-0.5">
                {form.duties.split("\n").filter(Boolean).map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Cost summary */}
      <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5">
        <p className="text-xs opacity-90 mb-1">총 예상 비용 (원천징수 별도)</p>
        <p className="text-3xl font-bold">{formatMoney(totalCost)}</p>
        <p className="text-[11px] opacity-90 mt-2">
          {form.headcount}명 × {formatMoney(totalPerPerson)} ({workHours}시간
          근무)
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BizPostNewPage() {
  return (
    <Suspense fallback={null}>
      <NewPostFlow />
    </Suspense>
  );
}
