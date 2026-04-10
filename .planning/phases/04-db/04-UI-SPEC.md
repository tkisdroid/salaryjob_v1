---
phase: 4
slug: 04-db
status: draft
shadcn_initialized: true
preset: base-nova (components.json)
created: 2026-04-10
response_language: ko
dimensions_covered:
  - copywriting
  - visuals
  - color
  - typography
  - spacing
  - registry_safety
  - accessibility
  - motion
  - responsive
surfaces_locked: 12
---

# Phase 4 — UI Design Contract

> 지원·근무 라이프사이클 DB 연결 + 탐색 고도화(Kakao 지도 + Web Push + 체크아웃 QR)의 시각·인터랙션 계약. Researcher가 작성, ui-checker가 검증, planner/executor가 단일 진실원으로 사용.

**읽기 전 필수 참조:**
- `.planning/phases/04-db/04-CONTEXT.md` — 28개 locked 결정
- `.planning/phases/04-db/04-RESEARCH.md` — 기술적 연구, Next.js 16 PWA 가이드
- `src/app/globals.css` — Phase 1에서 확립된 현행 토큰 (변경 금지, 확장만 허용)

**원칙:** Phase 1이 이미 GigNow 디자인 언어를 확정했다. Phase 4는 **확장**만 한다. 기존 brand/teal/urgent 토큰은 변경 금지, 새 surface는 기존 카드·스티키·플로팅 패턴을 상속한다.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **shadcn/ui** (initialized, `components.json` base-nova style) |
| Preset | base-nova · baseColor neutral · CSS variables · RSC · iconLibrary lucide |
| Component library | **Radix UI + @base-ui/react** (badge는 base-ui useRender) |
| Icon library | **lucide-react** (기존 사용) |
| Font | **Pretendard** (`--font-sans`) + Geist Mono |
| Theme engine | Tailwind v4 `@theme inline` + OKLCH color space |
| Aliases | `@/components/ui`, `@/lib`, `@/hooks` |

**기존 설치 인벤토리** (`src/components/ui/`):
`avatar`, `badge`, `button` (+ `button-variants.ts`), `card`, `input`, `label`, `select`, `separator`, `skeleton`, `tabs`, `textarea`

**Phase 4가 추가할 shadcn/base-ui primitives — 모두 공식 registry (third-party 없음):**

| Component | 설치 명령 | 사용처 |
|-----------|----------|--------|
| `dialog` | `npx shadcn@latest add dialog` | 퇴근 QR 모달, 취소 확인 모달 |
| `sheet` | `npx shadcn@latest add sheet` | 모바일 지도 preview bottom sheet, 데스크톱 side drawer |
| `toggle-group` | `npx shadcn@latest add toggle-group` | 리스트/지도 토글, 거리 1/3/5/10km, 시간 버킷 다중선택 |
| `sonner` | `npx shadcn@latest add sonner` | Realtime 상태 전이 toast ("수락되었습니다", "새 지원자", "Realtime 재연결됨") |
| `progress` | `npx shadcn@latest add progress` | 자동수락 30분 타이머 bar, QR 10분 카운트다운 linear |
| `tooltip` | `npx shadcn@latest add tooltip` | Realtime 상태 dot, 필터 도움말 |
| `alert` | `npx shadcn@latest add alert` | Push 권한 배너 (dismissable), 지도 SDK 로드 실패 |
| `alert-dialog` | `npx shadcn@latest add alert-dialog` | 파괴적 확인 (24시간 취소, 노쇼 경고) |
| `scroll-area` | `npx shadcn@latest add scroll-area` | 지원자 목록 데스크톱 Biz 스크롤 |

> **Registry Safety:** 모든 컴포넌트는 **shadcn 공식 registry(ui.shadcn.com)** 사용. Phase 4는 third-party registry `{}` (components.json `registries: {}` 유지). `sonner`는 shadcn 공식 래퍼로 Emil Kowalski의 검증된 upstream을 사용.

---

## Spacing Scale

**Tailwind 기본 스케일 사용 — 새로 정의하지 않음.** Phase 1이 사용한 값 중 Phase 4가 계약으로 락하는 부분:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px (`gap-1`, `p-1`) | 아이콘 gap, 배지 내부 inline |
| sm | 8px (`gap-2`, `p-2`) | 리스트 아이템 내부 gap, 작은 패딩 |
| md | 12px (`gap-3`, `py-3`) | 카드 내부 section gap, CTA 수직 패딩 |
| base | 16px (`p-4`, `space-y-4`) | 카드 표준 패딩, 페이지 horizontal gutter |
| lg | 20px (`p-5`, `space-y-5`) | 주요 랜딩 섹션 패딩 |
| xl | 24px (`px-6`, `py-6`, `space-y-6`) | 데스크톱 Biz 페이지 gutter, section 브레이크 |
| 2xl | 32px (`p-8`) | 빈 상태 영역, 데스크톱 카드 |
| 3xl | 48px (`py-16`) | Empty state 수직 패딩 |

**예외 (허용됨):**
- **Safe-area**: `env(safe-area-inset-bottom)` + 하단 탭바 높이 `h-16` → `.pb-safe` 헬퍼 (`globals.css` 기존)
- **사이드 여백 on mobile**: 워커 페이지는 `max-w-lg mx-auto px-4` (384pt 컨테이너 + 16px gutter) 고정
- **Biz 페이지 컨테이너**: `max-w-5xl mx-auto px-6 py-8` 고정 (지원자 관리/공고 상세)
- **터치 타겟**: 수락/거절 버튼은 `size="sm"` (h-9)지만 horizontal padding 으로 tap 영역 ≥ 44×44 유지 — Phase 4 실행자는 sm 버튼의 좌우 여백을 `px-4` 이상으로 유지

---

## Typography

**Font family:** `--font-sans` = Pretendard. 한국어 letter-spacing은 Pretendard 기본값 유지 (`tracking-tight`는 heading only).

| Role | Size | Weight | Line Height | 사용처 |
|------|------|--------|-------------|--------|
| **Display** | `text-3xl` (30px) | `font-bold` (700) | 1.1 (`tracking-tight`) | Earnings 카드 수입 숫자, 체크인 clock (tabular-nums) |
| **Heading XL** | `text-2xl` (24px) | `font-bold` | 1.2 | Biz 페이지 제목 ("지원자 관리"), 성공 화면 ("지원 확정!") |
| **Heading** | `text-xl` (20px) | `font-bold` | 1.2 | Worker 페이지 제목 ("지원 내역") |
| **Section** | `text-base` (16px) | `font-bold` | 1.3 | 섹션 타이틀 ("내 주변 공고", "카테고리") |
| **Body** | `text-sm` (14px) | `font-medium` / `font-bold` | 1.5 | 카드 제목, 버튼, 주요 본문 (한국어 기준 line-height 1.5 권장) |
| **Caption** | `text-xs` (12px) | `font-medium` | 1.5 | 메타데이터 (시간, 거리, 카테고리), 배지 라벨 |
| **Micro** | `text-[10px]` / `text-[11px]` | `font-medium` | 1.4 | 라벨, 힌트, "안녕하세요" 인사말 |

