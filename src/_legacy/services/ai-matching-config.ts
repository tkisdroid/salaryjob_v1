// AI 매칭 시스템 환경별 설정
// Claude Opus 4.6 + Codex 4.5 협업 최적화

import { gateway } from 'ai';

/**
 * 환경별 AI 모델 선택 시스템
 * - 개발: Claude Opus 4.6 (최고 품질)
 * - 운영: Gemini Flash Lite (비용 효율성)
 */

export interface AIModelConfig {
  model: any;  // gateway() wrapped model or plain string
  cacheControl: string;
  tags: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface MatchingModelConfig {
  worker: AIModelConfig;
  employer: AIModelConfig;
}

// 환경 감지
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// 개발 환경: 최고 품질 모델 (Claude Opus 4.6)
const DEVELOPMENT_CONFIG: MatchingModelConfig = {
  worker: {
    model: gateway('anthropic/claude-opus-4.6'),  // 최고 품질
    cacheControl: 'max-age=600',  // 10분 캐시 (개발 중 빈번한 테스트)
    tags: ['env:development', 'feature:worker-matching', 'model:opus-4.6'],
    maxTokens: 2000,
    temperature: 0.3,  // 일관성 있는 결과
  },
  employer: {
    model: gateway('anthropic/claude-opus-4.6'),  // 동일한 고품질
    cacheControl: 'max-age=600',
    tags: ['env:development', 'feature:employer-matching', 'model:opus-4.6'],
    maxTokens: 2000,
    temperature: 0.3,
  }
};

// 운영 환경: 비용 효율적 모델 (Gemini Flash Lite)
const PRODUCTION_CONFIG: MatchingModelConfig = {
  worker: {
    model: gateway('google/gemini-3.1-flash-lite-preview'),  // 비용 효율성
    cacheControl: 'max-age=1800',  // 30분 캐시 (운영 안정성)
    tags: ['env:production', 'feature:worker-matching', 'model:gemini-flash-lite'],
    maxTokens: 1500,  // 비용 최적화
    temperature: 0.2,  // 더 일관성 있는 결과
  },
  employer: {
    model: gateway('google/gemini-3.1-flash-lite-preview'),
    cacheControl: 'max-age=1800',
    tags: ['env:production', 'feature:employer-matching', 'model:gemini-flash-lite'],
    maxTokens: 1500,
    temperature: 0.2,
  }
};

// 스테이징 환경: 중간 품질 (테스트용)
const STAGING_CONFIG: MatchingModelConfig = {
  worker: {
    model: gateway('google/gemini-3.1-flash-image-preview'),  // 적당한 품질
    cacheControl: 'max-age=900',  // 15분 캐시
    tags: ['env:staging', 'feature:worker-matching', 'model:gemini-flash'],
    maxTokens: 1800,
    temperature: 0.25,
  },
  employer: {
    model: gateway('google/gemini-3.1-flash-image-preview'),
    cacheControl: 'max-age=900',
    tags: ['env:staging', 'feature:employer-matching', 'model:gemini-flash'],
    maxTokens: 1800,
    temperature: 0.25,
  }
};

/**
 * 환경에 따른 모델 설정 자동 선택
 */
export function getMatchingModelConfig(): MatchingModelConfig {
  if (isProduction) {
    console.log('🚀 운영 환경: Gemini Flash Lite 사용 (비용 최적화)');
    return PRODUCTION_CONFIG;
  }

  if (process.env.VERCEL_ENV === 'preview') {
    console.log('🧪 스테이징 환경: Gemini Flash 사용 (테스트)');
    return STAGING_CONFIG;
  }

  console.log('🛠️ 개발 환경: Claude Opus 4.6 사용 (최고 품질)');
  return DEVELOPMENT_CONFIG;
}

/**
 * 한국어 최적화 프롬프트 템플릿
 */
export const KOREAN_PROMPTS = {
  workerMatching: {
    systemBase: `당신은 한국의 임시직 구인구직 플랫폼의 AI 매칭 전문가입니다.

🎯 핵심 목표: 구직자와 구인공고 간의 최적 매칭 및 성공적인 취업 연결

📋 매칭 기준 (우선순위 순):
1. **직종 적합성** (40점) - 선호 직종과 공고 직종의 정확한 일치도
2. **급여 조건** (25점) - 희망 시급 대비 제안 급여의 적절성
3. **지역 접근성** (15점) - 선호 지역과 근무지의 거리 및 교통편
4. **경험 활용도** (10점) - 보유 스킬과 요구 역량의 연관성
5. **근무 조건** (10점) - 긴급도, 근무시간, 근무 환경 등

💡 매칭 이유 작성 가이드:
- 구직자 입장에서 이해하기 쉽고 동기 부여가 되는 언어 사용
- 구체적이고 실용적인 정보 제공 ("교통비 절약", "스킬 활용 가능" 등)
- 긍정적이면서도 현실적인 표현으로 기대치 조정`,

    userTemplate: (worker: any, posts: any[]) => `
🧑‍💼 구직자 프로필:
- 희망 직종: ${worker.preferredCategories.join(', ')}
- 희망 근무 지역: ${worker.preferredRegions.join(', ')}
- 희망 최소 시급: ${worker.preferredPayMin ? `${worker.preferredPayMin.toLocaleString()}원` : '협의 가능'}
- 현재 평점: ${worker.avgRating}점 (5점 만점)
- 완료한 일자리: ${worker.totalJobsCompleted}개
- 보유 기술/경험: ${worker.skills.join(', ')}

📋 매칭 대상 구인공고들:
${posts.map((post, i) => `
${i+1}. ${post.title}
   • 직종: ${post.category || '미분류'}
   • 급여: ${post.payAmountMin ? `${post.payAmountMin.toLocaleString()}` : '미지정'}${post.payAmountMax ? `-${post.payAmountMax.toLocaleString()}` : ''}원
   • 위치: ${post.address || '위치 미지정'}
   • 긴급도: ${post.isUrgent ? '⚡ 급구' : '일반'}
   • 요구 역량: ${post.tags.join(', ')}
`).join('')}

💯 각 공고별로 0-100점 매칭 점수와 구직자가 지원하고 싶어할 만한 구체적인 이유들을 제시해주세요.`
  },

  employerMatching: {
    systemBase: `당신은 한국의 임시직 구인구직 플랫폼의 고용주 지원 AI입니다.

🎯 핵심 목표: 구인 업체에게 신뢰할 수 있고 적합한 근로자 추천

📊 평가 기준 (우선순위 순):
1. **신뢰도 평가** (35점) - 평점, 완료율, 노쇼 이력 종합 분석
2. **역량 적합성** (30점) - 요구 스킬과 경험의 정확한 매칭
3. **경험치** (20점) - 동일/유사 업무 경험 및 총 근무 이력
4. **즉시 투입 가능성** (15점) - 별도 교육 없이 업무 수행 가능 여부

⚠️ 위험 요소 체크:
- 노쇼 이력 3회 이상: 고위험군 표시
- 평점 3.5점 미만: 주의 필요
- 신규 근로자: 별도 멘토링 필요성 언급

💼 추천 이유 작성 가이드:
- 고용주가 즉시 이해할 수 있는 비즈니스 언어 사용
- 구체적인 업무 성과 예측 ("매출 기여도", "고객 만족도" 등)
- 위험 요소는 솔직하게 공개하되 완화 방안 제시`,

    userTemplate: (postInfo: any, workers: any[]) => `
🏢 구인 공고 정보:
- 공고 ID: ${postInfo.postId}
- 업종/직종: ${postInfo.postCategory || '미분류'}
- 요구 역량: ${postInfo.postTags.join(', ')}
- 제시 급여: ${postInfo.payAmount ? `${postInfo.payAmount.toLocaleString()}원` : '협의'}

👥 지원자 풀:
${workers.map((worker, i) => `
${i+1}. ${worker.name || `근로자 #${worker.id}`}
   • 보유 기술: ${worker.skills.join(', ')}
   • 평점: ${worker.avgRating}점 (완료: ${worker.totalJobsCompleted}회)
   • 노쇼 이력: ${worker.noShowCount}회
   • 신뢰도: ${worker.noShowCount === 0 ? '✅ 우수' : worker.noShowCount >= 2 ? '⚠️ 주의' : '보통'}
`).join('')}

⭐ 각 지원자별로 0-100점 추천 점수와 고용 시 기대되는 구체적인 장점들을 분석해주세요.`
  }
};

/**
 * 성능 모니터링을 위한 메트릭
 */
export interface MatchingMetrics {
  modelUsed: string;
  requestTime: number;
  cacheHit: boolean;
  tokensUsed: number;
  confidenceScore: number;
}

/**
 * 배치 처리를 위한 최적화 설정
 */
export const BATCH_CONFIG = {
  maxBatchSize: isProduction ? 50 : 20,  // 운영에서 더 큰 배치
  batchTimeoutMs: isProduction ? 5000 : 3000,  // 운영에서 더 긴 대기
  concurrentRequests: isProduction ? 10 : 5,
};

export default {
  getMatchingModelConfig,
  KOREAN_PROMPTS,
  BATCH_CONFIG
};