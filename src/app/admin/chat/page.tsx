import { requireAdmin } from "@/lib/dal";
import prisma from "@/lib/db";
import Link from "next/link";
import { MessageSquare, Clock, Smartphone } from "lucide-react";

export const metadata = { title: "상담 관리 | Admin" };

const STATUS_LABEL: Record<string, string> = {
  open: "진행 중",
  pending_agent: "상담원 대기",
  closed: "종료",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  pending_agent: "bg-yellow-100 text-yellow-700",
  closed: "bg-slate-100 text-slate-500",
};

export default async function AdminChatPage() {
  await requireAdmin();

  const sessions = await prisma.eduChatSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true, createdAt: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">상담 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            총 {sessions.length}건의 상담 내역
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">상담 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {sessions.map((s) => {
            const lastMsg = s.messages[0];
            const displayName = s.guestName ?? (s.userId ? "회원" : "비회원");
            const statusKey = s.status as string;

            return (
              <Link
                key={s.id}
                href={`/admin/chat/${s.id}`}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                {/* Icon */}
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e6f3d]/10 text-lg">
                  {s.source === "KAKAO" ? (
                    <Smartphone className="h-4 w-4 text-[#1e6f3d]" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-[#1e6f3d]" />
                  )}
                </div>

                {/* Main */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{displayName}</span>
                    {s.guestPhone && (
                      <span className="text-xs text-slate-400">{s.guestPhone}</span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[statusKey] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      {STATUS_LABEL[statusKey] ?? statusKey}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {s.source === "KAKAO" ? "카카오" : "웹"}
                    </span>
                  </div>
                  {lastMsg && (
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {lastMsg.role === "USER" ? "" : lastMsg.role === "AI" ? "AI: " : "상담원: "}
                      {lastMsg.content}
                    </p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelative(s.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {s._count.messages}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
