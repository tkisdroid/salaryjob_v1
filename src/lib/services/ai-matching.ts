// AI-powered matching between workers and posts
// Uses Vercel AI Gateway with structured output

import { generateText, Output, gateway } from 'ai';
import { z } from 'zod';

// Zod schema for match results
const MatchResultSchema = z.object({
  matches: z.array(z.object({
    postId: z.string(),
    score: z.number().min(0).max(100),
    reasons: z.array(z.string()),
    confidenceLevel: z.enum(['high', 'medium', 'low']),
    expectedFit: z.string().optional()
  }))
});

interface MatchResult {
  postId: string;
  score: number; // 0-100
  reasons: string[];
  confidenceLevel?: 'high' | 'medium' | 'low';
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

// Generate match recommendations using AI
export async function generateMatchRecommendations(
  input: MatchInput
): Promise<MatchResult[]> {
  try {
    const systemPrompt = `당신은 한국의 임시 근로자와 구인 공고를 매칭하는 AI입니다.

근로자 정보:
- 선호 직종: ${input.worker.preferredCategories.join(', ')}
- 선호 지역: ${input.worker.preferredRegions.join(', ')}
- 희망 최소 시급: ${input.worker.preferredPayMin || '미설정'}원
- 평균 평점: ${input.worker.avgRating}점
- 완료 작업 수: ${input.worker.totalJobsCompleted}회
- 보유 스킬: ${input.worker.skills.join(', ')}

각 구인공고에 대해 다음 기준으로 매칭 점수(0부터 100까지)를 산출하세요:
1. 직종 매칭 (가장 중요)
2. 지역 접근성
3. 급여 조건
4. 경험 적합성
5. 스킬 매칭
6. 긴급도 고려

매칭 이유는 구직자에게 친근하고 이해하기 쉬운 한국어로 설명하세요.`;

    const result = await generateText({
      model: gateway('openai/gpt-5.4'),
      system: systemPrompt,
      prompt: `다음 구인공고들에 대해 위 근로자와의 매칭을 분석해주세요:\n\n${JSON.stringify(input.posts, null, 2)}`,
      output: Output.object({
        schema: MatchResultSchema,
      }),
      providerOptions: {
        gateway: {
          tags: ['feature:job-matching', 'service:ai-matching', 'env:development'],
          cacheControl: 'max-age=300', // 5분간 유사한 요청 캐시
        },
      },
    });

    const matches = result.output.matches.filter((match) => match.score >= 30);

    return matches.map((match) => ({
      postId: match.postId,
      score: match.score,
      reasons: match.reasons,
      confidenceLevel: match.confidenceLevel,
      expectedFit: match.expectedFit,
    }));

  } catch (error) {
    console.error('AI 매칭 생성 실패, fallback 사용:', error);

    // Fallback to rule-based matching if AI fails
    return generateFallbackMatches(input);
  }
}

// Fallback rule-based matching when AI is unavailable
function generateFallbackMatches(input: MatchInput): MatchResult[] {
  const matches: MatchResult[] = input.posts.map((post) => {
    let score = 50;
    const reasons: string[] = [];

    // Category match
    if (post.category && input.worker.preferredCategories.includes(post.category)) {
      score += 25;
      reasons.push("관심 직종과 일치해요");
    }

    // Pay match
    if (post.payAmountMin && input.worker.preferredPayMin) {
      if (post.payAmountMin >= input.worker.preferredPayMin) {
        score += 20;
        reasons.push("희망 시급 이상이에요");
      } else if (post.payAmountMin >= input.worker.preferredPayMin * 0.9) {
        score += 10;
        reasons.push("희망 시급과 비슷해요");
      }
    }

    // Urgent bonus
    if (post.isUrgent) {
      score += 15;
      reasons.push("급구 공고예요 — 빠른 매칭 가능");
    }

    // Experience match
    if (input.worker.totalJobsCompleted >= 10) {
      score += 10;
      reasons.push("경험이 풍부해요");
    } else if (input.worker.totalJobsCompleted >= 5) {
      score += 5;
      reasons.push("어느 정도 경험이 있어요");
    }

    // Skill/tag overlap
    const tagOverlap = post.tags.filter((t) =>
      input.worker.skills.some((s) => s.toLowerCase().includes(t.toLowerCase()))
    );
    if (tagOverlap.length > 0) {
      score += Math.min(tagOverlap.length * 8, 20);
      reasons.push(`관련 스킬: ${tagOverlap.join(", ")}`);
    }

    // Rating bonus
    if (input.worker.avgRating >= 4.5) {
      score += 5;
      reasons.push("높은 평점을 보유하고 있어요");
    }

    if (reasons.length === 0) {
      reasons.push("새로운 경험을 해볼 기회예요");
    }

    return {
      postId: post.id,
      score: Math.min(score, 100),
      reasons,
      confidenceLevel: 'medium' as const,
    };
  });

  return matches
    .sort((a, b) => b.score - a.score)
    .filter((m) => m.score >= 30);
}

// Worker recommendation schema for structured output
const WorkerRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    workerId: z.string(),
    score: z.number().min(0).max(100),
    reasons: z.array(z.string()),
    riskFactors: z.array(z.string()).optional(),
    matchStrengths: z.array(z.string()).optional(),
  }))
});