**규칙:**
- 한국어 본문 `line-height: 1.5` 유지 (영어 1.5보다 타이트하면 자모 충돌)
- 숫자 집계 화면은 `tabular-nums` 필수 (체크인 clock, 카운트다운)
- 새 surface에서 위 7단계 이외의 폰트 크기 생성 금지
- Weight은 `font-medium (500)` / `font-bold (700)` 2단계만 사용 — `font-semibold` 도입 금지 (Pretendard는 medium→bold gap이 충분)

---

## Color

**60/30/10 분포 (Phase 1 기존 OKLCH 토큰 — 변경 금지):**

| Role | Token | OKLCH Value | Usage |
|------|-------|-------------|-------|
| Dominant 60% | `--background` | `oklch(0.985 0.002 75)` warm stone | 전체 화면 배경 |
| Secondary 30% | `--card` | `oklch(1 0 0)` 순백 | 카드, 모달 표면 |
| Secondary 30% | `--muted` | `oklch(0.96 0.003 75)` | subtle fills, info boxes |
| **Accent 10%** | `--brand` = `--primary` = `--urgent` | `oklch(0.65 0.19 45)` orange-coral | **아래 reserved list 참조** |
| Accent support | `--brand-light` | `oklch(0.88 0.08 70)` | brand tint (10% opacity fills) |
| Accent support | `--brand-dark` | `oklch(0.52 0.17 40)` | hover state |
| Accent (second) | `--teal` | `oklch(0.52 0.1 180)` | **Biz 전용 accept action only** |
| Destructive | `--destructive` | `oklch(0.577 0.245 27.325)` | 실제 파괴적 작업 |
| Semantic — success | Tailwind `green-500/600` | — | LIVE 인디케이터, "근무 중" 상태 |
| Semantic — info | Tailwind `blue-500/600` | — | 안전 안내 박스, Realtime 연결됨 dot |

**Accent (`--brand`) reserved for — explicit list:**
1. Primary CTA ("원탭 지원", "체크인 시작", "QR 체크아웃", "퇴근 QR 열기")
2. 선택된 상태 (tab active, toggle active, filter chip selected)
3. Brand gradient earnings card (`from-brand to-brand-dark`)
4. Hero 아이콘 (별점, Sparkles 섹션 heading)
5. Mobile tab bar 활성 항목
6. 본인 수입 / 금액 (숫자 강조용)

**Accent NEVER used for:**
- 일반 텍스트 본문
- 비활성 보더
- 카테고리 emoji 박스 (각자 `--color-cat-*` 사용)
- Biz 수락 버튼 — 이건 `--teal` 전용 (브랜드 구별: Worker = 오렌지, Biz action = teal)

### Phase 4 신규 토큰 — pending 상태 색

현행 `globals.css`에는 "pending" 전용 토큰이 없다. Phase 4는 **amber 계열을 상태색(semantic)로 추가**하되 brand(orange-coral)와 시각적 충돌을 피하기 위해 노란 톤으로 결정.

| 신규 토큰 | OKLCH | Tailwind fallback | 사용처 |
|---------|-------|-----|--------|
| `--status-pending` | `oklch(0.78 0.15 85)` (warm amber) | `amber-500` (`#F59E0B`) | 지원 상태 "대기 중" 배지, 자동수락 타이머 progress fill, 지원자 카드 pending 인디케이터 |
| `--status-pending-bg` | `oklch(0.96 0.06 90)` | `amber-50` | pending 배지 배경 fill |
| `--status-pending-fg` | `oklch(0.42 0.13 75)` | `amber-900` | pending 배지 텍스트 (AA 대비율 확보) |

**globals.css 추가안 (executor가 구현):**
```css
:root {
  /* Phase 4 — Semantic status colors */
  --status-pending: oklch(0.78 0.15 85);
  --status-pending-bg: oklch(0.96 0.06 90);
  --status-pending-fg: oklch(0.42 0.13 75);
}

@theme inline {
  --color-status-pending: var(--status-pending);
  --color-status-pending-bg: var(--status-pending-bg);
  --color-status-pending-fg: var(--status-pending-fg);
}
```

**Contrast 검증 (필수 — ui-checker가 확인):**
- `text-status-pending-fg` on `bg-status-pending-bg` ≥ 4.5:1 (AA body)
- `bg-status-pending` 위 white text ≥ 3:1 (AA large)
- Phase 1의 `amber-500/5 border-amber-500/30` info 박스와는 **역할 분리**: 그건 "주의 안내" (body alert), `status-pending`은 "상태 라벨"

### 6개 라이프사이클 상태 × 색 매핑 (Phase 4 락)

| 상태 | 배지 배경 | 배지 텍스트 | 카드 좌측 border | 아이콘 |
|-----|----------|------------|----------------|--------|
| `pending` | `bg-status-pending-bg` | `text-status-pending-fg` | `border-l-4 border-l-status-pending` | `Hourglass` |
| `confirmed` | `bg-teal/10` | `text-teal` | `border-l-4 border-l-teal` | `CheckCircle2` |
| `in_progress` | `bg-green-500/10` | `text-green-700` | `border-l-4 border-l-green-500` | `Zap` (LIVE) |
| `completed` | `bg-muted` | `text-muted-foreground` | `border-l-transparent` | `CheckCheck` |
| `cancelled` | `bg-destructive/10` | `text-destructive` | `border-l-transparent` opacity-60 | `XCircle` |

---

## Copywriting Contract — 한국어 Lock

**상태 라벨 (표시 전용, 영어 enum → 한글 매핑):**

| enum | 라벨 | 비고 |
|------|-----|------|
| `pending` | **대기 중** | 자동수락 타이머 러닝. 타이머 만료 후 자동 `confirmed` 전이 |
| `confirmed` | **수락됨** | Biz가 수락했거나 자동수락됨 |
| `in_progress` | **근무 중** | 체크인 완료. LIVE 인디케이터 표시 |
| `completed` | **완료** | 체크아웃 완료, 정산 대기/완료 |
| `cancelled` | **취소됨** | Worker 자체 취소, Biz 거절, 또는 노쇼 |
| `checked_in` | (deprecated) | enum에 잔존하지만 라벨 미표시 |

**Primary CTAs (Lock — 변경 금지):**

| 위치 | 카피 | 상태 |
|-----|-----|-----|
| 공고 상세 → 지원 | `원탭 지원` (좌측에 Zap 아이콘) | brand, disabled일 때 `약관 동의 후 진행` |
| 지원 확정 완료 화면 | `내 스케줄 확인` (primary) / `다른 일자리 더 보기` (secondary) | |
| Biz 지원자 카드 | `수락` (teal primary) / `거절` (outline) | pending일 때만 표시 |
| Biz 상세 상단 | `퇴근 QR 열기` (teal primary, `QrCode` 아이콘) | confirmed 지원자 ≥ 1일 때만 활성 |
| Worker 체크인 | `체크인` (brand, `MapPin` 아이콘) | 시간창 + geofence 둘 다 OK일 때만 활성 |
| Worker 체크아웃 | `QR 체크아웃 시작` (brand, `Camera` 아이콘) | in_progress 상태 + 근무 종료 5분 전부터 |
| Push 배너 | `알림 켜기` (primary) / `나중에` (ghost) | dismissable |
| Home 모드 토글 | `리스트` · `지도` (ToggleGroup, 선택 = brand) | |

**Empty States:**

