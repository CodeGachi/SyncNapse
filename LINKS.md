# 🔗 SyncNapse Links

## 📱 Main Services

### Frontend
- **Dev (로컬)**: http://localhost:3000
- **Dev (Docker)**: http://localhost:${FRONTEND_PORT_PUBLIC} (기본값: 3000)
- **Production**: http://localhost:3000

### Backend API
- **Dev (로컬)**: http://localhost:4000
- **Dev (Docker)**: http://localhost:${BACKEND_PORT_PUBLIC} (기본값: 4000)
- **Production**: http://localhost:4000

### Nginx (리버스 프록시)
- **URL**: http://localhost:8080
- **API Proxy**: http://localhost:8080/api/ → backend:4000

---

## 🔐 Authentication APIs

### OAuth
- **Google 로그인 시작**: http://localhost:4000/api/auth/google
- **Google 콜백**: http://localhost:4000/api/auth/google/callback
- **로그인 옵션 (HATEOAS)**: http://localhost:4000/api/auth/login

### Token Management
- **토큰 갱신**: `POST http://localhost:4000/api/auth/refresh`
- **로그아웃**: `POST http://localhost:4000/api/auth/logout`
- **현재 사용자 정보**: `GET http://localhost:4000/api/auth/me`
- **인증 확인**: `GET http://localhost:4000/api/auth/check`

---

## 📝 Notes APIs

### CRUD Operations
- **노트 목록**: `GET http://localhost:4000/api/notes?folderId={folderId}`
- **노트 상세**: `GET http://localhost:4000/api/notes/{noteId}`
- **노트 생성**: `POST http://localhost:4000/api/notes`
- **노트 수정**: `PATCH http://localhost:4000/api/notes/{noteId}`
- **노트 삭제**: `DELETE http://localhost:4000/api/notes/{noteId}`
- **노트 파일 목록**: `GET http://localhost:4000/api/notes/{noteId}/files`

---

## 📁 Folders APIs

### Folder Management
- **폴더 목록**: `GET http://localhost:4000/api/folders`
- **폴더 생성**: `POST http://localhost:4000/api/folders`
- **폴더 수정**: `PATCH http://localhost:4000/api/folders/{folderId}`
- **폴더 삭제**: `DELETE http://localhost:4000/api/folders/{folderId}`

---

## 🎤 Transcription APIs

### Recording Sessions
- **세션 생성**: `POST http://localhost:4000/api/transcription/sessions`
- **세션 종료**: `POST http://localhost:4000/api/transcription/sessions/{sessionId}/end`
- **세션 목록**: `GET http://localhost:4000/api/transcription/sessions`
- **세션 상세**: `GET http://localhost:4000/api/transcription/sessions/{sessionId}`

### Transcripts
- **트랜스크립트 저장**: `POST http://localhost:4000/api/transcription/transcripts`
- **트랜스크립트 조회**: `GET http://localhost:4000/api/transcription/sessions/{sessionId}/transcripts`

### Audio
- **오디오 청크 저장**: `POST http://localhost:4000/api/transcription/audio-chunks`

---

## 🗄️ Storage & Infrastructure

### MinIO (S3 호환 스토리지)
- **API 엔드포인트**: http://localhost:9000
- **웹 콘솔 (UI)**: http://localhost:9001
  - Username: minioadmin (기본값)
  - Password: minioadmin123 (기본값)
- **버킷**: syncnapse-files

### PostgreSQL Database
- **Host**: localhost
- **Port**: 5432 (Docker 내부)
- **Database**: syncnapse_db
- **연결 URL**: `DATABASE_URL` 환경변수 참조

### Redis
- **Host**: localhost
- **Port**: ${REDIS_PORT_PUBLIC} (기본값: 6379)
- **용도**: n8n 큐 모드, 세션 캐싱

---

## 📊 Monitoring & Tools

### Grafana (로그 대시보드)
- **URL**: http://localhost:3001
- **Username**: ${GF_ADMIN_USER}
- **Password**: ${GF_ADMIN_PASSWORD}
- **데이터소스**: Loki

### Loki (로그 집계)
- **API**: http://localhost:3100
- **용도**: 중앙화된 로그 수집 및 저장

### n8n (워크플로우 자동화)
- **URL**: http://localhost:${N8N_PORT_PUBLIC} (기본값: 5678)
- **용도**: 자동화 워크플로우 생성 및 관리

---

## 🌐 Frontend Routes

### Public Routes
- **홈**: http://localhost:3000/
- **로그인**: http://localhost:3000/auth/login
- **OAuth 콜백**: http://localhost:3000/auth/callback

