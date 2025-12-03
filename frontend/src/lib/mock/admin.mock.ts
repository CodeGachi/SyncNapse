/**
 * 관리자 기능 Mock 데이터
 * 환경변수 NEXT_PUBLIC_USE_MOCK_API=true 일 때 사용
 */

import type {
  AdminUser,
  AdminUserDetail,
  UserActivity,
  DashboardStats,
  ServerStatus,
  Alert,
  Plan,
  PlanFeature,
  PlanHistory,
  SubscriptionStats,
  RevenueData,
  SubscriberData,
  PlanAnalytics,
  ChurnAnalysis,
  Subscription,
  PlanDistribution,
} from "../api/types/admin.types";

// ============ 사용자 Mock 데이터 ============
export const mockUsers: AdminUser[] = [
  {
    id: "user-001",
    email: "admin@syncnapse.com",
    name: "시스템 관리자",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    role: "admin",
    status: "active",
    createdAt: "2024-01-15T09:00:00Z",
    lastLoginAt: "2024-12-01T08:30:00Z",
  },
  {
    id: "user-002",
    email: "operator@syncnapse.com",
    name: "운영자",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=operator",
    role: "operator",
    status: "active",
    createdAt: "2024-02-20T14:00:00Z",
    lastLoginAt: "2024-11-30T16:45:00Z",
  },
  {
    id: "user-003",
    email: "kim.teacher@school.edu",
    name: "김선생",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=kim",
    role: "user",
    status: "active",
    createdAt: "2024-03-10T10:30:00Z",
    lastLoginAt: "2024-12-01T07:15:00Z",
    subscription: {
      planId: "plan-educator-pro",
      planName: "Educator Pro",
      status: "active",
    },
  },
  {
    id: "user-004",
    email: "lee.student@university.ac.kr",
    name: "이학생",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=lee",
    role: "user",
    status: "active",
    createdAt: "2024-04-05T11:00:00Z",
    lastLoginAt: "2024-11-29T19:20:00Z",
    subscription: {
      planId: "plan-student-pro",
      planName: "Student Pro",
      status: "active",
    },
  },
  {
    id: "user-005",
    email: "park.professor@edu.kr",
    name: "박교수",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=park",
    role: "user",
    status: "suspended",
    createdAt: "2024-05-12T09:00:00Z",
    lastLoginAt: "2024-11-15T14:30:00Z",
    suspendedUntil: "2024-12-15T00:00:00Z",
    subscription: {
      planId: "plan-educator-pro",
      planName: "Educator Pro",
      status: "active",
    },
  },
  {
    id: "user-006",
    email: "banned.user@example.com",
    name: "차단된사용자",
    role: "user",
    status: "banned",
    createdAt: "2024-06-01T08:00:00Z",
    lastLoginAt: "2024-10-20T10:00:00Z",
    banReason: "서비스 약관 위반 - 부적절한 콘텐츠 업로드",
  },
  {
    id: "user-007",
    email: "choi.teacher@academy.com",
    name: "최선생",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=choi",
    role: "user",
    status: "active",
    createdAt: "2024-07-20T13:00:00Z",
    lastLoginAt: "2024-12-01T06:00:00Z",
    subscription: {
      planId: "plan-educator-pro",
      planName: "Educator Pro",
      status: "active",
    },
  },
  {
    id: "user-008",
    email: "jung.student@school.kr",
    name: "정학생",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=jung",
    role: "user",
    status: "inactive",
    createdAt: "2024-08-15T10:00:00Z",
    lastLoginAt: "2024-09-30T15:00:00Z",
  },
  {
    id: "user-009",
    email: "kang.educator@institute.edu",
    name: "강교육자",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=kang",
    role: "user",
    status: "active",
    createdAt: "2024-09-01T09:30:00Z",
    lastLoginAt: "2024-11-28T20:00:00Z",
    subscription: {
      planId: "plan-student-pro",
      planName: "Student Pro",
      status: "past_due",
    },
  },
  {
    id: "user-010",
    email: "oh.student@college.ac.kr",
    name: "오학생",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=oh",
    role: "user",
    status: "active",
    createdAt: "2024-10-10T14:00:00Z",
    lastLoginAt: "2024-12-01T09:00:00Z",
  },
];