| 화면 | Heading | Body | 액션 |
|-----|---------|-----|-----|
| `/my/applications` 전체 | `아직 지원 내역이 없어요` | `마음에 드는 공고에 지원해보세요` | `공고 둘러보기` → `/home` |
| `/my/applications` 대기중 | `대기 중인 지원이 없어요` | `지원하면 Business 수락을 기다려요 (최대 30분)` | — |
| `/my/applications` 수락됨 | `수락된 지원이 없어요` | `지원하면 이곳에 확정 내역이 쌓여요` | — |
| `/my/applications` 완료 | `완료된 근무가 없어요` | `근무가 끝나면 정산 내역이 여기에 표시돼요` | — |
| `/biz/posts/[id]/applicants` 전체 | `아직 지원자가 없어요` | `공고를 공유하거나 '급구' 옵션을 켜보세요` | `공고 수정` |
| `/home` 필터 결과 0 | `조건에 맞는 공고가 없어요` | `거리나 시간대를 넓혀보세요` | `필터 초기화` |
| `/home` 지도 viewport 0 | `이 지역에는 공고가 없어요` | `지도를 이동하거나 거리를 늘려보세요` | — |

**Error States (한국어 — user-facing):**

| 시나리오 | 카피 | 복구 액션 |
|---------|-----|-----------|
| 카메라 권한 거부 | `카메라 접근 권한이 필요해요. 브라우저 설정에서 권한을 허용한 뒤 다시 시도해주세요.` | `설정 열기` (iOS/Android 가이드) |
| Geolocation 권한 거부 | `위치 정보를 켜야 체크인할 수 있어요. 브라우저 설정에서 위치 권한을 허용해주세요.` | `다시 시도` |
| Geofence 범위 밖 | `현장에 도착한 뒤 다시 시도해주세요. (현재 약 {N}m 떨어져 있어요)` | `새로고침` |
| 체크인 시간창 밖 (이전) | `아직 체크인 시간이 아니에요. 근무 시작 10분 전부터 가능해요.` | `카운트다운 표시` |
| 체크인 시간창 밖 (이후) | `체크인 시간이 지났어요. Business에게 연락해주세요.` | `연락하기` |
| QR 만료 | `QR이 만료되었어요. Business에게 QR을 다시 열어달라고 요청해주세요.` | `다시 스캔` |
| QR 서명 불일치 | `이 QR은 이 공고의 것이 아니에요. 올바른 매장 QR인지 확인해주세요.` | `다시 스캔` |
| Realtime 연결 끊김 | (상태 dot + tooltip) `실시간 연결이 끊겼어요. 1분마다 자동 새로고침 중이에요.` | 자동 — 복구 시 toast `실시간 연결이 복구되었어요` |
| Kakao 지도 SDK 실패 | `지도를 불러오지 못했어요. 네트워크를 확인한 뒤 다시 시도해주세요.` | `리스트 모드로 보기` |
| Kakao 지도 키 없음 | `지도 기능을 사용하려면 관리자에게 문의하세요.` | (disable) |
| Push 권한 거부 | (배너 dismiss) — 재요청 안 함. 설정에서 재활성 가능하다는 힌트만 `/my` 설정 섹션에 표시 |
| 동시 지원 경합 (이미 마감) | `이미 마감된 공고입니다.` | `다른 공고 보기` → `/home` |
| 본인 이미 지원 | `이미 지원한 공고예요. 지원 내역에서 확인해주세요.` | `지원 내역 보기` |
| 24시간 이내 취소 경고 | `근무 24시간 이내 취소는 노쇼로 기록돼요. 계속할까요?` | `취소 진행` / `돌아가기` |

**Success Toasts (Sonner):**

| 시나리오 | 카피 |
|---------|-----|
| 원탭 지원 성공 | `지원 완료! Business 수락을 기다려요` |
| Biz 수락 성공 | `수락되었어요` |
| 자동수락 전이 (Worker toast) | `{공고명}이(가) 수락되었어요!` |
| Biz에게 신규 지원 (Realtime) | `새 지원자가 도착했어요` |
| 체크인 성공 | `체크인 완료! 근무 화면으로 이동해요` |
| 체크아웃 성공 | `수고하셨어요. 정산을 진행합니다` |
| Push 구독 성공 | `알림이 켜졌어요` |
| Realtime 재연결 | `실시간 연결이 복구되었어요` |

**Push 권한 배너 (lock):**

- Heading: **`알림을 켜고 기회를 놓치지 마세요`**
- Body: **`지원 수락 소식을 바로 받아보실 수 있어요`**
- Primary: `알림 켜기`
- Secondary: `나중에` (ghost)
- Dismissed state (localStorage flag): 재노출 X. 설정 페이지에서만 재활성

**자동수락 타이머 배지:**
- Live: **`{N}분 후 자동 수락`** (N = 남은 분, 소수점 없음)
- 만료 30초 전: **`자동 수락 임박`** (amber 깜박임 없음, 텍스트 강조)

**거리/시간 포맷 (Lock):**
- `< 1km` → `XXXm` (예: `320m`)
- `≥ 1km` → `X.Xkm` (예: `3.2km`)
- `< 1분 전` → `방금`
- `< 1시간 전` → `{N}분 전`
- `< 24시간 전` → `{N}시간 전`
- `≥ 1일 전` → `{yyyy-MM-dd}` 또는 `{M}월 {d}일`
- 금액: `{N,NNN}원` (천단위 쉼표, 원 suffix, 공백 없음)
- 근무 시간: `{HH:mm}~{HH:mm}` (24시간제, 콜론 구분)

---

## Surface Contracts — 12 Surfaces

각 surface는 다음 형식으로 락: **Purpose · Layout · Components · States · Interactions · Copy · A11y**

---

### Surface 1 — `/home` 리스트/지도 토글 헤더

**Purpose:** Worker가 탐색 중 시각 모드를 결정. URL state 동기화 (`?view=list|map`).

**Layout (mobile, sticky top):**
- 기존 `/home` sticky header (`h-14`) 바로 **아래**에 2번째 sticky row (`h-12`)
- `max-w-lg mx-auto px-4 flex items-center justify-between`
- 좌측: ToggleGroup `[리스트 | 지도]` (shadcn `toggle-group`, `type="single"`, default `list`)
- 우측: 필터 칩 버튼 `필터 ⚙` (열면 bottom sheet for 시간 + 거리)

**Components:**
- `<ToggleGroup>` · `<ToggleGroupItem>` (shadcn)
- `<Button variant="ghost" size="sm">` for 필터 trigger
- Lucide `List`, `Map`, `SlidersHorizontal` icons

**States:**
- Default: 리스트 active (brand pill)
- Map mode: 지도 active, sticky header 높이 유지
- 필터 active ≥1: `필터` 버튼에 brand dot (`relative` + `absolute` dot)

**Interactions:**
- Toggle click → URL `?view=` 업데이트 (`useRouter().replace` + `shallow`)
- 필터 클릭 → `<Sheet side="bottom">` 열림 (mobile) / `<Dialog>` 중앙 (desktop md:)

**A11y:**
- ToggleGroup은 Radix 기본 `role="group"` + ToggleGroupItem은 `aria-pressed` 자동
- 필터 버튼 `aria-label="필터 열기"`

---

### Surface 2 — `/home` 시간 필터 (SEARCH-03)

**Purpose:** 오늘/내일/이번주 × 오전/오후/저녁/야간 조합 필터. CONTEXT.md D-26 lock.

