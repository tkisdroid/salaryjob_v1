import Link from "next/link";
import { ArrowLeft, Bell, Mail, Smartphone } from "lucide-react";

export default function BizNotificationSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        설정으로 돌아가기
      </Link>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
            <Bell className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">알림 설정</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              지원, 채팅, 정산 관련 알림 채널을 확인합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">푸시 알림</p>
                <p className="text-sm text-muted-foreground">
                  긴급 공고, 새로운 지원, 체크인 이벤트를 앱에서 바로 받습니다.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">이메일 알림</p>
                <p className="text-sm text-muted-foreground">
                  정산 완료, 사업자 인증 상태 변경, 고객센터 답변을 이메일로 받습니다.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="font-semibold">현재 동작</p>
            <p className="mt-1 text-sm text-muted-foreground">
              알림 상세 ON/OFF UI는 아직 준비 중이지만, 이 페이지는 더 이상 404가
              나지 않으며 현재 제공되는 알림 채널을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
