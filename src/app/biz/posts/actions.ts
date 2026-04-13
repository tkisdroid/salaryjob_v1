"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/dal";
import { prisma } from "@/lib/db";
import type { JobFormState } from "@/lib/form-state";

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

// HH:MM validation regex
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const JobCreateSchema = z.object({
  businessId: z.string().uuid("사업장 ID가 올바르지 않습니다"),
  title: z
    .string()
    .min(2, "제목은 2자 이상이어야 합니다")
    .max(100, "제목은 100자 이하여야 합니다"),
  category: z.enum(JOB_CATEGORIES, { message: "카테고리를 선택해주세요" }),
  description: z
    .string()
    .min(1, "설명은 필수입니다")
    .max(2000, "설명은 2000자 이하여야 합니다"),
  hourlyPay: z.coerce
    .number()
    .int()
    .min(10030, "시급은 2026 최저시급 10,030원 이상이어야 합니다")
    .max(1000000, "시급은 1,000,000원 이하여야 합니다"),
  transportFee: z.coerce
    .number()
    .int()
    .min(0, "교통비는 0 이상이어야 합니다")
    .max(100000, "교통비는 100,000원 이하여야 합니다")
    .default(0),
  workDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "근무일 형식이 올바르지 않습니다 (YYYY-MM-DD)"),
  startTime: z
    .string()
    .regex(HHMM, "시작 시간 형식이 올바르지 않습니다 (HH:MM)"),
  endTime: z
    .string()
    .regex(HHMM, "종료 시간 형식이 올바르지 않습니다 (HH:MM)"),
  headcount: z.coerce
    .number()
    .int()
    .min(1, "인원은 1명 이상이어야 합니다")
    .max(100, "인원은 100명 이하여야 합니다"),
  address: z
    .string()
    .max(200, "주소는 200자 이하여야 합니다")
    .optional()
    .or(z.literal("")),
  addressDetail: z
    .string()
    .max(100, "상세주소는 100자 이하여야 합니다")
    .optional()
    .or(z.literal("")),
  dressCode: z
    .string()
    .max(100, "드레스코드는 100자 이하여야 합니다")
    .optional()
    .or(z.literal("")),
  duties: z
    .array(z.string().max(200))
    .max(20, "업무는 20개 이하여야 합니다")
    .default([]),
  requirements: z
    .array(z.string().max(200))
    .max(20, "요구사항은 20개 이하여야 합니다")
    .default([]),
  whatToBring: z
    .array(z.string().max(200))
    .max(20, "준비물은 20개 이하여야 합니다")
    .default([]),
  tags: z
    .array(z.string().max(50))
    .max(10, "태그는 10개 이하여야 합니다")
    .default([]),
  isUrgent: z.coerce.boolean().default(false),
  nightShiftAllowance: z.coerce.boolean().default(false),
});

const JobUpdateSchema = JobCreateSchema.extend({
  jobId: z.string().uuid("공고 ID가 올바르지 않습니다"),
});

/**
 * Compute decimal hours between two HH:MM strings.
 * Same-day only — overnight (end <= start) returns 0 (caller rejects).
 */
function computeWorkHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) return 0;
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

function extractArrayField(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((v) => (typeof v === "string" ? v : ""))
    .filter((v) => v.length > 0);
}

function firstFieldError(
  issues: z.ZodIssue[],
): { error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString() ?? "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return {
    error: Object.values(fieldErrors)[0] ?? "입력값이 올바르지 않습니다",
    fieldErrors,
  };
}

/**
 * createJob — POST-01 Server Action.
 *
 * Owner enforcement:
 *   - requireBusiness() gates role
 *   - prisma.businessProfile.findFirst({ id: businessId, userId: session.id })
 *     verifies the submitted businessId actually belongs to the session — blocks
 *     spoofing another user's businessId (T-03-05-02).
 *
 * Server-computed fields (never trusted from FormData):
 *   - workHours: computeWorkHours(startTime, endTime)
 *   - authorId: session.id
 *   - status: "active" (hardcoded default)
 *   - filled: 0
 *   - lat/lng: copied from BusinessProfile (Finding #6 — no geocoding in Phase 3)
 *
 * Geography location column populated via $executeRaw after Prisma insert.
 *
 * On success: throws framework-handled `redirect(/biz/posts/{id})`.
 */
