import { NextRequest, NextResponse } from "next/server";
import { transitionSettlement } from "@/lib/services/settlement";
import { prisma } from "@/lib/db";

// Toss Payments sends webhook notifications for payment status changes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Verify webhook signature with Toss secret
    // const signature = request.headers.get("toss-signature");
    // if (!verifyTossSignature(body, signature)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const { paymentKey, status, orderId } = body;

    // orderId format: "settlement_{settlementId}"
    if (!orderId?.startsWith("settlement_")) {
      return NextResponse.json(
        { error: "Unknown order format" },
        { status: 400 }
      );
    }

    const settlementId = orderId.replace("settlement_", "");

    if (status === "DONE") {
      await transitionSettlement(settlementId, "SETTLED", paymentKey);

      // Send push notification to worker
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: { worker: { include: { user: true } } },
      });

      if (settlement) {
        await prisma.notification.create({
          data: {
            userId: settlement.worker.userId,
            type: "PAYMENT_COMPLETED",
            title: "급여가 입금되었어요!",
            body: `${settlement.netAmount.toLocaleString()}원이 계좌에 입금되었습니다.`,
            data: { settlementId: settlement.id },
          },
        });
      }
    } else if (status === "FAILED" || status === "CANCELED") {
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
      });

      if (settlement) {
        const currentStatus = settlement.status;
        // Determine next retry status
        const retryMap: Record<string, string> = {
          PROCESSING: "RETRY_1",
          RETRY_1: "RETRY_2",
          RETRY_2: "RETRY_3",
          RETRY_3: "FAILED",
        };
        const nextStatus = retryMap[currentStatus] || "FAILED";
        await transitionSettlement(
          settlementId,
          nextStatus as
            | "RETRY_1"
            | "RETRY_2"
            | "RETRY_3"
            | "FAILED"
            | "SETTLED"
        );

        if (nextStatus === "FAILED") {
          // TODO: Send Slack alert to admin
          console.error(
            `[CRITICAL] Settlement ${settlementId} failed after all retries`
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Toss Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
