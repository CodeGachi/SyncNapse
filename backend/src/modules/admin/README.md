# Admin Module

관리자 기능을 위한 모듈입니다.

> **프론트엔드 연동**: 이 모듈은 프론트엔드의 Admin 페이지와 완전히 동기화되어 있습니다.
> - 프론트엔드: `frontend/src/app/admin/`
> - 타입 정의: `frontend/src/lib/api/types/admin.types.ts`
> - API 명세: `frontend/ADMIN_BACKEND_API.md`

## 📁 디렉토리 구조

```
admin/
├── constants/
│   ├── roles.ts           # 역할 정의 (UserRole enum, ADMIN_ROLES 등)
│   ├── permissions.ts     # 권한 매핑 (ROLE_PERMISSIONS)
│   └── index.ts
├── guards/
│   ├── admin-role.guard.ts    # admin OR operator 체크
│   ├── admin-only.guard.ts    # admin만 허용
│   ├── permission.guard.ts    # 세밀한 권한 체크
│   └── index.ts
├── dto/
│   ├── admin-user-response.dto.ts
│   └── index.ts
├── admin.controller.ts
├── admin.service.ts
└── admin.module.ts
```

## 🔐 권한 시스템

### 역할 (Roles)

프론트엔드와 동일한 역할 체계를 사용합니다.

| 역할 | 설명 | 값 | 프론트엔드 접근 |
|------|------|-----|----------------|
| Admin | 최고 관리자 (모든 권한) | `'admin'` | ✅ 모든 페이지 |
| Operator | 운영자/CS팀 (제한적 권한) | `'operator'` | ✅ 조회/일부 수정 |
| User | 일반 사용자 | `'user'` | ❌ 관리자 페이지 접근 불가 |

**실제 사용 예시:**
- **Admin**: CTO, 개발팀장, 시스템 관리자
- **Operator**: 고객지원팀, CS 매니저, 운영 담당자
- **User**: 서비스 이용 고객

### 권한 (Permissions)

```typescript
enum Permission {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  PLAN_READ = 'plan:read',
  PLAN_WRITE = 'plan:write',
  PLAN_DELETE = 'plan:delete',
  SUBSCRIPTION_READ = 'subscription:read',
  SUBSCRIPTION_WRITE = 'subscription:write',
  SERVER_READ = 'server:read',
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  DASHBOARD_READ = 'dashboard:read',
}
```

### 역할별 권한 매핑

**Admin:**
- 모든 권한 (12개)

**Operator:**
- `user:read`, `user:write` (삭제 불가)
- `plan:read` (생성/수정 불가)
- `subscription:read`
- `server:read`
- `dashboard:read`
- 설정 변경 불가

## 🛡️ Guards 사용법

> **프론트엔드와의 동기화**: 백엔드 Guard는 프론트엔드의 `AdminGuard`와 동일한 로직을 사용합니다.
> - 프론트엔드: `frontend/src/components/admin/admin-guard.tsx`
> - `AdminGuard` (기본) → `AdminRoleGuard` (백엔드)
> - `AdminOnlyGuard` → `AdminOnlyGuard` (백엔드)

### 1. AdminRoleGuard

admin 또는 operator 역할 체크 (조회 작업에 사용)

**프론트엔드 동기화:**
```typescript
// Frontend: admin-guard.tsx
<AdminGuard allowedRoles={["admin", "operator"]}>
  {children}
</AdminGuard>

// Backend: admin.controller.ts
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController { ... }
```

```typescript
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminRoleGuard)  // admin OR operator
export class DashboardController {
  @Get('stats')
  async getStats() {
    // admin, operator 모두 접근 가능
  }
}
```

### 2. AdminOnlyGuard

admin만 허용 (생성/수정/삭제 작업에 사용)

**프론트엔드 동기화:**
```typescript
// Frontend: admin-guard.tsx
<AdminOnlyGuard>
  {children}
</AdminOnlyGuard>

// Backend: plan.controller.ts
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class PlanController { ... }
```

```typescript
@Controller('admin/plans')
export class PlanController {
  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)  // 조회: admin OR operator
  async getPlans() { ... }

  @Post()
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)  // 생성: admin만
  async createPlan() { ... }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)  // 수정: admin만
  async updatePlan() { ... }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)  // 삭제: admin만
  async deletePlan() { ... }
}
```

