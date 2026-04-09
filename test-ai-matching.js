// AI 매칭 시스템 간단 테스트
// Node.js에서 실행 가능한 버전

const { z } = require('zod');

// Mock AI SDK functions for testing (실제로는 AI Gateway 사용)
function generateFallbackMatches(input) {
  const matches = input.posts.map((post) => {
    let score = 50;
    const reasons = [];

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
      confidenceLevel: 'medium',
    };
  });

  return matches
    .sort((a, b) => b.score - a.score)
    .filter((m) => m.score >= 30);
}

// 테스트 데이터
const testWorker = {
  preferredCategories: ['서빙', '주방보조'],
  preferredRegions: ['강남구', '서초구'],
  preferredPayMin: 12000,
  avgRating: 4.7,
  totalJobsCompleted: 23,
  skills: ['커피 제조', '서빙', '음식 조리']
};

const testPosts = [
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
  },
  {
    id: 'job-3',
    title: '편의점 야간 아르바이트',
    postType: 'part-time',
    category: '편의점',
    payAmountMin: 10000,
    payAmountMax: 12000,
    address: '서초구 서초동',
    tags: ['계산', '진열', '청소'],
    isUrgent: false
  }
];

// 테스트 실행
console.log('🤖 Claude + Codex AI 매칭 시스템 테스트');
console.log('=' .repeat(50));

console.log('\n👤 근로자 정보:');
console.log(`- 선호 직종: ${testWorker.preferredCategories.join(', ')}`);
console.log(`- 선호 지역: ${testWorker.preferredRegions.join(', ')}`);
console.log(`- 희망 시급: ${testWorker.preferredPayMin}원 이상`);
console.log(`- 평점: ${testWorker.avgRating}점`);
console.log(`- 경험: ${testWorker.totalJobsCompleted}회 완료`);
console.log(`- 스킬: ${testWorker.skills.join(', ')}`);

console.log('\n📋 구인공고 목록:');
testPosts.forEach((post, i) => {
  console.log(`${i+1}. ${post.title}`);
  console.log(`   - 직종: ${post.category} | 시급: ${post.payAmountMin}-${post.payAmountMax}원`);
  console.log(`   - 위치: ${post.address} | 급구: ${post.isUrgent ? 'YES' : 'NO'}`);
  console.log(`   - 태그: ${post.tags.join(', ')}`);
});

console.log('\n🎯 매칭 결과 (점수 순):');
const matches = generateFallbackMatches({ worker: testWorker, posts: testPosts });

matches.forEach((match, i) => {
  const post = testPosts.find(p => p.id === match.postId);
  console.log(`\n${i+1}. ${post?.title}`);
  console.log(`   ⭐ 점수: ${match.score}점 (신뢰도: ${match.confidenceLevel})`);
  console.log(`   💡 매칭 이유:`);
  match.reasons.forEach(reason => {
    console.log(`      • ${reason}`);
  });
});

console.log('\n✅ 테스트 완료!');
console.log('\n📝 다음 단계:');
console.log('1. AI Gateway API 키 설정 → 실제 AI 추천');
console.log('2. 데이터베이스 연결 → Prisma 스키마 적용');
console.log('3. 인증 시스템 구현 → Clerk 통합');
console.log('4. 결제 시스템 → Toss Payments 연동');