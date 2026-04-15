# .planning

`.planning/` 는 GSD 워크플로 planning artifact 루트. 밀스톤 스냅샷 / 페이즈별 산출물 / 공용 템플릿을 보관한다.

- `ROADMAP.md` / `STATE.md` / `REQUIREMENTS.md` / `PROJECT.md` — 밀스톤 레벨 진실의 소스
- `phases/<phase>/` — 페이즈별 CONTEXT / RESEARCH / PATTERNS / PLAN / SUMMARY
- `templates/` — 공용 템플릿 (예: `MOCK-LOG.md`)
- `MOCK-INDEX.md` — 밀스톤 전체 mocked 시나리오 집계 인덱스

## MOCK 정책 및 템플릿 사용법

MOCK-LOG 은 외부 API 키(CLOVA OCR, 결제 등) 없이 완료할 수 없는 시나리오를 기록하는 문서다. v1.1 은 "ship-ready" 밀스톤이므로 실 키 없이 진행 불가한 경로는 mock 한 뒤 재검증 단계를 명시적으로 남긴다.

**필수 4필드 (D-50):**

- **Mocked path** — 시나리오 이름 + 무엇을 mock했는지
- **Reason** — 외부 의존성이 없어 mock한 이유
- **Real-key re-verify step** — 실 키 확보 후 실행할 구체적 명령/단계
- **Target milestone** — v1.2 또는 v2

표준 템플릿 위치: `.planning/templates/MOCK-LOG.md`

**사용 절차:**

1. `.planning/templates/MOCK-LOG.md` 를 복사
2. `.planning/phases/<phase>/MOCK-LOG.md` 로 복제
3. `## Entry:` 블록마다 4필드를 모두 채움
4. `.planning/MOCK-INDEX.md` 에 한 행 추가 (Phase / Mocked path / Reason / Target milestone / MOCK-LOG 링크)

**언제 항목을 만드는가:** ROADMAP §"MOCK Policy" 인용 — "외부 API 키(CLOVA OCR, 결제 등) 없이 완료 불가한 시나리오" 는 MOCK-LOG 항목이 필요하다.
