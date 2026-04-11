// Phase 5 Plan 06 — extracted from src/lib/mock-data.ts to detach
// prisma/seed.ts from the src/ mock-data module (DATA-05 exit gate).
// This file is NOT imported from any src/ code — prisma seed only.

// Type aliases to keep seed self-contained (no src/ dependency).
export type JobCategory =
  | "food"
  | "retail"
  | "logistics"
  | "office"
  | "event"
  | "cleaning"
  | "education"
  | "tech";

export interface SeedBusiness {
  id: string;
  name: string;
  category: JobCategory;
  logo: string;
  address: string;
  addressDetail: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  completionRate: number;
  photos: string[];
  verified: boolean;
  description: string;
}

export interface SeedJob {
  id: string;
  businessId: string;
  business: SeedBusiness;
  title: string;
  category: JobCategory;
  description: string;
  duties: string[];
  requirements: string[];
  dressCode: string;
  whatToBring: string[];
  hourlyPay: number;
  transportFee: number;
  workDate: string; // ISO date "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  workHours: number;
  headcount: number;
  filled: number;
  isUrgent: boolean;
  isNew: boolean;
  distanceM: number;
  appliedCount: number;
  tags: string[];
  nightShiftAllowance: boolean;
}

export interface SeedApplication {
  id: string;
  jobId: string;
  job: SeedJob;
  status: "confirmed" | "in_progress" | "checked_in" | "completed" | "cancelled" | "settled";
  appliedAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  actualHours: number | null;
  earnings: number | null;
  settlementStatus: "pending" | "settled" | null;
  settledAt: string | null;
  reviewGiven: boolean;
  reviewReceived: boolean;
}

export interface SeedWorker {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  badgeLevel: "newbie" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
  rating: number;
  totalJobs: number;
  noShowCount: number;
  completionRate: number;
  verifiedId: boolean;
  verifiedPhone: boolean;
  preferredCategories: JobCategory[];
  skills: string[];
  bio: string;
  totalEarnings: number;
  thisMonthEarnings: number;
}

// ============================================================================
// Sample businesses (verbatim from former src/lib/mock-data.ts)
// ============================================================================

export const MOCK_BUSINESSES: SeedBusiness[] = [
  {
    id: "biz-1",
    name: "스타벅스 역삼점",
    category: "food",
    logo: "☕",
    address: "서울 강남구 역삼동 737",
    addressDetail: "2층",
    lat: 37.5009,
    lng: 127.0374,
    rating: 4.8,
    reviewCount: 342,
    completionRate: 98,
    photos: ["/photos/cafe-1.jpg", "/photos/cafe-2.jpg"],
    verified: true,
    description:
      "강남역 3번 출구 도보 2분. 활기찬 분위기의 카페에서 함께 일해요.",
  },
  {
    id: "biz-2",
    name: "쿠팡 송파 물류센터",
    category: "logistics",
    logo: "📦",
    address: "서울 송파구 문정동 84",
    addressDetail: "쿠팡 물류센터 B동",
    lat: 37.4853,
    lng: 127.1226,
    rating: 4.5,
    reviewCount: 1283,
    completionRate: 96,
    photos: [],
    verified: true,
    description: "에어컨 완비, 식사 제공. 초보도 환영합니다.",
  },
  {
    id: "biz-3",
    name: "이마트 성수점",
    category: "retail",
    logo: "🛒",
    address: "서울 성동구 성수동2가 333",
    addressDetail: "지하 1층 식품관",
    lat: 37.5445,
    lng: 127.0557,
    rating: 4.7,
    reviewCount: 567,
    completionRate: 97,
    photos: [],
    verified: true,
    description: "주말 시식 행사 아르바이트. 친절한 점장님과 함께 일해요.",
  },
  {
    id: "biz-4",
    name: "롯데호텔 서울",
    category: "event",
    logo: "🎪",
    address: "서울 중구 을지로 30",
    addressDetail: "크리스탈볼룸",
    lat: 37.5651,
    lng: 126.9815,
    rating: 4.9,
    reviewCount: 89,
    completionRate: 100,
    photos: [],
    verified: true,
    description: "웨딩 홀 서빙. 정장 제공, 식사 포함.",
  },
  {
    id: "biz-5",
    name: "메가커피 홍대점",
    category: "food",
    logo: "☕",
    address: "서울 마포구 서교동 357",
    addressDetail: "1층",
    lat: 37.5563,
    lng: 126.9236,
    rating: 4.6,
    reviewCount: 211,
    completionRate: 95,
    photos: [],
    verified: true,
    description: "홍대입구역 9번 출구 도보 3분.",
  },
  {
    id: "biz-6",
    name: "CJ 프레시웨이 센터",
    category: "logistics",
    logo: "🚚",
    address: "경기 광주시 오포읍",
    addressDetail: "피킹 A라인",
    lat: 37.3654,
    lng: 127.2128,
    rating: 4.4,
    reviewCount: 876,
    completionRate: 94,
    photos: [],
    verified: true,
    description: "야간 피킹 업무. 심야 할증 자동 적용.",
  },
  {
    id: "biz-7",
    name: "올리브영 명동점",
    category: "retail",
    logo: "💄",
    address: "서울 중구 명동길 52",
    addressDetail: "",
    lat: 37.5635,
    lng: 126.984,
    rating: 4.7,
    reviewCount: 445,
    completionRate: 97,
    photos: [],
    verified: true,
    description: "명동 메인 스토어. 외국어 가능자 우대.",
  },
  {
    id: "biz-8",
    name: "코엑스 컨벤션",
    category: "event",
    logo: "🎤",
    address: "서울 강남구 영동대로 513",
    addressDetail: "D홀",
    lat: 37.5115,
    lng: 127.0595,
    rating: 4.8,
    reviewCount: 156,
    completionRate: 99,
    photos: [],
    verified: true,
    description: "박람회 안내 및 부스 보조.",
  },
];

