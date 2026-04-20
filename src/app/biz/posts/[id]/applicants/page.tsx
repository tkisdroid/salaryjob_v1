import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { requireJobOwner } from "@/lib/dal";
import { getApplicationsByJob } from "@/lib/db/queries";
import { ApplicantsClient } from "./applicants-client";

/**
 * Phase 4 Plan 04-09 — Biz 지원자 관리 page.
 *
 * Server component가 ownership 게이트(`requireJobOwner`) + 초기 지원자
 * 리스트(`getApplicationsByJob`)를 fetch해서 클라이언트에 넘긴다.
 * 인라인 APPLICANTS mock 상수는 Plan 04-09에서 완전히 제거되었으며,
 * 실시간 업데이트 / accept / reject는 `applicants-client.tsx`가 담당.
 *
 * Serialization: Prisma `Date` / `Decimal`이 섞여 있으므로
 * `JSON.parse(JSON.stringify(...))`로 평탄화하여 Next 16 server→client
 * 직렬화 제약을 우회한다. 클라이언트는 display-only라 primitive 충분.
 */

export default async function BizApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Ownership gate — redirects on 404/403, so we can assume valid job here.
  const { job } = await requireJobOwner(id);
  const rawApplications = await getApplicationsByJob(id);
  const initialApplications = JSON.parse(
    JSON.stringify(rawApplications),
  ) as SerializedApplication[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/biz/posts/${id}`}
          aria-label="뒤로"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
            <Users className="h-[22px] w-[22px] text-brand-deep" />
            지원자 관리
          </h1>
          <p className="mt-0.5 text-[12.5px] font-medium text-muted-foreground">
            {job.title} <span className="text-text-subtle">·</span> 지원자{" "}
            <b className="tabnum font-extrabold text-ink">
              {initialApplications.length}
            </b>
            명
          </p>
        </div>
      </div>

      <ApplicantsClient
        jobId={id}
        initialApplications={initialApplications}
      />
    </div>
  );
}

// Re-exported so applicants-client.tsx can import the exact same shape
// without duplicating the JSON-serialized type definition.
export type SerializedApplication = {
  id: string;
  jobId: string;
  workerId: string;
  status:
    | "pending"
    | "confirmed"
    | "checked_in"
    | "in_progress"
    | "completed"
    | "settled"
    | "cancelled";
  appliedAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  worker: {
    id: string;
    email: string | null;
    name: string;
    nickname: string | null;
    avatar: string | null;
    badgeLevel: string;
  };
  workerProfile: {
    userId: string;
    name: string;
    nickname: string | null;
    avatar: string | null;
    rating: number | string | null;
    totalJobs: number | null;
    completionRate: number | string | null;
    badgeLevel: string;
    noShowCount: number;
  } | null;
};
