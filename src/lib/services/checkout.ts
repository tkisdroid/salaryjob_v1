import { prisma } from "@/lib/db";
import { createSettlement } from "./settlement";

// Worker checks out from a completed gig
export async function workerCheckout(params: {
  applicationId: string;
  workerId: string;
}) {
  // Verify the application exists and is in accepted state
  const application = await prisma.application.findUniqueOrThrow({
    where: { id: params.applicationId },
    include: {
      post: {
        include: {
          author: {
            include: {
              employerProfile: true,
            },
          },
        },
      },
    },
  });

  if (application.status !== "ACCEPTED") {
    throw new Error(
      `Application is not in ACCEPTED status. Current: ${application.status}`
    );
  }

  if (application.applicantId !== params.workerId) {
    throw new Error("Worker does not match the application");
  }

  const employerProfile = application.post.author.employerProfile;
  if (!employerProfile) {
    throw new Error("Employer profile not found");
  }

  // Calculate pay based on actual hours worked
  const now = new Date();
  const checkInAt = application.checkInAt || now;
  const actualHours =
    (now.getTime() - checkInAt.getTime()) / (1000 * 60 * 60);

  // Determine gross amount
  const hourlyRate = application.post.payAmountMin || 10030; // fallback to minimum wage
  const grossAmount = Math.round(hourlyRate * Math.max(actualHours, 1)); // minimum 1 hour

  // Update application status
  await prisma.application.update({
    where: { id: params.applicationId },
    data: {
      checkOutAt: now,
      actualHours: Math.round(actualHours * 10) / 10,
      status: "COMPLETED",
      completedAt: now,
    },
  });

  // Find worker profile
  const workerProfile = await prisma.workerProfile.findFirst({
    where: { userId: params.workerId },
  });

  if (!workerProfile) {
    throw new Error("Worker profile not found");
  }

  // Create settlement record
  const settlement = await createSettlement({
    applicationId: params.applicationId,
    employerProfileId: employerProfile.id,
    workerProfileId: workerProfile.id,
    grossAmount,
    commissionRate: Number(employerProfile.commissionRate),
  });

  return {
    settlement,
    actualHours: Math.round(actualHours * 10) / 10,
    grossAmount,
  };
}