export async function createJob(
  _prevState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireBusiness();

  const raw = {
    businessId: (formData.get("businessId") ?? "") as string,
    title: (formData.get("title") ?? "") as string,
    category: (formData.get("category") ?? "") as string,
    description: (formData.get("description") ?? "") as string,
    hourlyPay: (formData.get("hourlyPay") ?? "") as string,
    transportFee: (formData.get("transportFee") ?? "0") as string,
    workDate: (formData.get("workDate") ?? "") as string,
    startTime: (formData.get("startTime") ?? "") as string,
    endTime: (formData.get("endTime") ?? "") as string,
    headcount: (formData.get("headcount") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    addressDetail: (formData.get("addressDetail") ?? "") as string,
    dressCode: (formData.get("dressCode") ?? "") as string,
    duties: extractArrayField(formData, "duties"),
    requirements: extractArrayField(formData, "requirements"),
    whatToBring: extractArrayField(formData, "whatToBring"),
    tags: extractArrayField(formData, "tags"),
    isUrgent: (formData.get("isUrgent") ?? "false") as string,
    nightShiftAllowance: (formData.get("nightShiftAllowance") ?? "false") as string,
  };

  const parsed = JobCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return firstFieldError(parsed.error.issues);
  }

  const d = parsed.data;

  // Compute workHours server-side — NEVER trust FormData for this.
  const workHours = computeWorkHours(d.startTime, d.endTime);
  if (workHours <= 0) {
    return {
      error: "종료 시간이 시작 시간보다 늦어야 합니다",
      fieldErrors: { endTime: "종료 시간이 시작 시간보다 늦어야 합니다" },
    };
  }

  // Owner check: businessId must belong to session.id (T-03-05-02)
  const business = await prisma.businessProfile.findFirst({
    where: { id: d.businessId, userId: session.id },
    select: {
      id: true,
      lat: true,
      lng: true,
      address: true,
      addressDetail: true,
      businessRegImageUrl: true,
    },
  });
  if (!business) {
    console.warn(
      `POST-01 owner check failed: user ${session.id} tried to create job on businessId ${d.businessId}`,
    );
    return { error: "이 사업장에 공고를 올릴 권한이 없습니다" };
  }

  // D-31 image gate: businessRegImageUrl must be set before creating any job.
  // Gate checks the IMAGE column — NOT the `verified` flag (D-39 / Pitfall 3).
  // Returns a sentinel so the call-site UI can router.push(redirectTo).
  // businessId is included so multi-business owners land on the BLOCKED profile.
  if (!business.businessRegImageUrl) {
    return {
      error: "verify_required",
      redirectTo: `/biz/verify?businessId=${d.businessId}`,
    };
  }

  // Default lat/lng/address from BusinessProfile (Finding #6 — no geocoding)
  const jobLat = Number(business.lat);
  const jobLng = Number(business.lng);
  const jobAddress = d.address || business.address;
  const jobAddressDetail =
    d.addressDetail || business.addressDetail || null;

  let newJobId: string;
  try {
    const created = await prisma.job.create({
      data: {
        businessId: d.businessId,
        authorId: session.id,
        title: d.title,
        category: d.category as JobCategoryLiteral,
        description: d.description,
        hourlyPay: d.hourlyPay,
        transportFee: d.transportFee,
        workDate: new Date(d.workDate),
        startTime: d.startTime,
        endTime: d.endTime,
        workHours,
        headcount: d.headcount,
        filled: 0,
        lat: jobLat,
        lng: jobLng,
        status: "active",
        isUrgent: d.isUrgent,
        nightShiftAllowance: d.nightShiftAllowance,
        duties: d.duties,
        requirements: d.requirements,
        dressCode: d.dressCode || null,
        whatToBring: d.whatToBring,
        tags: d.tags,
        address: jobAddress || null,
        addressDetail: jobAddressDetail,
      },
      select: { id: true },
    });
    newJobId = created.id;

    // Populate geography column — Prisma cannot write Unsupported types.
    // Parameterized via tagged template; lat/lng are numeric (Zod-coerced).
    await prisma.$executeRaw`
      UPDATE public.jobs
      SET location = ST_SetSRID(ST_MakePoint(${jobLng}, ${jobLat}), 4326)::geography
      WHERE id = ${newJobId}::uuid
    `;
  } catch (e) {
    console.error("createJob error", e);
    return { error: "공고 생성에 실패했습니다. 잠시 후 다시 시도해주세요" };
  }

  revalidatePath("/biz/posts");
  revalidatePath("/");
  revalidatePath("/home");
  redirect(`/biz/posts/${newJobId}`);
}

/**
 * updateJob — POST-03 Server Action.
 *
 * Owner enforcement:
 *   - requireBusiness() gates role
 *   - Loads job by id, asserts job.authorId === session.id before update (T-03-05-03)
 *
 * Does NOT allow changing: authorId, businessId (immutable), filled, status
 * (separate lifecycle actions in later phases).
 */
