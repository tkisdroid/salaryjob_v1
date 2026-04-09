import { NextRequest, NextResponse } from "next/server";
import {
  autoApproveExpiredSettlements,
  processSettlement,
} from "@/lib/services/settlement";

// Cron job: auto-approve settlements where employer hasn't responded in 2 hours
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/auto-approve", "schedule": "*/10 * * * *" }] }
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Auto-approve pending settlements
    const approved = await autoApproveExpiredSettlements();

    // Step 2: Process newly approved settlements
    const processed: Array<{
      id: string;
      success: boolean;
      error?: string;
    }> = [];
    for (const item of approved.filter((a) => a.success)) {
      try {
        await processSettlement(item.id);
        processed.push({ id: item.id, success: true });
      } catch (error) {
        processed.push({ id: item.id, success: false, error: String(error) });
      }
    }

    return NextResponse.json({
      autoApproved: approved.length,
      processed: processed.length,
      results: { approved, processed },
    });
  } catch (error) {
    console.error("[Cron: auto-approve] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
