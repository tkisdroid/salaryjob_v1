"use server";

import { redirect } from "next/navigation";
import { requireWorker } from "@/lib/dal";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { sendChatMessage } from "@/lib/services/chat";

export async function sendWorkerChatMessage(formData: FormData) {
  const session = await requireWorker();
  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "");
  const result = await sendChatMessage(threadId, session.id, body);
  if (result.success) {
    safeRevalidate("/chat");
    safeRevalidate(`/chat/${threadId}`);
  }
  redirect(`/chat/${threadId}`);
}
