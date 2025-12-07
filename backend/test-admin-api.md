# Admin API 테스트 가이드

## 1. 서버 실행
```bash
npm run start:dev
```

## 2. Swagger UI 접속
브라우저에서: http://localhost:4000/api

## 3. JWT 토큰 획득 방법

### 방법 A: 임시 테스트 토큰 생성
```bash
# backend 디렉토리에서
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'user-test-001', role: 'admin' },
  process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  { expiresIn: '24h' }
);
console.log('Bearer ' + token);
"
```

### 방법 B: 실제 로그인
```bash
# 1. 사용자 생성 (이미 있으면 스킵)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "displayName": "Admin User"
  }'

# 2. 로그인
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

## 4. 사용자를 Admin으로 변경
```sql
-- Prisma Studio에서 또는 psql에서
UPDATE "User" SET role = 'admin' WHERE email = 'admin@test.com';
```

## 5. API 테스트 예시

### 5.1 현재 사용자 확인
```bash
curl http://localhost:4000/api/admin/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5.2 대시보드 통계
```bash
curl http://localhost:4000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5.3 사용자 목록
```bash
curl "http://localhost:4000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5.4 서버 상태
```bash
curl http://localhost:4000/api/admin/servers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
