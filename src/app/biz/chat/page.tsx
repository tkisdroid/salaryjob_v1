import Link from "next/link";
import { ChevronRight, MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    lastMessage:
      "안녕하세요, 지원한 박서연입니다. 근무 시간 조율 가능할까요?",
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
    lastMessage: "행사 장소 주소 한 번 더 확인 부탁드립니다.",
    lastMessageAt: "3일 전",
    unread: 0,
    isOnline: true,
  },
] as const;

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
        <MessageCircle className="h-8 w-8 text-brand" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-foreground">
        아직 대화가 없어요
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        지원자를 수락하면 채팅이 시작됩니다. 공고를 등록하고 인재를
        만나보세요.
      </p>
    </div>
  );
}

export default function BizChatPage() {
  const hasChats = CHAT_ROOMS.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          채팅
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          지원자 및 근무자와 실시간으로 대화하세요.
        </p>
      </div>

      {!hasChats ? (
        <EmptyState />
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름 또는 공고로 검색..."
              className="h-11 rounded-2xl border-border bg-card text-sm pl-10"
            />
          </div>

          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {CHAT_ROOMS.map((room) => (
              <Link
                key={room.id}
                href={`/biz/chat/${room.id}`}
                className="flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/50 active:bg-accent"
              >
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    {room.workerName[0]}
                  </div>
                  {room.isOnline && (
                    <div className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-brand border-2 border-background" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{room.workerName}</h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {room.lastMessageAt}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-brand mt-0.5">
                    {room.postTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {room.lastMessage}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {room.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-primary-foreground px-1.5">
                      {room.unread}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