// ============================================================================
// Date helpers (self-contained — no src/ imports)
// ============================================================================

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const _today = new Date();
const _tomorrow = new Date(_today);
_tomorrow.setDate(_today.getDate() + 1);
const _dayAfter = new Date(_today);
_dayAfter.setDate(_today.getDate() + 2);
const _nextWeek = new Date(_today);
_nextWeek.setDate(_today.getDate() + 7);

// ============================================================================
// Sample jobs (verbatim from former src/lib/mock-data.ts)
// ============================================================================

export const MOCK_JOBS: SeedJob[] = [
  {
    id: "job-1",
    businessId: "biz-1",
    business: MOCK_BUSINESSES[0],
    title: "주말 카페 바리스타 보조",
    category: "food",
    description:
      "주문 받기, 음료 제조 보조, 매장 정리를 함께 해주실 분을 찾습니다.",
    duties: [
      "POS 주문 접수",
      "음료 재료 준비",
      "매장 정리 및 청소",
      "고객 응대",
    ],
    requirements: ["18세 이상", "2시간 이상 서서 근무 가능"],
    dressCode: "검정 상의 + 어두운 색 바지",
    whatToBring: ["신분증", "마스크"],
    hourlyPay: 13000,
    transportFee: 3000,
    workDate: isoDate(_today),
    startTime: "10:00",
    endTime: "15:00",
    workHours: 5,
    headcount: 2,
    filled: 0,
    isUrgent: true,
    isNew: true,
    distanceM: 800,
    appliedCount: 3,
    tags: ["당일", "초보환영", "교통비별도"],
    nightShiftAllowance: false,
  },
  {
    id: "job-2",
    businessId: "biz-2",
    business: MOCK_BUSINESSES[1],
    title: "물류 피킹 (포장)",
    category: "logistics",
    description:
      "주문서에 따라 상품을 피킹하고 포장합니다. 쉬운 업무, 초보 환영.",
    duties: ["주문서 확인", "상품 피킹", "포장 및 라벨링"],
    requirements: ["10kg 이상 상자 들기 가능"],
    dressCode: "편한 복장, 운동화",
    whatToBring: ["신분증", "장갑(지급 가능)"],
    hourlyPay: 12500,
    transportFee: 5000,
    workDate: isoDate(_tomorrow),
    startTime: "09:00",
    endTime: "18:00",
    workHours: 8,
    headcount: 5,
    filled: 2,
    isUrgent: false,
    isNew: true,
    distanceM: 3200,
    appliedCount: 8,
    tags: ["식사제공", "에어컨완비"],
    nightShiftAllowance: false,
  },
  {
    id: "job-3",
    businessId: "biz-3",
    business: MOCK_BUSINESSES[2],
    title: "주말 시식 판촉 도우미",
    category: "retail",
    description: "식품관에서 고객에게 시식 및 제품 설명을 진행합니다.",
    duties: ["시식 제공", "제품 설명", "고객 응대"],
    requirements: ["친화력 있는 분", "4시간 서서 근무 가능"],
    dressCode: "흰 상의 + 앞치마 지급",
    whatToBring: ["신분증"],
    hourlyPay: 14000,
    transportFee: 3000,
    workDate: isoDate(_dayAfter),
    startTime: "11:00",
    endTime: "17:00",
    workHours: 6,
    headcount: 3,
    filled: 1,
    isUrgent: false,
    isNew: false,
    distanceM: 2500,
    appliedCount: 5,
    tags: ["시급높음", "주말"],
    nightShiftAllowance: false,
  },
  {
    id: "job-4",
    businessId: "biz-4",
    business: MOCK_BUSINESSES[3],
    title: "웨딩 홀 서빙 스태프",
    category: "event",
    description:
      "호텔 웨딩홀에서 음식 서빙 및 테이블 정리를 담당합니다. 정장 제공.",
    duties: ["음식 서빙", "테이블 세팅", "테이블 정리"],
    requirements: ["깔끔한 용모", "서빙 경험자 우대"],
    dressCode: "정장 지급 (블랙)",
    whatToBring: ["신분증", "검정 구두"],
    hourlyPay: 16000,
    transportFee: 5000,
    workDate: isoDate(_dayAfter),
    startTime: "10:00",
    endTime: "16:00",
    workHours: 6,
    headcount: 8,
    filled: 5,
    isUrgent: false,
    isNew: false,
    distanceM: 4100,
    appliedCount: 12,
    tags: ["고시급", "식사제공", "정장지급"],
    nightShiftAllowance: false,
  },
  {
    id: "job-5",
    businessId: "biz-5",
    business: MOCK_BUSINESSES[4],
    title: "카페 평일 오전 바리스타",
    category: "food",
    description: "간단한 에스프레소 머신 사용법만 알면 가능합니다.",
    duties: ["음료 제조", "주문 접수", "매장 정리"],
    requirements: ["18세 이상"],
    dressCode: "검정 상의",
    whatToBring: ["신분증"],
    hourlyPay: 12500,
    transportFee: 2000,
    workDate: isoDate(_tomorrow),
    startTime: "07:00",
    endTime: "12:00",
    workHours: 5,
    headcount: 1,
    filled: 0,
    isUrgent: true,
    isNew: true,
    distanceM: 5800,
    appliedCount: 2,
    tags: ["당일", "초보환영"],
    nightShiftAllowance: false,
  },
  {
    id: "job-6",
    businessId: "biz-6",
    business: MOCK_BUSINESSES[5],
    title: "야간 물류 피킹 (22:00~06:00)",
    category: "logistics",
    description:
      "야간 시간대 물류 피킹 업무. 심야 할증 50% 자동 적용, 식사 제공.",
    duties: ["피킹", "분류", "이동"],
    requirements: ["야간 근무 가능자", "20kg 이상 들기 가능"],
    dressCode: "편한 복장",
    whatToBring: ["신분증"],
    hourlyPay: 13500,
    transportFee: 8000,
    workDate: isoDate(_tomorrow),
    startTime: "22:00",
    endTime: "06:00",
    workHours: 8,
    headcount: 10,
    filled: 3,
    isUrgent: true,
    isNew: false,
    distanceM: 12400,
    appliedCount: 7,
    tags: ["심야할증", "식사제공", "교통비"],
    nightShiftAllowance: true,
  },
  {
    id: "job-7",
    businessId: "biz-7",
    business: MOCK_BUSINESSES[6],
    title: "올리브영 매장 보조",
    category: "retail",
    description: "상품 진열, 재고 정리, 고객 응대 보조.",
    duties: ["진열", "재고 정리", "고객 응대"],
    requirements: ["친절한 서비스 마인드"],
    dressCode: "올리브영 조끼 지급",
    whatToBring: ["신분증"],
    hourlyPay: 12500,
    transportFee: 3000,
    workDate: isoDate(_nextWeek),
    startTime: "13:00",
    endTime: "19:00",
    workHours: 6,
    headcount: 2,
    filled: 0,
    isUrgent: false,
    isNew: true,
    distanceM: 6200,
    appliedCount: 1,
    tags: ["초보환영"],
    nightShiftAllowance: false,
  },
  {
    id: "job-8",
    businessId: "biz-8",
    business: MOCK_BUSINESSES[7],
    title: "박람회 부스 안내 도우미",
    category: "event",
    description: "참관객에게 부스 안내 및 팸플릿 배포.",
    duties: ["안내", "팸플릿 배포", "리셉션"],
    requirements: ["단정한 용모"],
    dressCode: "흰 상의 + 검정 바지",
    whatToBring: ["신분증", "검정 구두"],
    hourlyPay: 15000,
    transportFee: 5000,
    workDate: isoDate(_nextWeek),
    startTime: "09:00",
    endTime: "18:00",
    workHours: 8,
    headcount: 6,
    filled: 2,
    isUrgent: false,
    isNew: true,
    distanceM: 1500,
    appliedCount: 4,
    tags: ["고시급", "식사제공"],
    nightShiftAllowance: false,
  },
];

