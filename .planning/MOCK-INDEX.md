# MOCK-INDEX

**Milestone:** v1.1 Ship-Ready
**Purpose:** One-screen view of all mocked scenarios across phases. Add a row here whenever a new MOCK-LOG entry is created.

| Phase | Mocked path | Reason | Target milestone | MOCK-LOG |
|-------|-------------|--------|-----------------|----------|
| 06 — Admin Backoffice | Phase 6 Sc.9: Admin Detail Signed Image Viewing | `business-reg-docs` bucket RLS 미검증 — Phase 7 MIG-02 apply 이전에 실 signed URL 발급 불가 | v1.1 (Phase 7 apply 단계에서 즉시 해소 예정) | [link](phases/06-admin-backoffice/MOCK-LOG.md) |
| 06 — Admin Backoffice | Phase 6 Sc.7: CLOVA OCR Happy-Path Round-Trip | CLOVA_OCR_SECRET 미발급 — 실 API 호출 불가 | v1.2 | [link](phases/06-admin-backoffice/MOCK-LOG.md) |
| 06 — Admin Backoffice | Phase 6 Sc.8: CLOVA OCR Mismatch Graceful Degradation | CLOVA_OCR_SECRET 미발급 — 불일치 경로 실행 불가 | v1.2 | [link](phases/06-admin-backoffice/MOCK-LOG.md) |
