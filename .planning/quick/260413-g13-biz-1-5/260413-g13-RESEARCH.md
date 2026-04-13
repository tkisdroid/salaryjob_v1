# Biz 공고 등록 1/5 단계 "다음" 버튼 미동작 — Research

**Date:** 2026-04-13
**Scope:** `/biz/posts/new` 공고등록 Step 1 → Step 2 전환 실패
**Confidence:** HIGH — 실제 코드 라인까지 추적 완료. 이건 "버튼이 먹통"이 아니라 "버튼이 `disabled` 상태"인 UX 사일런트 실패.

---

## TL;DR (Root Cause)

`src/app/biz/posts/new/new-job-form.tsx:314-322` 의 "다음" 버튼은 `disabled={!canProceed(step)}` 만 걸려 있고, **실패 사유를 사용자에게 알려주는 에러 메시지·토스트·인라인 피드백이 전무**합니다. 그래서 "눌러도 안 넘어간다"는 체감이 나옵니다. 실제로는 `canProceed(1)` (lines 128-133) 의 세 조건 중 하나가 통과 못 해서 버튼이 회색 비활성 상태인데, 사용자는 "눌렀다고 생각"합니다.

가장 자주 걸리는 조건: **"업무 소개" 10자 이상 요구사항** — 이건 UI 어디에도 명시되지 않습니다.

---

## 파일 지도

| 파일 | 역할 |
|------|------|
| `src/app/biz/posts/new/page.tsx` | 서버: BusinessProfile 로드 후 클라이언트 컴포넌트로 넘김 |
| `src/app/biz/posts/new/new-job-form.tsx` | **바로 이 파일**. 5-step wizard 전부. `useState` step 관리, `canProceed()` 가드, 에러 표시 |
| `src/app/biz/posts/actions.ts` | `createJob` 서버 액션 — Step 5에서만 호출됨. Step 1→2 전환과 무관 |

Form 라이브러리 아님: **React Hook Form / Zod 사용 안 함.** Plain `useState<FormShape>` + 수동 `canProceed()` 함수 (new-job-form.tsx:96, 126-150).

---

## 코드 추적 — Step 1 → 2 로직

### 1. Step state
- `new-job-form.tsx:88` — `const [step, setStep] = useState<Step>(1);`
- URL param 아님, Zustand 아님, 단순 로컬 state.

### 2. "다음" 버튼
- `new-job-form.tsx:313-322`:
  ```tsx
  {step < 5 ? (
    <button
      type="button"
      data-testid="job-form-next-button"
      disabled={!canProceed(step)}           // ← 여기!
      onClick={() => setStep((step + 1) as Step)}
      className="... disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
    >
      다음 <ArrowRight className="w-4 h-4" />
    </button>
  ) : ...
  ```
- `type="button"` 이고 바깥에 `<form>` 없음 → nested form / form submit 이슈는 **해당 없음**.
- `onClick`은 `setStep(step+1)` 단순 호출 → 함수 자체는 문제 없음.

### 3. Step 1 가드 조건
`new-job-form.tsx:126-133`:
```ts
const canProceed = (s: Step): boolean => {
  switch (s) {
    case 1:
      return (
        form.title.trim().length >= 4 &&
        form.category !== "" &&
        form.description.trim().length >= 10
      );
    ...
  }
};
```

세 조건 모두 AND. 하나라도 실패하면 버튼이 `disabled` 회색.

### 4. 각 필드 UI 위치 + 힌트 매칭 검증

| 조건 | 필드 input 위치 | 사용자에게 표시되는 힌트 | 문제 |
|------|----------------|-------------------------|------|
| `title.trim() >= 4` | `new-job-form.tsx:384-392` | `hint="10자 이내로 핵심만"` (line 383) | **힌트는 "최대 10자"만 말함. "최소 4자" 정보 없음.** 3자 이하 제목에서 버튼 비활성. |
| `category !== ""` | `new-job-form.tsx:396-413` | `required` 빨간 별표만 | 빈 상태 초기값이 `""` (line 98) — 사용자가 카테고리 버튼을 안 눌렀는지 헷갈리기 쉬움. 선택 상태 시각적 강조는 있으나, "미선택이면 왜 못 넘어가는지" 문구 없음. |
| `description.trim() >= 10` | `new-job-form.tsx:416-426` (textarea, `maxLength={500}`) | `hint="업무 내용, 분위기 등 자유롭게"` (line 416) | **"최소 10자" 문구 전혀 없음. 가장 유력한 원인.** 짧게 한두 마디 쓰면 조용히 버튼 잠김. |

