# Admin 모듈 단위 테스트 가이드

## 📋 목차
1. [개요](#개요)
2. [테스트 실행](#테스트-실행)
3. [테스트 구조](#테스트-구조)
4. [커버리지](#커버리지)
5. [문제 해결](#문제-해결)

---

## 📊 개요

Admin 모듈의 핵심 기능에 대한 단위 테스트 모음입니다.

### 테스트 파일 목록

#### 🔐 인증/권한 (필수)
- `guards/admin-role.guard.spec.ts` - AdminRoleGuard 테스트
- `guards/admin-only.guard.spec.ts` - AdminOnlyGuard 테스트

#### 🔧 서비스 (필수)
- `admin.service.spec.ts` - AdminService 테스트
- `users.service.spec.ts` - UsersService 테스트 (중요!)
- `dashboard.service.spec.ts` - DashboardService 테스트
- `plans.service.spec.ts` - PlansService 테스트

#### 📊 테스트 커버리지
```
Guards:      100% (필수)
Services:    80%+ (권장)
Controllers: 선택사항 (E2E 테스트로 대체)
```

---

## 🚀 테스트 실행

### 전체 테스트 실행
```bash
cd backend
npm run test
```

### Admin 모듈만 테스트
```bash
npm test -- admin
```

### 특정 파일만 테스트
```bash
# Guards 테스트
npm test -- admin-role.guard
npm test -- admin-only.guard

# Services 테스트
npm test -- admin.service
npm test -- users.service
npm test -- dashboard.service
npm test -- plans.service
```

### Watch 모드 (개발 중)
```bash
npm test -- --watch admin
```

### 커버리지 리포트
```bash
npm test -- --coverage admin
```

---

## 🧪 테스트 구조

### 1. AdminRoleGuard 테스트 (7 케이스)

```typescript
✓ should be defined
✓ should throw ForbiddenException when user is not found
✓ should throw ForbiddenException when user role is "user"
✓ should allow access when user role is "admin"
✓ should allow access when user role is "operator"
✓ should throw ForbiddenException when user has no role
✓ should throw ForbiddenException when user role is unknown
```

**핵심 테스트:**
- ✅ admin 허용
- ✅ operator 허용
- ❌ user 거부
- ❌ 인증 없음 거부

### 2. AdminOnlyGuard 테스트 (6 케이스)

```typescript
✓ should be defined
✓ should throw ForbiddenException when user is not found
✓ should throw ForbiddenException when user role is "user"
✓ should throw ForbiddenException when user role is "operator"
✓ should allow access ONLY when user role is "admin"
✓ should throw ForbiddenException when user has no role
```

**핵심 테스트:**
- ✅ admin만 허용
- ❌ operator 거부
- ❌ user 거부

### 3. UsersService 테스트 (15+ 케이스)

```typescript
// getUsers
✓ should return paginated user list
✓ should throw BadRequestException for invalid page
✓ should filter by role
✓ should search by email or name

// getUserDetail
✓ should return user detail with stats
✓ should throw NotFoundException when user does not exist

// updateUserRole
✓ should update user role successfully
✓ should throw BadRequestException when role is same

// suspendUser, banUser, activateUser
✓ should suspend/ban/activate user successfully
```

### 4. DashboardService 테스트 (6 케이스)

```typescript
✓ should return dashboard statistics
✓ should use cache when called within cache TTL
✓ should handle database errors gracefully
✓ should return server status list
✓ should return valid metric ranges
```

### 5. PlansService 테스트 (12 케이스)

```typescript
// getPlans
✓ should return list of plans
✓ should include default plans

// createPlan
✓ should create a new plan
✓ should throw BadRequestException for duplicate name

// updatePlan
✓ should update an existing plan
✓ should throw NotFoundException for non-existent plan

// deletePlan
✓ should delete a plan without subscribers
✓ should throw BadRequestException when plan has subscribers

// getPlanHistory
✓ should return plan history
```

---

## 📈 테스트 실행 결과

### 예상 출력
```
PASS  src/modules/admin/guards/admin-role.guard.spec.ts
PASS  src/modules/admin/guards/admin-only.guard.spec.ts
PASS  src/modules/admin/admin.service.spec.ts
PASS  src/modules/admin/users.service.spec.ts
PASS  src/modules/admin/dashboard.service.spec.ts
PASS  src/modules/admin/plans.service.spec.ts

Test Suites: 6 passed, 6 total
Tests:       46 passed, 46 total
Snapshots:   0 total
Time:        5.234 s
```

---

## 🎯 필수 테스트 vs 선택 테스트

### ✅ 필수 (데모 전 반드시 통과)
```bash
1. admin-role.guard.spec.ts     ← 보안 핵심!
2. admin-only.guard.spec.ts     ← 보안 핵심!
3. admin.service.spec.ts        ← 인증 핵심!
4. users.service.spec.ts        ← 사용자 관리 핵심!
```

### ⚪ 권장 (안정성 향상)
```bash
5. dashboard.service.spec.ts
6. plans.service.spec.ts
```

### 🔵 선택 (시간 여유 시)
```bash
7. subscriptions.service.spec.ts
8. monitoring.service.spec.ts
9. settings.service.spec.ts
```

---

## 🔧 테스트 실행 명령어 모음

### 빠른 테스트 (필수만)
```bash
npm test -- admin-role.guard
npm test -- admin-only.guard
npm test -- admin.service
npm test -- users.service
```

### 전체 Admin 테스트
```bash
npm test -- src/modules/admin
```

### 특정 describe 블록만
```bash
npm test -- -t "AdminRoleGuard"
npm test -- -t "canActivate"
npm test -- -t "getUsers"
```

### 실패한 테스트만 재실행
```bash
npm test -- --onlyFailures
```

### Verbose 모드 (상세)
```bash
npm test -- --verbose admin
```

---

## 🐛 문제 해결

### 1. "Cannot find module" 에러
```bash
# Prisma client 재생성
npx prisma generate

# node_modules 재설치
rm -rf node_modules
npm install
```

### 2. "timeout" 에러
```bash
# jest.config.js에서 timeout 증가
module.exports = {
  testTimeout: 10000, // 10초
};
```

### 3. 테스트가 멈춤
```bash
# --forceExit 옵션 사용
npm test -- --forceExit admin
```

### 4. Mock 데이터 문제
```bash
# 각 테스트 전에 mock 초기화 확인
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## 📊 커버리지 목표

### 최소 목표 (데모용)
```
Guards:    100% (필수!)
Services:   70%
Overall:    60%
```

### 이상적인 목표 (프로덕션)
```
Guards:    100%
Services:   90%
Controllers: 80%
Overall:    85%
```

### 커버리지 확인
```bash
npm test -- --coverage src/modules/admin

# 결과 HTML로 보기
open coverage/lcov-report/index.html
```

---

## 🎯 CI/CD 통합

### GitHub Actions 예시
```yaml
- name: Run Admin Tests
  run: npm test -- src/modules/admin --ci --bail

- name: Check Coverage
  run: |
    npm test -- --coverage src/modules/admin
    # 60% 이상 필수
```

---

## 📝 테스트 작성 가이드

### Good Practices ✅
```typescript
// 1. 명확한 테스트 이름
it('should throw NotFoundException when user does not exist', ...)

// 2. AAA 패턴 (Arrange, Act, Assert)
it('should update user role', async () => {
  // Arrange
  const mockUser = { id: 'user-001', role: 'user' };
  
  // Act
  const result = await service.updateUserRole('user-001', { role: 'admin' });
  
  // Assert
  expect(result.data.role).toBe('admin');
});

// 3. 에러 케이스 테스트
await expect(service.getUser('invalid')).rejects.toThrow(NotFoundException);
```

### Bad Practices ❌
```typescript
// 1. 모호한 테스트 이름
it('should work', ...)

// 2. 여러 개를 한 번에 테스트
it('should do everything', ...)

// 3. 실제 DB 사용
const user = await prisma.user.create(...) // ❌ Mock 사용!
```

---

## 🎉 테스트 통과 시

```bash
✅ All tests passed!

다음 단계:
1. git add src/modules/admin/**/*.spec.ts
2. git commit -m "test: add admin module unit tests"
3. 데모 준비 완료! 🚀
```

---

**작성일**: 2024
**테스트 파일 수**: 6개
**총 테스트 케이스**: 46개
**예상 실행 시간**: ~5초

