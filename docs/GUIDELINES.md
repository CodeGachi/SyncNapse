# 개발 가이드라인 (Backend / Frontend)

## 공통 원칙
- 코드 주석은 영어 사용. 핵심 의도/비자명한 부분만 간결하게.
- 하드코딩 금지: 환경변수/설정 주입 활용.
- 포맷/품질: Prettier/ESLint 규칙 준수, 경고는 머지 전 해소.
- 테스트 우선: 주요 유즈케이스 단위/통합 테스트 작성.
- 커밋/PR: 작은 단위, 의미 있는 메시지, 리뷰 가능 범위 유지.

---

## Backend (Nest.js + Prisma)

### 구조 원칙
- 모듈 단위(`modules/<domain>`): Controller / Service / DTO 분리
- 전역 레이어: 예외 필터, 로깅, 인터셉터 적극 활용
- 하이퍼미디어: `LinkBuilderService`, `HalService`로 `_links`/`_embedded` 구성

### 환경/의존성
- dev 컨테이너 내부 DB 호스트는 `postgres` 사용 (`localhost` 아님)
- Prisma 스키마 변경 시 다음 명령으로 코드 생성
```bash
npm -w backend run prisma:generate
```

### 코드 스타일
- 공개 API 타입 명시, any 지양
- Guard clause 선호, 깊은 중첩 회피, 불필요한 try/catch 금지

### 테스트
- 단위: Service mock 중심
- 통합: e2e 환경 격리/시드 고려

### 디버그 로깅(예시)
```ts
import { Logger } from '@nestjs/common';

const logger = new Logger('SessionsService');

export async function listSessionsWithDebug(params: { userId: string }) {
  logger.debug(`listSessions called with userId=${params.userId}`);
  // fetch sessions by userId
  return [] as const;
}
```

---

## Frontend (Next.js)

### 구조/상태
- App Router 기준, 서버/클라이언트 경계 명확(`"use client"`)
- 서버 컴포넌트 우선, 필요한 지점에만 클라이언트 상태 도입

### 접근성/성능
- 이미지 최적화, lazy-loading, 메모이제이션(React.memo/useMemo)

### 테스트/품질
- ESLint/Prettier 규칙 준수, 경고 제거
- Vitest + RTL로 렌더/상호작용 검증

### 디버그 로깅(예시)
```ts
export async function fetchJsonWithDebug(url: string, init?: RequestInit) {
  console.debug('[fetchJson]', { url, method: init?.method ?? 'GET' });
  const res = await fetch(url, init);
  console.debug('[fetchJson:status]', { url, status: res.status });
  return res.json();
}
```

---

## HATEOAS(HAL) 가이드

### 원칙
- 모든 응답은 가능한 상태 전이를 `_links`로 제공
- 미디어 타입: `application/hal+json`
- 캐시/동시성: 필요 시 `ETag`, `If-Match`, `If-None-Match` 사용

### 진입점(`/api`)과 탐색
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

프론트 탐색 코드
```ts
const entry = await fetch('/api', { headers: { Accept: 'application/hal+json' } }).then(r => r.json());
const sessionsList = await fetch(entry._links.sessions.href).then(r => r.json());
```

### 세션 목록(`/api/sessions`)
```http
GET /api/sessions
Accept: application/hal+json
```

응답 예시
```json
{
  "sessions": [
    {
      "id": "S001",
      "title": "데이터마이닝 1주차",
      "date": "2025-10-10",
      "_links": { "self": { "href": "/api/sessions/S001" } }
    }
  ],
  "_links": {
    "self": { "href": "/api/sessions" },
    "create": { "href": "/api/sessions", "method": "POST" },
    "home": { "href": "/api" }
  }
}
```

프론트 코드
```ts
const entry = await fetch('/api', { headers: { Accept: 'application/hal+json' } }).then(r => r.json());
const sessions = await fetch(entry._links.sessions.href).then(r => r.json());
```

### 세션 생성(`POST /api/sessions`)
```ts
await fetch('/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: '데이터마이닝 3주차', date: '2025-10-12' })
});
```

응답 예시
```json
{
  "id": "S003",
  "title": "데이터마이닝 3주차",
  "date": "2025-10-12",
  "_links": {
    "self": { "href": "/api/sessions/S003" },
    "notes": { "href": "/api/sessions/S003/notes" },
    "audios": { "href": "/api/sessions/S003/audios" },
    "materials": { "href": "/api/sessions/S003/materials" },
    "update": { "href": "/api/sessions/S003", "method": "PUT" },
    "delete": { "href": "/api/sessions/S003", "method": "DELETE" },
    "list": { "href": "/api/sessions" }
  }
}
```

