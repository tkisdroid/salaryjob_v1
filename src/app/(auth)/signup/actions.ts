"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveNextPath } from "@/lib/auth/routing";
import { supabaseAuthErrorToKorean } from "@/lib/errors/auth-errors";
import { createClient } from "@/lib/supabase/server";
import {
  RegNumberSchema,
  normalizeRegNumber,
} from "@/lib/validations/business";
import type { AuthFormState } from "../types";

const PASSWORD_RULE_MESSAGE =
  "비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 합니다.";

const BusinessCategorySchema = z.enum([
  "food",
  "retail",
  "logistics",
  "office",
  "event",
  "cleaning",
  "education",
  "tech",
]);

const SignupSchema = z
  .object({
    email: z.email("올바른 이메일 주소를 입력해 주세요."),
    password: z
      .string()
      .min(8, PASSWORD_RULE_MESSAGE)
      .max(72, "비밀번호는 72자 이하이어야 합니다.")
      .regex(/[A-Za-z]/, PASSWORD_RULE_MESSAGE)
      .regex(/\d/, PASSWORD_RULE_MESSAGE),
    role: z.enum(["WORKER", "BUSINESS"]).default("WORKER"),
    name: z.string().trim().max(50, "이름은 50자 이하이어야 합니다.").optional(),
    businessName: z
      .string()
      .trim()
      .max(100, "사업장 이름은 100자 이하이어야 합니다.")
      .optional(),
    businessCategory: BusinessCategorySchema.optional(),
    businessAddress: z
      .string()
      .trim()
      .max(200, "주소는 200자 이하이어야 합니다.")
      .optional(),
    businessRegNumber: RegNumberSchema.optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message:
          data.role === "BUSINESS"
            ? "담당자 이름을 입력해 주세요."
            : "이름을 입력해 주세요.",
      });
    }

    if (data.role !== "BUSINESS") return;

    if (!data.businessName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["businessName"],
        message: "사업장 이름을 입력해 주세요.",
      });
    }
    if (!data.businessCategory) {
      ctx.addIssue({
        code: "custom",
        path: ["businessCategory"],
        message: "업종을 선택해 주세요.",
      });
    }
    if (!data.businessAddress?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["businessAddress"],
        message: "사업장 주소를 입력해 주세요.",
      });
    }
  });

type SignupData = z.infer<typeof SignupSchema>;

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 } as const;
const EMAIL_DELIVERY_ERROR_PATTERNS = [
  "error sending confirmation email",
  "error sending magic link email",
  "error sending email",
  "email rate limit exceeded",
  "smtp",
] as const;
const RECENT_UNCONFIRMED_USER_MS = 10 * 60 * 1000;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createAdminClient(url, key, {
    auth: { persistSession: false },
  });
}

function isEmailDeliveryFailure(message: string) {
  const normalized = message.toLowerCase();
  return EMAIL_DELIVERY_ERROR_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

async function updateAuthRole(userId: string, role: SignupData["role"]) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (error) {
    console.error("[signUpWithPassword] app_metadata role update failed", error);
  }
}

async function findAuthUserByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user) return user;
    if (data.users.length < perPage) return null;
  }

  return null;
}

function canRecoverAuthUser(user: Awaited<ReturnType<typeof findAuthUserByEmail>>) {
  if (!user) return false;

  const createdAt = Date.parse(user.created_at);
  const recentlyCreated =
    Number.isFinite(createdAt) && Date.now() - createdAt < RECENT_UNCONFIRMED_USER_MS;

  return !user.email_confirmed_at && recentlyCreated;
}

async function createConfirmedAuthUser(data: SignupData) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase service role key is not configured.");
  }

  const email = data.email.trim().toLowerCase();
  const existing = await findAuthUserByEmail(email);

  if (existing && !canRecoverAuthUser(existing)) {
    return { error: { email: ["이미 가입된 이메일입니다. 로그인해주세요"] } };
  }

  const attributes = {
    email,
    password: data.password,
    email_confirm: true,
    app_metadata: { role: data.role },
    user_metadata: {
      role: data.role,
      name: data.name,
    },
  };

  if (existing) {
    const { data: updated, error } = await admin.auth.admin.updateUserById(
      existing.id,
      attributes,
    );
    if (error) throw error;
    return { userId: updated.user.id, email };
  }

  const { data: created, error } = await admin.auth.admin.createUser(attributes);
  if (error) throw error;

  return { userId: created.user.id, email };
}

