"use client";

import { useState } from "react";
import {
  ChevronDown,
  Lightbulb,
  UtensilsCrossed,
  Truck,
  Briefcase,
  PartyPopper,
  ThumbsUp,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FirstGigGuideProps {
  readonly category: string;
  readonly isFirstGig: boolean;
}

interface CategoryTips {
  readonly label: string;
  readonly icon: React.ElementType;
  readonly tips: readonly string[];
}

// ---------------------------------------------------------------------------
// Tip Data
// ---------------------------------------------------------------------------

const CATEGORY_TIPS: Record<string, CategoryTips> = {
  food: {
    label: "카페/식당",
    icon: UtensilsCrossed,
    tips: [
      "주문 시스템은 사장님에게 먼저 물어보세요 — 매장마다 달라요",
      "복장: 깔끔한 캐주얼, 앞치마는 매장에서 제공해요",
      "인사: 먼저 인사하면 좋은 인상을 줄 수 있어요!",
      "바쁜 시간대(점심/저녁)에는 미리 10분 일찍 도착하세요",
    ],
  },
  logistics: {
    label: "물류/배송",
    icon: Truck,
    tips: [
      "편한 운동화와 움직이기 좋은 복장을 준비하세요",
      "물건 들 때 허리가 아니라 무릎을 굽혀서 들어올리세요",
      "배송 앱 사용법은 첫날 담당자가 알려줄 거예요",
      "수분 보충을 위해 물을 꼭 챙기세요",
    ],
  },
  office: {
    label: "사무/행정",
    icon: Briefcase,
    tips: [
      "비즈니스 캐주얼 복장으로 준비하세요",
      "PC 기본 프로그램(엑셀, 워드)은 미리 익혀두면 좋아요",
      "모르는 건 바로 질문하세요 — 혼자 판단하지 마세요",
      "첫날은 팀원 이름과 업무 흐름을 파악하는 게 핵심이에요",
    ],
  },
  event: {
    label: "행사/이벤트",
    icon: PartyPopper,
    tips: [
      "행사 당일엔 여유있게 30분 전 도착이 기본이에요",
      "복장 지정이 있는지 사전에 꼭 확인하세요",
      "행사장에서는 밝은 표정과 적극적인 태도가 중요해요",
      "긴급 상황 시 담당 매니저에게 바로 보고하세요",
    ],
  },
};

// Fallback for unmapped categories
const DEFAULT_TIPS: CategoryTips = {
  label: "일반",
  icon: Sparkles,
  tips: [
    "첫 출근 10분 전에 도착하면 좋은 인상을 줄 수 있어요",
    "모르는 건 적극적으로 질문하세요 — 당연한 거예요!",
    "깔끔한 복장과 밝은 인사가 첫인상의 80%예요",
  ],
};

// ---------------------------------------------------------------------------
// Accordion Item
// ---------------------------------------------------------------------------

function TipSection({
  tips,
  icon: Icon,
  label,
  isOpen,
  onToggle,
}: {
  readonly tips: readonly string[];
  readonly icon: React.ElementType;
  readonly label: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-brand" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          {tips.map((tip) => (
            <div key={tip} className="flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function FirstGigGuide({ category, isFirstGig }: FirstGigGuideProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    // Auto-open the matching category
    return new Set([category]);
  });
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  if (!isFirstGig) return null;

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  // Determine which categories to show: matched one first, then others
  const matchedTips = CATEGORY_TIPS[category] ?? DEFAULT_TIPS;
  const otherCategories = Object.entries(CATEGORY_TIPS).filter(
    ([key]) => key !== category
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand" />
          첫 근무 가이드
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          첫 근무라면 이 팁들을 꼭 확인하세요!
        </p>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Primary category tips (auto-expanded) */}
        <TipSection
          tips={matchedTips.tips}
          icon={matchedTips.icon}
          label={matchedTips.label}
          isOpen={openSections.has(category)}
          onToggle={() => toggleSection(category)}
        />

        {/* Other category tips */}
        {otherCategories.map(([key, data]) => (
          <TipSection
            key={key}
            tips={data.tips}
            icon={data.icon}
            label={data.label}
            isOpen={openSections.has(key)}
            onToggle={() => toggleSection(key)}
          />
        ))}

        {/* Feedback button */}
        <div className="pt-2">
          {feedbackGiven ? (
            <p className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4" />
              감사합니다! 피드백이 반영됐어요
            </p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setFeedbackGiven(true)}
            >
              <ThumbsUp className="w-4 h-4" />
              도움이 되었어요
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