export async function updateJob(
  _prevState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireBusiness();

  const raw = {
    jobId: (formData.get("jobId") ?? "") as string,
    businessId: (formData.get("businessId") ?? "") as string,
    title: (formData.get("title") ?? "") as string,
    category: (formData.get("category") ?? "") as string,
    description: (formData.get("description") ?? "") as string,
    hourlyPay: (formData.get("hourlyPay") ?? "") as string,
    transportFee: (formData.get("transportFee") ?? "0") as string,
    workDate: (formData.get("workDate") ?? "") as string,
    startTime: (formData.get("startTime") ?? "") as string,
    endTime: (formData.get("endTime") ?? "") as string,
    headcount: (formData.get("headcount") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    addressDetail: (formData.get("addressDetail") ?? "") as string,
    dressCode: (formData.get("dressCode") ?? "") as string,
    duties: extractArrayField(formData, "duties"),
    requirements: extractArrayField(formData, "requirements"),
    whatToBring: extractArrayField(formData, "whatToBring"),
    tags: extractArrayField(formData, "tags"),
    isUrgent: (formData.get("isUrgent") ?? "false") as string,
    nightShiftAllowance: (formData.get("nightShiftAllowance") ?? "false") as string,
  };

  const parsed = JobUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return firstFieldError(parsed.error.issues);
  }

  const d = parsed.data;

  const workHours = computeWorkHours(d.startTime, d.endTime);
  if (workHours <= 0) {
    return {
      error: "종료 시간이 시작 시간보다 늦어야 합니다",
      fieldErrors: { endTime: "종료 시간이 시작 시간보다 늦어야 합니다" },
    };
  }

  const existing = await prisma.job.findUnique({
    where: { id: d.jobId },
    select: { id: true, authorId: true, businessId: true },
  });
  if (!existing) {
    return { error: "공고를 찾을 수 없습니다" };
  }
  if (existing.authorId !== session.id) {
    console.warn(
      `POST-03 owner check failed (update): user ${session.id} tried to update job ${d.jobId} owned by ${existing.authorId}`,
    );
    return { error: "이 공고를 수정할 권한이 없습니다" };
  }

  try {
    await prisma.job.update({
      where: { id: d.jobId },
      data: {
        title: d.title,
        category: d.category as JobCategoryLiteral,
        description: d.description,
        hourlyPay: d.hourlyPay,
        transportFee: d.transportFee,
        workDate: new Date(d.workDate),
        startTime: d.startTime,
        endTime: d.endTime,
        workHours,
        headcount: d.headcount,
        isUrgent: d.isUrgent,
        nightShiftAllowance: d.nightShiftAllowance,
        duties: d.duties,
        requirements: d.requirements,
        dressCode: d.dressCode || null,
        whatToBring: d.whatToBring,
        tags: d.tags,
        address: d.address || null,
        addressDetail: d.addressDetail || null,
      },
    });
  } catch (e) {
    console.error("updateJob error", e);
    return { error: "공고 수정에 실패했습니다" };
  }

  revalidatePath("/biz/posts");
  revalidatePath(`/biz/posts/${d.jobId}`);
  revalidatePath(`/posts/${d.jobId}`);
  revalidatePath("/");
  revalidatePath("/home");

  return {
    success: true,
    data: { id: d.jobId },
    message: "공고가 수정되었습니다",
  };
}

/**
 * deleteJob — POST-03 Server Action.
 *
 * Owner enforcement: loads job, asserts job.authorId === session.id (T-03-05-03).
 * Cascade deletes applications via Prisma FK onDelete: Cascade.
 */
export async function deleteJob(
  jobId: string,
): Promise<{ success: true } | { error: string }> {
  const session = await requireBusiness();

  if (typeof jobId !== "string" || !jobId.match(/^[0-9a-f-]{36}$/i)) {
    return { error: "공고 ID가 올바르지 않습니다" };
  }

  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, authorId: true },
  });
  if (!existing) return { error: "공고를 찾을 수 없습니다" };
  if (existing.authorId !== session.id) {
    console.warn(
      `POST-03 owner check failed (delete): user ${session.id} tried to delete job ${jobId} owned by ${existing.authorId}`,
    );
    return { error: "이 공고를 삭제할 권한이 없습니다" };
  }

  try {
    await prisma.job.delete({ where: { id: jobId } });
  } catch (e) {
    console.error("deleteJob error", e);
    return { error: "공고 삭제에 실패했습니다" };
  }

  revalidatePath("/biz/posts");
  revalidatePath("/");
  revalidatePath("/home");
  return { success: true };
}
