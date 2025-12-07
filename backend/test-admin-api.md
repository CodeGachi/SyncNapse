# Admin 기능 테스트 가이드 (Localhost)

이 가이드는 localhost에서 Admin 기능을 테스트하는 방법을 설명합니다.
- **프론트엔드 UI 테스트** (권장): 브라우저에서 직접 테스트
- **백엔드 API 테스트**: curl 또는 Swagger UI 사용

---

## 🎨 방법 1: 프론트엔드 UI로 테스트 (가장 쉬움!)

### 1.1 프론트엔드 서버 실행
```bash
# frontend 디렉토리에서
bun run dev
# 또는
npm run dev
```

프론트엔드는 기본적으로 `http://localhost:3000`에서 실행됩니다.

### 1.2 Google OAuth 로그인
1. 브라우저에서 `http://localhost:3000` 접속
2. 로그인 버튼 클릭 → Google OAuth 로그인
3. 로그인 완료 후 대시보드로 이동

### 1.3 Mock 모드로 Admin 역할 설정 (개발 전용)

프론트엔드의 `AdminGuard`는 localStorage에서 역할을 확인할 수 있습니다.

#### 방법 A: 브라우저 개발자 도구 사용 (가장 빠름)
1. 브라우저에서 `http://localhost:3000` 접속
2. 개발자 도구 열기 (F12 또는 Cmd+Option+I)
3. Console 탭에서 다음 명령 실행:
   ```javascript
   localStorage.setItem('mockUserRole', 'admin')
   ```
   또는 operator로 테스트:
   ```javascript
   localStorage.setItem('mockUserRole', 'operator')
   ```
4. 페이지 새로고침 (F5)
5. `http://localhost:3000/admin` 접속

#### 방법 B: 환경변수 설정
프론트엔드 `.env.local` 파일에 추가:
```bash
NEXT_PUBLIC_DEFAULT_ADMIN_ROLE=admin
```

### 1.4 Admin 페이지 접속
브라우저에서 다음 URL로 접속:
- **운영 대시보드**: http://localhost:3000/admin
- **사용자 관리**: http://localhost:3000/admin/users
- **요금제 관리**: http://localhost:3000/admin/plans
- **구독 분석**: http://localhost:3000/admin/subscriptions
- **서버 상태**: http://localhost:3000/admin/servers
- **시스템 설정**: http://localhost:3000/admin/settings

### 1.5 실제 사용자 역할로 테스트 (권장)

Mock 모드 대신 실제 데이터베이스의 사용자 역할을 사용하려면:

1. **Google OAuth로 로그인** (위 1.2 참조)
2. **데이터베이스에서 역할 변경**:
   ```bash
   # Prisma Studio 실행
   bunx prisma studio
   ```
   - `User` 모델에서 로그인한 사용자 찾기
   - `role` 필드를 `admin` 또는 `operator`로 변경
3. **프론트엔드에서 사용자 정보 새로고침**:
   - 개발자 도구 Console에서:
     ```javascript
     // localStorage의 mockUserRole 제거 (있는 경우)
     localStorage.removeItem('mockUserRole')
     ```
   - 페이지 새로고침
4. **Admin 페이지 접속**: http://localhost:3000/admin

### 1.6 프론트엔드 테스트 체크리스트

- [ ] 프론트엔드 서버 실행 (`bun run dev`)
- [ ] Google OAuth 로그인 완료
- [ ] Mock 모드 또는 실제 DB에서 역할 설정
- [ ] `/admin` 페이지 접속 성공
- [ ] 사이드바 메뉴 표시 확인
- [ ] 각 Admin 페이지 접근 가능 확인

---

## 🔧 방법 2: 백엔드 API 직접 테스트

### 2.1 서버 실행
```bash
# backend 디렉토리에서
bun run start:dev
# 또는
npm run start:dev
```

서버는 기본적으로 `http://localhost:4000`에서 실행됩니다.

### 2.2 Swagger UI 접속
브라우저에서: http://localhost:4000/api

Swagger UI에서 모든 Admin API 엔드포인트를 확인하고 테스트할 수 있습니다.

### 2.3 Admin 사용자 설정

#### 2.3.1 Google OAuth로 로그인하여 사용자 생성
1. 브라우저에서 `http://localhost:4000/api/auth/google` 접속
2. Google 계정으로 로그인
3. 로그인 후 프론트엔드로 리다이렉트되며 토큰이 URL에 포함됨
4. 또는 개발자 도구에서 네트워크 탭을 확인하여 토큰 획득

#### 2.3.2 데이터베이스에서 사용자 역할 변경
Google OAuth로 로그인한 사용자의 이메일을 확인한 후, 데이터베이스에서 역할을 `admin` 또는 `operator`로 변경합니다.

**Prisma Studio 사용 (권장)**
```bash
# backend 디렉토리에서
bunx prisma studio
# 또는
npx prisma studio
```

Prisma Studio가 열리면:
1. `User` 모델 선택
2. 해당 사용자 찾기 (이메일로 검색)
3. `role` 필드를 `admin` 또는 `operator`로 변경
4. 저장

**SQL 직접 실행**
```bash
# PostgreSQL에 직접 접속
psql $DATABASE_URL

# 또는 docker-compose를 사용하는 경우
docker compose exec postgres psql -U postgres -d syncnapse
```

