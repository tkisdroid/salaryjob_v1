import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireWorker } from "@/lib/dal";
import { CheckInFlow, type CheckInApplication } from "./check-in-flow";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Phase 4 Plan 04-08 — /my/applications/[id]/check-in server entry.
 *
 * Fetches the real Prisma application row (with job + business) and
 * enforces ownership at the page boundary. The previous Phase 1 version
 * used the Phase-1 adapter shape that lacked checkInAt; we now need the
 * full Prisma shape so the CheckInFlow phase machine can pick the right
 * initial phase (ready / working / done).
 *
 * Ownership: redirect-on-fail via 404 is acceptable here because the
 * Server Actions (checkIn / checkOut) re-validate via requireApplicationOwner
 * — this page gate is defence-in-depth.
 */
export default async function CheckInPage({ params }: Props) {
  const { id } = await params;
  const session = await requireWorker();

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      job: { include: { business: true } },
    },
  });

  if (!app || app.workerId !== session.id) {
    notFound();
  }

  // Prisma returns Decimals for hourlyPay/transportFee and Dates for
  // workDate/checkInAt. JSON round-trip strips those to plain primitives
  // so the client component gets a clean shape that matches CheckInApplication.
  const serialized: CheckInApplication = JSON.parse(JSON.stringify(app));

  return <CheckInFlow application={serialized} />;
}
