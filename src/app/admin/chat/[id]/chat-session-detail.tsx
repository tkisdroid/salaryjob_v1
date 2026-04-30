"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CHAT_POLL_INTERVAL_MS } from "@/lib/constants/chat"

interface Message {
  id: string
  role: "USER" | "AI" | "AGENT"
  content: string
  source: string
  createdAt: string
}

interface Session {
  id: string
  status: string
  aiEnabled: boolean
  source: string
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
}

export default function ChatSessionDetail({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [reply, setReply] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      setSession(data.session ?? null)
    } catch {
      // silent
    }
  }, [sessionId])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    // Fetch immediately on mount, then start the polling interval after the
    // first response completes to avoid two near-simultaneous requests.
    fetchMessages().then(() => {
      interval = setInterval(fetchMessages, CHAT_POLL_INTERVAL_MS)
    })
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSendReply(closeAfter = false) {
    if (!reply.trim() || isSending) return
    setError("")
    setIsSending(true)
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/agent-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), closeSession: closeAfter }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "전송에 실패했습니다.")
        return
      }
      setReply("")
      await fetchMessages()
    } catch {
      setError("전송 중 오류가 발생했습니다.")
    } finally {
      setIsSending(false)
    }
  }

  const isClosed = session?.status === "closed"

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/chat"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">
            {session?.guestName ?? (session?.source === "KAKAO" ? "카카오 사용자" : "웹 사용자")}
            {session?.guestPhone && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {session.guestPhone}
              </span>
            )}
          </h1>
          <div className="flex flex-wrap gap-2 mt-0.5">
            {session && (
              <>
                <StatusBadge status={session.status} />
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  {session.source === "KAKAO" ? "카카오" : "웹"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  AI: {session.aiEnabled ? "활성" : "비활성"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-8">메시지가 없습니다.</p>
        )}
        {messages.map((m) => (
          <AdminChatBubble key={m.id} message={m} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      {!isClosed && (
        <div className="space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="상담원 답변을 입력하세요…"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e6f3d] focus:ring-1 focus:ring-[#1e6f3d]"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleSendReply(false)}
              disabled={!reply.trim() || isSending}
              className="flex-1 rounded-xl bg-[#1e6f3d] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#185c33] disabled:opacity-50"
            >
              {isSending ? "전송 중…" : "답변 전송"}
            </button>
            <button
              onClick={() => handleSendReply(true)}
              disabled={!reply.trim() || isSending}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              전송 후 종료
            </button>
          </div>
        </div>
      )}
      {isClosed && (
        <p className="rounded-xl bg-slate-100 p-3 text-center text-sm text-slate-500">
          종료된 상담입니다.
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "진행 중", cls: "bg-green-100 text-green-700" },
    pending_agent: { label: "상담원 대기", cls: "bg-yellow-100 text-yellow-700" },
    closed: { label: "종료", cls: "bg-slate-100 text-slate-500" },
  }
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
      {label}
    </span>
  )
}

function AdminChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "USER"
  const roleLabel =
    message.role === "AI" ? "AI" : message.role === "AGENT" ? "상담원" : null

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-sm">
          {message.role === "AGENT" ? "👤" : "🤖"}
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-blue-500 text-white"
            : message.role === "AGENT"
              ? "rounded-tl-sm bg-[#1e6f3d] text-white"
              : "rounded-tl-sm bg-white border border-slate-200 text-slate-800",
        )}
      >
        {roleLabel && (
          <p className="mb-0.5 text-[10px] font-semibold opacity-70">{roleLabel}</p>
        )}
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
        <p className="mt-1 text-[10px] opacity-50">
          {new Date(message.createdAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}