export const mockUserActivities: UserActivity[] = [
  {
    id: "activity-001",
    type: "login",
    description: "웹 브라우저에서 로그인",
    createdAt: "2024-12-01T08:30:00Z",
    metadata: { browser: "Chrome", os: "Windows" },
  },
  {
    id: "activity-002",
    type: "note_create",
    description: "새 노트 생성: '물리학 강의 12주차'",
    createdAt: "2024-12-01T08:45:00Z",
    metadata: { noteId: "note-123", noteType: "educator" },
  },
  {
    id: "activity-003",
    type: "session_join",
    description: "실시간 세션 참여: '수학 스터디 그룹'",
    createdAt: "2024-11-30T19:00:00Z",
    metadata: { sessionId: "session-456", duration: 3600 },
  },
  {
    id: "activity-004",
    type: "file_upload",
    description: "파일 업로드: 'lecture_slides.pdf' (5.2MB)",
    createdAt: "2024-11-30T15:30:00Z",
    metadata: { fileType: "pdf", fileSize: 5452800 },
  },
  {
    id: "activity-005",
    type: "login",
    description: "모바일 앱에서 로그인",
    createdAt: "2024-11-29T20:00:00Z",
    metadata: { browser: "Safari", os: "iOS" },
  },
];

export const mockUserDetail: AdminUserDetail = {
  ...mockUsers[2],
  stats: {
    notesCount: 47,
    sessionsCount: 128,
    totalUsageHours: 256.5,
    storageUsedMb: 1024,
  },
  recentActivities: mockUserActivities,
};

// ============ 대시보드 Mock 데이터 ============
export const mockDashboardStats: DashboardStats = {
  totalUsers: 15847,
  totalUsersChange: 12.5,
  activeSessions: 342,
  activeSessionsChange: 8.3,
  todaySignups: 127,
  todaySignupsChange: -3.2,
  systemStatus: "healthy",
};

export const mockServerStatus: ServerStatus[] = [
  {
    name: "Main API Server",
    status: "healthy",
    responseTime: 45,
    cpu: 32,
    memory: 58,
    connections: 1247,
    lastCheck: "2024-12-01T09:00:00Z",
  },
  {
    name: "WebSocket Server",
    status: "healthy",
    responseTime: 12,
    cpu: 28,
    memory: 42,
    connections: 892,
    lastCheck: "2024-12-01T09:00:00Z",
  },
  {
    name: "Database (Primary)",
    status: "healthy",
    responseTime: 8,
    cpu: 45,
    memory: 72,
    storage: 65,
    lastCheck: "2024-12-01T09:00:00Z",
  },
  {
    name: "Database (Replica)",
    status: "healthy",
    responseTime: 10,
    cpu: 38,
    memory: 68,
    storage: 65,
    lastCheck: "2024-12-01T09:00:00Z",
  },
  {
    name: "Media Storage (S3)",
    status: "healthy",
    responseTime: 85,
    storage: 45,
    lastCheck: "2024-12-01T09:00:00Z",
  },
  {
    name: "AI Processing Server",
    status: "warning",
    responseTime: 250,
    cpu: 78,
    memory: 85,
    lastCheck: "2024-12-01T09:00:00Z",
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "alert-001",
    type: "warning",
    title: "AI 서버 부하 증가",
    message: "AI Processing Server의 CPU 사용률이 78%를 초과했습니다. 모니터링이 필요합니다.",
    read: false,
    createdAt: "2024-12-01T08:45:00Z",
    metadata: { serverId: "ai-server-01", cpu: 78 },
  },
  {
    id: "alert-002",
    type: "info",
    title: "일일 백업 완료",
    message: "데이터베이스 일일 백업이 성공적으로 완료되었습니다.",
    read: true,
    createdAt: "2024-12-01T03:00:00Z",
  },
  {
    id: "alert-003",
    type: "error",
    title: "결제 실패 알림",
    message: "5건의 구독 갱신 결제가 실패했습니다. 확인이 필요합니다.",
    read: false,
    createdAt: "2024-11-30T23:00:00Z",
    metadata: { failedCount: 5 },
  },
  {
    id: "alert-004",
    type: "info",
    title: "신규 가입자 목표 달성",
    message: "11월 신규 가입자 목표 3000명을 달성했습니다.",
    read: true,
    createdAt: "2024-11-30T18:00:00Z",
  },
  {
    id: "alert-005",
    type: "warning",
    title: "스토리지 용량 주의",
    message: "Media Storage 사용량이 45%에 도달했습니다. 증설을 검토해주세요.",
    read: false,
    createdAt: "2024-11-30T12:00:00Z",
  },
];

