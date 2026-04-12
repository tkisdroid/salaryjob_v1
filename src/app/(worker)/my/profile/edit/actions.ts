"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireWorker } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { uploadAvatarFile } from "@/lib/supabase/storage";
import type { ProfileFormState, AvatarFormState } from "@/lib/form-state";

const JOB_CATEGORIES = [
  "food",
  "retail",
  "logistics",
  "office",
  "event",
  "cleaning",
  "education",
  "tech",
] as const;

type JobCategoryLiteral = (typeof JOB_CATEGORIES)[number];

const ProfileSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다").max(50, "이름은 50자 이하여야 합니다"),
  nickname: z.string().max(30, "닉네임은 30자 이하여야 합니다").optional().or(z.literal("")),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식이 올바르지 않습니다")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(140, "소개글은 140자 이하여야 합니다").optional().or(z.literal("")),
  preferredCategories: z.array(z.enum(JOB_CATEGORIES)).default([]),
});

/**
 * updateWorkerProfile — Worker profile CRUD Server Action.
 *
 * WORK-01: persists name, nickname, bio.
 * WORK-02: persists preferredCategories.
 * WORK-03: read-only fields (badgeLevel, rating, totalJobs, completionRate) are
 *          NOT read from FormData — they come from elsewhere (future phases).
 * WORK-04: owner check via requireWorker().id — NEVER trusts a form-supplied userId.
 */
export async function updateWorkerProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireWorker();

  // Extract fields — explicitly enumerate to block hidden WORK-03 writes
  const raw = {
    name: (formData.get("name") ?? "") as string,
    nickname: (formData.get("nickname") ?? "") as string,
    birthDate: (formData.get("birthDate") ?? "") as string,
    bio: (formData.get("bio") ?? "") as string,
    preferredCategories: formData.getAll("preferredCategories") as string[],
  };

  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    const firstError =
      Object.values(fieldErrors)[0] ?? "입력값이 올바르지 않습니다";
    return { error: firstError, fieldErrors };
  }

  const { name, nickname, birthDate, bio, preferredCategories } = parsed.data;
  const normalizedBirthDate = birthDate
    ? new Date(`${birthDate}T00:00:00.000Z`)
    : null;

  try {
    // Upsert handles both "profile exists" and "first edit after signup" paths
    const saved = await prisma.workerProfile.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        name,
        nickname: nickname || null,
        birthDate: normalizedBirthDate,
        bio: bio || null,
        preferredCategories: preferredCategories as JobCategoryLiteral[],
      },
      update: {
        name,
        nickname: nickname || null,
        birthDate: normalizedBirthDate,
        bio: bio || null,
        preferredCategories: preferredCategories as JobCategoryLiteral[],
      },
    });

    revalidatePath("/my");
    revalidatePath("/my/profile/edit");

    return {
      success: true,
      data: { id: saved.id },
      message: "프로필이 저장되었습니다",
    };
  } catch (e) {
    // Do NOT leak DB error details to user
    console.error("updateWorkerProfile error", e);
    return { error: "저장에 실패했습니다. 잠시 후 다시 시도해주세요" };
  }
}

/**
 * uploadAvatar — Upload Worker avatar to Supabase Storage, write URL to DB.
 *
 * D-01: size ≤ 5MB, MIME in jpeg/png/webp, path = avatars/{userId}/avatar.{ext}
 * WORK-01: avatar field becomes the returned public URL (with cache-busting query)
 * WORK-04: session.id is the only userId accepted
 */
export async function uploadAvatar(
  _prevState: AvatarFormState,
  formData: FormData,
): Promise<AvatarFormState> {
  const session = await requireWorker();
  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return { error: "파일을 선택해주세요" };
  }

  const result = await uploadAvatarFile(session.id, file);
  if ("error" in result) {
    return { error: result.error };
  }

  try {
    // Ensure a profile row exists before writing avatar (first-time user case)
    await prisma.workerProfile.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        name: session.email ?? "이름 미설정",
        avatar: result.publicUrl,
      },
      update: { avatar: result.publicUrl },
    });
  } catch (e) {
    console.error("uploadAvatar DB write failed", e);
    return { error: "프로필 업데이트에 실패했습니다" };
  }

  revalidatePath("/my");
  revalidatePath("/my/profile/edit");
  return {
    success: true,
    data: { avatarUrl: result.publicUrl },
    message: "아바타가 업데이트되었습니다",
  };
}
