import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";

const THREADS = {
  "chat-1": {
    company: "브루보트 강남점",
    postTitle: "카페 바리스타",
    messages: [
      { id: "m1", sender: "company", time: "09:10", body: "내일 출근 가능하신가요?" },
      { id: "m2", sender: "worker", time: "09:12", body: "네, 가능합니다. 몇 시까지 도착하면 될까요?" },
      { id: "m3", sender: "company", time: "09:14", body: "오전 9시 50분까지 매장으로 와주세요." },
    ],
  },
  "chat-2": {
    company: "이벤트플러스",
    postTitle: "행사 스태프",
    messages: [
      { id: "m1", sender: "company", time: "11:20", body: "복장은 검은 상의로 부탁드립니다." },
      { id: "m2", sender: "worker", time: "11:25", body: "네, 준비해서 가겠습니다." },
    ],
  },
  "chat-3": {
    company: "CU 삼성역점",
    postTitle: "편의점 주간",
    messages: [
      { id: "m1", sender: "company", time: "14:00", body: "지원 확인했습니다. 감사합니다." },
    ],
  },
  "chat-4": {
    company: "쿠팡 대전센터",
    postTitle: "물류 분류 작업",
    messages: [
      { id: "m1", sender: "company", time: "16:30", body: "정산은 3영업일 내 처리됩니다." },
    ],
  },
  "chat-5": {
    company: "스타벅스 서초점",
    postTitle: "오픈 스태프",
    messages: [
      { id: "m1", sender: "company", time: "18:10", body: "추가 근무 가능 여부를 확인 중입니다." },
    ],
  },
} as const;

export default async function WorkerChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = THREADS[id as keyof typeof THREADS];

  if (!thread) {
    redirect("/chat");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
      <Link
        href="/chat"
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
            <h1 className="text-lg font-bold">{thread.company}</h1>
            <p className="text-sm text-muted-foreground">{thread.postTitle}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {thread.messages.map((message) => {
          const isWorker = message.sender === "worker";

          return (
            <div
              key={message.id}
              className={`flex ${isWorker ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  isWorker
                    ? "bg-brand text-white"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                <p>{message.body}</p>
                <p
                  className={`mt-2 text-xs ${
                    isWorker ? "text-white/80" : "text-muted-foreground"
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
