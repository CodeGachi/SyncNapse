# SyncNapse

SyncNapse는 강의 노트 기반 실시간 필기/요약을 지원하는 웹 플랫폼입니다.

## 1. 프로젝트 소개

- 프론트엔드: Next.js 14(App Router)
- 백엔드: Nest.js 10
- 데이터베이스: PostgreSQL (로컬 컨테이너 / 운영 외부 DB)
- 자동화: n8n 기반 플로우(워크플로우는 Git 레포에 JSON으로 버전관리, n8n에서 주기적으로 내보냄)

## 2. 기술 스택

- Frontend: Next.js, React, ESLint/Prettier, Vitest + React Testing Library
- Backend: Nest.js, Prisma(PostgreSQL), Jest
- Infra: Docker, Docker Compose, GitHub Actions, AWS ECR/ECS

## 3. 실행 안내(로컬)

1) 환경 변수 준비(루트 .env만 사용)
```bash
cp .env.example .env
node scripts/sync-envs.mjs   # backend/.env 자동 생성
```

2) 전체 스택 실행
```bash
npm run dev:all
```

3) 접근 경로
- 프론트: http://localhost:3000
- 백엔드: http://localhost:4000/health
- Swagger : http://localhost:4000/docs
- n8n: http://localhost:5678

4) n8n 플로우 버전관리
- n8n 컨테이너가 주기적으로 워크플로우를 Export하여 지정한 Git 레포에 `workflows/` 디렉터리로 커밋/푸시합니다.
- 크레덴셜은 Git에 저장되지 않습니다(암호화된 상태로 DB에 저장). 키: `N8N_ENCRYPTION_KEY`

자세한 실행/테스트/배포/운영 가이드는 다음 문서를 참고하세요.

- 개발 절차: `docs/DEVELOPMENT.md`
- 실행/구조/CI/CD/트러블슈팅 통합 핸드북: `docs/OPERATIONS.md`
- 코드/디버깅 규칙: `docs/GUIDELINES.md`
- 루트 스크립트/옵션: `docs/SCRIPTS.md`

## 4. 브랜치 전략

- GitHub Flow를 사용합니다. feature 브랜치 → PR → 리뷰/테스트 → main 머지
- 머지 전략: squash 권장(히스토리 간결화)

## 5. 폴더 구조

```
📦SyncNapse
 ┣ 📂frontend          # Next.js 앱
 ┣ 📂backend           # Nest.js 앱
 ┣ 📂db                # 로컬 전용 Postgres compose
 ┣ 📂docs              # 문서 (GUIDELINES.md 등)
 ┣ 📜docker-compose.yml
 ┣ 📜docker-compose.dev.yml
 ┗ 📜README.md
```

## 6. CI/CD 개요

- CI: 테스트 → 린트 → 빌드 (GitHub Actions)
- Deploy: ECR 푸시(sha/latest) 후 ECS 서비스 재배포(별도 워크플로우)

## 7. 라이선스

TBU
