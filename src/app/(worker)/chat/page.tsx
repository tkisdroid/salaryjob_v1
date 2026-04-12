"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    lastMessage: "안녕하세요! 내일 출근 가능하신가요?",
    time: "방금",
    unreadCount: 2,
    postTitle: "카페 바리스타",
  },
  {
    id: "chat-2",
    company: "이벤트플러스",
    initials: "EP",
    lastMessage: "행사 당일 복장은 검정색 상의 부탁드립니다.",
    time: "10분 전",
    unreadCount: 1,
    postTitle: "행사 스태프",
  },
  {
    id: "chat-3",
    company: "CU 삼성역점",
    initials: "CU",
    lastMessage: "네, 확인했습니다. 감사합니다!",
    time: "1시간 전",
    unreadCount: 0,
    postTitle: "편의점 주간",
  },
  {
    id: "chat-4",
    company: "쿠팡 풀필먼트",
    initials: "CP",
    lastMessage: "근무 완료 확인되었습니다. 정산은 3일 내 처리됩니다.",
    time: "어제",
    unreadCount: 0,
    postTitle: "물류 분류 작업",
  },
  {
    id: "chat-5",
    company: "스타벅스 선릉점",
    initials: "SB",
    lastMessage: "지원해주셔서 감사합니다. 검토 후 연락드리겠습니다.",
    time: "3일 전",
    unreadCount: 0,
    postTitle: "서빙 알바",
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
  const [readRooms, setReadRooms] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadRooms(getReadRooms());
  }, []);

  const rooms = CHAT_ROOMS.map((room) => ({
    ...room,
    unreadCount: readRooms.has(room.id) ? 0 : room.unreadCount,
  }));

  const totalUnread = rooms.reduce((sum, r) => sum + r.unreadCount, 0);

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <header>
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <MessageCircle className="h-5 w-5 text-brand" />
            채팅
          </h1>
          {totalUnread > 0 && (
            <Badge variant="default" className="bg-brand">
              {totalUnread}개 안 읽음
            </Badge>
          )}
        </div>
      </header>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="font-bold text-muted-foreground">
            아직 채팅이 없어요
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            공고에 지원하면 사업주와 채팅을 시작할 수 있어요
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/explore">공고 둘러보기</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <Link key={room.id} href={`/chat/${room.id}`}>
              <Card
                size="sm"
                className="transition-shadow hover:ring-brand/30"
              >
                <CardContent className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-muted text-[10px] font-bold">
                      {room.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">
                        {room.company}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {room.time}
                      </span>
                    </div>
                    <p className="mb-0.5 text-[10px] text-brand">
                      {room.postTitle}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {room.lastMessage}
                      </p>
                      {room.unreadCount > 0 && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
