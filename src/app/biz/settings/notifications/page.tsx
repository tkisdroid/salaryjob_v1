import Link from "next/link";
import { ArrowLeft, Bell, Info, Mail, Smartphone } from "lucide-react";

export default function BizNotificationSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-semibold">설정으로 돌아가기</span>
      </Link>

      <div className="mt-6 space-y-4">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-brand/5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">알림 설정</h1>
              <p className="text-xs text-muted-foreground mt-1">
                지원, 채팅, 정산 관련 알림 채널을 확인합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Channel cards */}
        <div className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 mt-0.5">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">푸시 알림</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                긴급 공고, 새로운 지원, 체크인 이벤트를 앱에서 바로 받습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 mt-0.5">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">이메일 알림</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                정산 완료, 사업자 인증 상태 변경, 고객센터 답변을 이메일로 받습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 mt-0.5">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">현재 동작</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                알림 상세 ON/OFF UI는 아직 준비 중이지만, 이 페이지는 더 이상 404가
                나지 않으며 현재 제공되는 알림 채널을 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
