/**
 * tests/review/routes/manifest.ts
 *
 * D-14 schema: every one of the 54 routes discovered from `src/app/**\/page.tsx`
 * is enumerated here with a route-specific content assertion (D-11c + D-22 —
 * NEVER generic "GigNow" or "로딩") and a primary CTA selector (D-13 probe target).
 *
 * Dynamic segments are substituted with fixture UUIDs from tests/review/fixtures/ids.ts
 * so the manifest remains deterministic and collision-free with the seed.
 *
 * Self-check at module bottom: discoverRoutes() must not find any route missing
 * from this manifest (runs when REVIEW_MANIFEST_SELFCHECK=1).
 */

import { JOB_IDS, APPLICATION_IDS, BIZ_IDS } from "../fixtures/ids";
import { discoverRoutes } from "./discover";

export type ReviewSeedAs = "worker" | "biz" | "admin" | "anon";

export type ReviewRoute = {
  path: string;
  desktopOk: boolean;
  mobileOk: boolean;
  contentAssertion: string | RegExp;
  primaryCta: string;
  seedAs: ReviewSeedAs;
};

// Fixture-substituted IDs (D-10 dynamic segment filling)
const JOB_ID = JOB_IDS[0]!;
const APP_ID = APPLICATION_IDS[0]!;
const COMPLETED_APP_ID = APPLICATION_IDS[3]!; // completed app — has review/checkin targets
const APPLICANT_ID = BIZ_IDS.verified;
const CHAT_ID = JOB_IDS[1]!;

