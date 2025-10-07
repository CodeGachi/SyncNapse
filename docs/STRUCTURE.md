# 프로젝트 구조 개요

## 루트
- `package.json`: 모노레포 루트 스크립트/워크스페이스
- `docker-compose.yml`: 기본(공용) 서비스 정의(Postgres, n8n, FE/BE 이미지)
- `docker-compose.dev.yml`: 개발용 오버레이(바인드 마운트, dev 서버 명령, prisma generate 선행)
- `README.md`, `docs/*`: 개발/가이드 문서

## apps
- `frontend/`
  - Next.js 14(앱 라우터)
  - `src/app/*`
  - Dockerfile
  - 개발 시 `node_modules` 바인드: `./frontend/node_modules:/app/node_modules`
- `backend/`
  - NestJS 10
  - `src/modules/*` (auth, users, health, logging, db 등)
  - `prisma/schema.prisma`
  - Dockerfile
  - 개발 시 `node_modules` 바인드: `./backend/node_modules:/app/node_modules`, `prisma:generate` 선행

## db
- `db/docker-compose.yml`: 로컬 Postgres 단독 기동용
- `db/.env.example`: DB 관련 환경변수 템플릿

## 네트워크/볼륨
- 네트워크: `syncnapse_net` (모든 서비스 공통)
- 볼륨: `pgdata`(Postgres), `n8n_data`(n8n)

## 실행 요약
- 개발 전체: `npm run dev:all`
- DB만: `npm run db:up`
- 프론트만: `npm -w frontend run dev`
- 백엔드만: `npm -w backend run start:dev`

# Infra Guide (ECS 배포)

이 문서는 GitHub Actions로 ECR/ECS 배포하는 절차를 요약합니다.

## 준비 사항
- AWS 계정 및 IAM Role(Assume Role) 준비
- ECR 리포지토리 2개: 프론트엔드, 백엔드
- ECS 클러스터와 서비스 2개: 프론트엔드, 백엔드 (작업정의는 사전에 생성)

## GitHub Secrets
- `AWS_REGION`: 예) ap-northeast-2
- `AWS_ACCOUNT_ID`: 숫자 12자리
- `AWS_ROLE_TO_ASSUME`: Actions에서 사용할 Assume Role ARN
- `ECR_REPO_FRONTEND`: <account>.dkr.ecr.<region>.amazonaws.com/<repo-frontend>
- `ECR_REPO_BACKEND`: <account>.dkr.ecr.<region>.amazonaws.com/<repo-backend>
- `ECS_CLUSTER`: ECS 클러스터명
- `ECS_SERVICE_FRONTEND`: 프론트엔드 서비스명
- `ECS_SERVICE_BACKEND`: 백엔드 서비스명

## 배포 트리거
- `main` 브랜치 push 또는 수동 실행(workflow_dispatch)

## 동작 개요
1) Docker 로그인(ECR)
2) 프론트/백엔드 이미지 빌드 → `sha-<short>`와 `latest` 태그 푸시
3) ECS 서비스 강제 재배포(새 태스크 정의 리비전 사용 중이면 자동 반영)

## 롤백
- ECR에서 이전 `sha-<short>` 이미지를 `latest`로 태깅 후 푸시
- 또는 ECS 서비스에서 이전 태스크 정의 리비전을 선택하여 배포

## n8n 관련
- n8n은 로컬 개발용으로 동작하며, 플로우는 Git 레포에 주기적 Export로 버전관리됩니다. 프로덕션에서 n8n을 운영할 경우 별도 인프라(외부 Postgres, HTTPS, 인증) 구성이 필요합니다.