**Layout:** 필터 bottom sheet 내부 첫 번째 섹션
- Section heading: `근무 시기` (`text-sm font-bold`)
- Row 1: 날짜 프리셋 — ToggleGroup `type="single"` — `[오늘 | 내일 | 이번주]`
- Row 2: 시간대 — ToggleGroup `type="multiple"` — `[오전 | 오후 | 저녁 | 야간]` (2행 2열 grid mobile, 1행 desktop)

**States:**
- Unselected: `variant="outline"` (border-border, bg-background)
- Selected: brand fill (`data-[state=on]:bg-brand data-[state=on]:text-white`)
- 시간 버킷 힌트 텍스트 (`text-[10px] text-muted-foreground`): `오전 6-12 · 오후 12-18 · 저녁 18-22 · 야간 22-06`

**Interactions:**
- 날짜 preset 선택 필수 (default `오늘`)
- 시간대 0개 선택 시 = "모든 시간"
- URL 동기화: `?date=today&time=morning,evening`

**Copy lock:**
- Heading: `근무 시기`
- Buckets: `오전` `오후` `저녁` `야간`
- Help: `시간대는 여러 개 선택할 수 있어요`

**A11y:**
- ToggleGroupItem `aria-pressed`
- Multiple ToggleGroup: `aria-label="시간대 선택 (중복 가능)"`

---

### Surface 3 — `/home` 거리 스테퍼 (D-27)

**Purpose:** 1/3/5/10km 반경 필터, 리스트+지도 공유. URL `?radius=`.

**Layout:** 필터 sheet 두 번째 섹션
- Heading: `거리` (`text-sm font-bold`)
- ToggleGroup `type="single"` `[1km | 3km | 5km | 10km]`, default `3km`
- 아래 힌트: `내 위치 반경 {N}km 이내 공고`

**Components:** `ToggleGroup` with 4 items, `Navigation` icon lucide

**States:**
- Default: `3km` pill active brand
- On change: 즉시 query param 업데이트, 필터 sheet는 닫지 않음 (유저가 결과 미리보기)

**Special interaction with map:**
- 지도 모드에서는 선택 radius를 `kakao.maps.Circle`로 그려 시각화
- Worker 현재 위치 marker (파란 dot) 중심

**A11y:** `aria-label="거리 반경 선택"`

---

### Surface 4 — `/home` 지도 뷰 (D-25, D-28)

**Purpose:** Kakao 지도 위에 현재 viewport 공고 marker 표시, marker 클릭 시 preview card.

**Layout:**
- 토글 `지도` 선택 시 전환. 지도는 `max-w-lg mx-auto` 컨테이너 **밖에서** full-width 렌더링 (모바일 w-full, 데스크톱 md:max-w-3xl mx-auto)
- 높이: `h-[calc(100dvh-theme(spacing.14)-theme(spacing.12)-theme(spacing.16))]` (viewport - top header 14 - toggle row 12 - bottom tab 16)
- 지도 위 floating 컨트롤:
  - 좌상단: `현재 위치로 이동` FAB (round, `Crosshair` icon, `bg-card shadow-md w-10 h-10`)
  - 우상단: 표시 개수 배지 `{N}개 공고`

**Components:**
- 지도 container `<div id="kakao-map">` (useRef) — client component
- `<Skeleton>` 풀사이즈 overlay (로딩)
- Marker: **custom SVG pin** (brand color fill, 32×40px) — not default Kakao marker
- `<Sheet side="bottom">` mobile / `<Sheet side="right">` desktop(md:) for 선택된 공고 preview

**States:**
1. **Loading (SDK autoload=false)**: full-size `<Skeleton>` + 중앙 `Loader2` + 텍스트 `지도를 불러오는 중...`
2. **SDK load fail**: `<Alert variant="destructive">` + 카피 `지도를 불러오지 못했어요...` + 버튼 `리스트 모드로 보기`
3. **Key missing**: toggle `지도` disabled + tooltip `지도 기능을 사용하려면 관리자에게 문의하세요`
4. **Empty viewport**: 지도 중앙 floating alert pill `이 지역에는 공고가 없어요` + 거리 확대 버튼
5. **Default**: 반경 원 + marker + geolocation dot
6. **Marker selected**: marker 크기 1.2× scale, bottom sheet 자동 열림, 연결선 없음

**Interactions:**
- Marker click → preview sheet 자동 open, 지도는 해당 marker로 `panTo`
- Preview sheet swipe down dismiss (Radix Sheet 기본)
- Sheet 내부 `자세히 보기` CTA → `/posts/{id}` 라우팅
- 지도 drag/zoom 후 새 viewport → debounced query refetch (300ms) — **단, 거리 필터 반경을 유지**하므로 실질적으로 radius 내에서만 재쿼리
- "현재 위치" FAB → geolocation 요청 → center + radius circle 재렌더

**Marker icon spec (executor가 SVG 작성):**
- 32×40px path, brand fill (`oklch(0.65 0.19 45)`), white stroke 2px, drop shadow soft
- 선택 시 scale(1.2) + teal 링 3px
- URGENT 공고는 red-500 fill + `animate-urgent` 펄스 (기존 globals.css 키프레임 재사용)

**Performance lock (D-28):**
- limit 50 markers per query
- Clustering 미적용
- `getJobsByDistance` 직접 호출 (cursor 페이지네이션 비활성)

**A11y:**
- 지도 자체는 `role="application"` + `aria-label="공고 지도"` (WAI-ARIA map pattern)
- `prefers-reduced-motion: reduce` 시 marker pulse/scale 애니메이션 비활성
- Bottom sheet는 Radix 기본 focus trap + ESC dismiss
- 키보드 사용자는 토글을 `리스트`로 전환할 수 있음 (키보드 대체 경로 명시)

---

### Surface 5 — `/home` Realtime 연결 인디케이터

**Purpose:** Worker/Biz 모두 Realtime subscription 상태를 subtle하게 노출. D-06, D-08.

**Layout:** 각 페이지 sticky header 우측 상단에 미니 dot
- 3×3px dot + 색
- 상태별 색:
  - `SUBSCRIBED`: `bg-green-500` (no animation)
  - `CONNECTING`: `bg-amber-500 animate-pulse`
  - `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`: `bg-muted-foreground` + 60s polling 힌트
- 우측 Bell 아이콘 옆 `ml-1.5`에 배치

**Interactions:**
- Hover / long-press → `<Tooltip>` 표시:
  - SUBSCRIBED: `실시간 연결됨`
  - fallback: `실시간 연결 끊김 · 1분마다 새로고침 중`
- 연결 복구 시 Sonner toast: `실시간 연결이 복구되었어요`

**A11y:**
- `aria-live="polite"` 영역으로 상태 변경 안내: `실시간 연결 상태: {상태}`
- 시각 정보만으로 판단 못 하도록 tooltip의 텍스트 설명 필수

---

### Surface 6 — `/my/applications` 상태 탭 + 카드

**Purpose:** Worker 지원 내역 관리. 새 `pending` 탭 추가. Realtime 반영.

