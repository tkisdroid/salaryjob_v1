"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Message {
  id: string
  role: "USER" | "AI" | "AGENT"
  content: string
  createdAt: string
}

type Step = "closed" | "guest-form" | "chat"

// ---------------------------------------------------------------------------
// ChatWidget — floating consultation chatbot
// ---------------------------------------------------------------------------
export default function ChatWidget() {
  const [step, setStep] = useState<Step>("closed")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [needsAgent, setNeedsAgent] = useState(false)
  const [guestForm, setGuestForm] = useState({ name: "", phone: "" })
  const [guestFormError, setGuestFormError] = useState("")
  const [sessionClosed, setSessionClosed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (step === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [step])

  // Poll for new messages when chat is open (for agent replies)
  const pollMessages = useCallback(async () => {
    if (!sessionId || step !== "chat") return
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`)
      if (!res.ok) return
      const data = await res.json()
      const newMsgs: Message[] = data.messages ?? []
      setMessages((prev) => {
        if (newMsgs.length > prev.length) {
          const added = newMsgs.length - prev.length
          setUnreadCount((c) => (step === "chat" ? 0 : c + added))
          return newMsgs
        }
        return prev
      })
      if (data.session?.status === "closed") setSessionClosed(true)
    } catch {
      // network error — ignore silently
    }
  }, [sessionId, step])

  useEffect(() => {
    if (step === "chat" && sessionId) {
      pollIntervalRef.current = setInterval(pollMessages, 4000)
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [step, sessionId, pollMessages])

  // Reset unread when chat is open
  useEffect(() => {
    if (step === "chat") setUnreadCount(0)
  }, [step])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  function handleToggle() {
    if (step === "closed") {
      if (sessionId) {
        setStep("chat")
      } else {
        setStep("guest-form")
      }
    } else {
      setStep("closed")
    }
  }

  async function handleGuestFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuestFormError("")

    if (!guestForm.name.trim()) {
      setGuestFormError("이름을 입력해 주세요.")
      return
    }
    if (!/^0\d{8,10}$/.test(guestForm.phone.replace(/-/g, ""))) {
      setGuestFormError("올바른 전화번호를 입력해 주세요. (예: 01012345678)")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guestForm.name.trim(),
          guestPhone: guestForm.phone.replace(/-/g, ""),
          source: "WEB",
        }),
      })

      if (!res.ok) throw new Error("session create failed")
      const data = await res.json()
      setSessionId(data.session.id)

      // Add greeting message
      const greeting: Message = {
        id: "greeting",
        role: "AI",
        content: `안녕하세요, ${guestForm.name}님! 에듀랜드 AI 상담사입니다. 무엇을 도와드릴까요? 😊\n\n공인중개사 강의 관련 수강, 결제, 환불, 교재 배송 등 궁금한 점을 말씀해 주세요.`,
        createdAt: new Date().toISOString(),
      }
      setMessages([greeting])
      setStep("chat")
    } catch {
      setGuestFormError("연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSend() {
    const msg = inputValue.trim()
    if (!msg || !sessionId || isLoading || sessionClosed) return

    const tempId = `tmp-${Date.now()}`
    const userMsg: Message = {
      id: tempId,
      role: "USER",
      content: msg,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputValue("")
    setIsLoading(true)

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      })

      if (!res.ok) throw new Error("send failed")
      const data = await res.json()

      if (data.aiReply) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "AI",
          content: data.aiReply,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
      }

      if (data.needsAgent || data.status === "pending_agent") {
        setNeedsAgent(true)
        if (!data.aiReply) {
          const agentMsg: Message = {
            id: `agent-notice-${Date.now()}`,
            role: "AI",
            content:
              "상담원에게 연결 요청을 보냈습니다. 잠시만 기다려 주시면 담당 상담원이 답변드리겠습니다. 🙏",
            createdAt: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, agentMsg])
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "AI",
          content: "일시적인 오류가 발생했습니다. 다시 시도해 주세요.",
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden">
      {/* Chat panel */}
      {step !== "closed" && (
        <div
          className="w-[360px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-label="에듀랜드 AI 상담"
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-[#1e6f3d] px-4 py-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">
              🏠
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">에듀랜드 AI 상담</p>
              <p className="text-[11px] text-white/70">
                {needsAgent ? "상담원 연결 중…" : "AI 자동응답 중"}
              </p>
            </div>
            <button
              onClick={handleToggle}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              aria-label="채팅 닫기"
            >
              ✕
            </button>
          </div>

          {/* Guest form */}
          {step === "guest-form" && (
            <form onSubmit={handleGuestFormSubmit} className="p-4 space-y-3">
              <p className="text-sm font-medium text-slate-800">
                상담을 시작하기 전에 정보를 입력해 주세요.
              </p>
              <div>
                <label htmlFor="chat-name" className="mb-1 block text-xs font-medium text-slate-600">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="chat-name"
                  type="text"
                  value={guestForm.name}
                  onChange={(e) => setGuestForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="홍길동"
                  maxLength={20}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e6f3d] focus:ring-1 focus:ring-[#1e6f3d]"
                  required
                />
              </div>
              <div>
                <label htmlFor="chat-phone" className="mb-1 block text-xs font-medium text-slate-600">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  id="chat-phone"
                  type="tel"
                  value={guestForm.phone}
                  onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="01012345678"
                  maxLength={13}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e6f3d] focus:ring-1 focus:ring-[#1e6f3d]"
                  required
                />
              </div>
              {guestFormError && (
                <p className="text-xs text-red-600">{guestFormError}</p>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-[#1e6f3d] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#185c33] disabled:opacity-60"
              >
                {isLoading ? "연결 중…" : "상담 시작하기"}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                입력하신 정보는 상담 목적으로만 사용됩니다.
              </p>
            </form>
          )}

          {/* Chat messages */}
          {step === "chat" && (
            <>
              <div className="flex h-[340px] flex-col gap-2.5 overflow-y-auto p-4">
                {messages.map((m) => (
                  <ChatBubble key={m.id} message={m} />
                ))}
                {isLoading && (
                  <div className="flex gap-1.5 items-center self-start pl-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-slate-300 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}
                {sessionClosed && (
                  <p className="text-center text-xs text-slate-400 mt-2">
                    상담이 종료되었습니다.
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-100 p-3 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={sessionClosed ? "상담이 종료되었습니다." : "메시지를 입력하세요…"}
                  disabled={isLoading || sessionClosed}
                  maxLength={500}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e6f3d] focus:ring-1 focus:ring-[#1e6f3d] disabled:bg-slate-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading || sessionClosed}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e6f3d] text-white transition-colors hover:bg-[#185c33] disabled:opacity-40"
                  aria-label="전송"
                >
                  ↑
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
          step !== "closed"
            ? "bg-slate-600 text-white"
            : "bg-[#1e6f3d] text-white hover:bg-[#185c33] hover:scale-105",
        )}
        aria-label={step !== "closed" ? "상담 닫기" : "AI 상담 열기"}
      >
        <span className="text-2xl">{step !== "closed" ? "✕" : "💬"}</span>
        {unreadCount > 0 && step === "closed" && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChatBubble
// ---------------------------------------------------------------------------
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "USER"
  const label = message.role === "AI" ? "AI" : message.role === "AGENT" ? "상담원" : undefined

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e6f3d]/10 text-sm">
          {message.role === "AGENT" ? "👤" : "🤖"}
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-[#1e6f3d] text-white"
            : "rounded-tl-sm bg-slate-100 text-slate-800",
        )}
      >
        {label && (
          <p className="mb-0.5 text-[10px] font-semibold text-[#1e6f3d]">{label}</p>
        )}
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  )
}
