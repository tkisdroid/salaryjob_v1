import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, MessageCircle, Send } from "lucide-react";
import { requireBusiness } from "@/lib/dal";
import { getChatThreadForUser } from "@/lib/services/chat";
import { sendBusinessChatMessage } from "./actions";

export const dynamic = "force-dynamic";

function timeLabel(date: Date) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function BizChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusiness();
  const { id } = await params;
  const thread = await getChatThreadForUser(id, session.id);

  if (!thread) redirect("/biz/chat");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-28">
      <Link
        href="/biz/chat"
        className="inline-flex items-center gap-2 pb-1 text-[13px] font-bold tracking-tight text-ink transition-colors hover:text-brand-deep"
      >
        <ChevronLeft className="h-4 w-4" />
        채팅 목록
      </Link>

      <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-border-soft bg-surface p-[14px]">
        <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
          <MessageCircle className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h1 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">
            {thread.peerName}
          </h1>
          <p className="mt-0.5 text-[12px] font-semibold text-muted-foreground">
            {thread.jobTitle}
          </p>
        </div>
      </div>

      <div className="mt-4 flex min-h-[45vh] flex-col gap-2.5">
        {thread.messages.map((message) => {
          const isBusiness = message.senderId === session.id;
          return (
            <div
              key={message.id}
              className={`flex ${isBusiness ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] px-3.5 pt-2.5 pb-2 text-[13.5px] leading-[1.5] tracking-[-0.015em] ${
                  isBusiness
                    ? "rounded-[18px] rounded-br-[6px] bg-ink text-white"
                    : "rounded-[18px] rounded-bl-[6px] border border-border-soft bg-surface text-ink"
                }`}
              >
                <p>{message.body}</p>
                <p
                  className={`tabnum mt-1 text-[10.5px] font-semibold ${
                    isBusiness
                      ? "text-[color-mix(in_oklch,#fff_70%,transparent)]"
                      : "text-text-subtle"
                  }`}
                >
                  {timeLabel(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        action={sendBusinessChatMessage}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-[color-mix(in_oklch,var(--surface)_96%,transparent)] px-4 py-3 [backdrop-filter:saturate(1.6)_blur(16px)]"
      >
        <div className="mx-auto flex max-w-4xl gap-2">
          <input type="hidden" name="threadId" value={thread.id} />
          <input
            name="body"
            type="text"
            maxLength={1000}
            placeholder="메시지를 입력하세요"
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-[13px] font-medium text-ink outline-none placeholder:text-text-subtle focus:border-ink"
          />
          <button
            type="submit"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition-all hover:bg-black hover:shadow-soft-dark"
            aria-label="메시지 보내기"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