// ============ 요금제 Mock 데이터 ============
const freeFeatures: PlanFeature[] = [
  { key: "notes", name: "노트 생성", enabled: true, limit: 10, unit: "개" },
  { key: "storage", name: "저장 공간", enabled: true, limit: 500, unit: "MB" },
  { key: "recording", name: "녹음", enabled: true, limit: 30, unit: "분/건" },
  { key: "sync_notes", name: "동기화 노트", enabled: false },
  { key: "stt", name: "실시간 STT", enabled: false },
  { key: "translation", name: "실시간 번역", enabled: false },
  { key: "ai_summary", name: "AI 요약", enabled: false },
  { key: "ai_quiz", name: "AI 퀴즈 생성", enabled: false },
  { key: "learning_space", name: "학습 공간", enabled: false },
];

const studentProFeatures: PlanFeature[] = [
  { key: "notes", name: "노트 생성", enabled: true, limit: null, unit: "무제한" },
  { key: "storage", name: "저장 공간", enabled: true, limit: null, unit: "무제한" },
  { key: "recording", name: "고화질 녹음", enabled: true, limit: null, unit: "무제한" },
  { key: "sync_notes", name: "동기화 노트", enabled: true },
  { key: "stt", name: "실시간 STT", enabled: true },
  { key: "translation", name: "실시간 번역", enabled: true },
  { key: "ai_summary", name: "AI 요약", enabled: true },
  { key: "ai_quiz", name: "AI 퀴즈 생성", enabled: true },
  { key: "learning_space", name: "학습 공간", enabled: false },
];

const educatorProFeatures: PlanFeature[] = [
  { key: "notes", name: "노트 생성", enabled: true, limit: null, unit: "무제한" },
  { key: "storage", name: "저장 공간", enabled: true, limit: null, unit: "무제한" },
  { key: "recording", name: "고화질 녹음", enabled: true, limit: null, unit: "무제한" },
  { key: "sync_notes", name: "동기화 노트", enabled: true },
  { key: "stt", name: "실시간 STT", enabled: true },
  { key: "translation", name: "실시간 번역", enabled: true },
  { key: "ai_summary", name: "AI 요약", enabled: true },
  { key: "ai_quiz", name: "AI 퀴즈 생성", enabled: true },
  { key: "learning_space", name: "학습 공간 초대", enabled: true, limit: null, unit: "무제한" },
  { key: "collaboration", name: "실시간 협업", enabled: true, limit: null, unit: "무제한" },
];

export const mockPlans: Plan[] = [
  {
    id: "plan-free",
    name: "무료 플랜",
    description: "제한된 기능으로 서비스를 체험하세요. 트래픽 유발 및 광고·추천 알고리즘을 통해 잠재 고객으로 전환됩니다.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    status: "active",
    features: freeFeatures,
    subscriberCount: 12847,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-11-15T10:00:00Z",
  },
  {
    id: "plan-student-pro",
    name: "Student Pro",
    description: "학생을 위한 프리미엄 플랜. 무제한 저장공간, 고화질 녹음, 동기화 노트, 실시간 STT·번역, AI 요약과 퀴즈 기능을 제공합니다.",
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    status: "active",
    features: studentProFeatures,
    subscriberCount: 3856,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-10-20T14:30:00Z",
  },
  {
    id: "plan-educator-pro",
    name: "Educator Pro",
    description: "교육자를 위한 프리미엄 플랜. Student Pro의 모든 기능 + 학습 공간에 다른 사용자를 초대하여 함께 학습할 수 있습니다.",
    monthlyPrice: 12000,
    yearlyPrice: 120000,
    status: "active",
    features: educatorProFeatures,
    subscriberCount: 1245,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-11-01T09:00:00Z",
  },
];