---

## Primary Cause (단정)

**`description.trim().length >= 10` 가드가 UI에 전혀 노출되지 않아, 사용자가 짧은 설명을 입력하면 "다음" 버튼이 조용히 비활성 상태로 남는다.** 버튼이 `disabled` 일 때 사용자는 "눌렀는데 반응 없음"과 구분 못 함.

증거:
- 가드: `new-job-form.tsx:132` (`form.description.trim().length >= 10`)
- UI 힌트: `new-job-form.tsx:416` ("업무 내용, 분위기 등 자유롭게") — 최소 글자 수 언급 없음.
- 에러 표시: `new-job-form.tsx:299-307` — `error` state 는 `handlePublish()` (Step 5 서버 액션 실패) 에서만 set 됨. **Step 1-4 전환 실패는 어떤 피드백도 내지 않음.**

---

## Secondary Causes

1. **제목 최소 4자 제약도 UI 미노출** (`line 132` vs hint `line 383`) — 힌트가 "10자 이내"만 말해서 오히려 짧게 쓰게 유도됨. "예: 주말 카페 바리스타 보조" placeholder 만 보고 "카페 알바" (5자) 같이 짧게 쓸 수 있음. 운 좋게 4자 이상이면 통과.

2. **카테고리 미선택** — 초기값 `""` (line 98). 사용자가 스크롤해서 카테고리 그리드를 못 보면 선택 안 한 채 버튼 누름. 빨간 별표만으로는 부족.

3. **`disabled` 버튼의 시각적 모호성** — `disabled:bg-muted disabled:text-muted-foreground` (line 319) 는 연한 회색. iOS Safari 등 일부 환경에서는 활성 상태와 거의 구분 안 됨. 사용자가 "일단 눌러봤다" → "안 넘어간다" 로 체감.

4. **Step 2-4에도 동일 패턴** — `canProceed(2), canProceed(3)` 의 제약(날짜/시간/인원/최저시급 10,030원)도 같은 방식으로 사일런트 disable. `Step3Compensation` (line 592-596) 만 유일하게 인라인 에러 문구 있음. Step 1·2·4는 없음.

---

## Not the cause (검토 후 배제)

- ~~`type="submit"` / `type="button"` 혼선~~: 바깥에 `<form>` 자체가 없음. button 순수 onClick handler.
- ~~Zod silent validation fail~~: Zod/RHF 사용 안 함. 검증은 plain JS boolean 표현.
- ~~Server action binding issue~~: `createJob` 은 Step 5 publish 에서만 호출. Step 1→2는 순수 client state 전환.
- ~~React 19 / Next.js 16 특이 동작~~: `useState` + `setState` 기본 동작. 프레임워크 업그레이드와 무관.
- ~~`useTransition` pending 잠금~~: `isPending` 은 publish 시에만 true. Step 1→2 동안 false.
- ~~Business profile 없음~~: `page.tsx:10-13` 에서 없으면 `/biz/profile` 로 redirect 해버림. 이 페이지에 도달했다면 최소 1개는 있음.

---

## 수정 방향 (구체)

### Fix A — 최소 조건을 가시화 (필수, 근본 수정)

`new-job-form.tsx:383` title Field:
```tsx
<Field label="공고 제목" required hint="4자 이상, 10자 이내로 핵심만">
```

`new-job-form.tsx:416` description Field:
```tsx
<Field label="업무 소개" required hint="10자 이상, 업무 내용·분위기 등 자유롭게">
```

### Fix B — Step 1-2-4 에도 Step3 스타일 인라인 검증 메시지 추가 (권장)

Step1Basic 아래 (line 434 즈음) 에 누락 사유 리스트 렌더:
```tsx
{/* canProceed(1) 실패 사유를 사용자에게 보여주기 */}
{(form.title.trim().length > 0 && form.title.trim().length < 4) && (
  <p className="text-[10px] font-bold text-destructive">제목은 최소 4자 이상 입력해주세요</p>
)}
{(form.description.trim().length > 0 && form.description.trim().length < 10) && (
  <p className="text-[10px] font-bold text-destructive">업무 소개는 최소 10자 이상 입력해주세요</p>
)}
```

