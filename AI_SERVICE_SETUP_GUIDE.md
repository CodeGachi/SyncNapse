# 🚀 Python FastAPI AI 서비스 - 완성 가이드

## ✅ 구현 완료!

Python FastAPI 기반 RAG AI 챗봇 마이크로서비스가 완성되었습니다!

---

## 📁 생성된 파일 구조

```
SyncNapse/
├── ai-service/               🆕 Python AI 서비스
│   ├── app/
│   │   ├── main.py          # FastAPI 메인 앱
│   │   ├── models/
│   │   │   └── schemas.py   # Pydantic 모델
│   │   ├── services/
│   │   │   └── rag_service.py  # RAG 핵심 로직
│   │   └── utils/
│   │       └── database.py  # DB 유틸리티
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .gitignore
│   └── README.md
│
├── backend/                  ✏️ 수정됨
│   └── src/modules/ai/
│       ├── ai.module.ts     # HttpModule 추가
│       ├── ai.service.ts    # Python 서비스 호출
│       └── ai.controller.ts # 엔드포인트 정의
│
└── docker-compose.dev.yml    ✏️ AI 서비스 추가
```

---

## 🚀 실행 방법

### 옵션 1: Docker Compose로 전체 실행 (추천 ⭐)

```bash
cd /Users/sn2025/SyncNapse

# .env 파일에 OPENAI_API_KEY 추가
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env

# 전체 서비스 실행
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**서비스 포트:**
- NestJS Backend: http://localhost:4000
- Python AI Service: http://localhost:8000
- Frontend: http://localhost:3000

---

### 옵션 2: 로컬에서 AI 서비스만 실행

```bash
# 1. Python 가상환경 생성
cd /Users/sn2025/SyncNapse/ai-service
python3 -m venv venv
source venv/bin/activate  # macOS/Linux

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 환경 변수 설정
export OPENAI_API_KEY="sk-proj-your-key-here"
export DATABASE_URL="postgresql://sn2025:password@localhost:5432/syncnapse"

# 4. 서버 실행
uvicorn app.main:app --reload --port 8000
```

**API 문서:** http://localhost:8000/docs

---

## 📡 API 테스트

### 1️⃣ 헬스 체크

```bash
curl http://localhost:8000/health
```

**예상 응답:**
```json
{
  "status": "healthy",
  "message": "OK"
}
```

---

### 2️⃣ 질문하기

```bash
curl -X POST http://localhost:8000/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "note-001",
    "question": "데이터 구조가 뭐야?"
  }'
```

**예상 응답:**
```json
{
  "answer": "데이터 구조는 데이터를 효율적으로 저장하고 관리하기 위한 방법입니다..."
}
```

---

### 3️⃣ 요약하기

```bash
curl -X POST http://localhost:8000/api/ai/summary \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "note-001",
    "lines": 3
  }'
```

**예상 응답:**
```json
{
  "summary": "1. 데이터 구조는 데이터를 효율적으로 저장하는 방법입니다.\n2. 배열은 연속된 메모리 공간에 데이터를 저장합니다.\n3. 시간복잡도는 알고리즘의 효율성을 나타냅니다."
}
```

---

### 4️⃣ 퀴즈 생성

```bash
curl -X POST http://localhost:8000/api/ai/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "note-001",
    "count": 3
  }'
```

**예상 응답:**
```json
{
  "quizzes": [
    {
      "question": "배열의 인덱스 접근 시간복잡도는?",
      "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
      "correct_answer": 0,
      "explanation": "배열은 인덱스로 직접 접근하므로 O(1)입니다."
    }
  ]
}
```

---

## 🔗 NestJS에서 호출 테스트

NestJS 백엔드를 통해서도 호출 가능:

```bash
# 질문하기
curl -X POST http://localhost:4000/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "note-001",
    "question": "배열이 뭐야?"
  }'

# 요약하기
curl -X POST http://localhost:4000/api/ai/summary \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "note-001",
    "lines": 3
  }'

