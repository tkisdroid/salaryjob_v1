"use client";

import { useActionState } from "react";
import { updateBusinessProfile } from "./actions";
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

  const err = state && "error" in state ? state : null;
  const ok = state && "success" in state ? state : null;

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