**Layout (mobile `max-w-lg mx-auto px-4 py-6 space-y-5`):**
- Header: `<ChevronLeft>` + `지원 내역` title + right-side Realtime dot
- `<Tabs defaultValue="all">` sticky (`sticky top-14 z-30 bg-background/95 backdrop-blur -mx-4 px-4`)
- `<TabsList className="w-full grid grid-cols-5">`:
  - `전체` / `대기중` / `수락됨` / `근무중` / `완료`
  - 각 탭에 카운트 배지 `text-muted-foreground text-[10px]` (예: `대기중 2`)
- Cancelled는 별도 탭 없음 — 전체 탭에서 흐릿하게 표시

**Card component (`<Card size="sm">`):**
- 좌측 상태 border (위 색 매핑)
- 상단: 공고명 `text-sm font-bold` + 우측 상태 배지
- 메타 (text-xs): `<Building2>` business · `<Calendar>` date · `<Wallet>` pay (brand color)
- Pending 상태일 때 **하단 추가 row**: `<Hourglass>` + `{N}분 후 자동 수락` + `<Progress value={(30-N)/30*100}>` 가느다란 bar (`h-1`)

**States:**
- Default: 기존 Phase 1 카드 레이아웃 유지
- Pending: amber 좌측 border + 타이머 바
- In_progress: green 좌측 border + LIVE dot + 카드 클릭 → `/my/applications/{id}/check-in` (체크아웃 모드)
- Completed: muted border + `<ChevronRight>` + 링크 → review (Phase 5)
- Cancelled: `opacity-60` (dim) + 카드 클릭 disabled

**Interactions:**
- 카드 탭 → 해당 application detail 또는 check-in 라우팅
- Realtime UPDATE 수신 시 카드 subtle pulse (1회, `animate-[highlight_600ms_ease]`) + sonner toast
- 하단 취소 버튼 (`pending`/`confirmed` 상태만, 카드 상세 진입 후): `<AlertDialog>` 확인 — 24시간 이내는 노쇼 경고 카피

**Copy lock:**
- 탭 라벨: `전체` / `대기중` / `수락됨` / `근무중` / `완료`
- Empty: (상단 copywriting contract 참조)

**A11y:**
- `<Tabs>` = Radix 기본 `role="tablist"` + ARIA
- Realtime 카드 업데이트: 카드에 `aria-live="polite"` 래퍼 + 업데이트 시 screen reader announce
- `<Progress>` pending timer: `aria-valuenow={remaining}` + `aria-label="자동 수락까지 {N}분 남음"`
- 업데이트되는 시간 숫자는 `aria-live="polite"`

---

### Surface 7 — `/my/applications/[id]` 취소 확인 모달

**Purpose:** D-21 24시간 취소 정책 경고.

**Layout:** `<AlertDialog>` 중앙 모달
- Icon: `AlertTriangle` amber-500 32px
- Title (24h 이전): `지원을 취소할까요?`
- Title (24h 이내): `근무 24시간 이내 취소는 노쇼로 기록돼요`
- Body (24h 이전): `지금 취소하면 자리가 즉시 다른 Worker에게 전달돼요.`
- Body (24h 이내): `완료율이 떨어지고, 반복되면 매칭이 제한될 수 있어요. 정말 취소할까요?`
- Cancel: `돌아가기`
- Action: `취소하기` (destructive, 24h 이내는 `노쇼로 취소하기` 라벨)

**A11y:** Radix AlertDialog 기본 focus trap + `role="alertdialog"` + `aria-describedby`

---

### Surface 8 — `/my/applications/[id]/check-in` 체크인 화면 (geofence)

**Purpose:** D-09 geofence + 시간창 검증 UI.

**Layout:** 기존 Phase 1 `check-in-flow.tsx` 골격 유지, 다만 QR 프레임 **대신** geofence 카드

**Sections (top→bottom):**
1. Sticky header (`ArrowLeft` + `체크인`)
2. Current time (`text-4xl font-bold tabular-nums`)
3. Job card (기존 동일)
4. **NEW — Geofence status card** (기존 QR 프레임 자리):
   - Container: `rounded-3xl bg-muted/50 p-8 text-center`
   - Icon: `MapPin` 64px
   - States:
     - **Resolving**: `<Loader2 animate-spin>` + `내 위치를 확인하는 중...`
     - **Permission denied**: `<LocationOff>` red + `위치 정보를 켜야 체크인할 수 있어요` + `권한 다시 요청` button
     - **Out of range**: `<MapPinOff>` amber + `매장까지 {N}m 떨어져 있어요` + 힌트 `200m 이내로 이동한 뒤 다시 시도해주세요` + `다시 확인` button
     - **Out of time window (early)**: amber + `체크인은 {HH:mm}부터 가능해요` + countdown
     - **Out of time window (late)**: destructive + `체크인 시간이 지났어요` + `Business에 연락` CTA
     - **Ready**: green + `매장에 도착했어요! (약 {N}m)` + sticky CTA enable
5. Amber "꼭 확인해주세요" box (기존 재사용)
6. Sticky bottom CTA: `체크인` (brand, `MapPin` 아이콘)

**Interactions:**
- Page mount → `navigator.geolocation.getCurrentPosition` 요청
- 권한 prompt는 브라우저가 처리
- 성공 → Server Action `checkIn` 호출 → geofence 서버 재검증 → status = `in_progress` → Sonner toast → `/my/applications/{id}` 근무 중 뷰로 라우팅

**A11y:**
- `aria-live="polite"` 영역으로 distance 업데이트 announce
- Geolocation 권한 거부 시 키보드 사용자용 대체 텍스트 링크

---

### Surface 9 — `/my/applications/[id]/check-out` QR 스캐너 (D-13, D-14)

**Purpose:** html5-qrcode 카메라 스캐너로 Biz QR 스캔 → JWT 검증.

**Layout:** Full-screen camera 뷰 (기존 Phase 1 scanning state 확장)
- 상단 sticky: `<X>` close + `체크아웃 QR 스캔`
- 배경: `bg-black` 전체
- 중앙: 카메라 viewport 4:3 aspect (`<div id="qr-reader">`) within `max-w-sm mx-auto rounded-2xl overflow-hidden`
- Viewport 위 corner brackets (기존 Phase 1 스타일 재사용 — 4개 코너 brand color)
- Scan line `animate-[scanline_1.5s_...]` (기존 재사용)
- 하단: 가이드 텍스트 `매장 QR 코드를 프레임 안에 맞춰주세요`
- 하단 보조: `수동 입력` ghost button (QR 스캔 불가 시 대체 — D-15 JWT 토큰 수동 입력 placeholder)

**States:**
1. **Requesting permission**: 전체 검은 배경 + 중앙 `<Camera>` 아이콘 + `카메라 권한을 요청하고 있어요`
2. **Permission denied**: `<CameraOff>` + 카피 + `권한 다시 요청` button + `설정 열기` 링크
3. **Scanning (active)**: 카메라 라이브 + scan line 애니메이션 + `aria-live="polite"` 영역
4. **Detected & verifying**: scan line freeze + `<Loader2>` 오버레이 + `QR 확인 중...`
5. **Success**: green flash overlay 300ms → 자동 네비게이션 → 정산 화면 (기존 Phase 1 `completed` state 재사용)
6. **Fail (expired)**: red flash + `<AlertDialog>` `QR이 만료되었어요...` + `다시 스캔`
7. **Fail (mismatch)**: `이 QR은 이 공고의 것이 아니에요`

