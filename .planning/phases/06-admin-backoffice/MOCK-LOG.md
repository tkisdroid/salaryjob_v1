# MOCK-LOG: Phase 6 — Admin Backoffice

**Phase:** 06 — admin-backoffice
**Template source:** `.planning/templates/MOCK-LOG.md`

<!-- Add one entry block per mocked scenario. Repeat the table below. -->

## Entry: Phase 6 Sc.9 — Admin Detail Signed Image Viewing

| Field | Value |
|-------|-------|
| Mocked path | Phase 6 Scenario 9: Admin views business registration image via signed URL in `/admin/businesses/[id]` |
| Reason | `business-reg-docs` bucket RLS 미검증 — Phase 7 MIG-02 apply 이전에 실 signed URL 발급 불가 |
| Real-key re-verify step | Phase 7 apply 완료 후: Business 계정으로 `/biz/verify` 이미지 업로드 → Admin 계정으로 `/admin/businesses/[id]` 접근 → 이미지 표시 확인 → TTL 3600s 기록 |
| Target milestone | v1.1 (Phase 7 apply 단계에서 즉시 해소 예정) |

## Entry: Phase 6 Sc.7 — CLOVA OCR Happy-Path Round-Trip

| Field | Value |
|-------|-------|
| Mocked path | Phase 6 Scenario 7: CLOVA OCR General API가 사업자등록증 이미지에서 regNumber를 추출하고 `public.business_profiles.regNumberOcrMismatched = false` 저장 |
| Reason | CLOVA_OCR_SECRET 미발급 — 실 API 호출 불가. `src/lib/ocr/clova.ts` graceful-fail 분기(환경변수 없으면 skip) 동작 확인으로 대체 |
| Real-key re-verify step | `CLOVA_OCR_SECRET` / `CLOVA_OCR_API_URL` 설정 후 business-reg-docs 테스트 이미지 업로드 → `/biz/verify` 트리거 → `public.business_profiles.regNumberOcrMismatched` 값 확인 (일치 시 false) |
| Target milestone | v1.2 |

## Entry: Phase 6 Sc.8 — CLOVA OCR Mismatch Graceful Degradation

| Field | Value |
|-------|-------|
| Mocked path | Phase 6 Scenario 8: OCR 추출 regNumber가 저장값과 불일치 → `regNumberOcrMismatched = true` + Admin 검토 플래그 표시 |
| Reason | CLOVA_OCR_SECRET 미발급 — 불일치 경로 실행 불가. Admin 목록의 `regNumberOcrMismatched` 필터가 true 행을 표시하는 UI 코드 확인으로 대체 |
| Real-key re-verify step | CLOVA_OCR_SECRET 설정 후 의도적으로 다른 regNumber가 포함된 이미지 업로드 → `regNumberOcrMismatched = true` 저장 확인 → `/admin/businesses` 필터에서 해당 사업자 표시 확인 |
| Target milestone | v1.2 |