(빈 문자열일 때는 `required *` 로 충분. 입력 시작 후 부족할 때만 경고.)

### Fix C — disabled 버튼이 눌렸을 때 토스트로 사유 표시 (대안, 더 러프한 해결)

버튼을 항상 enabled 로 두고, `onClick` 에서 `canProceed()` 체크 후 실패 시 `setError()` 로 첫 누락 필드 안내:
```tsx
<button
  type="button"
  onClick={() => {
    const ok = canProceed(step);
    if (!ok) {
      setError(firstMissingReason(step, form)); // new helper
      return;
    }
    setError(null);
    setStep((step + 1) as Step);
  }}
  ...
>
```
장점: 기존 에러 박스(line 299-307) 재사용. 단점: disabled 시각 피드백 상실. **A + B 조합이 더 낫다.**

---

## 회귀 방지 (다른 스텝 점검)

| Step | 가드 line | 사용자 피드백 | 조치 필요? |
|------|-----------|---------------|-----------|
| 2 (일정/인원) | `135-140` (workDate/startTime/endTime 채움 & headcount≥1) | 없음 — `required *` 만 | **Fix B 적용 권장**. 빈 날짜/시간일 때 조용히 막힘. |
| 3 (보상) | `142` (hourlyPay≥10030) | **있음** — `line 592-596` 최저시급 미달 인라인 경고 | OK, 모범사례. |
| 4 (세부) | `144` (always true) | N/A | OK. |
| 5 (미리보기) | `146` (businessId!=="") | 없음 — `page.tsx` 서버에서 강제 redirect 로 방어 | OK. |

**결론:** Step 1, 2 모두 같은 안티패턴(숨은 최소값 + 피드백 없음)을 가짐. Fix A+B를 **Step 1, 2 동시 적용** 권장. Step 3 의 `line 592-596` 패턴을 복제하면 됨.

---

## 재현 방법 (사람이 확인용)

1. `npm run dev`
2. Biz 계정 로그인 → `/biz/posts/new`
3. 제목 "카페" (2자) 입력, 카테고리 선택, 설명 "바리스타" (4자) 입력
4. "다음" 버튼: 회색 상태. 눌러도 아무 일 없음. (실제: `disabled` 속성으로 onClick 발화 자체가 막힘)
5. 제목을 4자 이상 + 설명을 10자 이상으로 늘리면 버튼이 브랜드 색으로 활성화 → 정상 동작.

---

## Files cited

- `src/app/biz/posts/new/new-job-form.tsx:88` — step useState
- `src/app/biz/posts/new/new-job-form.tsx:96-111` — form initial state (title="", description="", category="")
- `src/app/biz/posts/new/new-job-form.tsx:126-150` — canProceed() — **primary logic**
- `src/app/biz/posts/new/new-job-form.tsx:132` — **Step 1 숨은 10자 제약**
- `src/app/biz/posts/new/new-job-form.tsx:299-307` — error 박스 (Step 1-4 전환에 쓰이지 않음)
- `src/app/biz/posts/new/new-job-form.tsx:313-322` — 다음 버튼 + `disabled` prop
- `src/app/biz/posts/new/new-job-form.tsx:383, 416` — 힌트 문구 (최소값 미표기)
- `src/app/biz/posts/new/new-job-form.tsx:592-596` — Step 3 인라인 검증 (참고 모범사례)
- `src/app/biz/posts/new/page.tsx:10-13` — profile 없으면 redirect

---

## Assumptions Log

| # | Claim | Risk if Wrong |
|---|-------|---------------|
| A1 | 사용자가 "다음이 안 눌린다"고 한 실제 상황은 description 10자 미달. | 낮음 — title 4자 미달 / category 미선택 경우도 같은 코드 경로로 동일 UX 버그. Fix A+B는 세 경우 모두 커버. |
| A2 | 브라우저 환경(iOS Safari 등)에서 disabled 버튼이 활성 버튼과 시각적으로 충분히 구분되지 않을 가능성. | 중간 — 이게 맞으면 Fix A 로 원인 자체를 없애는 게 더 중요. |

(코드 추적은 전부 `[VERIFIED: new-job-form.tsx 라인 인용]` — 가정 아님.)
