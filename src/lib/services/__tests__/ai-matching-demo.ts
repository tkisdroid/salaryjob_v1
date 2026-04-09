// AI 매칭 시스템 데모 테스트
// 실제 환경에서는 AI Gateway가 호출됩니다

import { generateMatchRecommendations, generateWorkerRecommendations } from '../ai-matching';

// 샘플 근로자 데이터
const sampleWorker = {
  preferredCategories: ['서빙', '주방보조'],
  preferredRegions: ['강남구', '서초구'],
  preferredPayMin: 12000,
  avgRating: 4.7,
  totalJobsCompleted: 23,
  skills: ['커피 제조', '서빙', '음식 조리']
};

// 샘플 구인공고 데이터
const samplePosts = [
  {
    id: 'job-1',
    title: '카페 서빙 스태프 급구',
    postType: 'part-time',
    category: '서빙',
    payAmountMin: 13000,
    payAmountMax: 15000,
    address: '강남구 역삼동',
    tags: ['커피', '서빙', '친절'],
    isUrgent: true
  },
  {
    id: 'job-2',
    title: '레스토랑 주방보조',
    postType: 'part-time',
    category: '주방보조',
    payAmountMin: 11000,
    payAmountMax: 13000,
    address: '종로구 명동',
    tags: ['음식조리', '설거지', '청소'],
    isUrgent: false
  }
];

// 샘플 근로자 목록 (고용주 관점)
const sampleWorkers = [
  {
    id: 'worker-1',
    name: '김철수',
    skills: ['서빙', '커피제조'],
    avgRating: 4.8,
    totalJobsCompleted: 45,
    noShowCount: 0
  },
  {
    id: 'worker-2',
    name: '이영희',
    skills: ['주방보조', '음식조리'],
    avgRating: 4.2,
    totalJobsCompleted: 12,
    noShowCount: 1
  }
];

async function runMatchingDemo() {
  console.log('🚀 AI 매칭 시스템 데모 시작...\n');

  try {
    // 1. 근로자를 위한 구인공고 추천
    console.log('👤 근로자용 매칭 추천:');
    const jobMatches = await generateMatchRecommendations({
      worker: sampleWorker,
      posts: samplePosts
    });

    jobMatches.forEach((match, i) => {
      console.log(`${i+1}. 공고 ID: ${match.postId}`);
      console.log(`   점수: ${match.score}점 (${match.confidenceLevel || '보통'} 신뢰도)`);
      console.log(`   이유: ${match.reasons.join(', ')}`);
      if (match.expectedFit) {
        console.log(`   예상 적합도: ${match.expectedFit}`);
      }
      console.log('');
    });

    // 2. 고용주를 위한 근로자 추천
    console.log('🏢 고용주용 근로자 추천:');
    const workerMatches = await generateWorkerRecommendations({
      postId: 'job-1',
      postCategory: '서빙',
      postTags: ['커피', '서빙'],
      payAmount: 13000,
      workers: sampleWorkers
    });

    workerMatches.forEach((match, i) => {
      console.log(`${i+1}. 근로자 ID: ${match.workerId}`);
      console.log(`   점수: ${match.score}점`);
      console.log(`   이유: ${match.reasons.join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 매칭 데모 실행 실패:', error);
  }
}

// 환경변수 체크
export function checkAIGatewaySetup() {
  const hasOIDC = process.env.VERCEL_OIDC_TOKEN;
  const hasAPIKey = process.env.AI_GATEWAY_API_KEY;

  console.log('🔧 AI Gateway 설정 확인:');
  console.log(`   VERCEL_OIDC_TOKEN: ${hasOIDC ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`   AI_GATEWAY_API_KEY: ${hasAPIKey ? '✅ 설정됨' : '❌ 미설정'}`);

  if (!hasOIDC && !hasAPIKey) {
    console.log('\n⚠️  AI Gateway 인증이 설정되지 않았습니다.');
    console.log('   다음 명령어를 실행하세요:');
    console.log('   1. vercel link');
    console.log('   2. vercel env pull .env.local');
    console.log('   또는 AI_GATEWAY_API_KEY를 설정하세요.');
  }

  return hasOIDC || hasAPIKey;
}

// 데모 실행 함수 (개발 환경에서만)
if (process.env.NODE_ENV === 'development') {
  runMatchingDemo();
}

export { runMatchingDemo };