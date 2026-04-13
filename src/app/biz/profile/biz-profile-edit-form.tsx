"use client";

import { useActionState, useRef } from "react";
import { updateBusinessProfile } from "./actions";
import { formatRegNumber } from "@/lib/validations/business";
import type { ProfileFormState } from "@/lib/form-state";

interface Props {
  profileId: string;
  initialName: string;
  initialCategory: string;
  initialLogo: string;
  initialAddress: string;
  initialAddressDetail: string;
  initialLat: number;
  initialLng: number;
  initialDescription: string;
  // D-37: optional business registration fields
  initialBusinessRegNumber?: string | null;
  initialOwnerName?: string | null;
  initialOwnerPhone?: string | null;
  // Read-only BIZ-02 display fields — NOT in form, NOT in FormData
  rating: number;
  reviewCount: number;
  completionRate: number;
  verified: boolean;
}

const CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "food", label: "음식점", emoji: "🍱" },
  { value: "retail", label: "판매", emoji: "🛍️" },
  { value: "logistics", label: "물류", emoji: "📦" },
  { value: "office", label: "사무", emoji: "💼" },
  { value: "event", label: "행사", emoji: "🎪" },
  { value: "cleaning", label: "청소", emoji: "🧹" },
  { value: "education", label: "교육", emoji: "📚" },
  { value: "tech", label: "IT", emoji: "💻" },
];

