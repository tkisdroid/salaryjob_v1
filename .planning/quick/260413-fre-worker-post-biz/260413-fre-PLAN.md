---
phase: quick-260413-fre
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/shared/mobile-tab-bar.tsx
  - src/app/biz/posts/[id]/page.tsx
  - src/app/biz/posts/page.tsx
autonomous: true
requirements:
  - UI-BUGFIX-W2
  - UI-BUGFIX-B1
  - UI-BUGFIX-B2

must_haves:
  truths:
    - "Worker /posts/[id]/apply 페이지에서 '원탭 지원' 확정 CTA 버튼이 MobileTabBar에 가려지지 않고 완전히 보인다"
    - "Biz 공고 상세 페이지의 액션 버튼이 '지원자 보기 → 퇴근 QR → 삭제' 순으로 재배치되어 primary action이 앞에 온다"
    - "Biz 공고관리 목록의 '+ 새 공고 등록' 버튼이 한 줄로 깔끔하게 정렬되고 줄바꿈되지 않는다"
  artifacts:
    - path: src/components/shared/mobile-tab-bar.tsx
      provides: "HIDE_TAB_BAR_PATTERNS에 apply 확정 라우트 추가"
      contains: "posts/[^/]+/apply"
    - path: src/app/biz/posts/[id]/page.tsx
      provides: "액션 버튼 순서 재배치 (지원자 보기 primary + 퇴근 QR + 삭제 secondary)"
    - path: src/app/biz/posts/page.tsx
      provides: "새 공고 등록 버튼 whitespace-nowrap 처리"
      contains: "whitespace-nowrap"
  key_links:
    - from: "src/components/shared/mobile-tab-bar.tsx HIDE_TAB_BAR_PATTERNS"
      to: "/posts/[id]/apply route"
      via: "pathname regex match"
      pattern: "posts.*apply"
---

<objective>
3가지 UI 레이아웃 버그 수정:
1. Worker `/posts/[id]/apply` 지원확정 페이지 CTA 버튼이 MobileTabBar에 가려짐
2. Biz 공고 상세 페이지 액션 버튼 순서 어색함 (삭제가 앞에 있음)
3. Biz 공고관리 목록 "새 공고 등록" 버튼 글씨 정렬 어색함

Purpose: Phase 5 코드 완료 이후 실제 UAT 중 발견된 3개 UI 버그. Timee-style "탐색→지원→확정" 경험을 직접 깨는 버그(W2)와 biz 운영 효율을 해치는 버그(B1/B2).
Output: 3개 파일 수정, 기능 변경 없음.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@AGENTS.md

# Worker apply-confirm flow (CTA 가려짐 버그 원인)
@src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx
@src/app/(worker)/layout.tsx
@src/components/shared/mobile-tab-bar.tsx

# Biz 공고 상세 (액션 버튼 순서)
@src/app/biz/posts/[id]/page.tsx

# Biz 공고관리 목록 (새 공고 등록 버튼)
@src/app/biz/posts/page.tsx

<interfaces>
<!-- MobileTabBar는 이미 HIDE_TAB_BAR_PATTERNS 기반으로 특정 라우트에서 자신을 숨기는 패턴을 제공 -->
<!-- check-in 플로우가 같은 패턴을 사용: /^\/my\/applications\/[^/]+\/check-in$/ -->

From src/components/shared/mobile-tab-bar.tsx:
```ts
const HIDE_TAB_BAR_PATTERNS: readonly RegExp[] = [
  /^\/my\/applications\/[^/]+\/check-in$/,
];
// pathname이 패턴 중 하나라도 매치하면 return null (MobileTabBar 미렌더)
```

From src/app/(worker)/layout.tsx:
- <main className="flex-1 pb-24"> — 자식 페이지에 96px 하단 패딩 기본 제공
- MobileTabBar 렌더됨 (layout 레벨에서 공통)

