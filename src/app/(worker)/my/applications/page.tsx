import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Building2,
  Calendar,
  Wallet,
  Inbox,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

type ApplicationStatus = "pending" | "accepted" | "completed" | "rejected";

interface Application {
  id: string;
  postTitle: string;
  company: string;
  date: string;
  pay: string;
  status: ApplicationStatus;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "대기중", variant: "secondary" },
  accepted: { label: "수락됨", variant: "default" },
  completed: { label: "완료", variant: "outline" },
  rejected: { label: "거절됨", variant: "destructive" },
};

const APPLICATIONS: Application[] = [
  {
    id: "app-1",
    postTitle: "카페 바리스타",
    company: "블루보틀 강남점",
    date: "2026-03-28",
    pay: "시급 13,000원",
    status: "pending",
  },
  {
    id: "app-2",
    postTitle: "행사 스태프",
    company: "이벤트플러스",
    date: "2026-03-27",
    pay: "시급 15,000원",
    status: "accepted",
  },
  {
    id: "app-3",
    postTitle: "편의점 주간",
    company: "CU 삼성역점",
    date: "2026-03-25",
    pay: "시급 11,000원",
    status: "pending",
  },
  {
    id: "app-4",
    postTitle: "물류 분류 작업",
    company: "쿠팡 풀필먼트",
    date: "2026-03-20",
    pay: "시급 12,500원",
    status: "completed",
  },
  {
    id: "app-5",
    postTitle: "서빙 알바",
    company: "스타벅스 선릉점",
    date: "2026-03-18",
    pay: "시급 11,500원",
    status: "completed",
  },
  {
    id: "app-6",
    postTitle: "전단지 배포",
    company: "마케팅허브",
    date: "2026-03-15",
    pay: "시급 12,000원",
    status: "rejected",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterApplications(
  apps: Application[],
  filter: string
): Application[] {
  if (filter === "all") return apps;
  return apps.filter((app) => app.status === filter);
}

function ApplicationCard({ app }: { app: Application }) {
  const statusConfig = STATUS_CONFIG[app.status];

  return (
    <Link href={`/posts/${app.id}`}>
      <Card size="sm" className="hover:ring-brand/30 transition-shadow">
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate">{app.postTitle}</h3>
            <Badge variant={statusConfig.variant} className="shrink-0">
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {app.company}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {app.date}
            </span>
            <span className="flex items-center gap-1 font-medium text-brand">
              <Wallet className="w-3 h-3" />
              {app.pay}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <p className="text-muted-foreground font-medium">{message}</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        마음에 드는 공고에 지원해보세요
      </p>
      <Button variant="outline" className="mt-4" asChild>
        <Link href="/explore">공고 둘러보기</Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function AllTab() {
  const apps = filterApplications(APPLICATIONS, "all");
  if (apps.length === 0)
    return <EmptyState message="아직 지원 내역이 없어요" />;
  return (
    <div className="space-y-3">
      {apps.map((app) => (
        <ApplicationCard key={app.id} app={app} />
      ))}
    </div>
  );
}

function PendingTab() {
  const apps = filterApplications(APPLICATIONS, "pending");
  if (apps.length === 0)
    return <EmptyState message="대기 중인 지원이 없어요" />;
  return (
    <div className="space-y-3">
      {apps.map((app) => (
        <ApplicationCard key={app.id} app={app} />
      ))}
    </div>
  );
}

function AcceptedTab() {
  const apps = filterApplications(APPLICATIONS, "accepted");
  if (apps.length === 0)
    return <EmptyState message="수락된 지원이 없어요" />;
  return (
    <div className="space-y-3">
      {apps.map((app) => (
        <ApplicationCard key={app.id} app={app} />
      ))}
    </div>
  );
}

function CompletedTab() {
  const apps = filterApplications(APPLICATIONS, "completed");
  if (apps.length === 0)
    return <EmptyState message="완료된 근무가 없어요" />;
  return (
    <div className="space-y-3">
      {apps.map((app) => (
        <ApplicationCard key={app.id} app={app} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApplicationsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <Link href="/my" className="p-1 -ml-1 hover:bg-muted rounded-md">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            지원 내역
          </h1>
        </div>
      </header>

      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            전체
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            대기중
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex-1">
            수락됨
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            완료
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="pt-4">
          <AllTab />
        </TabsContent>
        <TabsContent value="pending" className="pt-4">
          <PendingTab />
        </TabsContent>
        <TabsContent value="accepted" className="pt-4">
          <AcceptedTab />
        </TabsContent>
        <TabsContent value="completed" className="pt-4">
          <CompletedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