# 퀴즈 생성
curl -X POST http://localhost:4000/api/ai/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "note-001",
    "count": 5
  }'
```

---

## 📊 Swagger UI

### Python AI Service
http://localhost:8000/docs

### NestJS Backend
http://localhost:4000/docs

---

## 🎯 주요 특징

### ✅ 장점

1. **Python AI 생태계 활용**
   - LlamaIndex, LangChain 등 최신 라이브러리
   - 안정적인 Python 버전

2. **마이크로서비스 아키텍처**
   - AI 서비스 독립적 개발/배포
   - 확장성 우수

3. **오류 처리**
   - Fallback 퀴즈 생성
   - 상세한 에러 로깅
   - 헬스 체크 지원

4. **캐싱**
   - 노트별 인덱스 메모리 캐싱
   - 빠른 응답 속도

---

## 🔧 환경 변수

### 필수 환경 변수

```bash
# OpenAI API 키
OPENAI_API_KEY=sk-proj-your-key-here

# PostgreSQL URL
DATABASE_URL=postgresql://user:password@host:5432/syncnapse
```

### NestJS 추가 환경 변수

```bash
# AI 서비스 URL (Docker에서)
AI_SERVICE_URL=http://ai-service:8000

# AI 서비스 URL (로컬에서)
AI_SERVICE_URL=http://localhost:8000
```

---

## 🐛 문제 해결

### 1. AI 서비스가 시작되지 않음

**증상:**
```
Error: OPENAI_API_KEY가 설정되지 않았습니다
```

**해결:**
```bash
# .env 파일에 추가
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# 또는 직접 export
export OPENAI_API_KEY="sk-proj-..."
```

---

### 2. 전사 데이터가 없다는 오류

**증상:**
```json
{
  "detail": "노트 ID 'note-xxx'에 대한 전사 데이터가 없습니다."
}
```

**해결:**
```bash
# DB에서 사용 가능한 노트 확인
docker exec syncnapse-postgres-dev psql -U sn2025 -d syncnapse -c \
  "SELECT DISTINCT \"noteId\" FROM \"TranscriptSegment\";"
```

사용 가능한 노트 ID:
- `note-001`
- `note-002`
- `note-003`

---

### 3. NestJS에서 AI 서비스 연결 실패

**증상:**
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**해결:**

Docker 환경에서는 `localhost` 대신 서비스 이름 사용:
```typescript
// ❌ 로컬 주소
AI_SERVICE_URL=http://localhost:8000

// ✅ Docker 서비스 이름
AI_SERVICE_URL=http://ai-service:8000
```

---

### 4. Docker 빌드 실패

**증상:**
```
ERROR: failed to solve: process "/bin/sh -c pip install ..." did not complete successfully
```

**해결:**
```bash
# 캐시 없이 다시 빌드
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache ai-service
```

---

## 📈 성능 최적화 팁

1. **인덱스 캐싱 활용**
   - 같은 노트는 재인덱싱 안 함
   - 메모리에 캐시 저장

2. **작은 모델 사용**
   - `gpt-4o-mini`: 빠르고 저렴
   - `text-embedding-3-small`: 경량 임베딩

3. **비동기 처리**
   - AsyncPG로 DB 비동기 쿼리
   - FastAPI의 async/await 활용

---

## 🎉 완료!

Python FastAPI 기반 RAG AI 챗봇이 성공적으로 구현되었습니다!

### 다음 단계

1. ✅ Docker Compose로 전체 서비스 실행
2. ✅ Swagger UI에서 API 테스트
3. ✅ 실제 노트로 퀴즈/요약 생성
4. 📱 Frontend에서 AI 기능 통합

---

## 🤝 기여

버그 발견 시:
1. 로그 확인: `docker compose logs ai-service`
2. 이슈 생성
3. PR 제출

---

**구현 완료! 질문이 있으면 언제든 물어보세요!** 🚀

