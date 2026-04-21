"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { updateBusinessProfile } from "./actions";
import { formatRegNumber } from "@/lib/validations/business";
import {
  Building2,
  FileImage,
  ImageIcon,
  MapPin,
  Star,
  Upload,
} from "lucide-react";
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
  // 사업자등록증 이미지 상태 (upload flow lives on /biz/verify)
  hasBusinessRegImage?: boolean;
  businessRegImageSignedUrl?: string | null;
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

  const LABEL = "mb-1.5 block text-[12.5px] font-bold tracking-tight text-ink";
  const LABEL_ICON =
    "mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold tracking-tight text-ink";
  const INPUT =
    "h-12 w-full rounded-[14px] border border-border bg-surface px-3.5 text-[14px] font-medium text-ink placeholder:text-text-subtle transition-colors focus:border-ink focus:outline-none";
  const ERROR_P = "mt-1 text-[11.5px] font-semibold text-destructive";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="profileId" value={props.profileId} />

      {/* Store name header */}
      <div className="flex items-center gap-2.5 rounded-[18px] border border-border-soft bg-surface p-3">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-xl">
          {props.initialLogo || "🏢"}
        </span>
        <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
          {props.initialName}
        </h2>
      </div>

      <div>
        <label htmlFor={`name-${props.profileId}`} className={LABEL}>
          상호명 <span className="text-destructive">*</span>
        </label>
        <input
          id={`name-${props.profileId}`}
          name="name"
          type="text"
          required
          defaultValue={props.initialName}
          className={INPUT}
        />
        {err?.fieldErrors?.name && (
          <p className={ERROR_P}>{err.fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor={`category-${props.profileId}`} className={LABEL_ICON}>
          <Building2 className="h-3.5 w-3.5 text-text-subtle" />
          카테고리 <span className="text-destructive">*</span>
        </label>
        <select
          id={`category-${props.profileId}`}
          name="category"
          required
          defaultValue={props.initialCategory}
          className={INPUT}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
        {err?.fieldErrors?.category && (
          <p className={ERROR_P}>{err.fieldErrors.category}</p>
        )}
      </div>

      <div>
        <label htmlFor={`logo-${props.profileId}`} className={LABEL}>
          로고 이모지
        </label>
        <div className="grid h-14 w-14 place-items-center rounded-[14px] border border-border bg-surface text-2xl">
          <input
            id={`logo-${props.profileId}`}
            name="logo"
            type="text"
            maxLength={10}
            placeholder="🏢"
            defaultValue={props.initialLogo}
            className="h-full w-full bg-transparent text-center text-xl focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`address-${props.profileId}`} className={LABEL_ICON}>
          <MapPin className="h-3.5 w-3.5 text-text-subtle" />
          주소 <span className="text-destructive">*</span>
        </label>
        <input
          id={`address-${props.profileId}`}
          name="address"
          type="text"
          required
          defaultValue={props.initialAddress}
          className={INPUT}
        />
        {err?.fieldErrors?.address && (
          <p className={ERROR_P}>{err.fieldErrors.address}</p>
        )}
      </div>

      <div>
        <label htmlFor={`addressDetail-${props.profileId}`} className={LABEL}>
          상세주소
        </label>
        <input
          id={`addressDetail-${props.profileId}`}
          name="addressDetail"
          type="text"
          defaultValue={props.initialAddressDetail}
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`lat-${props.profileId}`} className={LABEL}>
            위도 (lat)
          </label>
          <input
            id={`lat-${props.profileId}`}
            name="lat"
            type="number"
            step="0.0000001"
            defaultValue={props.initialLat}
            className={`${INPUT} tabnum`}
          />
          {err?.fieldErrors?.lat && (
            <p className={ERROR_P}>{err.fieldErrors.lat}</p>
          )}
        </div>
        <div>
          <label htmlFor={`lng-${props.profileId}`} className={LABEL}>
            경도 (lng)
          </label>
          <input
            id={`lng-${props.profileId}`}
            name="lng"
            type="number"
            step="0.0000001"
            defaultValue={props.initialLng}
            className={`${INPUT} tabnum`}
          />
          {err?.fieldErrors?.lng && (
            <p className={ERROR_P}>{err.fieldErrors.lng}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={`description-${props.profileId}`} className={LABEL}>
          사업장 설명
        </label>
        <textarea
          id={`description-${props.profileId}`}
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={props.initialDescription}
          className="min-h-[96px] w-full resize-none rounded-[14px] border border-border bg-surface px-3.5 py-2.5 text-[14px] font-medium text-ink placeholder:text-text-subtle transition-colors focus:border-ink focus:outline-none"
        />
      </div>

      {/* ── 사업자 인증 정보 (D-30 / D-37) ── */}
      <section className="space-y-4 rounded-[22px] border border-border-soft bg-surface-2/60 p-5">
        <div>
          <h3 className="text-[13px] font-extrabold tracking-tight text-ink">
            사업자 인증 정보
          </h3>
          <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-muted-foreground">
            번호 저장 후 사업자등록증을 업로드하면 OCR 결과와 대조해 인증합니다.
            사업자등록번호를 입력하면 형식 검증 후 자동 인증됩니다. 공고 등록 시
            사업자등록증 이미지가 추가로 필요합니다.
          </p>
        </div>

        <div>
          <label
            htmlFor={`businessRegNumber-${props.profileId}`}
            className={LABEL}
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
            className={`${INPUT} tabnum`}
          />
          {err?.fieldErrors?.businessRegNumber && (
            <p className={ERROR_P}>{err.fieldErrors.businessRegNumber}</p>
          )}
          <p
            className={`mt-1 text-[11.5px] font-semibold ${
              props.verified ? "text-brand-deep" : "text-muted-foreground"
            }`}
          >
            {props.verified
              ? "✅ 인증됨"
              : "미인증 — 등록증 업로드 후 OCR 일치 시 인증됩니다"}
          </p>
        </div>

        <div>
          <label htmlFor={`ownerName-${props.profileId}`} className={LABEL}>
            대표자명
          </label>
          <input
            id={`ownerName-${props.profileId}`}
            name="ownerName"
            type="text"
            placeholder="홍길동"
            defaultValue={props.initialOwnerName ?? ""}
            className={INPUT}
          />
          {err?.fieldErrors?.ownerName && (
            <p className={ERROR_P}>{err.fieldErrors.ownerName}</p>
          )}
        </div>

        <div>
          <label htmlFor={`ownerPhone-${props.profileId}`} className={LABEL}>
            대표자 연락처
          </label>
          <input
            id={`ownerPhone-${props.profileId}`}
            name="ownerPhone"
            type="tel"
            placeholder="010-0000-0000"
            defaultValue={props.initialOwnerPhone ?? ""}
            className={`${INPUT} tabnum`}
          />
          {err?.fieldErrors?.ownerPhone && (
            <p className={ERROR_P}>{err.fieldErrors.ownerPhone}</p>
          )}
        </div>

        <div className="border-t border-border-soft pt-4">
          <div className="mb-3 flex items-center gap-1.5">
            <FileImage className="h-3.5 w-3.5 text-text-subtle" />
            <span className={LABEL.replace("mb-1.5 block", "")}>
              사업자등록증 이미지
            </span>
          </div>

          {props.hasBusinessRegImage && props.businessRegImageSignedUrl ? (
            <div className="mb-3 flex items-start gap-3 rounded-[14px] border border-border-soft bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={props.businessRegImageSignedUrl}
                alt="업로드된 사업자등록증"
                className="h-20 w-20 shrink-0 rounded-[10px] border border-border-soft bg-surface-2 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-extrabold tracking-tight text-ink">
                  업로드 완료
                </p>
                <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-muted-foreground">
                  다시 업로드하려면 아래 버튼을 눌러 주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-3 rounded-[14px] border-2 border-dashed border-border bg-surface p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-extrabold tracking-tight text-ink">
                  아직 업로드되지 않았습니다
                </p>
                <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                  등록증 이미지를 올리면 OCR로 자동 인증됩니다.
                </p>
              </div>
            </div>
          )}

          <Link
            href={`/biz/verify?businessId=${props.profileId}`}
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface text-[12.5px] font-extrabold tracking-tight text-ink transition-colors hover:border-ink hover:bg-surface-2"
          >
            <Upload className="h-3.5 w-3.5" />
            {props.hasBusinessRegImage ? "재업로드" : "등록증 업로드"}
          </Link>
        </div>
      </section>

      {/* Read-only BIZ-02 display — NOT submitted with the form */}
      <section
        aria-label="읽기 전용 지표"
        className="divide-y divide-border-soft rounded-[18px] border border-border-soft bg-surface"
      >
        {[
          {
            k: "평점",
            v: (
              <span className="inline-flex items-center gap-1">
                <span className="tabnum">{props.rating.toFixed(2)}</span>
                <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
                <span className="tabnum font-semibold text-text-subtle">
                  ({props.reviewCount})
                </span>
              </span>
            ),
          },
          { k: "완료율", v: `${props.completionRate}%` },
          { k: "인증", v: props.verified ? "✅ 인증됨" : "미인증" },
        ].map((row) => (
          <div
            key={row.k}
            className="flex items-center justify-between px-4 py-3"
          >
            <span className="text-[12.5px] font-medium text-muted-foreground">
              {row.k}
            </span>
            <span className="tabnum text-[13.5px] font-extrabold tracking-tight text-ink">
              {row.v}
            </span>
          </div>
        ))}
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-[14px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>

      {err && !err.fieldErrors && (
        <p
          role="alert"
          aria-live="polite"
          className="text-[13px] font-semibold text-destructive"
        >
          {err.error}
        </p>
      )}
      {ok && (
        <p
          role="status"
          className="text-[13px] font-extrabold text-brand-deep"
        >
          {ok.message}
        </p>
      )}
    </form>
  );
}