export const mockPlanHistory: PlanHistory[] = [
  {
    id: "history-001",
    planId: "plan-student-pro",
    changedBy: "user-001",
    changedByName: "시스템 관리자",
    changes: [
      { field: "monthlyPrice", oldValue: 4500, newValue: 5000 },
      { field: "features.ai_quiz", oldValue: false, newValue: true },
    ],
    createdAt: "2024-11-01T09:00:00Z",
  },
  {
    id: "history-002",
    planId: "plan-educator-pro",
    changedBy: "user-001",
    changedByName: "시스템 관리자",
    changes: [
      { field: "monthlyPrice", oldValue: 10000, newValue: 12000 },
      { field: "features.collaboration", oldValue: false, newValue: true },
    ],
    createdAt: "2024-10-20T14:30:00Z",
  },
  {
    id: "history-003",
    planId: "plan-free",
    changedBy: "user-001",
    changedByName: "시스템 관리자",
    changes: [{ field: "features.storage.limit", oldValue: 200, newValue: 500 }],
    createdAt: "2024-09-15T00:00:00Z",
  },
];

// ============ 구독 분석 Mock 데이터 ============
export const mockSubscriptionStats: SubscriptionStats = {
  totalRevenue: 156789000,
  totalRevenueChange: 15.3,
  subscriberCount: 6818,
  subscriberCountChange: 8.7,
  mrr: 42350000,
  mrrChange: 5.2,
  churnRate: 3.2,
  churnRateChange: -0.5,
  arpu: 6210,
  ltv: 186300,
};

export const mockRevenueData: RevenueData[] = [
  { date: "2024-06", revenue: 35200000, subscriptions: 5420, newSubscriptions: 420, renewals: 4800, cancellations: 180 },
  { date: "2024-07", revenue: 36800000, subscriptions: 5680, newSubscriptions: 450, renewals: 5050, cancellations: 190 },
  { date: "2024-08", revenue: 38500000, subscriptions: 5920, newSubscriptions: 480, renewals: 5250, cancellations: 195 },
  { date: "2024-09", revenue: 39900000, subscriptions: 6150, newSubscriptions: 510, renewals: 5480, cancellations: 210 },
  { date: "2024-10", revenue: 41200000, subscriptions: 6420, newSubscriptions: 530, renewals: 5720, cancellations: 225 },
  { date: "2024-11", revenue: 42350000, subscriptions: 6818, newSubscriptions: 580, renewals: 6050, cancellations: 235 },
];

export const mockSubscriberData: SubscriberData[] = [
  { date: "2024-06", total: 5420, new: 420, churned: 180, netChange: 240 },
  { date: "2024-07", total: 5680, new: 450, churned: 190, netChange: 260 },
  { date: "2024-08", total: 5920, new: 480, churned: 195, netChange: 285 },
  { date: "2024-09", total: 6150, new: 510, churned: 210, netChange: 300 },
  { date: "2024-10", total: 6420, new: 530, churned: 225, netChange: 305 },
  { date: "2024-11", total: 6818, new: 580, churned: 235, netChange: 345 },
];

export const mockPlanAnalytics: PlanAnalytics[] = [
  { planId: "plan-student-pro", planName: "Student Pro", subscribers: 3856, revenue: 19280000, change: 12.5, percentage: 75.6, avgSubscriptionLengthDays: 195 },
  { planId: "plan-educator-pro", planName: "Educator Pro", subscribers: 1245, revenue: 14940000, change: 18.3, percentage: 24.4, avgSubscriptionLengthDays: 285 },
];

export const mockChurnAnalysis: ChurnAnalysis = {
  totalChurned: 185,
  churnRate: 3.6,
  revenueLost: 1250000,
  reasons: [
    { reason: "price", label: "가격", count: 65, percentage: 35.1 },
    { reason: "not_using", label: "미사용", count: 48, percentage: 25.9 },
    { reason: "competitor", label: "경쟁사 이동", count: 32, percentage: 17.3 },
    { reason: "missing_features", label: "기능 부족", count: 25, percentage: 13.5 },
    { reason: "other", label: "기타", count: 15, percentage: 8.1 },
  ],
  byPlan: [
    { planId: "plan-student-pro", planName: "Student Pro", churned: 142, churnRate: 3.7 },
    { planId: "plan-educator-pro", planName: "Educator Pro", churned: 43, churnRate: 3.5 },
  ],
};

