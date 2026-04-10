// AI-powered matching between workers and posts
// Production defaults prioritize low-cost Gemini reranking with deterministic fallbacks.

import { createHash } from "node:crypto";
import { Output, gateway, generateText } from "ai";
import { z } from "zod";

const AI_MATCHING_MODEL =
  process.env.AI_MATCHING_MODEL ?? "google/gemini-3.1-flash-lite-preview";
const AI_MATCHING_FALLBACK_MODEL = process.env.AI_MATCHING_FALLBACK_MODEL;
const AI_MATCHING_MAX_POSTS = Number(process.env.AI_MATCHING_MAX_POSTS ?? 12);
const AI_MATCHING_MAX_WORKERS = Number(
  process.env.AI_MATCHING_MAX_WORKERS ?? 12
);
const AI_MATCHING_REASON_LIMIT = Number(
  process.env.AI_MATCHING_REASON_LIMIT ?? 3
);
const AI_MATCHING_MIN_SCORE = Number(process.env.AI_MATCHING_MIN_SCORE ?? 35);
const AI_MATCHING_MAX_OUTPUT_TOKENS = Number(
  process.env.AI_MATCHING_MAX_OUTPUT_TOKENS ?? 700
);

const CATEGORY_ALIASES: Record<string, string[]> = {
  cafe: ["카페", "커피", "커피전문점", "바리스타", "카페알바"],
  restaurant: ["식당", "음식점", "주방", "주방보조", "서빙", "홀서빙"],
  retail: ["편의점", "매장", "판매", "캐셔", "카운터", "리테일"],
  logistics: ["물류", "상하차", "포장", "분류", "배송", "입출고"],
  event: ["행사", "이벤트", "스태프", "안내", "운영요원"],
  office: ["사무", "행정", "문서", "데이터입력", "오피스"],
  cleaning: ["청소", "정리", "미화"],
};

const MatchResultSchema = z.object({
  matches: z
    .array(
      z.object({
        postId: z.string(),
        score: z.number().min(0).max(100),
        reasons: z.array(z.string().min(1).max(40)).max(AI_MATCHING_REASON_LIMIT),
        expectedFit: z.string().max(80).optional(),
      })
    )
    .max(AI_MATCHING_MAX_POSTS),
});

const WorkerRecommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        workerId: z.string(),
        score: z.number().min(0).max(100),
        reasons: z.array(z.string().min(1).max(40)).max(AI_MATCHING_REASON_LIMIT),
        riskFactors: z.array(z.string().min(1).max(40)).max(2).optional(),
        matchStrengths: z.array(z.string().min(1).max(40)).max(3).optional(),
      })
    )
    .max(AI_MATCHING_MAX_WORKERS),
});

interface MatchResult {
  postId: string;
  score: number;
  reasons: string[];
  confidenceLevel?: "high" | "medium" | "low";
  expectedFit?: string;
}

interface MatchInput {
  worker: {
    preferredCategories: string[];
    preferredRegions: string[];
    preferredPayMin?: number;
    avgRating: number;
    totalJobsCompleted: number;
    skills: string[];
  };
  posts: Array<{
    id: string;
    title: string;
    postType: string;
    category?: string;
    payAmountMin?: number;
    payAmountMax?: number;
    address?: string;
    tags: string[];
    isUrgent: boolean;
  }>;
}

type HeuristicPostMatch = MatchResult & {
  heuristicScore: number;
  overlapScore: number;
  reliabilityScore: number;
};

type WorkerRecommendation = { workerId: string; score: number; reasons: string[] };

type HeuristicWorkerRecommendation = WorkerRecommendation & {
  heuristicScore: number;
  overlapScore: number;
  reliabilityScore: number;
};

function clampScore(score: number) {
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeKoreanToken(value: string) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) return "";

  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias.toLowerCase()))) {
      return canonical;
    }
  }

  return normalized;
}

