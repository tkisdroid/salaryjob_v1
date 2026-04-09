import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Mock Data
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatListPage() {
  const totalUnread = CHAT_ROOMS.reduce((sum, r) => sum + r.unreadCount, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <header>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand" />
            채팅
          </h1>
          {totalUnread > 0 && (
            <Badge variant="default" className="bg-brand">
              {totalUnread}개 안 읽음
            </Badge>
          )}
        </div>
      </header>

      {CHAT_ROOMS.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">
            아직 채팅이 없어요
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            공고에 지원하면 사업주와 채팅을 시작할 수 있어요
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/explore">공고 둘러보기</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {CHAT_ROOMS.map((room) => (
            <Link key={room.id} href={`/chat/${room.id}`}>
              <Card
                size="sm"
                className="hover:ring-brand/30 transition-shadow"
              >
                <CardContent className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">
                      {room.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {room.company}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {room.time}
                      </span>
                    </div>
                    <p className="text-[10px] text-brand mb-0.5">
                      {room.postTitle}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {room.lastMessage}
                      </p>
                      {room.unreadCount > 0 && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold shrink-0">
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
