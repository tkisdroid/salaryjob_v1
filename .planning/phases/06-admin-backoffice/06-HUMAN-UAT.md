# Phase 6 Human UAT — Stub

**Scaffolded:** 2026-04-13 by planner
**Populated in full:** Plan 06-08 Task 2 (post-execution)

This file will hold 8 manual verification scenarios. Planner scaffolds the structure; executor fills in exact selectors, SQL snippets, and PASS/FAIL boxes after code lands.

## Scenarios (outline)

1. **Admin login + dashboard** — promote dev account to ADMIN via seed SQL; log in; land on /admin; see 3 counter cards.
2. **Admin businesses list search/filter/sort** — ILIKE reg search with dashes matches digit-only storage; cursor pagination stable; URL is source of truth.
3. **Admin business detail + signed image** — reg image viewable via 1h-TTL signed URL; owner info displayed in NNN-NN-NNNNN format.
4. **Admin commission edit** — rate 5.00 persists; empty input resets to env default; zod rejects >100.
5. **Biz signup → auto-verify (D-30)** — regNumber "123-45-67890" → verified badge; DB stores digit-only "1234567890".
6. **Biz createJob without image → redirect (D-31)** — attempt to create a Job without businessRegImageUrl → redirected to /biz/verify; zero Job rows inserted.
7. **OCR happy path** *(requires CLOVA env)* — real 사업자등록증 image with matching regNumber → `ocr:'matched'`, `regNumberOcrMismatched=false`.
8. **OCR mismatch / timeout (D-33 graceful)** *(requires CLOVA env OR network off)* — unrelated image OR aborted fetch → image still saved; mismatched=true OR skipped; non-blocking advisory shown.

## Preconditions (all scenarios)

- `npm run dev` running against a Supabase project that has Phase 6 migrations applied
- Seed data from `prisma/seed.ts` loaded (6 dev accounts)
- For scenarios 7–8: `CLOVA_OCR_SECRET` + `CLOVA_OCR_API_URL` in `.env.local`

## Output

Each scenario will record:
- [ ] PASS / [ ] FAIL
- Observed behavior (if differs from expected)
- DB snapshot (relevant rows at scenario end)
- Screenshots (optional, Korean UI)

## Deferred from automated

Scenarios 3, 7, 8 cannot be fully automated (signed URLs + external API + manual upload). All other scenarios have automated equivalents in `tests/` (see `06-VALIDATION.md`).
