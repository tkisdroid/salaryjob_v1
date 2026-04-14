import Link from "next/link";
import { ArrowLeft, Heart, Search } from "lucide-react";
import { BackButton } from "@/components/shared/back-button";

export default function WorkerFavoritesPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <BackButton fallbackHref="/my" ariaLabel="뒤로" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </BackButton>
        <h1 className="text-base font-bold">찜한 공고</h1>
      </div>
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl border border-border bg-card p-8 text-center w-full max-w-sm">
          <div className="mx-auto w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mb-4">
            <Heart className="h-6 w-6 text-brand" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            저장한 공고 목록 UI는 준비 중입니다.
            <br />
            지금은 공고 탐색 화면으로 바로 이동할 수 있습니다.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/20"
          >
            <Search className="h-4 w-4" />
            공고 탐색하기
          </Link>
        </div>
      </div>
    </div>
  );
}
