import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(10, "Invalid FCM token"),
  platform: z.enum(["web", "android", "ios"]).default("web"),
});

// Register or update FCM push token for a user
export async function POST(request: NextRequest) {
  try {
    // TODO: Authenticate via Clerk
    // const { userId } = auth();
    const userId = "mock-user-id";

    const body = await request.json();
    const { token, platform } = registerSchema.parse(body);

    // Store token in user notification preferences
    // For now, store in notification data field as there's no dedicated token table
    // TODO: Create a push_tokens table for production
    console.log(`[FCM] Registered token for user ${userId}: ${token.slice(0, 20)}... (${platform})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