function dedupeNormalized(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeKoreanToken(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function regionMatches(address: string | undefined, preferredRegions: string[]) {
  if (!address || preferredRegions.length === 0) return false;
  const normalizedAddress = normalizeKoreanToken(address);
  return preferredRegions.some((region) => normalizedAddress.includes(region));
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
}

function shortReasons(reasons: string[]) {
  return reasons.slice(0, AI_MATCHING_REASON_LIMIT).map((reason) =>
    normalizeWhitespace(reason).slice(0, 40)
  );
}

function buildInputHash(payload: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 12);
}

function buildGatewayOptions(feature: string, cacheHash: string) {
  return {
    gateway: {
      tags: [
        `feature:${feature}`,
        "service:ai-matching",
        `model:${AI_MATCHING_MODEL}`,
        `cache:${cacheHash}`,
      ],
      cacheControl: "max-age=300",
    },
  };
}

function computeConfidence(score: number, overlapScore: number, reliabilityScore: number) {
  if (score >= 82 && overlapScore >= 18 && reliabilityScore >= 8) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function normalizeWorker(worker: MatchInput["worker"]) {
  return {
    preferredCategories: dedupeNormalized(worker.preferredCategories),
    preferredRegions: dedupeNormalized(worker.preferredRegions),
    preferredPayMin: worker.preferredPayMin,
    avgRating: worker.avgRating,
    totalJobsCompleted: worker.totalJobsCompleted,
    skills: dedupeNormalized(worker.skills),
  };
}

function normalizePost(post: MatchInput["posts"][number]) {
  return {
    ...post,
    title: normalizeWhitespace(post.title),
    postType: normalizeKoreanToken(post.postType),
    category: post.category ? normalizeKoreanToken(post.category) : undefined,
    address: post.address ? normalizeWhitespace(post.address) : undefined,
    tags: dedupeNormalized(post.tags),
  };
}

function getPostHeuristic(worker: ReturnType<typeof normalizeWorker>, post: ReturnType<typeof normalizePost>): HeuristicPostMatch {
  let score = 22;
  let overlapScore = 0;
  let reliabilityScore = 0;
  const reasons: string[] = [];

  const postTopics = dedupeNormalized([
    post.category ?? "",
    post.title,
    ...post.tags,
  ]);

  const categoryOverlap = overlapCount(worker.preferredCategories, postTopics);
  if (categoryOverlap > 0) {
    const bonus = Math.min(32, categoryOverlap * 16);
    score += bonus;
    overlapScore += bonus;
    reasons.push("선호 직무와 매우 가깝습니다");
  }

  const skillOverlap = overlapCount(worker.skills, postTopics);
  if (skillOverlap > 0) {
    const bonus = Math.min(18, skillOverlap * 6);
    score += bonus;
    overlapScore += bonus;
    reasons.push("보유 경험과 태그가 겹칩니다");
  }

  if (regionMatches(post.address, worker.preferredRegions)) {
    score += 14;
    overlapScore += 10;
    reasons.push("선호 지역과 동선이 맞습니다");
  }

  if (post.payAmountMin && worker.preferredPayMin) {
    if (post.payAmountMin >= worker.preferredPayMin) {
      score += 14;
      reasons.push("희망 급여 이상입니다");
    } else if (post.payAmountMin >= worker.preferredPayMin * 0.9) {
      score += 8;
      reasons.push("희망 급여와 큰 차이가 없습니다");
    } else {
      score -= 6;
    }
  }

  if (post.isUrgent) {
    score += 6;
    reasons.push("긴급 공고라 빠른 연결이 가능합니다");
  }

  if (worker.totalJobsCompleted >= 20) {
    score += 8;
    reliabilityScore += 8;
  } else if (worker.totalJobsCompleted >= 8) {
    score += 5;
    reliabilityScore += 5;
  }

  if (worker.avgRating >= 4.7) {
    score += 6;
    reliabilityScore += 6;
  } else if (worker.avgRating >= 4.3) {
    score += 3;
    reliabilityScore += 3;
  }

  if (reasons.length === 0) {
    reasons.push("조건을 더 확인해볼 만한 공고입니다");
  }

  const finalScore = clampScore(score);
  return {
    postId: post.id,
    score: finalScore,
    heuristicScore: finalScore,
    overlapScore,
    reliabilityScore,
    reasons: shortReasons(reasons),
    confidenceLevel: computeConfidence(finalScore, overlapScore, reliabilityScore),
  };
}

function rerankPostsWithDeterministicTies(
  scored: Array<HeuristicPostMatch>,
  llmMatches: MatchResult[]
) {
  const llmById = new Map(llmMatches.map((match) => [match.postId, match]));

  return scored
    .map((candidate) => {
      const llm = llmById.get(candidate.postId);
      const mergedScore = llm
        ? clampScore(llm.score * 0.7 + candidate.heuristicScore * 0.3)
        : candidate.heuristicScore;

      return {
        postId: candidate.postId,
        score: mergedScore,
        reasons: shortReasons(llm?.reasons?.length ? llm.reasons : candidate.reasons),
        expectedFit: llm?.expectedFit,
        confidenceLevel: computeConfidence(
          mergedScore,
          candidate.overlapScore,
          candidate.reliabilityScore
        ),
        overlapScore: candidate.overlapScore,
        reliabilityScore: candidate.reliabilityScore,
      };
    })
    .filter((match) => match.score >= AI_MATCHING_MIN_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.overlapScore !== a.overlapScore) return b.overlapScore - a.overlapScore;
      return b.reliabilityScore - a.reliabilityScore;
    })
    .map((item) => ({
      postId: item.postId,
      score: item.score,
      reasons: item.reasons,
      expectedFit: item.expectedFit,
      confidenceLevel: item.confidenceLevel,
    }));
}