**Interactions:**
- html5-qrcode 결과 → Server Action `checkOut(applicationId, jwtToken)` → `jose.jwtVerify` → 성공 시 DB 기록
- 실패시 스캐너는 stop → AlertDialog → 재시작 버튼

**A11y:**
- `aria-live="assertive"` for scan 결과 변경 (성공/실패 즉시 읽기)
- 카메라 권한 거부 시 키보드 대체 경로 (수동 입력)
- `prefers-reduced-motion`: scan line 비활성 (정적 box만)

---

### Surface 10 — `/biz/posts/[id]/applicants` 지원자 카드 (D-02, D-07)

**Purpose:** Biz가 pending 지원자를 수락/거절. Realtime 반영. 자동수락 타이머 표시.

**Layout:** 기존 Phase 1 ApplicantCard 확장
- Desktop: `max-w-5xl mx-auto px-6 py-8` 유지
- Tabs: `[전체 | 대기 | 수락 | 근무중 | 완료 | 거절]` (Phase 1의 3탭 → 6탭 확장)

**Card 확장:**
- 좌측 상태 border (상태 매핑)
- 헤더: Avatar + 이름 + 별점 + 근무횟수 + appliedAt ("2시간 전")
- 상태 배지 (Phase 4 신규 `pending` amber)
- **NEW — pending 상태일 때 상단 바 추가**:
  - `<Progress value={(30-N)/30*100}>` 가느다란 bar (`h-1 bg-status-pending-bg` → fill `bg-status-pending`)
  - 옆에 텍스트 `{N}분 후 자동 수락` + `<Hourglass>` 아이콘
  - `N ≤ 1분`일 때 텍스트를 `자동 수락 임박`으로 교체, progress bar에 `animate-pulse`
- 메시지 박스 (기존)
- 액션 row:
  - `pending` → `수락` (teal) + `거절` (outline) + `채팅` (ghost, Phase 5)
  - `confirmed` → `수락됨 ✓` (disabled secondary) + `연락` (ghost)
  - `in_progress` → `LIVE 근무중` 배지 + `체크인 시각 {HH:mm}` 표시
  - `completed` → `{근무시간} · {수입}원` 요약
  - `cancelled` → 카드 dim, `거절함` 태그
- Details disclosure (기존 유지)

**Realtime update animation:**
- 새 지원자 INSERT → 카드 위에서 slide-down 등장 `animate-[slide-in_300ms_ease]` (executor가 keyframe 정의)
- UPDATE (auto-accept 등) → 카드 1회 pulse `animate-[highlight_600ms_ease]` + sonner toast
- 카드 정렬: `pending` 먼저, `appliedAt` 최근 순

**Interactions:**
- `수락` → Server Action `acceptApplication` → 즉시 optimistic update + Realtime 확인
- `거절` → `<AlertDialog>` `지원을 거절할까요?` 확인 → Server Action `rejectApplication`
- 자동수락 타이머는 client ticker (매 1초) — 서버 시계와 sync를 위해 `appliedAt + 30min - now()`

**A11y:**
- `aria-live="polite"` on list container (새 지원자 announce)
- Progress bar `aria-valuenow` + `aria-label="자동 수락까지 {N}분"`
- 수락/거절 버튼 tap target ≥ 44×44 (sm 버튼 + `px-4`)
- Realtime update alt-path: 1분 polling fallback이 RQ로 동작 → 시각 변화 없이도 데이터 신선

---

### Surface 11 — `/biz/posts/[id]` "퇴근 QR 열기" 모달 (D-16)

**Purpose:** Business가 10분 만료 JWT QR 생성 → 워커가 스캔.

**Trigger button:**
- `/biz/posts/[id]` 상단 action row (기존 `지원자 보기` 버튼 좌측)
- `<Button variant="default" className="bg-teal hover:bg-teal/90">` `<QrCode> 퇴근 QR 열기`
- **활성 조건:** 해당 공고에 `in_progress` 지원자 ≥ 1명 (없으면 disabled + tooltip `근무 중인 Worker가 있을 때 사용할 수 있어요`)

**Modal (`<Dialog>`):**
- 크기: **모바일 `w-full h-full` fullscreen / 데스크톱 `max-w-md`** (responsive)
- Header: `<DialogTitle>` `퇴근 QR 코드` + `<DialogClose>`
- Body (centered):
  1. QR SVG 280×280 (qrcode npm 렌더) — `bg-white p-4 rounded-2xl border-2 border-border`
  2. 아래 큰 카운트다운: `<Progress>` linear bar + `text-2xl font-bold tabular-nums` `9:58` → `0:00`
  3. 만료 ≤ 10초일 때: `text-destructive animate-pulse` + 텍스트 `곧 새 QR로 자동 교체돼요`
  4. 공고 정보 요약 (title + business name)
  5. 안내 텍스트: `Worker가 스캔하면 자동으로 체크아웃돼요`
- Footer: `<Button variant="outline">` `닫기`

**Auto-regenerate:**
- 만료 10초 전 → Server Action `generateCheckoutQrToken(jobId)` 재호출 → QR SVG 교체
- 교체 순간 toast `QR이 새로 생성되었어요` (subtle, no disruption)

**States:**
- Loading: QR 영역 `<Skeleton className="w-[280px] h-[280px]">`
- Ready: QR rendered + countdown
- Regenerating: 외곽에 brand ring pulse
- Error: red alert + 재시도 button

**A11y:**
- `<DialogTitle>` + `<DialogDescription>` 필수
- QR은 decorative — `role="img"` + `aria-label="퇴근 QR 코드"` + 아래에 만료 시각 텍스트 제공
- Countdown: `aria-live="polite"` (매 10초마다만 announce, 초 단위 X)
- Focus trap (Radix 기본) + ESC dismiss → 모달 닫기

---

### Surface 12 — `/my` Web Push 권한 배너 (D-19, D-20)

**Purpose:** Worker `/my` 첫 방문 시 dismissable 배너로 Notification.requestPermission 유도. 강요 X.

**Layout:** `/my` 페이지 상단 히어로 카드 아래, inline card (bottom sheet/toast 아님)
- `<Alert>` (shadcn) 확장 variant "promo"
- Border: `border-brand/30` + background `bg-brand/5`
- Icon: `<Bell>` brand 24px
- Heading: `text-sm font-bold` `알림을 켜고 기회를 놓치지 마세요`
- Body: `text-xs text-muted-foreground` `지원 수락 소식을 바로 받아보실 수 있어요`
- Actions row:
  - Primary: `<Button size="sm">` `알림 켜기`
  - Ghost dismiss: `<Button size="sm" variant="ghost">` `나중에`
- 우상단 `<X>` close icon

**States:**
1. **Hidden** (권한 granted OR dismissed in localStorage OR 브라우저 미지원): 렌더 안 함
2. **Default**: 위 layout
3. **Requesting**: `알림 켜기` 버튼 → `<Loader2>` `권한 요청 중...`
4. **Granted**: 즉시 배너 fade-out + sonner toast `알림이 켜졌어요`
5. **Denied**: 배너 fade-out + 재노출 안 함. `/my/settings`에 재활성 힌트

**Interactions:**
- `알림 켜기` → `Notification.requestPermission()` → granted 시 `navigator.serviceWorker.ready` → `registration.pushManager.subscribe(...)` → Server Action `subscribePush(subscription)` → DB insert
- `나중에` 또는 `<X>`: localStorage `push_banner_dismissed_at = Date.now()` — 재노출 없음
- 권한 이미 `default`가 아닐 때 배너 아예 미렌더

