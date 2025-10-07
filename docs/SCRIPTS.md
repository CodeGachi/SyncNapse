# 루트 package.json 옵션/스크립트 설명

## 기본 메타
- name: 루트 패키지 이름(퍼블리시는 하지 않음)
- private: true(모노레포 루트 퍼블리시 방지)
- version/description: 메타 정보
- workspaces: 하위 앱(`frontend`, `backend`)
- engines: Node(>=20.18.0), npm(>=10.8.0)

## devDependencies
- concurrently: 프론트/백엔드 동시 실행에 사용

## scripts
- build: 백엔드(`nest build`)와 프론트(`next build`) 빌드
- dev: 로컬에서 프론트/백엔드 개발 서버 동시 실행
  - 내부: `npm -w frontend run dev` + `npm -w backend run start:dev`
- lint: 프론트/백엔드 린트
- format: 프론트/백엔드 포맷
- test: 프론트(Vitest) + 백엔드(Jest)
- test:ci: CI 모드 테스트(워처 없음)
- db:up|down|logs: 로컬 Postgres 컨테이너 제어(`db/docker-compose.yml`)
- dev:all|dev:all:down|dev:all:logs: FE/BE/DB/n8n 전체를 Compose(prod+dev 오버레이)로 제어

## dev:all 동작 핵심
- backend/frontend 컨테이너가 시작 시 `npm install`을 실행
- `node_modules`는 호스트에 바인드되어 IDE가 타입 선언을 인식
  - `./backend/node_modules:/app/node_modules`
  - `./frontend/node_modules:/app/node_modules`
- 백엔드는 `start:dev` 이전에 `npm run prisma:generate`를 실행

## 워크스페이스 실행 팁
- 특정 워크스페이스만: `npm -w frontend run build`, `npm -w backend run start:dev`
- 전체 병렬: 루트 스크립트(`dev`, `build`, `lint`, `test`) 사용