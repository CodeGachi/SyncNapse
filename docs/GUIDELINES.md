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
