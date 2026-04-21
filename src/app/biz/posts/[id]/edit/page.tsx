import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { EditJobForm } from "./edit-job-form";

export default async function BizPostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusiness();
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      businessId: true,
      authorId: true,
      title: true,
      category: true,
      description: true,
      workDate: true,
      startTime: true,
      endTime: true,
      headcount: true,
      hourlyPay: true,
      transportFee: true,
      isUrgent: true,
      nightShiftAllowance: true,
      dressCode: true,
      duties: true,
      requirements: true,
      whatToBring: true,
      tags: true,
      address: true,
      addressDetail: true,
    },
  });

  if (!job || job.authorId !== session.id) {
    redirect("/biz/posts");
  }

  return (
    <EditJobForm
      job={{
        ...job,
        workDate:
          job.workDate instanceof Date
            ? job.workDate.toISOString().slice(0, 10)
            : String(job.workDate).slice(0, 10),
        hourlyPay: Number(job.hourlyPay),
        transportFee: Number(job.transportFee),
      }}
    />
  );
}
