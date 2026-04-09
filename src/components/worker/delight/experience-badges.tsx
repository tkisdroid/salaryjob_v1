import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Briefcase,
  PartyPopper,
  Sparkles,
  GraduationCap,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Experience {
  readonly category: string;
  readonly count: number;
}

interface ExperienceBadgesProps {
  readonly experiences: readonly Experience[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type BadgeLevel = "bronze" | "silver" | "gold" | "platinum";

const BADGE_LEVEL_CONFIG: Record<BadgeLevel, { label: string; bgClass: string; textClass: string; ringClass: string }> = {
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
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    ringClass: "ring-amber-400",
  },
  platinum: {
    label: "플래티넘",
    bgClass: "bg-brand-light",
    textClass: "text-brand",
    ringClass: "ring-brand",
  },
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "음식점·카페": UtensilsCrossed,
  "카페": UtensilsCrossed,
  "식당": UtensilsCrossed,
  "판매·유통": ShoppingBag,
  "편의점": ShoppingBag,
  "물류·배송": Truck,
  "물류": Truck,
  "배송": Truck,
  "사무·행정": Briefcase,
  "사무": Briefcase,
  "행사·이벤트": PartyPopper,
  "행사": PartyPopper,
  "청소·정리": Sparkles,
  "교육·과외": GraduationCap,
  "IT·디자인": Monitor,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBadgeLevel(count: number): BadgeLevel {
  if (count >= 10) return "platinum";
  if (count >= 6) return "gold";
  if (count >= 3) return "silver";
  return "bronze";
}

function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Sparkles;
}

function getTooltipText(category: string, count: number): string {
  return `${category} ${count}회 완료`;
}

// ---------------------------------------------------------------------------
// Badge Component
// ---------------------------------------------------------------------------

function ExperienceBadge({
  category,
  count,
}: {
  readonly category: string;
  readonly count: number;
}) {
  const level = getBadgeLevel(count);
  const config = BADGE_LEVEL_CONFIG[level];
  const Icon = getCategoryIcon(category);
  const tooltip = getTooltipText(category, count);

  return (
    <div className="flex flex-col items-center gap-1.5 group" title={tooltip}>
      {/* Circular badge */}
      <div
        className={cn(
          "relative flex items-center justify-center w-16 h-16 rounded-full ring-2 transition-transform group-hover:scale-105",
          config.bgClass,
          config.ringClass
        )}
      >
        <Icon className={cn("w-6 h-6", config.textClass)} />

        {/* Count badge */}
        <span
          className={cn(
            "absolute -top-1 -right-1 flex items-center justify-center",
            "min-w-5 h-5 rounded-full text-[10px] font-bold px-1",
            config.bgClass,
            config.textClass,
            "ring-2 ring-background"
          )}
        >
          {count}
        </span>
      </div>

      {/* Category name */}
      <span className="text-xs text-muted-foreground font-medium text-center leading-tight max-w-[72px]">
        {category}
      </span>

      {/* Level label */}
      <span
        className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
          config.bgClass,
          config.textClass
        )}
      >
        {config.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component (Server Component)
// ---------------------------------------------------------------------------

export function ExperienceBadges({ experiences }: ExperienceBadgesProps) {
  if (experiences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          아직 근무 경험이 없어요
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          첫 근무를 시작해보세요!
        </p>
      </div>
    );
  }

  // Sort by count descending
  const sorted = [...experiences].sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-4 gap-4 justify-items-center">
      {sorted.map((exp) => (
        <ExperienceBadge
          key={exp.category}
          category={exp.category}
          count={exp.count}
        />
      ))}
    </div>
  );
}
