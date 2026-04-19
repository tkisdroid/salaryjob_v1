import Link from "next/link";
import {
  ChevronLeft,
  Bell,
  CheckCircle2,
  Sparkles,
  Flame,
  Wallet,
  Star,
  MessageCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

type NotificationType =
  | "application"
  | "recommendation"
  | "urgent"
  | "payment"
  | "review"
  | "chat"
  | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

const NOTIFICATION_ICON_MAP: Record<
  NotificationType,
  { icon: typeof Bell; className: string }
> = {
  application: { icon: CheckCircle2, className: "text-brand" },
  recommendation: { icon: Sparkles, className: "text-brand" },
  urgent: { icon: Flame, className: "text-destructive" },
  payment: { icon: Wallet, className: "text-teal" },
  review: { icon: Star, className: "text-brand" },
  chat: { icon: MessageCircle, className: "text-brand-deep" },
  system: { icon: Info, className: "text-muted-foreground" },
};

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    date: "오늘",
    notifications: [
      {
        id: "n-1",
        type: "application",
        title: "지원이 수락되었어요!",
        body: "블루보틀 강남점에서 지원을 수락했습니다. 채팅에서 상세 일정을 확인하세요.",
        time: "10분 전",
        read: false,
        link: "/chat/chat-1",
      },
      {
        id: "n-2",
        type: "recommendation",
        title: "AI 추천 공고",
        body: "내 가용시간에 딱 맞는 공고 3건이 새로 등록되었어요.",
        time: "1시간 전",
        read: false,
        link: "/explore",
      },
      {
        id: "n-3",
        type: "urgent",
        title: "급구 공고 알림",
        body: "GS25 역삼점에서 오늘 밤 대타를 급히 구하고 있어요.",
        time: "2시간 전",
        read: true,
        link: "/search?urgent=1",
      },
    ],
  },
  {
    date: "어제",
    notifications: [
      {
        id: "n-4",
        type: "payment",
        title: "정산 완료",
        body: "쿠팡 풀필먼트 근무 정산이 완료되었습니다. 50,000원이 입금됩니다.",
        time: "오후 3:20",
        read: true,
        link: "/my/settlements",
      },
      {
        id: "n-5",
        type: "chat",
        title: "새 메시지",
        body: "이벤트플러스에서 새 메시지를 보냈습니다.",
        time: "오전 11:45",
        read: true,
        link: "/chat/chat-2",
      },
    ],
  },
  {
    date: "이번 주",
    notifications: [
      {
        id: "n-6",
        type: "review",
        title: "리뷰가 등록되었어요",
        body: "스타벅스 선릉점에서 근무 리뷰를 남겼습니다. 확인해보세요!",
        time: "3월 24일",
        read: true,
        link: "/my/settlements",
      },
      {
        id: "n-7",
        type: "system",
        title: "프로필을 완성해보세요",
        body: "프로필 완성도를 높이면 AI 추천 정확도가 올라갑니다.",
        time: "3월 23일",
        read: true,
        link: "/my/profile",
      },
      {
        id: "n-8",
        type: "application",
        title: "지원 결과 알림",
        body: "마케팅허브에서 지원을 확인했습니다.",
        time: "3월 22일",
        read: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const unreadCount = NOTIFICATION_GROUPS.reduce(
    (sum, group) =>
      sum + group.notifications.filter((n) => !n.read).length,
    0
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-6">
      <header className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Link
            href="/home"
            aria-label="뒤로"
            className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
            <Bell className="h-[20px] w-[20px] text-brand-deep" />
            알림
          </h1>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-[11px] py-1.5 text-[11.5px] font-bold tracking-tight text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {unreadCount}개 새 알림
          </span>
        )}
      </header>

      {NOTIFICATION_GROUPS.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-[22px] border border-border bg-surface py-16 text-center">
          <Bell className="mb-4 h-12 w-12 text-text-subtle" />
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            아직 알림이 없어요
          </p>
          <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
            공고 지원, AI 추천 등 새 소식이 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {NOTIFICATION_GROUPS.map((group) => (
            <section key={group.date}>
              <h2 className="mb-2.5 px-0.5 text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {group.date}
              </h2>
              <div className="space-y-2">
                {group.notifications.map((notification) => {
                  const iconConfig = NOTIFICATION_ICON_MAP[notification.type];
                  const IconComponent = iconConfig.icon;
                  const isUnread = !notification.read;

                  const content = (
                    <article
                      className={cn(
                        "grid grid-cols-[36px_1fr_auto] items-start gap-3 rounded-[18px] p-[14px] transition-all",
                        isUnread
                          ? "bg-[color-mix(in_oklch,var(--brand)_8%,var(--surface))] border border-[color-mix(in_oklch,var(--brand)_24%,var(--border))]"
                          : "bg-surface border border-border-soft",
                        notification.link &&
                          "hover:-translate-y-0.5 hover:shadow-soft-sm cursor-pointer",
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-[12px] border border-border-soft bg-surface",
                          iconConfig.className,
                        )}
                      >
                        <IconComponent className="h-[18px] w-[18px]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={cn(
                              "truncate text-[13.5px] tracking-[-0.02em] text-ink",
                              isUnread ? "font-extrabold" : "font-bold",
                            )}
                          >
                            {notification.title}
                          </h3>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-muted-foreground">
                          {notification.body}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 pl-1">
                        <span className="tabnum whitespace-nowrap text-[10.5px] font-semibold text-text-subtle">
                          {notification.time}
                        </span>
                        {isUnread && (
                          <span className="h-[7px] w-[7px] rounded-full bg-brand" />
                        )}
                      </div>
                    </article>
                  );

                  if (notification.link) {
                    return (
                      <Link
                        key={notification.id}
                        href={notification.link}
                        className="block"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return <div key={notification.id}>{content}</div>;
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
