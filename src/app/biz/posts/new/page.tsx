"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Sparkles,
  PenLine,
  Loader2,
  TrendingUp,
  ArrowLeft,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

/* ── Mock AI Result ── */

const MOCK_AI_RESULT = {
  title: "주말 카페 서빙 아르바이트",
  content:
    "안녕하세요! 저희 카페에서 주말에 함께 일할 서빙 스태프를 모집합니다.\n\n주요 업무:\n- 고객 주문 접수 및 서빙\n- 테이블 정리 및 매장 청소\n- 간단한 음료 제조 보조\n\n근무 시간: 토요일 오후 2시 ~ 5시 (3시간)\n시급: 12,000원\n경험자 우대, 초보자도 환영합니다!",
  tags: ["카페", "서빙", "주말", "단기"],
  category: "외식/음료",
  payType: "시급",
  payAmount: "12,000",
  location: "강남구 역삼동",
  schedule: "토요일 14:00~17:00",
  headcount: "1",
} as const

/* ── AI Mode ── */

function AiMode() {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<typeof MOCK_AI_RESULT | null>(null)

  function handleGenerate() {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setTimeout(() => {
      setResult(MOCK_AI_RESULT)
      setIsGenerating(false)
    }, 2000)
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Card className="border-teal/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal" />
              <CardTitle>AI 작성 결과</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">공고 제목</Label>
              <p className="text-base font-semibold mt-1">{result.title}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">상세 내용</Label>
              <p className="text-sm mt-1 whitespace-pre-line leading-relaxed">
                {result.content}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">카테고리</Label>
                <p className="text-sm font-medium mt-1">{result.category}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">위치</Label>
                <p className="text-sm font-medium mt-1">{result.location}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">급여</Label>
                <p className="text-sm font-medium mt-1">
                  {result.payType} {result.payAmount}원
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">근무 일정</Label>
                <p className="text-sm font-medium mt-1">{result.schedule}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">태그</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {result.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setResult(null)}>
              <PenLine className="w-4 h-4" />
              수정하기
            </Button>
            <Button className="bg-teal text-white hover:bg-teal/90">
              이대로 등록
            </Button>
          </CardFooter>
        </Card>

        <AiPredictionCard />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal" />
            AI가 대신 작성해드릴게요
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            어떤 일자리인지 자유롭게 입력하면 AI가 공고를 완성해드려요.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="토요일 오후 2시부터 5시까지 카페 서빙, 시급 12000원"
            rows={5}
            className="resize-none text-base"
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="bg-teal text-white hover:bg-teal/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  작성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI 작성하기
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AiPredictionCard />
    </div>
  )
}

/* ── Manual Mode ── */

function ManualMode() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-teal" />
            공고 직접 작성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">공고 제목</Label>
            <Input id="title" placeholder="예: 주말 카페 서빙 알바" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">상세 내용</Label>
            <Textarea
              id="content"
              placeholder="업무 내용, 요구사항, 우대조건 등을 입력해주세요"
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category">카테고리</Label>
              <Select id="category" defaultValue="">
                <option value="" disabled>
                  카테고리 선택
                </option>
                <option value="food">외식/음료</option>
                <option value="retail">판매/매장</option>
                <option value="logistics">물류/배송</option>
                <option value="office">사무/행정</option>
                <option value="event">이벤트/행사</option>
                <option value="cleaning">청소/정리</option>
                <option value="education">교육/과외</option>
                <option value="tech">IT/기술</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">근무 위치</Label>
              <Input id="location" placeholder="예: 강남구 역삼동" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payType">급여 유형</Label>
              <Select id="payType" defaultValue="">
                <option value="" disabled>
                  급여 유형 선택
                </option>
                <option value="hourly">시급</option>
                <option value="daily">일급</option>
                <option value="perCase">건당</option>
                <option value="negotiable">협의</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payAmount">급여 금액 (원)</Label>
              <Input id="payAmount" type="number" placeholder="12000" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">근무 시작일</Label>
              <Input id="startDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">근무 종료일</Label>
              <Input id="endDate" type="date" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">시작 시간</Label>
              <Input id="startTime" type="time" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">종료 시간</Label>
              <Input id="endTime" type="time" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="headcount">모집 인원</Label>
            <Input
              id="headcount"
              type="number"
              placeholder="1"
              className="max-w-32"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">태그 (쉼표로 구분)</Label>
            <Input id="tags" placeholder="카페, 서빙, 주말, 단기" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button className="bg-teal text-white hover:bg-teal/90">
            등록하기
          </Button>
        </CardFooter>
      </Card>

      <AiPredictionCard />
    </div>
  )
}

/* ── AI Prediction Card ── */

function AiPredictionCard() {
  return (
    <Card className="border-brand/20 bg-brand/5">
      <CardContent className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand/10">
          <TrendingUp className="w-5 h-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">AI 지원 예측</p>
          <p className="text-xs text-muted-foreground">
            이 조건으로 약{" "}
            <span className="font-bold text-brand">8~12명</span> 지원 예상
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Page ── */

export default function BizPostNewPage() {
  const [mode, setMode] = useState<"ai" | "manual">("ai")

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/biz/posts">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">새 공고 등록</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            AI 도움을 받거나 직접 작성할 수 있어요.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === "ai" ? "default" : "outline"}
          onClick={() => setMode("ai")}
          className={
            mode === "ai" ? "bg-teal text-white hover:bg-teal/90" : ""
          }
        >
          <Sparkles className="w-4 h-4" />
          AI가 대신 작성
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          className={
            mode === "manual" ? "bg-teal text-white hover:bg-teal/90" : ""
          }
        >
          <PenLine className="w-4 h-4" />
          직접 작성
        </Button>
      </div>

      {mode === "ai" ? <AiMode /> : <ManualMode />}
    </div>
  )
}
