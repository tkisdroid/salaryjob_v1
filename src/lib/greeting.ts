/**
 * Time-of-day aware greeting pool for /home header. Rotates variants per
 * render so a returning worker sees a fresh line while keeping the tone
 * consistent with the current hour (based on Asia/Seoul local time).
 */

type Slot =
  | "dawn"
  | "morning"
  | "forenoon"
  | "noon"
  | "afternoon"
  | "evening"
  | "night";

const GREETINGS: Record<Slot, readonly string[]> = {
  dawn: [
    "고요한 새벽이에요",
    "아직 깨어 계셨군요",
    "늦은 시간, 무리하지 마세요",
  ],
  morning: [
    "좋은 아침이에요",
    "상쾌한 아침입니다",
    "잘 주무셨어요?",
  ],
  forenoon: [
    "활기찬 오전이에요",
    "오늘 하루도 시작됐어요",
    "멋진 하루 보내세요",
  ],
  noon: [
    "든든하게 드셨나요?",
    "점심 맛있게 드세요",
    "기분 좋은 점심시간이에요",
  ],
  afternoon: [
    "산뜻한 오후입니다",
    "오후도 화이팅이에요",
    "남은 하루도 힘내세요",
  ],
  evening: [
    "고생 많으셨어요",
    "포근한 저녁이에요",
    "수고한 하루예요",
  ],
  night: [
    "편안한 밤 되세요",
    "오늘도 수고하셨어요",
    "좋은 밤이에요",
  ],
};

const EMOJIS: Record<Slot, string> = {
  dawn: "🌙",
  morning: "🌅",
  forenoon: "☀️",
  noon: "🍽️",
  afternoon: "🌤️",
  evening: "🌆",
  night: "🌙",
};

function getSlot(hour: number): Slot {
  if (hour < 5) return "dawn";
  if (hour < 10) return "morning";
  if (hour < 12) return "forenoon";
  if (hour < 14) return "noon";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

function getSeoulHour(now: Date): number {
  // Intl resolves the timezone shift server-side regardless of the
  // process timezone (Vercel is UTC by default).
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const h = Number(hourStr);
  return Number.isFinite(h) ? h % 24 : 0;
}

export function pickGreeting(now: Date = new Date()): {
  greeting: string;
  emoji: string;
} {
  const slot = getSlot(getSeoulHour(now));
  const pool = GREETINGS[slot];
  const greeting = pool[Math.floor(Math.random() * pool.length)]!;
  return { greeting, emoji: EMOJIS[slot] };
}