From src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx (버그 위치 line 292):
```tsx
<div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
  {/* 원탭 지원 CTA — MobileTabBar는 z-50이므로 이 CTA가 뒤에 깔려 가려짐 */}
</div>
```
MobileTabBar는 `fixed bottom-0 z-50` → apply CTA (`z-40`)를 덮어버림.
확정/에러 화면(`step === "confirmed" | "error"`)은 non-fixed 버튼이라 layout의 pb-24로 해결되나,
review step의 sticky CTA는 fixed이므로 tab bar가 가려야 함.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Worker apply-confirm CTA를 MobileTabBar가 가리지 않도록 수정 (W2)</name>
  <files>src/components/shared/mobile-tab-bar.tsx</files>
  <action>
`HIDE_TAB_BAR_PATTERNS` 배열에 `/posts/[id]/apply` 라우트를 추가한다. check-in 플로우와 동일한 "focused conversion flow"이므로 같은 패턴을 재사용하는 것이 일관적이다.

수정:
```ts
const HIDE_TAB_BAR_PATTERNS: readonly RegExp[] = [
  /^\/my\/applications\/[^/]+\/check-in$/,
  /^\/posts\/[^/]+\/apply$/,  // 지원 확정 플로우 — sticky CTA가 tab bar에 가려지지 않도록 숨김
];
```

위 주석도 업데이트: "check-in 플로우와 지원 확정 플로우 — 둘 다 focused conversion으로 자체 sticky CTA가 있어 MobileTabBar와 stack 시 가려짐" 으로 확장.

왜 이 방법을 선택했는지:
- 대안 A (apply-confirm-flow.tsx의 CTA를 `bottom-16`/`bottom-24`로 올려서 tab bar 위에 표시): 사용자가 확정 플로우 중에 tab bar를 탭할 수 있어 이탈 경로 생김. Timee 원칙 "탐색→지원→확정" 루프를 방해.
- 대안 B (선택): check-in과 동일 패턴으로 tab bar 숨김 → focused flow 유지, 기존 아키텍처 재사용.

주의: apply-confirm-flow의 `step === "confirmed"` (확정 완료)와 `step === "error"`는 여전히 apply 경로 하위이므로 tab bar가 숨겨진 상태. `confirmed` 단계에는 "내 지원 목록 보기" / "다른 일자리 더 보기" 자체 CTA가 이미 있고, `error`에도 "다시 시도" / "홈으로" 자체 CTA가 있어 내비게이션 손실 없음. 이는 의도된 동작.

`applyOneTap` 서버 액션이나 apply-confirm-flow.tsx 내부 로직은 절대 건드리지 말 것.
  </action>
  <verify>
    <automated>grep -n "posts.*apply" src/components/shared/mobile-tab-bar.tsx &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -v "^$" | head -20</automated>
    Manual (dev server): `npm run dev` 후 /posts/{유효한id}/apply 방문 → MobileTabBar 미노출 확인 → "원탭 지원" 버튼이 화면 하단에 완전히 보이는지 확인 → 확정 후 "내 지원 목록 보기" 버튼도 정상 보이는지 확인. /home 복귀 시 MobileTabBar 다시 나타나는지 확인.
  </verify>
  <done>
`HIDE_TAB_BAR_PATTERNS`에 apply 정규식 추가됨. /posts/[id]/apply 경로에서 MobileTabBar 미렌더. "원탭 지원" CTA가 가려지지 않고 완전히 보임. 다른 worker 경로(/home, /my 등)에서는 MobileTabBar 정상 노출.
  </done>
</task>

<task type="auto">
  <name>Task 2: Biz 공고 상세 액션 버튼 순서 재배치 (B1)</name>
  <files>src/app/biz/posts/[id]/page.tsx</files>
  <action>
현재 순서(line 125-158): `[삭제] [퇴근 QR 열기] ... ml-auto [지원자 보기]`
→ 기대 순서: `[지원자 보기 (primary)] [퇴근 QR 열기] ... ml-auto [삭제 (destructive)]`

수정 방식: "Actions" 컨테이너 div(line 125 `<div className="flex flex-wrap gap-2 mb-6">`) 내부 순서 변경.

