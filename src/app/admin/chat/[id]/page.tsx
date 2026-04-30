import { requireAdmin } from "@/lib/dal";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import ChatSessionDetail from "./chat-session-detail";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `상담 #${id.slice(0, 8)} | Admin` };
}

export default async function AdminChatSessionPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const session = await prisma.eduChatSession.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!session) notFound();

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <ChatSessionDetail sessionId={id} />
    </div>
  );
}
