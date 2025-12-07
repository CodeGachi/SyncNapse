// ============ 사용자 역할/상태 ============
export type UserRole = "user" | "operator" | "admin";
export type UserStatus = "active" | "inactive" | "banned" | "suspended";

// ============ 관리자용 사용자 타입 ============
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
  suspendedUntil?: string;
  banReason?: string;
  subscription?: {
    planId: string;
    planName: string;
    status: "active" | "cancelled" | "past_due";
  };
}

export interface AdminUserDetail extends AdminUser {
  stats: {
    notesCount: number;
    sessionsCount: number;
    totalUsageHours: number;
    storageUsedMb: number;
  };
  recentActivities: UserActivity[];
}

export interface UserActivity {
  id: string;
  type: "login" | "note_create" | "session_join" | "file_upload";
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ============ 대시보드 타입 ============
export interface DashboardStats {
  totalUsers: number;
  totalUsersChange: number;
  activeSessions: number;
  activeSessionsChange: number;
  todaySignups: number;
  todaySignupsChange: number;
  systemStatus: "healthy" | "warning" | "error";
}

export interface ServerStatus {
  name: string;
  status: "healthy" | "warning" | "error";
  responseTime?: number;
  cpu?: number;
  memory?: number;
  connections?: number;
  storage?: number;
  lastCheck: string;
}

export interface Alert {
  id: string;
  type: "info" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ============ 요금제 타입 ============
export type PlanStatus = "active" | "inactive" | "deprecated";

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: PlanStatus;
  features: PlanFeature[];
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeature {
  key: string;
  name: string;
  enabled: boolean;
  limit?: number | null; // null = unlimited
  unit?: string;
}

export interface PlanInput {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: PlanStatus;
  features: PlanFeature[];
}

export interface PlanHistory {
  id: string;
  planId: string;
  changedBy: string;
  changedByName: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  createdAt: string;
}

// ============ 구독 분석 타입 ============
export interface SubscriptionStats {
  totalRevenue: number;
  totalRevenueChange: number;
  subscriberCount: number;
  subscriberCountChange: number;
  mrr: number; // Monthly Recurring Revenue
  mrrChange: number;
  churnRate: number;
  churnRateChange: number;
  arpu?: number; // Average Revenue Per User
  ltv?: number; // Lifetime Value
}

export interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
  newSubscriptions?: number;
  renewals?: number;
  cancellations?: number;
}

export interface SubscriberData {
  date: string;
  total: number;
  new: number;
  churned: number;
  netChange: number;
}

export interface PlanAnalytics {
  planId: string;
  planName: string;
  subscribers: number;
  revenue: number;
  change: number;
  percentage: number;
  avgSubscriptionLengthDays?: number;
}

export interface ChurnAnalysis {
  totalChurned: number;
  churnRate: number;
  revenueLost?: number;
  reasons: ChurnReason[];
  byPlan?: {
    planId: string;
    planName: string;
    churned: number;
    churnRate: number;
  }[];
}

export interface ChurnReason {
  reason: string;
  label: string;
  count: number;
  percentage: number;
}

// ============ 구독 타입 ============
export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  status: "active" | "cancelled" | "past_due";
  amount: number;
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
}

// ============ 페이지네이션 ============
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ============ API 응답 타입 ============
export interface AdminApiResponse<T> {
  data: T;
  pagination?: Pagination;
}

export interface AdminApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============ 필터 타입 ============
export interface AdminUserFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sortBy?: "createdAt" | "lastLoginAt" | "name";
  sortOrder?: "asc" | "desc";
}

export interface SubscriptionFilters {
  startDate?: string;
  endDate?: string;
  segment?: "all" | "new" | "active" | "churned";
  planId?: string;
  granularity?: "daily" | "weekly" | "monthly";
}

// ============ 요금제 분포 ============
export interface PlanDistribution {
  planId: string;
  planName: string;
  userCount: number;
  percentage: number;
}
