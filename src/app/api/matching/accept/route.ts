import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptUrgentMatch } from "@/lib/services/instant-matching";

const acceptSchema = z.object({
  postId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // TODO: Authenticate worker via Clerk
    // const { userId } = auth();

    const body = await request.json();
    const parsed = acceptSchema.parse(body);

    const result = await acceptUrgentMatch({
      postId: parsed.postId,
      workerId: "mock-worker-id", // TODO: from auth
      message: parsed.message,
    });

    return NextResponse.json({
      success: true,
      applicationId: result.application.id,
      chatRoomId: result.chatRoom.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";
    const isUserError =
      message.includes("\uC774\uBBF8") ||
      message.includes("\uB9C8\uAC10") ||
      message.includes("\uB9CC\uB8CC") ||
      message.includes("\uBAA8\uC9D1");

    return NextResponse.json(
      { error: message },
      { status: isUserError ? 409 : 500 }
    );
  }
}
