import Link from "next/link";
import { Heart, Search } from "lucide-react";

export default function WorkerFavoritesPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="rounded-3xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
          <Heart className="h-7 w-7 text-brand" />
        </div>
        <h1 className="text-xl font-bold">찜한 공고</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          저장한 공고 목록 UI는 준비 중입니다. 지금은 공고 탐색 화면으로 바로
          이동할 수 있습니다.
        </p>
        <Link
          href="/search"
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand/90"
        >
          <Search className="h-4 w-4" />
          공고 탐색하기
        </Link>
      </div>
    </div>
  );
}