async function generateStructuredObject<T>({
  feature,
  payload,
  schema,
  system,
  prompt,
}: {
  feature: string;
  payload: unknown;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}) {
  const cacheHash = buildInputHash(payload);
  const providerOptions = buildGatewayOptions(feature, cacheHash);

  const primaryAttempt = async (modelId: string) =>
    generateText({
      model: gateway(modelId),
      system,
      prompt,
      output: Output.object({ schema }),
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: AI_MATCHING_MAX_OUTPUT_TOKENS,
      providerOptions,
    });

  try {
    return await primaryAttempt(AI_MATCHING_MODEL);
  } catch (primaryError) {
    if (
      AI_MATCHING_FALLBACK_MODEL &&
      AI_MATCHING_FALLBACK_MODEL !== AI_MATCHING_MODEL
    ) {
      try {
        return await primaryAttempt(AI_MATCHING_FALLBACK_MODEL);
      } catch (fallbackError) {
        console.error("[AI Matching] Primary and fallback model failed", {
          feature,
          primaryModel: AI_MATCHING_MODEL,
          fallbackModel: AI_MATCHING_FALLBACK_MODEL,
          primaryError,
          fallbackError,
        });
      }
    } else {
      console.error("[AI Matching] Model call failed", {
        feature,
        model: AI_MATCHING_MODEL,
        error: primaryError,
      });
    }

    throw primaryError;
  }
}

export async function generateMatchRecommendations(
  input: MatchInput
): Promise<MatchResult[]> {
  const worker = normalizeWorker(input.worker);
  const scoredCandidates = input.posts
    .map(normalizePost)
    .map((post) => getPostHeuristic(worker, post))
    .sort((a, b) => {
      if (b.heuristicScore !== a.heuristicScore) {
        return b.heuristicScore - a.heuristicScore;
      }
      return b.overlapScore - a.overlapScore;
    });

  const shortlisted = scoredCandidates.slice(0, AI_MATCHING_MAX_POSTS);
  if (shortlisted.length === 0) return [];

  const compactPayload = {
    locale: "ko-KR",
    worker,
    candidates: shortlisted.map((candidate) => {
      const original = input.posts.find((post) => post.id === candidate.postId)!;
      const normalized = normalizePost(original);
      return {
        id: normalized.id,
        title: normalized.title,
        category: normalized.category ?? null,
        payAmountMin: normalized.payAmountMin ?? null,
        payAmountMax: normalized.payAmountMax ?? null,
        address: normalized.address ?? null,
        tags: normalized.tags,
        isUrgent: normalized.isUrgent,
        heuristicScore: candidate.heuristicScore,
      };
    }),
  };

  const system = [
    "당신은 한국 단기 일자리 매칭 랭커입니다.",
    "반드시 한국어로, 짧고 구체적인 이유만 작성합니다.",
    `후보마다 score(0-100)와 reasons 최대 ${AI_MATCHING_REASON_LIMIT}개만 반환합니다.`,
    "점수는 직무 적합성, 태그/기술 겹침, 급여 적합성, 지역 적합성, 긴급성, 신뢰도를 함께 반영합니다.",
    "과장 표현, 추측, 장문 설명을 금지합니다.",
  ].join(" ");

  const prompt = [
    "아래 JSON의 candidates만 재평가하세요.",
    "heuristicScore는 참고용이며, 실제 적합성이 낮으면 더 낮게 줄 수 있습니다.",
    "reasons는 사용자에게 바로 보여줄 수 있는 짧은 한국어 문장으로 작성하세요.",
    JSON.stringify(compactPayload),
  ].join("\n\n");

  try {
    const result = await generateStructuredObject({
      feature: "job-matching",
      payload: compactPayload,
      schema: MatchResultSchema,
      system,
      prompt,
    });

    return rerankPostsWithDeterministicTies(shortlisted, result.output.matches);
  } catch {
    return generateFallbackMatches(input);
  }
}

