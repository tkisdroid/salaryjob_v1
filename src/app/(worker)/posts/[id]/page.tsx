import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getJobById,
  calculateEarnings,
  formatWorkDate,
  categoryLabel,
  MOCK_REVIEWS,
} from "@/lib/mock-data";
import { formatMoney, formatDistance } from "@/lib/format";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Users,
  Shield,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Shirt,
  Package,
  Calendar,
  Wallet,
  Coins,
  Info,
  ChevronRight,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = getJobById(id);
  if (!job) notFound();

  const earnings = calculateEarnings(job);
  const basePay = job.hourlyPay * job.workHours;
  const nightBonus = job.nightShiftAllowance
    ? Math.floor(basePay * 0.5)
    : 0;
  const spotsLeft = job.headcount - job.filled;

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/home"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <p className="text-sm font-bold truncate flex-1">공고 상세</p>
          {job.isUrgent && (
            <span className="shrink-0 bg-red-500/10 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 fill-red-600" /> 급구
            </span>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand/5 to-brand/10 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl shrink-0">
              {job.business.logo}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-muted-foreground truncate">
                  {job.business.name}
                </p>
                {job.business.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-brand shrink-0" />
                )}
              </div>
              <h1 className="text-xl font-bold leading-tight line-clamp-2">
                {job.title}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-foreground">
                    {job.business.rating}
                  </span>
                  <span>({job.business.reviewCount})</span>
                </div>
                <span>·</span>
                <span>완료율 {job.business.completionRate}%</span>
                <span>·</span>
                <span>{categoryLabel(job.category)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] bg-white px-2 py-1 rounded-full border border-border font-medium"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Earnings Breakdown */}
        <section className="px-4 py-5 border-b border-border">
          <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5 shadow-lg shadow-brand/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-90 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" /> 예상 수입
              </p>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                근무 후 즉시 입금
              </span>
            </div>
            <p className="text-3xl font-bold">{formatMoney(earnings)}</p>
            <div className="mt-4 pt-4 border-t border-white/20 space-y-1.5 text-sm">
              <div className="flex justify-between opacity-90">
                <span>
                  시급 {formatMoney(job.hourlyPay)} × {job.workHours}시간
                </span>
                <span>{formatMoney(basePay)}</span>
              </div>
              {nightBonus > 0 && (
                <div className="flex justify-between opacity-90">
                  <span>심야 할증 (50%)</span>
                  <span>+{formatMoney(nightBonus)}</span>
                </div>
              )}
              <div className="flex justify-between opacity-90">
                <span>교통비</span>
                <span>+{formatMoney(job.transportFee)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Key info grid */}
        <section className="px-4 py-5 border-b border-border">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Calendar className="w-3 h-3" /> 근무일
              </div>
              <p className="font-bold text-sm">{formatWorkDate(job.workDate)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Clock className="w-3 h-3" /> 근무 시간
              </div>
              <p className="font-bold text-sm">
                {job.startTime}~{job.endTime}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Coins className="w-3 h-3" /> 시급
              </div>
              <p className="font-bold text-sm">{formatMoney(job.hourlyPay)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Users className="w-3 h-3" /> 모집 인원
              </div>
              <p className="font-bold text-sm">
                <span
                  className={
                    spotsLeft <= 2 ? "text-red-600" : "text-foreground"
                  }
                >
                  {spotsLeft}명
                </span>
                <span className="text-muted-foreground font-normal text-xs">
                  {" "}
                  / {job.headcount}명
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="px-4 py-5 border-b border-border">
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand" /> 업무 소개
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {job.description}
          </p>
        </section>

        {/* Duties */}
        <section className="px-4 py-5 border-b border-border">
          <h2 className="text-sm font-bold mb-3">주요 업무</h2>
          <ul className="space-y-2">
            {job.duties.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Requirements */}
        <section className="px-4 py-5 border-b border-border">
          <h2 className="text-sm font-bold mb-3">지원 조건</h2>
          <ul className="space-y-2">
            {job.requirements.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Dress code & What to bring */}
        <section className="px-4 py-5 border-b border-border space-y-4">
          <div>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <Shirt className="w-4 h-4 text-brand" /> 복장
            </h2>
            <p className="text-sm text-muted-foreground">{job.dressCode}</p>
          </div>
          <div>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-brand" /> 준비물
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {job.whatToBring.map((w) => (
                <span
                  key={w}
                  className="text-xs bg-muted px-2.5 py-1 rounded-full"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="px-4 py-5 border-b border-border">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand" /> 근무 장소
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Map placeholder */}
            <div className="aspect-[16/9] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_30%,rgba(0,0,0,0.05)_100%)]" />
              <div className="relative flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                  <MapPin className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="text-[10px] bg-white/90 px-2 py-0.5 rounded shadow-sm">
                  {formatDistance(job.distanceM)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-card">
              <p className="text-sm font-medium">{job.business.address}</p>
              {job.business.addressDetail && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.business.addressDetail}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                ※ 정확한 주소는 지원 확정 후 공개됩니다
              </p>
            </div>
          </div>
        </section>

        {/* Business info */}
        <section className="px-4 py-5 border-b border-border">
          <h2 className="text-sm font-bold mb-3">업체 정보</h2>
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
                {job.business.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm truncate">
                    {job.business.name}
                  </p>
                  {job.business.verified && (
                    <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-foreground">
                    {job.business.rating}
                  </span>
                  <span>
                    · 리뷰 {job.business.reviewCount} · 완료율{" "}
                    {job.business.completionRate}%
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {job.business.description}
            </p>
          </div>
        </section>

        {/* Reviews */}
        <section className="px-4 py-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">근무자 리뷰</h2>
            <button className="text-xs text-brand font-medium flex items-center gap-0.5">
              전체 보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {MOCK_REVIEWS.slice(0, 2).map((rev) => (
              <div key={rev.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {rev.reviewerAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{rev.reviewerName}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety notice */}
        <section className="px-4 py-5">
          <div className="rounded-xl bg-brand/5 border border-brand/20 p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-foreground mb-1">
                  GigNow가 보장합니다
                </p>
                <p className="text-muted-foreground">
                  국세청 인증을 거친 업체만 공고를 등록할 수 있으며, 근무 완료
                  후 <strong className="text-foreground">즉시 본인 계좌로 정산</strong>
                  됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">예상 수입</p>
            <p className="font-bold text-brand text-lg leading-tight">
              {formatMoney(earnings)}
            </p>
          </div>
          <Link
            href={`/posts/${job.id}/apply`}
            className="flex-[2] h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20 transition-colors"
          >
            <Zap className="w-4 h-4 fill-white" /> 원탭 지원
          </Link>
        </div>
      </div>
    </div>
  );
}
