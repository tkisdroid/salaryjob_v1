export const APP_NAME = "GigNow"
export const APP_DESCRIPTION = "내가 원할 때, 내 근처에서, 바로 일하기"
export const MINIMUM_WAGE_KR = 10030 // 2026 Korean minimum wage

export const POST_TYPES = { JOB_OFFER: "job_offer", JOB_SEEK: "job_seek", FREE: "free" } as const
export const PAY_TYPES = { HOURLY: "hourly", DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly", PER_TASK: "per_task", TOTAL: "total", NEGOTIABLE: "negotiable", VOLUNTEER: "volunteer" } as const
export const LOCATION_TYPES = { ONSITE: "onsite", REMOTE: "remote", ONLINE: "online", HYBRID: "hybrid", NEGOTIABLE: "negotiable", TRAVEL: "travel" } as const

export const CATEGORIES = [
  { id: "food", label: "음식점·카페", color: "#d97706", icon: "UtensilsCrossed" },
  { id: "retail", label: "판매·유통", color: "#7c3aed", icon: "ShoppingBag" },
  { id: "logistics", label: "물류·배송", color: "#0369a1", icon: "Truck" },
  { id: "office", label: "사무·행정", color: "#57534e", icon: "Briefcase" },
  { id: "event", label: "행사·이벤트", color: "#be185d", icon: "PartyPopper" },
  { id: "cleaning", label: "청소·정리", color: "#0d9488", icon: "Sparkles" },
  { id: "education", label: "교육·과외", color: "#ca8a04", icon: "GraduationCap" },
  { id: "tech", label: "IT·디자인", color: "#4f46e5", icon: "Monitor" },
] as const

export const WORKER_NAV_ITEMS = [
  { href: "/", icon: "Home", label: "홈" },
  { href: "/explore", icon: "Search", label: "탐색" },
  { href: "/my/availability", icon: "Clock", label: "시간등록", isFab: true },
  { href: "/chat", icon: "MessageCircle", label: "채팅" },
  { href: "/my", icon: "User", label: "MY" },
] as const

export const BIZ_NAV_ITEMS = [
  { href: "/biz", icon: "LayoutDashboard", label: "홈" },
  { href: "/biz/posts", icon: "FileText", label: "공고" },
  { href: "/biz/workers", icon: "Users", label: "인재" },
  { href: "/biz/settlements", icon: "Wallet", label: "정산" },
  { href: "/biz/chat", icon: "MessageCircle", label: "채팅" },
  { href: "/biz/settings", icon: "Settings", label: "설정" },
] as const