export function BizProfileEditForm(props: Props) {
  const [state, action, isPending] = useActionState<ProfileFormState, FormData>(
    updateBusinessProfile,
    null,
  );
  const regNumberRef = useRef<HTMLInputElement>(null);

  const err = state && "error" in state ? state : null;
  const ok = state && "success" in state ? state : null;

  function handleRegNumberBlur() {
    if (regNumberRef.current) {
      regNumberRef.current.value = formatRegNumber(regNumberRef.current.value);
    }
  }

  return (
    <form action={action} className="space-y-4">
      {/* BIZ-03: profileId is the ONLY identity the Server Action trusts.
          The owner check compares this profile's userId to session.id. */}
      <input type="hidden" name="profileId" value={props.profileId} />

      <div>
        <label
          htmlFor={`name-${props.profileId}`}
          className="mb-1 block text-sm font-medium"
        >
          상호명 *
        </label>
        <input
          id={`name-${props.profileId}`}
          name="name"
          type="text"
          required
          defaultValue={props.initialName}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {err?.fieldErrors?.name && (
          <p className="mt-1 text-xs text-destructive">{err.fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor={`category-${props.profileId}`}
          className="mb-1 block text-sm font-medium"
        >
          카테고리 *
        </label>
        <select
          id={`category-${props.profileId}`}
          name="category"
          required
          defaultValue={props.initialCategory}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
        {err?.fieldErrors?.category && (
          <p className="mt-1 text-xs text-destructive">
            {err.fieldErrors.category}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={`logo-${props.profileId}`}
          className="mb-1 block text-sm font-medium"
        >
          로고 이모지
        </label>
        <input
          id={`logo-${props.profileId}`}
          name="logo"
          type="text"
          maxLength={10}
          placeholder="🏢"
          defaultValue={props.initialLogo}
          className="w-24 rounded-lg border border-border bg-background p-3 text-center text-xl focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div>
        <label
          htmlFor={`address-${props.profileId}`}
          className="mb-1 block text-sm font-medium"
        >
          주소 *
        </label>
        <input
          id={`address-${props.profileId}`}
          name="address"
          type="text"
          required
          defaultValue={props.initialAddress}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {err?.fieldErrors?.address && (
          <p className="mt-1 text-xs text-destructive">{err.fieldErrors.address}</p>
        )}
      </div>

      <div>
        <label
          htmlFor={`addressDetail-${props.profileId}`}
          className="mb-1 block text-sm font-medium"
        >
          상세주소
        </label>
        <input
          id={`addressDetail-${props.profileId}`}
          name="addressDetail"
          type="text"
          defaultValue={props.initialAddressDetail}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`lat-${props.profileId}`}
            className="mb-1 block text-sm font-medium"
          >
            위도 (lat)
          </label>
          <input
            id={`lat-${props.profileId}`}
            name="lat"
            type="number"
            step="0.0000001"
            defaultValue={props.initialLat}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {err?.fieldErrors?.lat && (
            <p className="mt-1 text-xs text-destructive">{err.fieldErrors.lat}</p>
          )}
        </div>
        <div>
          <label
            htmlFor={`lng-${props.profileId}`}
            className="mb-1 block text-sm font-medium"
          >
            경도 (lng)
          </label>
          <input
            id={`lng-${props.profileId}`}
            name="lng"
            type="number"
            step="0.0000001"
            defaultValue={props.initialLng}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {err?.fieldErrors?.lng && (
            <p className="mt-1 text-xs text-destructive">{err.fieldErrors.lng}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor={`description-${props.profileId}`}
          className="mb-1 block text-sm font-medium"
        >
          사업장 설명
        </label>
        <textarea
          id={`description-${props.profileId}`}
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={props.initialDescription}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      {/* ── 사업자 인증 정보 (D-30 / D-37) ── */}
      <section className="space-y-4 rounded-xl border border-border p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">사업자 인증 정보</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            사업자등록번호를 입력하면 형식 검증 후 자동 인증됩니다. 공고 등록 시 사업자등록증 이미지가 추가로 필요합니다.
          </p>
        </div>

        <div>
          <label
            htmlFor={`businessRegNumber-${props.profileId}`}
            className="mb-1 block text-sm font-medium"
          >
            사업자등록번호
          </label>
          <input
            id={`businessRegNumber-${props.profileId}`}
            ref={regNumberRef}
            name="businessRegNumber"
            type="text"
            placeholder="123-45-67890"
            defaultValue={
              props.initialBusinessRegNumber
                ? formatRegNumber(props.initialBusinessRegNumber)
                : ""
            }
            onBlur={handleRegNumberBlur}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            style={{ minHeight: "44px" }}
          />
          {err?.fieldErrors?.businessRegNumber && (
            <p className="mt-1 text-xs text-destructive">
              {err.fieldErrors.businessRegNumber}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {props.verified ? "✅ 인증됨" : "미인증 — 번호 입력 후 저장하면 자동 인증됩니다"}
          </p>
        </div>

        <div>
          <label
            htmlFor={`ownerName-${props.profileId}`}
            className="mb-1 block text-sm font-medium"
          >
            대표자명
          </label>
          <input
            id={`ownerName-${props.profileId}`}
            name="ownerName"
            type="text"
            placeholder="홍길동"
            defaultValue={props.initialOwnerName ?? ""}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            style={{ minHeight: "44px" }}
          />
          {err?.fieldErrors?.ownerName && (
            <p className="mt-1 text-xs text-destructive">{err.fieldErrors.ownerName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor={`ownerPhone-${props.profileId}`}
            className="mb-1 block text-sm font-medium"
          >
            대표자 연락처
          </label>
          <input
            id={`ownerPhone-${props.profileId}`}
            name="ownerPhone"
            type="tel"
            placeholder="010-0000-0000"
            defaultValue={props.initialOwnerPhone ?? ""}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            style={{ minHeight: "44px" }}
          />
          {err?.fieldErrors?.ownerPhone && (
            <p className="mt-1 text-xs text-destructive">{err.fieldErrors.ownerPhone}</p>
          )}
        </div>
      </section>

      {/* Read-only BIZ-02 display — NOT submitted with the form */}
      <section
        aria-label="읽기 전용 지표"
        className="rounded-xl border border-dashed border-border bg-mint-bg/30 p-4 text-sm text-muted-foreground"
      >
        <div>
          평점: {props.rating.toFixed(2)} ⭐ ({props.reviewCount}개 리뷰)
        </div>
        <div>완료율: {props.completionRate}%</div>
        <div>인증: {props.verified ? "✅ 인증됨" : "미인증"}</div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>

      {err && !err.fieldErrors && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {err.error}
        </p>
      )}
      {ok && (
        <p role="status" className="text-sm font-bold text-brand-deep">
          {ok.message}
        </p>
      )}
    </form>
  );
}
