import { gateway } from "ai";

type GatewayModel = ReturnType<typeof gateway> | string;

interface WorkerPromptProfile {
  preferredCategories: string[];
  preferredRegions: string[];
  preferredPayMin?: number | null;
  avgRating: number;
  totalJobsCompleted: number;
  skills: string[];
}

interface WorkerPromptPost {
  title: string;
  category?: string | null;
  payAmountMin?: number | null;
  payAmountMax?: number | null;
  address?: string | null;
  isUrgent?: boolean;
  tags: string[];
}

interface EmployerPromptPostInfo {
  postId: string;
  postCategory?: string | null;
  postTags: string[];
  payAmount?: number | null;
}

interface EmployerPromptWorker {
  id: string;
  name?: string | null;
  skills: string[];
  avgRating: number;
  totalJobsCompleted: number;
  noShowCount: number;
}

export interface AIModelConfig {
  model: GatewayModel;
  cacheControl: string;
  tags: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface MatchingModelConfig {
  worker: AIModelConfig;
  employer: AIModelConfig;
}

export interface MatchingMetrics {
  modelUsed: string;
  requestTime: number;
  cacheHit: boolean;
  tokensUsed: number;
  confidenceScore: number;
}

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";

const DEVELOPMENT_CONFIG: MatchingModelConfig = {
  worker: {
    model: gateway("anthropic/claude-opus-4.6"),
    cacheControl: "max-age=600",
    tags: ["env:development", "feature:worker-matching", "model:opus-4.6"],
    maxTokens: 2000,
    temperature: 0.3,
  },
  employer: {
    model: gateway("anthropic/claude-opus-4.6"),
    cacheControl: "max-age=600",
    tags: ["env:development", "feature:employer-matching", "model:opus-4.6"],
    maxTokens: 2000,
    temperature: 0.3,
  },
};

const PRODUCTION_CONFIG: MatchingModelConfig = {
  worker: {
    model: gateway("google/gemini-3.1-flash-lite-preview"),
    cacheControl: "max-age=1800",
    tags: [
      "env:production",
      "feature:worker-matching",
      "model:gemini-flash-lite",
    ],
    maxTokens: 1500,
    temperature: 0.2,
  },
  employer: {
    model: gateway("google/gemini-3.1-flash-lite-preview"),
    cacheControl: "max-age=1800",
    tags: [
      "env:production",
      "feature:employer-matching",
      "model:gemini-flash-lite",
    ],
    maxTokens: 1500,
    temperature: 0.2,
  },
};

const STAGING_CONFIG: MatchingModelConfig = {
  worker: {
    model: gateway("google/gemini-3.1-flash-image-preview"),
    cacheControl: "max-age=900",
    tags: ["env:staging", "feature:worker-matching", "model:gemini-flash"],
    maxTokens: 1800,
    temperature: 0.25,
  },
  employer: {
    model: gateway("google/gemini-3.1-flash-image-preview"),
    cacheControl: "max-age=900",
    tags: [
      "env:staging",
      "feature:employer-matching",
      "model:gemini-flash",
    ],
    maxTokens: 1800,
    temperature: 0.25,
  },
};

export function getMatchingModelConfig(): MatchingModelConfig {
  if (isProduction) {
    console.log("[ai-matching-config] production config: Gemini Flash Lite");
    return PRODUCTION_CONFIG;
  }

  if (isPreview) {
    console.log("[ai-matching-config] preview config: Gemini Flash");
    return STAGING_CONFIG;
  }

  console.log("[ai-matching-config] development config: Claude Opus 4.6");
  return DEVELOPMENT_CONFIG;
}

export const KOREAN_PROMPTS = {
  workerMatching: {
    systemBase: `당신은 단기 일자리 플랫폼의 AI 매칭 전문가입니다.

목표는 구직자에게 실제로 지원할 가치가 높은 공고를 우선순위대로 추천하는 것입니다.

다음 기준을 중심으로 판단하세요.
1. 직무 적합도
2. 급여 조건
3. 거리와 이동 편의성
4. 경험 및 보유 기술
5. 근무 일정과 긴급도

응답은 한국어로 작성하고, 점수와 함께 구체적인 추천 이유를 설명하세요.`,

    userTemplate: (
      worker: WorkerPromptProfile,
      posts: WorkerPromptPost[],
    ) => `
구직자 프로필
- 선호 직종: ${worker.preferredCategories.join(", ")}
- 선호 지역: ${worker.preferredRegions.join(", ")}
- 최소 희망 시급: ${
  worker.preferredPayMin
    ? `${worker.preferredPayMin.toLocaleString()}원`
    : "미지정"
}
- 현재 평점: ${worker.avgRating}
- 완료한 일자리 수: ${worker.totalJobsCompleted}
- 보유 기술: ${worker.skills.join(", ")}

평가할 공고 목록
${posts
  .map(
    (post, index) => `
${index + 1}. ${post.title}
   - 직종: ${post.category ?? "미분류"}
   - 급여: ${
     post.payAmountMin
       ? `${post.payAmountMin.toLocaleString()}`
       : "미정"
   }${post.payAmountMax ? `-${post.payAmountMax.toLocaleString()}` : ""}원
   - 위치: ${post.address ?? "미정"}
   - 긴급도: ${post.isUrgent ? "긴급" : "일반"}
   - 태그: ${post.tags.join(", ")}
`,
  )
  .join("")}

각 공고에 대해 0-100 점수와 추천 이유를 작성해 주세요.`,
  },

  employerMatching: {
    systemBase: `당신은 구인 사업자를 돕는 AI 추천 시스템입니다.

목표는 공고에 가장 적합한 지원자를 선별해 빠르게 채용 결정을 내릴 수 있도록 돕는 것입니다.

다음 기준을 중심으로 판단하세요.
1. 평점과 완료 이력
2. 태그 및 업무 적합도
3. 유사 업무 경험
4. 노쇼 위험도
5. 즉시 투입 가능성

응답은 한국어로 작성하고, 장점과 주의점이 모두 드러나게 설명하세요.`,

    userTemplate: (
      postInfo: EmployerPromptPostInfo,
      workers: EmployerPromptWorker[],
    ) => `
구인 공고 정보
- 공고 ID: ${postInfo.postId}
- 직종: ${postInfo.postCategory ?? "미분류"}
- 태그: ${postInfo.postTags.join(", ")}
- 급여: ${
  postInfo.payAmount ? `${postInfo.payAmount.toLocaleString()}원` : "미정"
}

평가할 지원자 목록
${workers
  .map(
    (worker, index) => `
${index + 1}. ${worker.name ?? `근로자 #${worker.id}`}
   - 보유 기술: ${worker.skills.join(", ")}
   - 평점: ${worker.avgRating}
   - 완료한 일자리 수: ${worker.totalJobsCompleted}
   - 노쇼 횟수: ${worker.noShowCount}
`,
  )
  .join("")}

각 지원자에 대해 0-100 점수와 채용 관점의 추천 이유를 작성해 주세요.`,
  },
};

export const BATCH_CONFIG = {
  maxBatchSize: isProduction ? 50 : 20,
  batchTimeoutMs: isProduction ? 5000 : 3000,
  concurrentRequests: isProduction ? 10 : 5,
};

const legacyMatchingConfig = {
  getMatchingModelConfig,
  KOREAN_PROMPTS,
  BATCH_CONFIG,
};

export default legacyMatchingConfig;
