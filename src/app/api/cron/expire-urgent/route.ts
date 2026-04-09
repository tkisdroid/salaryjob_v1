import { NextRequest, NextResponse } from "next/server";
import { expireUrgentPosts } from "@/lib/services/instant-matching";

// Cron: every 1 minute, expire timed-out urgent posts
// vercel.json: { "path": "/api/cron/expire-urgent", "schedule": "* * * * *" }
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireUrgentPosts();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Cron: expire-urgent] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