async function createInitialProfile(
  userId: string,
  email: string,
  data: SignupData,
) {
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email, role: data.role },
    update: { email, role: data.role },
  });

  if (data.role === "WORKER") {
    await prisma.workerProfile.upsert({
      where: { userId },
      create: {
        userId,
        name: data.name!.trim(),
        preferredCategories: [],
      },
      update: {
        name: data.name!.trim(),
      },
    });
    return;
  }

  const existing = await prisma.businessProfile.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (existing) return;

  const businessRegNumber =
    data.businessRegNumber && data.businessRegNumber.trim()
      ? normalizeRegNumber(data.businessRegNumber)
      : null;

  const business = await prisma.businessProfile.create({
    data: {
      userId,
      name: data.businessName!.trim(),
      category: data.businessCategory!,
      logo: "🏢",
      address: data.businessAddress!.trim(),
      addressDetail: null,
      lat: SEOUL_CENTER.lat,
      lng: SEOUL_CENTER.lng,
      description: null,
      businessRegNumber,
      ownerName: data.name!.trim(),
    },
  });

  await prisma.$executeRaw`
    UPDATE public.business_profiles
    SET location = ST_SetSRID(ST_MakePoint(${SEOUL_CENTER.lng}, ${SEOUL_CENTER.lat}), 4326)::geography
    WHERE id = ${business.id}::uuid
  `;
}

export async function signUpWithPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "WORKER",
    name: formData.get("name"),
    businessName: formData.get("businessName"),
    businessCategory: formData.get("businessCategory") || undefined,
    businessAddress: formData.get("businessAddress"),
    businessRegNumber: formData.get("businessRegNumber") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const nextPath = parsed.data.role === "BUSINESS" ? "/biz/profile" : "/home";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        role: parsed.data.role,
        name: parsed.data.name,
      },
      emailRedirectTo: `${appUrl()}/auth/confirm?next=${encodeURIComponent(
        nextPath,
      )}`,
    },
  });

  if (error) {
    if (isEmailDeliveryFailure(error.message)) {
      let fallback:
        | Awaited<ReturnType<typeof createConfirmedAuthUser>>
        | undefined;

      try {
        fallback = await createConfirmedAuthUser(parsed.data);

        if (fallback.error) {
          return fallback;
        }

        await createInitialProfile(
          fallback.userId,
          fallback.email,
          parsed.data,
        );
      } catch (e) {
        console.error("[signUpWithPassword] email delivery fallback failed", e);
        return {
          error: {
            form: [
              "계정 인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            ],
          },
        };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: fallback.email,
        password: parsed.data.password,
      });

      if (signInError) {
        console.error(
          "[signUpWithPassword] fallback sign-in failed",
          signInError,
        );
        return {
          error: {
            form: [
              "계정은 생성되었지만 자동 로그인에 실패했습니다. 로그인 화면에서 다시 로그인해 주세요.",
            ],
          },
        };
      }

      redirect(nextPath);
    }

    const kr = supabaseAuthErrorToKorean(error.message);
    if (kr.includes("비밀번호")) {
      return { error: { password: [kr] } };
    }
    if (kr.includes("이메일")) {
      return { error: { email: [kr] } };
    }
    return { error: { form: [kr] } };
  }

  if (data.user?.id) {
    try {
      await createInitialProfile(data.user.id, parsed.data.email, parsed.data);
      await updateAuthRole(data.user.id, parsed.data.role);
    } catch (e) {
      console.error("[signUpWithPassword] profile bootstrap failed", e);
      return {
        error: {
          form: [
            "계정은 생성되었지만 프로필 초기화에 실패했습니다. 잠시 후 로그인해 다시 시도해 주세요.",
          ],
        },
      };
    }
  }

  if (data.session) {
    redirect(nextPath);
  }

  redirect("/auth/check-email");
}

export async function signInWithMagicLink(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const nextPath = resolveNextPath(formData.get("next")) ?? "/role-select";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl()}/auth/confirm?next=${encodeURIComponent(
        nextPath,
      )}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(
      `/auth/error?reason=${encodeURIComponent(
        supabaseAuthErrorToKorean(error.message),
      )}`,
    );
  }

  redirect("/auth/check-email");
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const nextPath = resolveNextPath(formData.get("next")) ?? "/role-select";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(
        nextPath,
      )}`,
    },
  });

  if (error) {
    redirect(
      `/auth/error?reason=${encodeURIComponent(
        supabaseAuthErrorToKorean(error.message),
      )}`,
    );
  }
  if (data.url) redirect(data.url);

  redirect(
    `/auth/error?reason=${encodeURIComponent(
      "소셜 로그인에 실패했습니다. 다시 시도해 주세요.",
    )}`,
  );
}

export async function signInWithKakao(formData: FormData): Promise<void> {
  const nextPath = resolveNextPath(formData.get("next")) ?? "/role-select";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(
        nextPath,
      )}`,
    },
  });

  if (error) {
    redirect(
      `/auth/error?reason=${encodeURIComponent(
        supabaseAuthErrorToKorean(error.message),
      )}`,
    );
  }
  if (data.url) redirect(data.url);

  redirect(
    `/auth/error?reason=${encodeURIComponent(
      "소셜 로그인에 실패했습니다. 다시 시도해 주세요.",
    )}`,
  );
}
