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

  return (
    <div className="space-y-8">
      {/* Avatar upload — separate form so it can submit independently */}
      <section aria-labelledby="avatar-section">
        <h2 id="avatar-section" className="mb-3 text-sm font-bold">
          프로필 사진
        </h2>
        <form action={avatarAction} className="flex items-center gap-4">
          <div className="relative group">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-brand-soft transition-transform duration-300 group-hover:scale-105">
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
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center transition-transform duration-200 hover:scale-110">
              <Camera className="w-3 h-3" />
            </div>
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
              className="mt-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white active:scale-[0.95] transition-all duration-200 hover:bg-brand-dark hover:shadow-md disabled:opacity-50"
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
      <form action={profileAction} className="space-y-6">
        <div>
          <label htmlFor="name" className="text-sm font-bold">
            이름 <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={props.initialName}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all duration-200"
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
          <label htmlFor="nickname" className="text-sm font-bold">
            닉네임
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            defaultValue={props.initialNickname}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="birthDate" className="text-sm font-bold">
            생년월일
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={props.initialBirthDate}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all duration-200"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
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
          <label htmlFor="bio" className="text-sm font-bold">
            소개글 (140자 이하)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={140}
            defaultValue={props.initialBio}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 resize-none transition-all duration-200"
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
          <legend className="mb-3 text-sm font-bold">선호 카테고리</legend>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const selected = categories.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCategory(c.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 active:scale-[0.94] hover:-translate-y-0.5 ${
                    selected
                      ? "bg-brand-soft border-brand/30 text-foreground shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:border-brand/20"
                  }`}
                  aria-pressed={selected}
                >
                  <span className={`text-xl transition-transform duration-200 ${selected ? "scale-110" : ""}`}>{c.emoji}</span>
                  <span className="text-[10px] font-semibold">{c.label}</span>
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
          className="rounded-2xl border border-border bg-card p-4 space-y-1.5 text-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">뱃지</span>
            <span className="font-semibold">{props.badgeLevel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">평점</span>
            <span className="font-semibold flex items-center gap-1">
              {props.rating.toFixed(2)}
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">근무 횟수</span>
            <span className="font-semibold">{props.totalJobs}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">완료율</span>
            <span className="font-semibold">{props.completionRate}%</span>
          </div>
        </section>

        <button
          type="submit"
          disabled={isProfilePending}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white active:scale-[0.97] transition-all duration-300 hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/20 disabled:opacity-50"
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
