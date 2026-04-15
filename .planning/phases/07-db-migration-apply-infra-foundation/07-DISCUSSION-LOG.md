# Phase 7: DB Migration Apply & Infra Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `07-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 07-db-migration-apply-infra-foundation
**Areas discussed:** Admin seed 실행 방식, CLOVA_OCR_SECRET 문서 위치·형식, MOCK-LOG.md 템플릿 위치·형식, Supabase 네트워크 미접근 시 대응

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Admin seed 실행 방식 | SQL 주석 해제 vs SQL editor 직접 vs 새 seed 스크립트 | ✓ |
| CLOVA_OCR_SECRET 문서 위치·형식 | docs/ 신규 vs README 섹션 vs .env.example 주석 | ✓ |
| MOCK-LOG.md 템플릿 위치·형식 | per-phase + index vs per-phase만 vs 단일 파일 | ✓ |
| Supabase 네트워크 미접근 시 대응 | prep/apply 분리 vs hard block vs 로컬 postgres MOCK | ✓ |

**User's choice:** 4개 영역 모두 논의.

---

## Admin seed 실행 방식

### Q1. Admin 시드를 어떻게 적용할 것인가요?

| Option | Description | Selected |
|--------|-------------|----------|
| SQL 파일 UPDATE 주석 해제 + commit + script 돌림 (Recommended) | 재현 가능·증적 보존. 단점: git에 개발 이메일 노출. | ✓ |
| Supabase SQL editor 직접 실행 (tracker skip) | git 노출 회피. 단점: 재현성 없음. | |
| 별도 seed 스크립트(scripts/seed-admin.ts) 신규 작성 | 환경 변수 기반. 단점: 스코프 증가. | |

**User's choice:** Recommended — SQL 파일 주석 해제 + commit + script 실행.
**Notes:** v1.1 은 단일 개발자 + dev 환경 범위이므로 재현성이 우선.

### Q2. 현재 dev 환경에서 admin으로 승격할 계정은?

| Option | Description | Selected |
|--------|-------------|----------|
| admin@gignow.kr 새로 생성 | SQL 기본값 그대로. Supabase Auth dashboard 선행. | |
| 기존 dev 계정 승격 (Recommended) | 이미 사용 중인 계정 1개 ADMIN 으로. | ✓ |

**User's choice:** 기존 dev 계정 승격.
**Notes:** execute 단계에서 이메일을 1회 질문하여 SQL placeholder 치환.

### Q3. prod 환경에서는 Admin seed를 어떻게 취급?

| Option | Description | Selected |
|--------|-------------|----------|
| v1.1은 dev만 승격, prod는 v1.2로 이월 (Recommended) | ops 프로세스 분리. | ✓ |
| 동일 스크립트를 prod에도 적용 가능하도록 문서화 | 위험 증가. | |

**User's choice:** v1.1은 dev 만, prod 는 v1.2 이월.

---

## CLOVA_OCR_SECRET 문서 위치·형식

### Q1. CLOVA_OCR_SECRET 발급 절차를 어디에 문서화할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| docs/external-keys.md 새로 생성 (Recommended) | 외부 키 전용 디렉터리 신설. | ✓ |
| README.md에 "External Keys" 섹션 추가 | 단일 진입점. README 비대화. | |
| .env.example 주석에만 절차 축약 기재 | 이미 URL 링크 존재. 5분 절차에 불충분. | |

**User's choice:** docs/external-keys.md 신규 생성.

### Q2. 문서 형식은 어떤 형태?

| Option | Description | Selected |
|--------|-------------|----------|
| 단계별 체크리스트 (텍스트만) (Recommended) | 간결·유지관리 쉬움. | ✓ |
| 스크린샷 포함 상세 가이드 | 신규 개발자 친화. NCP UI 변경 시 stale. | |
| 도메인 + 키 필드 설명만 (FAQ-style) | 공식 문서 링크 위임. | |

**User's choice:** 단계별 텍스트 체크리스트.

---

## MOCK-LOG.md 템플릿 위치·형식

### Q1. MOCK-LOG.md 템플릿과 인덱스 구조는?

| Option | Description | Selected |
|--------|-------------|----------|
| per-phase 파일 + 밀스톤 루트 인덱스 (Recommended) | per-phase 기록 + 한눈 요약. | ✓ |
| per-phase 파일만 (인덱스 없음) | 가장 간단. `find` 명령 의존. | |
| 밀스톤 루트 단일 파일만 | 모든 phase 누적. 맥락 상실. | |

**User's choice:** per-phase + 루트 인덱스.

### Q2. MOCK-LOG 필수 필드는?

| Option | Description | Selected |
|--------|-------------|----------|
| 4필드만 경량하게 (Recommended) | ROADMAP 명시 4필드 준수. | ✓ |
| 4필드 + date + owner + PR link 추가 | 추적성 ↑, 단일 개발자 과잉. | |
| 4필드 + 검증 네거티브 테스트 예상 결과 | 테스트 관점 1줄 추가. | |

**User's choice:** 4필드 경량 유지(자유 텍스트로 컨텍스트 덧붙임 허용).

### Q3. 템플릿 어디에 두고 어떻게 복제할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| .planning/templates/MOCK-LOG.md + 사용법 README 업데이트 (Recommended) | 단일 소스 + 사용법 1쪽. | ✓ |
| 기존 Phase 6 MOCK-LOG 가 있으면 이것을 표준으로 승격 | 기존 채용 — 현재 Phase 6 MOCK-LOG 미존재 확인. | |

**User's choice:** `.planning/templates/MOCK-LOG.md` + `.planning/README.md` 정책 섹션.

---

## Supabase 네트워크 미접근 시 대응

### Q1. Phase 7 plan 실행 때 Supabase 네트워크 접근 불가 상황은 어떻게 대응?

| Option | Description | Selected |
|--------|-------------|----------|
| plan을 'prep' 단계와 'apply' 단계로 분리 (Recommended) | 네트워크 무관 작업 선행 가능. | ✓ |
| 전체 Phase 7 을 네트워크 환경에서만 실행 (hard block) | 대기 시간 발생. | |
| 로컬 postgres 로 migration 적용 MOCK | Success Criteria 위배. | |

**User's choice:** prep / apply 단계 분리. close 기준은 apply 성공.

### Q2. 마이그레이션 적용 성공 증거는 어디에 남길까요?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 7 VERIFICATION.md 에 command 출력 원본 첨부 (Recommended) | 재현성 + 심사 가능. PII 마스킹. | ✓ |
| 명령어 요약 + PASS/FAIL 체크리스트만 | 경량. 검증 약함. | |
| 스크린샷 + Supabase dashboard 캡처 | 시각적. 리포 용량 ↑. | |

**User's choice:** VERIFICATION.md 에 command 출력 원본(민감값 마스킹).

---

## Claude's Discretion

- drift 감지 시 복구 절차 세부 — 발견 시점에 `/gsd-debug` 분기
- `.planning/README.md` 섹션 배치 구조 — Claude 결정
- `.planning/MOCK-INDEX.md` 정확한 컬럼 포맷 — Claude 결정
- Signed URL TTL 측정 커맨드 형태 — executor 판단

## Deferred Ideas

- Prod Admin 프로비저닝 정책 → v1.2 ops
- 외부 키 가이드의 스크린샷 버전 → v1.2+
- MOCK-LOG 4필드 자동 검증 CI → v1.2
- `.planning/README.md` 전면 개편 → 별도 문서 phase
</content>
</invoke>
