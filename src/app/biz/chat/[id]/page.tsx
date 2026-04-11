import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";

const THREADS = {
  c1: {
    workerName: "이지윤",
    postTitle: "주말 카페 스태프 알바",
    messages: [
      { id: "m1", sender: "worker", time: "09:05", body: "오후 2시에 도착 예정입니다." },
      { id: "m2", sender: "business", time: "09:08", body: "확인했습니다. 유니폼은 현장에서 전달드릴게요." },
    ],
  },
  c2: {
    workerName: "박서윤",
    postTitle: "주말 카페 스태프 알바",
    messages: [
      { id: "m1", sender: "worker", time: "10:20", body: "근무 시작 시간을 다시 확인 부탁드립니다." },
      { id: "m2", sender: "business", time: "10:24", body: "오전 10시까지 매장으로 오시면 됩니다." },
    ],
  },
  c3: {
    workerName: "최동현",
    postTitle: "물류 상하차 분류",
    messages: [
      { id: "m1", sender: "worker", time: "13:10", body: "근무 완료했습니다. 감사합니다." },
    ],
  },
  c4: {
    workerName: "김수진",
    postTitle: "사무 보조 (3/20)",
    messages: [
      { id: "m1", sender: "business", time: "17:40", body: "정산 처리 예정입니다. 수고하셨습니다." },
    ],
  },
  c5: {
    workerName: "정하늘",
    postTitle: "카페 스태프 (3/18)",
    messages: [
      { id: "m1", sender: "worker", time: "18:25", body: "다음 일정도 가능하면 연락 부탁드립니다." },
    ],
  },
  c6: {
    workerName: "서민재",
    postTitle: "이벤트 스태프 (3/29)",
    messages: [
      { id: "m1", sender: "business", time: "19:00", body: "행사 장소 안내를 다시 전달드립니다." },
      { id: "m2", sender: "worker", time: "19:03", body: "네, 확인했습니다." },
    ],
  },
} as const;

export default async function BizChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = THREADS[id as keyof typeof THREADS];

  if (!thread) {
    redirect("/biz/chat");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/biz/chat"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        채팅 목록으로
      </Link>

      <div className="mt-5 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
            <MessageCircle className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{thread.workerName}</h1>
            <p className="text-sm text-muted-foreground">{thread.postTitle}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {thread.messages.map((message) => {
          const isBusiness = message.sender === "business";

          return (
            <div
              key={message.id}
              className={`flex ${isBusiness ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                  isBusiness
                    ? "bg-brand text-white"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                <p>{message.body}</p>
                <p
                  className={`mt-2 text-xs ${
                    isBusiness ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  {message.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
