"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { deleteJob } from "../actions";

export function DeleteJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteJob(jobId);
      if ("success" in result) {
        toast.success("공고가 삭제되었습니다");
        router.push("/biz/posts");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-destructive/30 bg-surface px-3.5 text-[12.5px] font-bold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {isPending ? "삭제 중..." : "삭제"}
    </button>
  );
}
