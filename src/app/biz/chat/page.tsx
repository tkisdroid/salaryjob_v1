import Link from "next/link"
import {
  MessageCircle,
  Search,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

/* ── Mock Data ── */

const CHAT_ROOMS = [
  {
    id: "c1",
    workerName: "이준호",
    postTitle: "주말 카페 서빙 알바",
    lastMessage: "네, 토요일 2시에 뵙겠습니다!",
    lastMessageAt: "10분 전",
    unread: 2,
    isOnline: true,
  },
  {
    id: "c2",
    workerName: "박서연",
    postTitle: "주말 카페 서빙 알바",
    lastMessage: "안녕하세요, 지원한 박서연입니다. 근무 시간 조율 가능할까요?",
    lastMessageAt: "1시간 전",
    unread: 1,
    isOnline: true,
  },
  {
    id: "c3",
    workerName: "최동현",
    postTitle: "물류 상하차 단기",
    lastMessage: "수고하셨습니다! 다음에도 잘 부탁드립니다.",
    lastMessageAt: "3시간 전",
    unread: 0,
    isOnline: false,
  },
  {
    id: "c4",
    workerName: "김수진",
    postTitle: "사무 보조 (3/20)",
    lastMessage: "정산 확인했습니다. 감사합니다!",
    lastMessageAt: "어제",
    unread: 0,
    isOnline: false,
  },
  {
    id: "c5",
    workerName: "정하늘",
    postTitle: "카페 서빙 (3/18)",
    lastMessage: "다음에 또 기회가 있으면 좋겠습니다.",
    lastMessageAt: "3일 전",
    unread: 0,
    isOnline: false,
  },
  {
    id: "c6",
    workerName: "오민석",
    postTitle: "이벤트 스태프 (3/29)",
    lastMessage: "행사 장소 주소 한번 더 확인 부탁드립니다.",
    lastMessageAt: "3일 전",
    unread: 0,
    isOnline: true,
  },
] as const

/* ── Empty State ── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 mb-4">
        <MessageCircle className="w-8 h-8 text-teal" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        아직 대화가 없어요
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        지원자를 수락하면 채팅이 시작됩니다. 공고를 등록하고 인재를 만나보세요.
      </p>
    </div>
  )
}

/* ── Page ── */

export default function BizChatPage() {
  const hasChats = CHAT_ROOMS.length > 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">채팅</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          지원자 및 근무자와 실시간으로 대화하세요.
        </p>
      </div>

      {!hasChats ? (
        <EmptyState />
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름 또는 공고로 검색..."
              className="pl-10"
            />
          </div>

          {/* Chat List */}
          <Card>
            <CardContent className="divide-y divide-border">
              {CHAT_ROOMS.map((room) => (
                <Link
                  key={room.id}
                  href={`/biz/chat/${room.id}`}
                  className="flex items-center gap-3 py-3 -mx-4 px-4 hover:bg-muted/30 rounded-lg transition-colors"
                >
                  {/* Avatar with online indicator */}
                  <div className="relative flex-shrink-0">
                    <Avatar size="lg">
                      <AvatarFallback>{room.workerName[0]}</AvatarFallback>
                    </Avatar>
                    {room.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-teal rounded-full border-2 border-card" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {room.workerName}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {room.lastMessageAt}
                      </span>
                    </div>
                    <p className="text-xs text-teal font-medium mb-0.5">
                      {room.postTitle}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {room.lastMessage}
                    </p>
                  </div>

                  {/* Unread Badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {room.unread > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand text-white text-xs font-semibold px-1.5">
                        {room.unread}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
