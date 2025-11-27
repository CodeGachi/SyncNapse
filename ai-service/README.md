# 🤖 SyncNapse AI Service

Python FastAPI 기반 RAG AI 챗봇 마이크로서비스

## ✨ 주요 기능

- 📝 **질문 답변**: 강의 내용 기반 질의응답
- 📄 **요약 생성**: 강의 내용 N줄 요약
- 🎯 **퀴즈 생성**: 객관식 퀴즈 자동 생성
- 🔍 **OCR 지원**: 이미지 기반 PDF에서도 텍스트 추출 (한글/영어)

## 🛠️ 기술 스택

- **FastAPI**: Python 웹 프레임워크
- **LlamaIndex**: RAG 프레임워크
- **OpenAI GPT-4**: LLM
- **AsyncPG**: PostgreSQL 비동기 클라이언트
- **Uvicorn**: ASGI 서버
- **pypdf**: PDF 텍스트 추출
- **Tesseract OCR**: 이미지 기반 PDF 텍스트 인식 (한글/영어 지원)
- **pdf2image**: PDF를 이미지로 변환
- **Pillow**: 이미지 처리

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
export ENABLE_OCR="true"  # OCR 기능 활성화 (기본값: true)
export OCR_MIN_TEXT_LENGTH="50"  # OCR 트리거 임계값 (기본값: 50)
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

### OCR 관련 문제

#### OCR이 작동하지 않음
- `ENABLE_OCR=true` 환경 변수 설정 확인
- Tesseract가 설치되어 있는지 확인: `tesseract --version`
- 한글 언어팩 설치 확인: `tesseract --list-langs` (kor, eng 포함되어야 함)

#### OCR 정확도가 낮음
- PDF의 이미지 품질 확인 (300 DPI 이상 권장)
- `OCR_MIN_TEXT_LENGTH` 값을 조정하여 OCR 트리거 임계값 변경

#### Docker에서 OCR 오류
```bash
# Dockerfile에 필요한 패키지가 모두 설치되어 있는지 확인
docker run -it syncnapse-ai-service tesseract --version
docker run -it syncnapse-ai-service tesseract --list-langs
```

## 🔍 OCR 기능 상세

### 동작 방식

1. **1단계 - 텍스트 추출**: `pypdf`로 PDF에서 텍스트 추출 시도
2. **2단계 - OCR 판단**: 추출된 텍스트가 `OCR_MIN_TEXT_LENGTH`보다 짧으면 OCR 필요로 판단
3. **3단계 - OCR 수행**: `pdf2image`로 PDF를 이미지로 변환 후 `Tesseract`로 OCR 수행
4. **4단계 - 결합**: 텍스트와 OCR 결과를 결합하여 최종 결과 생성

### 지원 언어

- **한글** (kor): 한국어 문서 인식
- **영어** (eng): 영문 문서 인식
- **혼합**: 한영 혼용 문서 자동 인식

### 성능 최적화

- OCR은 필요한 페이지에만 선택적으로 적용
- 텍스트 기반 PDF는 빠르게 처리 (OCR 건너뜀)
- 이미지 기반 PDF만 OCR 처리로 성능 최적화

## 📝 라이센스

MIT


