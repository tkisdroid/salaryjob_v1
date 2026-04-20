# 샐러리잡 디자인 철학 (Salaryjob Design Philosophy)

> 메인 페이지 및 구직자 앱 10개 화면에 적용된 디자인 시스템 — 다른 페이지 리디자인 작업 시 이 문서를 참고하면 일관된 시각 언어를 유지할 수 있다.

---

## 1. 디자인 철학 한 줄 요약

**"Neo-bank의 구조적 명료함 × 동네 일자리의 신선함."**

- 구인구직 사이트의 정보 홍수형 레이아웃을 버린다.
- 핀테크 앱(Revolut, Cash App, 토스)의 **다크 프라이머리 CTA + pill chip + rounded list + heavy radius** 구조를 뼈대로 삼는다.
- 그 위에 **민트 그린 + 라임**의 '동네 마켓' 온도를 얹어, "가깝고 믿을 수 있는 생활 서비스"의 첫인상을 만든다.

---

## 2. 핵심 원칙 (Core Principles)

### 2.1 다크가 1차, 그린은 악센트
- **Primary CTA, 발신 메시지 버블, 활성 네비 탭, 강조 배지 = 잉크 블랙 (`--ink`).**
- **브랜드 그린은 "성공/상태/강조" 용도의 악센트**로 역할을 재배치 — 기본 CTA에 초록 칠을 하지 않는다.
- 그린은 주로 status dot, 체크 아이콘, 히어로 카드 배경, hover highlight에 사용.

### 2.2 Radius는 두 축으로 구분
- **컨테이너(카드·모달·셀)**: `r-md(18)` ~ `r-xl(32)`.
- **인터랙션 요소(버튼·칩·토글·탭·발신 버블)**: `r-pill(999px)`.
- 이 규칙을 지키면 Revolut/Cash App 톤이 자연스럽게 나온다.

### 2.3 Pill Chip이 필터·태그의 기본형
- 모든 필터, 카테고리, 태그, 세그먼트 탭은 **pill chip**.
- 비활성 = 흰색 + 1px 보더. 활성 = 잉크 블랙 fill + 흰 텍스트.
- 일부 칩은 우측에 작은 `X` (닫기) — outline 스타일의 reference 감성 직접 반영.

### 2.4 List Row는 "카드" 대신 "행"
- 리스트 아이템은 두꺼운 카드가 아니라 **16–18px radius + 얇은 border-soft divider**로 구분되는 행.
- 메타데이터는 `tabular-nums`로 정렬, 금액은 오른쪽 `brand-deep`.

### 2.5 정보 위계는 "소리" 아닌 "여백"
- 색으로 소리치지 않는다. **여백과 무게 차이**로 위계를 만든다.
- 본문 `--text-muted`, 제목 `--ink`, 보조 `--text-subtle`. 3단 톤만 엄격히 사용.

### 2.6 제로 슬롭
- 아이콘·배지·통계를 장식으로 남발하지 않는다. 모든 요소는 근거가 있어야 한다.
- 실제 데이터가 없으면 **placeholder가 낫지, 가짜 값을 만들지 않는다**.
- 이모지는 브랜드 이모티콘(`celery.svg`, 업종 이모지 등)에만 제한적으로 사용.

---

## 3. 컬러 토큰 (Color Tokens)

