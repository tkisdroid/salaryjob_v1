import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusiness } from "@/lib/dal";
import { getBusinessProfilesByUserId } from "@/lib/db/queries";
import { createSignedBusinessRegUrl } from "@/lib/supabase/storage-biz-reg";
import { BizProfileEditForm } from "./biz-profile-edit-form";

export default async function BizProfilePage() {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);

  // Resolve signed URLs in parallel so the edit form can render the current
  // 사업자등록증 thumbnail alongside the upload CTA.
  const regImageSignedUrls = await Promise.all(
    profiles.map((p) =>
      p.businessRegImageUrl
        ? createSignedBusinessRegUrl(p.businessRegImageUrl)
        : Promise.resolve(null),
    ),
  );

  if (profiles.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[24px] font-extrabold tracking-[-0.035em] text-ink">
            사업장 프로필
          </h1>
          <Link
            href="/biz/settings"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[12.5px] font-extrabold tracking-tight text-ink transition-colors hover:border-ink hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4" />
            설정으로 돌아가기
          </Link>
        </div>
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface p-10 text-center">
          <p className="text-[17px] font-extrabold tracking-tight text-ink">
            등록된 사업장이 없습니다.
          </p>
          <p className="mt-2 text-[13px] font-medium text-muted-foreground">
            업체 회원가입을 완료하거나 사업장 정보를 먼저 등록해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-0.035em] text-ink">
            사업장 프로필
          </h1>
          <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
            <b className="tabnum font-extrabold text-ink">{profiles.length}</b>개의
            사업장을 관리 중입니다.
          </p>
        </div>
        <Link
          href="/biz/settings"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[12.5px] font-extrabold tracking-tight text-ink transition-colors hover:border-ink hover:bg-surface-2"
        >
          <ArrowLeft className="h-4 w-4" />
          설정으로 돌아가기
        </Link>
      </div>

      <div className="mt-6 space-y-6">
        {profiles.map((profile, index) => (
          <section
            key={profile.id}
            className="rounded-[22px] border border-border-soft bg-surface p-5"
            aria-label={`${profile.name} 사업장 프로필 수정`}
          >
            <BizProfileEditForm
              profileId={profile.id}
              initialName={profile.name}
              initialCategory={profile.category}
              initialLogo={profile.logo ?? ""}
              initialAddress={profile.address}
              initialAddressDetail={profile.addressDetail ?? ""}
              initialLat={Number(profile.lat)}
              initialLng={Number(profile.lng)}
              initialDescription={profile.description ?? ""}
              initialBusinessRegNumber={profile.businessRegNumber ?? null}
              initialOwnerName={profile.ownerName ?? null}
              initialOwnerPhone={profile.ownerPhone ?? null}
              initialOwnerPhoneVerifiedAt={profile.ownerPhoneVerifiedAt ?? null}
              hasBusinessRegImage={Boolean(profile.businessRegImageUrl)}
              businessRegImageIsPdf={profile.businessRegImageUrl
                ?.toLowerCase()
                .endsWith('.pdf')}
              businessRegImageSignedUrl={regImageSignedUrls[index] ?? null}
              rating={Number(profile.rating)}
              reviewCount={profile.reviewCount}
              completionRate={profile.completionRate}
              verified={profile.verified}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
