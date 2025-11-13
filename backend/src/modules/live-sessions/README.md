# LiveSession 모듈

## 개요

LiveSession 모듈은 실시간 강의 공유를 위한 완전한 솔루션을 제공합니다.

## 핵심 아키텍처

```
교수자(Presenter)
  └─ 세션 생성
  └─ 강의 자료 공유 (TypingSection 제외)
     ├─ Transcripts ✓
     ├─ Translations ✓
     ├─ MaterialPages ✓
     ├─ AudioRecordings ✓
     └─ TypingSection ✗ (excludeTyping=true)

학생(Listener)
  ├─ 세션 참가
  ├─ 공유 자료 실시간 조회
  ├─ 본인의 TypingSection 작성
  └─ 세션 종료 후
     └─ Finalize → 새 LectureNote 생성
        ├─ 공유받은 자료 복사
        └─ 본인의 TypingSection 병합
```

## 주요 특징

### 1. TypingSection 분리
- 각 TypingSection은 `userId` 필드로 작성자 식별
- `sessionId` 필드로 세션과 연결
- 교수자의 필기는 공유되지 않음 (excludeTyping=true)
- 학생은 본인의 필기만 CRUD 가능

### 2. 자료 공유 모드
- **LINK**: 참조만 생성 (실시간 공유)
- **COPY**: 세션 종료 시 학생 노트에 복사

### 3. 세션 종료 후 병합
- `/finalize` 엔드포인트 호출
- 새로운 LectureNote 생성 (학생 소유)
- 공유받은 모든 자료 복사
- 학생의 TypingSection 병합

## API 엔드포인트

### 세션 관리
- `POST /api/live-sessions` - 세션 생성
- `GET /api/live-sessions` - 활성 세션 목록
- `GET /api/live-sessions/:id` - 세션 조회
- `POST /api/live-sessions/:id/end` - 세션 종료
- `POST /api/live-sessions/:id/invites` - 초대 토큰 생성
- `POST /api/invites/:token/join` - 세션 참가
- `POST /api/live-sessions/:id/leave` - 세션 나가기

### 자료 공유
- `GET /api/live-sessions/:id/shared-notes` - 공유 노트 목록
- `POST /api/live-sessions/:id/shared-notes` - 노트 공유
- `DELETE /api/live-sessions/:id/shared-notes/:noteId` - 공유 해제

### 학생 필기
- `POST /api/typing-sections` - 필기 생성
- `PUT /api/typing-sections/:id` - 필기 수정
- `DELETE /api/typing-sections/:id` - 필기 삭제
- `GET /api/live-sessions/:id/typing-sections` - 본인 필기 조회

### 세션 종료
- `POST /api/live-sessions/:id/finalize` - 학생 노트 생성

## 사용 시나리오

### 시나리오: 수학 강의

1. **교수자**
   ```
   1. POST /api/live-sessions (세션 생성)
   2. POST /api/live-sessions/session-1/invites (초대 링크 생성)
   3. POST /api/live-sessions/session-1/shared-notes
      {
        "noteId": "math-lecture-1",
        "mode": "COPY",
        "excludeTyping": true  // 교수 필기 제외
      }
   4. 강의 진행...
   5. POST /api/live-sessions/session-1/end (세션 종료)
   ```

2. **학생**
   ```
   1. POST /api/invites/abc123.../join (참가)
   2. GET /api/live-sessions/session-1/shared-notes (자료 조회)
   3. 실시간으로 자료 확인
   4. POST /api/typing-sections (필기 작성)
      {
        "sessionId": "session-1",
        "noteId": "math-lecture-1",
        "title": "Chapter 1 Notes",
        "content": "My understanding..."
      }
   5. PUT /api/typing-sections/typing-1 (필기 수정)
   6. 세션 종료 후...
   7. POST /api/live-sessions/session-1/finalize
      {
        "noteTitle": "Math Lecture 1 - My Notes",
        "folderId": "my-folder"
      }
   → 새로운 노트 생성! (공유자료 + 본인 필기)
   ```

## 데이터베이스 스키마

### TypingSection 수정
```prisma
model TypingSection {
  id        String   @id @default(cuid())
  noteId    String
  userId    String   // NEW: 작성자 식별
  sessionId String?  // NEW: 세션 연결
  title     String
  content   String
  // ... 기타 필드
}
```

### SectionSync 수정
```prisma
model SectionSync {
  id            String   @id @default(cuid())
  sessionId     String
  noteId        String
  mode          String
  excludeTyping Boolean  @default(true)  // NEW: 필기 제외
  // ... 기타 필드
}
```

## 설정 방법

자세한 설정 가이드는 [LIVESESSION_SETUP.md](./LIVESESSION_SETUP.md)를 참조하세요.

## 다음 단계

1. Prisma 마이그레이션 실행
2. 프론트엔드에서 Liveblocks 연동
3. 실시간 동기화 테스트