```css
:root {
  /* Brand — 민트 그린 팔레트 (salaryjob_v1 유지) */
  --brand:        oklch(0.776 0.149 152);  /* 메인 그린 */
  --brand-light:  oklch(0.978 0.027 151);  /* 민트 배경 */
  --brand-dark:   oklch(0.675 0.153 153);  /* hover, gradient bottom */
  --brand-deep:   oklch(0.518 0.128 152);  /* 다크 그린 텍스트/금액 */

  /* Lime — 라임 악센트 (pill, dot, highlight) */
  --lime-accent:  oklch(0.871 0.090 115);  /* 파스텔 라임 */
  --lime-chip:    oklch(0.905 0.135 120);  /* 진한 라임 칩 bg */
  --lime-chip-fg: oklch(0.35  0.09  135);  /* 라임 칩 fg */

  /* Ink — neobank signature (1차 액션 컬러) */
  --ink:          oklch(0.18 0.009 160);
  --ink-soft:     oklch(0.26 0.012 160);

  /* Surface */
  --bg:          oklch(0.988 0.006 120);   /* 페이지 배경 (살짝 그린 틴트) */
  --surface:     #ffffff;                  /* 카드 */
  --surface-2:   oklch(0.975 0.006 140);   /* 레일/서브 배경 */
  --border:      oklch(0.925 0.008 150);
  --border-soft: oklch(0.955 0.006 150);

  /* Text */
  --text:        oklch(0.18 0.009 160);   /* 본문 */
  --text-muted:  oklch(0.50 0.012 155);   /* 보조 */
  --text-subtle: oklch(0.62 0.010 155);   /* 3차 */
}
```

### 컬러 역할 매핑

| 역할 | 토큰 | 예시 |
|---|---|---|
| Primary CTA, 활성 탭, 발신 버블 | `--ink` | "시작하기", "체크인 완료", 하단 nav 활성 |
| 성공/상태/뱃지 | `--brand` + `--brand-deep` | 모집중 dot, 평점, 금액 강조 |
| 페이지 배경 | `--bg` | body |
| 카드/폼 | `--surface` | job card, form field |
| 악센트(희소) | `--lime-chip` | "+수수료 0%" pill, AI 추천 뱃지 |
| 히어로 카드 (예외) | `--brand` gradient | 수입 카드, 최종 CTA band |

> **규칙**: 한 화면에 `--brand` gradient 히어로는 최대 1개. 나머지는 흰 카드 + ink/muted 텍스트로 정보 전달.

---

## 4. 타이포그래피 (Typography)

- **Primary**: `Pretendard` (weight 400–800)
- **Numeric**: `Inter` (숫자·라벨 보조)
- **항상** `word-break: keep-all; overflow-wrap: break-word;` — 한글 단어 단위 줄바꿈.
- **숫자는 항상** `font-variant-numeric: tabular-nums;` (`.tabnum` 유틸).
- **letter-spacing**: 제목 `-0.035em`, 본문 `-0.02em`, 라벨 `-0.01em`.

### 스케일

| 용도 | size | weight | letter-spacing |
|---|---|---|---|
| Hero H1 | `clamp(32, 4vw, 48)` | 800 | -0.035em |
| Section H2 | 28 | 800 | -0.035em |
| Card Title | 16–18 | 800 | -0.02em |
| Body | 14–15 | 500–600 | -0.02em |
| Meta/Label | 11–12 | 700 | 0.08em (uppercase) / -0.01em |
| Income Amount | 44 | 800 | -0.045em |

---

## 5. 반경 · 간격 · 그림자 (Radius · Spacing · Shadow)

```css
--r-pill: 999px;   /* 버튼·칩·토글·발신 버블·닫기X */
--r-sm:   12px;    /* 작은 아이콘 컨테이너, 배지 */
--r-md:   18px;    /* 리스트 셀, 폼 필드 */
--r-lg:   24px;    /* 카드, 모달 */
--r-xl:   32px;    /* 히어로, 큰 이미지 영역 */

/* 그림자는 옅게, 아래로만 */
--shadow-sm:    0 1px 2px   oklch(0.2 0.02 160 / 0.04);
--shadow-md:    0 8px 24px  oklch(0.2 0.02 160 / 0.06);
--shadow-lg:    0 24px 48px oklch(0.2 0.02 160 / 0.08);
--shadow-dark:  0 10px 28px oklch(0.18 0.009 160 / 0.20);  /* ink CTA hover */
--shadow-brand: 0 10px 28px oklch(0.776 0.149 152 / 0.28); /* brand CTA hover */
```

