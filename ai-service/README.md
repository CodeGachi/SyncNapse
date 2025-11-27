# 🤖 SyncNapse AI Service

Python FastAPI 기반 RAG AI 챗봇 마이크로서비스

## ✨ 주요 기능

- 📝 **질문 답변**: 강의 내용 기반 질의응답
- 📄 **요약 생성**: 강의 내용 N줄 요약
- 🎯 **퀴즈 생성**: 객관식 퀴즈 자동 생성

## 🛠️ 기술 스택

- **FastAPI**: Python 웹 프레임워크
- **LlamaIndex**: RAG 프레임워크
- **OpenAI GPT-4**: LLM
- **AsyncPG**: PostgreSQL 비동기 클라이언트
- **Uvicorn**: ASGI 서버

## 📁 프로젝트 구조

```
ai-service/
├── app/
│   ├── main.py              # FastAPI 앱
│   ├── models/
│   │   └── schemas.py       # Pydantic 모델
│   ├── services/
│   │   └── rag_service.py   # RAG 핵심 로직
│   └── utils/
│       └── database.py      # DB 유틸리티
├── Dockerfile
├── requirements.txt
└── README.md
```

## 🚀 로컬 실행

### 1. 의존성 설치

```bash
cd ai-service
pip install -r requirements.txt
```

### 2. 환경 변수 설정

```bash
export OPENAI_API_KEY="sk-proj-..."
export DATABASE_URL="postgresql://user:password@localhost:5432/syncnapse"
```

### 3. 서버 실행

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. API 문서 확인

http://localhost:8000/docs

## 🐳 Docker로 실행

```bash
docker build -t syncnapse-ai-service .
docker run -p 8000:8000 \
  -e OPENAI_API_KEY="sk-proj-..." \
  -e DATABASE_URL="postgresql://..." \
  syncnapse-ai-service
```

## 📡 API 엔드포인트

### 질문하기

```bash
curl -X POST http://localhost:8000/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "note-001",
    "question": "이차방정식이 뭐야?"
  }'
```

### 요약하기

```bash
curl -X POST http://localhost:8000/api/ai/summary \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "note-001",
    "lines": 3
  }'
```

### 퀴즈 생성

```bash
curl -X POST http://localhost:8000/api/ai/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "note-001",
    "count": 5
  }'
```

## 🔧 NestJS 통합

NestJS 백엔드에서 이 서비스를 호출합니다:

```typescript
// backend/src/modules/ai/ai.service.ts
const response = await this.httpService.post(
  'http://ai-service:8000/api/ai/ask',
  { note_id: noteId, question: question }
);
```

## 📊 헬스 체크

```bash
curl http://localhost:8000/health
```

## 🐛 트러블슈팅

### OpenAI API 키 오류
- `.env` 파일에 `OPENAI_API_KEY` 확인
- API 키가 유효한지 확인

### DB 연결 오류
- PostgreSQL이 실행 중인지 확인
- `DATABASE_URL`이 올바른지 확인

### 전사 데이터 없음
- 노트 ID가 올바른지 확인
- DB에 전사 데이터가 있는지 확인

## 📝 라이센스

MIT


