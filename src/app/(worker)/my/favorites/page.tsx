import Link from "next/link";
import { ChevronLeft, Heart, Search } from "lucide-react";

export default function WorkerFavoritesPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/my"
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          <Heart className="h-[20px] w-[20px] text-brand-deep" />
          찜한 공고
        </h1>
      </div>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-[22px] border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))]">
            <Heart className="h-6 w-6 text-brand-deep" />
          </div>
          <p className="text-[14px] font-medium leading-relaxed text-muted-foreground">
            저장한 공고 목록 UI는 준비 중입니다.
            <br />
            지금은 공고 탐색 화면으로 바로 이동할 수 있습니다.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
          >
            <Search className="h-4 w-4" />
            공고 탐색하기
          </Link>
        </div>
      </div>
    </div>
  );
}
