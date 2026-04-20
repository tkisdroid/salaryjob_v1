"use client";

import { useActionState, useState } from "react";
import { Camera, Star } from "lucide-react";
import { updateWorkerProfile, uploadAvatar } from "./actions";
import type { ProfileFormState, AvatarFormState } from "@/lib/form-state";

interface Props {
  initialName: string;
  initialNickname: string;
  initialBirthDate: string;
  initialBio: string;
  initialAvatar: string | null;
  initialPreferredCategories: string[];
  badgeLevel: string;
  rating: number;
  totalJobs: number;
  completionRate: number;
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

export function WorkerProfileEditForm(props: Props) {
  const [profileState, profileAction, isProfilePending] = useActionState<
    ProfileFormState,
    FormData
  >(updateWorkerProfile, null);
  const [avatarState, avatarAction, isAvatarPending] = useActionState<
    AvatarFormState,
    FormData
  >(uploadAvatar, null);

  const [categories, setCategories] = useState<string[]>(
    props.initialPreferredCategories,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    props.initialAvatar,
  );

  const toggleCategory = (c: string) => {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Local preview; real URL comes back from Server Action after upload
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Display the avatarState.data.avatarUrl once upload completes
  const displayAvatar =
    avatarState && "success" in avatarState && avatarState.data?.avatarUrl
      ? avatarState.data.avatarUrl
      : avatarPreview;

  // Premium form field shell — r:14 pill-ish input with ink focus border (§01)
  const inputCls =
    "mt-2 w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-text-subtle focus:border-ink";

  return (
    <div className="space-y-6 pb-28">
      {/* Avatar upload — separate form so it can submit independently */}
      <section aria-labelledby="avatar-section">
        <h2
          id="avatar-section"
          className="mb-3 text-[12.5px] font-bold tracking-tight text-ink"
        >
          프로필 사진
        </h2>
        <form action={avatarAction} className="flex items-center gap-4">
          <div className="relative">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-[20px] bg-[color-mix(in_oklch,var(--brand)_22%,var(--surface))]">
              {displayAvatar ? (
                displayAvatar.startsWith("http") ||
                displayAvatar.startsWith("blob:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatar}
                    alt="프로필"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">{displayAvatar}</span>
                )
              ) : (
                <span className="text-3xl">🙂</span>
              )}
            </div>
            {/* Ink camera badge — iOS/Android profile-edit convention (§05) */}
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-ink text-white"
            >
              <Camera className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="프로필 사진 선택"
              />
              <span className="inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2">
                파일 선택
              </span>
            </label>
            <button
              type="submit"
              disabled={isAvatarPending}
              className="ml-2 inline-flex items-center rounded-full bg-ink px-4 py-1.5 text-[12px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
            >
              {isAvatarPending ? "업로드 중..." : "업로드"}
            </button>
          </div>
        </form>
        {avatarState && "error" in avatarState && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-2 text-[12.5px] font-bold text-destructive"
          >
            {avatarState.error}
          </p>
        )}
        {avatarState && "success" in avatarState && (
          <p role="status" className="mt-2 text-[12.5px] font-bold text-brand-deep">
            {avatarState.message}
          </p>
        )}
      </section>

      {/* Profile fields — separate form */}
      <form action={profileAction} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="text-[12.5px] font-bold tracking-tight text-ink"
          >
            이름 <span className="text-brand-deep">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={props.initialName}
            className={inputCls}
          />
          {profileState &&
            "error" in profileState &&
            profileState.fieldErrors?.name && (
              <p className="mt-1 text-[11.5px] font-bold text-destructive">
                {profileState.fieldErrors.name}
              </p>
            )}
        </div>

        <div>
          <label
            htmlFor="nickname"
            className="text-[12.5px] font-bold tracking-tight text-ink"
          >
            닉네임
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            defaultValue={props.initialNickname}
            className={inputCls}
          />
        </div>

        <div>
          <label
            htmlFor="birthDate"
            className="flex items-baseline gap-2 text-[12.5px] font-bold tracking-tight text-ink"
          >
            생년월일
            <span className="text-[11px] font-medium text-text-subtle">
              사업자에게는 만 나이로 표시됩니다
            </span>
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={props.initialBirthDate}
            className={inputCls}
          />
          {profileState &&
            "error" in profileState &&
            profileState.fieldErrors?.birthDate && (
              <p className="mt-1 text-[11.5px] font-bold text-destructive">
                {profileState.fieldErrors.birthDate}
              </p>
            )}
        </div>

        <div>
          <label
            htmlFor="bio"
            className="flex items-baseline gap-2 text-[12.5px] font-bold tracking-tight text-ink"
          >
            소개글
            <span className="text-[11px] font-medium text-text-subtle">
              140자 이하
            </span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={140}
            defaultValue={props.initialBio}
            className={`${inputCls} resize-none`}
          />
          {profileState &&
            "error" in profileState &&
            profileState.fieldErrors?.bio && (
              <p className="mt-1 text-[11.5px] font-bold text-destructive">
                {profileState.fieldErrors.bio}
              </p>
            )}
        </div>

        {/* Preferred categories — 4×2 single grid with brand-green selected + ink border (§02) */}
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-bold tracking-tight text-ink">
            선호 카테고리
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const selected = categories.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCategory(c.value)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-1.5 rounded-[14px] border py-3 transition-all active:scale-[0.94] ${
                    selected
                      ? "border-ink bg-brand text-ink"
                      : "border-border bg-surface text-muted-foreground hover:border-ink"
                  }`}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-[11px] font-extrabold tracking-tight">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
          {categories.map((c) => (
            <input
              key={c}
              type="hidden"
              name="preferredCategories"
              value={c}
            />
          ))}
        </fieldset>

        {/* Read-only stats — dashed divider + divided info card (§03) */}
        <section
          aria-label="읽기 전용 지표"
          className="border-t border-dashed border-border pt-5"
        >
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-text-subtle">
            시스템 기록
          </p>
          <div className="rounded-[16px] border border-border-soft bg-surface px-4">
            {(
              [
                { k: "뱃지", v: props.badgeLevel },
                {
                  k: "평점",
                  v: (
                    <span className="inline-flex items-center gap-1">
                      <span className="tabnum">
                        {props.rating.toFixed(2)}
                      </span>
                      <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
                    </span>
                  ),
                },
                { k: "근무 횟수", v: props.totalJobs },
                { k: "완료율", v: `${props.completionRate}%` },
              ] as const
            ).map((row, i, arr) => (
              <div
                key={row.k}
                className={`flex items-center justify-between py-3 ${
                  i < arr.length - 1
                    ? "border-b border-dashed border-border-soft"
                    : ""
                }`}
              >
                <span className="text-[13px] font-semibold text-muted-foreground">
                  {row.k}
                </span>
                <span className="tabnum text-[13px] font-extrabold tracking-[-0.02em] text-ink">
                  {row.v}
                </span>
              </div>
            ))}
          </div>
        </section>

        {profileState &&
          "error" in profileState &&
          !profileState.fieldErrors && (
            <p
              role="alert"
              aria-live="polite"
              className="text-[12.5px] font-bold text-destructive"
            >
              {profileState.error}
            </p>
          )}
        {profileState && "success" in profileState && (
          <p role="status" className="text-[12.5px] font-bold text-brand-deep">
            {profileState.message}
          </p>
        )}

        {/* Sticky ink save — §04: "sticky 잉크 블랙 → 폼 어디서든 즉시 저장" */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-[color-mix(in_oklch,var(--surface)_96%,transparent)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] [backdrop-filter:saturate(1.6)_blur(16px)]">
          <div className="mx-auto max-w-md">
            {/* Design spec .pe-save uses rounded-[16px] rectangle, NOT the
                app-wide pill CTA — intentional exception for this screen. */}
            <button
              type="submit"
              disabled={isProfilePending}
              className="flex w-full items-center justify-center rounded-[16px] bg-ink py-4 text-[14px] font-extrabold tracking-[-0.02em] text-white transition-all hover:bg-black hover:shadow-soft-dark active:scale-[0.98] disabled:opacity-50"
            >
              {isProfilePending ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