**Copy lock:**
- Heading: `알림을 켜고 기회를 놓치지 마세요`
- Body: `지원 수락 소식을 바로 받아보실 수 있어요`
- Primary: `알림 켜기`
- Secondary: `나중에`
- Success toast: `알림이 켜졌어요`
- Denied 재활성 힌트 (/my/settings): `브라우저에서 알림 권한을 허용한 뒤 다시 방문해주세요`

**A11y:**
- Heading `<h2>`, body `<p>`
- Dismiss button `aria-label="배너 닫기"`
- 배너는 `role="region"` + `aria-labelledby`

---

## Reusable Interaction Primitives

### P1 — Status Badge Component
- Path: `src/components/shared/application-status-badge.tsx`
- Props: `status: ApplicationStatus` → 색 + 라벨 자동 매핑
- shadcn `<Badge>` 기반, 위 6개 상태 × 색 매핑 테이블 준수

### P2 — Auto-accept Timer Badge
- Path: `src/components/biz/auto-accept-timer.tsx`
- Props: `appliedAt: Date` → 매 1초 tick, 분 단위 round
- `<Progress>` + `<Hourglass>` + 텍스트
- 만료 시 자동으로 `수락됨` 배지로 교체 (Realtime이 DB UPDATE 수신 후 React Query invalidate)

### P3 — Realtime Status Dot
- Path: `src/components/shared/realtime-status-dot.tsx`
- Props: `channel: RealtimeChannel`
- subscribe → `SUBSCRIBED`/`CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` → 색 전환
- Tooltip 통합

### P4 — Filter URL Sync Hook
- Path: `src/hooks/use-filter-url-state.ts`
- Manages `?view`, `?date`, `?time`, `?radius` query params
- `shallow: true` 업데이트 (SSR 재실행 X)
- 초기값은 SSR-safe하게 `useSearchParams()` 읽기

### P5 — Korean Formatters
- Path: `src/lib/format.ts` (기존 `formatMoney`, `formatDistance` 확장)
- NEW: `formatRelativeTimeKR(date)` → "방금" / "5분 전" / "3시간 전" / "2026-03-28"
- NEW: `formatDurationKR(seconds)` → "29분" / "1시간 30분"

### P6 — Korean Error Mapper
- Path: `src/lib/error-mapping.ts`
- Server action error code (`application_not_owned`, `job_not_owned`, `geofence_out_of_range`, `qr_expired`, `qr_invalid`, `time_window_past`, `time_window_future`, `capacity_full`, `already_applied`) → 한국어 UX 메시지 + optional distance/minutes 변수

---

## Accessibility Contracts

| 영역 | 요구사항 |
|-----|---------|
| 언어 태그 | `<html lang="ko">` 필수 (root layout — 이미 설정되어 있을 가능성, Phase 4에서 확인) |
| Color contrast | 본문 텍스트 vs 배경 ≥ 4.5:1. `status-pending-fg` on `status-pending-bg` checker 검증 필수 |
| Tap targets | 모든 상호작용 요소 ≥ 44×44 (iOS HIG + Android Material 72dp = 44pt) |
| Focus visible | shadcn 기본 `focus-visible:ring-2 ring-ring ring-offset-2` 유지 |
| Keyboard | 모든 CTA 키보드 접근 가능. 지도 모드 키보드 사용자는 리스트 토글로 fallback |
| Screen reader | Realtime 업데이트, QR 스캔 결과, geofence 상태, 카운트다운 분 단위 → `aria-live="polite"` |
| Reduced motion | `prefers-reduced-motion: reduce` 시 scan line, urgent pulse, marker scale, realtime highlight 비활성 — `@media (prefers-reduced-motion: reduce)` 블록 추가 |
| Form errors | 체크인/체크아웃 에러는 화면 상단 role="alert" 영역에 집중 |
| QR scanner | `aria-live="assertive"` for 결과 변경 + 수동 입력 대체 경로 |
| Countdown | `aria-live="polite"` — 매 10초 또는 1분 단위로만 announce (초 단위 announce 금지, 사용자 피로) |
| Alt text | Kakao 지도 `role="application" aria-label="공고 지도"`, QR 이미지 `role="img" aria-label="퇴근 QR 코드"` |
| 한국어 스크린 리더 | Android NVDA/VoiceOver 한국어 TTS 기준 카피 작성. 영어/약어 피하기 (예: "QR" → "QR 코드" 명시) |

---

## Motion Contract

| 애니메이션 | Duration | Easing | Reduced Motion 대체 |
|-----------|----------|--------|-------------------|
| 지도 모드 전환 | 200ms | `ease-out` | instant |
| Marker hover/select scale | 150ms | `ease-out` | 배경 ring만 (scale 없음) |
| 지원자 카드 Realtime INSERT slide-down | 300ms | `ease-out` | fade-in 100ms only |
| 지원자 카드 Realtime UPDATE highlight | 600ms 1회 | `ease` | subtle bg-muted 300ms fade |
| QR scan line | 1500ms infinite | `ease-in-out` | 정적 box, line 숨김 |
| Urgent pulse (기존) | 1500ms infinite | `ease-in-out` | 정적 (opacity 1 고정) |
| 체크인 confirmed PartyPopper ping | 기존 Tailwind `animate-ping` | — | 숨김 |
| Toast enter (Sonner) | 200ms | `ease-out` | instant |
| QR 만료 임박 (≤10초) pulse | 1s infinite | `ease-in-out` | 색만 destructive 전환 |

**Custom keyframes Phase 4가 `globals.css`에 추가:**
```css
@keyframes scanline {
  0% { transform: translateY(0); }
  50% { transform: translateY(250px); }
  100% { transform: translateY(0); }
}
@keyframes highlight {
  0%, 100% { background-color: transparent; }
  30% { background-color: var(--brand-light); }
}
@keyframes slide-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .animate-urgent, .animate-[scanline_1.5s_ease-in-out_infinite],
  .animate-[highlight_600ms_ease], .animate-[slide-in_300ms_ease] {
    animation: none !important;
  }
}
```

---

## Responsive Breakpoints

Tailwind v4 기본 사용. 주요 surface별 분기:

| Breakpoint | Worker | Biz |
|-----------|--------|-----|
| **Default (mobile)** <640px | `max-w-lg mx-auto px-4`, 모바일 탭바 하단 | `max-w-5xl mx-auto px-4 py-6` |
| **sm:** 640px+ | 동일 (컨테이너 고정) | `px-6` |
| **md:** 768px+ | `/home` 지도 모드는 `max-w-3xl`로 확장 가능, preview는 side Sheet | 사이드바 레이아웃 유지 |
| **lg:** 1024px+ | 변화 없음 (Worker는 모바일-first) | `px-8`, 3-column job detail |

**Surface별 responsive 결정:**
- **Surface 4 (지도)**: 모바일 full-width, preview bottom sheet / md 이상 `max-w-3xl mx-auto` + side sheet right
- **Surface 10 (Biz 지원자)**: 모바일도 열람 가능해야 함 (외근 수락) — `max-w-3xl mx-auto px-4` 모바일 fallback 유지
- **Surface 11 (QR 모달)**: 모바일 fullscreen Dialog / md 이상 `max-w-md` centered Dialog
- **Surface 2-3 (필터 sheet)**: 모바일 `<Sheet side="bottom">` / md 이상 `<Dialog>` centered

