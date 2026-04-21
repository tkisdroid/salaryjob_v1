import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { requireBusiness } from "@/lib/dal";
import { getBusinessChatRooms } from "@/lib/services/chat";

export const dynamic = "force-dynamic";

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
        공고 지원자가 생기면 채팅방이 자동으로 생성됩니다.
      </p>
    </div>
  );
}

export default async function BizChatPage() {
  const session = await requireBusiness();
  const rooms = await getBusinessChatRooms(session.id);
  const unreadTotal = rooms.reduce((sum, room) => sum + room.unreadCount, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between sm:mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
            <MessageCircle className="h-[22px] w-[22px] text-brand-deep" />
            채팅
          </h1>
          <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
            실제 지원자와의 대화를 확인합니다.
          </p>
        </div>
        {unreadTotal > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-[11px] py-1.5 text-[11.5px] font-bold tracking-tight text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {unreadTotal}개 안 읽음
          </span>
        )}
      </div>

      {rooms.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border-soft bg-surface">
          {rooms.map((room, index) => {
            const isUnread = room.unreadCount > 0;
            return (
              <Link
                key={room.id}
                href={`/biz/chat/c${index + 1}`}
                className={`flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2 ${
                  index > 0 ? "border-t border-border-soft" : ""
                } ${
                  isUnread
                    ? "bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))]"
                    : ""
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`grid h-11 w-11 place-items-center rounded-[14px] text-[13px] font-extrabold ${
                      isUnread ? "bg-brand text-ink" : "bg-surface-2 text-ink"
                    }`}
                  >
                    {room.peerInitial}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="truncate text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                      {room.peerName}
                    </h3>
                    <span className="tabnum ml-2 shrink-0 text-[10.5px] font-semibold text-text-subtle">
                      {room.lastMessageAt}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] font-semibold tracking-tight text-brand-deep">
                    {room.jobTitle}
                  </p>
                  <p className="mt-1 truncate text-[12.5px] font-medium text-muted-foreground">
                    {room.lastMessage}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {isUnread && (
                    <span className="tabnum grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1.5 text-[11px] font-extrabold text-white">
                      {room.unreadCount}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-text-subtle" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
