---
phase: 04-db
plan: 04-01-foundation
locked_at: 2026-04-10
source: npm view <pkg> version (registry snapshot)
---

# Phase 4 Dependency Version Lock

이 문서는 Phase 4에서 새로 도입되는 패키지의 설치 시점 버전을 고정 기록합니다. 향후 보안 이슈·회귀 발생 시 rollback 타겟으로 사용되며, `package.json`은 `^` caret 프리픽스로 설치되지만 아래 "locked version"은 설치 당시의 정확한 릴리스입니다.

## Runtime dependencies

| Package | Locked version (2026-04-10) | Purpose | CONTEXT decision |
|---------|-----------------------------|---------|-----------------|
| `jose` | 6.2.2 | Checkout QR JWT HS256 sign/verify (APPLICATION_JWT_SECRET) | D-15 |
| `web-push` | 3.6.7 | VAPID server-side push delivery (서비스 워커 → Worker 브라우저) | D-20 |
| `html5-qrcode` | 2.3.8 | 체크아웃 카메라 QR 스캔 (Worker side) | D-14 |
| `qrcode` | 1.5.4 | 서버 QR SVG 생성 (Business 모달) | D-16 |

## Dev dependencies (TypeScript ambient types)

| Package | Locked version (2026-04-10) | Purpose |
|---------|-----------------------------|---------|
| `@types/web-push` | 3.6.4 | `sendNotification`, `PushSubscription` 타입 |
| `@types/qrcode` | 1.5.6 | `toString`/`toDataURL` 타입 |

## Notes

- `jose@6.2.2`는 이미 `node_modules/`에 transitive dep으로 존재했으나 Phase 4는 top-level dep으로 명시하여 semver 고정 소유권을 확보한다 (`@supabase/auth-js` 등이 간접 참조).
- `html5-qrcode`는 클라이언트 전용 (브라우저 `MediaStream` 의존). 서버 코드에서는 import 금지.
- `qrcode`는 서버·클라이언트 모두 작동하지만 Phase 4에서는 **서버 전용** (`src/lib/qr.ts`) 사용을 유지.
- `@types/html5-qrcode`는 별도 패키지가 없으며, `html5-qrcode`가 `.d.ts`를 self-ship.

## Rollback procedure

```bash
npm install jose@6.2.2 web-push@3.6.7 html5-qrcode@2.3.8 qrcode@1.5.4 --save-exact
npm install -D @types/web-push@3.6.4 @types/qrcode@1.5.6 --save-exact
```

Phase 4 승격 후 semver 범위를 minor/patch까지 확장하려면 이 문서도 함께 업데이트해야 한다.