- 일반 카드는 **`--shadow-sm` 또는 shadow 없음 + border**. glow는 쓰지 않는다.
- hero gradient 카드만 `--shadow-brand`로 띄운다.

---

## 6. 컴포넌트 패턴 (Component Patterns)

### 6.1 Buttons

```
Primary:  bg=ink, fg=#fff, r-pill        ← 기본 CTA
Brand:    bg=brand, fg=ink, r-pill       ← 사업자 섹션 등 예외적 CTA
Ghost:    bg=surface, border=border      ← 보조
Text:     transparent, hover=surface-2   ← 링크형
```
- **sm**: 8×14, 13px / **md**: 10×18, 14px / **lg**: 16×26, 15px / **xl**: 20×32, 16px.
- `display:inline-flex; align-items:center; gap:8px`로 아이콘 정렬.

### 6.2 Pill Chip

```
.chip (비활성) = surface + 1px border + ink text
.chip.active  = ink fill + #fff + ink border
.chip .x      = 우측 16×16 원형 close, 옵션
```

### 6.3 Card

```
.card = surface + 1px border + r-md/lg + padding 22–24
```
- 카드 안에 카드를 넣지 않는다. 내부는 row + divider로 해결.

### 6.4 Section Label

```html
<div class="sec-label">
  <span class="mark">🌱(celery icon)</span> 내 주변 공고
</div>
```
- 왼쪽에 작은 brand-deep 아이콘 + ink 제목. 필요 시 우측에 "더보기" text-btn.

### 6.5 Income Hero (브랜드 시그니처)

- `brand → brand-dark` linear gradient + 우상단 `lime-accent` radial glow.
- 상단 좌: `pill-ink` 라벨. 상단 우: `ink` 사각 아이콘 버튼 (`lime-accent` 아이콘).
- 중앙: 44px 금액 + 30px 원화 기호.
- 하단: 3-stat grid, 세로 divider = `ink 12% alpha`.

### 6.6 Bottom Nav (앱)

- 폰 앱 화면 하단 고정, r-pill 바. 활성 아이콘은 ink 원 + lime 점 포인트.

### 6.7 Phone Frame

- `384 × 820`, radius 54, padding 9, ink bezel.
- 내부 screen r=46, `--bg` 배경.
- `.dynamic-island` 118×33, top 12, 중앙 정렬.

---

## 7. 로고 (Logo)

### 형태
- **대각선 샐러리 줄기** — 좌하→우상 방향, 둥근 사각형 캡슐(r:1.2 on viewBox 24).
- **잎사귀 1장** — 위쪽에 각진 다이아몬드형(4점).
- **C-노치** — 우측 끝 단면, 작은 라임 사각으로 표현.
- 바탕은 **흰색 r:12 + 1.5px 보더** (검정 칠 X).

### 워드마크
- `샐러리잡` + 뒤에 5×5 brand dot (baseline 살짝 위로 translateY(-1px)).
- 서브라인: `우리 동네 · 신선한 일자리` (10.5px, muted, letter-spacing -0.01em).

### 금지
- 캐릭터 일러스트, 3D, gradient 로고, 알약형(이전 시도 폐기).

---

## 8. 레이아웃 규칙

### 랜딩 (Main Page)
1. **Top bar** 72px: 로고락 · 3-link nav · login/cta.
2. **Hero** — eyebrow chip + 48px H1 + ghost+primary CTA 2개 + trust row.
3. **Feature grid** — 카드 3–4개, 각 r-lg + 하단에 얇은 divider.
4. **How it works** — 3–4 step, 번호 배지(ink 8px) + text.
5. **Live feed** — 실제 공고 예시 3개 + 전체보기 primary CTA.
6. **Business band** — 예외적 다크 섹션 (ink bg, brand CTA).
7. **Final CTA** — 샐러리 잎 이미지 + xl primary CTA.
8. **Footer** — 로고 + 링크 + 법적 고지.

