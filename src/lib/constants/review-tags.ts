/**
 * Phase 5 REV-01 / REV-02 — hardcoded review tag sets.
 * Single file edit applies everywhere: review-form component reads the const
 * from here, Zod schema does NOT enum-validate individual tags (open string).
 * Storage: Review.tags String[] (text[]) — DB migration not required.
 *
 * Source: 05-RESEARCH.md § "Review Tag Sets" lines 815-838
 */

// Worker → Business (어떤 사업장이었나?)
export const WORKER_TO_BIZ_TAGS = [
  "친절해요",
  "분위기 좋음",
  "시간 엄수",
  "지시 명확",
  "업무량 적당",
  "교통비 제대로",
  "재방문 의사",
  "초보도 환영",
] as const;

// Business → Worker (어떤 근무자였나?)
export const BIZ_TO_WORKER_TAGS = [
  "성실함",
  "밝은 인상",
  "시간 엄수",
  "업무 숙련",
  "의사소통 원활",
  "책임감 있음",
  "팀워크 좋음",
  "재고용 희망",
] as const;

export type WorkerToBizTag = (typeof WORKER_TO_BIZ_TAGS)[number];
export type BizToWorkerTag = (typeof BIZ_TO_WORKER_TAGS)[number];
