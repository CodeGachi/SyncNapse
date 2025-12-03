# SyncNapse 관리자 백엔드 API 명세서

> 이 문서는 프론트엔드 관리자 페이지에서 필요한 백엔드 API를 정리한 것입니다.

## 목차

1. [인증/권한](#1-인증권한)
2. [대시보드](#2-대시보드)
3. [사용자 관리](#3-사용자-관리)
4. [요금제 관리](#4-요금제-관리)
5. [구독 분석](#5-구독-분석)
6. [서버 모니터링](#6-서버-모니터링)
7. [시스템 설정](#7-시스템-설정)

---

## 공통 사항

### Base URL
```
/api/admin
```

### 인증 헤더
```
Authorization: Bearer {access_token}
```

### 역할 (Role)
| 역할 | 설명 |
|------|------|
| `admin` | 전체 관리자 권한 |
| `operator` | 운영자 (일부 기능 제한) |
| `user` | 일반 사용자 (관리자 페이지 접근 불가) |

### 공통 응답 형식

**성공 응답:**
```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**에러 응답:**
```json
{
  "code": "UNAUTHORIZED",
  "message": "접근 권한이 없습니다.",
  "details": {}
}
```

---

## 1. 인증/권한

### 1.1 현재 사용자 역할 확인
```
GET /api/admin/auth/me
```

**Response:**
```json
{
  "data": {
    "id": "user-001",
    "email": "admin@example.com",
    "name": "관리자",
    "role": "admin",
    "permissions": ["user:read", "user:write", "plan:read", "plan:write", ...]
  }
}
```

---

## 2. 대시보드

> 페이지: `/admin`

### 2.1 대시보드 통계 조회
```
GET /api/admin/dashboard/stats
```

**Response:**
```json
{
  "data": {
    "totalUsers": 17948,
    "totalUsersChange": 12.5,
    "activeSessions": 1247,
    "activeSessionsChange": 8.3,
    "todaySignups": 156,
    "todaySignupsChange": -2.1,
    "systemStatus": "healthy" // "healthy" | "warning" | "error"
  }
}
```

### 2.2 서버 상태 목록 조회
```
GET /api/admin/dashboard/servers
```

**Response:**
```json
{
  "data": [
    {
      "name": "Main API Server",
      "status": "healthy", // "healthy" | "warning" | "error"
      "responseTime": 45,
      "cpu": 35,
      "memory": 62,
      "connections": 1247,
      "lastCheck": "2024-12-01T10:30:00Z"
    },
    {
      "name": "Database (Primary)",
      "status": "healthy",
      "responseTime": 12,
      "cpu": 28,
      "memory": 75,
      "storage": 45,
      "lastCheck": "2024-12-01T10:30:00Z"
    }
  ]
}
```

---

## 3. 사용자 관리

> 페이지: `/admin/users`

### 3.1 사용자 목록 조회
```
GET /api/admin/users
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `page` | number | N | 페이지 번호 (기본값: 1) |
| `limit` | number | N | 페이지당 항목 수 (기본값: 20) |
| `role` | string | N | 역할 필터 (`admin`, `operator`, `user`) |
| `status` | string | N | 상태 필터 (`active`, `inactive`, `suspended`, `banned`) |
| `search` | string | N | 이름/이메일 검색 |
| `sortBy` | string | N | 정렬 기준 (`createdAt`, `lastLoginAt`, `name`) |
| `sortOrder` | string | N | 정렬 방향 (`asc`, `desc`) |

**Response:**
```json
{
  "data": [
    {
      "id": "user-001",
      "email": "user@example.com",
      "name": "홍길동",
      "picture": "https://...",
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-15T10:00:00Z",
      "lastLoginAt": "2024-12-01T09:30:00Z",
      "suspendedUntil": null,
      "banReason": null,
      "subscription": {
        "planId": "plan-student-pro",
        "planName": "Student Pro",
        "status": "active"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 17948,
    "totalPages": 898
  }
}
```

### 3.2 사용자 상세 조회
```
GET /api/admin/users/{userId}
```

**Response:**
```json
{
  "data": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "홍길동",
    "picture": "https://...",
    "role": "user",
    "status": "active",
    "createdAt": "2024-01-15T10:00:00Z",
    "lastLoginAt": "2024-12-01T09:30:00Z",
    "stats": {
      "notesCount": 156,
      "sessionsCount": 89,
      "totalUsageHours": 245.5,
      "storageUsedMb": 1250
    },
    "recentActivities": [
      {
        "id": "act-001",
        "type": "login", // "login" | "note_create" | "session_join" | "file_upload"
        "description": "로그인",
        "createdAt": "2024-12-01T09:30:00Z",
        "metadata": {}
      }
    ]
  }
}
```

### 3.3 사용자 역할 변경
```
PATCH /api/admin/users/{userId}/role
```

**Request:**
```json
{
  "role": "operator"
}
```

**Response:**
```json
{
  "data": {
    "id": "user-001",
    "role": "operator"
  }
}
```

### 3.4 사용자 일시 정지
```
POST /api/admin/users/{userId}/suspend
```

**Request:**
```json
{
  "reason": "이용약관 위반",
  "suspendUntil": "2024-12-15T00:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": "user-001",
    "status": "suspended",
    "suspendedUntil": "2024-12-15T00:00:00Z"
  }
}
```

### 3.5 사용자 영구 차단
```
POST /api/admin/users/{userId}/ban
```

**Request:**
```json
{
  "reason": "반복적인 이용약관 위반"
}
```

**Response:**
```json
{
  "data": {
    "id": "user-001",
    "status": "banned",
    "banReason": "반복적인 이용약관 위반"
  }
}
```

### 3.6 사용자 활성화 (정지/차단 해제)
```
POST /api/admin/users/{userId}/activate
```

**Response:**
```json
{
  "data": {
    "id": "user-001",
    "status": "active",
    "suspendedUntil": null,
    "banReason": null
  }
}
```

---

## 4. 요금제 관리

> 페이지: `/admin/plans`

### 4.1 요금제 목록 조회
```
GET /api/admin/plans
```

**Response:**
```json
{
  "data": [
    {
      "id": "plan-free",
      "name": "무료 플랜",
      "description": "제한된 기능으로 서비스를 체험하세요.",
      "monthlyPrice": 0,
      "yearlyPrice": 0,
      "status": "active", // "active" | "inactive" | "deprecated"
      "features": [
        {
          "key": "notes",
          "name": "노트 생성",
          "enabled": true,
          "limit": 10,
          "unit": "개"
        },
        {
          "key": "storage",
          "name": "저장 공간",
          "enabled": true,
          "limit": 500,
          "unit": "MB"
        },
        {
          "key": "ai_summary",
          "name": "AI 요약",
          "enabled": false,
          "limit": null,
          "unit": null
        }
      ],
      "subscriberCount": 12847,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-11-15T10:00:00Z"
    }
  ]
}
```

### 4.2 요금제 생성
```
POST /api/admin/plans
```

**Request:**
```json
{
  "name": "Enterprise",
  "description": "기업용 플랜",
  "monthlyPrice": 50000,
  "yearlyPrice": 500000,
  "status": "active",
  "features": [
    {
      "key": "notes",
      "name": "노트 생성",
      "enabled": true,
      "limit": null,
      "unit": "무제한"
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "id": "plan-enterprise",
    "name": "Enterprise",
    ...
  }
}
```

### 4.3 요금제 수정
```
PUT /api/admin/plans/{planId}
```

**Request:**
```json
{
  "name": "Enterprise Pro",
  "monthlyPrice": 60000,
  "features": [...]
}
```

### 4.4 요금제 삭제
```
DELETE /api/admin/plans/{planId}
```

> ⚠️ 구독자가 있는 요금제는 삭제 불가 (에러 반환)

### 4.5 요금제 변경 이력 조회
```
GET /api/admin/plans/{planId}/history
```

**Response:**
```json
{
  "data": [
    {
      "id": "history-001",
      "planId": "plan-student-pro",
      "changedBy": "user-001",
      "changedByName": "관리자",
      "changes": [
        {
          "field": "monthlyPrice",
          "oldValue": 4500,
          "newValue": 5000
        }
      ],
      "createdAt": "2024-11-01T09:00:00Z"
    }
  ]
}
```

---

## 5. 구독 분석

> 페이지: `/admin/subscriptions`

### 5.1 구독 통계 조회
```
GET /api/admin/subscriptions/stats
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `period` | string | N | 기간 (`1m`, `3m`, `6m`, `1y`) |

**Response:**
```json
{
  "data": {
    "totalRevenue": 156789000,
    "totalRevenueChange": 15.3,
    "subscriberCount": 6818,
    "subscriberCountChange": 8.2,
    "mrr": 34220000,
    "mrrChange": 12.1,
    "churnRate": 3.6,
    "churnRateChange": -0.5,
    "arpu": 5020,
    "ltv": 125500
  }
}
```

### 5.2 수익 추이 조회
```
GET /api/admin/subscriptions/revenue
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `startDate` | string | N | 시작일 (ISO 8601) |
| `endDate` | string | N | 종료일 (ISO 8601) |
| `granularity` | string | N | 단위 (`daily`, `weekly`, `monthly`) |

**Response:**
```json
{
  "data": [
    {
      "date": "2024-06",
      "revenue": 28500000,
      "subscriptions": 5420,
      "newSubscriptions": 420,
      "renewals": 4800,
      "cancellations": 180
    }
  ]
}
```

### 5.3 요금제별 분석
```
GET /api/admin/subscriptions/by-plan
```

**Response:**
```json
{
  "data": [
    {
      "planId": "plan-student-pro",
      "planName": "Student Pro",
      "subscribers": 3856,
      "revenue": 19280000,
      "change": 12.5,
      "percentage": 75.6,
      "avgSubscriptionLengthDays": 195
    }
  ]
}
```

### 5.4 이탈 분석
```
GET /api/admin/subscriptions/churn
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `period` | string | N | 기간 (`1m`, `3m`, `6m`, `1y`) |

**Response:**
```json
{
  "data": {
    "totalChurned": 185,
    "churnRate": 3.6,
    "revenueLost": 1250000,
    "reasons": [
      {
        "reason": "price",
        "label": "가격",
        "count": 65,
        "percentage": 35.1
      }
    ],
    "byPlan": [
      {
        "planId": "plan-student-pro",
        "planName": "Student Pro",
        "churned": 142,
        "churnRate": 3.7
      }
    ]
  }
}
```

### 5.5 구독 목록 조회
```
GET /api/admin/subscriptions
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `page` | number | N | 페이지 번호 |
| `limit` | number | N | 페이지당 항목 수 |
| `status` | string | N | 상태 필터 (`active`, `cancelled`, `past_due`) |
| `planId` | string | N | 요금제 필터 |

**Response:**
```json
{
  "data": [
    {
      "id": "sub-001",
      "userId": "user-003",
      "userName": "김선생",
      "userEmail": "kim@example.com",
      "planId": "plan-educator-pro",
      "planName": "Educator Pro",
      "status": "active",
      "amount": 12000,
      "billingCycle": "monthly", // "monthly" | "yearly"
      "currentPeriodStart": "2024-11-01T00:00:00Z",
      "currentPeriodEnd": "2024-12-01T00:00:00Z",
      "cancelledAt": null,
      "cancelReason": null,
      "createdAt": "2024-03-15T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### 5.6 요금제 분포
```
GET /api/admin/subscriptions/distribution
```

**Response:**
```json
{
  "data": [
    {
      "planId": "plan-free",
      "planName": "무료 플랜",
      "userCount": 12847,
      "percentage": 71.6
    },
    {
      "planId": "plan-student-pro",
      "planName": "Student Pro",
      "userCount": 3856,
      "percentage": 21.5
    }
  ]
}
```

---

## 6. 서버 모니터링

> 페이지: `/admin/servers`

### 6.1 서버 상태 목록 조회
```
GET /api/admin/servers
```

**Response:**
```json
{
  "data": [
    {
      "name": "Main API Server",
      "status": "healthy",
      "responseTime": 45,
      "cpu": 35,
      "memory": 62,
      "connections": 1247,
      "storage": null,
      "lastCheck": "2024-12-01T10:30:00Z"
    }
  ]
}
```

### 6.2 서버 상세 메트릭 조회 (선택사항)
```
GET /api/admin/servers/{serverName}/metrics
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `period` | string | N | 기간 (`1h`, `24h`, `7d`) |

**Response:**
```json
{
  "data": {
    "server": "Main API Server",
    "metrics": [
      {
        "timestamp": "2024-12-01T10:00:00Z",
        "cpu": 32,
        "memory": 60,
        "responseTime": 43
      }
    ]
  }
}
```

---

## 7. 시스템 설정

> 페이지: `/admin/settings`

### 7.1 시스템 설정 조회
```
GET /api/admin/settings
```

**Response:**
```json
{
  "data": {
    "general": {
      "maintenanceMode": false,
      "maxUploadSize": 100,
      "sessionTimeout": 60
    },
    "security": {
      "requireEmailVerification": true,
      "maxLoginAttempts": 5,
      "lockoutDuration": 30
    },
    "environment": {
      "version": "1.0.0",
      "environment": "development",
      "apiUrl": "http://localhost:4000",
      "mockMode": true
    }
  }
}
```

### 7.2 시스템 설정 저장
```
PUT /api/admin/settings
```

**Request:**
```json
{
  "general": {
    "maintenanceMode": false,
    "maxUploadSize": 100,
    "sessionTimeout": 60
  },
  "security": {
    "requireEmailVerification": true,
    "maxLoginAttempts": 5,
    "lockoutDuration": 30
  }
}
```

---

## API 요약 테이블

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | `/api/admin/auth/me` | 현재 사용자 역할 확인 | admin, operator |
| GET | `/api/admin/dashboard/stats` | 대시보드 통계 | admin, operator |
| GET | `/api/admin/dashboard/servers` | 서버 상태 | admin, operator |
| GET | `/api/admin/users` | 사용자 목록 | admin, operator |
| GET | `/api/admin/users/{id}` | 사용자 상세 | admin, operator |
| PATCH | `/api/admin/users/{id}/role` | 역할 변경 | admin |
| POST | `/api/admin/users/{id}/suspend` | 일시 정지 | admin, operator |
| POST | `/api/admin/users/{id}/ban` | 영구 차단 | admin |
| POST | `/api/admin/users/{id}/activate` | 활성화 | admin, operator |
| GET | `/api/admin/plans` | 요금제 목록 | admin, operator |
| POST | `/api/admin/plans` | 요금제 생성 | admin |
| PUT | `/api/admin/plans/{id}` | 요금제 수정 | admin |
| DELETE | `/api/admin/plans/{id}` | 요금제 삭제 | admin |
| GET | `/api/admin/plans/{id}/history` | 변경 이력 | admin, operator |
| GET | `/api/admin/subscriptions/stats` | 구독 통계 | admin, operator |
| GET | `/api/admin/subscriptions/revenue` | 수익 추이 | admin, operator |
| GET | `/api/admin/subscriptions/by-plan` | 요금제별 분석 | admin, operator |
| GET | `/api/admin/subscriptions/churn` | 이탈 분석 | admin, operator |
| GET | `/api/admin/subscriptions` | 구독 목록 | admin, operator |
| GET | `/api/admin/subscriptions/distribution` | 요금제 분포 | admin, operator |
| GET | `/api/admin/servers` | 서버 상태 | admin, operator |
| GET | `/api/admin/settings` | 설정 조회 | admin |
| PUT | `/api/admin/settings` | 설정 저장 | admin |

---

## 타입 정의 참조

모든 TypeScript 타입 정의는 다음 파일에서 확인할 수 있습니다:
- `src/lib/api/types/admin.types.ts`

Mock 데이터 및 테스트용 헬퍼 함수:
- `src/lib/api/mock/admin.mock.ts`
