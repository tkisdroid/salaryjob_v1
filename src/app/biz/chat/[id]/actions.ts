"use server";

import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/dal";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { sendChatMessage } from "@/lib/services/chat";

export async function sendBusinessChatMessage(formData: FormData) {
  const session = await requireBusiness();
  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "");
  const result = await sendChatMessage(threadId, session.id, body);
  if (result.success) {
    safeRevalidate("/biz/chat");
    safeRevalidate(`/biz/chat/${threadId}`);
  }
  redirect(`/biz/chat/${threadId}`);
}
