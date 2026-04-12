"use client";

import { useActionState, useState } from "react";
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

  return (
    <div className="space-y-8">
      {/* Avatar upload — separate form so it can submit independently */}
      <section aria-labelledby="avatar-section">
        <h2 id="avatar-section" className="mb-2 text-sm font-bold">
          프로필 사진
        </h2>
        <form action={avatarAction} className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
            {displayAvatar ? (
              displayAvatar.startsWith("http") || displayAvatar.startsWith("blob:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayAvatar}
                  alt="프로필"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  {displayAvatar}
                </div>
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">
                🙂
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={handleFileChange}
              className="block text-sm"
              aria-label="프로필 사진 선택"
            />
            <button
              type="submit"
              disabled={isAvatarPending}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              {isAvatarPending ? "업로드 중..." : "업로드"}
            </button>
          </div>
        </form>
        {avatarState && "error" in avatarState && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-2 text-sm text-destructive"
          >
            {avatarState.error}
          </p>
        )}
        {avatarState && "success" in avatarState && (
          <p role="status" className="mt-2 text-sm text-brand-deep">
            {avatarState.message}
          </p>
        )}
      </section>

      {/* Profile fields — separate form */}
      <form action={profileAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            이름 *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={props.initialName}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {profileState &&
            "error" in profileState &&
            profileState.fieldErrors?.name && (
              <p className="mt-1 text-xs text-destructive">
                {profileState.fieldErrors.name}
              </p>
            )}
        </div>

        <div>
          <label htmlFor="nickname" className="mb-1 block text-sm font-medium">
            닉네임
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            defaultValue={props.initialNickname}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <div>
          <label
            htmlFor="birthDate"
            className="mb-1 block text-sm font-medium"
          >
            생년월일
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={props.initialBirthDate}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            사업자에게는 지원자 상세에서 만 나이로 표시됩니다.
          </p>
          {profileState &&
            "error" in profileState &&
            profileState.fieldErrors?.birthDate && (
              <p className="mt-1 text-xs text-destructive">
                {profileState.fieldErrors.birthDate}
              </p>
            )}
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium">
            소개글 (140자 이하)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={140}
            defaultValue={props.initialBio}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {profileState &&
            "error" in profileState &&
            profileState.fieldErrors?.bio && (
              <p className="mt-1 text-xs text-destructive">
                {profileState.fieldErrors.bio}
              </p>
            )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">선호 카테고리</legend>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const selected = categories.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCategory(c.value)}
                  className={`rounded-xl border p-3 text-sm transition-colors ${selected ? "border-brand bg-brand-light text-brand-deep" : "border-border hover:border-brand/40"}`}
                  aria-pressed={selected}
                >
                  <div className="text-xl">{c.emoji}</div>
                  <div>{c.label}</div>
                </button>
              );
            })}
          </div>
          {categories.map((c) => (
            <input key={c} type="hidden" name="preferredCategories" value={c} />
          ))}
        </fieldset>

        {/* Read-only WORK-03 display — NOT in form, NOT submitted */}
        <section
          aria-label="읽기 전용 지표"
          className="rounded-xl border border-dashed border-border bg-mint-bg/30 p-4 text-sm text-muted-foreground"
        >
          <div>뱃지: {props.badgeLevel}</div>
          <div>평점: {props.rating.toFixed(2)} ⭐</div>
          <div>근무 횟수: {props.totalJobs}</div>
          <div>완료율: {props.completionRate}%</div>
        </section>

        <button
          type="submit"
          disabled={isProfilePending}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {isProfilePending ? "저장 중..." : "저장"}
        </button>

        {profileState &&
          "error" in profileState &&
          !profileState.fieldErrors && (
            <p
              role="alert"
              aria-live="polite"
              className="text-sm text-destructive"
            >
              {profileState.error}
            </p>
          )}
        {profileState && "success" in profileState && (
          <p role="status" className="text-sm text-brand-deep">
            {profileState.message}
          </p>
        )}
      </form>
    </div>
  );
}
