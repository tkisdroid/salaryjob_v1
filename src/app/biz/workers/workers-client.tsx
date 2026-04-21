"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Search, Send, Star, Users } from "lucide-react";
import { toggleFavoriteWorker, sendWorkerOffer } from "./actions";
import { cn } from "@/lib/utils";

export interface BizWorkerCard {
  id: string;
  name: string;
  rating: number;
  completedJobs: number;
  completionRate: number;
  skills: string[];
  location: string;
  availability: string;
  isFavorite: boolean;
}

type ToastState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function BizWorkersClient({ workers }: { workers: BizWorkerCard[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Record<string, boolean>>(
    Object.fromEntries(workers.map((worker) => [worker.id, worker.isFavorite])),
  );
  const [toast, setToast] = useState<ToastState>({ kind: "idle" });
  const [pendingWorkerId, setPendingWorkerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter(
      (worker) =>
        worker.name.toLowerCase().includes(q) ||
        worker.location.toLowerCase().includes(q) ||
        worker.availability.toLowerCase().includes(q) ||
        worker.skills.some((skill) => skill.toLowerCase().includes(q)),
    );
  }, [workers, searchQuery]);

  const openWorker = (workerId: string) => {
    router.push(`/biz/workers/${workerId}`);
  };

  const onFavorite = (workerId: string) => {
    const previous = favorites[workerId] ?? false;
    setFavorites((prev) => ({ ...prev, [workerId]: !previous }));
    setToast({ kind: "idle" });
    startTransition(async () => {
      const result = await toggleFavoriteWorker(workerId);
      if (result.success) {
        setFavorites((prev) => ({ ...prev, [workerId]: result.isFavorite }));
        setToast({
          kind: "success",
          message: result.isFavorite ? "단골로 저장했습니다." : "단골에서 해제했습니다.",
        });
      } else {
        setFavorites((prev) => ({ ...prev, [workerId]: previous }));
        setToast({ kind: "error", message: result.error });
      }
    });
  };

  const onOffer = (workerId: string) => {
    setPendingWorkerId(workerId);
    setToast({ kind: "idle" });
    startTransition(async () => {
      const result = await sendWorkerOffer(workerId);
      setPendingWorkerId(null);
      setToast(
        result.success
          ? { kind: "success", message: result.message }
          : { kind: "error", message: result.error },
      );
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          <Users className="h-[22px] w-[22px] text-brand-deep" />
          인재 검색
        </h1>
        <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
          실제 가입 워커의 가용시간과 선호 직종을 기준으로 확인합니다.
        </p>
      </div>

      <div className="relative mb-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-surface px-4 transition-colors focus-within:border-ink">
        <Search className="h-4 w-4 text-text-subtle" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 스킬, 가용시간으로 검색"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink placeholder:text-text-subtle focus:outline-none"
        />
      </div>

      {toast.kind !== "idle" && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={cn(
            "mb-4 rounded-[14px] border px-3 py-2 text-[12.5px] font-bold",
            toast.kind === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-brand/30 bg-[color-mix(in_oklch,var(--brand)_12%,var(--surface))] text-brand-deep",
          )}
        >
          {toast.message}
        </div>
      )}

      {filteredWorkers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border bg-surface py-20 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-[20px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))]">
            <Users className="h-8 w-8 text-brand-deep" />
          </div>
          <h3 className="mb-2 text-[17px] font-extrabold tracking-[-0.02em] text-ink">
            조건에 맞는 인재를 찾지 못했어요
          </h3>
          <p className="max-w-sm text-[13px] font-medium text-muted-foreground">
            이름, 스킬, 가용시간 검색어를 조금 넓혀보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkers.map((worker) => (
            <article
              key={worker.id}
              role="button"
              tabIndex={0}
              onClick={() => openWorker(worker.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openWorker(worker.id);
                }
              }}
              className="cursor-pointer rounded-[22px] border border-border-soft bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md focus:outline-none focus:ring-2 focus:ring-ink/20"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-[14px] font-extrabold text-brand-deep">
                  {worker.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-[14.5px] font-extrabold tracking-[-0.02em] text-ink">
                      {worker.name}
                    </h2>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onFavorite(worker.id);
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform hover:bg-surface-2 active:scale-90"
                      aria-label={favorites[worker.id] ? "단골 해제" : "단골 등록"}
                    >
                      <Heart
                        className={cn(
                          "h-[18px] w-[18px]",
                          favorites[worker.id]
                            ? "fill-brand-deep text-brand-deep"
                            : "text-text-subtle",
                        )}
                      />
                    </button>
                  </div>

                  <div className="tabnum mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                    <Star className="h-3 w-3 fill-[#fbbf24] text-[#fbbf24]" />
                    <span>
                      <b className="font-bold text-ink">{worker.rating.toFixed(1)}</b> ·{" "}
                      {worker.completedJobs}회 근무 · 완료율 {worker.completionRate}%
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {worker.skills.length === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                        선호 직종 미등록
                      </span>
                    ) : (
                      worker.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--brand)_14%,var(--surface))] px-2 py-0.5 text-[10.5px] font-bold text-brand-deep"
                        >
                          {skill}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-2 flex items-start gap-1 text-[10.5px] font-medium text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      <b className="font-bold text-ink">{worker.location}</b>
                      {" · "}
                      {worker.availability}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isPending && pendingWorkerId === worker.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOffer(worker.id);
                    }}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[12px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isPending && pendingWorkerId === worker.id ? "전송 중..." : "제안 보내기"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