프론트 후속 탐색
```ts
const created = await fetch(sessionsList._links.create.href, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: '데이터마이닝 3주차', date: '2025-10-12' })
}).then(r => r.json());
const sessionDetail = await fetch(created._links.self.href).then(r => r.json());
```

### 프론트 전체 흐름(요약)
```ts
const entry = await fetch('/api').then(r => r.json());
const sessions = await fetch(entry._links.sessions.href).then(r => r.json());
const sessionDetail = await fetch(sessions.sessions[0]._links.self.href).then(r => r.json());
const notes = await fetch(sessionDetail._links.notes.href).then(r => r.json());
const audios = await fetch(sessionDetail._links.audios.href).then(r => r.json());
```

---

## CI 작업 가이드(로컬 등가 환경)

### 목적
- GitHub Actions와 동일한 Node(Alpine) 컨테이너 환경에서 Lint/Test/Build를 재현하여 환경 차이, 권한(EACCES) 문제를 피합니다.

### 사전 준비
- 루트 `.env`에 `NODE_VERSION`이 있어야 합니다. 없으면 현재 Node 버전으로 설정하세요.
```bash
echo "NODE_VERSION=$(node -p \"process.versions.node.replace(/^v/, '')\")" >> .env
```

### 명령어
- 전체
```bash
npm run ci:lint
npm run ci:test
npm run ci:build
```
- 대상 지정
```bash
npm run ci:lint:frontend
npm run ci:lint:backend
npm run ci:test:frontend
npm run ci:test:backend
```

### 동작 원리
- `scripts/docker-ci.mjs`가 루트 `.env`를 읽어 `NODE_VERSION`을 주입하고, `docker-compose.tools.yml`의 컨테이너에서 npm 스크립트를 실행합니다.
- 컨테이너 내부에서 `npm ci` 후 실행하므로 로컬 퍼미션과 무관하게 동작합니다.

### 트러블슈팅
- `.env`에 `NODE_VERSION` 누락 시 오류 → 위 사전 준비를 수행하세요.
- 프론트 린트 캐시 오류 → 툴 컴포즈가 컨테이너 내부에서 캐시 생성/권한 부여를 수행합니다.

---

## GitHub Actions Local Testing

### Overview

Before pushing to GitHub, you can test GitHub Actions workflows locally using `act`.

### Setup

1. **Install act:**
   ```bash
   brew install act
   ```

2. **Install actionlint (optional, for syntax checking):**
   ```bash
   brew install actionlint
   ```

3. **Setup secrets:**
   ```bash
   npm run act:setup
   # Edit .github/workflows/.secrets with your GitHub PAT
   ```

### Usage

#### Quick Commands

```bash
# Check syntax only
npm run act:lint

# Dry-run (see what would execute)
npm run act:dry

# Run CI workflow locally
npm run act:ci

# Run with verbose output
npm run act:ci:verbose
```

#### Manual act Commands

```bash
# List all jobs
act -l

# Run specific event
act push
act pull_request

# Run specific job
act -j build-and-test

# With secrets
act push --secret-file .github/workflows/.secrets
```

### Important Notes

⚠️ **Limitations:**
- `act` simulates GitHub Actions but isn't 100% identical
- Some GitHub-specific features may not work locally
- Network-dependent actions might behave differently

✅ **Benefits:**
- Fast feedback loop
- Test secrets configuration
- Validate workflow syntax
- Debug workflow issues locally

### Files

- `.actrc` - act configuration
- `.github/workflows/.secrets.example` - Template for secrets
- `.github/workflows/.secrets` - Your actual secrets (gitignored)

---

## 백엔드 코드 구조(요약과 예시)

### NestJS 모듈 구성
- 하이퍼미디어
  - `LinkBuilderService`로 `_links` 구성(`self`, `action(method 포함)`, `templated` 등)
- 디버깅
  - 각 컨트롤러/서비스는 동적 값 기반의 `Logger.debug` 사용

컨트롤러 예시
```ts
@Controller('sessions')
export class SessionsController {
  constructor(private readonly svc: SessionsService, private readonly links: LinkBuilderService) {}

  @Get()
  async list() {
    const sessions = await this.svc.listSessions();
    return {
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        date: s.date.toISOString().substring(0, 10),
        _links: { self: this.links.self(`/api/sessions/${s.id}`) }
      })),
      _links: {
        self: this.links.self('/api/sessions'),
        create: this.links.action('/api/sessions', 'POST'),
        home: this.links.self('/api')
      }
    };
  }
}
```