export const ROUTES: readonly ReviewRoute[] = [
  // ---------- Public / landing ----------
  {
    path: "/",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /긱나우|GigNow|탐색|시작하기/i,
    primaryCta: 'a[href="/login"], a[href="/home"], a[href="/signup"]',
    seedAs: "anon",
  },
  {
    path: "/login",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /로그인|이메일/,
    primaryCta: 'button[type="submit"]',
    seedAs: "anon",
  },
  {
    path: "/signup",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /회원가입|가입/,
    primaryCta: 'button[type="submit"]',
    seedAs: "anon",
  },
  {
    path: "/role-select",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /역할|근무자|사업자/,
    primaryCta: 'button, a[href*="/home"], a[href*="/biz"]',
    seedAs: "anon",
  },
  {
    path: "/auth/check-email",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /이메일을 확인|인증 메일|메일을 보냈/,
    primaryCta: "a, button",
    seedAs: "anon",
  },
  {
    path: "/auth/error",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /오류|에러|다시 시도/,
    primaryCta: 'a[href="/login"], button',
    seedAs: "anon",
  },
  {
    path: "/privacy",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /개인정보|처리방침/,
    primaryCta: "a, button",
    seedAs: "anon",
  },
  {
    path: "/terms",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /이용약관|서비스 약관/,
    primaryCta: "a, button",
    seedAs: "anon",
  },
  {
    path: "/licenses",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /라이선스|오픈소스|license/i,
    primaryCta: "a, button",
    seedAs: "anon",
  },
  {
    path: "/design-index",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /디자인|design|index/i,
    primaryCta: "a, button",
    seedAs: "anon",
  },

  // ---------- Worker (authenticated) ----------
  {
    path: "/home",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /탐색|추천|알바|공고/,
    primaryCta: 'a[href^="/posts/"], a[href^="/explore"]',
    seedAs: "worker",
  },
  {
    path: "/explore",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /탐색|지역|필터/,
    primaryCta: 'a[href^="/posts/"], button',
    seedAs: "worker",
  },
  {
    path: "/search",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /검색|키워드/,
    primaryCta: 'input[type="search"], button[type="submit"]',
    seedAs: "worker",
  },
  {
    path: "/notifications",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /알림/,
    primaryCta: "button, a",
    seedAs: "worker",
  },
  {
    path: "/my",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /마이|내 정보|프로필/,
    primaryCta: 'a[href^="/my/"]',
    seedAs: "worker",
  },
  {
    path: "/my/applications",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /지원|신청/,
    primaryCta: 'a[href^="/my/applications/"]',
    seedAs: "worker",
  },
  {
    path: `/my/applications/${APP_ID}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /지원 상세|내역|상태/,
    primaryCta: "button, a",
    seedAs: "worker",
  },
  {
    path: `/my/applications/${COMPLETED_APP_ID}/check-in`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /체크인|출근|QR/,
    primaryCta: "button",
    seedAs: "worker",
  },
  {
    path: `/my/applications/${COMPLETED_APP_ID}/review`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /리뷰|평가|후기/,
    primaryCta: 'button[type="submit"]',
    seedAs: "worker",
  },
  {
    path: "/my/availability",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /가능 시간|스케줄|가능시간/,
    primaryCta: "button",
    seedAs: "worker",
  },
  {
    path: "/my/favorites",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /즐겨찾기|찜/,
    primaryCta: "button, a",
    seedAs: "worker",
  },
  {
    path: "/my/profile",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /프로필|내 정보/,
    primaryCta: 'a[href="/my/profile/edit"], button',
    seedAs: "worker",
  },
  {
    path: "/my/profile/edit",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /수정|저장|편집/,
    primaryCta: 'button[type="submit"]',
    seedAs: "worker",
  },
  {
    path: "/my/schedule",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /일정|스케줄|근무/,
    primaryCta: "button, a",
    seedAs: "worker",
  },
  {
    path: "/my/settings",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /설정|알림|계정/,
    primaryCta: "button, a",
    seedAs: "worker",
  },
  {
    path: "/my/settlements",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /정산|수익/,
    primaryCta: "button, a",
    seedAs: "worker",
  },
  {
    path: `/posts/${JOB_ID}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /공고|급여|근무|지원하기/,
    primaryCta: 'a[href*="/apply"], button',
    seedAs: "worker",
  },
  {
    path: `/posts/${JOB_ID}/apply`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /지원|확정|신청/,
    primaryCta: 'button[type="submit"]',
    seedAs: "worker",
  },
  {
    path: "/chat",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /채팅|메시지|대화/,
    primaryCta: "a, button",
    seedAs: "worker",
  },
  {
    path: `/chat/${CHAT_ID}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /채팅|메시지|입력/,
    primaryCta: 'button[type="submit"], textarea',
    seedAs: "worker",
  },

  // ---------- Business (authenticated) ----------
  {
    path: "/biz",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /대시보드|사업자|공고/,
    primaryCta: 'a[href^="/biz/"]',
    seedAs: "biz",
  },
  {
    path: "/biz/posts",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /공고 목록|내 공고|새 공고/,
    primaryCta: 'a[href="/biz/posts/new"], button',
    seedAs: "biz",
  },
  {
    path: "/biz/posts/new",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /새 공고|공고 등록|작성/,
    primaryCta: 'button[type="submit"]',
    seedAs: "biz",
  },
  {
    path: `/biz/posts/${JOB_ID}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /공고 상세|지원자|편집/,
    primaryCta: 'a[href*="/edit"], a[href*="/applicants"], button',
    seedAs: "biz",
  },
  {
    path: `/biz/posts/${JOB_ID}/edit`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /공고 수정|편집|저장/,
    primaryCta: 'button[type="submit"]',
    seedAs: "biz",
  },
  {
    path: `/biz/posts/${JOB_ID}/applicants`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /지원자|신청자|확정/,
    primaryCta: 'a[href*="/applicants/"], button',
    seedAs: "biz",
  },
  {
    path: `/biz/posts/${JOB_ID}/applicants/${APPLICANT_ID}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /지원자 상세|프로필|승인|거절/,
    primaryCta: "button",
    seedAs: "biz",
  },
  {
    path: `/biz/posts/${JOB_ID}/applicants/${APPLICANT_ID}/review`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /리뷰|평가|후기/,
    primaryCta: 'button[type="submit"]',
    seedAs: "biz",
  },
  {
    path: "/biz/chat",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /채팅|메시지|대화/,
    primaryCta: "a, button",
    seedAs: "biz",
  },
  {
    path: `/biz/chat/${CHAT_ID}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /채팅|메시지|입력/,
    primaryCta: 'button[type="submit"], textarea',
    seedAs: "biz",
  },
  {
    path: "/biz/profile",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /프로필|사업자 정보|업체/,
    primaryCta: "button, a",
    seedAs: "biz",
  },
  {
    path: "/biz/settings",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /설정|사업자|계정/,
    primaryCta: "a, button",
    seedAs: "biz",
  },
  {
    path: "/biz/settings/commission",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /수수료|요율|커미션/,
    primaryCta: "button",
    seedAs: "biz",
  },
  {
    path: "/biz/settings/notifications",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /알림|푸시|설정/,
    primaryCta: 'button, input[type="checkbox"]',
    seedAs: "biz",
  },
  {
    path: "/biz/settings/payment",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /결제|정산 계좌|카드/,
    primaryCta: "button",
    seedAs: "biz",
  },
  {
    path: "/biz/settings/support",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /문의|지원|고객센터/,
    primaryCta: "a, button",
    seedAs: "biz",
  },
  {
    path: "/biz/settlements",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /정산|매출|수익/,
    primaryCta: "button, a",
    seedAs: "biz",
  },
  {
    path: "/biz/verify",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /사업자 인증|등록증|업로드/,
    primaryCta: 'input[type="file"], button',
    seedAs: "biz",
  },
  {
    path: "/biz/workers",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /근무자|인력|목록/,
    primaryCta: 'a[href^="/biz/workers/"]',
    seedAs: "biz",
  },
  {
    path: `/biz/workers/${APPLICANT_ID}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /근무자 상세|프로필|경력/,
    primaryCta: "button, a",
    seedAs: "biz",
  },

  // ---------- Admin (authenticated) ----------
  {
    path: "/admin",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /관리자|대시보드|어드민/,
    primaryCta: 'a[href^="/admin/"]',
    seedAs: "admin",
  },
  {
    path: "/admin/businesses",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /사업자|업체 목록|관리/,
    primaryCta: 'a[href^="/admin/businesses/"], button',
    seedAs: "admin",
  },
  {
    path: `/admin/businesses/${BIZ_IDS.verified}`,
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /사업자 상세|인증|등록증/,
    primaryCta: "button",
    seedAs: "admin",
  },
  {
    path: "/admin/settlements",
    desktopOk: true,
    mobileOk: true,
    contentAssertion: /정산|집계|관리/,
    primaryCta: "button, a",
    seedAs: "admin",
  },
];

// Self-check: manifest must cover every route discover.ts finds.
// Enable with REVIEW_MANIFEST_SELFCHECK=1 to avoid running during normal imports.
if (process.env["REVIEW_MANIFEST_SELFCHECK"] === "1") {
  void (async () => {
    const discovered = await discoverRoutes();
    // Map each manifest entry to its matching discover-shape. Rule:
    //   manifest UUID segment (matches 36-char uuid regex) MUST pair with a
    //   discovered dynamic segment (`:foo`); all other segments compare literal.
    const isUuid = (seg: string) => /^[0-9a-f-]{36}$/.test(seg);

    const coveredShapes = new Set<string>();
    for (const r of ROUTES) {
      const manifestSegs = r.path.split("/").filter(Boolean);
      const match = discovered.find((d) => {
        const discoveredSegs = d.split("/").filter(Boolean);
        if (discoveredSegs.length !== manifestSegs.length) return false;
        for (let i = 0; i < discoveredSegs.length; i++) {
          const ds = discoveredSegs[i]!;
          const ms = manifestSegs[i]!;
          const dsDynamic = ds.startsWith(":") || ds === "*";
          const msUuid = isUuid(ms);
          if (dsDynamic && msUuid) continue; // OK — dynamic paired with uuid
          if (dsDynamic && !msUuid) return false; // manifest has literal where discover has dynamic
          if (!dsDynamic && msUuid) return false; // manifest has uuid where discover has literal
          if (ds !== ms) return false; // both literal, must match
        }
        return true;
      });
      if (match) coveredShapes.add(match);
    }

    const missing = discovered.filter((r) => !coveredShapes.has(r));
    if (missing.length > 0) {
      console.error("manifest missing routes:", missing);
      process.exit(1);
    }
    console.log(
      `[manifest] OK — ${ROUTES.length} entries cover ${discovered.length} discovered routes.`,
    );
  })();
}
