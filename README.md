# 🧠 SyncNapse

AI 기반 실시간 강의 노트 생성 및 협업 플랫폼

---

## 🚀 빠른 시작

### 1️⃣ 환경 변수 설정

```bash
# Private repository에서 개발 환경 변수 가져오기
npm run env:sync

# 또는 전체 설정 (환경 변수 + 의존성 설치 + DB 설정)
npm run setup
```

**참고:** 환경 변수는 CodeGachi Organization의 private repository에서 관리됩니다.
- 상세 가이드: [docs/ENV_MANAGEMENT.md](./docs/ENV_MANAGEMENT.md)
- 빠른 시작: [docs/QUICK_START.md](./docs/QUICK_START.md)
- AI 설정: [docs/AI_SETUP.md](./docs/AI_SETUP.md)

### 2️⃣ 개발 환경 실행

```bash
# 모든 서비스 시작 (Frontend, Backend, DB, n8n, Monitoring)
npm run dev:all

# MinIO 포함 (S3 대신 자체 오브젝트 스토리지)
npm run dev:minio
```

### 3️⃣ 서비스 접속

```
Frontend:  http://localhost:3000
Backend:   http://localhost:4000
Grafana:   http://localhost:3001
n8n:       http://localhost:5678
MinIO:     http://localhost:9001 (dev:minio 사용 시)
```

---

## 🧪 GitHub Actions 로컬 테스트

```bash
# act 설치
brew install act
brew install actionlint

# Secrets 설정
npm run act:setup
vi .github/workflows/.secrets  # PAT 입력

# 문법 검사
npm run act:lint

# CI 워크플로우 테스트
npm run act:ci

# 자세한 로그로 실행
npm run act:ci:verbose
```