### 구직자 앱 (Mobile)
- 홈: 인사 → 수입 hero → 카테고리(6-grid) → 내 주변 공고(view toggle + 3 filter group + list).
- 탐색: 타이틀 → 검색 인풋 → list/tag/map 3-way → 필터 → 결과.
- 시간 등록: 타이틀 → 주간 그리드(월~일 × 00-23, 심야 divider) → 등록 리스트 → 요약.
- 채팅 리스트: 타이틀 + unread count → 행 리스트(미읽음만 brand tint + lime avatar).
- 채팅 상세: 업체 헤더 → 버블(수신=surface / 발신=ink r-pill) → 플로팅 composer.
- MY: 타이틀 → 알림 프롬프트 → 프로필 카드 → 확정 근무(QR) → 메뉴 리스트.
- 하단: bottom nav 고정.

---

## 9. 인터랙션·모션

- 기본 transition: `0.18s ease` (색), `0.2s ease` (transform).
- 버튼 active: `translateY(1px)`.
- 카테고리 아이콘 hover: `translateY(-2px) + border-color ink`.
- 로고 hover: `rotate(-6deg)`.
- 큰 모션·flash·bouncy spring 없음 — 핀테크다운 침착함.

---

## 10. 작성자·에디터가 지켜야 할 체크리스트

작업 전 확인:

- [ ] 메인 CTA는 **ink 블랙**인가? (브랜드 그린 fill 아님)
- [ ] 필터는 **pill chip**인가? (사각 탭 아님)
- [ ] 리스트는 **얇은 divider row**인가? (두꺼운 카드 연속 아님)
- [ ] 숫자에 **tabular-nums** 적용? (정렬 흔들림 없어야)
- [ ] 이모지·아이콘이 **정보를 전달**하는가? (장식이면 제거)
- [ ] 히어로 gradient 카드는 **화면당 1개 이하**?
- [ ] 한 화면 font size 레벨은 **5개 이하**?
- [ ] `word-break: keep-all` 적용되어 한글이 중간에 끊기지 않는가?
- [ ] 하단 CTA는 safe-area 고려한 padding(80–120px bottom)?

---

## 11. 금지 사항 (Don't)

- ❌ 그린 fill CTA + 흰 글씨 (구인구직 톤으로 회귀)
- ❌ 카드 좌측 색띠(border-left accent) — AI slop 트롭
- ❌ 과한 gradient 배경 (body 배경은 subtle radial tint만 허용)
- ❌ 글래스모피즘, 3D, 두꺼운 drop shadow
- ❌ 1개 화면에 다른 radius 스케일 혼재 (r-lg와 r-sm은 공존 OK, 20/22/26/28 섞지 말 것 — 토큰만 사용)
- ❌ `Inter`/`Roboto`/시스템 폰트를 한글 본문에 쓰기 (Pretendard 고정)
- ❌ 이모지 남발. 브랜드 레퍼런스용 외에 신호용으로만.
- ❌ 12px 미만 텍스트 (모바일은 11px 최소, 데스크탑은 12px)
- ❌ 아이콘 + 라벨 hit area가 44px 미만 (모바일)

---

## 12. 참고 파일 (Reference Files)

현 프로젝트에서 이 시스템이 적용된 파일:

- `Main Page Premium.html` — 랜딩 기준 구현.
- `Worker Home Premium.html` — 구직자 앱 Part 1 (Home / Explore / Time / Chat / MY).
- `Worker Screens Part 2.html` — 구직자 앱 Part 2 (Detail / Apply / Check-in / AI / Profile Edit).
- `worker-styles.css` — 공유 CSS 토큰·컴포넌트 구현체.
- `00-Index.html` ~ `10-Profile-Edit.html` — 화면별 분할 페이지.

**리디자인 시 워크플로**: 위 파일들에서 가장 유사한 화면을 먼저 열어 토큰·컴포넌트를 lift → 새 화면에 붙여넣고 내용만 교체. 새 토큰·컴포넌트를 만들기 전에 항상 기존 자산을 먼저 조사한다.
