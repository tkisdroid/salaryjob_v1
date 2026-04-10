---
phase: 02-supabase-prisma-auth
plan: "08"
subsystem: auth-type-safety
gap_closure: true
tags: [type-safety, useActionState, server-actions, plan-02-04-fixup]
dependency_graph:
  requires:
    - "02-04 (auth pages that introduced these bugs)"
    - "02-09 (Phase 1 cleanup that revealed full tsc error count)"
  provides:
    - "tsc baseline reduced from 24 errors → 0 errors"
    - "src/app/(auth)/types.ts (shared AuthFormState)"
key_files:
  created:
    - src/app/(auth)/types.ts
  modified:
    - src/app/(auth)/login/actions.ts
    - src/app/(auth)/signup/actions.ts
    - src/app/(auth)/role-select/actions.ts
metrics:
  duration: "~10 minutes (inline orchestrator execution, no executor agent)"
  completed_date: "2026-04-10"
  files_created: 1
  files_modified: 3
  tsc_errors_before: 24
  tsc_errors_after: 0
  vitest_status: "18/18 green"
---

# Plan 02-08 — Auth Page useActionState Type Fixes

**One-liner:** Fixed 24 tsc errors in plan 02-04's auth Server Actions by aligning signatures with their two distinct calling patterns (`useActionState` vs direct `<form action>`). Phase 2 src/ now type-checks clean.

## Why this plan exists

Plan 02-04 wired the auth UI but never ran `tsc`. The bundled SUMMARY claimed completion, but the auth Server Actions had two contract violations:

1. **`useActionState` consumers** (`signInWithPassword`, `signUpWithPassword`) had signature `(formData: FormData) => state` instead of the required `(prevState: State, formData: FormData) => state`. React's `useActionState` hook expects the prevState argument first.
2. **Direct `<form action>` consumers** (`signInWithGoogle`, `signInWithKakao`, `signInWithMagicLink`, `selectRole`) returned discriminated `{error: {...}} | {success: true}` shapes instead of the required `Promise<void>`. Next.js form actions used directly (without `useActionState`) must either redirect or return nothing.

The two patterns also caused state-narrowing failures in the consuming pages (`state?.error?.form` vs `state?.error?.email` accessed on a discriminated union with no shared keys).

## Strategy

Instead of forcing every action through `useActionState`, accept the two patterns as legitimate and design the contracts accordingly:

| Action | Pattern | Signature |
|--------|---------|-----------|
| `signInWithPassword` | `useActionState` | `(prev, formData) => Promise<AuthFormState>` |
| `signUpWithPassword` | `useActionState` | `(prev, formData) => Promise<AuthFormState>` |
| `signInWithGoogle` | direct `<form action>` | `() => Promise<void>` (redirect on error) |
| `signInWithKakao` | direct `<form action>` | `() => Promise<void>` (redirect on error) |
| `signInWithMagicLink` | direct `<form action>` | `(formData) => Promise<void>` (redirect on error) |
| `selectRole` | direct `<form action>` | `(formData) => Promise<void>` (redirect on error) |

For the `useActionState` group, a single shared `AuthFormState` type with all-optional error keys (`form`, `email`, `password`) makes consumer narrowing work without manual discriminated-union dispatch.

For the direct-action group, errors funnel through `redirect('/auth/error?reason=...')`. The existing `auth/error/page.tsx` from plan 02-04 already handles the `reason` query param.

## What was changed

### NEW: `src/app/(auth)/types.ts`

```ts
export type AuthFormState =
  | {
      error?: {
        form?: string[]
        email?: string[]
        password?: string[]
      }
      success?: boolean
    }
  | null
  | undefined
```

All error fields optional → consumer code `state?.error?.form && ...` narrows correctly regardless of which validation layer (Zod fieldErrors vs Supabase) produced the error.

### `src/app/(auth)/login/actions.ts`

- Added `_prevState: AuthFormState` as first arg to `signInWithPassword`
- Added explicit `Promise<AuthFormState>` return type
- Imported shared type from `../types`
- No logic changes — only signature updates

### `src/app/(auth)/signup/actions.ts`

- `signUpWithPassword`: same signature update as `signInWithPassword`
- `signInWithMagicLink`: removed `{success: true}` return — now redirects to `/auth/check-email` on success and `/auth/error?reason=...` on error
- `signInWithGoogle`: removed `{error: {...}}` return — now redirects to `/auth/error?reason=...` on error
- `signInWithKakao`: same as Google
- All three direct actions now `(): Promise<void>` or `(formData): Promise<void>`

### `src/app/(auth)/role-select/actions.ts`

- `selectRole`: changed `(formData: FormData)` returning `{error: 'invalid_role'}` to `Promise<void>` redirecting to `/auth/error?reason=invalid_role` on validation failure
- TypeScript narrows `parsed.data` correctly after the redirect (Next.js `redirect()` is typed `() => never`)

## Verification

```bash
$ npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "^src/" | wc -l
0

$ npx vitest run
Test Files  9 passed (9)
     Tests  18 passed (18)
```

All Phase 2 test stubs continue to pass:
- DATA-02 PostGIS, DATA-03 migrations, DATA-04 seed (6 tests)
- AUTH-01 signup, AUTH-01g google, AUTH-01k kakao, AUTH-01m magic-link, AUTH-02 role-select
- AUTH-05 proxy redirect (2 tests)

## What this DOES NOT change

- No visual changes to login/signup/role-select pages (consumer code requires zero edits — the AuthFormState shape was designed to match the page code's existing access patterns)
- No changes to OAuth provider config (Google/Kakao still need credentials in Supabase Dashboard before login actually works against real providers)
- No new tests added (existing AUTH-01* tests already cover these actions; they pass against the corrected signatures)

## Pages NOT touched (they already worked)

- `src/app/(auth)/login/page.tsx` — `useActionState(signInWithPassword, null)` now type-checks because the action accepts `(prevState, formData)`. State narrowing on `state?.error?.form` works because the AuthFormState shape has `form` as an optional key.
- `src/app/(auth)/signup/page.tsx` — same reasoning for `useActionState(signUpWithPassword, null)`
- `src/app/(auth)/role-select/page.tsx` — `<form action={selectRole}>` works because `selectRole` is now `(formData) => Promise<void>`

## Self-Check: PASSED

- [x] tsc --noEmit --skipLibCheck → 0 errors in src/
- [x] vitest run → 18/18 tests green
- [x] No new files except types.ts
- [x] No visual page changes
- [x] All Phase 2 auth tests still pass against corrected signatures
- [x] Direct form actions all return Promise<void> as Next.js requires
- [x] useActionState consumers all match (prevState, formData) => state contract
