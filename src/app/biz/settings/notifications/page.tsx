import Link from "next/link";
import { ChevronLeft, Bell, Info, Mail, Smartphone } from "lucide-react";

const CHANNELS = [
  {
    Icon: Smartphone,
    title: "푸시 알림",
    body: "긴급 공고, 새로운 지원, 체크인 이벤트를 앱에서 바로 받습니다.",
  },
  {
    Icon: Mail,
    title: "이메일 알림",
    body: "정산 완료, 사업자 인증 상태 변경, 고객센터 답변을 이메일로 받습니다.",
  },
  {
    Icon: Info,
    title: "안내",
    body: "알림 상세 ON/OFF 설정은 v2에서 제공될 예정입니다. 현재는 위 채널을 통해 주요 알림이 자동으로 발송됩니다.",
  },
] as const;

export default function BizNotificationSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
      >
        <ChevronLeft className="h-4 w-4" />
        설정으로 돌아가기
      </Link>

      <div className="mt-5 space-y-4">
        <div className="rounded-[22px] border border-border bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold tracking-[-0.025em] text-ink">
                알림 설정
              </h1>
              <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                지원, 채팅, 정산 관련 알림 채널을 확인합니다.
              </p>
            </div>
          </div>
        </div>

        {CHANNELS.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[22px] border border-border-soft bg-surface p-5 transition-colors hover:border-ink"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
                  {title}
                </h2>
                <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
