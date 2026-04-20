import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "샐러리잡 — Worker Screens",
  description:
    "10개 핵심 Worker 화면을 Main Page Premium 디자인 언어로 정리한 스크린 인벤토리",
};

type ThumbKind =
  | "home"
  | "explore"
  | "availability"
  | "chat"
  | "my"
  | "job-detail"
  | "applications"
  | "check-in"
  | "ai-recommend"
  | "edit-profile";

type Entry = {
  num: string;
  tag: string;
  title: string;
  desc: string;
  href: string;
  thumb: ThumbKind;
};

const ENTRIES: Entry[] = [
  {
    num: "01",
    tag: "HOME",
    title: "홈",
    desc: "수입 히어로 + 카테고리 + 내 주변 공고",
    href: "/home",
    thumb: "home",
  },
  {
    num: "02",
    tag: "EXPLORE",
    title: "탐색",
    desc: "리스트 · 태그 · 지도 3-way 토글",
    href: "/explore",
    thumb: "explore",
  },
  {
    num: "03",
    tag: "AVAILABILITY",
    title: "시간 등록",
    desc: "주간 × 00-23시 그리드 + 심야 구간",
    href: "/my/availability",
    thumb: "availability",
  },
  {
    num: "04",
    tag: "CHAT",
    title: "채팅",
    desc: "업체별 대화 리스트 + 상세 스레드",
    href: "/chat",
    thumb: "chat",
  },
  {
    num: "05",
    tag: "PROFILE",
    title: "MY",
    desc: "프로필 + 등급 배지 + 확정 근무",
    href: "/my",
    thumb: "my",
  },
  {
    num: "06",
    tag: "JOB DETAIL",
    title: "공고 상세",
    desc: "2×2 정보 + 지도 + 원탭 지원",
    href: "/explore",
    thumb: "job-detail",
  },
  {
    num: "07",
    tag: "APPLICATIONS",
    title: "지원 내역",
    desc: "예정 / 진행중 / 완료 3 탭",
    href: "/my/applications",
    thumb: "applications",
  },
  {
    num: "08",
    tag: "CHECK-IN",
    title: "체크인",
    desc: "대형 시계 + 안내 + 브랜드 CTA",
    href: "/my/applications",
    thumb: "check-in",
  },
  {
    num: "09",
    tag: "AI RECOMMEND",
    title: "AI 추천",
    desc: "예상 수입 + 요일별 매칭",
    href: "/my/schedule",
    thumb: "ai-recommend",
  },
  {
    num: "10",
    tag: "EDIT PROFILE",
    title: "프로필 편집",
    desc: "폼 + 4×2 카테고리 + sticky 저장",
    href: "/my/profile/edit",
    thumb: "edit-profile",
  },
];

export default function DesignIndexPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[120px] pt-12 sm:px-10 sm:pt-12">
      <header className="mb-10 flex flex-col items-start justify-between gap-5 border-b border-border pb-8 sm:mb-12 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Worker App · Screen Inventory
          </div>
          <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[56px]">
            샐러리잡
            <br />
            구직자 화면
          </h1>
          <p className="mt-4 max-w-[520px] text-[15px] font-medium leading-[1.55] text-muted-foreground sm:text-[16px]">
            10개 핵심 화면을 메인 랜딩 페이지와 같은 디자인 언어로 재구성. 각
            화면을 클릭하면 실제 앱 라우트로 이동합니다.
          </p>
        </div>
        <div className="tabnum text-left text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground sm:text-right">
          <b className="block text-[28px] font-extrabold tracking-[-0.02em] text-ink">
            {ENTRIES.length}
          </b>
          화면 · SCREENS
        </div>
      </header>

      <section className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {ENTRIES.map((e) => (
          <IndexCard key={e.num} entry={e} />
        ))}
      </section>

      <footer className="mt-20 flex items-center justify-between border-t border-border pt-10 text-[12px] font-semibold text-muted-foreground">
        <div>
          <b className="font-extrabold text-ink">샐러리잡</b> · Worker App
          Screens · 2026
        </div>
        <div className="hidden sm:block">
          Based on Main Page Premium design language
        </div>
      </footer>
    </div>
  );
}

function IndexCard({ entry }: { entry: Entry }) {
  return (
    <Link
      href={entry.href}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-border bg-surface text-ink transition-all duration-200 hover:-translate-y-1 hover:border-ink hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.14)]"
    >
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden border-b border-border bg-surface-2">
        <PhoneThumb kind={entry.thumb} />
      </div>
      <div className="px-[22px] pb-[22px] pt-5">
        <div className="text-[11px] font-bold tracking-[0.1em] text-brand-deep [font-family:Inter,sans-serif]">
          {entry.num} · {entry.tag}
        </div>
        <div className="mt-2 text-[19px] font-extrabold leading-[1.2] tracking-[-0.025em] text-ink">
          {entry.title}
        </div>
        <div className="mt-1.5 text-[12.5px] font-medium leading-[1.5] text-muted-foreground">
          {entry.desc}
        </div>
      </div>
      <span
        aria-hidden
        className="absolute right-4 top-4 grid h-8 w-8 translate-x-[-6px] translate-y-[6px] place-items-center rounded-full bg-ink text-[14px] text-white opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
      >
        →
      </span>
    </Link>
  );
}

