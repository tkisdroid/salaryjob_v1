import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export interface SettlementCardProps {
  side: "worker" | "biz";
  jobTitle: string;
  counterpartyName: string; // biz name (worker view) or worker nickname (biz view)
  checkOutAt: Date | string | null;
  earnings: number;
  settlementStatus: "settled" | null;
}

export function SettlementCard({
  side,
  jobTitle,
  counterpartyName,
  checkOutAt,
  earnings,
  settlementStatus,
}: SettlementCardProps) {
  const dt = checkOutAt
    ? typeof checkOutAt === "string"
      ? new Date(checkOutAt)
      : checkOutAt
    : null;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{jobTitle}</h3>
            <p className="text-xs text-muted-foreground">
              {side === "worker" ? counterpartyName : `근무자: ${counterpartyName}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {dt ? format(dt, "yyyy-MM-dd HH:mm", { locale: ko }) : "-"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">
              {earnings.toLocaleString("ko-KR")}원
            </p>
            {settlementStatus === "settled" && (
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                정산 완료
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
