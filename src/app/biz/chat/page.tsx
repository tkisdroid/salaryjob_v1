import Link from "next/link";
import { ChevronRight, MessageCircle, Search } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border bg-surface py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-[20px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))]">
        <MessageCircle className="h-8 w-8 text-brand-deep" />
      </div>
      <h3 className="mb-2 text-[17px] font-extrabold tracking-[-0.02em] text-ink">
        아직 대화가 없어요
      </h3>
      <p className="max-w-sm text-[13px] font-medium text-muted-foreground">
        지원자를 수락하면 채팅이 시작됩니다. 공고를 등록하고 인재를
        만나보세요.
      </p>
    </div>
  );
}

export default function BizChatPage() {
  const hasChats = CHAT_ROOMS.length > 0;
  const unreadTotal = CHAT_ROOMS.reduce((sum, r) => sum + r.unread, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between sm:mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
            <MessageCircle className="h-[22px] w-[22px] text-brand-deep" />
            채팅
          </h1>
          <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
            지원자 및 근무자와 실시간으로 대화하세요.
          </p>
        </div>
        {unreadTotal > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-[11px] py-1.5 text-[11.5px] font-bold tracking-tight text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {unreadTotal}개 안 읽음
          </span>
        )}
      </div>

      {!hasChats ? (
        <EmptyState />
      ) : (
        <>
          <div className="relative mb-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-surface px-4 transition-colors focus-within:border-ink">
            <Search className="h-4 w-4 text-text-subtle" />
            <input
              type="text"
              placeholder="이름 또는 공고로 검색..."
              className="flex-1 bg-transparent text-[13px] font-medium text-ink placeholder:text-text-subtle focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-[22px] border border-border-soft bg-surface">
            {CHAT_ROOMS.map((room, idx) => {
              const isUnread = room.unread > 0;
              return (
                <Link
                  key={room.id}
                  href={`/biz/chat/${room.id}`}
                  className={`flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2 ${
                    idx > 0 ? "border-t border-border-soft" : ""
                  } ${
                    isUnread
                      ? "bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))]"
                      : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`grid h-11 w-11 place-items-center rounded-[14px] text-[13px] font-extrabold ${
                        isUnread
                          ? "bg-brand text-ink"
                          : "bg-surface-2 text-ink"
                      }`}
                    >
                      {room.workerName[0]}
                    </div>
                    {room.isOnline && (
                      <div className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-surface bg-brand" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                        {room.workerName}
                      </h3>
                      <span className="tabnum ml-2 shrink-0 text-[10.5px] font-semibold text-text-subtle">
                        {room.lastMessageAt}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] font-semibold tracking-tight text-brand-deep">
                      {room.postTitle}
                    </p>
                    <p className="mt-1 truncate text-[12.5px] font-medium text-muted-foreground">
                      {room.lastMessage}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {isUnread && (
                      <span className="tabnum grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1.5 text-[11px] font-extrabold text-white">
                        {room.unread}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-text-subtle" />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