function PhoneThumb({ kind }: { kind: ThumbKind }) {
  return (
    <div className="relative flex h-[224px] w-[110px] flex-col rounded-[22px] border-2 border-ink bg-white p-[10px_8px] shadow-[0_6px_18px_-6px_rgba(0,0,0,0.18)]">
      <span
        aria-hidden
        className="absolute left-1/2 top-[5px] h-[9px] w-8 -translate-x-1/2 rounded-full bg-ink"
      />
      <PhoneContent kind={kind} />
    </div>
  );
}

function Bar() {
  return <div className="mx-1.5 mt-2 h-1 rounded-[2px] bg-border" />;
}
function BarShort() {
  return <div className="mx-1.5 mt-2 h-1 w-3/5 rounded-[2px] bg-border" />;
}
function BlockMid() {
  return (
    <div className="mx-1.5 my-2 h-[30px] rounded-lg border border-border bg-surface-2" />
  );
}
function BlockHero() {
  return <div className="mx-1.5 my-2 h-[52px] rounded-lg bg-ink" />;
}
function BlockHeroLime() {
  return <div className="mx-1.5 my-2 h-[52px] rounded-lg bg-lime-chip" />;
}
function BlockTag() {
  return (
    <div className="ml-3 mr-1.5 my-2 h-4 w-[40%] rounded-full border border-lime-chip bg-lime-chip" />
  );
}

function Dots({ pattern }: { pattern: string }) {
  return (
    <div className="mx-1.5 mt-1.5 flex gap-1">
      {pattern.split("").map((c, i) => (
        <span
          key={i}
          className={cn(
            "h-[18px] w-[18px] rounded-md",
            c === "1"
              ? "border border-ink bg-ink"
              : "border border-border bg-surface-2",
          )}
        />
      ))}
    </div>
  );
}

function PhoneContent({ kind }: { kind: ThumbKind }) {
  switch (kind) {
    case "home":
      return (
        <>
          <Bar />
          <BlockHero />
          <Dots pattern="100000" />
          <BlockMid />
          <BlockMid />
        </>
      );
    case "explore":
      return (
        <>
          <Bar />
          <BlockMid />
          <BlockTag />
          <BlockMid />
          <BlockMid />
          <BlockMid />
        </>
      );
    case "availability":
      return (
        <>
          <Bar />
          <BarShort />
          <Dots pattern="011010" />
          <Dots pattern="011011" />
          <Dots pattern="001011" />
          <Dots pattern="001001" />
        </>
      );
    case "chat":
      return (
        <>
          <Bar />
          <div className="mx-1.5 my-2 h-9 rounded-lg border border-border bg-surface-2" />
          <div className="mx-1.5 my-2 h-9 rounded-lg border border-border bg-surface-2" />
          <div className="mx-1.5 my-2 h-9 rounded-lg border border-border bg-surface-2" />
          <div className="mx-1.5 my-2 h-9 rounded-lg border border-border bg-surface-2" />
        </>
      );
    case "my":
      return (
        <>
          <Bar />
          <div className="mx-1.5 my-2 h-[52px] rounded-lg border border-border bg-surface-2" />
          <Dots pattern="000" />
          <BlockMid />
          <BlockMid />
        </>
      );
    case "job-detail":
      return (
        <>
          <Bar />
          <BlockHeroLime />
          <Dots pattern="10" />
          <Dots pattern="01" />
          <div className="mx-1.5 my-2 h-10 rounded-lg border border-border bg-surface-2" />
        </>
      );
    case "applications":
      return (
        <>
          <Bar />
          <Dots pattern="100" />
          <BlockMid />
          <BlockMid />
          <BlockMid />
          <BlockMid />
        </>
      );
    case "check-in":
      return (
        <>
          <Bar />
          <Bar />
          <div className="mx-1.5 my-2 h-[70px] rounded-lg bg-lime-chip" />
          <BlockMid />
          <div className="mx-1.5 my-2 h-9 rounded-full border border-ink bg-ink" />
        </>
      );
    case "ai-recommend":
      return (
        <>
          <Bar />
          <BlockHero />
          <Dots pattern="010" />
          <BlockMid />
          <BlockMid />
        </>
      );
    case "edit-profile":
      return (
        <>
          <Bar />
          <BlockMid />
          <BlockMid />
          <Dots pattern="0101" />
          <Dots pattern="1010" />
          <div className="mx-1.5 my-2 h-9 rounded-[14px] border border-ink bg-ink" />
        </>
      );
  }
}