function generateFallbackMatches(input: MatchInput): MatchResult[] {
  const worker = normalizeWorker(input.worker);
  return input.posts
    .map(normalizePost)
    .map((post) => getPostHeuristic(worker, post))
    .filter((match) => match.score >= AI_MATCHING_MIN_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.overlapScore !== a.overlapScore) return b.overlapScore - a.overlapScore;
      return b.reliabilityScore - a.reliabilityScore;
    })
    .map((match): MatchResult => ({
      postId: match.postId,
      score: match.score,
      reasons: match.reasons,
      expectedFit: match.expectedFit,
      confidenceLevel: match.confidenceLevel,
    }));
}

function normalizeEmployerPost(params: {
  postId: string;
  postCategory?: string;
  postTags: string[];
  payAmount?: number;
}) {
  return {
    postId: params.postId,
    postCategory: params.postCategory
      ? normalizeKoreanToken(params.postCategory)
      : undefined,
    postTags: dedupeNormalized(params.postTags),
    payAmount: params.payAmount,
  };
}

function getWorkerHeuristic(params: {
  postCategory?: string;
  postTags: string[];
  payAmount?: number;
  worker: {
    id: string;
    name: string;
    skills: string[];
    avgRating: number;
    totalJobsCompleted: number;
    noShowCount: number;
  };
}): HeuristicWorkerRecommendation {
  let score = 24;
  let overlapScore = 0;
  let reliabilityScore = 0;
  const reasons: string[] = [];

  const workerSkills = dedupeNormalized(params.worker.skills);
  const targetTopics = dedupeNormalized([
    params.postCategory ?? "",
    ...params.postTags,
  ]);

  const skillOverlap = overlapCount(workerSkills, targetTopics);
  if (skillOverlap > 0) {
    const bonus = Math.min(34, skillOverlap * 12);
    score += bonus;
    overlapScore += bonus;
    reasons.push("요구 업무와 경험이 맞습니다");
  }

  if (params.worker.avgRating >= 4.8) {
    score += 18;
    reliabilityScore += 18;
    reasons.push("평점이 매우 높습니다");
  } else if (params.worker.avgRating >= 4.4) {
    score += 12;
    reliabilityScore += 12;
    reasons.push("평점이 안정적입니다");
  } else if (params.worker.avgRating >= 4.0) {
    score += 6;
    reliabilityScore += 6;
  }

  if (params.worker.totalJobsCompleted >= 30) {
    score += 16;
    reliabilityScore += 10;
    reasons.push("완료 이력이 많아 운영 리스크가 낮습니다");
  } else if (params.worker.totalJobsCompleted >= 12) {
    score += 10;
    reliabilityScore += 6;
    reasons.push("실무 경험이 충분합니다");
  } else if (params.worker.totalJobsCompleted >= 5) {
    score += 5;
  }

  if (params.worker.noShowCount === 0) {
    score += 10;
    reliabilityScore += 10;
    reasons.push("노쇼 이력이 없습니다");
  } else if (params.worker.noShowCount >= 3) {
    score -= 24;
    reliabilityScore -= 12;
  } else {
    score -= params.worker.noShowCount * 6;
    reliabilityScore -= params.worker.noShowCount * 3;
  }

  if (params.payAmount && params.payAmount >= 13000 && params.worker.avgRating >= 4.5) {
    score += 4;
  }

  if (reasons.length === 0) {
    reasons.push("추가 확인 후 제안할 만합니다");
  }

  return {
    workerId: params.worker.id,
    score: clampScore(score),
    heuristicScore: clampScore(score),
    overlapScore,
    reliabilityScore,
    reasons: shortReasons(reasons),
  };
}

