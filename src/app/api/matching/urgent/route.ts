import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUrgentPost } from "@/lib/services/instant-matching";

const urgentMatchSchema = z.object({
  postId: z.string().uuid(),
  radiusKm: z.number().min(0.5).max(10).default(2),
  timeoutMinutes: z.number().min(5).max(30).default(10),
});

export async function POST(request: NextRequest) {
  try {
    // TODO: Authenticate employer via Clerk
    // const { userId } = auth();

    const body = await request.json();
    const parsed = urgentMatchSchema.parse(body);

    const result = await createUrgentPost({
      ...parsed,
      employerId: "mock-employer-id", // TODO: from auth
    });

    return NextResponse.json({
      success: true,
      notifiedWorkers: result.notifiedWorkers,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[Urgent Match] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
