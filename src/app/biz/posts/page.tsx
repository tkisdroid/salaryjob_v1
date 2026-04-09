import Link from "next/link"
import {
  Plus,
  Eye,
  Users,
  MoreHorizontal,
  Pencil,
  XCircle,
  Trash2,
  Calendar,
  Sparkles,
  FileText,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

/* ── Mock Data ── */

const POSTS = [
  {
    id: "p1",
    title: "주말 카페 서빙 알바",
    status: "active" as const,
    createdAt: "2026-03-24",
    applications: 3,
    views: 128,
    pay: "시급 12,000원",
    location: "강남구 역삼동",
  },
  {
    id: "p2",
    title: "물류 상하차 단기 (3/28)",
    status: "active" as const,
    createdAt: "2026-03-23",
    applications: 2,
    views: 87,
    pay: "일급 120,000원",
    location: "영등포구 문래동",
  },
  {
    id: "p3",
    title: "이벤트 스태프 (3/29)",
    status: "active" as const,
    createdAt: "2026-03-22",
    applications: 0,
    views: 45,
    pay: "시급 15,000원",
    location: "서초구 반포동",
  },
  {
    id: "p4",
    title: "카페 오전 알바 (평일)",
    status: "closed" as const,
    createdAt: "2026-03-15",
    applications: 8,
    views: 312,
    pay: "시급 11,000원",
    location: "강남구 역삼동",
  },
  {
    id: "p5",
    title: "배달 라이더 주말",
    status: "closed" as const,
    createdAt: "2026-03-10",
    applications: 5,
    views: 201,
    pay: "건당 4,500원",
    location: "강남구 삼성동",
  },
  {
    id: "p6",
    title: "식당 홀서빙 (미완성)",
    status: "draft" as const,
    createdAt: "2026-03-25",
    applications: 0,
    views: 0,
    pay: "시급 10,500원",
    location: "마포구 합정동",
  },
] as const

/* ── Helpers ── */

function statusBadgeProps(status: string) {
  switch (status) {
    case "active":
      return { className: "bg-teal/10 text-teal border-teal/20", label: "활성" }
    case "closed":
      return {
        className: "bg-muted text-muted-foreground border-border",
        label: "마감",
      }
    case "draft":
      return {
        className: "bg-brand/10 text-brand border-brand/20",
        label: "임시저장",
      }
    default:
      return { className: "", label: status }
  }
}

function filterPosts(tab: string) {
  if (tab === "all") return POSTS
  return POSTS.filter((p) => p.status === tab)
}

/* ── Post Card ── */

function PostCard({
  post,
}: {
  post: (typeof POSTS)[number]
}) {
  const badge = statusBadgeProps(post.status)

  return (
    <Card className="hover:ring-2 hover:ring-teal/20 transition-all">
      <CardContent>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
              >
                {badge.label}
              </span>
              <Link
                href={`/biz/posts/${post.id}`}
                className="text-sm font-semibold text-foreground hover:text-teal transition-colors"
              >
                {post.title}
              </Link>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>{post.pay}</span>
              <span>{post.location}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {post.createdAt}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              지원 {post.applications}명
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              조회 {post.views}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/biz/posts/${post.id}`}>
                <Pencil className="w-3.5 h-3.5" />
                수정
              </Link>
            </Button>
            {post.status === "active" && (
              <Button variant="ghost" size="sm">
                <XCircle className="w-3.5 h-3.5" />
                마감
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 mb-4">
        <FileText className="w-8 h-8 text-teal" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        아직 등록된 공고가 없어요
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        첫 공고를 등록해보세요 — AI가 도와드릴게요!
      </p>
      <Button className="bg-teal text-white hover:bg-teal/90" asChild>
        <Link href="/biz/posts/new">
          <Sparkles className="w-4 h-4" />
          AI로 공고 작성하기
        </Link>
      </Button>
    </div>
  )
}

/* ── Tab Content ── */

function PostList({ tab }: { tab: string }) {
  const posts = filterPosts(tab)

  if (posts.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3 mt-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

/* ── Page ── */

export default function BizPostsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">공고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등록한 공고를 관리하고 지원자를 확인하세요.
          </p>
        </div>
        <Button className="bg-teal text-white hover:bg-teal/90" asChild>
          <Link href="/biz/posts/new">
            <Plus className="w-4 h-4" />
            새 공고 등록
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="active">활성</TabsTrigger>
          <TabsTrigger value="closed">마감</TabsTrigger>
          <TabsTrigger value="draft">임시저장</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <PostList tab="all" />
        </TabsContent>
        <TabsContent value="active">
          <PostList tab="active" />
        </TabsContent>
        <TabsContent value="closed">
          <PostList tab="closed" />
        </TabsContent>
        <TabsContent value="draft">
          <PostList tab="draft" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
