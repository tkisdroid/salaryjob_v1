import {
  Briefcase,
  GraduationCap,
  Monitor,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Experience {
  readonly category: string;
  readonly count: number;
}

interface ExperienceBadgesProps {
  readonly experiences: readonly Experience[];
}

type BadgeLevel = "bronze" | "silver" | "gold" | "platinum";

const BADGE_LEVEL_CONFIG: Record<
  BadgeLevel,
  { label: string; bgClass: string; textClass: string; ringClass: string }
> = {
  bronze: {
    label: "브론즈",
    bgClass: "bg-stone-200",
    textClass: "text-stone-700",
    ringClass: "ring-stone-300",
  },
  silver: {
    label: "실버",
    bgClass: "bg-gray-200",
    textClass: "text-gray-700",
    ringClass: "ring-gray-400",
  },
  gold: {
    label: "골드",
    bgClass: "bg-brand",
    textClass: "text-white",
    ringClass: "ring-brand-dark",
  },
  platinum: {
    label: "플래티넘",
    bgClass: "bg-brand-light",
    textClass: "text-brand",
    ringClass: "ring-brand",
  },
};

function getBadgeLevel(count: number): BadgeLevel {
  if (count >= 10) return "platinum";
  if (count >= 6) return "gold";
  if (count >= 3) return "silver";
  return "bronze";
}

function renderCategoryIcon(category: string, className: string) {
  switch (category) {
    case "음식·서빙":
    case "카페":
    case "식당":
      return <UtensilsCrossed className={className} />;
    case "매장·유통":
    case "편의점":
      return <ShoppingBag className={className} />;
    case "물류·배송":
    case "물류":
    case "배송":
      return <Truck className={className} />;
    case "사무·행정":
    case "사무":
      return <Briefcase className={className} />;
    case "행사·이벤트":
    case "행사":
      return <PartyPopper className={className} />;
    case "교육·과외":
      return <GraduationCap className={className} />;
    case "IT·개발":
      return <Monitor className={className} />;
    case "청소·정리":
    default:
      return <Sparkles className={className} />;
  }
}

function getTooltipText(category: string, count: number): string {
  return `${category} ${count}회 완료`;
}

function ExperienceBadge({
  category,
  count,
}: {
  readonly category: string;
  readonly count: number;
}) {
  const level = getBadgeLevel(count);
  const config = BADGE_LEVEL_CONFIG[level];
  const tooltip = getTooltipText(category, count);

  return (
    <div className="group flex flex-col items-center gap-1.5" title={tooltip}>
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full ring-2 transition-transform group-hover:scale-105",
          config.bgClass,
          config.ringClass,
        )}
      >
        {renderCategoryIcon(category, cn("h-6 w-6", config.textClass))}
        <span
          className={cn(
            "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            config.bgClass,
            config.textClass,
            "ring-2 ring-background",
          )}
        >
          {count}
        </span>
      </div>

      <span className="max-w-[72px] text-center text-xs font-medium leading-tight text-muted-foreground">
        {category}
      </span>

      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          config.bgClass,
          config.textClass,
        )}
      >
        {config.label}
      </span>
    </div>
  );
}

export function ExperienceBadges({ experiences }: ExperienceBadgesProps) {
  if (experiences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          아직 근무 경험이 없어요.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          첫 근무를 시작해보세요!
        </p>
      </div>
    );
  }

  const sorted = [...experiences].sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-4 justify-items-center gap-4">
      {sorted.map((experience) => (
        <ExperienceBadge
          key={experience.category}
          category={experience.category}
          count={experience.count}
        />
      ))}
    </div>
  );
}