**자세한 내용:** [GitHub Actions 테스트 가이드](docs/GUIDELINES.md#github-actions-local-testing)

---

## 📦 서비스 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| **Frontend** | 3000 | Next.js (React) |
| **Backend** | 4000 | NestJS (Node.js) |
| **PostgreSQL** | 5432 | 데이터베이스 |
| **Redis** | 6379 | 캐시 & 큐 |
| **n8n** | 5678 | 워크플로우 자동화 |
| **Grafana** | 3001 | 모니터링 대시보드 |
| **Loki** | 3100 | 로그 수집 |
| **MinIO** | 9000/9001 | 오브젝트 스토리지 (옵션) |

---

## 🛠️ 스토리지 설정

### 옵션 1: 로컬 스토리지 (기본, 개발용)

```bash
# .env
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./var/storage
```

### 옵션 2: MinIO (권장, S3 대신)

```bash
# 1. MinIO 시작
npm run dev:minio

# 2. 샘플 파일 업로드 (002_seed_data.sql의 파일들)
npm run seed:minio

# .env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=syncnapse-files
STORAGE_ENDPOINT=http://minio:9000
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin123
```

**샘플 파일 업로드:** `npm run seed:minio` 명령어는 다음 파일들을 자동으로 생성하여 MinIO에 업로드합니다:
- 📄 Documents: `documents/sample-slides-*.pdf` (5개)
- 🎵 Audio: `audio/sample-lecture-*.mp3` (5개)
- 🖼️ Pages: `pages/*.png` (8개)
- 📦 Uploads: `uploads/user-test-*/` (2개)

**MinIO 콘솔 접속:** http://localhost:9001 (minioadmin / minioadmin123)

**가이드:** `backend/var/storage/MINIO_SETUP.md`

### 옵션 3: AWS S3

```bash
# .env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket
STORAGE_REGION=ap-northeast-2
STORAGE_ACCESS_KEY_ID=AKIA...
STORAGE_SECRET_ACCESS_KEY=wJal...
```

**자세한 내용:** `docs/STORAGE.md`

---

## 📚 문서

### 시작하기
- **빠른 시작**: `docs/QUICK_START.md`
- **환경 변수 관리**: `docs/ENV_MANAGEMENT.md`
- **환경 변수 Push/Sync**: `docs/ENV_PUSH_PULL_GUIDE.md`
- **Dev/Prod 환경 분리**: `docs/ENV_SEPARATION_COMPLETE.md`
- **개발 가이드라인**: `docs/GUIDELINES.md`

### 스토리지
- **스토리지 설정**: `docs/STORAGE.md`
- **S3 대안**: `docs/STORAGE_ALTERNATIVES.md`
- **아키텍처 비교**: `docs/ARCHITECTURE_COMPARISON.md`
- **MinIO 빠른 시작**: `backend/var/storage/MINIO_SETUP.md`
- **DB 저장 경고**: `docs/DB_STORAGE_WARNING.md`

---

## 🧪 테스트

```bash
# 전체 테스트
npm test

# Backend만
npm run ci:test:backend

# Frontend만
npm run ci:test:frontend
```

---

## 🔧 개발 명령어

```bash
# 환경 변수
npm run env:sync         # 개발 환경 변수 가져오기 (dev branch)
npm run env:sync:prod    # 프로덕션 환경 변수 가져오기 (main branch)
npm run env:push         # 개발 환경 변수 업로드 (dev branch)
npm run env:push:prod    # 프로덕션 환경 변수 업로드 (main branch)
npm run setup            # 전체 프로젝트 설정 (환경 변수 + 의존성 + DB)

# 개발 서버 시작
npm run dev:all          # 전체 (Docker)
npm run dev:minio        # MinIO 포함
npm run dev              # 로컬 (Frontend + Backend)

# 로그 확인
npm run dev:all:logs

# 서비스 중지
npm run dev:all:down

# 린트
npm run lint

# 포맷
npm run format
```

---

## 🌐 프로덕션 배포

### AWS ECS (권장)

```bash
# CI/CD는 GitHub Actions로 자동화됨
# .github/workflows/ 참고
```

### 환경 변수

프로덕션 환경에서는 다음 변수들을 설정하세요:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-secret>
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-production-bucket
```

---

## 📊 모니터링

### Grafana 대시보드

```
URL: http://localhost:3001
ID: admin
PW: admin (변경하세요!)
```

**대시보드:**
- SyncNapse Logs
- 시스템 메트릭
- 애플리케이션 성능

---

## 🔐 보안

### 환경 변수 관리

**중요:** 환경 변수는 별도의 private repository에서 관리됩니다.
- Repository: `github.com/CodeGachi/.env` (Private)
- Dev 환경: `dev` branch → `.env.dev`
- Production 환경: `main` branch → `.env.prod`

자세한 내용: [docs/ENV_MANAGEMENT.md](./docs/ENV_MANAGEMENT.md)

### 프로덕션 체크리스트

- [ ] `.env`, `.env.dev`, `.env.prod` 파일을 Git에 커밋하지 않음
- [ ] `JWT_SECRET` 강력한 값으로 변경
- [ ] Grafana 기본 비밀번호 변경
- [ ] MinIO 기본 비밀번호 변경
- [ ] PostgreSQL 비밀번호 변경
- [ ] HTTPS 설정
- [ ] 방화벽 설정
- [ ] Private env repository 접근 권한 확인

---

## 🤝 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 💡 문제 해결

### 환경 변수가 없다는 오류
```bash
# 환경 변수 동기화
npm run env:sync

# .env-repo 디렉토리 삭제 후 재시도
rm -rf .env-repo
npm run env:sync
```

### SSH 키 인증 실패
```bash
# SSH 연결 테스트
ssh -T git@github.com

# Private repository 접근 권한 요청
# CodeGachi Organization 관리자에게 문의
```

### 파일 업로드가 안 돼요
- MinIO 실행 확인: `docker ps | grep minio`
- 환경 변수 확인: `.env.dev` 파일
- 가이드: `backend/var/storage/MINIO_SETUP.md`

### 데이터베이스 연결 실패
```bash
# DB 재시작
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart postgres
```

### 로그 확인
```bash
npm run dev:all:logs
```

---

**SyncNapse - AI로 강의를 더 스마트하게** ✨