// ============================================================================
// Sample worker profile (for kim-jihoon seed account)
// ============================================================================

export const MOCK_CURRENT_WORKER: SeedWorker = {
  id: "worker-me",
  name: "김지훈",
  nickname: "지훈",
  avatar: "🙂",
  badgeLevel: "silver",
  rating: 4.8,
  totalJobs: 23,
  noShowCount: 0,
  completionRate: 100,
  verifiedId: true,
  verifiedPhone: true,
  preferredCategories: ["food", "retail"],
  skills: ["커피 제조", "서빙", "POS"],
  bio: "성실하게 일하는 대학생입니다.",
  totalEarnings: 1840000,
  thisMonthEarnings: 420000,
};

// ============================================================================
// Sample applications (kim-jihoon schedule)
// Phase 5 Plan 06: past-job fixtures changed from 'completed' → 'settled'
// to match Plan 02's ApplicationStatus.settled enum value.
// ============================================================================

export const MOCK_APPLICATIONS: SeedApplication[] = [
  {
    id: "app-1",
    jobId: "job-1",
    job: MOCK_JOBS[0],
    status: "confirmed",
    appliedAt: new Date().toISOString(),
    checkInAt: null,
    checkOutAt: null,
    actualHours: null,
    earnings: null,
    settlementStatus: null,
    settledAt: null,
    reviewGiven: false,
    reviewReceived: false,
  },
  {
    id: "app-2",
    jobId: "job-2",
    job: MOCK_JOBS[1],
    status: "confirmed",
    appliedAt: new Date(Date.now() - 3600000).toISOString(),
    checkInAt: null,
    checkOutAt: null,
    actualHours: null,
    earnings: null,
    settlementStatus: null,
    settledAt: null,
    reviewGiven: false,
    reviewReceived: false,
  },
  // Past completed jobs — status changed from 'completed' to 'settled' (Phase 5 Plan 06)
  {
    // Phase 5 review-flow sandbox: left un-reviewed so the worker can exercise
    // the review form at /my/applications/<id>/review and the biz side can
    // exercise /biz/posts/<jobId>/applicants/<appId>/review on a freshly
    // seeded DB. The other two past apps (app-past-2, app-past-3) stay fully
    // reviewed so the settlements list still shows a realistic mix.
    id: "app-past-1",
    jobId: "job-3",
    job: MOCK_JOBS[2],
    status: "settled",
    appliedAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    checkInAt: new Date(Date.now() - 6 * 24 * 3600000).toISOString(),
    checkOutAt: new Date(Date.now() - 6 * 24 * 3600000 + 6 * 3600000).toISOString(),
    actualHours: 6,
    earnings: 84000 + 3000,
    settlementStatus: "settled",
    settledAt: new Date(Date.now() - 6 * 24 * 3600000 + 7 * 3600000).toISOString(),
    reviewGiven: false,
    reviewReceived: false,
  },
  {
    id: "app-past-2",
    jobId: "job-5",
    job: MOCK_JOBS[4],
    status: "settled",
    appliedAt: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    checkInAt: new Date(Date.now() - 13 * 24 * 3600000).toISOString(),
    checkOutAt: new Date(Date.now() - 13 * 24 * 3600000 + 5 * 3600000).toISOString(),
    actualHours: 5,
    earnings: 62500 + 2000,
    settlementStatus: "settled",
    settledAt: new Date(Date.now() - 13 * 24 * 3600000 + 6 * 3600000).toISOString(),
    reviewGiven: true,
    reviewReceived: true,
  },
  {
    id: "app-past-3",
    jobId: "job-4",
    job: MOCK_JOBS[3],
    status: "settled",
    appliedAt: new Date(Date.now() - 21 * 24 * 3600000).toISOString(),
    checkInAt: new Date(Date.now() - 20 * 24 * 3600000).toISOString(),
    checkOutAt: new Date(Date.now() - 20 * 24 * 3600000 + 6 * 3600000).toISOString(),
    actualHours: 6,
    earnings: 96000 + 5000,
    settlementStatus: "settled",
    settledAt: new Date(Date.now() - 20 * 24 * 3600000 + 7 * 3600000).toISOString(),
    reviewGiven: true,
    reviewReceived: true,
  },
];
