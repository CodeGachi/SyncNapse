# SyncNapse

SyncNapse는 강의 노트 기반 실시간 필기/요약을 지원하는 웹 플랫폼입니다.

## 1) 개요

- 프론트엔드: Next.js 14 (App Router)
- 백엔드: Nest.js 10, Prisma(PostgreSQL)
- 데이터베이스: PostgreSQL (로컬 컨테이너 / 운영 외부 DB)
- 자동화: n8n 기반 플로우(JSON으로 버전관리)
- 관측성: Loki + Promtail + Grafana

## 2) 실행 가이드(로컬)

사전 준비: Docker Desktop, Node.js 22+, npm 10+

1. 환경 변수 동기화
```bash
cp .env.example .env
node scripts/sync-envs.mjs   # backend/.env 자동 생성
```

2. 전체 스택 실행/중지/로그
```bash
npm run dev:all
npm run dev:all:logs
npm run dev:all:down
```

3. 주요 엔드포인트
- 프론트: http://localhost:3000
- 백엔드 헬스체크: http://localhost:4000/health
- Swagger UI: http://localhost:4000/docs
- OpenAPI JSON: http://localhost:4000/api/docs-json
- n8n: http://localhost:5678
- Grafana: http://localhost:3001 (초기 대시보드 `SyncNapse Logs`)

## 3) 개발 워크플로우(요약)

- 설치
```bash
npm install
```

- 프론트/백엔드 동시 개발
```bash
npm run dev
```

- 테스트/린트/빌드
```bash
npm test
npm run lint
npm run build
```

## 4) 프로젝트 구조

```
📦SyncNapse
 ┣ 📂frontend/          # Next.js 앱 (App Router)
 ┣ 📂backend/           # Nest.js 앱
 ┃  ┣ 📂src/modules/
 ┃  ┃  ┣ 📂auth/        # 인증 모듈(JWT)
 ┃  ┃  ┣ 📂hypermedia/  # HAL(HATEOAS) 유틸과 링크 빌더
 ┃  ┃  ┣ 📂sessions/    # 세션/노트/오디오/자료 API
 ┃  ┃  ┣ 📂logging/     # 요청 로깅/서비스 로깅
 ┃  ┃  ┗ 📂common, users, db 등
 ┣ 📂db/                # 로컬 Postgres compose 와 초기 스키마
 ┣ 📂monitor/     # Loki/Promtail/Grafana 설정
 ┣ 📂docs/              # 문서 (GUIDELINES.md 등)
 ┣ 📂nginx/             # 리버스 프록시 설정
 ┣ 📜docker-compose.yml
 ┣ 📜docker-compose.dev.yml
 ┗ 📜README.md
```

## 5) 협업 브랜치 전략

- `dev` → `feature/<scope>-<desc>` → PR → 리뷰/CI 통과 → `main` 머지
- `dev → main` 머지 시 squash 권장(히스토리 간결화)

## 6) HATEOAS(HAL) 합의와 프런트 탐색 흐름

- 모든 API 응답은 `_links`를 포함하고, 미디어 타입은 `application/hal+json`을 권장합니다.
- 진입점(`/api`)에서 링크를 따라가며 필요한 리소스를 탐색합니다.

요청 예시
```http
GET /api
Accept: application/hal+json
```

응답 예시
```json
{
  "_links": {
    "self": { "href": "/api" },
    "sessions": { "href": "/api/sessions" },
    "profile": { "href": "/api/users/me" }
  }
}
```

프론트 접근 예시(TypeScript)
```ts
const entry = await fetch('/api', { headers: { Accept: 'application/hal+json' } }).then(r => r.json());
const sessionsList = await fetch(entry._links.sessions.href).then(r => r.json());
```

더 많은 예시는 `docs/GUIDELINES.md`의 Backend/Frontend 섹션을 참고하세요.

## 7) 디버그 로깅 가이드(요약)

- 백엔드: `Logger.debug` 사용, 동적 값만 기록. 하드코딩된 상수 로깅 금지.
- 프론트: `console.debug`로 네트워크/상태 변화를 로그. 민감정보/토큰 출력 금지.
- 로깅 레벨은 `.env`로 제어하며, 운영에서는 디버그 로그를 최소화합니다.

## 8) CI/CD 개요

- CI: 테스트 → 린트 → 빌드 (GitHub Actions)
- 배포: ECR 푸시(sha/latest) 후 ECS 서비스 재배포(별도 워크플로우)

## 9) 라이선스

TBU