1. **첫 번째**: 지원자 보기 Button (가장 빈번/긍정 액션, 기본 강조 teal 색상 유지)
   - `ml-auto` 클래스 제거 (더 이상 맨 오른쪽 배치 아님)
   - 현재 className: `"bg-teal text-white hover:bg-teal/90 ml-auto"` → `"bg-teal text-white hover:bg-teal/90"`

2. **두 번째**: CheckoutQrModal 트리거 (퇴근 QR 열기, brand 색상 유지)

3. **세 번째** (맨 오른쪽): 삭제 form
   - `ml-auto`를 form 엘리먼트에 추가하여 오른쪽으로 밀어냄
   - `<form action={handleDelete} className="ml-auto">`

최종 JSX 구조 (순서만 변경, 각 버튼 내부 content/handler 유지):
```tsx
<div className="flex flex-wrap gap-2 mb-6">
  {/* 1. Primary: 지원자 보기 */}
  <Button className="bg-teal text-white hover:bg-teal/90" asChild>
    <Link href={`/biz/posts/${id}/applicants`}>
      <Users className="w-4 h-4" />
      지원자 보기 ({job.appliedCount})
      <ChevronRight className="w-4 h-4" />
    </Link>
  </Button>

  {/* 2. Secondary: 퇴근 QR */}
  <CheckoutQrModal
    jobId={job.id}
    trigger={
      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand/90">
        <QrCode className="w-4 h-4" />
        퇴근 QR 열기
      </button>
    }
  />

  {/* 3. Destructive (far right): 삭제 */}
  <form action={handleDelete} className="ml-auto">
    <Button
      variant="outline"
      type="submit"
      className="text-destructive border-destructive/30 hover:bg-destructive/5"
    >
      <Trash2 className="w-4 h-4" />
      삭제
    </Button>
  </form>
</div>
```

주의: `handleDelete` 서버 액션, `CheckoutQrModal` import, 다른 페이지 로직은 절대 건드리지 말 것. 순서/className(`ml-auto` 위치)만 변경.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E "biz/posts/\[id\]/page" | head -10 ; grep -n "지원자 보기\|퇴근 QR\|삭제" src/app/biz/posts/\[id\]/page.tsx</automated>
    Manual (dev server): biz 계정으로 /biz/posts/{id} 방문 → 액션 버튼이 좌→우로 [지원자 보기 (teal)] [퇴근 QR (brand)] ... [삭제 (destructive, 맨 오른쪽)] 순으로 표시. flex-wrap 동작 확인(모바일 폭에서 줄바꿈 자연스러움).
  </verify>
  <done>
버튼 순서: 지원자 보기 → 퇴근 QR → (간격) → 삭제. `ml-auto`가 삭제 form으로 이동. TypeScript 오류 없음. handleDelete / CheckoutQrModal 로직 그대로.
  </done>
</task>

<task type="auto">
  <name>Task 3: Biz 공고관리 "+ 새 공고 등록" 버튼 정렬 수정 (B2)</name>
  <files>src/app/biz/posts/page.tsx</files>
  <action>
현재 (line 114-120): 헤더의 "새 공고 등록" 링크 버튼 텍스트가 좁은 컨테이너나 한글 폰트 메트릭 때문에 줄바꿈/어색한 정렬이 발생.

수정: `<Link>` className에 `whitespace-nowrap` 추가하여 한 줄 강제. 필요 시 텍스트 사이 공백 정규화.

변경 전 (line 114-120):
```tsx
<Link
  href="/biz/posts/new"
  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal px-4 text-sm font-medium text-white transition-colors hover:bg-teal/90"
>
  <Plus className="h-4 w-4" />
  새 공고 등록
</Link>
```

변경 후:
```tsx
<Link
  href="/biz/posts/new"
  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-teal px-4 text-sm font-medium text-white transition-colors hover:bg-teal/90"
>
  <Plus className="h-4 w-4 shrink-0" />
  <span>새 공고 등록</span>
</Link>
```

