import { verifySession } from "@/lib/dal";
import { selectRole } from "./actions";
import { Button } from "@/components/ui/button";
import { CeleryMark } from "@/components/brand/celery-mark";

export default async function RoleSelectPage() {
  await verifySession();

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-[18px] border border-border bg-surface">
          <CeleryMark className="h-8 w-8 text-brand" />
        </span>
        <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          역할 선택
        </h1>
        <p className="mt-1.5 text-[12.5px] font-semibold tracking-tight text-muted-foreground">
          샐러리잡을 어떻게 사용하실 건가요?
        </p>
      </div>

      <div className="rounded-[28px] border border-border-soft bg-surface p-6 shadow-soft-md">
        <div className="space-y-3">
          <form action={selectRole}>
            <input type="hidden" name="role" value="WORKER" />
            <Button type="submit" size="lg" className="w-full">
              🙋 일하고 싶어요 (Worker)
            </Button>
          </form>
          <form action={selectRole}>
            <input type="hidden" name="role" value="BUSINESS" />
            <Button
              type="submit"
              variant="ghost-premium"
              size="lg"
              className="w-full"
            >
              🏢 사람을 구해요 (Business)
            </Button>
          </form>
          <form action={selectRole}>
            <input type="hidden" name="role" value="BOTH" />
            <Button
              type="submit"
              variant="ghost"
              size="lg"
              className="w-full"
            >
              양쪽 다 사용해요 (Both)
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