### Protected Routes (인증 필요)
- **대시보드**: http://localhost:3000/dashboard
- **노트 목록**: http://localhost:3000/notes
- **노트 상세**: http://localhost:3000/notes/{noteId}
- **녹음/전사**: http://localhost:3000/transcription
- **설정**: http://localhost:3000/settings

### Dev Tools
- **Dev 페이지**: http://localhost:3000/dev

---

## 🐳 Docker Services

### 컨테이너 목록
- `syncnapse-frontend` - Next.js 프론트엔드
- `syncnapse-backend` - NestJS 백엔드
- `syncnapse-nginx` - Nginx 리버스 프록시
- `syncnapse-postgres-dev` - PostgreSQL 데이터베이스
- `syncnapse-redis` - Redis 캐시
- `syncnapse-minio` - MinIO 스토리지
- `syncnapse-minio-mc` - MinIO 클라이언트 (초기화)
- `syncnapse-n8n-dev` - n8n 워크플로우
- `syncnapse-loki` - Loki 로그 서버
- `syncnapse-promtail` - Promtail 로그 수집기
- `syncnapse-grafana` - Grafana 대시보드

### Docker Compose 명령어
```bash
# 개발 환경 시작
docker compose -f docker-compose.dev.yml up -d

# 개발 환경 + MinIO
docker compose -f docker-compose.dev.yml -f docker-compose.minio.yml up -d

# 프로덕션 환경
docker compose up -d

# 로그 확인
docker logs syncnapse-backend --tail 50
docker logs syncnapse-frontend --tail 50

# 중지
docker compose down

# 완전 삭제 (볼륨 포함)
docker compose down -v
```

---

## 🔧 Development URLs

### 로컬 개발 (Docker 없이)
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Docker 개발 환경
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **Nginx**: http://localhost:8080
- **MinIO Console**: http://localhost:9001
- **MinIO API**: http://localhost:9000
- **Grafana**: http://localhost:3001
- **Loki**: http://localhost:3100
- **n8n**: http://localhost:5678

---

## 📚 Documentation

### Swagger API Docs (예정)
- **URL**: http://localhost:4000/api/docs
- **JSON**: http://localhost:4000/api/docs-json

### Project Docs
- **README**: [README.md](./README.md)
- **Setup Guide**: [docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md)
- **Guidelines**: [docs/GUIDELINES.md](./docs/GUIDELINES.md)

---

## 🔑 Environment Variables

주요 환경변수들은 `.env` 파일에서 관리됩니다:

### Port Configuration
- `FRONTEND_PORT_PUBLIC` - 프론트엔드 공개 포트 (기본: 3000)
- `BACKEND_PORT_PUBLIC` - 백엔드 공개 포트 (기본: 4000)
- `REDIS_PORT_PUBLIC` - Redis 공개 포트 (기본: 6379)
- `N8N_PORT_PUBLIC` - n8n 공개 포트 (기본: 5678)

### Database
- `DATABASE_URL` - PostgreSQL 연결 문자열
- `POSTGRES_USER` - PostgreSQL 사용자
- `POSTGRES_PASSWORD` - PostgreSQL 비밀번호
- `POSTGRES_DB` - PostgreSQL 데이터베이스명

### Authentication
- `JWT_SECRET` - JWT 서명 키
- `GOOGLE_CLIENT_ID` - Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 클라이언트 시크릿
- `GOOGLE_CALLBACK_URL` - Google OAuth 콜백 URL

### Storage
- `MINIO_ROOT_USER` - MinIO 관리자 계정
- `MINIO_ROOT_PASSWORD` - MinIO 관리자 비밀번호
- `MINIO_ENDPOINT` - MinIO API 엔드포인트
- `STORAGE_BUCKET` - MinIO 버킷명

---

## 🚀 Quick Start

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일 수정

# 2. Docker 컨테이너 시작
docker compose -f docker-compose.dev.yml -f docker-compose.minio.yml up -d

# 3. 브라우저에서 접속
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# MinIO Console: http://localhost:9001
# Grafana: http://localhost:3001

# 4. 로그 확인
docker compose logs -f
```

---

## ❓ Troubleshooting

### Backend RESET 오류
- Google OAuth 설정 확인: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- 콜백 URL 확인: `GOOGLE_CALLBACK_URL`
- 백엔드 로그 확인: `docker logs syncnapse-backend`

### 네트워크 오류
- Docker 네트워크 확인: `docker network ls | grep syncnapse`
- 컨테이너 상태 확인: `docker compose ps`
- 포트 충돌 확인: `lsof -i :3000`, `lsof -i :4000`

### Web Speech API 네트워크 오류
- 인터넷 연결 확인
- HTTPS 사용 여부 확인 (localhost는 HTTP 가능)
- 브라우저 지원 확인 (Chrome, Edge 권장)

---

**마지막 업데이트**: 2025-11-06

Generated by Claude Code 4.5 Sonnet