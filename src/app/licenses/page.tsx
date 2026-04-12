import { LegalPageShell } from "@/components/shared/legal-page-shell";

export default function LicensesPage() {
  return (
    <LegalPageShell
      title="오픈소스 라이선스"
      description="샐러리잡은 여러 오픈소스 패키지를 기반으로 동작하며, 각 라이선스를 존중합니다."
      sections={[
        {
          title: "주요 사용 라이브러리",
          body: [
            "Next.js, React, Prisma, Supabase, Lucide, Playwright 등 검증된 오픈소스 생태계를 사용합니다.",
            "각 패키지의 세부 라이선스 고지는 배포 산출물과 패키지 매니저 메타데이터를 기준으로 관리합니다.",
          ],
        },
        {
          title: "고지 원칙",
          body: [
            "제3자 라이브러리의 저작권 및 라이선스 고지는 해당 라이선스 요구사항을 따릅니다.",
            "서비스 운영 중 의존성이 변경되면 라이선스 정보도 함께 갱신해야 합니다.",
          ],
        },
      ]}
    />
  );
}