// Generate match recommendations for an employer (reverse matching)
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
  try {
    const systemPrompt = `당신은 한국의 구인업체를 위한 근로자 추천 AI입니다.

구인공고 정보:
- 공고 ID: ${params.postId}
- 직종: ${params.postCategory || '미지정'}
- 요구 기술/태그: ${params.postTags.join(', ')}
- 급여: ${params.payAmount || '미설정'}원

각 근로자에 대해 다음 기준으로 적합도 점수(0부터 100까지)를 산출하세요:
1. 평점 및 신뢰도
2. 경험 및 완료 작업 수
3. 스킬 매칭
4. 노쇼 위험도 평가
5. 전반적 업무 적합성

추천 이유는 고용주가 이해하기 쉽고 의사결정에 도움이 되도록 작성하세요.`;

    const result = await generateText({
      model: gateway('openai/gpt-5.4'),
      system: systemPrompt,
      prompt: `다음 근로자들 중 위 구인공고에 가장 적합한 인재를 추천해주세요:\n\n${JSON.stringify(params.workers, null, 2)}`,
      output: Output.object({
        schema: WorkerRecommendationSchema,
      }),
      providerOptions: {
        gateway: {
          tags: ['feature:worker-matching', 'service:ai-matching', 'user:employer'],
          cacheControl: 'max-age=180', // 3분간 캐시
        },
      },
    });

    return result.output.recommendations
      .filter((rec) => rec.score >= 40)
      .sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error('AI 근로자 추천 실패, fallback 사용:', error);

    // Fallback to rule-based matching
    return generateFallbackWorkerRecommendations(params);
  }
}

// Fallback worker recommendations when AI is unavailable
function generateFallbackWorkerRecommendations(params: {
  postTags: string[];
  workers: Array<{
    id: string;
    name: string;
    skills: string[];
    avgRating: number;
    totalJobsCompleted: number;
    noShowCount: number;
  }>;
}): Array<{ workerId: string; score: number; reasons: string[] }> {
  return params.workers.map((worker) => {
    let score = 50;
    const reasons: string[] = [];

    // Rating
    if (worker.avgRating >= 4.5) {
      score += 25;
      reasons.push(`평점 ${worker.avgRating}점 — 우수 평가`);
    } else if (worker.avgRating >= 4.0) {
      score += 15;
      reasons.push(`평점 ${worker.avgRating}점 — 양호`);
    } else if (worker.avgRating >= 3.5) {
      score += 5;
      reasons.push(`평점 ${worker.avgRating}점`);
    }

    // Experience
    if (worker.totalJobsCompleted >= 20) {
      score += 20;
      reasons.push(`${worker.totalJobsCompleted}회 근무 완료 — 매우 경험 풍부`);
    } else if (worker.totalJobsCompleted >= 10) {
      score += 15;
      reasons.push(`${worker.totalJobsCompleted}회 근무 완료 — 경험 풍부`);
    } else if (worker.totalJobsCompleted >= 5) {
      score += 10;
      reasons.push(`${worker.totalJobsCompleted}회 근무 완료`);
    }

    // No-show risk assessment
    if (worker.noShowCount === 0) {
      score += 15;
      reasons.push("노쇼 이력 없음 — 신뢰도 높음");
    } else if (worker.noShowCount === 1) {
      score += 5;
      reasons.push("노쇼 1회 — 보통 신뢰도");
    } else if (worker.noShowCount >= 3) {
      score -= 25;
      reasons.push(`노쇼 ${worker.noShowCount}회 — 주의 필요`);
    } else {
      score -= 10;
      reasons.push(`노쇼 ${worker.noShowCount}회`);
    }

    // Skill match
    const skillMatch = worker.skills.filter((s) =>
      params.postTags.some((t) => s.toLowerCase().includes(t.toLowerCase()))
    );
    if (skillMatch.length > 0) {
      score += Math.min(skillMatch.length * 10, 25);
      reasons.push(`관련 경험: ${skillMatch.join(", ")}`);
    }

    // Ensure minimum viable reasons
    if (reasons.length === 0) {
      reasons.push("신규 지원자");
    }

    return {
      workerId: worker.id,
      score: Math.min(Math.max(score, 0), 100),
      reasons,
    };
  }).sort((a, b) => b.score - a.score);
}