변경 요점:
- `whitespace-nowrap` — 텍스트 줄바꿈 방지
- `shrink-0` (링크 자체) — flex 부모(`flex items-center justify-between`)에서 좁은 화면일 때 버튼이 축소되지 않도록
- `<Plus className="... shrink-0" />` — 아이콘 자체도 축소 방지
- 텍스트를 `<span>`으로 감싸 flex gap-2가 아이콘과 텍스트 사이 일관 간격 보장

주의: EmptyState의 "공고 작성하기" 버튼(line 88-94)은 다른 콘텍스트(가운데 정렬, 큰 버튼)이며 "어색함" 보고 대상이 아님 → 건드리지 말 것. 페이지 로딩/쿼리 로직(`getBusinessProfilesByUserId`, `getJobsByBusinessIds`)도 절대 변경 금지.
  </action>
  <verify>
    <automated>grep -n "whitespace-nowrap\|새 공고 등록" src/app/biz/posts/page.tsx &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E "biz/posts/page" | head -5</automated>
    Manual (dev server): /biz/posts 방문 → 헤더 우상단 "+ 새 공고 등록" 버튼이 한 줄로 표시, 아이콘과 텍스트 사이 일정 간격, 모바일 폭(375px)에서도 줄바꿈 없음.
  </verify>
  <done>
"+ 새 공고 등록" 버튼이 한 줄로 정렬, whitespace-nowrap + shrink-0 적용. 빈 상태(EmptyState) 버튼은 변경되지 않음. TypeScript/ESLint 오류 없음.
  </done>
</task>

</tasks>

<verification>
## Automated
1. `npx tsc --noEmit -p tsconfig.json` — 타입 에러 0개
2. `grep -n "posts.*apply" src/components/shared/mobile-tab-bar.tsx` — 추가된 정규식 확인
3. `grep -n "ml-auto" src/app/biz/posts/\[id\]/page.tsx` — ml-auto가 form 엘리먼트에 있는지 확인
4. `grep -n "whitespace-nowrap" src/app/biz/posts/page.tsx` — whitespace-nowrap 적용 확인

## Manual UAT (dev server)
1. **W2**: worker 계정 → /home → 공고 클릭 → /posts/[id] → "지원하기" → /posts/[id]/apply 도달 → MobileTabBar 미노출 + "원탭 지원" 버튼 화면 하단에 완전히 보임 → 체크박스 동의 후 버튼 활성화 상태 확인 가능.
2. **B1**: biz 계정 → /biz/posts → 공고 클릭 → 액션 버튼 순서 [지원자 보기(teal)] [퇴근 QR(brand)] ... [삭제(destructive, 맨 오른쪽)] 확인.
3. **B2**: biz 계정 → /biz/posts → 헤더 우상단 "+ 새 공고 등록" 한 줄 정렬 확인 (모바일 폭에서도).
</verification>

<success_criteria>
- [ ] `tsc --noEmit` 0 errors
- [ ] MobileTabBar가 /posts/[id]/apply에서 렌더되지 않음 (HIDE_TAB_BAR_PATTERNS 매치)
- [ ] Biz 공고 상세 액션 순서: 지원자 보기 → 퇴근 QR → 삭제(우측)
- [ ] "+ 새 공고 등록" 버튼 한 줄 정렬, whitespace-nowrap 적용
- [ ] 기능 로직 변경 0건 (서버 액션, 쿼리, state 머신 건드리지 않음)
- [ ] 다른 worker 경로 (/home, /my, /chat, /explore)에서 MobileTabBar 정상 노출 (regression 없음)
</success_criteria>

<output>
After completion, create `.planning/quick/260413-fre-worker-post-biz/260413-fre-SUMMARY.md` 요약:
- 3개 파일 수정 요약 (before/after 코어 라인)
- Manual UAT 결과 (3 시나리오 pass/fail)
- 회귀 확인 (다른 worker 경로 tab bar 정상)
</output>