function rerankWorkersWithDeterministicTies(
  scored: HeuristicWorkerRecommendation[],
  llmRecommendations: WorkerRecommendation[]
) {
  const llmById = new Map(
    llmRecommendations.map((recommendation) => [recommendation.workerId, recommendation])
  );

  return scored
    .map((candidate) => {
      const llm = llmById.get(candidate.workerId);
      const mergedScore = llm
        ? clampScore(llm.score * 0.7 + candidate.heuristicScore * 0.3)
        : candidate.heuristicScore;

      return {
        workerId: candidate.workerId,
        score: mergedScore,
        reasons: shortReasons(llm?.reasons?.length ? llm.reasons : candidate.reasons),
        overlapScore: candidate.overlapScore,
        reliabilityScore: candidate.reliabilityScore,
      };
    })
    .filter((item) => item.score >= AI_MATCHING_MIN_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.overlapScore !== a.overlapScore) return b.overlapScore - a.overlapScore;
      return b.reliabilityScore - a.reliabilityScore;
    })
    .map((item) => ({
      workerId: item.workerId,
      score: item.score,
      reasons: item.reasons,
    }));
}

export async function generateWorkerRecommendations(params: {
  postId: string;
  postCategory?: string;
  postTags: string[];
  payAmount?: number;
  workers: Array<{
    id: string;
    name: string;
    skills: string[];
    avgRating: number;
    totalJobsCompleted: number;
    noShowCount: number;
  }>;
}): Promise<Array<{ workerId: string; score: number; reasons: string[] }>> {
  const normalizedPost = normalizeEmployerPost(params);
  const scoredCandidates = params.workers
    .map((worker) =>
      getWorkerHeuristic({
        ...normalizedPost,
        worker,
      })
    )
    .sort((a, b) => {
      if (b.heuristicScore !== a.heuristicScore) {
        return b.heuristicScore - a.heuristicScore;
      }
      return b.reliabilityScore - a.reliabilityScore;
    });

  const shortlisted = scoredCandidates.slice(0, AI_MATCHING_MAX_WORKERS);
  if (shortlisted.length === 0) return [];

  const compactPayload = {
    locale: "ko-KR",
    post: normalizedPost,
    candidates: shortlisted.map((candidate) => {
      const worker = params.workers.find((item) => item.id === candidate.workerId)!;
      return {
        id: worker.id,
        name: normalizeWhitespace(worker.name),
        skills: dedupeNormalized(worker.skills),
        avgRating: worker.avgRating,
        totalJobsCompleted: worker.totalJobsCompleted,
        noShowCount: worker.noShowCount,
        heuristicScore: candidate.heuristicScore,
      };
    }),
  };

  const system = [
    "당신은 한국 채용 담당자를 위한 인재 랭커입니다.",
    "반드시 짧은 한국어로만 이유를 작성합니다.",
    `후보마다 score(0-100)와 reasons 최대 ${AI_MATCHING_REASON_LIMIT}개만 반환합니다.`,
    "직무 적합성, 태그 겹침, 신뢰도, 완료 경험, 노쇼 리스크를 함께 평가합니다.",
    "장문 설명과 추측을 금지합니다.",
  ].join(" ");

  const prompt = [
    "아래 JSON의 candidates만 재평가하세요.",
    "heuristicScore는 참고치이며, 노쇼 리스크가 높으면 감점하세요.",
    "reasons는 채용 담당자가 바로 읽을 짧은 한국어 문장으로 작성하세요.",
    JSON.stringify(compactPayload),
  ].join("\n\n");

  try {
    const result = await generateStructuredObject({
      feature: "worker-matching",
      payload: compactPayload,
      schema: WorkerRecommendationSchema,
      system,
      prompt,
    });

    return rerankWorkersWithDeterministicTies(
      shortlisted,
      result.output.recommendations
    );
  } catch {
    return generateFallbackWorkerRecommendations(params);
  }
}

function generateFallbackWorkerRecommendations(params: {
  postCategory?: string;
  postTags: string[];
  payAmount?: number;
  workers: Array<{
    id: string;
    name: string;
    skills: string[];
    avgRating: number;
    totalJobsCompleted: number;
    noShowCount: number;
  }>;
}): Array<{ workerId: string; score: number; reasons: string[] }> {
  const normalizedPost = normalizeEmployerPost({
    postId: "fallback",
    postCategory: params.postCategory,
    postTags: params.postTags,
    payAmount: params.payAmount,
  });

  return params.workers
    .map((worker) =>
      getWorkerHeuristic({
        ...normalizedPost,
        worker,
      })
    )
    .filter((item) => item.score >= AI_MATCHING_MIN_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.overlapScore !== a.overlapScore) return b.overlapScore - a.overlapScore;
      return b.reliabilityScore - a.reliabilityScore;
    })
    .map((item) => ({
      workerId: item.workerId,
      score: item.score,
      reasons: item.reasons,
    }));
}
