# Admin Module

관리자 기능을 위한 모듈입니다.

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

| 역할 | 설명 | 값 |
|------|------|-----|
| Admin | 최고 관리자 (모든 권한) | `'admin'` |
| Operator | 운영자 (제한적 권한) | `'operator'` |
| User | 일반 사용자 (관리자 페이지 접근 불가) | `'user'` |

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

### 1. AdminRoleGuard

admin 또는 operator 역할 체크 (조회 작업에 사용)

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

다음 Controller들이 추가로 구현될 예정입니다:

- `admin-user.controller.ts` - 사용자 관리 (8개 API)
- `admin-plan.controller.ts` - 요금제 관리 (5개 API)
- `admin-subscription.controller.ts` - 구독 분석 (6개 API)
- `admin-dashboard.controller.ts` - 대시보드 (2개 API)
- `admin-server.controller.ts` - 서버 모니터링 (2개 API)
- `admin-settings.controller.ts` - 시스템 설정 (2개 API)

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

## 📚 참고

- NestJS Guards: https://docs.nestjs.com/guards
- NestJS Custom Decorators: https://docs.nestjs.com/custom-decorators
- Role-Based Access Control (RBAC): https://en.wikipedia.org/wiki/Role-based_access_control

