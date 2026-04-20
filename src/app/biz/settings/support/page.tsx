import Link from "next/link";
import {
  ChevronLeft,
  Headphones,
  Mail,
  MessageCircleWarning,
} from "lucide-react";

export default function BizSupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
      >
        <ChevronLeft className="h-4 w-4" />
        설정으로 돌아가기
      </Link>

      <div className="mt-5 rounded-[28px] border border-border-soft bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">
              고객센터
            </h1>
            <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
              서비스 문의와 긴급 이슈 대응 채널을 확인합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-[18px] border border-border-soft bg-surface p-4 transition-colors hover:border-ink">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-extrabold tracking-tight text-ink">
                  이메일 문의
                </p>
                <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
                  <b className="font-bold text-ink">support@gignow.local</b> 로
                  문의하면 순차적으로 답변합니다.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[18px] border border-border-soft bg-surface p-4 transition-colors hover:border-ink">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-lime-chip text-lime-chip-fg">
                <MessageCircleWarning className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-extrabold tracking-tight text-ink">
                  긴급 문의
                </p>
                <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
                  출근, 정산, 권한 문제는 앱 내 채팅과 함께 고객센터로 전달하면
                  처리 속도가 가장 빠릅니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
