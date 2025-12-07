# AI 기능 설정 가이드

SyncNapse의 AI 챗봇 기능을 사용하려면 Google Gemini API 키가 필요합니다.

## 🚀 빠른 설정

### 1. Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속
2. "Create API Key" 클릭
3. API 키 복사

### 2. API 키 추가

```bash
# 대화형 스크립트 실행
npm run gemini:setup
```

또는 수동으로 `.env` 파일에 추가:

```bash
echo "GEMINI_API_KEY=your-api-key-here" >> .env
echo "GEMINI_MODEL_NAME=gemini-1.5-flash" >> .env
```

### 3. 서비스 재시작

```bash
# 서비스 중지
npm run dev:down

# 서비스 재시작
npm run dev:all
```

## 🧪 API 테스트

### 헬스 체크

```bash
docker exec syncnapse-backend wget -qO- http://localhost:4000/api/ai/health
```

**성공 응답:**
```json
{"status":"ok","geminiConfigured":true}
```

### AI 챗봇 테스트

Docker 컨테이너 내부에서 테스트:

```bash
docker exec syncnapse-backend node -e "
const http = require('http');

const data = JSON.stringify({
  lectureNoteId: 'note-001',
  question: 'What is a data structure?',
  mode: 'question'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/ai/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
"
```

## 📊 API 엔드포인트

### POST `/api/ai/chat`

AI 챗봇과 대화

**요청:**
```json
{
  "lectureNoteId": "note-001",
  "question": "데이터 구조란 무엇인가요?",
  "mode": "question"
}
```

**모드:**
- `question`: 질문 답변
- `summary`: 요약 생성
- `quiz`: 퀴즈 생성

**응답:**
```json
{
  "answer": "데이터 구조는...",
  "citations": [
    {
      "pageNumber": 5,
      "startSec": 120.5,
      "endSec": 145.2,
      "score": 0.92,
      "text": "관련 텍스트..."
    }
  ]
}
```

### GET `/api/ai/health`

AI 서비스 상태 확인

**응답:**
```json
{
  "status": "ok",
  "geminiConfigured": true
}
```

## 🔧 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `GEMINI_API_KEY` | Google Gemini API 키 | (필수) |
| `GEMINI_MODEL_NAME` | 사용할 모델 이름 | `gemini-1.5-flash` |

## 🐛 문제 해결

### API 키 오류

**증상:**
```
[403 Forbidden] Method doesn't allow unregistered callers
```

**해결:**
1. API 키가 올바른지 확인
2. `.env` 파일에 키가 제대로 추가되었는지 확인
3. 서비스를 재시작

### Embedding 모델 경고

**증상:**
```
Embedding model not available, using direct Gemini fallback
```

**설명:**
- 이것은 경고일 뿐이며, Gemini API를 직접 사용하여 작동합니다
- RAG 성능을 개선하려면 별도의 임베딩 모델을 설정할 수 있습니다

### 로그 확인

```bash
# 백엔드 로그 확인
docker logs syncnapse-backend --tail 50

# 실시간 로그
docker logs -f syncnapse-backend
```

## 📚 추가 정보

- [Gemini API 문서](https://ai.google.dev/docs)
- [LlamaIndex 문서](https://ts.llamaindex.ai/)
- [RAG Engine 소스코드](../backend/src/modules/ai/services/rag-engine.service.ts)