---

## Information Architecture (routing lock)

| Route | 타입 | Phase 4 변경 |
|-------|-----|-------------|
| `/home` | Worker SSR | 리스트/지도 토글 + 필터 sheet 추가 (단일 route 유지, view state는 query param) |
| `/posts/[id]` | Public SSR | 변화 없음 |
| `/posts/[id]/apply` | Worker client wrapper | Server Action 호출로 교체 |
| `/my/applications` | Worker SSR | 탭 5개 (pending 추가), Realtime client hydration |
| `/my/applications/[id]` | Worker SSR | 취소 AlertDialog 추가 |
| `/my/applications/[id]/check-in` | Worker client | QR → geofence로 교체 (체크인) |
| `/my/applications/[id]/check-in` (mode=check-out) | Worker client | html5-qrcode 카메라 |
| `/biz/posts/[id]` | Biz SSR | `퇴근 QR 열기` 버튼 + Dialog 추가 |
| `/biz/posts/[id]/applicants` | Biz SSR + Realtime client | 탭 확장 (6개), pending timer badge, 실시간 업데이트 |
| `/my` | Worker SSR | Push 권한 배너 추가 |

**결정:** 지도 토글은 별도 route 아님 — 기존 `/home` 단일 route에서 query param으로 모드 전환. QR 스캐너도 기존 `/my/applications/[id]/check-in`의 `mode=check-out` 내부 state (별도 route 아님) — CONTEXT.md D-25, D-13 준수.

---

## Component Inventory Delta

**Phase 4가 `npx shadcn@latest add`로 추가할 컴포넌트:**

```bash
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add toggle-group
npx shadcn@latest add sonner
npx shadcn@latest add progress
npx shadcn@latest add tooltip
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add scroll-area
```

**NPM 패키지 (shadcn 외):**
```bash
npm i html5-qrcode          # D-14 카메라 QR 스캐너
npm i qrcode @types/qrcode  # D-16 SVG QR 렌더
npm i jose                   # D-15 JWT 서명/검증
npm i web-push               # D-20 Web Push 발송
npm i sonner                 # shadcn 의존성 (shadcn add sonner가 자동 설치할 수 있음)
```

**Phase 4 신규 컴포넌트 파일 (executor가 작성):**

| 파일 | 설명 |
|-----|------|
| `src/components/shared/application-status-badge.tsx` | P1 재사용 배지 |
| `src/components/shared/realtime-status-dot.tsx` | P3 상태 dot + tooltip |
| `src/components/worker/push-permission-banner.tsx` | Surface 12 |
| `src/components/worker/home-filter-sheet.tsx` | Surface 2 + 3 |
| `src/components/worker/home-view-toggle.tsx` | Surface 1 |
| `src/components/worker/map-view.tsx` | Surface 4 Kakao container (client, sync function + useEffect) |
| `src/components/worker/map-marker-pin.tsx` | Custom SVG marker |
| `src/components/worker/map-preview-sheet.tsx` | Surface 4 bottom/side sheet |
| `src/components/worker/geofence-check-card.tsx` | Surface 8 |
| `src/components/worker/qr-scanner.tsx` | Surface 9 (html5-qrcode wrapper) |
| `src/components/worker/applications-realtime.tsx` | Surface 6 client wrapper |
| `src/components/worker/cancel-application-dialog.tsx` | Surface 7 |
| `src/components/biz/applicant-card.tsx` (확장) | Surface 10 |
| `src/components/biz/auto-accept-timer.tsx` | P2 |
| `src/components/biz/applicants-realtime.tsx` | Surface 10 client wrapper |
| `src/components/biz/checkout-qr-modal.tsx` | Surface 11 |
| `src/hooks/use-filter-url-state.ts` | P4 |
| `src/hooks/use-realtime-channel.ts` | 공통 Realtime subscribe + polling fallback |
| `src/hooks/use-geolocation.ts` | 공통 geolocation + permission state |
| `src/lib/error-mapping.ts` | P6 |

**경고:** 모든 client component는 **sync function**이어야 함 (Phase 4 RESEARCH.md pitfall 1045 참조: `"use client"` + `async function` 금지). 비동기 로직은 `useEffect` 또는 React Query mutation 내부로.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| **shadcn official** (ui.shadcn.com) | dialog, sheet, toggle-group, sonner, progress, tooltip, alert, alert-dialog, scroll-area | **not required** — 공식 registry |
| third-party | (none) | — |

**`components.json` 현재 상태 유지:** `"registries": {}` 빈 객체 — Phase 4는 third-party registry 도입 없음. 모든 primitives는 공식 shadcn에서만.

---

## Open Questions Resolved During Research

모두 CONTEXT.md에서 lock된 결정 또는 합리적 default로 해결됨. 추가 유저 질문 없음.

| 후보 질문 | 해결 방법 |
|----------|---------|
| Pending 상태 색 amber/yellow? | **Amber** OKLCH 토큰 신규 추가 — brand(orange-coral)와 충분한 시각적 거리 확보 |
| 자동수락 타이머 표시 형식? | **`{N}분 후 자동 수락` + Progress bar** — 정확한 시각보다 남은 분이 직관적 |
| Map marker icon? | **Custom SVG pin (brand fill)** — CONTEXT discretion "brand 강화 차원에서 custom 권장" 채택 |
| Push 배너 위치? | **`/my` 상단 inline Alert card** — bottom sheet는 dismissable 모호, top banner는 layout shift 발생 |
| Push denied 재노출? | **재노출 금지** + settings 페이지에서 재활성 힌트만 |
| Toast library? | **Sonner** (shadcn 공식 래퍼) — Radix Toast보다 API 간결 |
| QR 모달 크기? | **모바일 fullscreen / desktop max-w-md** — QR 스캔 용이성 최우선 |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: 한국어 카피 전면 lock, 에러 메시지 12개, CTA 10개 — PASS pending
- [ ] Dimension 2 Visuals: 12개 surface 레이아웃, 상태, 애니메이션 명시 — PASS pending
- [ ] Dimension 3 Color: 60/30/10 분포 확정, `--status-pending` 토큰 신규, contrast AA 검증 요구 — PASS pending
- [ ] Dimension 4 Typography: 7단계 scale + Pretendard, 한국어 line-height 1.5 lock — PASS pending
- [ ] Dimension 5 Spacing: Tailwind 기본 스케일 사용, Worker `max-w-lg px-4` / Biz `max-w-5xl px-6` — PASS pending
- [ ] Dimension 6 Registry Safety: shadcn 공식 registry만 사용, third-party 0 — PASS pending
- [ ] Accessibility: `lang="ko"`, `aria-live`, `prefers-reduced-motion`, 44×44 tap target — PASS pending
- [ ] Motion: 8개 애니메이션 + reduced-motion fallback — PASS pending
- [ ] Responsive: 4 breakpoints × 12 surfaces 매트릭스 — PASS pending

**Approval:** pending (gsd-ui-checker 검증 대기)

---

*Researcher: gsd-ui-researcher · Created: 2026-04-10 · Phase 4 · 12 surfaces · 28 locked decisions 상속*
