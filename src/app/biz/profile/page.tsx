import { requireBusiness } from "@/lib/dal";
import { getBusinessProfilesByUserId } from "@/lib/db/queries";
import { BizProfileEditForm } from "./biz-profile-edit-form";

export default async function BizProfilePage() {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);

  if (profiles.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-4 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          사업장 프로필
        </h1>
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface p-10 text-center">
          <p className="text-[17px] font-extrabold tracking-tight text-ink">
            등록된 사업장이 없습니다.
          </p>
          <p className="mt-2 text-[13px] font-medium text-muted-foreground">
            Phase 2 seed 계정으로 로그인하거나 관리자에게 문의하세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <h1 className="text-[24px] font-extrabold tracking-[-0.035em] text-ink">
        사업장 프로필
      </h1>
      <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
        <b className="tabnum font-extrabold text-ink">{profiles.length}</b>개의
        사업장 프로필이 등록되어 있습니다.
      </p>
      <div className="mt-6 space-y-6">
        {profiles.map((p) => (
          <section
            key={p.id}
            className="rounded-[22px] border border-border-soft bg-surface p-5"
          >
            <h2 className="mb-4 flex items-center gap-2.5 text-[16px] font-extrabold tracking-[-0.02em] text-ink">
              <span className="grid h-9 w-9 place-items-center rounded-[12px] border border-border-soft bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-lg">
                {p.logo ?? "🏢"}
              </span>
              {p.name}
            </h2>
            <BizProfileEditForm
              profileId={p.id}
              initialName={p.name}
              initialCategory={p.category}
              initialLogo={p.logo ?? ""}
              initialAddress={p.address}
              initialAddressDetail={p.addressDetail ?? ""}
              initialLat={Number(p.lat)}
              initialLng={Number(p.lng)}
              initialDescription={p.description ?? ""}
              initialBusinessRegNumber={p.businessRegNumber ?? null}
              initialOwnerName={p.ownerName ?? null}
              initialOwnerPhone={p.ownerPhone ?? null}
              rating={Number(p.rating)}
              reviewCount={p.reviewCount}
              completionRate={p.completionRate}
              verified={p.verified}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