### 3. PermissionGuard

세밀한 권한 체크 (특정 권한 필요한 작업에 사용)

```typescript
import { Permissions, PermissionGuard } from './guards';
import { Permission } from './constants';

@Controller('admin/users')
export class UserController {
  @Post(':id/ban')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.USER_DELETE)  // user:delete 권한 필요
  async banUser(@Param('id') userId: string) {
    // admin만 접근 가능 (operator는 user:delete 권한 없음)
  }

  @Post(':id/suspend')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.USER_WRITE)  // user:write 권한 필요
  async suspendUser(@Param('id') userId: string) {
    // admin, operator 모두 접근 가능
  }
}
```

## 📝 API 명세

자세한 API 명세는 다음 문서를 참조하세요:
- [ADMIN_BACKEND_API.md](../../../frontend/ADMIN_BACKEND_API.md)

### 현재 구현된 API

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| GET | `/api/admin/auth/me` | 현재 사용자 정보 조회 | admin, operator |

## 🔄 향후 구현 예정

다음 Controller들이 추가로 구현될 예정입니다 (프론트엔드 페이지와 1:1 매칭):

| Backend Controller | Frontend Page | API 개수 | 상태 |
|-------------------|---------------|----------|------|
| `admin.controller.ts` | `/admin` (대시보드) | 1개 | ✅ 구현 |
| `admin-user.controller.ts` | `/admin/users` | 8개 | ⏳ 예정 |
| `admin-plan.controller.ts` | `/admin/plans` | 5개 | ⏳ 예정 |
| `admin-subscription.controller.ts` | `/admin/subscriptions` | 6개 | ⏳ 예정 |
| `admin-dashboard.controller.ts` | `/admin` | 2개 | ⏳ 예정 |
| `admin-server.controller.ts` | `/admin/servers` | 2개 | ⏳ 예정 |
| `admin-settings.controller.ts` | `/admin/settings` | 2개 | ⏳ 예정 |

## 💡 사용 예시

### 상수 import

```typescript
import { UserRole, ADMIN_ROLES, ADMIN_ONLY } from './constants';
import { Permission, getPermissionsByRole } from './constants';
```

### Guard import

```typescript
import { AdminRoleGuard, AdminOnlyGuard, PermissionGuard, Permissions } from './guards';
```

### 역할 체크

```typescript
import { isAdminRole, isAdminOnly } from './constants';

if (isAdminRole(user.role)) {
  // admin 또는 operator
}

if (isAdminOnly(user.role)) {
  // admin만
}
```

### 권한 체크

```typescript
import { hasPermission, Permission } from './constants';

if (hasPermission(user.role, Permission.USER_DELETE)) {
  // user:delete 권한이 있는 경우
}
```

## 🧪 테스트

```bash
# 단위 테스트
npm run test admin

# E2E 테스트
npm run test:e2e admin
```

## 🔗 프론트엔드와의 연동

### 타입 동기화

프론트엔드와 백엔드의 타입이 완전히 일치합니다:

```typescript
// ✅ Frontend: admin.types.ts
export type UserRole = "user" | "operator" | "admin";
export type UserStatus = "active" | "inactive" | "banned" | "suspended";

// ✅ Backend: constants/roles.ts
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  USER = 'user',
}
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}
```

### API 응답 형식

프론트엔드가 기대하는 응답 형식:

```typescript
// 단일 데이터
{
  "data": { ... }
}

// 페이지네이션
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Mock 개발 모드

프론트엔드는 Mock 모드를 지원합니다:

```typescript
// Frontend: admin-guard.tsx
// localStorage.setItem('mockUserRole', 'admin')  // 테스트용
```

백엔드 개발 시에도 동일한 방식으로 테스트 가능합니다.

## 📚 참고

- [프론트엔드 Admin 페이지](../../../frontend/src/app/admin/)
- [프론트엔드 타입 정의](../../../frontend/src/lib/api/types/admin.types.ts)
- [API 명세서](../../../frontend/ADMIN_BACKEND_API.md)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [RBAC](https://en.wikipedia.org/wiki/Role-based_access_control)