```sql
-- 이메일로 사용자 찾기
SELECT id, email, "displayName", role FROM "User" WHERE email = 'your-email@gmail.com';

-- 역할을 admin으로 변경
UPDATE "User" SET role = 'admin' WHERE email = 'your-email@gmail.com';

-- 역할을 operator로 변경
UPDATE "User" SET role = 'operator' WHERE email = 'your-email@gmail.com';

-- 확인
SELECT id, email, "displayName", role FROM "User" WHERE email = 'your-email@gmail.com';
```

### 2.4 JWT 토큰 획득 방법

#### 방법 A: Google OAuth 로그인 (실제 사용)
1. 브라우저에서 `http://localhost:4000/api/auth/google` 접속
2. Google 계정으로 로그인
3. 리다이렉트된 URL에서 `accessToken` 파라미터 추출
   - 예: `http://localhost:3000/auth/callback?accessToken=eyJhbGc...&refreshToken=...`
4. 또는 개발자 도구 → Network 탭 → `/auth/google/callback` 요청 확인

##### 방법 B: 테스트용 JWT 토큰 생성 (개발 전용)
⚠️ **주의**: 이 방법은 개발/테스트 목적으로만 사용하세요. 실제 사용자 ID가 필요합니다.

```bash
# backend 디렉토리에서
# 먼저 .env 파일에서 JWT_SECRET 확인
cat .env | grep JWT_SECRET

# 사용자 ID 확인 (데이터베이스에서)
# 그 다음 토큰 생성
node -e "
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

// 실제 사용자 ID로 변경 필요
const userId = 'your-user-id-from-database';
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('JWT_SECRET not found in environment');
  process.exit(1);
}

const token = jwt.sign(
  { sub: userId },
  secret,
  { expiresIn: '24h' }
);

console.log('Bearer ' + token);
"
```

또는 `bun` 사용:
```bash
bun -e "
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config();

const userId = 'your-user-id-from-database';
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('JWT_SECRET not found');
  process.exit(1);
}

const token = jwt.sign({ sub: userId }, secret, { expiresIn: '24h' });
console.log('Bearer ' + token);
"
```

### 2.5 API 테스트 예시

#### 2.5.1 현재 관리자 사용자 정보 조회
```bash
curl http://localhost:4000/api/admin/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 2.5.2 대시보드 통계
```bash
curl http://localhost:4000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 2.5.3 사용자 목록 조회
```bash
curl "http://localhost:4000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 2.5.4 서버 상태 조회
```bash
curl http://localhost:4000/api/admin/servers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 2.5.5 요금제 목록 조회
```bash
curl http://localhost:4000/api/admin/plans \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 2.5.6 구독 통계 조회
```bash
curl http://localhost:4000/api/admin/subscriptions/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2.6 Swagger UI에서 테스트하기

1. 브라우저에서 http://localhost:4000/api 접속
2. 상단의 "Authorize" 버튼 클릭
3. `Bearer YOUR_TOKEN_HERE` 형식으로 토큰 입력 (Bearer 접두사 포함)
4. "Authorize" 클릭
5. 이제 모든 Admin API 엔드포인트를 "Try it out" 버튼으로 테스트 가능

### 2.7 역할별 접근 권한

### Admin Role Guard (admin 또는 operator)
- ✅ 대시보드 조회
- ✅ 사용자 목록 조회
- ✅ 요금제 목록 조회
- ✅ 구독 통계 조회
- ✅ 서버 상태 조회

### Admin Only Guard (admin만)
- ✅ 사용자 역할 변경
- ✅ 사용자 영구 차단
- ✅ 요금제 생성/수정/삭제
- ✅ 시스템 설정 변경

### 2.8 문제 해결

### 403 Forbidden 에러
- 사용자 역할이 `admin` 또는 `operator`인지 확인
- 데이터베이스에서 역할 확인: `SELECT id, email, role FROM "User" WHERE id = 'your-user-id';`

### 401 Unauthorized 에러
- JWT 토큰이 유효한지 확인
- 토큰이 만료되지 않았는지 확인
- `Authorization: Bearer TOKEN` 형식이 올바른지 확인

### 사용자 역할이 로드되지 않는 경우
- AdminRoleGuard가 자동으로 데이터베이스에서 역할을 로드합니다
- 데이터베이스 연결이 정상인지 확인
- 사용자가 데이터베이스에 존재하는지 확인

### 2.9 빠른 테스트 스크립트

```bash
#!/bin/bash
# test-admin.sh

TOKEN="Bearer YOUR_TOKEN_HERE"
BASE_URL="http://localhost:4000/api/admin"

echo "Testing Admin APIs..."
echo ""

echo "1. Current Admin User:"
curl -s "$BASE_URL/auth/me" -H "Authorization: $TOKEN" | jq .
echo ""

echo "2. Dashboard Stats:"
curl -s "$BASE_URL/dashboard/stats" -H "Authorization: $TOKEN" | jq .
echo ""

echo "3. Users List:"
curl -s "$BASE_URL/users?page=1&limit=10" -H "Authorization: $TOKEN" | jq .
echo ""

echo "4. Server Status:"
curl -s "$BASE_URL/servers" -H "Authorization: $TOKEN" | jq .
```

사용법:
```bash
chmod +x test-admin.sh
./test-admin.sh
```
