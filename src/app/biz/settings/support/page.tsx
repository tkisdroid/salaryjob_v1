import Link from "next/link";
import { ArrowLeft, Headphones, Mail, MessageCircleWarning } from "lucide-react";

export default function BizSupportPage() {
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
            <Headphones className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">고객센터</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              서비스 문의와 긴급 이슈 대응 채널을 확인합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">이메일 문의</p>
                <p className="text-sm text-muted-foreground">
                  support@gignow.local 로 문의하면 순차적으로 답변합니다.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <MessageCircleWarning className="h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">긴급 문의</p>
                <p className="text-sm text-muted-foreground">
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
