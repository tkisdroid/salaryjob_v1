import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Sparkles,
  Flame,
  Wallet,
  Star,
  MessageCircle,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <header>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand" />
            알림
          </h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="bg-brand">
              {unreadCount}개 새 알림
            </Badge>
          )}
        </div>
      </header>

      {NOTIFICATION_GROUPS.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">
            아직 알림이 없어요
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            공고 지원, AI 추천 등 새 소식이 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {NOTIFICATION_GROUPS.map((group) => (
            <section key={group.date}>
              <h2 className="mb-3 text-xs font-bold text-muted-foreground">
                {group.date}
              </h2>
              <div className="space-y-2">
                {group.notifications.map((notification) => {
                  const iconConfig = NOTIFICATION_ICON_MAP[notification.type];
                  const IconComponent = iconConfig.icon;

                  const content = (
                    <Card
                      size="sm"
                      className={cn(
                        "transition-shadow",
                        !notification.read &&
                          "ring-1 ring-brand/20 bg-brand/[0.02]",
                        notification.link && "hover:ring-brand/30 cursor-pointer"
                      )}
                    >
                      <CardContent className="flex gap-3">
                        <div
                          className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-full bg-muted shrink-0 mt-0.5",
                            iconConfig.className
                          )}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={cn(
                                "text-sm truncate",
                                !notification.read
                                  ? "font-semibold"
                                  : "font-medium"
                              )}
                            >
                              {notification.title}
                            </h3>
                            <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
                              {notification.time}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        </div>

                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-2" />
                        )}
                      </CardContent>
                    </Card>
                  );

                  if (notification.link) {
                    return (
                      <Link key={notification.id} href={notification.link}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div key={notification.id}>{content}</div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
