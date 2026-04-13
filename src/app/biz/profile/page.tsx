import { requireBusiness } from "@/lib/dal";
import { getBusinessProfilesByUserId } from "@/lib/db/queries";
import { BizProfileEditForm } from "./biz-profile-edit-form";

export default async function BizProfilePage() {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);

  if (profiles.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight">사업장 프로필</h1>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="mb-2 font-bold text-foreground">등록된 사업장이 없습니다.</p>
          <p className="text-sm">
            Phase 2 seed 계정으로 로그인하거나 관리자에게 문의하세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">사업장 프로필</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {profiles.length}개의 사업장 프로필이 등록되어 있습니다.
      </p>
      <div className="space-y-8">
        {profiles.map((p) => (
          <section key={p.id} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-4 text-lg font-bold tracking-tight">
              {p.logo ?? "🏢"} {p.name}
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
