# 운영/개발 핸드북

이 문서는 SyncNapse 저장소의 구조, 실행 방법, 환경 변수, CI/CD, 문제 해결을 한 곳에 정리한 문서입니다.

## 1) 저장소 구조
- 루트
  - `package.json`: 모노레포 루트 스크립트와 워크스페이스(frontend, backend)
  - `docker-compose.yml`: 공통 서비스(Postgres, n8n, FE/BE 이미지)
  - `docker-compose.dev.yml`: 개발 오버레이(바인드 마운트, dev 명령, Prisma generate 선행)
  - `docs/`: 본 문서 및 개발/가이드 문서
- 앱
  - `frontend/`: Next.js 14(App Router)
  - `backend/`: NestJS 10, Prisma(PostgreSQL)
- DB
  - `db/docker-compose.yml`: 로컬 전용 Postgres 단독 기동용

## 2) 실행(로컬 개발)
### 전체 스택
```bash
npm run dev:all
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000/health (Swagger: /docs)
# n8n:      http://localhost:5678
```
핵심 동작:
- backend/frontend 컨테이너는 시작 시 `npm install` 실행
- `node_modules`는 호스트에 바인드: `./backend/node_modules:/app/node_modules`, `./frontend/node_modules:/app/node_modules`
- 백엔드는 `start:dev` 전에 `npm run prisma:generate` 실행 → Prisma Client 보장

### 개별 실행
- 프론트만: `npm -w frontend run dev`
- 백엔드만: `npm -w backend run start:dev`
- DB만: `npm run db:up` (로그: `npm run db:logs`, 종료: `npm run db:down`)

## 3) 환경 변수(루트 .env 일원화)
루트 `.env.example`를 `.env`로 복사하여 채운 뒤, 하위 앱용 `.env`는 자동 생성합니다.
```bash
cp .env.example .env
node scripts/sync-envs.mjs  # backend/.env 생성
```
키 요약:
- 공통: `NODE_ENV`, `DEBUG_LEVEL`
- DB: `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- n8n: `N8N_ENCRYPTION_KEY`, `N8N_SECURE_COOKIE`, `N8N_USER_MANAGEMENT_DISABLED`
- 백엔드: `JWT_SECRET`

## 4) 스크립트(루트)
- `dev`: 프론트/백엔드 동시 실행(concurrently)
- `dev:all`: FE/BE/DB/n8n 전체 스택을 Compose로 빌드/기동
- `dev:all:logs`, `dev:all:down`: 로그/중지
- `build`: 백엔드 → 프론트 순서 빌드(워크스페이스 기반)
- `lint`, `format`, `test`, `test:ci`: 워크스페이스 전반 품질 작업

## 5) CI (GitHub Actions)
워크플로: `.github/workflows/ci.yml`
- Node 20.18.0 설정, 루트/워크스페이스 의존성 설치
- Prisma Client 생성: `npm -w backend run prisma:generate`
- 테스트: 프론트 `test:ci`, 백엔드 `test:ci`
- 린트: 프론트/백엔드
- 빌드: 프론트/백엔드
메모:
- `npm ci` 대신 `npm i --ignore-scripts`를 사용하여 빠른 설치 후, Prisma generate를 명시적으로 수행합니다.

## 6) 배포 (ECR/ECS)
워크플로: `.github/workflows/deploy-ecs.yml`
- AWS 인증: `aws-actions/configure-aws-credentials@v4` + OIDC(Role Assume)
- 태그: `sha-<short>`와 `latest`
- 빌드/푸시: 프론트/백엔드 이미지를 각 ECR로 푸시
- 배포: 두 ECS 서비스에 대해 `--force-new-deployment`
필요 시크릿:
- `AWS_REGION`, `AWS_ACCOUNT_ID`, `AWS_ROLE_TO_ASSUME`
- `ECR_REPO_FRONTEND`, `ECR_REPO_BACKEND`
- `ECS_CLUSTER`, `ECS_SERVICE_FRONTEND`, `ECS_SERVICE_BACKEND`

## 7) 코드/디버깅 규칙
- 코드 주석은 영어(English)
- 디버그 상수 하드코딩 금지(환경변수/인자 사용)
```ts
console.debug('[debug] service=startup nodeEnv=%s port=%s', process.env.NODE_ENV, process.env.PORT);
```


