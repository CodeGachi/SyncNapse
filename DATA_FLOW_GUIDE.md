# 📊 SyncNapse 데이터 저장 구조 완벽 가이드

## 🎯 전체 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Browser)                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  IndexedDB (로컬 브라우저 저장소)                        │ │
│  │  ├─ notes (노트 메타데이터)                              │ │
│  │  ├─ files (PDF, 파일 원본)                              │ │
│  │  ├─ noteContent (필기 내용 - blocks)                    │ │
│  │  ├─ recordings (오디오 녹음 Blob)                       │ │
│  │  └─ drawings (그림/필기 데이터)                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓↑ 동기화                          │
│                   HTTP API 호출 (자동)                       │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend (NestJS)                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL (서버 데이터베이스)                          │ │
│  │  ├─ LectureNote (노트 메타데이터)                        │ │
│  │  ├─ TranscriptSegment (전사 텍스트) ← AI가 이걸 사용!   │ │
│  │  ├─ PageContent (필기 내용 - JSON)                      │ │
│  │  ├─ AudioRecording (오디오 메타데이터)                  │ │
│  │  └─ File (파일 메타데이터)                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MinIO / S3 (오브젝트 스토리지)                          │ │
│  │  ├─ audio/*.mp3 (오디오 파일 실제 데이터)               │ │
│  │  ├─ documents/*.pdf (PDF 원본)                          │ │
│  │  ├─ pages/*.png (PDF 페이지 이미지)                     │ │
│  │  └─ uploads/* (사용자 업로드 파일)                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 필기 데이터 저장 흐름

### 1단계: 사용자가 필기 작성
```typescript
// 사용자가 필기 중...
Editor에서 텍스트/그림 작성
    ↓
```

### 2단계: IndexedDB에 즉시 저장 (로컬)
```typescript
// frontend/src/features/note/editor/use-note-content.ts (Line 64-66)
for (const [pageNumber, pageData] of Object.entries(pages)) {
  await saveToIndexedDB(noteId, String(pageNumber), pageData.blocks);
}
console.log('[useNoteContent] ✅ Saved to IndexedDB');
```

**저장 위치:** 브라우저 IndexedDB → `noteContent` 스토어

### 3단계: 백엔드로 자동 동기화 (백그라운드)
```typescript
// frontend/src/features/note/editor/use-note-content.ts (Line 68-79)
await saveNoteContentAPI(noteId, pages);
console.log('[useNoteContent] ✅ Saved to Backend');
```

**저장 위치:** PostgreSQL → `PageContent` 테이블

---

## 🎤 녹음 데이터 저장 흐름

### 1단계: 사용자가 녹음 시작
```typescript
// frontend/src/features/note/recording/use-recording.ts
startRecording()
    ↓
MediaRecorder API 시작 (브라우저)
Web Speech API 시작 (실시간 전사)
```

### 2단계: 실시간 전사 (WebSocket)
```typescript
// 음성 인식 결과가 오면
onSegment: async (segment: SpeechSegment) => {
  // 즉시 서버로 전송
  await transcriptionApi.saveTranscript({
    sessionId: sessionIdRef.current!,
    text: segment.text,
    startTime: segment.startTime,
    endTime: segment.endTime,
    words: segment.words,
  });
}
```

**저장 위치:** 
- ✅ **즉시 PostgreSQL** → `TranscriptSegment` 테이블 ← **AI가 이거 사용!**
- ❌ IndexedDB에는 저장 안 함 (전사 텍스트는 서버에만)

### 3단계: 녹음 종료 시 오디오 저장
```typescript
// 녹음 종료
const audioBlob = new Blob(audioChunksRef.current);
    ↓
// 1. IndexedDB에 저장 (로컬 재생용)
await saveRecording(noteId, name, audioBlob, duration);
    ↓
// 2. 백엔드로 업로드
await uploadAudioToServer(sessionId, audioBlob);
```

**저장 위치:**
- 브라우저 IndexedDB → `recordings` 스토어 (Blob)
- MinIO/S3 → `audio/*.mp3` (실제 파일)
- PostgreSQL → `AudioRecording` 테이블 (메타데이터만)

---

## 📄 파일 (PDF 등) 저장 흐름

### 사용자가 PDF 업로드
```typescript
// frontend/src/lib/api/services/files.api.ts (Line 236-241)
if (USE_BACKEND_FILES) {
  // 백엔드로 업로드
  const backendResponse = await uploadFileToServer(file, noteId);
  backendUrl = backendResponse.fileUrl;
}
```

**저장 위치:**
- 브라우저 IndexedDB → `files` 스토어 (File 객체)
- MinIO/S3 → `documents/*.pdf` (실제 파일)
- PostgreSQL → `File` 테이블 (메타데이터)

---

## 🤖 AI 챗봇이 사용하는 데이터

### 현재 상황 (실제 동작):

```python
# ai-service/app/utils/database.py
async def get_transcripts(self, note_id: str):
    # PostgreSQL에서 전사 데이터 가져오기
    rows = await conn.fetch(
        'SELECT "startSec", "endSec", text 
         FROM "TranscriptSegment" 
         WHERE "noteId" = $1',
        note_id
    )
    return transcripts
```

**AI는 PostgreSQL의 `TranscriptSegment` 테이블을 사용합니다!**

---

## 🔍 데이터 위치 비교표

| 데이터 종류 | IndexedDB (브라우저) | PostgreSQL (서버) | MinIO/S3 | AI 챗봇 사용 |
|------------|---------------------|-------------------|----------|-------------|
| **노트 메타** | ✅ 저장 | ✅ 저장 | ❌ | ❌ |
| **필기 내용** | ✅ 저장 (blocks) | ✅ 저장 (JSON) | ❌ | ❌ |
| **전사 텍스트** | ❌ 없음 | ✅ **저장** | ❌ | ✅ **사용!** |
| **오디오 Blob** | ✅ 저장 (재생용) | ❌ 메타데이터만 | ✅ 실제 파일 | ❌ |
| **PDF 파일** | ✅ 저장 | ❌ 메타데이터만 | ✅ 실제 파일 | ❌ |
| **그림/잉크** | ✅ 저장 | ✅ 저장 | ❌ | ❌ |

---

## 🎯 핵심 정리

### ❓ "지금 로컬 데이터를 사용하고 있나요?"

**아니요!** AI 챗봇은 **PostgreSQL (서버 DB)**를 사용합니다!

### ❓ "IndexedDB는 왜 있나요?"

**목적:**
1. **오프라인 지원** - 인터넷 없어도 노트 작성 가능
2. **빠른 로딩** - 서버에서 받아오기 전에 로컬 데이터 먼저 표시
3. **자동 동기화** - 백그라운드에서 서버와 동기화

**흐름:**
```
사용자 작성 → IndexedDB 즉시 저장 → 백그라운드 서버 동기화
```

### ❓ "전사 데이터는 어디에?"

**저장 위치:** PostgreSQL의 `TranscriptSegment` 테이블 (서버에만!)

**이유:**
- 녹음 중 실시간으로 서버에 전송
- IndexedDB에는 저장 안 함
- AI 챗봇이 바로 사용 가능

### ❓ "더미 데이터인가요?"

**맞습니다!** 현재 DB의 `note-001`, `note-002`, `note-003`은:
- 📊 시드 데이터 (테스트용)
- 🔤 영어 전사 텍스트
- 🎓 Data Structures 강의 샘플

**실제 사용:**
```
사용자가 녹음 → 전사 → PostgreSQL 저장 → AI 사용 가능
```

---

## 💡 로컬 데이터로 AI 사용하려면?

**현재는 불가능합니다!** 왜냐하면:
- ❌ 전사 데이터가 IndexedDB에 없음
- ❌ 전사 데이터는 항상 서버로 전송됨
- ✅ AI 챗봇은 서버 DB만 조회

**가능하게 만들려면:**
1. 전사 데이터도 IndexedDB에 저장
2. Frontend → Backend로 전사 데이터 전송
3. Backend → Python AI Service로 전달

구현해드릴까요? 🤔

---

## 🎬 실제 사용 시나리오

### 학생이 강의 녹음하는 경우:

```
1. 🎤 녹음 시작
   → MediaRecorder 시작
   → Web Speech API 시작
   
2. 🔤 실시간 전사
   → 음성 인식 결과
   → 즉시 서버로 POST /api/transcription/segments
   → PostgreSQL TranscriptSegment 테이블에 저장
   
3. 💾 녹음 종료
   → audioBlob 생성
   → IndexedDB에 저장 (로컬 재생용)
   → MinIO/S3에 업로드 (영구 저장)
   
4. 🤖 AI 챗봇 사용
   → PostgreSQL TranscriptSegment 조회
   → LlamaIndex 인덱싱
   → 질문/요약/퀴즈 생성
```

---

**질문 있으시면 말씀해주세요!** 😊