// ============ 구독 목록 Mock 데이터 ============
export const mockSubscriptions: Subscription[] = [
  {
    id: "sub-001",
    userId: "user-003",
    userName: "김선생",
    userEmail: "kim.teacher@school.edu",
    planId: "plan-educator-pro",
    planName: "Educator Pro",
    status: "active",
    amount: 12000,
    billingCycle: "monthly",
    currentPeriodStart: "2024-11-01T00:00:00Z",
    currentPeriodEnd: "2024-12-01T00:00:00Z",
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "sub-002",
    userId: "user-004",
    userName: "이학생",
    userEmail: "lee.student@university.ac.kr",
    planId: "plan-student-pro",
    planName: "Student Pro",
    status: "active",
    amount: 5000,
    billingCycle: "monthly",
    currentPeriodStart: "2024-11-05T00:00:00Z",
    currentPeriodEnd: "2024-12-05T00:00:00Z",
    createdAt: "2024-04-10T11:00:00Z",
  },
  {
    id: "sub-003",
    userId: "user-005",
    userName: "박교수",
    userEmail: "park.professor@edu.kr",
    planId: "plan-educator-pro",
    planName: "Educator Pro",
    status: "active",
    amount: 120000,
    billingCycle: "yearly",
    currentPeriodStart: "2024-06-01T00:00:00Z",
    currentPeriodEnd: "2025-06-01T00:00:00Z",
    createdAt: "2024-05-20T09:00:00Z",
  },
  {
    id: "sub-004",
    userId: "user-007",
    userName: "최선생",
    userEmail: "choi.teacher@academy.com",
    planId: "plan-educator-pro",
    planName: "Educator Pro",
    status: "active",
    amount: 120000,
    billingCycle: "yearly",
    currentPeriodStart: "2024-08-01T00:00:00Z",
    currentPeriodEnd: "2025-08-01T00:00:00Z",
    createdAt: "2024-07-25T13:00:00Z",
  },
  {
    id: "sub-005",
    userId: "user-009",
    userName: "강교육자",
    userEmail: "kang.educator@institute.edu",
    planId: "plan-student-pro",
    planName: "Student Pro",
    status: "past_due",
    amount: 5000,
    billingCycle: "monthly",
    currentPeriodStart: "2024-10-01T00:00:00Z",
    currentPeriodEnd: "2024-11-01T00:00:00Z",
    createdAt: "2024-09-05T09:30:00Z",
  },
  {
    id: "sub-006",
    userId: "user-011",
    userName: "취소회원",
    userEmail: "cancelled@example.com",
    planId: "plan-student-pro",
    planName: "Student Pro",
    status: "cancelled",
    amount: 5000,
    billingCycle: "monthly",
    currentPeriodStart: "2024-10-15T00:00:00Z",
    currentPeriodEnd: "2024-11-15T00:00:00Z",
    cancelledAt: "2024-11-10T14:00:00Z",
    cancelReason: "가격이 부담됨",
    createdAt: "2024-06-15T16:00:00Z",
  },
];

export const mockPlanDistribution: PlanDistribution[] = [
  { planId: "plan-free", planName: "무료 플랜", userCount: 12847, percentage: 71.6 },
  { planId: "plan-student-pro", planName: "Student Pro", userCount: 3856, percentage: 21.5 },
  { planId: "plan-educator-pro", planName: "Educator Pro", userCount: 1245, percentage: 6.9 },
];

// ============ Helper Functions ============

/**
 * Mock API 사용 여부 확인
 */
export const isMockEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
};

/**
 * Mock delay 시뮬레이션
 */
export const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 페이지네이션 헬퍼
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): { data: T[]; total: number; totalPages: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    data: data.slice(start, end),
    total: data.length,
    totalPages: Math.ceil(data.length / pageSize),
  };
}

/**
 * 사용자 필터링 헬퍼
 */
export function filterUsers(
  users: AdminUser[],
  filters: {
    role?: string;
    status?: string;
    search?: string;
  }
): AdminUser[] {
  return users.filter((user) => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.status && user.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = user.name.toLowerCase().includes(searchLower);
      const matchesEmail = user.email.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesEmail) return false;
    }
    return true;
  });
}
