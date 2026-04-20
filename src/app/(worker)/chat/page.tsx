"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Mock Data (Phase 5: replace with real DB queries)
// ---------------------------------------------------------------------------

interface ChatRoom {
  id: string;
  company: string;
  initials: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  postTitle: string;
}

const CHAT_ROOMS: ChatRoom[] = [
  {
    id: "chat-1",
    company: "블루보틀 강남점",
    initials: "BB",
    lastMessage: "안녕하세요. 내일 출근 가능하실까요?",
    time: "방금",
    unreadCount: 2,
    postTitle: "카페 바리스타",
  },
  {
    id: "chat-2",
    company: "이벤트플러스",
    initials: "EP",
    lastMessage: "행사 당일 복장은 검정색 상의 부탁드려요.",
    time: "10분 전",
    unreadCount: 1,
    postTitle: "행사 스태프",
  },
  {
    id: "chat-3",
    company: "CU 역삼역점",
    initials: "CU",
    lastMessage: "네, 확인했습니다. 감사합니다.",
    time: "1시간 전",
    unreadCount: 0,
    postTitle: "편의점 주간",
  },
  {
    id: "chat-4",
    company: "쿠팡 물류센터",
    initials: "CP",
    lastMessage: "근무 완료 확인했습니다. 정산은 3일 안에 처리됩니다.",
    time: "어제",
    unreadCount: 0,
    postTitle: "물류 분류 작업",
  },
  {
    id: "chat-5",
    company: "스타벅스 선릉점",
    initials: "SB",
    lastMessage: "지원해주셔서 감사합니다. 검토 후 연락드릴게요.",
    time: "3일 전",
    unreadCount: 0,
    postTitle: "주말 오픈 알바",
  },
];

const STORAGE_KEY = "gignow.chat.readRooms";

function getReadRooms(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatListPage() {
  const [readRooms] = useState<Set<string>>(() => getReadRooms());

  const rooms = CHAT_ROOMS.map((room) => ({
    ...room,
    unreadCount: readRooms.has(room.id) ? 0 : room.unreadCount,
  }));

  const totalUnread = rooms.reduce((sum, r) => sum + r.unreadCount, 0);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
      {/* Premium chat-head: bold title + ink pill unread count */}
      <header className="flex items-center justify-between pb-1">
        <h1 className="flex items-center gap-2.5 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          <MessageCircle className="h-[22px] w-[22px] text-brand-deep" />
          채팅
        </h1>
        {totalUnread > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-[11px] py-1.5 text-[11.5px] font-bold tracking-tight text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {totalUnread}개 안읽음
          </span>
        )}
      </header>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[22px] border border-border bg-surface py-16 text-center">
          <MessageCircle className="mb-4 h-12 w-12 text-text-subtle" />
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            아직 채팅이 없어요
          </p>
          <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
            공고에 지원하면 사업주와 채팅을 시작할 수 있어요.
          </p>
          <Button variant="ghost-premium" className="mt-4" asChild>
            <Link href="/explore">공고 둘러보기</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rooms.map((room) => {
            const isUnread = room.unreadCount > 0;
            return (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                className={`grid grid-cols-[48px_1fr_auto] items-start gap-3 rounded-[18px] p-[14px] transition-all hover:-translate-y-0.5 hover:shadow-soft-sm ${
                  isUnread
                    ? "border border-[color-mix(in_oklch,var(--brand)_24%,var(--border))] bg-[color-mix(in_oklch,var(--brand)_8%,var(--surface))]"
                    : "border border-border-soft bg-surface"
                }`}
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-[14px] text-[13px] font-extrabold tracking-tight ${
                    isUnread ? "bg-brand text-ink" : "bg-surface-2 text-ink"
                  }`}
                >
                  {room.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                    {room.company}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-semibold tracking-tight text-brand-deep">
                    {room.postTitle}
                  </p>
                  <p className="mt-1.5 truncate text-[12.5px] font-medium leading-snug text-muted-foreground">
                    {room.lastMessage}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 pl-1">
                  <span className="tabnum text-[10.5px] font-semibold text-text-subtle">
                    {room.time}
                  </span>
                  {isUnread && (
                    <span className="tabnum grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1.5 text-[11px] font-extrabold text-white">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
